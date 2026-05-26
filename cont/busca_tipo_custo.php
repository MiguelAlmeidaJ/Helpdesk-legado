<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
$tipo= $_REQUEST["tipo"];
$pdo = ConnectionN3();

if($tipo==1){$sql="SELECT cads_tipo_despe.id, cads_tipo_despe.despesa as custo FROM cads_tipo_despe WHERE cads_tipo_despe.`status` = '1' ORDER BY cads_tipo_despe.despesa ASC";}
if($tipo==2){$sql="SELECT cads_tipo_servi.id, cads_tipo_servi.servico as custo FROM cads_tipo_servi WHERE cads_tipo_servi.`status` = '1' ORDER BY cads_tipo_servi.servico ASC";}
if($tipo==3){$sql="SELECT cads_tipo_taxa.id, cads_tipo_taxa.taxa as custo FROM cads_tipo_taxa WHERE cads_tipo_taxa.`status` = '1' ORDER BY cads_tipo_taxa.taxa ASC";}
$show = $pdo->prepare("$sql");
$show->execute();
$conta_tipo_custo = $show->rowCount();
if($conta_tipo_custo>0){  
while($row=$show->fetch(PDO::FETCH_ASSOC)){
  $tipo_custo_post[] = array(
    'id' => $row["id"],
    'nome' => $row["custo"],
  );
}
}else{
  $tipo_custo_post[] = array(
  'id' => "0",
  'nome' => "Sem tipo de custo cadastrado",
  );
}
echo(json_encode($tipo_custo_post));