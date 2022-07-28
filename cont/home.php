<?php
session_start();
//include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
$hoje = date("Y-m-d");

 $data_30 =  date('Y-m-d', strtotime($hoje. ' +30 days'));
 $data_60 =  date('Y-m-d', strtotime($hoje. ' +60 days'));
 $data_90 =  date('Y-m-d', strtotime($hoje. ' +90 days'));
 
// if($m3_00==0){header("Location: ../index.php");}

$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_STRING);

if ($action == "alterar_senha") {include_once("../all/update_senha.php");}

if (isset($_POST['f_sts'])) {$p_sts = $f_sts = $_POST['f_sts'];} else {$f_sts = 1;}
 if(1== $f_sts){$where_sts = "contratos.status = '1'"; } //Vigente
 if(2== $f_sts){$where_sts = "contratos.status = '1' AND contratos.data_termino < '$data_30'"; } //Vigente A vencer em 30 dias
 if(3== $f_sts){$where_sts = "contratos.status = '1' AND contratos.data_termino < '$data_60'"; } //Vigente A vencer em 60 dias
 if(4== $f_sts){$where_sts = "contratos.status = '1' AND contratos.data_termino < '$data_90'"; } //Vigente A vencer em 90 dias
 if(5== $f_sts){$where_sts = "contratos.status = '1' AND contratos.data_termino < '$hoje'"; } //Vigente Vencido
 if(6== $f_sts){$where_sts = "contratos.status = '2'"; } //Encerrado
 if(0== $f_sts){$where_sts = "contratos.status = '0'"; } //Excluído
                      
 


if (isset($_POST['f_loc'])) {$f_loc = $p_loc = $_POST['f_loc'];} else {$f_loc = $p_loc = 0;}
if ($f_loc == 0) {$p_loc = "%"; $p_loc = "%";}

if (isset($_POST['ord'])) {$ord = $_POST['ord'];} else {$ord = "contrato";}
if ($ord == "contrato"){$order_by = "contratos.id ASC";}
if ($ord == "clientes"){$order_by = "clientes.clt_nomer ASC";}
if ($ord == "data_inicio"){$order_by = "contratos.data_inicio DESC";}
if ($ord == "data_termino"){$order_by = "contratos.data_termino ASC";}
if ($ord == "valor"){$order_by = "contratos.valor_atual DESC";}

//header("Refresh:60");
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
  <body>
<?php include_once("../all/loading.php"); ?>
<?php include("../all/header.php"); ?>
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-12 mt-2">
          <div class="card">
            <div class="card-header py-1">
              <form action="#" method="POST">
                <div class="form-row align-items-center">
                  <div class="col-auto col-form-label-sm">
                    <label class="my-0"> Locador:</label>
                    <select name="f_loc" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="1">
                      <option value="0">Todos os Locadores</option>
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT clientes.clt_nomer, clientes.clt_id FROM cads_locadores WHERE cclientes.clt_sts = '1' ORDER BY clientes.clt_nomer ASC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
  $clt_id = $exibe["clt_id"];
  $clt_nomer = $exibe["clt_nomer"];
?>
                      <option value="<?php echo $clt_id; ?>"<?php if ($f_clt == $clt_id){echo " selected";} ?>><?php echo $clt_nomer;?></option>
<?php } ?>
                    </select>
                  </div>
                
                  <div class="col-auto col-form-label-sm">
                    <label class="my-0"> Status:</label>
                    <select name="f_sts" class="form-control form-control-sm" tabindex="2">
                      <option value="1"<?php if(1== $f_sts){echo " selected";} ?>>Vigente</option>
                      <option value="2"<?php if(2== $f_sts){echo " selected";} ?>>Vigente A vencer em 30 dias</option>
                      <option value="3"<?php if(3== $f_sts){echo " selected";} ?>>Vigente A vencer em 60 dias</option>
                      <option value="4"<?php if(4== $f_sts){echo " selected";} ?>>Vigente A vencer em 90 dias</option>
                      <option value="5"<?php if(5== $f_sts){echo " selected";} ?>>Vigente Vencido</option>
                      <option value="6"<?php if(6== $f_sts){echo " selected";} ?>>Encerrado</option>
                      <option value="0"<?php if(0== $f_sts){echo " selected";} ?>>Excluído</option>
                    </select>
                  </div>
                  <div class="col-auto pt-3">
                    <button type="submit" class="btn btn-sm btn-outline-info" tabindex="4">Filtrar</button>
                  </div>
                </div>
              </form>
            </div>
            
            <div class="card-body p-0">
              <table class="table table-hover small">
                <thead>
                  <tr>
                    <th class="p-1">
                      <form action="#" method="POST">
                        <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                        <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                        <input type="hidden" name="ord" value="contrato">
                        <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Contrato</button>
                      </form>
                    </th>
                    <th class="p-1">
                      <form action="#" method="POST">
                        <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                        <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                        <input type="hidden" name="ord" value="locador">
                        <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Locador</button>
                      </form>
                    </th>
                    <th class="p-1">
                      <form action="#" method="POST">
                        <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                        <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                        <input type="hidden" name="ord" value="data_inicio">
                        <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Início</button>
                      </form>
                    </th>
                    <th class="p-1">
                      <form action="#" method="POST">
                        <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                        <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                        <input type="hidden" name="ord" value="data_termino">
                        <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Término</button>
                      </form>
                    </th>
                    <th class="p-1">
                      <form action="#" method="POST">
                        <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                        <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                        <input type="hidden" name="ord" value="valor">
                        <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Valor Atual</button>
                      </form>  
                    </th>
                    <th class="p-1">
                      <button type="submit" class="btn btn-light btn-sm btn-block"> Classificação </button>
                    </th>
                    <th class="p-1">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Status</button>
                    </th>
                    <th class="p-1"></th>
                  </tr>
                </thead>
                <tbody>
<?php 
$pdo = ConnectionN3();
$show_contrato = $pdo->prepare("SELECT contratos.id AS contrato, contratos.data_inicio, contratos.data_termino, contratos.dia_pagamento, contratos.valor_inicial, contratos.valor_atual, contratos.status,
clientes.clt_id,clientes.clt_nomer,
cads_forma_pag.forma,
cads_ind_reaju.indice,
cads_centro_custo.centro_custo,
cads_class_contab.categoria
FROM contratos
INNER JOIN clientes ON clientes.clt_id = contratos.cliente
INNER JOIN cads_forma_pag ON cads_forma_pag.id = contratos.forma_pag
INNER JOIN cads_ind_reaju ON cads_ind_reaju.id = contratos.indice_reajuste
INNER JOIN cads_centro_custo ON cads_centro_custo.id = contratos.centro_custo
INNER JOIN cads_class_contab ON cads_class_contab.id = contratos.class_contabil
WHERE $where_sts
ORDER BY $order_by
");
$show_contrato->execute();
while($row=$show_contrato->fetch(PDO::FETCH_ASSOC)){
  $contrato=$row["contrato"];
  $data_inicio=$row["data_inicio"];
  $data_termino=$row["data_termino"];
  $dia_pagamento=$row["dia_pagamento"];
  $valor_inicial=$row["valor_inicial"];
  $valor_atual=$row["valor_atual"];
  $clt_nomer=$row["clt_nomer"];
  $forma=$row["forma"];
  $indice=$row["indice"];
  $centro_custo=$row["centro_custo"];  
  $categoria=$row["categoria"];
  $status=$row["status"];
    //0=Excluído
    //1=Vigente
    //2=Encerrado
?>
                  <tr>
                    <th class="align-middle">
                      #<?php echo str_pad($contrato , 5 , '0' , STR_PAD_LEFT); ?> 
                    </th>
                    <td class="align-middle">
                      <strong><?php echo substr($clt_nomer, 0, 40); ?></strong>
                    </td>
                    <td class="align-middle text-center">
                      <?php echo date('d/m/Y', strtotime($data_inicio));?>
                    </td>
                    <td class="align-middle text-center">
                      <?php echo date('d/m/Y', strtotime($data_termino));?>
<?php
                      $data_90 =  date('Y-m-d', strtotime($hoje. ' +90 days'));
if(strtotime($data_90) > strtotime($data_termino) && $status == 1){ ?>
                      <i class="fas fa-bell blink"></i>
<?php } ?>
                    </td>
                    <td class="align-middle text-right">
                      R$ <?php echo $valor_inicial;?>
                    </td>
                    <th class="align-middle">
                      <span class="badge badge-info"><?php echo $centro_custo;?></span><br>
                      <span class="badge badge-secondary"><?php echo $categoria;?></span>
                    </th>
                    <td class="align-middle">
<?php if($status==0){ ?> <span class="badge badge-danger p-1"> <i class="far fa-trash-alt"></i> Excluído </span> <?php } ?>
<?php if($status==1){ ?> <span class="badge badge-success p-1"> <i class="fas fa-hourglass-start"></i> Vigente </span> <?php } ?>
<?php if($status==2){ ?> <span class="badge badge-secondary p-1"><i class="fas fa-hourglass-end"></i> Encerrado </span> <?php } ?>
<?php
if(strtotime($hoje) > strtotime($data_termino) && $status == 1){ ?>
<br> <span class="badge badge-danger p-1"><i class="fas fa-hourglass-end blink"></i> Vencido </span>
<?php } ?>
                    </td>
                    <td class="align-middle p-1">
                        <div class="btn-group"> 
                          <form action="contrato.php" method="POST">
                            <input type="hidden" name="contrato" value="<?php echo $contrato;?>">
                            <button type="submit" class="btn btn-primary p-1 mr-1"><i class="far fa-folder-open px-1" title="Gerir Contrato"></i></button>
                          </form>
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
<!-- MODAL DE AJUDA PARA A TELA LISTA DE CONTRATOS -->    
<div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">

      <div class="modal-header">
        <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Lista de Contratos</h6>
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