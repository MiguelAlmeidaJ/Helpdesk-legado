<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");

// if($m2_01==0){header("Location: ../index.php");}

$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
if ($usar_token=="true") {
  if($action){
    if ($action == "alterar_senha") {include_once("../all/update_senha.php");}
    
    if ($action == "new_tipo_despe") {
      $tipo_despe = filter_input(INPUT_POST, 'tipo_despe', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $status = filter_input(INPUT_POST, 'status', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

      $pdo = ConnectionN3();
      $adc= $pdo->prepare("INSERT INTO `cads_tipo_despe` (`tipo_despe`, `status`) VALUES (:tipo_despe, :status);");
      $adc->bindParam(':tipo_despe', $tipo_despe);
      $adc->bindParam(':status', $status);
      if($adc->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Tipo de Despesa Cadastrado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar Tipo de Despesa!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }  
    }
    
    if ($action == "edt_tipo_despe") {
      $id = filter_input(INPUT_POST, 'id', FILTER_SANITIZE_NUMBER_INT);
      $tipo_despe = filter_input(INPUT_POST, 'tipo_despe', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $status = filter_input(INPUT_POST, 'status', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $pdo = ConnectionN3();
      $edt= $pdo->prepare("UPDATE `cads_tipo_despe` SET `tipo_despe`=:tipo_despe, `status`=:status WHERE  `id`=:id;");
      $edt->bindParam(':tipo_despe', $tipo_despe);
      $edt->bindParam(':status', $status);
      $edt->bindParam(':id', $id);
      
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Tipo de Despesa editado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar Tipo de Despesa!";
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
<?php include_once("../all/sidebar.php"); ?>
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-12 mt-2">
          <div class="card">
            <div class="card-header py-2">
              <div class="row">
                <div class="col-6 h6 pt-1"><i class="fas fa-funnel-dollar"></i> Tipos de Despesa Cadastrados </div>
                <div class="col-6 text-right">
                  <button type="button" class="btn btn-outline-primary btn-sm text-center text-dark" data-toggle="modal" data-target="#new_tipo_despe"> <i class="fas fa-user-plus text-dark"></i> Adicionar Tipo de Despesa </button>
                </div>
              </div>
            </div>
            <div class="card-body p-0">
                <table class="table table-hover table-striped table-sm">
                  <thead>
                    <tr>
                      <th></th>
                      <th>#ID</th>
                      <th>Tipo de Despesa</th>                      
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
<?php
$pdo = ConnectionN3();
$show_eqp = $pdo->prepare("SELECT cads_tipo_despe.* FROM cads_tipo_despe ORDER BY cads_tipo_despe.tipo_despe ASC");
$show_eqp->execute();
while($row=$show_eqp->fetch(PDO::FETCH_ASSOC)){
  $id=$row["id"];
  $tipo_despe=$row["tipo_despe"];
  $status=$row["status"];
?>
                    <tr>
                      <td>
                        <?php if($status==1){ ?><i class="fas fa-toggle-on text-primary" title="Ativo"></i><?php } ?> 
                        <?php if($status==0){ ?><i class="fas fa-toggle-off text-muted" title="Inativo"></i><?php } ?>
                      </td>
                      <td>
                        #<?php echo str_pad($id , 4 , '0' , STR_PAD_LEFT); ?>
                      </td>
                      <td>
                        <?php echo $tipo_despe; ?>
                      </td>
                      <td>
                        <button type="button" class="btn btn-outline-secondary btn-sm view_TipoDespe" id="<?php echo $row['id']; ?>"> <i class="far fa-edit"></i> </button>
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
<div class="modal fade" id="new_tipo_despe" tabindex="-1" role="dialog" aria-labelledby="new_tipo_despe" aria-hidden="true">
  <div class="modal-dialog modal-md">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"><i class="fas fa-funnel-dollar"></i> Cadastro de Tipo de Despesa</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="row">
            <div class="col-md-12">
              
              <div class="form-group row my-1">
                <label class="col-4 col-form-label text-right px-0">Tipo de Despesa:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-funnel-dollar"></i></div>
                    </div> 
                    <input name="tipo_despe" placeholder="Nome do Tipo de Despesa" type="text" class="form-control" required="required">
                  </div>
                </div>
              </div>

              <div class="form-group row my-1">
                <label class="col-4 col-form-label text-right px-0">Status:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-toggle-on"></i></div>
                    </div> 
                    <select name="status" required="required" class="form-control">
                      <option></option>
                      <option value="1">Ativo</option>
                      <option value="0">Inativo</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>
          </div>
      </div>
        <div class="modal-footer">
          <input type="hidden" name="action" value="new_tipo_despe">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
          <button type="input" class="btn btn-primary">Salvar novo Tipo de Despesa</button>
        </div>
      </form>
    </div>
  </div>
</div>
<!-- -->

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
<!-- MODAL DE EDIÇÃO DE CENTO DE CUSTOS -->
<div class="modal fade" id="modalEdtTipoDespe" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-md">
    <div class="modal-content">
<?php // if($m2_01==3){?>      
      <form method="POST" action="#">
        <div class="modal-header">
          <h6 class="modal-title" id="modalEdtCltLabel"><i class="fas fa-funnel-dollar text-danger"></i> Edição de Cliente</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body p-0">
          <div class="row">
            <div class="col-md-12">        
              <span id="info_edt_TipoDespe"></span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-info" data-dismiss="modal">Fechar</button>
          <input type="hidden" name="action" value="edt_tipo_despe">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <button type="submit" class="btn btn-outline-danger">Editar</button>
        </div>
      </form>
<?php // } ?>
    </div>
  </div>
</div>
<script>
  $(document).ready(function(){
    $(document).on('click','.view_TipoDespe', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('tipo_despe_edt.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#info_edt_TipoDespe").html(retorna);
          $('#modalEdtTipoDespe').modal('show'); 
        });
      }
    });
  });
</script>    
<!-- -->
  </body>
</html>