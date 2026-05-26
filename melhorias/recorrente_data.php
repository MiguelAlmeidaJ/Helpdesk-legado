<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
$data_recorrenteee = $_REQUEST['abertura_recorrente']; 

$dia_mes = date_format(date_create($data_recorrenteee), 'd');
$dia_semana = date_format(date_create($data_recorrenteee), 'w');
$semana_mes = ceil($dia_mes / 7);



if($semana_mes > "4"){
    $semana_mes = "Ultima";
} 
if($dia_semana == 0){
    $dia = "Domingo";
}elseif($dia_semana == 1){
    $dia = "Segunda";
}elseif($dia_semana == 2){
    $dia = "Terça";
}elseif($dia_semana == 3){
    $dia = "Quarta";
}elseif($dia_semana == 4){
    $dia = "Quinta";
}elseif($dia_semana == 5){
    $dia = "Sexta";
}elseif($dia_semana == 6){
    $dia = "Sábado";
}
$API_post = array('semana_mes' => $semana_mes,'dia_semana' => $dia);

echo json_encode($API_post);
?>
