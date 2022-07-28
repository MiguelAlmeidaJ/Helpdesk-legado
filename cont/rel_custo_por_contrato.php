<?php
session_start();
//include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

$hoje = date("Y-m-d");
$data_30 =  date('Y-m-d', strtotime($hoje. ' -30 days'));
$data_60 =  date('Y-m-d', strtotime($hoje. ' -60 days'));
$data_90 =  date('Y-m-d', strtotime($hoje. ' -90 days'));
 
// if($m3_00==0){header("Location: ../index.php");}

$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_STRING);

if ($action == "alterar_senha") {include_once("../all/update_senha.php");}

//if (isset($_POST['f_sts'])) {$p_sts = $f_sts = $_POST['f_sts'];} else {$f_sts = 1;}
// if(1== $f_sts){$where_sts = "contratos.status = '1'"; } //Vigente
// if(2== $f_sts){$where_sts = "contratos.status = '1' AND contratos.data_termino < '$data_30'"; } //Vigente A vencer em 30 dias
// if(3== $f_sts){$where_sts = "contratos.status = '1' AND contratos.data_termino < '$data_60'"; } //Vigente A vencer em 60 dias
// if(4== $f_sts){$where_sts = "contratos.status = '1' AND contratos.data_termino < '$data_90'"; } //Vigente A vencer em 90 dias
// if(5== $f_sts){$where_sts = "contratos.status = '1' AND contratos.data_termino < '$hoje'"; } //Vigente Vencido
// if(6== $f_sts){$where_sts = "contratos.status = '2'"; } //Encerrado
// if(0== $f_sts){$where_sts = "contratos.status = '0'"; } //Excluído
//                      
// 


if (isset($_POST['f_cont'])) {$f_cont = $_POST['f_cont'];} else {$f_cont = 0;}

if (isset($_POST['f_ccusto'])) {$f_ccusto = $_POST['f_ccusto'];} else {$f_ccusto = 0;}


$cst_exibir_inicio_br = filter_input(INPUT_POST, 'cst_exibir_inicio', FILTER_SANITIZE_STRING);
if(empty($cst_exibir_inicio_br)){  
  $cst_exibir_inicio_br = date('d/m/y', strtotime($hoje. ' -183 days'));
  $cst_exibir_inicio_usa = date('Y-m-d', strtotime($hoje. ' -183 days'));
}else{
    $cst_exibir_inicio_usa = implode('-', array_reverse(explode('/', "$cst_exibir_inicio_br")));
}

$cst_exibir_fim_br = filter_input(INPUT_POST, 'cst_exibir_fim', FILTER_SANITIZE_STRING);
if(empty($cst_exibir_fim_br)){
  $cst_exibir_fim_br = date("d/m/y");
  $cst_exibir_fim_usa = date("Y-m-d");
}else{
    $cst_exibir_fim_usa = implode('-', array_reverse(explode('/', "$cst_exibir_fim_br")));
}

if (isset($_POST['ord'])) {$ord = $_POST['ord'];} else {$ord = "vencimento";}
if ($ord == "vencimento") {$orderby = "custos.data_vencimento DESC";}
if ($ord == "competencia") {$orderby = "custos.data_competencia DESC";}
if ($ord == "tipo") {$orderby = "custos.tipo ASC";}
if ($ord == "valor") {$orderby = "custos.valor DESC";}
if ($ord == "status") {$orderby = "custos.status DESC";}

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
    <!--    Calendário de datas -->
    <link rel="stylesheet" href="../css/jquery-ui.min_date.css">
    <!--graficos -->
    <script src="../js/loader.js" type="text/javascript"></script>
    <!--<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>-->
    <title>Allterus</title>
  </head>
  <body>
<?php include_once("../all/loading.php"); ?>
<?php include("../all/header.php"); ?>
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-12 mt-2 px-1">
          <div class="card">
            <div class="card-header py-1">
              <form action="#" method="POST">
                <div class="form-row align-items-center">
                  
                  <div class="col-auto col-form-label-sm">
                    <label class="my-0"> Contrato:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="far fa-file-alt"></i></div>
                      </div>                    
                      <select name="f_cont" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="1">
                        <option></option>
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT contratos.id, contratos.data_inicio, contratos.data_termino, cads_locadores.loc_nomer
FROM contratos 
INNER JOIN cads_locadores ON cads_locadores.loc_id = contratos.locador
WHERE contratos.`status` > '0'
ORDER BY cads_locadores.loc_nomer ASC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
  $cont_id = $exibe["id"];
  $cont_nomer = $exibe["loc_nomer"];
  $data_inicio = $exibe["data_inicio"];
  $data_termino = $exibe["data_termino"];
?>
                        <option value="<?php echo $cont_id; ?>"<?php if ($f_cont == $cont_id){echo " selected";} ?>><?php echo str_pad($cont_id , 5 , '0' , STR_PAD_LEFT); echo " ["; echo date('d/m/y', strtotime($data_inicio)); echo " a "; echo date('d/m/y', strtotime($data_termino)); echo "] $cont_nomer";?></option>
<?php } ?>
                      </select>
                    </div>
                  </div>
                
                  <div class="col-auto col-form-label-sm">
                    <label class="my-0">De:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="far fa-calendar-check"></i></div>
                      </div>
                      <input name="cst_exibir_inicio" id="from" type="text" value="<?php echo "$cst_exibir_inicio_br"; ?>" class="form-control form-control-sm" required="required" >
                    </div>
                  </div>
                
                  <div class="col-auto col-form-label-sm">
                    <label class="my-0">Até:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="far fa-calendar-times"></i></div>
                      </div>
                      <input name="cst_exibir_fim" id="to" type="text" value="<?php echo "$cst_exibir_fim_br"; ?>" class="form-control form-control-sm" required="required" >
                    </div>
                  </div>
                  <div class="col-auto pt-3">
                    <button type="submit" class="btn btn-sm btn-outline-info" tabindex="4">Filtrar</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
              
        <div class="col-md-3 px-1">
          <div class="card mt-1">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-tag"></i> Custo por Tipo
            </div>
            <div class="card-body p-0"> 
<?php
$matriz = "['Tipo','Custo Total']";
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT SUM(custos.valor) AS total, custos.tipo
FROM custos
WHERE custos.contrato = '$f_cont'
AND custos.data_vencimento BETWEEN '$cst_exibir_inicio_usa' AND '$cst_exibir_fim_usa'
GROUP BY custos.tipo
ORDER BY total DESC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
  $total = $exibe["total"];
  $tipo = $exibe["tipo"];
  if($tipo==1){$tipo="Despesas";}
  if($tipo==2){$tipo="Serviços";}
  if($tipo==3){$tipo="Taxas";}
$matriz = "$matriz, ['$tipo',$total]";
}
?>
<script type="text/javascript">
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(drawChart);
function drawChart() {
  var data = google.visualization.arrayToDataTable([
<?php echo $matriz; ?>
  ]);
  var options = {
    is3D: false,
    pieHole: 0.4,
    legend: { position: 'right', alignment: 'center'},
    chartArea:{left:5,top:8,bottom:8,right:5,width:'100%',height:'100%'},
  };
  var chart = new google.visualization.PieChart(document.getElementById('div_tcusto'));
  chart.draw(data, options);
}
</script>
<div id="div_tcusto" style="width: 100%; height: 200px;"></div>  
            </div>
          </div>

          <div class="card mt-1">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-funnel-dollar"></i> Custo por Centro de Custo
            </div>
            <div class="card-body  p-0"> 
<?php
$matriz = "['Centro de Custo','Custo Total']";
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT SUM(custos.valor) AS total, cads_centro_custo.centro_custo
FROM custos
INNER JOIN cads_centro_custo ON cads_centro_custo.id = custos.centro_custo
WHERE custos.contrato = '$f_cont'
AND custos.data_vencimento BETWEEN '$cst_exibir_inicio_usa' AND '$cst_exibir_fim_usa'
GROUP BY custos.centro_custo
ORDER BY total DESC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
  $total = $exibe["total"];
  $centro_custo = $exibe["centro_custo"];
$matriz = "$matriz, ['$centro_custo',$total]";
}
?>
<script type="text/javascript">
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(drawChart);
function drawChart() {
  var data = google.visualization.arrayToDataTable([
<?php echo $matriz; ?>
  ]);
  var options = {
    is3D: false,
    pieHole: 0.4,
    legend: { position: 'right', alignment: 'center'},
    chartArea:{left:5,top:8,bottom:8,right:5,width:'100%',height:'100%'},
  };
  var chart = new google.visualization.PieChart(document.getElementById('div_ccusto'));
  chart.draw(data, options);
}
</script>
<div id="div_ccusto" style="width: 100%; height: 200px;"></div>  
            </div>
          </div>

        </div>
              
        <div class="col-md-3 px-1">
          <div class="card mt-1">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-tag"></i> Por Classificação Contábil
            </div>
            <div class="card-body p-0"> 
<?php
$matriz = "['Classificação Contábil','Custo Total']";
$pdo = ConnectionN3();
$show = $pdo->prepare("

SELECT SUM(custos.valor) AS total,
cads_tipo_despe.class_contab,
cads_class_contab.categoria 
FROM custos
LEFT JOIN cads_tipo_despe ON cads_tipo_despe.id = custos.custo
LEFT JOIN cads_class_contab ON cads_class_contab.id = cads_tipo_despe.class_contab
WHERE custos.tipo = '1'
AND custos.contrato = '$f_cont' AND custos.data_vencimento BETWEEN '$cst_exibir_inicio_usa' AND '$cst_exibir_fim_usa'
GROUP BY cads_class_contab.categoria 

UNION

SELECT SUM(custos.valor) AS total,
cads_tipo_servi.class_contab,
cads_class_contab.categoria 
FROM custos
LEFT JOIN cads_tipo_servi ON cads_tipo_servi.id = custos.custo
LEFT JOIN cads_class_contab ON cads_class_contab.id = cads_tipo_servi.class_contab
WHERE custos.tipo = '2'
AND custos.contrato = '$f_cont' AND custos.data_vencimento BETWEEN '$cst_exibir_inicio_usa' AND '$cst_exibir_fim_usa'
GROUP BY cads_class_contab.categoria 

UNION

SELECT SUM(custos.valor) AS total,
cads_tipo_taxa.class_contab,
cads_class_contab.categoria 
FROM custos
LEFT JOIN cads_tipo_taxa ON cads_tipo_taxa.id = custos.custo
LEFT JOIN cads_class_contab ON cads_class_contab.id = cads_tipo_taxa.class_contab
WHERE custos.tipo = '3'
AND custos.contrato = '$f_cont' AND custos.data_vencimento BETWEEN '$cst_exibir_inicio_usa' AND '$cst_exibir_fim_usa'
GROUP BY cads_class_contab.categoria 

ORDER BY total DESC  
");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
  $class_contabil = 0;
  
  $class_contab_id = $exibe["class_contab"];
  $class_contab_nome = $exibe["categoria"];
  
  if($class_contabil == $class_contab_id){
    $total = $total + $exibe["total"];
  }else {
    $class_contabil = $class_contab_id = $exibe["class_contab"];
    $class_contab_nome = $exibe["categoria"];
    $total = $exibe["total"];  
  }
  
$matriz = "$matriz, ['$class_contab_nome',$total]";

}
?>
<script type="text/javascript">
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(drawChart);
function drawChart() {
  var data = google.visualization.arrayToDataTable([
<?php echo $matriz; ?>
  ]);
  var options = {
    is3D: false,
    pieHole: 0.4,
    legend: { position: 'right', alignment: 'center'},
    chartArea:{left:5,top:8,bottom:8,right:15,width:'100%',height:'100%'},
  };
  var chart = new google.visualization.PieChart(document.getElementById('div_clascusto'));
  chart.draw(data, options);
}
</script>
<div id="div_clascusto" style="width: 95%; height: 200px;"></div>  
            </div>
          </div>
          
          <div class="card mt-1">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-tag"></i> Por Dispêndio
            </div>
            <div class="card-body p-0"> 
<?php
$matriz = "['Dispêncio','Custo Total']";
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT SUM(custos.valor) AS total,
custos.tipo,
cads_tipo_despe.despesa, 
cads_tipo_servi.servico, 
cads_tipo_taxa.taxa
FROM custos
LEFT JOIN cads_tipo_despe ON cads_tipo_despe.id = custos.custo
LEFT JOIN cads_tipo_servi ON cads_tipo_servi.id = custos.custo
LEFT JOIN cads_tipo_taxa ON cads_tipo_taxa.id = custos.custo
WHERE custos.contrato = '$f_cont'
AND custos.data_vencimento BETWEEN '$cst_exibir_inicio_usa' AND '$cst_exibir_fim_usa'
GROUP BY custos.tipo, custos.custo
ORDER BY total DESC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
  $total = $exibe["total"];
  $tipo = $exibe["tipo"];
  $despesa = $exibe["despesa"];
  $servico = $exibe["servico"];
  $taxa = $exibe["taxa"];
  if($tipo==1){$tipo="$despesa";}
  if($tipo==2){$tipo="$servico";}
  if($tipo==3){$tipo="$taxa";}
  
$matriz = "$matriz, ['$tipo',$total]";
}
?>
<script type="text/javascript">
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(drawChart);
function drawChart() {
  var data = google.visualization.arrayToDataTable([
<?php echo $matriz; ?>
  ]);
  var options = {
    is3D: false,
    pieHole: 0.4,
    legend: { position: 'right', alignment: 'center'},
    chartArea:{left:5,top:8,bottom:8,right:15,width:'100%',height:'100%'},
  };
  var chart = new google.visualization.PieChart(document.getElementById('div_dcusto'));
  chart.draw(data, options);
}
</script>
<div id="div_dcusto" style="width: 95%; height: 200px;"></div>  
            </div>
          </div>
          
        </div>
 
              
        <div class="col-md-6 px-1">
          <div class="card mt-1">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-list-ul"></i> Detalhamento dos custos
            </div>
            <div class="card-body p-0"> 

                <div class="drive-wrapper drive-list-view p-0">
                  <div class="table-responsive drive-items-table-wrapper">
                    <table class="table table-sm small mb-0">
                      <thead>
                        <tr>
                          <th class="px-0">
                            <form action="#" method="POST">
                              <input type="hidden" name="ord" value="vencimento">
                              <input type="hidden" name="f_cont" value="<?php echo $f_cont; ?>">
                              <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                              <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">
                              <button type="submit" class="btn btn-light btn-sm btn-block px-0"><i class="fas fa-sort-amount-down-alt"></i> Venc </button>
                            </form>                    
                          </th>
                          <th class="px-1">
                            <form action="#" method="POST">
                              <input type="hidden" name="ord" value="competencia">
                              <input type="hidden" name="f_cont" value="<?php echo $f_cont; ?>">
                              <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                              <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">
                              <button type="submit" class="btn btn-light btn-sm btn-block px-0"><i class="fas fa-sort-amount-down-alt"></i> Comp </button>
                            </form>
                          </th>
                          <th class="px-0">
                            <form action="#" method="POST">
                              <input type="hidden" name="ord" value="tipo">
                              <input type="hidden" name="f_cont" value="<?php echo $f_cont; ?>">
                              <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                              <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">
                              <button type="submit" class="btn btn-light btn-sm btn-block px-0"><i class="fas fa-sort-amount-down-alt"></i> Tipo </button>
                            </form>
                          </th>
                          <th class="px-1">
                            <button type="submit" class="btn btn-light btn-sm btn-block px-0 disabled"> Classificação </button>
                          </th>
                          <th class="px-0">
                            <form action="#" method="POST">
                              <input type="hidden" name="ord" value="valor">
                              <input type="hidden" name="f_cont" value="<?php echo $f_cont; ?>">
                              <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                              <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">
                              <button type="submit" class="btn btn-light btn-sm btn-block px-0"><i class="fas fa-sort-amount-down-alt"></i> Valor </button>
                            </form>
                          </th>
                          <th class="px-1">
                            <button type="submit" class="btn btn-light btn-sm btn-block px-0 disabled"> Descrição </button>
                          </th>
                          <th class="px-0">
                            <form action="#" method="POST">
                              <input type="hidden" name="ord" value="status">
                              <input type="hidden" name="f_cont" value="<?php echo $f_cont; ?>">
                              <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                              <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">
                              <button type="submit" class="btn btn-light btn-sm btn-block px-0"><i class="fas fa-sort-amount-down-alt"></i> Status </button>
                            </form>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
<?php 
$show = $pdo->prepare("SELECT custos.*,
cads_tipo_despe.despesa, cads_tipo_despe.class_contab AS clas_cont_despesa,
cads_tipo_servi.servico, cads_tipo_servi.class_contab AS clas_cont_servico,
cads_tipo_taxa.taxa, cads_tipo_taxa.class_contab AS clas_cont_taxa,
cads_centro_custo.centro_custo
FROM custos
LEFT JOIN cads_tipo_despe ON cads_tipo_despe.id = custos.custo
LEFT JOIN cads_tipo_servi ON cads_tipo_servi.id = custos.custo
LEFT JOIN cads_tipo_taxa ON cads_tipo_taxa.id = custos.custo
INNER JOIN cads_centro_custo ON cads_centro_custo.id = custos.centro_custo
WHERE custos.contrato = '$f_cont'
AND custos.data_vencimento BETWEEN '$cst_exibir_inicio_usa' AND '$cst_exibir_fim_usa'
ORDER BY $orderby");
$show->execute();
$conta_tipo_custo = $show->rowCount();
if($conta_tipo_custo>0){  
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
$custo_id = $exibe["id"];
$custo_tipo = $exibe["tipo"];
$cst_dt_comp = $exibe["data_competencia"];
$cst_dt_venc = $exibe["data_vencimento"];
$valor = $exibe["valor"];
$info_consumo = $exibe["info_consumo"];
$info_nf = $exibe["nf"];
$descricao = $exibe["descricao"];
$cst_status = $exibe["status"];
$c_cst = $exibe["centro_custo"];
if($custo_tipo==1){
$custo_nome = $exibe["despesa"];
$custo_clas_cont = $exibe["clas_cont_despesa"];
}
if($custo_tipo==2){
$custo_nome = $exibe["servico"];
$custo_clas_cont = $exibe["clas_cont_servico"];
}
if($custo_tipo==3){
$custo_nome = $exibe["taxa"];
$custo_clas_cont = $exibe["clas_cont_taxa"];
}

$sql="SELECT cads_class_contab.* FROM cads_class_contab WHERE cads_class_contab.id = '$custo_clas_cont'";
$show_class = $pdo->prepare("$sql");
$show_class->execute();
$row_class=$show_class->fetch(PDO::FETCH_ASSOC);
$custo_clas_cont = $row_class["categoria"]; 
?>
            <tr>
              <td class="align-middle"><?php echo date('d/m/y', strtotime($cst_dt_venc)); ?></td>
              <td class="align-middle text-center"><?php echo date('m/y', strtotime($cst_dt_comp)); ?></td>
              <td class="align-middle">
<?php if($custo_tipo==1){ ?> <span class="badge badge-warning"> Despesa </span> <?php } ?>
<?php if($custo_tipo==2){ ?> <span class="badge badge-danger"> Serviço </span> <?php } ?>
<?php if($custo_tipo==3){ ?> <span class="badge badge-secondary"> Taxa </span> <?php } ?>
              </td>
              <td class="align-middle">
                <span class="pl-1 badge badge-secondary"><i class="fas fa-tag pr-1"></i> <?php echo $custo_nome; ?></span>
                <span class="pl-1 badge badge-info"><i class="fas fa-tags pr-1"></i> <?php echo $custo_clas_cont; ?></span>
                <span class="pl-1 badge badge-light"><i class="fas fa-funnel-dollar pr-1"></i> <?php echo $c_cst; ?></span>
              </td>
              <td class="align-middle text-right">R$<?php echo number_format($valor,2,",","."); ?></td>
              <td class="align-middle">
<?php if($info_consumo!="" || $info_nf!=""){ ?>
                <button type="button" class="btn btn-light btn-sm px-1 py-0" data-container="body" data-toggle="popover" data-trigger="focus" data-placement="left" data-content="<?php if($info_nf!=""){echo "NF: $info_nf. ";} ?><?php if($info_consumo!=""){echo "Consumo: $info_consumo.";} ?>"><i class="far fa-sticky-note text-info"></i></button>
<?php } ?>
                <?php echo substr($descricao, 0, 50);?>
              </td>
              <td class="align-middle">
<?php if($cst_status==0){ ?> <span class="badge badge-danger"> <i class="far fa-trash-alt"></i> Excluído </span> <?php } ?>
<?php if($cst_status==2){ ?> <span class="badge badge-secondary"> <i class="far fa-circle"></i> Planejado </span> <?php } ?>
<?php if($cst_status==1){ ?> <span class="badge badge-primary"> <i class="far fa-check-circle"></i> Executado </span> <?php } ?>
              </td>
            </tr>
<?php } ?>
            <tr>
              <td colspan="8" class="align-middle">
                <form method="POST" action="rel_gcst_csv.php"  >
                  <button type="submit" name="action" value="cst_gcst_exportar_csv" class="btn btn-outline-primary btn-sm">
                    <i class="fas fa-file-csv text-primary ml-2"></i> Exportar em CSV
                  </button>
                  <input type="hidden" name="ord" value="<?php echo $ord; ?>">
                  <input type="hidden" name="contrato" value="<?php echo $f_cont; ?>">
                  <input type="hidden" name="cst_exibir_tipo" value="0">
                  <input type="hidden" name="cst_exibir_ccusto" value="0">
                  <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                  <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">
                </form>
              </td>
            </tr>            
<?php }else{ ?>
            <tr>
              <td colspan="8" class="text-center">Nenhum custo foi encontrato com os filtros acima.</td>
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
    </div>
<!-- MODAL DE AJUDA -->    
<div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">

      <div class="modal-header">
        <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Relatório de custos</h6>
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
    <script src="../js/bootstrap.bundle.min.js"></script>    
<!--    <script src="../js/loader.js" type="text/javascript"></script>-->
    
<?php if (isset($mensagem)){ ?>
    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 4000); 
    </script>
<?php }?>
<!--    os js abaixo são necessários para o periodo de datas do relatório de custo do contrato-->
   <script src="../js/jquery-ui.js"></script>
    <script>
      $( function() {
        var dateFormat = "dd/mm/yy",
          from = $( "#from" )
            .datepicker({
              defaultDate: "+1w",
              changeMonth: true,
              numberOfMonths: 1,
              selectOtherMonths: true,
              dateFormat: "dd/mm/yy"
            })
            .on( "change", function() {
              to.datepicker( "option", "minDate", getDate( this ) );
            }),

          to = $( "#to" ).datepicker({
            defaultDate: "+1w",
            changeMonth: true,
            numberOfMonths: 1,
            dateFormat: "dd/mm/yy"
          })
          .on( "change", function() {
            from.datepicker( "option", "maxDate", getDate( this ) );
          });

        function getDate( element ) {
          var date;
          try {
            date = $.datepicker.parseDate( dateFormat, element.value );

          } catch( error ) {
            date = null;
          }

          return date;
        }
      } );
    </script>
    <script>
      $(document).ready(function(){
        $('[data-toggle="popover"]').popover();
      });
    </script>
    <script>      
      $('.popover-dismiss').popover({
        trigger: 'focus'
      })
    </script>       
  </body>
</html>