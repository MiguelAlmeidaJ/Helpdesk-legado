<?php
session_start();
ob_start();

include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");

include_once(__DIR__ . "/lib/tarefa_helpers.php");
include_once(__DIR__ . "/lib/tarefa_permissions.php");
include_once(__DIR__ . "/lib/tarefa_queries.php");
include_once(__DIR__ . "/lib/tarefa_actions.php");
include_once(__DIR__ . "/lib/tarefa_ui_rules.php");
include_once(__DIR__ . "/lib/tarefa_controller.php");
include_once(__DIR__ . "/lib/permission_fallback.php");
n3_tarefa3_apply_module8_fallback();

$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");

$user_id = (int)($user_id ?? ($_SESSION['allterusN3Id'] ?? 0));
$usar_token = $usar_token ?? "true";

//REGRA PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC
$exibe_bt_tarefa_interacao = true;
$exibe_bt_tarefa_aceitar = false;
$exibe_bt_tarefa_devolver = false;
$exibe_bt_tarefa_espera = false;
$exibe_bt_tarefa_finalizar = false;
$exibe_bt_tarefa_retomar = false;

$tarefaAccessDenied = (int)($m8_00 ?? 0) === 0;
if ($tarefaAccessDenied) {
  $_SESSION['mensagem'] = '<i class="fas fa-exclamation-triangle"></i> Voce nao tem permissao para acessar tarefas.';
  $_SESSION['mensagem_cor'] = 'alert-danger';
}

$pdo = ConnectionN3();

$permsTarefa = [
  'm8_00' => $m8_00 ?? 0,
  'm8_01' => $m8_01 ?? 0,
  'm8_02' => $m8_02 ?? 0,
  'm8_03' => $m8_03 ?? 0,
  'm8_04' => $m8_04 ?? 0,
  'm8_05' => $m8_05 ?? 0,
];

if ($tarefaAccessDenied) {
  $requestTarefa = ['action' => null, 'tarefa' => 0];
} else {
$requestTarefa = n3_tarefa3_process_request(
  $pdo,
  $user_id,
  $hoje,
  $agora,
  $permsTarefa,
  $usar_token ?? "true"
);

}
$action = $requestTarefa['action'];
$tarefa = (int)$requestTarefa['tarefa'];
?>
<!doctype html>
<html lang="pt-BR">
<head> 
  <?php include __DIR__ . "/views/partials/head.php"; ?>
</head>
<body class="n3-detail-page n3-tarefa-page">
  <!-- <?php include_once("../all/loading.php"); ?> -->
  <?php include_once("../all/sidebar.php"); ?>

  <?php
  if (empty($tarefa)) {
    include __DIR__ . "/views/tarefa_create.php";
  } else {
    include __DIR__ . "/views/tarefa_detail.php";
  }

  include __DIR__ . "/views/partials/alerts.php";
  ?>

  <?php include_once("../all/update_pass.php"); ?>

  <?php include __DIR__ . "/views/partials/scripts.php"; ?>
  <?php include __DIR__ . "/views/partials/quick_modal.php"; ?>
</body>
</html>