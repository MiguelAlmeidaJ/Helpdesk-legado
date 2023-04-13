<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_STRING);
if ($usar_token=="true") {
  if($action){
    if ($action == "new_user") {
      $user_nome = filter_input(INPUT_POST, 'user_nome', FILTER_SANITIZE_STRING);
      $user_mail = filter_input(INPUT_POST, 'user_mail', FILTER_SANITIZE_STRING);
      $user_cel = filter_input(INPUT_POST, 'user_cel', FILTER_SANITIZE_STRING);
      $user_funcao = filter_input(INPUT_POST, 'user_funcao', FILTER_SANITIZE_STRING);
      $user_login = filter_input(INPUT_POST, 'user_login', FILTER_SANITIZE_STRING);
      $user_pass = filter_input(INPUT_POST, 'user_pass', FILTER_SANITIZE_STRING);
      $userType = filter_input(INPUT_POST, 'tipo_usuario', FILTER_SANITIZE_STRING);
      $companies = $_POST['companies'] ?? [];

      $pdo = ConnectionN3();
      $adc_user = $pdo->prepare("INSERT INTO `usuarios` (`user_sts`, `user_nome`, `user_mail`, `user_cel`, `user_funcao`, `user_login`, `user_pass`, `tipo_usuario`) 
      VALUES ('1', :user_nome, :user_mail, :user_cel, :user_funcao, :user_login, :user_pass, :userType);");

      $adc_user->bindParam(':user_nome', $user_nome);
      $adc_user->bindParam(':user_mail', $user_mail);
      $adc_user->bindParam(':user_cel', $user_cel);
      $adc_user->bindParam(':user_funcao', $user_funcao);
      $adc_user->bindParam(':user_login', $user_login);
      $adc_user->bindParam(':userType', $userType);

      $adc_user->bindParam(':user_pass', $user_pass);
      if ($adc_user->execute()) {
        $userId = $pdo->lastInsertId();

        $_SESSION['usuarios'][] = $userId;

        foreach($companies as $companyId){
          $adc_clientes_usuarios = $pdo->prepare("INSERT INTO `clientes_usuarios` (`cliente_id`, `usuario_id`) VALUES (:companyId, :userId);");
          $adc_clientes_usuarios->bindParam(':companyId', $companyId);
          $adc_clientes_usuarios->bindParam(':userId', $userId);

          if(!$adc_clientes_usuarios->execute()){
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar usuário!";
            $mensagem_cor = "alert-danger";
            $log = "false";
          }
        }
        $mensagem = "<i class=\"fas fa-check\"></i> Usuário Cadastrado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar usuário!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }  
    }
    if ($action == "edt_user") {
      $user_id = filter_input(INPUT_POST, 'user_id', FILTER_SANITIZE_NUMBER_INT);
      $user_sts = filter_input(INPUT_POST, 'user_sts', FILTER_SANITIZE_NUMBER_INT);
      $user_nome = filter_input(INPUT_POST, 'user_nome', FILTER_SANITIZE_STRING);
      $user_mail = filter_input(INPUT_POST, 'user_mail', FILTER_SANITIZE_STRING);
      $user_cel = filter_input(INPUT_POST, 'user_cel', FILTER_SANITIZE_STRING);
      $user_funcao = filter_input(INPUT_POST, 'user_funcao', FILTER_SANITIZE_STRING);
      $user_login = filter_input(INPUT_POST, 'user_login', FILTER_SANITIZE_STRING);
      $tipo_usuario = filter_input(INPUT_POST, 'tipo_usuario', FILTER_SANITIZE_STRING);

      $clientesSelecionadosNovos = $_POST['companiesEdit'] ?? [];

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

      //GESTÃO DE USUÁRIO
      $m1_00 = filter_input(INPUT_POST, 'm1_00', FILTER_SANITIZE_STRING);  //ACESSAR MÓDULO USUÁRIOS (0: Desabilitado; 1:Habilitado)
      if($m1_00==1){
        $m1_01 = filter_input(INPUT_POST, 'm1_01', FILTER_SANITIZE_STRING);  //VISUALIZAR USUÁRIOS (0: Desabilitado; 1:Habilitado)
        $m1_02 = filter_input(INPUT_POST, 'm1_02', FILTER_SANITIZE_STRING);  //CADASTRRA NOVO USUÁRIO (0: Desabilitado; 1:Habilitado)
        $m1_03 = filter_input(INPUT_POST, 'm1_03', FILTER_SANITIZE_STRING);  //EDITAR INFORMAÇÕES CADASTRAIS (0: Desabilitado; 1:Habilitado)
        $m1_04 = filter_input(INPUT_POST, 'm1_04', FILTER_SANITIZE_STRING);  //EDITAR NIVEL DE ACESSO (0: Desabilitado; 1:Habilitado)
        $m1_05 = 0; //vazio
        $m1_06 = 0; //vazio
        $m1_07 = 0; //vazio
        $m1_08 = 0; //vazio
        $m1_09 = 0; //vazio
        $m1 = "$m1_00"."$m1_01"."$m1_02"."$m1_03"."$m1_04"."$m1_05"."$m1_06"."$m1_07"."$m1_08"."$m1_09";
      }else{ $m1 = "0000000000"; }

      //CADASTROS
      $m2_00 = filter_input(INPUT_POST, 'm2_00', FILTER_SANITIZE_STRING);  //ACESSAR MÓDULO CADASTROS (0: Desabilitado; 1:Habilitado)
      if ($m2_00 == 1) {
        $m2_01 = filter_input(INPUT_POST, 'm2_01', FILTER_SANITIZE_STRING);  //CADASTRO DE CLIENTES (0: Desabilitado; 1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
        $m2_02 = filter_input(INPUT_POST, 'm2_02', FILTER_SANITIZE_STRING);  //CADASTRO DE PESSOAS DE CONTATOS DO CLIENTE  (1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
        $m2_03 = filter_input(INPUT_POST, 'm2_03', FILTER_SANITIZE_STRING);  //CADASTRO DE LOCAIS DE ATENDIMENTO AO CLIENTE  (1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
        $m2_04 = filter_input(INPUT_POST, 'm2_04', FILTER_SANITIZE_STRING);  //CADASTRO CATEGORIA (1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
        $m2_05 = filter_input(INPUT_POST, 'm2_05', FILTER_SANITIZE_STRING);  //CADASTRO SUBCATEGORIA (1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
        $m2_06 = filter_input(INPUT_POST, 'm2_06', FILTER_SANITIZE_STRING);  //CADASTRO ITEM (1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
        $m2_07 = 0; //vazio
        $m2_08 = 0; //vazio
        $m2_09 = 0; //vazio
        $m2 = "$m2_00"."$m2_01"."$m2_02"."$m2_03"."$m2_04"."$m2_05"."$m2_06"."$m2_07"."$m2_08"."$m2_09";
      }else{ $m2 = "0000000000"; }

      //ATENDIMENTOS
      $m3_00 = filter_input(INPUT_POST, 'm3_00', FILTER_SANITIZE_STRING);  //ACESSAR MÓDULO ATENDIMENTOS (0: Desabilitado; 1:Habilitado)
      if($m3_00==1){  
        $m3_01 = filter_input(INPUT_POST, 'm3_01', FILTER_SANITIZE_STRING);  //CADASTRO DE ATENDIMENTOS (0: Desabilitado; 2:Cadastro; 3:cadastro e edição)
        $m3_02 = filter_input(INPUT_POST, 'm3_02', FILTER_SANITIZE_STRING);  //EXECUTAR ATENDIMENTOS (0:Sem acesso; 2:Aceitar + Finalizar)
        $m3_03 = filter_input(INPUT_POST, 'm3_03', FILTER_SANITIZE_STRING);  //COLOCAR ATENDIMENTO EM ESPERA (0:Sem acesso; 2:Permitido)
        $m3_04 = filter_input(INPUT_POST, 'm3_04', FILTER_SANITIZE_STRING);  //RECUSRAR ATENDIMENTO (0:Sem acesso; 2:Permitido)
        $m3_05 = filter_input(INPUT_POST, 'm3_05', FILTER_SANITIZE_STRING);  //GERIR ATENDIMENTO DE TERCEIROS (0:Sem acesso; 2:Permitido)
        $m3_06 = 0; //vazio
        $m3_07 = 0; //vazio
        $m3_08 = 0; //vazio
        $m3_09 = 0; //vazio
        $m3 = "$m3_00"."$m3_01"."$m3_02"."$m3_03"."$m3_04"."$m3_05"."$m3_06"."$m3_07"."$m3_08"."$m3_09";
      }else{ $m3 = "0000000000"; }
      
      //CONFIGURAÇÕES
      $m4_00 = filter_input(INPUT_POST, 'm4_00', FILTER_SANITIZE_STRING);  //ACESSAR MÓDULO CONFIGURAÇÕES (0: Desabilitado; 1:Habilitado)
      if($m4_00==1){  
        $m4_01 = filter_input(INPUT_POST, 'm4_01', FILTER_SANITIZE_STRING);  //TEMPO DE ALERTA PARA OS ATENDIMENTOS (0: Desabilitado; 3:Edição)
        $m4_02 = filter_input(INPUT_POST, 'm4_02', FILTER_SANITIZE_STRING);  //SLA de ATENDIMENTO (0: Desabilitado; 3:Edição)
        $m4_03 = 0; //vazio
        $m4_04 = 0; //vazio
        $m4_05 = 0; //vazio
        $m4_06 = 0; //vazio
        $m4_07 = 0; //vazio
        $m4_08 = 0; //vazio
        $m4_09 = 0; //vazio
        $m4 = "$m4_00"."$m4_01"."$m4_02"."$m4_03"."$m4_04"."$m4_05"."$m4_06"."$m4_07"."$m4_08"."$m4_09";
      }else{ $m4 = "0000000000"; }

      $pdo = ConnectionN3();
      $edt_user = $pdo->prepare("UPDATE `usuarios` SET `user_sts`=:user_sts, `user_nome`=:user_nome, `user_mail`=:user_mail, `user_cel`=:user_cel, `user_funcao`=:user_funcao, `user_login`=:user_login, `user_modulo_01`=:m1, `user_modulo_02`=:m2, `user_modulo_03`=:m3, `user_modulo_04`=:m4, `tipo_usuario`=:tipo_usuario  WHERE `user_id`=:user_id;");
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
      $edt_user->bindParam(':tipo_usuario', $tipo_usuario);
      $edt_user->bindParam(':user_id', $user_id);
      if($edt_user->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Usuário editado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
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
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico"> 
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="../css/help.css">
    <title>Allterus</title>
  </head>
  <body>
<?php include_once("../all/loading.php"); ?>
<?php include("../all/header.php"); ?>
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
                <table class="table table-hover table-striped table-sm">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Nome</th>
                      <th>Função</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
<?php
// só usuários relacionados aos clientes
$filterUsuariosEmpresas = "";

//get usuarios relacionados as empresas que esse cliente está conectado

if(isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['usuarios']) && count($_SESSION['usuarios']) > 0) {
  $filterUsuariosEmpresas.= " AND usuarios.user_id IN (" . implode(',', $_SESSION['usuarios']) . ") ";
}

$pdo = ConnectionN3();
$show_eqp = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome, usuarios.user_sts, usuarios.user_funcao, cargos_n3.cargo_nome
FROM usuarios 
LEFT JOIN cargos_n3 ON cargos_n3.cargo_id = usuarios.user_funcao
WHERE usuarios.user_id > '1' " . $filterUsuariosEmpresas . "
ORDER BY usuarios.user_sts ASC, usuarios.user_nome ASC");
$show_eqp->execute();
while($row=$show_eqp->fetch(PDO::FETCH_ASSOC)){
  $user_id=$row["user_id"];
  $user_nom=$row["user_nome"];
  $user_sts=$row["user_sts"];
  $user_funcao=$row["cargo_nome"];
?>
                    <tr>
                      <td>
                        <?php if($user_sts==1){ ?><i class="fas fa-toggle-on text-primary" title="Ativo"></i><?php } ?> 
                        <?php if($user_sts==2){ ?><i class="fas fa-toggle-off text-muted" title="Inativo"></i><?php } ?>
                      </td>
                      <td>
                        <?php echo $user_nom; ?>
                      </td>
                      <td>
                        <?php echo $user_funcao; ?>
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
<!-- -->
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

                <div class="form-group row">
                  <label class="col-3 col-form-label text-right">Tipo:</label>
                  <div class="col-9 col-sm-8">
                    <div class="input-group">
                      <div style="padding-top: 10px">
                      <?php if(isset($_SESSION['tipo']) && $_SESSION['tipo'] == 1) {
                        echo '<input type="radio" id="nivel3" name="tipo_usuario" value="1" checked="checked">';
                        echo '<label for="nivel3">Admin</label>';
                      } ?>

                        <?php if(isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 || $_SESSION['tipo'] == 1) {
                          echo '<input type="radio" id="cliente" name="tipo_usuario" value="2">';
                          echo '<label for="cliente">Cliente</label>';
                        } ?>
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

                        if(isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                          $filterEmpresas.= " AND clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
                        }

                        if($filterEmpresas) {
                          $sql.= $filterEmpresas;
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

              <div class="form-group row">
                <label class="col-3 col-form-label text-right">Senha:</label> 
                <div class="col-9 col-sm-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-key"></i></div>
                    </div> 
                    <input name="user_pass" type="password" required="required" class="form-control">
                  </div>
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
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <button type="submit" class="btn btn-outline-danger">Editar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<!-- MODAL DE AJUDA PARA CADASTRO DE NOVO ATENDIMENTO -->    
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
</div>    
    
<script>
  $(document).ready(function(){
    $(document).on('click','.view_data', function(){
      var user_id = $(this).attr("id");
     //alert(user_id);
      //Verificar se há valor na variável "user_id".
      if(user_id !== ''){
        var dados = {
          user_id: user_id
        };
        $.post('edt_user.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#info_edt_user").html(retorna);
          $('#modalEdtUser').modal('show'); 
        });
      }
    });
  });
</script>    
<!-- -->    
  </body>
</html>