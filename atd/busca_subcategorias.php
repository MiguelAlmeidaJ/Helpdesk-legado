<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
header('Content-Type: application/json; charset=utf-8');

$categoria = filter_input(INPUT_GET, "categoria", FILTER_SANITIZE_NUMBER_INT)
  ?? filter_input(INPUT_POST, "categoria", FILTER_SANITIZE_NUMBER_INT);
$subcategoria_post = [];

if (!$categoria) {
  echo json_encode($subcategoria_post);
  exit;
}

$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT subcategorias.scat_id, subcategorias.scat_nome FROM subcategorias WHERE subcategorias.scat_cat = :categoria AND subcategorias.scat_sts = '1' ORDER BY subcategorias.scat_nome ASC");
$show->execute([':categoria' => $categoria]);
$conta_subcategorias = $show->rowCount();
if($conta_subcategorias>0){  
while($row=$show->fetch(PDO::FETCH_ASSOC)){
  $subcategoria_post[] = array(
    'id' => $row["scat_id"],
    'nome' => $row["scat_nome"],
  );
}
}else{
  $subcategoria_post[] = array(
  'id' => "0",
  'nome' => "Sem SubCategoria cadastrada",
  );
}
echo(json_encode($subcategoria_post));
