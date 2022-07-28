<?php
session_start();
//include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
$hoje = date("Y-m-d");
        
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_STRING);
if ($action == "alterar_senha") {include_once("../all/update_senha.php");}

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
    <script type="text/javascript" src="../js/valida_cnpj.js"></script>
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
                <div class="col-6 h6 pt-1"></div>
              </div>
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