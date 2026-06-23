<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");


$funcoes_permitidas = [1, 2, 3, 7, 9, 10];
$funcao_do_usuario  = $_SESSION["allterusN3func"];

if (!isset($_SESSION['allterusN3func']) || !in_array($funcao_do_usuario, $funcoes_permitidas)) {
  header("Location: ../home.php");
  exit;
}

$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
if ($action == "alterar_senha") {include_once("../all/update_senha.php");}

if ($usar_token=="true") {
  if($action){
    $configActionPermissions = [
      'edt_tempo_alerta' => (int)$m4_01,
      'edt_sla' => (int)$m4_02,
    ];

    if (isset($configActionPermissions[$action]) && $configActionPermissions[$action] !== 3) {
      $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Você não tem permissão para executar esta ação.";
      $mensagem_cor = "alert-danger";
      $log = "false";
      $action = '';
    }

    if ($action == "alterar_senha") {include_once("../all/update_senha.php");}
    
    if ($action == "edt_tempo_alerta") {
      $tempo_alerta = filter_input(INPUT_POST, 'tempo_alerta', FILTER_SANITIZE_NUMBER_INT);
      $pdo = ConnectionN3();
      $edt_user= $pdo->prepare("UPDATE configuracao SET `tempo_alerta`=:tempo_alerta WHERE `id`=1;");
      $edt_user->bindParam(':tempo_alerta', $tempo_alerta);
      if($edt_user->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Tempo de alerta editado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar Tempo de alerta!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }
    }
    
    if ($action == "edt_sla") {
      $sla_n1 = filter_input(INPUT_POST, 'sla_n1', FILTER_SANITIZE_NUMBER_INT);
      $sla_n2 = filter_input(INPUT_POST, 'sla_n2', FILTER_SANITIZE_NUMBER_INT);
      $sla_n3 = filter_input(INPUT_POST, 'sla_n3', FILTER_SANITIZE_NUMBER_INT);
      $sla_n4 = filter_input(INPUT_POST, 'sla_n4', FILTER_SANITIZE_NUMBER_INT);
      $pdo = ConnectionN3();
      $edt_user= $pdo->prepare("UPDATE configuracao SET `sla_n1`=:sla_n1,`sla_n2`=:sla_n2,`sla_n3`=:sla_n3,`sla_n4`=:sla_n4 WHERE `id`=1;");
      $edt_user->bindParam(':sla_n1', $sla_n1);
      $edt_user->bindParam(':sla_n2', $sla_n2);
      $edt_user->bindParam(':sla_n3', $sla_n3);
      $edt_user->bindParam(':sla_n4', $sla_n4);
      if($edt_user->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Tempo atendimento editado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar Tempo de atendimento!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }
    }
  }
}

$pdo = ConnectionN3();
$show_cargo = $pdo->prepare("SELECT configuracao.* FROM configuracao");
$show_cargo->execute();
$rowc=$show_cargo->fetch(PDO::FETCH_ASSOC);
$tempo_alerta=$rowc["tempo_alerta"];
$sla_n1=$rowc["sla_n1"];
$sla_n2=$rowc["sla_n2"];
$sla_n3=$rowc["sla_n3"];
$sla_n4=$rowc["sla_n4"];



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
    <link rel="stylesheet" href="../css/blink.css">

    <title>Allterus</title>
  </head>
  <style>   
body {
  zoom: 0.9; /* Escala o conteúdo sem alterar o contexto de layout */
  width: 100%; /* Mantém o layout responsivo */
  overflow-x: hidden; /* Garante que não haja rolagem horizontal */
}



  </style>
  <body>
<?php include_once("../all/loading.php"); ?>
<?php include("../all/sidebar.php"); ?>
    <div class="container-fluid">
      <div class="row">
        
        <div class="col-md-3 mt-2">
          <div class="card">
            <div class="card-header py-2">
              <i class="fas fa-stopwatch"></i> Tempo para exibição de alerta
            </div>
            <div class="card-body">
<?php if($m4_01==3){ ?> 
              <form action="#" method="POST">
<?php } ?>
                <div class="form-group row">
                  <label class="col-sm-5 col-form-label">Tempo:</label>
                  <div class="col-sm-7">
                    <div class="input-group">
                      <input type="number" name="tempo_alerta" class="form-control" value="<?php echo $tempo_alerta; ?>">
                      <div class="input-group-append">
                        <div class="input-group-text">Min</div>
                      </div>                    
                    </div>
                  </div>
                </div>
                <div class="form-group row">
                  <small class="text-muted">
                    <i class="fas fa-info-circle"></i> O Allterus exibirá um alerta para o atendimento ficar sem interação pelo tempo determinado neste campo.
                  </small>
                </div>
<?php if($m4_01==3){ ?>                
                <div class="form-group row">
                  <input type="hidden" name="action" value="edt_tempo_alerta">
                  <input type="hidden" name="token" value="<?php echo $token;?>">
                  <button type="submit" class="btn btn-outline-danger">Salvar Alterações</button>
                </div>
<?php } ?>
<?php if($m4_01==3){ ?>
              </form> 
<?php } ?>
            </div>
          </div>
        </div>
        
        <div class="col-md-3 mt-2">
          <div class="card">
            <div class="card-header py-2">
              <i class="fas fa-stopwatch"></i> Alerta Padrao de SLA 
            </div>
            <div class="card-body">
<?php if($m4_02==3){ ?> 
              <form action="#" method="POST">
<?php } ?>
                <div class="form-group row">
                  <label class="col-sm-6 col-form-label">Alerta 1: <i class="fas fa-bell fa-2x blink"></i></label>
                  <div class="col-sm-6">
                    <div class="input-group">
                      <input type="number" name="sla_n1" class="form-control" value="<?php echo $sla_n1; ?>">
                      <div class="input-group-append">
                        <div class="input-group-text">Min</div>
                      </div>                    
                    </div>
                  </div>
                </div>

                <div class="form-group row">
                  <label class="col-sm-6 col-form-label">Alerta 2: <i class="fas fa-bell fa-2x blinkkk"></i></label>
                  <div class="col-sm-6">
                    <div class="input-group">
                      <input type="number" name="sla_n2" class="form-control" value="<?php echo $sla_n2; ?>">
                      <div class="input-group-append">
                        <div class="input-group-text">Min</div>
                      </div>                    
                    </div>
                  </div>
                </div>

                <div class="form-group row">
                  <label class="col-sm-6 col-form-label">Alerta 3: <i class="fas fa-bell fa-2x blinkk"></i></label>
                  <div class="col-sm-6">
                    <div class="input-group">
                      <input type="number" name="sla_n3" class="form-control" value="<?php echo $sla_n3; ?>">
                      <div class="input-group-append">
                        <div class="input-group-text">Min</div>
                      </div>                    
                    </div>
                  </div>
                </div>
                  <div class="form-group row">
                  <label class="col-sm-6 col-form-label">Rotina:</label>
                  <div class="col-sm-6">
                    <div class="input-group">
                      <input type="number" name="sla_n4" class="form-control" value="<?php echo $sla_n4; ?>">
                      <div class="input-group-append">
                        <div class="input-group-text">Min</div>
                      </div>                    
                    </div>
                  </div>
                </div>
                <div class="form-group row">
                  <small class="text-muted col-sm-12">
                    <i class="fas fa-info-circle"></i> O Allterus usará os tempos acima para determinar o prazo de atendimento de um atendimento.
                  </small>
                </div>
<?php if($m4_02==3){ ?>                
                <div class="form-group row">
                  <input type="hidden" name="action" value="edt_sla">
                  <input type="hidden" name="token" value="<?php echo $token;?>">
                  <button type="submit" class="btn btn-outline-danger">Salvar Alterações</button>
                </div>
<?php } ?>
<?php if($m4_02==3){ ?>
              </form> 
<?php } ?>
            </div>
          </div>
        </div>
        
      </div>
    </div>
<!-- MODAL DE AJUDA PARA CADASTRO DE NOVO ATENDIMENTO -->    
<div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">

      <div class="modal-header">
        <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Cadastros</h6>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
      </div>

      <div class="modal-body">
        <p>Em construção...
        </p>
      </div>

    </div>
  </div>
</div>    
        
<?php if (isset($mensagem)){ ?>
<div class="row pull-right" style="position:absolute; top: 65px; right:25px;">
  <div class="alert <?php echo $mensagem_cor; ?> alert-dismissible fade show" role="alert">
    <?php echo $mensagem; ?> 
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
</div>
<?php }?>
<?php include_once("../all/update_pass.php"); ?>
    <script src="../js/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.min.js"></script>
<!--    <script src="../js/bootstrap.bundle.min.js"></script>    -->
<?php if (isset($mensagem)){ ?>
    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 4000); 
    </script>
<?php }?>
  </body>
</html>
