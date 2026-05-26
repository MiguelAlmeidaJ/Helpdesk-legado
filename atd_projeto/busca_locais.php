<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
$cliente = $_REQUEST["cliente"];
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT locais.* FROM locais WHERE locais.local_clt = '$cliente' ORDER BY locais.local_nom ASC");
$show->execute();
$conta_locais = $show->rowCount();
if($conta_locais>0){  
while($row=$show->fetch(PDO::FETCH_ASSOC)){
  $locais_post[] = array(
    'id' => $row["local_id"],
    'nome' => $row["local_nom"],
  );
}
}else{
  $locais_post[] = array(
  'id' => "0",
  'nome' => "Sem local cadastrado",
  );
}
echo(json_encode($locais_post));