<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
header('Content-Type: application/json; charset=utf-8');

$subcategoria = filter_input(INPUT_GET, "subcategoria", FILTER_SANITIZE_NUMBER_INT)
  ?? filter_input(INPUT_POST, "subcategoria", FILTER_SANITIZE_NUMBER_INT);
$itens_post = [];

if (!$subcategoria) {
  echo json_encode($itens_post);
  exit;
}

$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT itens.itens_id, itens.itens_nome FROM itens WHERE itens.itens_scat = :subcategoria AND itens.itens_sts = '1' ORDER BY itens.itens_nome ASC");
$show->execute([':subcategoria' => $subcategoria]);
$conta_itens = $show->rowCount();
if($conta_itens>0){  
while($row=$show->fetch(PDO::FETCH_ASSOC)){
  $itens_post[] = array(
    'id' => $row["itens_id"],
    'nome' => $row["itens_nome"],
  );
}
}else{
  $itens_post[] = array(
  'id' => "0",
  'nome' => "Sem Item cadastrado",
  );
}
echo(json_encode($itens_post));
