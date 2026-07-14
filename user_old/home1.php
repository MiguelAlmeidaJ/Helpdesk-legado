<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

if (!isset($_SESSION['tipo']) || $_SESSION['tipo'] == 2) {
  header("Location: ../index.php"); // Redireciona para a página inicial ou outra página de acesso negado
  exit;
}


$userType = null; // Evita erro de variável indefinida



if ($usar_token == "true") {
  if ($action) {
    if ($action == "new_user") {
      $user_nome = trim($_POST['user_nome']);
      $user_mail = trim($_POST['user_mail']);
      $user_cel = trim($_POST['user_cel']);
      $user_funcao = trim($_POST['user_funcao']);
      $user_login = trim($_POST['user_login']);
      $user_pass = password_hash(trim($_POST['user_pass']), PASSWORD_DEFAULT); // Criptografar senha
      $userType = trim($_POST['tipo_usuario']);
      $link = trim($_POST['link']);
      $companies = $_POST['companies'] ?? [];

      $pdo = ConnectionN3();
      $adc_user = $pdo->prepare("INSERT INTO `usuarios` (`user_sts`, `user_nome`, `user_mail`, `user_cel`, `user_funcao`, `user_login`, `user_pass`, `tipo_usuario` , `link`) 
      VALUES ('1', :user_nome, :user_mail, :user_cel, :user_funcao, :user_login, :user_pass, :userType, :link);");

      $adc_user->bindParam(':user_nome', $user_nome, PDO::PARAM_STR);
      $adc_user->bindParam(':user_mail', $user_mail, PDO::PARAM_STR);
      $adc_user->bindParam(':user_cel', $user_cel, PDO::PARAM_STR);
      $adc_user->bindParam(':user_funcao', $user_funcao, PDO::PARAM_STR);
      $adc_user->bindParam(':user_login', $user_login, PDO::PARAM_STR);
      // $adc_user->bindParam(':userType', $userType, PDO::PARAM_STR);
      $adc_user->bindParam(':userType', $userType, PDO::PARAM_INT);
      $adc_user->bindParam(':user_pass', $user_pass, PDO::PARAM_STR); // Senha criptografada
      $adc_user->bindParam(':link', $link, PDO::PARAM_STR);

      if ($adc_user->execute()) {
        $userId = $pdo->lastInsertId();

        $_SESSION['usuarios'][] = $userId;

        foreach ($companies as $companyId) {
          $adc_clientes_usuarios = $pdo->prepare("INSERT INTO `clientes_usuarios` (`cliente_id`, `usuario_id`) VALUES (:companyId, :userId);");
          $adc_clientes_usuarios->bindParam(':companyId', $companyId);
          $adc_clientes_usuarios->bindParam(':userId', $userId);

          if (!$adc_clientes_usuarios->execute()) {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar usuário!";
            $mensagem_cor = "alert-danger";
            $log = "false";
          }
        }
        $mensagem = "<i class=\"fas fa-check\"></i> Usuário Cadastrado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      } else {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar usuário!";
        $mensagem_cor = "alert-danger";
        $log = "false";
      }
    }
    // if ($action == "edt_user") {
    //   $user_id =trim($_POST['user_id']);
    //   $user_sts = trim($_POST['user_sts']);
    //   $user_nome = trim($_POST['user_nome']);
    //   $user_mail = trim($_POST['user_mail']);
    //   $user_cel = trim($_POST['user_cel']);
    //   $user_funcao = trim($_POST['user_funcao']);
    //   $user_login = trim($_POST['user_login']);
    //   $userType = trim($_POST['tipo_usuario']);
    //   $link = trim($_POST['link']);
    //   $clientesSelecionadosNovos = $_POST['companiesEdit'] ?? [];

    if ($action == "edt_user") {
      $user_id = trim($_POST['user_id']);
      $user_sts = trim($_POST['user_sts']);
      $user_nome = trim($_POST['user_nome']);
      $user_mail = trim($_POST['user_mail']);
      $user_cel = trim($_POST['user_cel']);
      $user_funcao = trim($_POST['user_funcao']);
      $user_login = trim($_POST['user_login']);
      $userType = trim($_POST['tipo_usuario']);
      $link = trim($_POST['link']);
      $clientesSelecionadosNovos = isset($_POST['companiesEdit']) ? (array)$_POST['companiesEdit'] : [];

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
      AND cu.usuario_id = " . $user_id);

      $clientesSelecionados->execute();
      $rowClientesSelecionados = $clientesSelecionados->fetchAll(PDO::FETCH_ASSOC);
      $idsClientesSelecionados = array_column($rowClientesSelecionados, 'id');

      $removesClientesSelecionados = array_diff($idsClientesSelecionados, $clientesSelecionadosNovos);
      $addsClientesSelecionados = array_diff($clientesSelecionadosNovos, $idsClientesSelecionados);

      if (count($removesClientesSelecionados) > 0) {
        $deleteRemovedClientesSelecionados = $pdo->prepare("DELETE FROM clientes_usuarios WHERE id IN 
        (" . implode(',', $removesClientesSelecionados) . ")
        AND usuario_id = " . $user_id . "");

        $deleteRemovedClientesSelecionados->execute();
      }

      if (count($addsClientesSelecionados) > 0) {
        foreach ($addsClientesSelecionados as $clienteId) {
          $addInsertedClientes = $pdo->prepare("INSERT INTO clientes_usuarios(cliente_id, usuario_id)
          VALUES (" . $clienteId . ", " . $user_id . ")");
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
      $edt_user = $pdo->prepare("UPDATE `usuarios` SET `user_sts`=:user_sts, `user_nome`=:user_nome, `user_mail`=:user_mail, `user_cel`=:user_cel, `user_funcao`=:user_funcao, `user_login`=:user_login, `user_modulo_01`=:m1, `user_modulo_02`=:m2, `user_modulo_03`=:m3, `user_modulo_04`=:m4, `user_modulo_05`=:m5, `user_modulo_06`=:m6, `user_modulo_07`=:m7, `user_modulo_08`=:m8, `user_modulo_09`=:m9, `tipo_usuario`=:tipo_usuario,`link`=:link  WHERE `user_id`=:user_id;");
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
  }
}
?>
<!doctype html>
<html lang="pt-BR">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=0.9, shrink-to-fit=no">
  <link rel="icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../css/bootstrap.min.css">
  <link rel="stylesheet" href="../fontawesome/css/all.css">
  <link rel="stylesheet" href="../css/help.css">
  <title>Allterus</title>
</head>
<style>
  body {
    zoom: 0.9;
    /* Escala o conteúdo sem alterar o contexto de layout */
    width: 100%;
    /* Mantém o layout responsivo */
    overflow-x: hidden;
    /* Garante que não haja rolagem horizontal */
  }

  .table-container {
    max-height: 85vh;
    /* Define um limite de altura para a tabela */
    overflow-y: auto;
    /* Habilita o scroll vertical */
    display: block;
    border: 1px solid #dee2e6;
  }

  table {
    display: auto;
    width: 100%;
    border-collapse: collapse;
  }
</style>

<body>
  <?php include_once("../all/loading.php"); ?>
  <?php include("../all/sidebar.php"); ?>
  <div class="container-fluid">
    <div class="row">
      <div class="col-md-12 mt-2">
        <div class="card">
          <div class="card-header py-2">
            <div class="row">
              <div class="col-6 h6 pt-1"><i class="fas fa-users"></i> Usuários cadastrados</div>
              <div class="col-6 text-right">
                <button type="button" class="btn btn-outline-primary btn-sm text-center text-dark" data-toggle="modal" data-target="#new_user"> <i class="fas fa-user-plus text-dark"></i> Adicionar Usuário </button>
              </div>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="table-container">
              <table class="table table-hover table-striped table-sm">
                <thead>
                  <tr>
                    <th></th>
                    <th>Nome</th>
                    <th>Função</th>
                    <th>Tipo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <?php
                  // só usuários relacionados aos clientes
                  $filterUsuariosEmpresas = "";

                  //get usuarios relacionados as empresas que esse cliente está conectado

                  if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['usuarios']) && count($_SESSION['usuarios']) > 0) {
                    $filterUsuariosEmpresas .= " AND usuarios.user_id IN (" . implode(',', $_SESSION['usuarios']) . ") ";
                  }

                  $pdo = ConnectionN3();
                  $show_eqp = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome, usuarios.user_sts, usuarios.user_funcao, usuarios.tipo_usuario, cargos_n3.cargo_nome
                FROM usuarios 
                LEFT JOIN cargos_n3 ON cargos_n3.cargo_id = usuarios.user_funcao
                WHERE usuarios.user_id > '1' " . $filterUsuariosEmpresas . "
                ORDER BY usuarios.user_sts ASC, usuarios.user_nome ASC");
                  $show_eqp->execute();
                  while ($row = $show_eqp->fetch(PDO::FETCH_ASSOC)) {
                    $user_id = $row["user_id"];
                    $user_nom = $row["user_nome"];
                    $user_sts = $row["user_sts"];
                    $user_funcao = $row["cargo_nome"];
                    $user_tipo = $row["tipo_usuario"];
                  ?>
                    <tr>
                      <td>
                        <?php if ($user_sts == 1) { ?><i class="fas fa-toggle-on text-primary" title="Ativo"></i><?php } ?>
                        <?php if ($user_sts == 2) { ?><i class="fas fa-toggle-off text-muted" title="Inativo"></i><?php } ?>
                      </td>
                      <td>
                        <?php echo $user_nom; ?>
                      </td>
                      <td>
                        <?php echo $user_funcao; ?>
                      </td>

                      <td>
                        <?php if ($user_tipo == 1) { ?>Colaborador<?php } ?>
                        <?php if ($user_tipo == 2) { ?><i title="Usuário"> Cliente</i><?php } ?>
                      </td>

                      <td>
                        <button type="button" class="btn btn-outline-secondary btn-sm view_data" id="<?php echo $row['user_id']; ?>"><i class="fas fa-user-edit"></i> Editar </button>

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
  <div class="modal fade" id="new_user" tabindex="-1" role="dialog" aria-labelledby="new_user" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <form action="#" method="POST">
          <div class="modal-header">
            <h6 class="modal-title"><i class="fas fa-user-plus text-dark"></i> Cadastro de usuários</h6>
            <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-12">

                <div class="form-group row">
                  <label class="col-3 col-form-label text-right">Nome:</label>
                  <div class="col-9 col-sm-8">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="far fa-user"></i></div>
                      </div>
                      <input name="user_nome" placeholder="Nome Completo" type="text" class="form-control" required="required">
                    </div>
                  </div>
                </div>

                <div class="form-group row">
                  <label class="col-3 col-form-label text-right">E-mail:</label>
                  <div class="col-9 col-sm-8">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-at"></i></div>
                      </div>
                      <input name="user_mail" type="email" class="form-control" required="required">
                    </div>
                  </div>
                </div>


                <div class="form-group row">
                  <label class="col-3 col-form-label text-right">Função:</label>
                  <div class="col-9 col-sm-8">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-sitemap"></i></div>
                      </div>
                      <select name="user_funcao" required="required" class="custom-select">
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
                </div>

                <!-- <div class="form-group row">
                  <label class="col-3 col-form-label text-right">Tipo:</label>
                  <div class="col-9 col-sm-8">
                    <div class="input-group">
                      <div style="padding-top: 10px">
                      <?php if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 1) {
                        echo '<input type="radio" id="nivel3" name="tipo_usuario" value="1" checked="checked">';
                        echo '<label for="nivel3">Admin</label>';
                      } ?>

                        <?php if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 || $_SESSION['tipo'] == 1) {
                          echo '<input type="radio" id="cliente" name="tipo_usuario" value="2">';
                          echo '<label for="cliente">Cliente</label>';
                        } ?>
                      </div>
                    </div>
                  </div>
                </div> -->

                <div class="form-group row">
                  <label class="col-3 col-form-label text-right">Tipo:</label>
                  <div class="col-9 col-sm-8">
                    <div class="input-group">
                      <div style="padding-top: 10px">
                        <?php
                        // Garante que o valor de tipo_usuario está carregado do banco de dados
                        $tipoUsuarioSelecionado = isset($userType) ? $userType : 2; // Padrão: Cliente (2)
                        ?>

                        <input type="radio" id="admin" name="tipo_usuario" value="1" <?php echo ($userType == 1) ? 'checked' : ''; ?>>
                        <label for="admin">Admin</label>

                        <input type="radio" id="cliente" name="tipo_usuario" value="2" <?php echo ($userType == 2) ? 'checked' : ''; ?>>
                        <label for="cliente">Cliente</label>



                      </div>
                    </div>
                  </div>
                </div>


                <!-- filtrar empresas tipo de usuario -->
                <div class="form-group row">
                  <label class="col-3 col-form-label text-right">Empresas:</label>
                  <div class="col-9 col-sm-8">
                    <div class="input-group">
                      <select class="companies" name="companies[]" multiple="multiple" style="width: 100%">
                        <option></option>
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
                    </div>
                  </div>
                </div>

                <div class="form-group row">
                  <label class="col-3 col-form-label text-right">Celular:</label>
                  <div class="col-9 col-sm-8">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-mobile-alt"></i></div>
                      </div>
                      <input name="user_cel" placeholder="(00)00000-0000" type="text" required="required" class="form-control">
                    </div>
                  </div>
                </div>

                <div class="form-group row">
                  <label class="col-3 col-form-label text-right">Link:</label>
                  <div class="col-9 col-sm-8">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-mobile-alt"></i></div>
                      </div>
                      <input name="link" placeholder="Coloque o link" type="text" class="form-control">
                    </div>
                  </div>
                </div>

                <div class="form-group row">
                  <label class="col-3 col-form-label text-right">Login:</label>
                  <div class="col-9 col-sm-8">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-sign-in-alt"></i></div>
                      </div>
                      <input name="user_login" type="text" required="required" class="form-control">
                    </div>
                  </div>
                </div>

                <!-- <div class="form-group row">
                <label class="col-3 col-form-label text-right">Senha:</label> 
                <div class="col-9 col-sm-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-key"></i></div>
                    </div> 
                    <input name="user_pass" type="password" required="required" class="form-control">
                  </div>
                </div>
              </div> -->
                <div class="form-group row">
                  <label class="col-3 col-form-label text-right">Senha:</label>
                  <div class="col-9 col-sm-8">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-key"></i></div>
                      </div>
                      <input name="user_pass" type="password" required="required" class="form-control" id="passwordInput">
                    </div>
                    <div id="passwordError" class="text-danger mt-2" style="display: none;"></div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          
          <div class="modal-footer">
            <input type="hidden" name="action" value="new_user">
            <input type="hidden" name="token" value="<?php echo $token; ?>">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
            <button type="input" class="btn btn-primary">Salvar novo usuário</button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <!-- -->


  <?php if (isset($mensagem)) { ?>
    <div class="row pull-right" style="position:absolute; top: 65px; right:25px;">
      <div class="alert <?php echo $mensagem_cor; ?> alert-dismissible fade show" role="alert">
        <?php echo $mensagem; ?>
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>
  <?php } ?>
  <?php include_once("../all/update_pass.php"); ?>
  <script src="../js/jquery-3.6.0.min.js"></script>
  <script src="../js/bootstrap.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>

  <script>
    $(document).ready(function() {
      $('.companies').select2();
    });
  </script>

  <!--    <script src="../js/bootstrap.bundle.min.js"></script>    -->
  <?php if (isset($mensagem)) { ?>
    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 4000);
    </script>
  <?php } ?>
  <!-- -->
  <div class="modal fade" id="modalEdtUser" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <form method="POST" action="#">
          <div class="modal-header">
            <h6 class="modal-title" id="modalEdtUserLabel"><i class="fas fa-user-edit"></i> Edição de Usuário</h6>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body p-0">
            <div class="row">
              <div class="col-md-12">
                <span id="info_edt_user"></span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-info btn-sm" data-dismiss="modal">Fechar</button>
            <input type="hidden" name="action" value="edt_user">
            <input type="hidden" name="token" value="<?php echo $token; ?>">
            <button type="submit" class="btn btn-outline-danger">Editar</button>
          </div>
        </form>
      </div>
    </div>
  </div>


  <!-- MODAL DE AJUDA PARA CADASTRO DE NOVO ATENDIMENTO
  <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
      <div class="modal-content">

        <div class="modal-header">
          <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Usuários</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        </div>

        <div class="modal-body">
          <p>Em construção...
          </p>
        </div>

      </div>
    </div>
  </div> -->

  <script>
    $(document).ready(function() {
      $(document).on('click', '.view_data', function() {
        var user_id = $(this).attr("id");
        //alert(user_id);
        //Verificar se há valor na variável "user_id".
        if (user_id !== '') {
          var dados = {
            user_id: user_id
          };
          $.post('edt_usercopy.php', dados, function(retorna) {
            //Carregar o conteúdo para o usuário
            $("#info_edt_user").html(retorna);
            $('#modalEdtUser').modal('show');
          });
        }
      });
    });
  </script>
  <!-- -->
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const form = document.querySelector('form');
      const passwordInput = document.querySelector('#passwordInput');
      const passwordError = document.querySelector('#passwordError');

      function validatePassword(password) {
        const minLength = 12;
        const maxLength = 20;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const lengthValid = password.length >= minLength && password.length <= maxLength;

        return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && lengthValid;
      }

      form.addEventListener('submit', function(event) {
        passwordError.style.display = 'none';
        if (!validatePassword(passwordInput.value)) {
          event.preventDefault();
          passwordError.innerHTML = `
          <p>A senha deve atender aos seguintes critérios:</p>
          <ul>
            <li>Entre 12 e 20 caracteres</li>
            <li>Pelo menos uma letra maiúscula</li>
            <li>Pelo menos uma letra minúscula</li>
            <li>Pelo menos um número</li>
            <li>Pelo menos um caractere especial (!@#$%^&*)</li>
          </ul>`;
          passwordError.style.display = 'block';
        }
      });
    });
  </script>
  <!-- script para parar a edição do usuário -->
  <script>
    $(document).ready(function() {
      $('.companies').select2();
    });
  </script>

  <script>
    document.addEventListener("DOMContentLoaded", function() {
      const dadosEditados = localStorage.getItem('dadosEditados');

      if (dadosEditados) {
        const usuario = JSON.parse(dadosEditados);

        // Exibe no console
        // console.log("?? Dados Recebidos do UPDATE:", JSON.stringify(usuario, null, 2));

        // Exemplo de exibição com alert (pode ser removido)
        alert(`? Usuário Atualizado: ${usuario.user_nome}\nFunção: ${usuario.user_funcao}\nStatus: ${usuario.user_sts}`);

        // Remove os dados para não repetir
        localStorage.removeItem('dadosEditados');
      }
    });
  </script>


</body>

</html>