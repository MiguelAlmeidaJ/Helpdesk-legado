<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$usuario_logado_id = $_SESSION['allterusN3Id'] ?? null;
$flashMessage = $_SESSION['user_flash'] ?? null;
unset($_SESSION['user_flash']);

if (!isset($_SESSION['tipo']) || $_SESSION['tipo'] == 2) {
  header("Location: ../index.php"); // Redireciona para a página inicial ou outra página de acesso negado
  exit;
}


$userType = null; // Evita erro de variável indefinida

if (!function_exists('isStrongUserPassword')) {
  function isStrongUserPassword($password)
  {
    return strlen($password) >= 12
      && strlen($password) <= 100
      && preg_match('/[A-Z]/', $password)
      && preg_match('/[a-z]/', $password)
      && preg_match('/[0-9]/', $password)
      && preg_match('/[^a-zA-Z0-9]/', $password);
  }
}


if ($_SERVER['REQUEST_METHOD'] === 'POST') {

  if (isset($_POST['action']) && $_POST['action'] == "deactivate_user") {
    $deactivate_user_id = filter_input(INPUT_POST, 'user_id', FILTER_VALIDATE_INT);

    if (($m1_03 ?? 0) == 1 && $deactivate_user_id > 1 && (string)$deactivate_user_id !== (string)$usuario_logado_id) {
      $pdo = ConnectionN3();
      $deactivate_user = $pdo->prepare("UPDATE `usuarios` SET `user_sts` = '2' WHERE `user_id` = :user_id;");
      $deactivate_user->bindParam(':user_id', $deactivate_user_id, PDO::PARAM_INT);

      if ($deactivate_user->execute()) {
        $mensagem = "<i class=\"fas fa-check\"></i> Usuário desativado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      } else {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao desativar usuário!";
        $mensagem_cor = "alert-danger";
        $log = "false";
      }
    } else {
      $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Você não tem permissão para desativar este usuário.";
      $mensagem_cor = "alert-danger";
      $log = "false";
    }
  }

  if (isset($_POST['action'])  && $_POST['action'] == "new_user") {
    $user_nome = trim($_POST['user_nome'] ?? '');
    $user_mail = trim($_POST['user_mail'] ?? '');
    $user_cel = trim($_POST['user_cel'] ?? '');
    $user_funcao = filter_input(INPUT_POST, 'user_funcao', FILTER_VALIDATE_INT);
    $user_login = trim($_POST['user_login'] ?? '');
    $user_pass_raw = trim($_POST['user_pass'] ?? '');
    $userType = filter_input(INPUT_POST, 'tipo_usuario', FILTER_VALIDATE_INT);
    $link = trim($_POST['link'] ?? '');
    $companies = array_values(array_unique(array_filter(array_map('intval', $_POST['companies'] ?? []))));
    $pix_type = filter_input(INPUT_POST, 'pix_type', FILTER_VALIDATE_INT);
    $chavepix = trim($_POST['chavepix'] ?? '');
    $errosCadastro = [];

    if (($m1_02 ?? 0) != 1) {
      $errosCadastro[] = "Você não tem permissão para cadastrar usuários.";
    }
    if ($user_nome === '' || strlen($user_nome) > 60) {
      $errosCadastro[] = "Informe um nome com até 60 caracteres.";
    }
    if (!filter_var($user_mail, FILTER_VALIDATE_EMAIL) || strlen($user_mail) > 60) {
      $errosCadastro[] = "Informe um e-mail válido com até 60 caracteres.";
    }
    if ($user_cel === '' || strlen($user_cel) > 20) {
      $errosCadastro[] = "Informe um celular com até 20 caracteres.";
    }
    if (!$user_funcao) {
      $errosCadastro[] = "Selecione uma função.";
    }
    if ($user_login === '' || strlen($user_login) > 15) {
      $errosCadastro[] = "Informe um login com até 15 caracteres.";
    }
    if (!isStrongUserPassword($user_pass_raw)) {
      $errosCadastro[] = "A senha deve conter 12 ou mais caracteres, com maiúscula, minúscula, número e símbolo.";
    }
    if (!in_array($userType, [1, 2], true)) {
      $errosCadastro[] = "Selecione o tipo de usuário.";
    }
    if ($userType === 2 && count($companies) === 0) {
      $errosCadastro[] = "Usuários do tipo Cliente precisam estar vinculados a pelo menos uma empresa.";
    }
    if ($chavepix !== '' && !$pix_type) {
      $errosCadastro[] = "Selecione o tipo da chave Pix.";
    }
    if (strlen($link) > 50) {
      $errosCadastro[] = "Informe um link com até 50 caracteres.";
    }

    $pdo = ConnectionN3();
    if (!$errosCadastro) {
      $verificaDuplicados = $pdo->prepare("SELECT user_login, user_mail FROM usuarios WHERE user_login = :user_login OR user_mail = :user_mail");
      $verificaDuplicados->execute([
        ':user_login' => $user_login,
        ':user_mail' => $user_mail
      ]);
      while ($duplicado = $verificaDuplicados->fetch(PDO::FETCH_ASSOC)) {
        if ($duplicado['user_login'] === $user_login) {
          $errosCadastro[] = "Já existe um usuário com este login.";
        }
        if ($duplicado['user_mail'] === $user_mail) {
          $errosCadastro[] = "Já existe um usuário com este e-mail.";
        }
      }
    }

    if ($errosCadastro) {
      $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> " . implode("<br>", array_unique($errosCadastro));
      $mensagem_cor = "alert-danger";
      $log = "false";
    } else {
      try {
        $pdo->beginTransaction();
        $user_pass = password_hash($user_pass_raw, PASSWORD_DEFAULT);
        $pix_type_insert = $pix_type ?: null;

        $adc_user = $pdo->prepare("INSERT INTO `usuarios` (`user_sts`, `user_nome`, `user_mail`, `user_cel`, `user_funcao`, `user_login`, `user_pass`, `tipo_usuario` , `link`, `pix_type`, `chavepix`)
          VALUES ('1', :user_nome, :user_mail, :user_cel, :user_funcao, :user_login, :user_pass, :userType, :link, :pix_type, :chavepix);");

        $adc_user->bindParam(':user_nome', $user_nome, PDO::PARAM_STR);
        $adc_user->bindParam(':user_mail', $user_mail, PDO::PARAM_STR);
        $adc_user->bindParam(':user_cel', $user_cel, PDO::PARAM_STR);
        $adc_user->bindParam(':user_funcao', $user_funcao, PDO::PARAM_INT);
        $adc_user->bindParam(':user_login', $user_login, PDO::PARAM_STR);
        $adc_user->bindParam(':userType', $userType, PDO::PARAM_INT);
        $adc_user->bindParam(':user_pass', $user_pass, PDO::PARAM_STR);
        $adc_user->bindParam(':link', $link, PDO::PARAM_STR);
        $adc_user->bindValue(':pix_type', $pix_type_insert, $pix_type_insert === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $adc_user->bindParam(':chavepix', $chavepix, PDO::PARAM_STR);
        $adc_user->execute();

        $userId = $pdo->lastInsertId();
        if (!isset($_SESSION['usuarios']) || !is_array($_SESSION['usuarios'])) {
          $_SESSION['usuarios'] = [];
        }
        $_SESSION['usuarios'][] = $userId;

        if (count($companies) > 0) {
          $adc_clientes_usuarios = $pdo->prepare("INSERT INTO `clientes_usuarios` (`cliente_id`, `usuario_id`) VALUES (:companyId, :userId);");
          foreach ($companies as $companyId) {
            $adc_clientes_usuarios->bindValue(':companyId', $companyId, PDO::PARAM_INT);
            $adc_clientes_usuarios->bindValue(':userId', $userId, PDO::PARAM_INT);
            $adc_clientes_usuarios->execute();
          }
        }

        $pdo->commit();
        $mensagem = "<i class=\"fas fa-check\"></i> Usuário cadastrado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      } catch (Exception $e) {
        if ($pdo->inTransaction()) {
          $pdo->rollBack();
        }
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar usuário!";
        $mensagem_cor = "alert-danger";
        $log = "false";
      }
    }
  }



  if (isset($_POST['action'])  && $_POST['action'] == "edt_user") {

    if (($m1_03 ?? 0) != 1) {
      n3_forbidden('Voce nao tem permissao para editar usuarios.');
    }

    $user_id = trim($_POST['user_id']);
    $pdo = ConnectionN3();

    if (($m1_04 ?? 0) != 1) {
      $stmtPermAtual = $pdo->prepare("SELECT user_modulo_01, user_modulo_02, user_modulo_03, user_modulo_04, user_modulo_05, user_modulo_06, user_modulo_07, user_modulo_08, user_modulo_09 FROM usuarios WHERE user_id = :user_id LIMIT 1");
      $stmtPermAtual->bindParam(':user_id', $user_id, PDO::PARAM_INT);
      $stmtPermAtual->execute();
      $permissoesAtuais = $stmtPermAtual->fetch(PDO::FETCH_ASSOC);
      if (!$permissoesAtuais) {
        n3_forbidden('Usuario nao encontrado.', 404);
      }

      for ($moduloIndex = 1; $moduloIndex <= 9; $moduloIndex++) {
        $moduleKey = 'user_modulo_' . str_pad((string)$moduloIndex, 2, '0', STR_PAD_LEFT);
        $moduleValue = str_pad((string)($permissoesAtuais[$moduleKey] ?? ''), 10, '0');
        for ($permIndex = 0; $permIndex <= 9; $permIndex++) {
          $_POST['m' . $moduloIndex . '_' . str_pad((string)$permIndex, 2, '0', STR_PAD_LEFT)] = $moduleValue[$permIndex] ?? '0';
        }
      }
    }

    $user_sts = trim($_POST['user_sts']);
    $user_nome = trim($_POST['user_nome']);
    $user_mail = trim($_POST['user_mail']);
    $user_cel = trim($_POST['user_cel']);
    $user_funcao = trim($_POST['user_funcao']);
    $user_login = trim($_POST['user_login']);
    $userType = trim($_POST['tipo_usuario']);
    $link = trim($_POST['link']);
    $clientesSelecionadosNovos = isset($_POST['companiesEdit']) ? array_values(array_unique(array_filter(array_map('intval', (array)$_POST['companiesEdit'])))) : [];
    $pix_type = trim($_POST['pix_type']);
    $chavepix = trim($_POST['chavepix']);

    // MONTANDO ARRAY DOS DADOS RECEBIDOS
    $dadosRecebidos = [
      "user_id" => $user_id,
      "user_sts" => $user_sts,
      "user_nome" => $user_nome,
      "user_mail" => $user_mail,
      "user_cel" => $user_cel,
      "user_funcao" => $user_funcao,
      "user_login" => $user_login,
      "tipo_usuario" => $userType,
      "link" => $link,
      "companiesEdit" => $clientesSelecionadosNovos,
      "pix_type" => $pix_type,
      "chavepix" => $chavepix,
      "modulo_01" => $_POST['m1_00'] ?? '0000000000',
      "modulo_02" => $_POST['m2_00'] ?? '0000000000',
      "modulo_03" => $_POST['m3_00'] ?? '0000000000',
      "modulo_04" => $_POST['m4_00'] ?? '0000000000',
      "modulo_05" => $_POST['m5_00'] ?? '0000000000',
      "modulo_06" => $_POST['m6_00'] ?? '0000000000',
      "modulo_07" => $_POST['m7_00'] ?? '0000000000',
      "modulo_08" => $_POST['m8_00'] ?? '0000000000',
      "modulo_09" => $_POST['m9_00'] ?? '0000000000'
    ];

    $clientesSelecionados = $pdo->prepare("SELECT *
      FROM clientes_usuarios cu
      INNER JOIN clientes c ON cu.cliente_id = c.clt_id
      WHERE c.clt_sts = '1'
      AND cu.usuario_id = :user_id");

    $clientesSelecionados->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $clientesSelecionados->execute();
    $rowClientesSelecionados = $clientesSelecionados->fetchAll(PDO::FETCH_ASSOC);
    $idsClientesSelecionados = array_map('intval', array_column($rowClientesSelecionados, 'cliente_id'));

    $removesClientesSelecionados = array_diff($idsClientesSelecionados, $clientesSelecionadosNovos);
    $addsClientesSelecionados = array_diff($clientesSelecionadosNovos, $idsClientesSelecionados);

    if (count($removesClientesSelecionados) > 0) {
      $deleteRemovedClientesSelecionados = $pdo->prepare("DELETE FROM clientes_usuarios WHERE cliente_id IN
        (" . implode(',', array_map('intval', $removesClientesSelecionados)) . ")
        AND usuario_id = :user_id");

      $deleteRemovedClientesSelecionados->bindParam(':user_id', $user_id, PDO::PARAM_INT);
      $deleteRemovedClientesSelecionados->execute();
    }

    if (count($addsClientesSelecionados) > 0) {
      $addInsertedClientes = $pdo->prepare("INSERT INTO clientes_usuarios(cliente_id, usuario_id)
        VALUES (:cliente_id, :user_id)");
      foreach ($addsClientesSelecionados as $clienteId) {
        $addInsertedClientes->bindValue(':cliente_id', (int)$clienteId, PDO::PARAM_INT);
        $addInsertedClientes->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $addInsertedClientes->execute();
      }
    }

    // GESTÃO DE USUÁRIO
    $m1_00 = $_POST['m1_00'] ?? '0';  // ACESSAR MÓDULO USUÁRIOS (0: Desabilitado; 1:Habilitado)
    if ($m1_00 == 1) {
      $m1_01 = $_POST['m1_01'] ?? '0';  // VISUALIZAR USUÁRIOS (0: Desabilitado; 1:Habilitado)
      $m1_02 = $_POST['m1_02'] ?? '0';  // CADASTRAR NOVO USUÁRIO (0: Desabilitado; 1:Habilitado)
      $m1_03 = $_POST['m1_03'] ?? '0';  // EDITAR INFORMAÇÕES CADASTRAIS (0: Desabilitado; 1:Habilitado)
      $m1_04 = $_POST['m1_04'] ?? '0';  // EDITAR NºVEL DE ACESSO (0: Desabilitado; 1:Habilitado)
      $m1_05 = '0'; // vazio
      $m1_06 = '0'; // vazio
      $m1_07 = '0'; // vazio
      $m1_08 = '0'; // vazio
      $m1_09 = '0'; // vazio
      $m1 = "$m1_00$m1_01$m1_02$m1_03$m1_04$m1_05$m1_06$m1_07$m1_08$m1_09";
    } else {
      $m1 = $_POST['user_mod_01'] ?? "0000000000";
    }

    // CADASTROS
    $m2_00 = $_POST['m2_00'] ?? '0';  // ACESSAR MÓDULO CADASTROS (0: Desabilitado; 1:Habilitado)
    if ($m2_00 == 1) {
      $m2_01 = $_POST['m2_01'] ?? '0';  // CADASTRO DE CLIENTES
      $m2_02 = $_POST['m2_02'] ?? '0';  // CADASTRO DE PESSOAS DE CONTATO
      $m2_03 = $_POST['m2_03'] ?? '0';  // CADASTRO DE LOCAIS DE ATENDIMENTO
      $m2_04 = $_POST['m2_04'] ?? '0';  // CADASTRO DE CATEGORIA
      $m2_05 = $_POST['m2_05'] ?? '0';  // CADASTRO DE SUBCATEGORIA
      $m2_06 = $_POST['m2_06'] ?? '0';  // CADASTRO DE ITEM
      $m2_07 = '0'; // vazio
      $m2_08 = '0'; // vazio
      $m2_09 = '0'; // vazio
      $m2 = "$m2_00$m2_01$m2_02$m2_03$m2_04$m2_05$m2_06$m2_07$m2_08$m2_09";
    } else {
      $m2 = $_POST['user_mod_02'] ?? "0000000000";
    }

    // ATENDIMENTOS
    $m3_00 = $_POST['m3_00'] ?? '0';  // ACESSAR MÓDULO ATENDIMENTOS
    if ($m3_00 == 1) {
      $m3_01 = $_POST['m3_01'] ?? '0';  // CADASTRO DE ATENDIMENTOS
      $m3_02 = $_POST['m3_02'] ?? '0';  // EXECUTAR ATENDIMENTOS
      $m3_03 = $_POST['m3_03'] ?? '0';  // COLOCAR ATENDIMENTO EM ESPERA
      $m3_04 = $_POST['m3_04'] ?? '0';  // RECUSAR ATENDIMENTO
      $m3_05 = $_POST['m3_05'] ?? '0';  // GERIR ATENDIMENTO DE TERCEIROS
      $m3_06 = $_POST['m3_06'] ?? '0';  // ACESSO A RADIO
      $m3_07 = '0'; // vazio
      $m3_08 = '0'; // vazio
      $m3_09 = '0'; // vazio
      $m3 = "$m3_00$m3_01$m3_02$m3_03$m3_04$m3_05$m3_06$m3_07$m3_08$m3_09";
    } else {
      $m3 = $_POST['user_mod_03'] ?? "0000000000";
    }

    // RELATÓRIOS
    $m5_00 = filter_input(INPUT_POST, 'm5_00', FILTER_SANITIZE_FULL_SPECIAL_CHARS);  // ACESSAR MÓDULO RELATÓRIOS (0: Desabilitado; 1: Habilitado)
    if ($m5_00 > 0) {
      $m5_01 = filter_input(INPUT_POST, 'm5_01', FILTER_SANITIZE_FULL_SPECIAL_CHARS);  // RELATÓRIO DE ATENDIMENTOS (0: Desabilitado; 3: Edição)
      $m5_02 = filter_input(INPUT_POST, 'm5_02', FILTER_SANITIZE_FULL_SPECIAL_CHARS);  // RELATÓRIO DE DISPONIBILIDADE (0: Desabilitado; 3: Edição)
      $m5_03 = 0; // vazio
      $m5_04 = 0; // vazio
      $m5_05 = 0; // vazio
      $m5_06 = 0; // vazio
      $m5_07 = 0; // vazio
      $m5_08 = 0; // vazio
      $m5_09 = 0; // vazio
      $m5 = "$m5_00" . "$m5_01" . "$m5_02" . "$m5_03" . "$m5_04" . "$m5_05" . "$m5_06" . "$m5_07" . "$m5_08" . "$m5_09";
    } else {
      $m5 = $_POST['user_mod_05'] ?? "0000000000";
    }

    // INVENTÁRIO
    $m6_00 = filter_input(INPUT_POST, 'm6_00', FILTER_SANITIZE_FULL_SPECIAL_CHARS);  // ACESSAR MÓDULO INVENTÁRIO (0: Desabilitado; 1: Habilitado)
    if ($m6_00 == 1) {
      $m6_01 = filter_input(INPUT_POST, 'm6_01', FILTER_SANITIZE_FULL_SPECIAL_CHARS);  // GERENCIAR PATRIMÔNIO (0: Desabilitado; 3: Edição)
      $m6_02 = filter_input(INPUT_POST, 'm6_02', FILTER_SANITIZE_FULL_SPECIAL_CHARS);  // CONSULTAR ESTOQUE (0: Desabilitado; 3: Edição)
      $m6_03 = 0; // vazio
      $m6_04 = 0; // vazio
      $m6_05 = 0; // vazio
      $m6_06 = 0; // vazio
      $m6_07 = 0; // vazio
      $m6_08 = 0; // vazio
      $m6_09 = 0; // vazio
      $m6 = "$m6_00" . "$m6_01" . "$m6_02" . "$m6_03" . "$m6_04" . "$m6_05" . "$m6_06" . "$m6_07" . "$m6_08" . "$m6_09";
    } else {
      $m6 = "0000000000";
    }

    // FINANCEIRO
    $m7_00 = filter_input(INPUT_POST, 'm7_00', FILTER_SANITIZE_FULL_SPECIAL_CHARS);  // ACESSAR MÓDULO FINANCEIRO (0: Desabilitado; 1: Habilitado)
    if ($m7_00 == 1) {
      $m7_01 = filter_input(INPUT_POST, 'm7_01', FILTER_SANITIZE_FULL_SPECIAL_CHARS);  // GERENCIAR CONTAS A PAGAR (0: Desabilitado; 3: Edição)
      $m7_02 = filter_input(INPUT_POST, 'm7_02', FILTER_SANITIZE_FULL_SPECIAL_CHARS);  // GERENCIAR CONTAS A RECEBER (0: Desabilitado; 3: Edição)
      $m7_03 = filter_input(INPUT_POST, 'm7_03', FILTER_SANITIZE_FULL_SPECIAL_CHARS);  // RELATÓRIOS FINANCEIROS (0: Desabilitado; 3: Edição)
      $m7_04 = 0; // vazio
      $m7_05 = 0; // vazio
      $m7_06 = 0; // vazio
      $m7_07 = 0; // vazio
      $m7_08 = 0; // vazio
      $m7_09 = 0; // vazio
      $m7 = "$m7_00" . "$m7_01" . "$m7_02" . "$m7_03" . "$m7_04" . "$m7_05" . "$m7_06" . "$m7_07" . "$m7_08" . "$m7_09";
    } else {
      $m7 = "0000000000";
    }


    // CONFIGURAÇÕES
    $m4_00 = $_POST['m4_00'] ?? '0';  // ACESSAR MÓDULO CONFIGURAÇÕES
    if ($m4_00 == 1) {
      $m4_01 = $_POST['m4_01'] ?? '0';  // TEMPO DE ALERTA
      $m4_02 = $_POST['m4_02'] ?? '0';  // SLA DE ATENDIMENTO
      $m4_03 = $_POST['m4_03'] ?? '0';  // PERFIL DE ATENDIMENTO
      $m4_04 = $_POST['m4_04'] ?? '0';  // PERFIL DE ATENDIMENTO
      $m4_05 = '0'; // vazio
      $m4_06 = '0'; // vazio
      $m4_07 = '0'; // vazio
      $m4_08 = '0'; // vazio
      $m4_09 = '0'; // vazio
      $m4 = "$m4_00$m4_01$m4_02$m4_03$m4_04$m4_05$m4_06$m4_07$m4_08$m4_09";
    } else {
      $m4 = $_POST['user_mod_04'] ?? "0000000000";
    }



    // DISPONIBILIDADE TÉCNICA
    $m8_00 = $_POST['m8_00'] ?? '0';  // ACESSAR MÓDULO DISPONIBILIDADE TÉCNICA
    if ($m8_00 > 0) {
      $m8_01 = $_POST['m8_01'] ?? '0';  // RELATÓRIO DE DISPONIBILIDADE
      $m8_02 = $_POST['m8_02'] ?? '0';  // RELATÓRIO DE INDISPONIBILIDADE
      $m8_03 = $_POST['m8_03'] ?? '0';  // GERENCIAMENTO DE RELATÓRIOS
      $m8_04 = $_POST['m8_04'] ?? '0';  // GERENCIAMENTO DE CATALOGOS
      $m8_05 = '0'; // vazio
      $m8_06 = '0'; // vazio
      $m8_07 = '0'; // vazio
      $m8_08 = '0'; // vazio
      $m8_09 = '0'; // vazio
      $m8 = "$m8_00$m8_01$m8_02$m8_03$m8_04$m8_05$m8_06$m8_07$m8_08$m8_09";
    } else {
      $m8 = $_POST['user_mod_08'] ?? "0000000000";
    }

    //veiculos
    $m9_00 = $_POST['m9_00'] ?? '0';  // ACESSAR MÓDULO VEICULOS
    if ($m9_00 > 0) {
      $m9_01 = $_POST['m9_01'] ?? '0';  // AGENDA
      $m9_02 = $_POST['m9_02'] ?? '0';  // MANUTENÇÃO
      $m9_03 = $_POST['m9_03'] ?? '0';  // ABASTECIMENTO
      $m9_04 = '0';  // vazio
      $m9_05 = '0'; // vazio
      $m9_06 = '0'; // vazio
      $m9_07 = '0'; // vazio
      $m9_08 = '0'; // vazio
      $m9_09 = '0'; // vazio
      $m9 = "$m9_00" . "$m9_01" . "$m9_02" . "$m9_03" . "$m9_04" . "$m9_05" . "$m9_06" . "$m9_07" . "$m9_08" . "$m9_09";
    } else {
      $m9 = $_POST['user_mod_09'] ?? "0000000000";
    }



    $pdo = ConnectionN3();
    $edt_user = $pdo->prepare("UPDATE `usuarios` SET `user_sts`=:user_sts, `user_nome`=:user_nome, `user_mail`=:user_mail, `user_cel`=:user_cel, `user_funcao`=:user_funcao, `user_login`=:user_login, `user_modulo_01`=:m1, `user_modulo_02`=:m2, `user_modulo_03`=:m3, `user_modulo_04`=:m4, `user_modulo_05`=:m5, `user_modulo_06`=:m6, `user_modulo_07`=:m7, `user_modulo_08`=:m8, `user_modulo_09`=:m9, `tipo_usuario`=:tipo_usuario,`link`=:link, `pix_type`=:pix_type, `chavepix`=:chavepix  WHERE `user_id`=:user_id;");
    $edt_user->bindParam(':user_sts', $user_sts);
    $edt_user->bindParam(':user_nome', $user_nome);
    $edt_user->bindParam(':user_mail', $user_mail);
    $edt_user->bindParam(':user_cel', $user_cel);
    $edt_user->bindParam(':user_funcao', $user_funcao);
    $edt_user->bindParam(':user_login', $user_login);
    $edt_user->bindParam(':m1', $m1);
    $edt_user->bindParam(':m2', $m2);
    $edt_user->bindParam(':m3', $m3);
    $edt_user->bindParam(':m4', $m4);
    $edt_user->bindParam(':m5', $m5);
    $edt_user->bindParam(':m6', $m6);
    $edt_user->bindParam(':m7', $m7);
    $edt_user->bindParam(':m8', $m8);
    $edt_user->bindParam(':m9', $m9);
    $edt_user->bindParam(':tipo_usuario', $userType, PDO::PARAM_INT);
    $edt_user->bindParam(':link', $link);
    $edt_user->bindParam(':pix_type', $pix_type);
    $edt_user->bindParam(':chavepix', $chavepix);
    $edt_user->bindParam(':user_id', $user_id);


    if ($edt_user->execute()) {

      // var_dump($_POST);
      // exit;
      // Atualiza os dados do usuário na sessão
      $_SESSION['user_sts'] = $user_sts;
      $_SESSION['user_nome'] = $user_nome;
      $_SESSION['user_mail'] = $user_mail;
      $_SESSION['user_cel'] = $user_cel;
      $_SESSION['user_funcao'] = $user_funcao;
      $_SESSION['user_login'] = $user_login;
      $_SESSION['tipo'] = $userType;
      $_SESSION['link'] = $link;
      $_SESSION['pix_type'] = $pix_type;
      $_SESSION['chavepix'] = $chavepix;

      // Atualiza as permissões de módulos na sessão
      $_SESSION['m1_00'] = $m1;
      $_SESSION['m2_00'] = $m2;
      $_SESSION['m3_00'] = $m3;
      $_SESSION['m4_00'] = $m4;
      $_SESSION['m5_00'] = $m5;
      $_SESSION['m6_00'] = $m6;
      $_SESSION['m7_00'] = $m7;
      $_SESSION['m8_00'] = $m8;
      $_SESSION['m9_00'] = $m9;

      $mensagem = "<i class=\"fas fa-check\"></i> Usuário editado com sucesso!";
      $mensagem_cor = "alert-success";
      $log = "true";
    } else {
      $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar usuário!";
      $mensagem_cor = "alert-danger";
      $log = "false";
    }
  }

  if (isset($mensagem) && isset($mensagem_cor)) {
    $_SESSION['user_flash'] = [
      'message' => $mensagem,
      'class' => $mensagem_cor
    ];
  }

  header("Location: " . $_SERVER['REQUEST_URI'], true, 303);
  exit;
}

?>
<!doctype html>
<html lang="pt-BR">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link rel="icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../css/bootstrap.min.css">
  <link rel="stylesheet" href="../fontawesome/css/all.css">
  <link rel="stylesheet" href="../css/help.css">
  <title>Allterus</title>
</head>
<style>
  html {
    min-height: 100%;
  }

  body.user-dashboard {
    zoom: 1;
    min-height: 100dvh;
    width: 100%;
    overflow-x: hidden;
    background: #f6f8fb;
    color: #0f172a;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }

  body.user-dashboard,
  body.user-dashboard input,
  body.user-dashboard button,
  body.user-dashboard select,
  body.user-dashboard textarea,
  body.user-dashboard .modal,
  body.user-dashboard .card,
  body.user-dashboard .table {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }

  .user-page {
    min-height: 100dvh;
    padding: 14px 18px 18px;
  }

  .user-page-card {
    min-height: calc(100dvh - 32px);
    border: 1px solid #dbe3ef;
    border-radius: 8px;
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .user-page-card .card-header {
    flex: 0 0 auto;
    background: #fff;
    border-bottom: 1px solid #d9e0ea;
  }

  .user-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px;
  }

  .user-title-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .user-title-icon {
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #edf5ff;
    color: #0d6efd;
    flex: 0 0 38px;
  }

  .user-page-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.25;
    color: #111827;
  }

  .user-page-subtitle {
    margin: 2px 0 0;
    color: #64748b;
    font-size: .82rem;
    line-height: 1.3;
  }

  .user-add-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-color: #0d6efd;
    color: #0b5ed7 !important;
    font-weight: 600;
    border-radius: 6px;
    padding: 6px 12px;
    white-space: nowrap;
  }

  .user-add-button:hover {
    background: #0d6efd;
    color: #fff !important;
  }

  .user-add-button:hover i {
    color: #fff !important;
  }

  .user-page-card .card-body {
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
    overflow: hidden;
    background: #fbfdff;
  }

  .table-container {
    height: 100%;
    max-height: calc(100dvh - 126px);
    overflow: auto;
    display: block;
    border: 0;
  }

  .table-container .table {
    width: 100%;
    min-width: 760px;
    margin-bottom: 0;
    border-collapse: separate;
    border-spacing: 0;
  }

  .table-container thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #f8fafc;
    border-bottom: 1px solid #d9e0ea;
    color: #475569;
    font-size: .76rem;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: uppercase;
    padding: 11px 16px;
  }

  .table-container td,
  .table-container th {
    vertical-align: middle;
    white-space: nowrap;
  }

  .user-table tbody tr {
    background: #fff;
    transition: background-color .16s ease, box-shadow .16s ease;
  }

  .user-table tbody tr:hover {
    background: #f8fbff;
  }

  .user-table tbody td {
    border-top: 0;
    border-bottom: 1px solid #edf1f6;
    padding: 12px 16px;
  }

  .table-container td:nth-child(2) {
    white-space: normal;
    min-width: 220px;
  }

  .user-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 92px;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: .8rem;
    font-weight: 600;
    line-height: 1;
    border: 1px solid transparent;
  }

  .user-status-badge.is-active {
    background: #ecfdf3;
    color: #067647;
    border-color: #b7ebc6;
  }

  .user-status-badge.is-inactive {
    background: #f8fafc;
    color: #667085;
    border-color: #d8dee8;
  }

  .user-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: currentColor;
    box-shadow: 0 0 0 3px rgba(6, 118, 71, .12);
  }

  .is-inactive .user-status-dot {
    box-shadow: 0 0 0 3px rgba(102, 112, 133, .12);
  }

  .user-name-cell {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .user-name-text {
    color: #111827;
    font-weight: 650;
    line-height: 1.25;
  }

  .user-type-badge {
    display: inline-flex;
    align-items: center;
    padding: 5px 9px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #334155;
    font-size: .78rem;
    font-weight: 600;
    border: 1px solid #e2e8f0;
  }

  .user-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    white-space: nowrap;
  }

  .user-actions form {
    margin: 0;
  }

  .user-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-width: 94px;
    border-radius: 6px;
    font-weight: 600;
    padding: 5px 10px;
  }

  .user-action-edit {
    border-color: #cbd5e1;
    color: #334155;
    background: #fff;
  }

  .user-action-edit:hover {
    border-color: #0d6efd;
    color: #0b5ed7;
    background: #eef6ff;
  }

  .user-action-disable {
    border-color: #ffd0d0;
    color: #b42318;
    background: #fff7f7;
  }

  .user-action-disable:hover {
    border-color: #f04438;
    color: #fff;
    background: #d92d20;
  }

  .user-row-inactive {
    color: #64748b;
    background: #fbfcfe !important;
  }

  .user-row-inactive .user-name-text {
    color: #64748b;
  }

  .table-container td:last-child,
  .table-container th:last-child {
    text-align: right;
  }

  .user-modal .modal-content {
    border: 0;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(15, 23, 42, .24);
    max-height: calc(100dvh - 56px);
    display: flex;
    flex-direction: column;
  }

  .modal-open {
    overflow: hidden !important;
    height: 100vh;
  }

  .user-modal {
    overflow: hidden !important;
  }

  .user-modal .modal-dialog {
    max-height: calc(100dvh - 56px);
    margin-top: 28px;
    margin-bottom: 28px;
    display: flex;
    align-items: flex-start;
  }

  .user-modal .modal-header {
    flex: 0 0 auto;
    align-items: flex-start;
    background: #fff;
    color: #111827;
    border-bottom: 1px solid #e2e8f0;
    padding: 18px 20px;
  }

  .user-modal-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .user-modal-icon {
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #edf5ff;
    color: #0d6efd;
    flex: 0 0 38px;
  }

  .user-modal-title h6 {
    margin: 0;
    color: #111827;
    font-size: 1rem;
    font-weight: 700;
  }

  .user-modal-title p {
    margin: 2px 0 0;
    color: #64748b;
    font-size: .82rem;
  }

  .user-modal .modal-body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 18px 20px 4px;
    background: #f8fafc;
    max-height: calc(100dvh - 190px);
    overflow-y: auto;
    overflow-x: hidden;
  }

  .user-modal .form-row {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin: 0 0 12px;
    padding: 12px 8px 2px;
  }

  .user-modal label {
    color: #475569;
    font-weight: 650;
  }

  .user-modal .input-group-text {
    min-width: 34px;
    justify-content: center;
    background: #f8fafc;
    color: #64748b;
    border-color: #d8e0eb;
  }

  .user-modal .form-control,
  .user-modal .custom-select {
    border-color: #d8e0eb;
    color: #111827;
  }

  .user-modal .form-control:focus,
  .user-modal .custom-select:focus {
    border-color: #80bdff;
    box-shadow: 0 0 0 .2rem rgba(13, 110, 253, .15);
  }

  .form-section {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 14px;
  }

  .form-section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px;
    color: #334155;
    font-size: .86rem;
    font-weight: 700;
  }

  .form-section-title i {
    color: #0d6efd;
  }

  .user-type-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .user-type-option {
    position: relative;
    margin: 0;
  }

  .user-type-option input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .user-type-option span {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 38px;
    padding: 9px 11px;
    border: 1px solid #d8e0eb;
    border-radius: 7px;
    color: #334155;
    font-size: .86rem;
    font-weight: 600;
    cursor: pointer;
    transition: all .16s ease;
  }

  .user-type-option input:checked + span {
    border-color: #0d6efd;
    background: #eef6ff;
    color: #0b5ed7;
    box-shadow: 0 0 0 3px rgba(13, 110, 253, .08);
  }

  .password-rules {
    display: flex;
    flex-wrap: wrap;
    gap: 7px 12px;
    margin-top: 7px;
    color: #64748b;
    font-size: .76rem;
  }

  .password-meter {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
    margin-top: 8px;
  }

  .password-meter span {
    display: block;
    height: 4px;
    border-radius: 999px;
    background: #e2e8f0;
    transition: background-color .16s ease;
  }

  .password-meter.strength-1 span:nth-child(-n + 1),
  .password-meter.strength-2 span:nth-child(-n + 2),
  .password-meter.strength-3 span:nth-child(-n + 3),
  .password-meter.strength-4 span:nth-child(-n + 4) {
    background: #f59e0b;
  }

  .password-meter.is-complete span {
    background: #067647;
  }

  .password-rules-label {
    flex: 1 0 100%;
    color: #475569;
    font-weight: 700;
  }

  .password-rules span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .password-rules .is-met {
    color: #0b5ed7;
  }

  .password-rules.is-complete,
  .password-rules.is-complete .is-met {
    color: #067647;
  }

  .password-rules i {
    font-size: .62rem;
  }

  .companies-helper {
    margin-top: 6px;
    color: #64748b;
    font-size: .76rem;
  }

  .user-modal .modal-footer {
    flex: 0 0 auto;
    background: #fff;
    border-top: 1px solid #e2e8f0;
    padding: 12px 20px;
  }

  .user-modal .select2-container--default .select2-selection--multiple {
    min-height: 34px;
    max-height: 78px;
    overflow-y: auto;
    overflow-x: hidden;
    border-color: #ced4da;
    border-radius: 4px;
    padding: 3px 5px;
  }

  .user-modal .select2-container--default .select2-selection--multiple .select2-selection__rendered {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 4px;
    margin: 0;
    padding: 0;
  }

  .user-modal .select2-container--default .select2-selection--multiple .select2-selection__choice {
    max-width: calc(100% - 6px);
    margin: 0;
    padding: 2px 7px 2px 20px;
    border-color: #cbd5e1;
    border-radius: 4px;
    background: #f1f5f9;
    color: #0f172a;
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-modal .select2-container--default .select2-selection--multiple .select2-selection__choice__remove {
    left: 6px;
    color: #64748b;
  }

  .user-modal .select2-container--default .select2-search--inline {
    flex: 1 0 120px;
    min-width: 120px;
  }

  .user-modal .select2-container--default .select2-search--inline .select2-search__field {
    width: 100% !important;
    margin: 2px 0;
  }

  .user-modal .select2-dropdown {
    border-color: #80bdff;
    box-shadow: 0 12px 24px rgba(15, 23, 42, .16);
  }

  .edit-user-content {
    background: #f8fafc;
  }

  .edit-user-content .card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: none;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .edit-user-content .card-header {
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    padding: 0;
  }

  .edit-user-content .card-header .btn {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    color: #111827;
    text-align: left;
    text-decoration: none;
  }

  .edit-user-content .card-header .btn::after {
    content: "\f107";
    font-family: "Font Awesome 5 Free";
    font-weight: 900;
    color: #64748b;
  }

  .edit-user-content .card-header .btn[aria-expanded="true"]::after {
    content: "\f106";
  }

  .edit-user-content .card-header h6 {
    margin: 0;
    font-size: .9rem;
    font-weight: 700;
    color: #111827;
  }

  .edit-user-content .card-body {
    background: #fff;
    padding: 14px;
  }

  .edit-user-content .form-group.row {
    margin: 0 -6px;
  }

  .edit-user-content .form-group.row > [class*="col-"] {
    padding-left: 6px;
    padding-right: 6px;
    margin-bottom: 12px;
  }

  .edit-user-content label,
  .edit-user-content .form-text {
    color: #475569 !important;
    font-size: .78rem;
    font-weight: 650;
  }

  .edit-user-content .input-group-text {
    min-width: 34px;
    justify-content: center;
    background: #f8fafc;
    color: #64748b;
    border-color: #d8e0eb;
  }

  .edit-user-content .form-control,
  .edit-user-content .custom-select {
    border-color: #d8e0eb;
    color: #111827;
  }

  .edit-user-content .form-control:focus,
  .edit-user-content .custom-select:focus {
    border-color: #80bdff;
    box-shadow: 0 0 0 .2rem rgba(13, 110, 253, .15);
  }

  .user-modal .select2-container--default.select2-container--focus .select2-selection--multiple {
    border-color: #80bdff;
    box-shadow: 0 0 0 .2rem rgba(0, 123, 255, .25);
  }

  .user-flash {
    position: fixed;
    top: 18px;
    right: 18px;
    z-index: 1085;
    min-width: 280px;
    max-width: min(460px, calc(100vw - 36px));
    border-radius: 8px;
    box-shadow: 0 16px 34px rgba(15, 23, 42, .18);
    border: 1px solid rgba(15, 23, 42, .08);
  }

  .user-flash.fade-out {
    opacity: 0;
    transform: translateY(-8px);
    transition: opacity .22s ease, transform .22s ease;
  }

  @media (max-width: 1024px) {
    .user-page {
      padding: 10px 8px 12px;
    }

    .user-page-card {
      min-height: calc(100dvh - 22px);
    }

    .table-container {
      max-height: calc(100dvh - 112px);
    }
  }

  @media (max-width: 767.98px) {
    .user-card-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .user-add-button {
      width: 100%;
      justify-content: center;
    }

    .modal-dialog.modal-lg,
    .modal-dialog.modal-xl {
      max-width: calc(100% - 16px);
      max-height: calc(100dvh - 16px);
      margin: 8px auto;
    }

    .password-rules,
    .user-type-options {
      grid-template-columns: 1fr;
    }
  }
</style>

<body class="user-dashboard">
  <?php include_once("../all/loading.php"); ?>
  <?php include("../all/sidebar.php"); ?>

  <div class="container-fluid user-page">
    <div class="row">
      <div class="col-md-12">
        <div class="card user-page-card">
          <div class="card-header p-0">
            <div class="user-card-header">
              <div class="user-title-wrap">
                <span class="user-title-icon"><i class="fas fa-users"></i></span>
                <div>
                  <h1 class="user-page-title">Usuários cadastrados</h1>
                  <p class="user-page-subtitle">Gerencie acessos, perfis e situação dos usuários do sistema.</p>
                </div>
              </div>
              <?php if (($m1_02 ?? 0) == 1) { ?>
                <!-- ? Mantém sintaxe Bootstrap 4 -->
                <button type="button" class="btn btn-outline-primary btn-sm user-add-button" data-toggle="modal" data-target="#new_user">
                  <i class="fas fa-user-plus"></i> Adicionar Usuário
                </button>
              <?php } ?>
            </div>
          </div>

          <?php if (isset($flashMessage['message']) && isset($flashMessage['class'])) { ?>
            <div class="alert <?php echo htmlspecialchars($flashMessage['class'], ENT_QUOTES, 'UTF-8'); ?> user-flash mb-0 py-2 px-3 pr-5" id="userFlashMessage" role="alert">
              <?php echo $flashMessage['message']; ?>
              <button type="button" class="close" aria-label="Fechar" data-dismiss="alert">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          <?php } ?>

          <div class="card-body p-0">
            <div class="table-container">
              <table class="table table-hover table-sm user-table">
                <thead>
                  <tr>
                    <th>Situação</th>
                    <th>Nome</th>
                    <th>Função</th>
                    <th>Tipo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <?php
                  $filterUsuariosEmpresas = "";

                  if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['usuarios']) && count($_SESSION['usuarios']) > 0) {
                    $filterUsuariosEmpresas .= " AND usuarios.user_id IN (" . implode(',', $_SESSION['usuarios']) . ")";
                  }

                  $pdo = ConnectionN3();
                  $show_eqp = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome, usuarios.user_sts, usuarios.user_funcao, usuarios.tipo_usuario, cargos_n3.cargo_nome
                      FROM usuarios 
                      LEFT JOIN cargos_n3 ON cargos_n3.cargo_id = usuarios.user_funcao
                      WHERE usuarios.user_id > '1' $filterUsuariosEmpresas
                      ORDER BY usuarios.user_sts ASC, usuarios.user_nome ASC");
                  $show_eqp->execute();

                  while ($row = $show_eqp->fetch(PDO::FETCH_ASSOC)) {
                    $usuario_ativo = (int)$row["user_sts"] === 1;
                    $pode_alterar_usuario = (($m1_03 ?? 0) == 1);
                    $pode_desativar_usuario = $pode_alterar_usuario && $usuario_ativo && (string)$row['user_id'] !== (string)$usuario_logado_id;
                  ?>
                    <tr class="<?php echo $usuario_ativo ? '' : 'user-row-inactive'; ?>">
                      <td>
                        <?php if ($usuario_ativo) { ?>
                          <span class="user-status-badge is-active"><span class="user-status-dot"></span> Ativo</span>
                        <?php } else { ?>
                          <span class="user-status-badge is-inactive"><span class="user-status-dot"></span> Inativo</span>
                        <?php } ?>
                      </td>
                      <td>
                        <div class="user-name-cell">
                          <span class="user-name-text"><?php echo htmlspecialchars($row["user_nome"], ENT_QUOTES, 'UTF-8'); ?></span>
                        </div>
                      </td>
                      <td><?php echo htmlspecialchars($row["cargo_nome"] ?? "-", ENT_QUOTES, 'UTF-8'); ?></td>
                      <td>
                        <span class="user-type-badge"><?php echo $row["tipo_usuario"] == 1 ? "Colaborador" : "Cliente"; ?></span>
                      </td>
                      <td>
                        <div class="user-actions">
                          <?php if ($pode_alterar_usuario) { ?>
                            <button type="button" class="btn btn-sm view_data user-action-btn user-action-edit" id="<?php echo $row['user_id']; ?>">
                              <i class="fas fa-user-edit"></i> Editar
                            </button>
                          <?php } ?>

                          <?php if ($pode_desativar_usuario) { ?>
                            <form method="POST" action="" onsubmit="return confirm('Deseja desativar este usuário?');">
                              <input type="hidden" name="action" value="deactivate_user">
                              <input type="hidden" name="user_id" value="<?php echo (int)$row['user_id']; ?>">
                              <input type="hidden" name="token" value="<?php echo $token; ?>">
                              <button type="submit" class="btn btn-sm user-action-btn user-action-disable">
                                <i class="fas fa-user-slash"></i> Desativar
                              </button>
                            </form>
                          <?php } elseif ($usuario_ativo && $pode_alterar_usuario && (string)$row['user_id'] === (string)$usuario_logado_id) { ?>
                            <button type="button" class="btn btn-sm user-action-btn user-action-edit" disabled>
                              <i class="fas fa-user-shield"></i> Atual
                            </button>
                          <?php } ?>

                          <?php if (!$pode_alterar_usuario) { ?>
                            <span class="text-muted small">Sem permissão</span>
                          <?php } ?>
                        </div>
                      </td>
                    </tr>
                  <?php } ?>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL DE CADASTRO DE NOVO USUARIO -->
  <div class="modal fade user-modal" id="new_user" tabindex="-1" role="dialog" aria-labelledby="new_user_title" aria-hidden="true">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <form action="#" method="POST" id="newUserForm">
          <div class="modal-header">
            <div class="user-modal-title">
              <span class="user-modal-icon"><i class="fas fa-user-plus"></i></span>
              <div>
                <h6 class="modal-title" id="new_user_title">Cadastro de usuários</h6>
                <p>Preencha os dados de acesso, perfil e vínculos do novo usuário.</p>
              </div>
            </div>
            <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-row">

              <div class="form-group col-md-12">
                <label class="small mb-1 text-left">Nome:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="far fa-user"></i></div>
                  </div>
                  <input name="user_nome" placeholder="Nome completo" type="text" class="form-control form-control-sm" maxlength="60" autocomplete="name" required>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col-md-6">
                <label class="small mb-1 text-left"> E-mail:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-at"></i></div>
                  </div>
                  <input name="user_mail" type="email" class="form-control form-control-sm" maxlength="60" autocomplete="email" required>
                </div>
              </div>

              <div class="form-group col-md-6">
                <label class="small mb-1 text-left"> Celular:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-mobile-alt"></i></div>
                  </div>
                  <input name="user_cel" placeholder="(00)00000-0000" type="text" class="form-control form-control-sm" maxlength="20" autocomplete="tel" required>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col-md-6">
                <label class="small mb-1 text-right">Login:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-sign-in-alt"></i></div>
                  </div>
                  <input name="user_login" type="text" class="form-control form-control-sm" maxlength="15" autocomplete="username" required>
                </div>
              </div>

              <div class="form-group col-md-6">
                <label class="small mb-1 text-right">Senha:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-key"></i></div>
                  </div>
                  <input name="user_pass" type="password" class="form-control form-control-sm" id="passwordInput" minlength="12" maxlength="100" autocomplete="new-password" required>
                </div>
                <div class="password-meter" id="passwordMeter" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div class="password-rules" id="passwordRules">
                  <strong class="password-rules-label">Requisitos: 12 ou mais caracteres contendo</strong>
                  <span data-rule="upper"><i class="fas fa-circle"></i> Maiúscula</span>
                  <span data-rule="lower"><i class="fas fa-circle"></i> Minúscula</span>
                  <span data-rule="number"><i class="fas fa-circle"></i> Número</span>
                  <span data-rule="symbol"><i class="fas fa-circle"></i> Símbolo</span>
                </div>
                <div id="passwordError" class="text-danger mt-2" style="display: none;"></div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col-md-6">
                <label class="small mb-1 text-left">Tipo Pix:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-key"></i></div>
                  </div>
                  <select name="pix_type" class="custom-select custom-select-sm">
                    <option value="">Selecione...</option>
                    <?php
                    $pdo = ConnectionN3();
                    $stmtTipos = $pdo->query("SELECT id, name_type FROM type_keys ORDER BY id");
                    while ($tipo = $stmtTipos->fetch(PDO::FETCH_ASSOC)) {
                      echo '<option value="' . htmlspecialchars($tipo['id']) . '">' . htmlspecialchars($tipo['name_type']) . '</option>';
                    }
                    ?>
                  </select>
                </div>
              </div>

              <div class="form-group col-md-6">
                <label class="small mb-1 text-left">Chave Pix:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-dollar-sign"></i></div>
                  </div>
                  <input name="chavepix" placeholder="Chave Pix" type="text" class="form-control form-control-sm" maxlength="120">
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col-md-6">
                <label class="small mb-1 text-left">Função:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-sitemap"></i></div>
                  </div>
                  <select name="user_funcao" required="required" class="custom-select custom-select-sm
                  ">
                    <option></option>
                    <?php
                    $pdo = ConnectionN3();
                    $show_cargo = $pdo->prepare("SELECT cargos_n3.* FROM cargos_n3 WHERE cargos_n3.cargo_sts = '1'");
                    $show_cargo->execute();
                    while ($rowc = $show_cargo->fetch(PDO::FETCH_ASSOC)) {
                      $cargo_id = $rowc["cargo_id"];
                      $cargo_nome = $rowc["cargo_nome"];
                    ?>
                      <option value="<?php echo $cargo_id; ?>"><?php echo $cargo_nome; ?></option>
                    <?php } ?>
                  </select>
                </div>
              </div>

              <div class="form-group col-md-6">
                <label class="small mb-1 text-left">Tipo:</label>
                <div class="user-type-options">
                  <?php
                  $tipoUsuarioSelecionado = isset($userType) ? (int)$userType : 2;
                  ?>
                  <label class="user-type-option" for="admin">
                    <input type="radio" id="admin" name="tipo_usuario" value="1" <?php echo ($tipoUsuarioSelecionado == 1) ? 'checked' : ''; ?> required>
                    <span><i class="fas fa-id-badge"></i> Colaborador</span>
                  </label>
                  <label class="user-type-option" for="cliente">
                    <input type="radio" id="cliente" name="tipo_usuario" value="2" <?php echo ($tipoUsuarioSelecionado == 2) ? 'checked' : ''; ?> required>
                    <span><i class="fas fa-building"></i> Cliente</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="form-row">

              <div class="form-group col-md-6">
                <label class="small mb-1 text-left">Empresas:</label>
                <select class="companies" id="newUserCompanies" name="companies[]" multiple="multiple" style="width: 100%">
                  <?php
                  $filterEmpresas = null;
                  $pdo = ConnectionN3();
                  $sql = "SELECT clientes.* FROM clientes WHERE clientes.clt_sts = '1'";
                  if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                    $filterEmpresas .= " AND clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
                  }
                  if ($filterEmpresas) {
                    $sql .= $filterEmpresas;
                  }
                  $show_cargo = $pdo->prepare($sql);
                  $show_cargo->execute();
                  while ($rowc = $show_cargo->fetch(PDO::FETCH_ASSOC)) {
                    $client_id = $rowc["clt_id"];
                    $empresa = $rowc["clt_nomer"];
                  ?>
                    <option value="<?php echo $client_id; ?>"><?php echo $empresa; ?></option>
                  <?php } ?>
                </select>
                <div class="companies-helper" id="companiesHelper">Obrigatório para usuários do tipo Cliente.</div>
              </div>

              <div class="form-group col-md-6">
                <label class="small mb-1 text-right">Link:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-link"></i></div>
                  </div>
                  <input name="link" placeholder="Coloque o link" type="text" class="form-control form-control-sm" maxlength="50">
                </div>
              </div>
            </div>

          </div>

          <div class="modal-footer">
              <input type="hidden" name="action" value="new_user">
              <input type="hidden" name="token" value="<?php echo $token; ?>">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
              <button type="submit" class="btn btn-primary">Salvar novo usuário</button>
            </div>
        </form>
      </div>
    </div>
  </div>

  <!-- MODAL DE EDIÇÃO DE USUÁRIO -->
  <div class="modal fade user-modal" id="modalEdtUser" tabindex="-1" role="dialog" aria-labelledby="edt_user_title" aria-hidden="true">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <form method="POST" action="" name="edit_user">
          <input type="hidden" name="action" value="edt_user">
          <div class="modal-header">
            <div class="user-modal-title">
              <span class="user-modal-icon"><i class="fas fa-user-edit"></i></span>
              <div>
                <h6 class="modal-title" id="edt_user_title">Edição de usuário</h6>
                <p>Atualize dados cadastrais, vínculos e permissões de acesso.</p>
              </div>
            </div>
            <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div id="info_edt_user" class="text-muted">
              Carregando informações do usuário...
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar alterações</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- JS -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>

  <script>
    $(function() {
      const newUserModal = $('#new_user');
      const newUserForm = $('#newUserForm');
      const passwordInput = $('#passwordInput');
      const passwordError = $('#passwordError');
      const companiesSelect = $('#newUserCompanies');
      const companiesHelper = $('#companiesHelper');

      $('.companies').select2({
        dropdownParent: newUserModal,
        placeholder: 'Selecione as empresas',
        width: '100%',
        closeOnSelect: false
      });

      function passwordRules(value) {
        return {
          length: value.length >= 12 && value.length <= 100,
          upper: /[A-Z]/.test(value),
          lower: /[a-z]/.test(value),
          number: /[0-9]/.test(value),
          symbol: /[^a-zA-Z0-9]/.test(value)
        };
      }

      function updatePasswordRules() {
        const rules = passwordRules(passwordInput.val() || '');
        const matchedRules = Object.values(rules).filter(Boolean).length;
        const isComplete = Object.values(rules).every(Boolean);
        $('#passwordMeter')
          .removeClass('strength-0 strength-1 strength-2 strength-3 strength-4 strength-5 is-complete')
          .addClass('strength-' + matchedRules)
          .toggleClass('is-complete', isComplete);
        $('#passwordRules').toggleClass('is-complete', isComplete);
        Object.keys(rules).forEach(function(rule) {
          const item = $('#passwordRules [data-rule="' + rule + '"]');
          item.toggleClass('is-met', rules[rule]);
          item.find('i')
            .toggleClass('fa-circle', !rules[rule])
            .toggleClass('fa-check-circle', rules[rule]);
        });
        return isComplete;
      }

      function updateCompanyRequirement() {
        const isClient = newUserForm.find('input[name="tipo_usuario"]:checked').val() === '2';
        companiesSelect.attr('aria-required', isClient ? 'true' : 'false');
        companiesHelper.text(isClient ? 'Obrigatório para usuários do tipo Cliente.' : 'Opcional para colaboradores.');
      }

      passwordInput.on('input', function() {
        passwordError.hide().text('');
        updatePasswordRules();
      });

      newUserForm.on('change', 'input[name="tipo_usuario"]', updateCompanyRequirement);

      newUserModal.on('shown.bs.modal', function() {
        updatePasswordRules();
        updateCompanyRequirement();
      });

      newUserForm.on('submit', function(event) {
        const hasStrongPassword = updatePasswordRules();
        const isClient = newUserForm.find('input[name="tipo_usuario"]:checked').val() === '2';
        const selectedCompanies = companiesSelect.val() || [];

        if (!hasStrongPassword) {
          event.preventDefault();
          passwordError.text('A senha deve conter 12 ou mais caracteres, com maiúscula, minúscula, número e símbolo.').show();
          passwordInput.trigger('focus');
          return;
        }

        if (isClient && selectedCompanies.length === 0) {
          event.preventDefault();
          companiesSelect.select2('open');
        }
      });

      // ? Abrir modal de edição corretamente (Bootstrap 4)
      $(document).on('click', '.view_data', function() {
        const user_id = $(this).attr("id");
        if (!user_id) return;

        // Mostra modal imediatamente com loading
        $("#info_edt_user").html('<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><div class="mt-3 small text-muted">Carregando informações do usuário...</div></div>');
        $('#modalEdtUser').appendTo('body').modal('show');

        // Carrega conteúdo via AJAX
        $.post('edt_user.php', {
          user_id
        }, function(retorna) {
          $("#info_edt_user").html(retorna);
          $('.companiesEdit').select2({
            dropdownParent: $('#modalEdtUser'),
            placeholder: 'Selecione as empresas',
            width: '100%',
            closeOnSelect: false
          });
        }).fail(function() {
          $("#info_edt_user").html('<div class="alert alert-danger m-3">Erro ao carregar informações do usuário.</div>');
        });
      });

      // Limpa conteúdo ao fechar modal
      $('#modalEdtUser').on('hidden.bs.modal', function() {
        $("#info_edt_user").html('<div class="p-4 text-center text-muted">Carregando informações do usuário...</div>');
      });

      const flashMessage = $('#userFlashMessage');
      if (flashMessage.length) {
        setTimeout(function() {
          flashMessage.addClass('fade-out');
          setTimeout(function() {
            flashMessage.alert('close');
          }, 240);
        }, 4200);
      }
    });
  </script>
</body>


</html>
