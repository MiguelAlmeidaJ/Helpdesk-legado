<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
$cliente = $_REQUEST["cliente"];
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT pessoas.* FROM pessoas WHERE pessoas.pessoa_clt = '$cliente' ORDER BY pessoas.pessoa_nom ASC");
$show->execute();
$conta_pessoas = $show->rowCount();
if($conta_pessoas>0){  
while($row=$show->fetch(PDO::FETCH_ASSOC)){
  $solicitantes_post[] = array(
    'id' => $row["pessoa_id"],
    'nome' => $row["pessoa_nom"],
  );
}
}else{
  $locais_post[] = array(
  'id' => "0",
  'nome' => "Sem solicitante cadastrado",
  );
}
echo(json_encode($solicitantes_post));       