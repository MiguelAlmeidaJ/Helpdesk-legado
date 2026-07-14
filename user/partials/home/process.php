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

if (!function_exists('e')) {
  function e($value)
  {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
  }
}

if (!function_exists('renderFlashMessage')) {
  function renderFlashMessage($message)
  {
    return strip_tags((string)$message, '<i><br>');
  }
}

if (!function_exists('n3PostDigit')) {
  function n3PostDigit($field, $default = '0')
  {
    $value = $_POST[$field] ?? $default;
    return preg_match('/^[0-9]$/', (string)$value) ? (string)$value : (string)$default;
  }
}

if (!function_exists('buildUserModulesFromPost')) {
  function buildUserModulesFromPost()
  {
    $modules = [
      1 => [1, 2, 3, 4],
      2 => [1, 2, 3, 4, 5, 6],
      3 => [1, 2, 3, 4, 5, 6],
      4 => [1, 2, 3, 4],
      5 => [1, 2],
      6 => [1, 2],
      7 => [1, 2, 3],
      8 => [1, 2, 3, 4],
      9 => [1, 2, 3],
    ];

    $built = [];
    foreach ($modules as $module => $fields) {
      $prefix = 'm' . $module . '_';
      $fallback = $_POST['user_mod_' . str_pad((string)$module, 2, '0', STR_PAD_LEFT)] ?? '0000000000';
      $enabled = n3PostDigit($prefix . '00');

      if ((int)$enabled > 0) {
        $digits = [$enabled];
        for ($index = 1; $index <= 9; $index++) {
          $digits[] = in_array($index, $fields, true) ? n3PostDigit($prefix . str_pad((string)$index, 2, '0', STR_PAD_LEFT)) : '0';
        }
        $built[$module] = implode('', $digits);
      } else {
        $built[$module] = preg_match('/^[0-9]{10}$/', (string)$fallback) ? (string)$fallback : '0000000000';
      }
    }

    return $built;
  }
}

if (!function_exists('renderModulePermissions')) {
  function renderModulePermissions()
  {
    $modules = [
      1 => ['Usuarios', ['Visualizar usuarios', 'Cadastrar usuario', 'Editar cadastro', 'Editar acesso']],
      2 => ['Cadastros', ['Clientes', 'Pessoas de contato', 'Locais de atendimento', 'Categoria', 'Subcategoria', 'Item']],
      3 => ['Atendimentos', ['Cadastrar atendimentos', 'Executar atendimentos', 'Colocar em espera', 'Recusar atendimento', 'Gerir terceiros', 'Acesso a radio']],
      4 => ['Configuracoes', ['Tempo de alerta', 'SLA de atendimento', 'Perfil de atendimento', 'Parametros de atendimento']],
      5 => ['Relatorios', ['Relatorio de atendimentos', 'Relatorio de disponibilidade']],
      6 => ['Inventario', ['Gerenciar patrimonio', 'Consultar estoque']],
      7 => ['Financeiro', ['Contas a pagar', 'Contas a receber', 'Relatorios financeiros']],
      8 => ['Disponibilidade tecnica', ['Relatorio de disponibilidade', 'Relatorio de indisponibilidade', 'Gerenciar relatorios', 'Gerenciar catalogos']],
      9 => ['Veiculos', ['Agenda', 'Manutencao', 'Abastecimento']],
    ];

    foreach ($modules as $module => $config) {
      $modulePadded = str_pad((string)$module, 2, '0', STR_PAD_LEFT);
      echo '<div class="permission-card">';
      echo '<label class="permission-card-header">';
      echo '<input type="checkbox" name="m' . $module . '_00" value="1">';
      echo '<span><strong>' . e($config[0]) . '</strong><small>Acessar modulo</small></span>';
      echo '</label>';
      echo '<div class="permission-options">';
      foreach ($config[1] as $index => $label) {
        $field = 'm' . $module . '_' . str_pad((string)($index + 1), 2, '0', STR_PAD_LEFT);
        echo '<label><input type="checkbox" name="' . e($field) . '" value="1"> <span>' . e($label) . '</span></label>';
      }
      echo '</div>';
      echo '<input type="hidden" name="user_mod_' . $modulePadded . '" value="0000000000">';
      echo '</div>';
    }
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
        $newUserModules = buildUserModulesFromPost();

        $adc_user = $pdo->prepare("INSERT INTO `usuarios` (`user_sts`, `user_nome`, `user_mail`, `user_cel`, `user_funcao`, `user_login`, `user_pass`, `tipo_usuario` , `link`, `pix_type`, `chavepix`, `user_modulo_01`, `user_modulo_02`, `user_modulo_03`, `user_modulo_04`, `user_modulo_05`, `user_modulo_06`, `user_modulo_07`, `user_modulo_08`, `user_modulo_09`)
          VALUES ('1', :user_nome, :user_mail, :user_cel, :user_funcao, :user_login, :user_pass, :userType, :link, :pix_type, :chavepix, :m1, :m2, :m3, :m4, :m5, :m6, :m7, :m8, :m9);");

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
        $adc_user->bindValue(':m1', $newUserModules[1], PDO::PARAM_STR);
        $adc_user->bindValue(':m2', $newUserModules[2], PDO::PARAM_STR);
        $adc_user->bindValue(':m3', $newUserModules[3], PDO::PARAM_STR);
        $adc_user->bindValue(':m4', $newUserModules[4], PDO::PARAM_STR);
        $adc_user->bindValue(':m5', $newUserModules[5], PDO::PARAM_STR);
        $adc_user->bindValue(':m6', $newUserModules[6], PDO::PARAM_STR);
        $adc_user->bindValue(':m7', $newUserModules[7], PDO::PARAM_STR);
        $adc_user->bindValue(':m8', $newUserModules[8], PDO::PARAM_STR);
        $adc_user->bindValue(':m9', $newUserModules[9], PDO::PARAM_STR);
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

