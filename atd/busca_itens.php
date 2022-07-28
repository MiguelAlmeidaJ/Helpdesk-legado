<?php
include_once("../all/conect.php");
$subcategoria= $_REQUEST["subcategoria"];
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT itens.itens_id, itens.itens_nome FROM itens WHERE itens.itens_scat = '$subcategoria' AND itens.itens_sts = '1' ORDER BY itens.itens_nome ASC");
$show->execute();
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