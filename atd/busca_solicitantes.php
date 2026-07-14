<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
header('Content-Type: application/json; charset=utf-8');

$cliente = filter_input(INPUT_GET, "cliente", FILTER_SANITIZE_NUMBER_INT)
  ?? filter_input(INPUT_POST, "cliente", FILTER_SANITIZE_NUMBER_INT);
$solicitantes_post = [];

if (!$cliente) {
  echo json_encode($solicitantes_post);
  exit;
}

$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT pessoas.pessoa_id, pessoas.pessoa_nom FROM pessoas WHERE pessoas.pessoa_clt = :cliente ORDER BY pessoas.pessoa_nom ASC");
$show->execute([':cliente' => $cliente]);
$conta_pessoas = $show->rowCount();
if($conta_pessoas>0){  
while($row=$show->fetch(PDO::FETCH_ASSOC)){
  $solicitantes_post[] = array(
    'id' => $row["pessoa_id"],
    'nome' => $row["pessoa_nom"],
  );
}
}else{
  $solicitantes_post[] = array(
  'id' => "0",
  'nome' => "Sem solicitante cadastrado",
  );
}
echo(json_encode($solicitantes_post));       
