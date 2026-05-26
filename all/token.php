<?php

include_once("../all/permissoes.php");

//VERIFICO SE HÁ TOKEN SETADO PARA A PÁGINA
if (isset($_POST['token'])) {
  $token = $_POST['token'];
  //BUSCA VALOR DO TOKEN
  $pdo = ConnectionN3();
  $show_token = $pdo->prepare("SELECT valor FROM token WHERE token = :token");
  $show_token->bindParam(':token',$token);
  $show_token->execute();
  $exibe=$show_token->fetch(PDO::FETCH_ASSOC);
  $token_valor = $exibe["valor"];
  //SE 0, PERMITE CADASTRAR FORULÁRIO, ALTERA VALOR DO TOKEN E GERA NOVO TOKEN
  if($token_valor==0){
    $usar_token="true";
    $novo_token="true";
    $validade_token="ok";
  }
  //SE 1, IMPEDE CADASTRO DO FORMULÁRIO, MANTÉM VALOR DO TOKEN, NÃO GERA OUTRO TOKEN
  if($token_valor==1){
    $usar_token="false";
    $novo_token="true";
    $validade_token="invalido";
  } 
}else{
$novo_token = "true";
$usar_token="false";
$validade_token="ok";
}
//ALTERAR VALOR DO TOKEN
if($usar_token=="true"){
$pdo = ConnectionN3();
$updat_token = $pdo->prepare("UPDATE `token` SET `valor`= '1' WHERE token = :token");
$updat_token->bindParam(':token',$token);
$updat_token->execute();
}

//GERA NOVO TOKEN  
if($novo_token=="true"){
$pdo = ConnectionN3();
$token = md5(uniqid(""));
$insert_token = $pdo->prepare("INSERT INTO `token` ( `token`, `valor`) VALUES (:token,'0')");
$insert_token->bindParam(':token',$token);
$insert_token->execute();
}


?>