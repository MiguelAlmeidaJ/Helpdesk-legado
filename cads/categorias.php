<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");

if($m2_04==0){header("Location: ../index.php");}

$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_STRING);
if ($usar_token=="true") {
  if($action){
    if ($action == "alterar_senha") {include_once("../all/update_senha.php");}
    
    if ($action == "new_cat") {
      $cat_nome = filter_input(INPUT_POST, 'cat_nome', FILTER_SANITIZE_STRING);
      $cat_setor = filter_input(INPUT_POST, 'cat_setor', FILTER_SANITIZE_STRING);

      $pdo = ConnectionN3();
      $adc= $pdo->prepare("INSERT INTO `categorias` (`cat_nome`, `cat_setor`, `cat_sts`) VALUES (:cat_nome, :cat_setor, '1');");
      $adc->bindParam(':cat_nome', $cat_nome);
      $adc->bindParam(':cat_setor', $cat_setor);
      if($adc->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Categoria cadastrada com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar categoria!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }  
    }
    
    if ($action == "edt_cat") {
      $cat_id = filter_input(INPUT_POST, 'cat_id', FILTER_SANITIZE_NUMBER_INT);
      $cat_nome = filter_input(INPUT_POST, 'cat_nome', FILTER_SANITIZE_STRING);
      $cat_setor = filter_input(INPUT_POST, 'cat_setor', FILTER_SANITIZE_NUMBER_INT);
      $cat_sts = filter_input(INPUT_POST, 'cat_sts', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $edt= $pdo->prepare("UPDATE `categorias` SET `cat_nome`=:cat_nome, `cat_setor`=:cat_setor, `cat_sts`=:cat_sts WHERE `cat_id`=:cat_id;");
      $edt->bindParam(':cat_nome', $cat_nome);
      $edt->bindParam(':cat_setor', $cat_setor);
      $edt->bindParam(':cat_sts', $cat_sts);
      $edt->bindParam(':cat_id', $cat_id);
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Categoria editada com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar Categoria!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }
    }
    
    if ($action == "new_scat") {
      $scat_nome = filter_input(INPUT_POST, 'scat_nome', FILTER_SANITIZE_STRING);
      $scat_cat = filter_input(INPUT_POST, 'scat_cat', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $adc= $pdo->prepare("INSERT INTO `subcategorias` (`scat_cat`, `scat_nome`, `scat_sts`) VALUES (:scat_cat, :scat_nome, '1');");
      $adc->bindParam(':scat_cat', $scat_cat);
      $adc->bindParam(':scat_nome', $scat_nome);
      if($adc->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Sub Categoria cadastrada com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar Sub Categoria!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }  
    }
    
    if ($action == "new_item") {
      $itens_nome = filter_input(INPUT_POST, 'itens_nome', FILTER_SANITIZE_STRING);
      $itens_scat = filter_input(INPUT_POST, 'itens_scat', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $adc= $pdo->prepare("INSERT INTO `itens` (`itens_scat`, `itens_nome`, `itens_sts`) VALUES (:itens_scat, :itens_nome, '1');");
      $adc->bindParam(':itens_scat', $itens_scat);
      $adc->bindParam(':itens_nome', $itens_nome);
      if($adc->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Item cadastrado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar Item!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }  
    }
    
     if ($action == "edt_scat") {
      $scat_id = filter_input(INPUT_POST, 'scat_id', FILTER_SANITIZE_NUMBER_INT);
      $scat_nome = filter_input(INPUT_POST, 'scat_nome', FILTER_SANITIZE_STRING);
      $scat_sts = filter_input(INPUT_POST, 'scat_sts', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $edt= $pdo->prepare("UPDATE `subcategorias` SET `scat_nome`=:scat_nome, `scat_sts`=:scat_sts WHERE `scat_id`=:scat_id;");
      $edt->bindParam(':scat_nome', $scat_nome);
      $edt->bindParam(':scat_sts', $scat_sts);
      $edt->bindParam(':scat_id', $scat_id);
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Sub Categoria editada com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar Sub Categoria!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }
    }

    if ($action == "edt_item") {
      $itens_id = filter_input(INPUT_POST, 'itens_id', FILTER_SANITIZE_NUMBER_INT);
      $itens_nome = filter_input(INPUT_POST, 'itens_nome', FILTER_SANITIZE_STRING);
      $itens_sts = filter_input(INPUT_POST, 'itens_sts', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $edt= $pdo->prepare("UPDATE `itens` SET `itens_nome`=:itens_nome, `itens_sts`=:itens_sts WHERE `itens_id`=:itens_id;");
      $edt->bindParam(':itens_nome', $itens_nome);
      $edt->bindParam(':itens_sts', $itens_sts);
      $edt->bindParam(':itens_id', $itens_id);
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Item editada com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar Item!";
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
<?php include_once("../all/header.php"); ?>
    <div class="container-fluid">
      <div class="row justify-content-md-center">
        <div class="col-md-8 mt-2">
          <div class="card">
            <div class="card-header py-2">
              <div class="row">
                <div class="col-6 h6 pt-1"><i class="fas fa-tags"></i> Categoria Cadastradas </div>
                <div class="col-6 text-right">
<?php if($m2_04>1){ ?>
                  <button type="button" class="btn btn-outline-primary btn-sm text-center text-dark" data-toggle="modal" data-target="#new_cat"> <i class="far fa-plus-square text-dark"></i> Adicionar Categoria </button>
<?php } ?>
                </div>
              </div>
            </div>
            <div class="card-body p-0">
              <div id="accordion">
                <div class="card py-0 my-0">              
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT categorias.* FROM categorias ORDER BY categorias.cat_sts DESC, categorias.cat_nome ASC");
$show->execute();
while($row=$show->fetch(PDO::FETCH_ASSOC)){
  $cat_id=$row["cat_id"];
  $cat_nome=$row["cat_nome"];
  $cat_setor=$row["cat_setor"];
  $cat_sts=$row["cat_sts"];
?>
                  <div class="card-header py-1 my-0" id="headingOne">
                    <div class="row align-items-center">
                      <div class="col-1 px-0">
                        <button class="btn btn-link" data-toggle="collapse" data-target="#collapseOne-<?php echo $cat_id; ?>" aria-expanded="true" aria-controls="collapseOne">
                          <i class="fas fa-angle-double-down"></i>
                        </button>
                      </div>
                      <div class="col-5 px-0">
                        <?php if($cat_sts==1){ ?><i class="fas fa-toggle-on text-primary" title="Ativo"></i><?php } ?> 
                        <?php if($cat_sts==0){ ?><i class="fas fa-toggle-off text-muted" title="Inativo"></i><?php } ?>
                        <span class=""><?php echo $cat_nome; ?> </span>
                      </div>
                      <div class="col-2 px-0 ">
<?php if($cat_setor==1){  ?><i class="fas fa-microchip text-success px-1" title="TI"></i> TI <?php } ?>
<?php if($cat_setor==3){ ?><i class="fas fa-chart-bar text-primary px-1" title="ADM"></i> ADM <?php } ?>
<?php if($cat_setor==2){ ?><i class="fas fa-bullhorn text-danger px-1" title="MKT"></i> MKT <?php } ?>
                      </div>
                      <div class="col-1 px-0">
<?php if($m2_04>2){ ?>
                        <button type="button" class="btn btn-outline-dark btn-sm view_cat" id="<?php echo $row['cat_id']; ?>"> <i class="far fa-edit"></i> Editar Categoria </button>
<?php } ?>                        
                      </div>
                      <div class="col-3 px-0 ">
                      </div>
                    </div>
                  </div>
<?php if($m2_05!=0){ //SEM PERMISSÃO PARA VER SUBCATEGORIAS ?>
<?php
$rancho = 0;
$pdo = ConnectionN3();
//BUSCA POR SUBCATEGORIAS
  $show_scat = $pdo->prepare("SELECT subcategorias.* FROM subcategorias WHERE subcategorias.scat_cat = '$cat_id' ORDER BY scat_sts DESC, scat_nome ASC");  
  $show_scat ->execute();
  $cont_scat = $show_scat->rowCount();
  if($cont_scat>0){
    while ($exibe_scat=$show_scat->fetch(PDO::FETCH_ASSOC)){
      $scat_id = $exibe_scat["scat_id"];
      $scat_nome = $exibe_scat["scat_nome"];
      $scat_sts = $exibe_scat["scat_sts"];
?>      
                  <div id="collapseOne-<?php echo $cat_id; ?>" class="collapse" aria-labelledby="headingOne" data-parent="#accordion">
                    <div class="card-body py-2 border-bottom">
                      <div class="row align-items-center">                    
                        <div class="col-1 px-2 text-right text-info"></div>
                        <div class="col-1 px-2 text-right text-info"></div>
                        <div class="col-1 px-0">
                          <?php if($scat_sts==1){ ?><i class="fas fa-toggle-on text-primary" title="Ativo"></i><?php } ?>
                          <?php if($scat_sts==0){ ?><i class="fas fa-toggle-off text-muted" title="Inativo"></i><?php } ?>
                        </div>                        
                        <div class="col-5 px-0">
                          <span class=""><?php echo $scat_nome; ?></span>
                        </div>
                        <div class="col-1 px-0">
<?php if($m2_05>2){ ?>
                          <button type="button" class="btn btn-outline-secondary btn-sm view_scat" id="<?php echo $exibe_scat['scat_id']; ?>"> <i class="far fa-edit"></i> Editar Subcategoria</button>
<?php } ?>
                        </div>
                        <div class="col-3 px-0 ">
                        </div>
                      </div>
                    </div>
<?php if($m2_06!=0){ //SEM PERMISSÃO PARA VER ITENS ?>
<?php
//BUSCA POR ITENS
  $show_itens = $pdo->prepare("SELECT itens.* FROM itens WHERE itens.itens_scat = '$scat_id' ORDER BY itens_sts DESC, itens_nome ASC");  
  $show_itens ->execute();
  $cont_itens = $show_itens->rowCount();
  if($cont_itens>0){
    while ($exibe_itens=$show_itens->fetch(PDO::FETCH_ASSOC)){
      $itens_id = $exibe_itens["itens_id"];
      $itens_nome = $exibe_itens["itens_nome"];
      $itens_sts = $exibe_itens["itens_sts"];
?> 
                    <div class="card-body py-2 border-bottom small">
                      <div class="row align-items-center">                    
                        <div class="col-2 px-2 text-right text-info"></div>
                        <div class="col-1 px-2 text-right text-info"></div>
                        <div class="col-1 px-0">
                          <?php if($itens_sts==1){ ?><i class="fas fa-toggle-on text-primary" title="Ativo"></i><?php } ?>
                          <?php if($itens_sts==0){ ?><i class="fas fa-toggle-off text-muted" title="Inativo"></i><?php } ?>
                        </div>                        
                        <div class="col-4 px-0">
                          <span class=""><?php echo $itens_nome; ?></span>
                        </div>
                        <div class="col-1 px-0">
<?php if($m2_06>2){ ?>
                          <button type="button" class="btn btn-outline-secondary btn-sm view_item small" id="<?php echo $exibe_itens['itens_id']; ?>"> <i class="far fa-edit"></i> Editar Item</button>
<?php } ?>
                        </div>
                        <div class="col-3 px-0 ">
                        </div>
                      </div>
                    </div>                    
<?php } ?>
<?php if($m2_06>1){ ?>
                    <div class="card-body py-2 border-bottom small">
                      <div class="row align-items-center">                                 
                        <div class="col-4 px-0 text-center text-danger small">
                        </div>
                        <div class="col-4 px-0">
                          <button type="button" class="btn btn-outline-secondary btn-sm adc_item" id="<?php echo $exibe_scat["scat_id"]; ?>"> <i class="far fa-plus-square"></i> Adicionar Item</button>
                        </div>
                        <div class="col-4 px-0 ">
                        </div>
                      </div>
                    </div>
<?php } ?>                    
<?php } else {   //fecha IF que verifica se contagem de itens totais é > 0 ?>         
                    <div class="card-body py-2 border-bottom small">
                      <div class="row align-items-center">                                 
                        <div class="col-4 px-0"></div>
                        <div class="col-4 px-0 text-danger">
                          Não há Item cadastrado para esta SubCategoria.
                        </div>
                        <div class="col-4 px-0 ">
                        </div>
                      </div>
                    </div>
<?php if($m2_06>1){ ?>
                    <div class="card-body py-2 border-bottom small">
                      <div class="row align-items-center">                                 
                        <div class="col-4 px-0 text-center text-danger small">
                        </div>
                        <div class="col-4 px-0">
                          <button type="button" class="btn btn-outline-secondary btn-sm adc_item" id="<?php echo $exibe_scat["scat_id"]; ?>"> <i class="far fa-plus-square"></i> Adicionar Item</button>
                        </div>
                        <div class="col-4 px-0 ">
                        </div>
                      </div>
                    </div>                    
<?php } ?>
<?php } ?>
<?php } ?>
                    
                  </div>
<?php } //fecha while que busca por subcategorias ?> 
<?php if($m2_05>1){ ?>
                  <div id="collapseOne-<?php echo $cat_id; ?>" class="collapse" aria-labelledby="headingOne" data-parent="#accordion">
                    <div class="card-body py-2 border-bottom">
                      <div class="row align-items-center">                    
                        <div class="col-3">
                        </div>
                        <div class="col-4 px-0">
                          <button type="button" class="btn btn-outline-secondary btn-sm adc_scat" id="<?php echo $row['cat_id']; ?>"> <i class="far fa-plus-square"></i> Adicionar Sub Categoria </button>
                        </div>
                        <div class="col-4 px-0 ">
                        </div>
                      </div>
                    </div>
                  </div> 
<?php } ?>
<?php } else {   //fecha IF que verifica se contagem de subcategorias totais é > 0 ?>         
                  <div id="collapseOne-<?php echo $cat_id; ?>" class="collapse" aria-labelledby="headingOne" data-parent="#accordion">
                    <div class="card-body py-2 border-bottom">
                      <div class="row align-items-center">                                 
                        <div class="col-3 px-0 text-center text-danger small">
                          Não há subcategoria cadastrada para esta categoria.
                        </div>
                        <div class="col-4 px-0">
<?php if($m2_05>1){ ?>
                          <button type="button" class="btn btn-outline-secondary btn-sm adc_scat" id="<?php echo $row['cat_id']; ?>"> <i class="far fa-plus-square"></i> Adicionar Sub Categoria</button>
<?php } ?> 
                        </div>
                        <div class="col-4 px-0 ">
                        </div>
                      </div>
                    </div>
                  </div>  
<?php } ?> 
<?php } ?> 
                  
                  
                  
<?php } ?>
                  
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
<!-- -->
<?php if($m2_04>1){ ?>
<div class="modal fade" id="new_cat" tabindex="-1" role="dialog" aria-labelledby="new_user" aria-hidden="true">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"><i class="fas fa-tags"></i> Cadastro de Categoria</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="row">
            <div class="col-md-12">
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">Nome:</label> 
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-tags"></i></div>
                    </div> 
                    <input name="cat_nome" placeholder="Nome da Categoria" type="text" class="form-control" required="required">
                  </div>
                </div>
              </div>

              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">Setor:</label> 
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-sitemap"></i></div>
                    </div> 
                      <select name="cat_setor" required="required" class="form-control">
                        <option value="1">TI</option>
                      </select>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
      </div>
        <div class="modal-footer">
          <input type="hidden" name="action" value="new_cat">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
          <button type="input" class="btn btn-primary">Salvar nova categoria</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php } ?>
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
<?php } ?>
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
<?php } ?>
<?php if($m2_04>2){ ?>    
<!-- MODAL DE EDIÇÃO DE CATEGORIA -->
<div class="modal fade" id="modalEdtCat" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-md">
    <div class="modal-content">
      <form method="POST" action="#">
        <div class="modal-header">
          <h6 class="modal-title" id="modalEdtCatLabel"><i class="fas fa-user-edit"></i> Edição de Categoria</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body p-0">
          <div class="row">
            <div class="col-md-12">        
              <span id="info_edt_cat"></span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-info" data-dismiss="modal">Fechar</button>
          <input type="hidden" name="action" value="edt_cat">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <button type="submit" class="btn btn-outline-danger">Editar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<script>
  $(document).ready(function(){
    $(document).on('click','.view_cat', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('cat_edt.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#info_edt_cat").html(retorna);
          $('#modalEdtCat').modal('show'); 
        });
      }
    });
  });
</script>    
<!-- -->
<?php } ?>
<?php if($m2_05>1){ ?> 
<!-- MODAL DE CADASTRO DE SUB CATEGORIAS -->
<div class="modal fade" id="modalAdcScat" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true" >
  <div class="modal-dialog modal-md">
    <div class="modal-content">

        <div class="modal-header">
          <h6 class="modal-title" id="modalAdcScatLabel"><i class="far fa-plus-square"></i> Cadastro de Sub Categorias</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <form action="#" method="POST">
          <div class="modal-body">
            <div class="row">
              <div class="col-md-12">        
                <span id="info_adc_scat"></span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <input type="hidden" name="action" value="new_scat">
            <input type="hidden" name="token" value="<?php echo $token;?>">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
            <button type="input" class="btn btn-primary">Salvar nova Sub Categoria</button>
          </div>
        </form>
    </div>
  </div>
</div>
<script>
  $(document).ready(function(){
    $(document).on('click','.adc_scat', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('scat_adc.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#info_adc_scat").html(retorna);
          $('#modalAdcScat').modal('show'); 
        });
      }
    });
  });
</script>    
<!-- -->
<?php } ?>
<?php if($m2_05>2){ ?> 
<!-- MODAL DE EDIÇÃO DE SUB CATEGORIAS -->
<div class="modal fade" id="modalEdtScat" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true" >
  <div class="modal-dialog modal-md">
    <div class="modal-content">

        <div class="modal-header">
          <h6 class="modal-title" id="modalEdtScatLabel"><i class="fas fa-tag"></i> Edição de Sub Categoria</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      <form action="#" method="POST">
          <div class="modal-body">
            <div class="row">
              <div class="col-md-12">        
                <span id="info_edt_scat"></span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <input type="hidden" name="action" value="edt_scat">
            <input type="hidden" name="token" value="<?php echo $token;?>">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
            <button type="input" class="btn btn-primary">Editar Sub Categoria</button>
          </div>
        </form>

    </div>
  </div>
</div>
<?php } ?>
<?php if($m2_06>1){ ?> 
<!-- MODAL DE CADASTRO DE ITENS -->
<div class="modal fade" id="modalAdcItem" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true" >
  <div class="modal-dialog modal-md">
    <div class="modal-content">

        <div class="modal-header">
          <h6 class="modal-title" id="modalAdcItemLabel"><i class="far fa-plus-square"></i> Cadastro de Item</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <form action="#" method="POST">
          <div class="modal-body">
            <div class="row">
              <div class="col-md-12">        
                <span id="info_adc_item"></span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <input type="hidden" name="action" value="new_item">
            <input type="hidden" name="token" value="<?php echo $token;?>">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
            <button type="input" class="btn btn-primary">Salvar novo Item</button>
          </div>
        </form>
    </div>
  </div>
</div>
<script>
  $(document).ready(function(){
    $(document).on('click','.adc_item', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('item_adc.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#info_adc_item").html(retorna);
          $('#modalAdcItem').modal('show'); 
        });
      }
    });
  });
</script>    
<!-- -->
<?php } ?>
<?php if($m2_06>2){ ?> 
<!-- MODAL DE EDIÇÃO DE ITENS -->
<div class="modal fade" id="modalEdtItens" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-md">
    <div class="modal-content">
      <form method="POST" action="#">
        <div class="modal-header">
          <h6 class="modal-title" id="modalEdtCatLabel"><i class="fas fa-user-edit"></i> Edição de Item</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body p-0">
          <div class="row">
            <div class="col-md-12">        
              <span id="info_edt_item"></span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-info" data-dismiss="modal">Fechar</button>
          <input type="hidden" name="action" value="edt_item">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <button type="submit" class="btn btn-outline-danger">Editar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<script>
  $(document).ready(function(){
    $(document).on('click','.view_item', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('item_edt.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#info_edt_item").html(retorna);
          $('#modalEdtItens').modal('show'); 
        });
      }
    });
  });
</script>    
<!-- -->
<?php } ?>

<!-- MODAL DE AJUDA PARA CADASTRO DE NOVO ATENDIMENTO -->    
<div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">

      <div class="modal-header">
        <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Cadastro categorias e subcategorias</h6>
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
    $(document).on('click','.view_scat', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('scat_edt.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#info_edt_scat").html(retorna);
          $('#modalEdtScat').modal('show'); 
        });
      }
    });
  });
</script>    
<!-- -->

  </body>
</html>