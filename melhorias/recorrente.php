<?php
session_start();
include_once("../legacy/bridge/seguranca.php");
include_once("../legacy/bridge/conect.php");
$recorrente = $_REQUEST["recorrente"];

if ($recorrente == 2) {
    $aparece_API = 1;
} else {
    $aparece_API = 2;
}

$API_post = array('aparece' => $aparece_API);

echo json_encode($API_post);
?>