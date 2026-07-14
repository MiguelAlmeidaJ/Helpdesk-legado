<?php
$projectRoot = dirname(__DIR__, 3);
require_once $projectRoot . "/all/session.php";
n3_session_start();

include_once($projectRoot . "/all/seguranca.php");
include_once($projectRoot . "/all/conect.php");
include_once($projectRoot . "/all/permissoes.php");
$data = date("Y-m-d");

//VERIFICA SE HÃ¡ REQUISICAO PARA SER EXECUTADA
if (isset($_POST['action'])) {
  $action  = $_POST['action'];
  //SE A REQUISIÃ‡ÃƒO FOR PARA ALTERAR SENHA
  if ($action == "alterar_senha") {
    include_once($projectRoot . "/all/update_senha.php");
  }
}

//DEFINE DATAS QUE PODEM SER USADAS PARA OBTER INDICADORES
$dia = new DateTime($data);
$data_d7 =  date('Y-m-d', strtotime($data . ' -7 days'));
?>
