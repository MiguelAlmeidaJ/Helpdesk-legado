<?php

session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");

$contrato_id = filter_input(INPUT_POST, 'contrato', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

if (isset($_POST['ord'])) {$ord = $_POST['ord'];} else {$ord = "vencimento";}
if ($ord == "vencimento") {$orderby = "custos.data_vencimento DESC";}
if ($ord == "competencia") {$orderby = "custos.data_competencia DESC";}
if ($ord == "tipo") {$orderby = "custos.tipo ASC";}
if ($ord == "valor") {$orderby = "custos.valor DESC";}
if ($ord == "status") {$orderby = "custos.status DESC";}

$cst_exibir_ccusto = filter_input(INPUT_POST, 'cst_exibir_ccusto', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
if(empty($cst_exibir_ccusto)){$cst_exibir_ccusto=0; $cst_pesquisar_ccusto=""; $show_card_cst = false; }else{$show_card_cst = true; $cst_pesquisar_ccusto = "AND custos.centro_custo = '$cst_exibir_ccusto'";}

$cst_exibir_tipo = filter_input(INPUT_POST, 'cst_exibir_tipo', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
if(empty($cst_exibir_tipo)){$cst_exibir_tipo="todos"; $show_card_cst = false; }else{$show_card_cst = true;}
if($cst_exibir_tipo=="despesas"){$cst_tipo="1";}
if($cst_exibir_tipo=="servicos"){$cst_tipo="2";}
if($cst_exibir_tipo=="taxas"){$cst_tipo="3";}
if($cst_exibir_tipo=="todos"){$cst_tipo="1,2,3";}


$cst_exibir_inicio_br = filter_input(INPUT_POST, 'cst_exibir_inicio', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
if(empty($cst_exibir_inicio_br)){  
  $cst_exibir_inicio_br = date('d/m/y', strtotime($hoje. ' -91 days'));
  $cst_exibir_inicio_usa = date('Y-m-d', strtotime($hoje. ' -91 days'));
  $show_card_cst = false;
}else{
    $show_card_cst = true; 
    $cst_exibir_inicio_usa = implode('-', array_reverse(explode('/', "$cst_exibir_inicio_br")));
}

$cst_exibir_fim_br = filter_input(INPUT_POST, 'cst_exibir_fim', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
if(empty($cst_exibir_fim_br)){
  $cst_exibir_fim_br = date("d/m/y");
  $cst_exibir_fim_usa = date("Y-m-d");
  $show_card_cst = false; 
}else{
    $show_card_cst = true; 
    $cst_exibir_fim_usa = implode('-', array_reverse(explode('/', "$cst_exibir_fim_br")));
}


header("Content-type: application/csv");   
header("Content-Disposition: attachment; filename=Allterus_Relatorio_custos_contrato_{$contrato_id}.csv");   
header("Pragma: no-cache"); 

  echo "Contrato: $contrato_id;Inicio:$cst_exibir_inicio_br; Fim:$cst_exibir_fim_br;Tipo:$cst_exibir_tipo;";
  echo "\n";

  echo "Vencimento;Competencia;Tipo;Custo;Classificacao;Centro de Custo;Valor;Descricao;Status";
  echo "\n";

$pdo = ConnectionN3();
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
WHERE custos.contrato = '$contrato_id'
AND custos.tipo IN ($cst_tipo)
AND custos.data_vencimento BETWEEN '$cst_exibir_inicio_usa' AND '$cst_exibir_fim_usa'
$cst_pesquisar_ccusto
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

  echo date('d/m/y', strtotime($cst_dt_venc));
  echo ";";
  echo date('m/y', strtotime($cst_dt_comp));
  echo ";";
  if($custo_tipo==1){echo "Despesa";}
  if($custo_tipo==2){echo "Serviço";}
  if($custo_tipo==3){echo "Taxa";}
  echo ";";
  echo $custo_nome;
  echo ";";
  echo $custo_clas_cont;
  echo ";";
  echo $c_cst;
  echo ";";
  echo number_format($valor,2,",",".");
  echo ";";
  echo substr($descricao, 0, 50);
  echo ";";
  if($cst_status==0){echo "Excluído";}
  if($cst_status==2){echo "Planejado";}
  if($cst_status==1){echo "Executado";}
  echo "\n";  
}
}