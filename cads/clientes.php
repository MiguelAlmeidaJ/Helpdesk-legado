<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");
$flashMessage = $_SESSION['client_flash'] ?? null;
unset($_SESSION['client_flash']);

if ($m2_01 == 0) {
  header("Location: ../index.php");
  exit;
}

function post_text($field)
{
  $value = filter_input(INPUT_POST, $field, FILTER_UNSAFE_RAW);
  if ($value === null || $value === false) {
    return '';
  }

  return trim(html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

function client_valid_cnpj($cnpj)
{
  $cnpj = preg_replace('/\D+/', '', (string)$cnpj);

  if (strlen($cnpj) !== 14) {
    return false;
  }

  if (preg_match('/^(\d)\1{13}$/', $cnpj)) {
    return false;
  }

  $sum = 0;
  $position = 5;
  for ($i = 0; $i < 12; $i++) {
    $sum += (int)$cnpj[$i] * $position;
    $position--;
    if ($position < 2) {
      $position = 9;
    }
  }
  $digit = ($sum % 11 < 2) ? 0 : 11 - ($sum % 11);
  if ($digit !== (int)$cnpj[12]) {
    return false;
  }

  $sum = 0;
  $position = 6;
  for ($i = 0; $i < 13; $i++) {
    $sum += (int)$cnpj[$i] * $position;
    $position--;
    if ($position < 2) {
      $position = 9;
    }
  }
  $digit = ($sum % 11 < 2) ? 0 : 11 - ($sum % 11);

  return $digit === (int)$cnpj[13];
}

$action = post_text('action');
if ($usar_token == "true") {
  if ($action) {
    $clientActionPermissions = [
      'new_clt' => [(int)$m2_01, 2],
      'edt_clt' => [(int)$m2_01, 3],
      'new_pessoa' => [(int)$m2_02, 2],
      'edt_pessoa' => [(int)$m2_02, 3],
      'new_local' => [(int)$m2_03, 3],
      'edt_local' => [(int)$m2_03, 3],
    ];

    if (isset($clientActionPermissions[$action]) && $clientActionPermissions[$action][0] < $clientActionPermissions[$action][1]) {
      $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Você não tem permissão para executar esta ação.";
      $mensagem_cor = "alert-danger";
      $log = "false";
      $action = '';
    }

    if ($action == "alterar_senha") {
      include_once("../all/update_senha.php");
    }

    if ($action == "new_clt") {
      $clt_nomer = post_text('clt_nomer');
      $clt_nomef = post_text('clt_nomef');
      $clt_cnpj = post_text('clt_cnpj');
      $clt_end = post_text('clt_end');
      $clt_city = post_text('clt_city');
      $clt_uf = post_text('clt_uf');
      $clt_mail = post_text('clt_mail');
      $clt_tel = post_text('clt_tel');
      $clt_ti = filter_input(INPUT_POST, 'clt_ti', FILTER_SANITIZE_NUMBER_INT);
      $clt_adm = filter_input(INPUT_POST, 'clt_adm', FILTER_SANITIZE_NUMBER_INT);
      $clt_mkt = filter_input(INPUT_POST, 'clt_mkt', FILTER_SANITIZE_NUMBER_INT);

      if (!client_valid_cnpj($clt_cnpj)) {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Informe um CNPJ válido para cadastrar o cliente.";
        $mensagem_cor = "alert-danger";
        $log = "false";
      } else {
        $pdo = ConnectionN3();
        $adc = $pdo->prepare("INSERT INTO `clientes` (`clt_nomer`, `clt_nomef`, `clt_cnpj`, `clt_end`, `clt_city`, `clt_uf`, `clt_mail`, `clt_tel`, `clt_ti`, `clt_adm`, `clt_mkt`) VALUES (:clt_nomer, :clt_nomef, :clt_cnpj, :clt_end, :clt_city, :clt_uf, :clt_mail, :clt_tel, :clt_ti, :clt_adm, :clt_mkt);");
        $adc->bindParam(':clt_nomer', $clt_nomer);
        $adc->bindParam(':clt_nomef', $clt_nomef);
        $adc->bindParam(':clt_cnpj', $clt_cnpj);
        $adc->bindParam(':clt_end', $clt_end);
        $adc->bindParam(':clt_city', $clt_city);
        $adc->bindParam(':clt_uf', $clt_uf);
        $adc->bindParam(':clt_mail', $clt_mail);
        $adc->bindParam(':clt_tel', $clt_tel);
        $adc->bindParam(':clt_ti', $clt_ti);
        $adc->bindParam(':clt_adm', $clt_adm);
        $adc->bindParam(':clt_mkt', $clt_mkt);
        if ($adc->execute()) {
          $mensagem = "<i class=\"fas fa-check\"></i> Cliente Cadastrado com sucesso!";
          $mensagem_cor = "alert-success";
          $log = "true";
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar cliente!";
          $mensagem_cor = "alert-danger";
          $log = "false";
        }
      }
    }

    if ($action == "edt_clt") {
      $clt_id = filter_input(INPUT_POST, 'clt_id', FILTER_SANITIZE_NUMBER_INT);
      $clt_nomer = post_text('clt_nomer');
      $clt_nomef = post_text('clt_nomef');
      $clt_cnpj = post_text('clt_cnpj');
      $clt_end = post_text('clt_end');
      $clt_city = post_text('clt_city');
      $clt_uf = post_text('clt_uf');
      $clt_mail = post_text('clt_mail');
      $clt_tel = post_text('clt_tel');
      $clt_ti = filter_input(INPUT_POST, 'clt_ti', FILTER_SANITIZE_NUMBER_INT);
      $clt_adm = filter_input(INPUT_POST, 'clt_adm', FILTER_SANITIZE_NUMBER_INT);
      $clt_mkt = filter_input(INPUT_POST, 'clt_mkt', FILTER_SANITIZE_NUMBER_INT);
      $clt_sts = filter_input(INPUT_POST, 'clt_sts', FILTER_SANITIZE_NUMBER_INT);

      if (!client_valid_cnpj($clt_cnpj)) {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Informe um CNPJ válido para alterar o cliente.";
        $mensagem_cor = "alert-danger";
        $log = "false";
      } else {
        $pdo = ConnectionN3();
        $edt = $pdo->prepare("UPDATE `clientes` SET `clt_nomer`=:clt_nomer, `clt_nomef`=:clt_nomef, `clt_cnpj`=:clt_cnpj, `clt_end`=:clt_end, `clt_city`=:clt_city, `clt_uf`=:clt_uf, `clt_mail`=:clt_mail, `clt_tel`=:clt_tel, `clt_sts`=:clt_sts, `clt_ti`=:clt_ti, `clt_adm`=:clt_adm, `clt_mkt`=:clt_mkt WHERE  `clt_id`=:clt_id;");
        $edt->bindParam(':clt_nomer', $clt_nomer);
        $edt->bindParam(':clt_nomef', $clt_nomef);
        $edt->bindParam(':clt_cnpj', $clt_cnpj);
        $edt->bindParam(':clt_end', $clt_end);
        $edt->bindParam(':clt_city', $clt_city);
        $edt->bindParam(':clt_uf', $clt_uf);
        $edt->bindParam(':clt_mail', $clt_mail);
        $edt->bindParam(':clt_tel', $clt_tel);
        $edt->bindParam(':clt_sts', $clt_sts);
        $edt->bindParam(':clt_ti', $clt_ti);
        $edt->bindParam(':clt_adm', $clt_adm);
        $edt->bindParam(':clt_mkt', $clt_mkt);
        $edt->bindParam(':clt_id', $clt_id);
        if ($edt->execute()) {
          $mensagem = "<i class=\"fas fa-check\"></i> Cliente editado com sucesso!";
          $mensagem_cor = "alert-success";
          $log = "true";
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar Cliente!";
          $mensagem_cor = "alert-danger";
          $log = "false";
        }
      }
    }

    if ($action == "new_pessoa") {
      $pessoa_nom = post_text('pessoa_nom');
      $pessoa_cargo = post_text('pessoa_cargo');
      $pessoa_tel = post_text('pessoa_tel');
      $pessoa_mail = post_text('pessoa_mail');
      $pessoa_clt = filter_input(INPUT_POST, 'pessoa_clt', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $adc = $pdo->prepare("INSERT INTO `pessoas` (`pessoa_clt`,`pessoa_nom`,`pessoa_cargo`,`pessoa_tel`,`pessoa_mail`) VALUES (:pessoa_clt, :pessoa_nom, :pessoa_cargo, :pessoa_tel, :pessoa_mail);");
      $adc->bindParam(':pessoa_clt', $pessoa_clt);
      $adc->bindParam(':pessoa_nom', $pessoa_nom);
      $adc->bindParam(':pessoa_cargo', $pessoa_cargo);
      $adc->bindParam(':pessoa_tel', $pessoa_tel);
      $adc->bindParam(':pessoa_mail', $pessoa_mail);
      if ($adc->execute()) {
        $mensagem = "<i class=\"fas fa-check\"></i> Pessoa de Contato cadastrada com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      } else {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar Pessoa de contato!";
        $mensagem_cor = "alert-danger";
        $log = "false";
      }
    }

    if ($action == "edt_pessoa") {
      $pessoa_nom = post_text('pessoa_nom');
      $pessoa_cargo = post_text('pessoa_cargo');
      $pessoa_tel = post_text('pessoa_tel');
      $pessoa_mail = post_text('pessoa_mail');
      $pessoa_sts = filter_input(INPUT_POST, 'pessoa_sts', FILTER_SANITIZE_NUMBER_INT);
      $pessoa_id = filter_input(INPUT_POST, 'pessoa_id', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $edt = $pdo->prepare("UPDATE `pessoas` SET `pessoa_nom`=:pessoa_nom,  `pessoa_cargo`=:pessoa_cargo, `pessoa_tel`=:pessoa_tel, `pessoa_mail`=:pessoa_mail, `pessoa_sts`=:pessoa_sts WHERE  `pessoa_id`=:pessoa_id;");
      $edt->bindParam(':pessoa_nom', $pessoa_nom);
      $edt->bindParam(':pessoa_cargo', $pessoa_cargo);
      $edt->bindParam(':pessoa_tel', $pessoa_tel);
      $edt->bindParam(':pessoa_mail', $pessoa_mail);
      $edt->bindParam(':pessoa_sts', $pessoa_sts);
      $edt->bindParam(':pessoa_id', $pessoa_id);

      if ($edt->execute()) {
        $mensagem = "<i class=\"fas fa-check\"></i> Pessoa de Contato editada com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      } else {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar Pessoa de contato!";
        $mensagem_cor = "alert-danger";
        $log = "false";
      }
    }

    if ($action == "new_local") {
      $local_clt = filter_input(INPUT_POST, 'local_clt', FILTER_SANITIZE_NUMBER_INT);
      $local_nom = post_text('local_nom');
      $local_end = post_text('local_end');
      $local_city = post_text('local_city');
      $local_uf = post_text('local_uf');

      $pdo = ConnectionN3();
      $adc_user = $pdo->prepare("INSERT INTO `locais` (`local_clt`, `local_nom`, `local_end`, `local_city`, `local_uf`, `local_sts`) VALUES (:local_clt, :local_nom, :local_end, :local_city, :local_uf, '1');");
      $adc_user->bindParam(':local_clt', $local_clt);
      $adc_user->bindParam(':local_nom', $local_nom);
      $adc_user->bindParam(':local_end', $local_end);
      $adc_user->bindParam(':local_city', $local_city);
      $adc_user->bindParam(':local_uf', $local_uf);
      if ($adc_user->execute()) {
        $mensagem = "<i class=\"fas fa-check\"></i> Local de atendimento cadastrado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      } else {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar Local de atendimento!";
        $mensagem_cor = "alert-danger";
        $log = "false";
      }
    }

    if ($action == "edt_local") {
      $local_nom = post_text('local_nom');
      $local_end = post_text('local_end');
      $local_city = post_text('local_city');
      $local_uf = post_text('local_uf');
      $local_sts = filter_input(INPUT_POST, 'local_sts', FILTER_SANITIZE_NUMBER_INT);
      $local_id = filter_input(INPUT_POST, 'local_id', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $edt = $pdo->prepare("UPDATE `locais` SET `local_nom`=:local_nom, `local_end`=:local_end, `local_city`=:local_city, `local_uf`=:local_uf, `local_sts`=:local_sts WHERE `local_id`=:local_id;");
      $edt->bindParam(':local_nom', $local_nom);
      $edt->bindParam(':local_end', $local_end);
      $edt->bindParam(':local_city', $local_city);
      $edt->bindParam(':local_uf', $local_uf);
      $edt->bindParam(':local_sts', $local_sts);
      $edt->bindParam(':local_id', $local_id);

      if ($edt->execute()) {
        $mensagem = "<i class=\"fas fa-check\"></i> Local de atendimento editado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      } else {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao ceditar Local de atendimento!";
        $mensagem_cor = "alert-danger";
        $log = "false";
      }
    }
  }

  if (isset($mensagem) && isset($mensagem_cor)) {
    $_SESSION['client_flash'] = [
      'message' => $mensagem,
      'class' => $mensagem_cor
    ];
  }

  header("Location: " . $_SERVER['REQUEST_URI'], true, 303);
  exit;
}
?>
<!doctype html>
<html lang="pt-BR">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link rel="icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../css/bootstrap.min.css">
  <link rel="stylesheet" href="../fontawesome/css/all.css">
  <link rel="stylesheet" href="../css/help.css">
  <script type="text/javascript" src="../js/valida_cnpj.js"></script>
  <title>Allterus</title>
</head>
<style>
  html {
    min-height: 100%;
  }

  body.client-dashboard {
    zoom: 1;
    min-height: 100dvh;
    width: 100%;
    overflow-x: hidden;
    background: #f6f8fb;
    color: #0f172a;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }

  body.client-dashboard,
  body.client-dashboard input,
  body.client-dashboard button,
  body.client-dashboard select,
  body.client-dashboard textarea,
  body.client-dashboard .modal,
  body.client-dashboard .card,
  body.client-dashboard .table {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }

  .client-page {
    min-height: 100dvh;
    padding: 14px 18px 18px;
  }

  .client-page-card {
    min-height: calc(100dvh - 32px);
    border: 1px solid #dbe3ef;
    border-radius: 8px;
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .client-page-card .card-header {
    flex: 0 0 auto;
    background: #fff;
    border-bottom: 1px solid #d9e0ea;
  }

  .client-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px;
  }

  .client-title-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .client-title-icon {
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #edf5ff;
    color: #0d6efd;
    flex: 0 0 38px;
  }

  .client-page-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.25;
    color: #111827;
  }

  .client-page-subtitle {
    margin: 2px 0 0;
    color: #64748b;
    font-size: .82rem;
    line-height: 1.3;
  }

  .client-add-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-color: #0d6efd;
    color: #0b5ed7 !important;
    font-weight: 600;
    border-radius: 6px;
    padding: 6px 12px;
    white-space: nowrap;
  }

  .client-add-button:hover {
    background: #0d6efd;
    color: #fff !important;
  }

  .client-page-card .card-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    background: #fbfdff;
  }

  .table-container {
    height: 100%;
    max-height: calc(100dvh - 126px);
    overflow: auto;
    display: block;
    border: 0;
  }

  .client-table {
    width: 100%;
    min-width: 980px;
    margin-bottom: 0;
    border-collapse: collapse;
  }

  .client-table thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #f8fafc;
    border-bottom: 1px solid #d9e0ea;
    color: #475569;
    font-size: .76rem;
    font-weight: 600;
    text-transform: uppercase;
    padding: 11px 16px;
    white-space: nowrap;
  }

  .client-table tbody tr {
    background: #fff;
    transition: background-color .16s ease;
  }

  .client-table tbody tr:hover {
    background: #f8fbff;
  }

  .client-table tbody td {
    border-top: 0;
    border-bottom: 1px solid #edf1f6;
    padding: 12px 16px;
    vertical-align: middle;
  }

  .client-status-badge,
  .client-service-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: .8rem;
    font-weight: 600;
    line-height: 1;
    border: 1px solid transparent;
    white-space: nowrap;
  }

  .client-status-badge.is-active {
    background: #ecfdf3;
    color: #067647;
    border-color: #b7ebc6;
  }

  .client-status-badge.is-inactive {
    background: #f8fafc;
    color: #667085;
    border-color: #d8dee8;
  }

  .client-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: currentColor;
    box-shadow: 0 0 0 3px rgba(6, 118, 71, .12);
  }

  .is-inactive .client-status-dot {
    box-shadow: 0 0 0 3px rgba(102, 112, 133, .12);
  }

  .client-service-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .client-service-badge {
    background: #f1f5f9;
    color: #334155;
    border-color: #e2e8f0;
  }

  .client-service-badge.service-ti {
    color: #067647;
    background: #ecfdf3;
    border-color: #b7ebc6;
  }

  .client-service-badge.service-devops {
    color: #0b5ed7;
    background: #eef6ff;
    border-color: #bfdbfe;
  }

  .client-service-badge.service-mkt {
    color: #b42318;
    background: #fff7f7;
    border-color: #ffd0d0;
  }

  .client-name-main {
    color: #111827;
    font-weight: 650;
    line-height: 1.25;
  }

  .client-name-sub {
    margin-top: 2px;
    color: #64748b;
    font-size: .78rem;
  }

  .client-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    white-space: nowrap;
  }

  .client-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-width: 96px;
    border-radius: 6px;
    font-weight: 600;
    padding: 5px 10px;
    border-color: #cbd5e1;
    color: #334155;
    background: #fff;
  }

  .client-action-btn:hover {
    border-color: #0d6efd;
    color: #0b5ed7;
    background: #eef6ff;
  }

  .client-modal .modal-content {
    border: 0;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(15, 23, 42, .24);
    max-height: calc(100dvh - 56px);
    display: flex;
    flex-direction: column;
  }

  .modal-open {
    overflow: hidden !important;
    height: 100vh;
  }

  .client-modal {
    overflow: hidden !important;
  }

  .client-modal .modal-dialog {
    max-height: calc(100dvh - 56px);
    margin-top: 28px;
    margin-bottom: 28px;
    display: flex;
    align-items: flex-start;
  }

  .client-modal .modal-header {
    flex: 0 0 auto;
    align-items: flex-start;
    background: #fff;
    color: #111827;
    border-bottom: 1px solid #e2e8f0;
    padding: 18px 20px;
  }

  .client-modal-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .client-modal-icon {
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #edf5ff;
    color: #0d6efd;
    flex: 0 0 38px;
  }

  .client-modal-title h6 {
    margin: 0;
    color: #111827;
    font-size: 1rem;
    font-weight: 700;
  }

  .client-modal-title p {
    margin: 2px 0 0;
    color: #64748b;
    font-size: .82rem;
  }

  .client-modal .modal-body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 18px 20px 4px;
    background: #f8fafc;
    max-height: calc(100dvh - 190px);
    overflow-y: auto;
    overflow-x: hidden;
  }

  .client-modal .modal-footer {
    flex: 0 0 auto;
    background: #fff;
    border-top: 1px solid #e2e8f0;
    padding: 12px 20px;
  }

  .client-modal .card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: none;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .client-modal .card-header {
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    color: #111827;
    font-size: .9rem;
    font-weight: 700;
  }

  .client-modal .card-body {
    background: #fff;
  }

  .client-modal .table {
    margin-bottom: 0;
  }

  .client-modal .table thead th {
    background: #f8fafc;
    color: #475569;
    font-size: .76rem;
    font-weight: 600;
    text-transform: uppercase;
    border-bottom: 1px solid #d9e0ea;
  }

  .client-modal .table td {
    vertical-align: middle;
    border-top: 0;
    border-bottom: 1px solid #edf1f6;
  }

  .client-modal .form-group.row,
  .client-form-section {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin: 0 0 12px;
    padding: 12px 8px 2px;
  }

  .client-modal label {
    color: #475569;
    font-size: .78rem;
    font-weight: 650;
  }

  .client-modal .input-group-text {
    min-width: 34px;
    justify-content: center;
    background: #f8fafc;
    color: #64748b;
    border-color: #d8e0eb;
  }

  .client-modal .form-control,
  .client-modal .custom-select {
    border-color: #d8e0eb;
    color: #111827;
  }

  .client-modal .form-control.is-invalid {
    border-color: #dc3545;
    box-shadow: 0 0 0 0.12rem rgba(220, 53, 69, .12);
  }

  .client-field-error {
    display: none;
    margin-top: 6px;
    color: #b42318;
    font-size: .78rem;
    font-weight: 600;
  }

  .client-field-error.is-visible {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .client-flash {
    position: fixed;
    top: 18px;
    right: 18px;
    z-index: 1085;
    min-width: 280px;
    max-width: min(460px, calc(100vw - 36px));
    border-radius: 8px;
    box-shadow: 0 16px 34px rgba(15, 23, 42, .18);
    border: 1px solid rgba(15, 23, 42, .08);
  }

  .client-flash.fade-out {
    opacity: 0;
    transform: translateY(-8px);
    transition: opacity .22s ease, transform .22s ease;
  }

  @media (max-width: 1024px) {
    .client-page {
      padding: 10px 8px 12px;
    }

    .client-page-card {
      min-height: calc(100dvh - 22px);
    }
  }

  @media (max-width: 767.98px) {
    .client-card-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .client-add-button {
      width: 100%;
      justify-content: center;
    }

    .modal-dialog.modal-lg,
    .modal-dialog.modal-xl {
      max-width: calc(100% - 16px);
      max-height: calc(100dvh - 16px);
      margin: 8px auto;
    }
  }
</style>

<body class="client-dashboard">
  <?php include_once("../all/loading.php"); ?>
  <?php include_once("../all/sidebar.php"); ?>
  <div class="container-fluid client-page">
    <div class="row">
      <div class="col-md-12">
        <div class="card client-page-card">
          <div class="card-header p-0">
            <div class="client-card-header">
              <div class="client-title-wrap">
                <span class="client-title-icon"><i class="fas fa-user-tie"></i></span>
                <div>
                  <h1 class="client-page-title">Clientes cadastrados</h1>
                  <p class="client-page-subtitle">Gerencie empresas, serviços, contatos e locais de atendimento.</p>
                </div>
              </div>
              <?php if ($m2_01 > 1) { ?>
                <button type="button" class="btn btn-outline-primary btn-sm client-add-button" data-toggle="modal" data-target="#new_user">
                  <i class="fas fa-user-plus"></i> Adicionar Cliente
                </button>
              <?php } ?>
            </div>
          </div>

          <?php if (isset($flashMessage['message']) && isset($flashMessage['class'])) { ?>
            <div class="alert <?php echo htmlspecialchars($flashMessage['class'], ENT_QUOTES, 'UTF-8'); ?> client-flash mb-0 py-2 px-3 pr-5" id="clientFlashMessage" role="alert">
              <?php echo $flashMessage['message']; ?>
              <button type="button" class="close" aria-label="Fechar" data-dismiss="alert">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          <?php } ?>

          <div class="card-body p-0">
            <div class="table-container">
              <table class="table table-hover table-sm client-table">
                <thead>
                  <tr>
                    <th>Situação</th>
                    <th>#ID</th>
                    <th>Razão Social</th>
                    <th>Nome Comercial</th>
                    <th>Serviços</th>
                    <th>Endereço</th>
                    <th>Telefone</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <?php
                  $pdo = ConnectionN3();

                  $filterEmpresas = null;

                  if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                    $filterEmpresas .= " clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
                  }

                  $sql = "SELECT clientes.* FROM clientes ";

                  if ($filterEmpresas) {
                    $sql .= "WHERE " . $filterEmpresas;
                  }

                  $sql .= "ORDER BY clientes.clt_nomer ASC";
                  $show_eqp = $pdo->prepare($sql);

                  $show_eqp->execute();
                  while ($row = $show_eqp->fetch(PDO::FETCH_ASSOC)) {
                    $clt_id = $row["clt_id"];
                    $clt_nomer = $row["clt_nomer"];
                    $clt_nomef = $row["clt_nomef"];
                    $clt_city = $row["clt_city"];
                    $clt_uf = $row["clt_uf"];
                    $clt_tel = $row["clt_tel"];
                    $clt_sts = $row["clt_sts"];
                    $clt_ti = $row["clt_ti"];
                    $clt_adm = $row["clt_adm"];
                    $clt_mkt = $row["clt_mkt"];
                  ?>
                    <tr class="<?php echo $clt_sts == 1 ? '' : 'text-muted'; ?>">
                      <td>
                        <?php if ($clt_sts == 1) { ?>
                          <span class="client-status-badge is-active"><span class="client-status-dot"></span> Ativo</span>
                        <?php } else { ?>
                          <span class="client-status-badge is-inactive"><span class="client-status-dot"></span> Inativo</span>
                        <?php } ?>
                      </td>
                      <td>
                        #<?php echo str_pad($clt_id, 4, '0', STR_PAD_LEFT); ?>
                      </td>
                      <td>
                        <div class="client-name-main"><?php echo htmlspecialchars(substr($clt_nomer, 0, 45), ENT_QUOTES, 'UTF-8'); ?></div>
                      </td>
                      <td>
                        <div class="client-name-sub"><?php echo htmlspecialchars($clt_nomef, ENT_QUOTES, 'UTF-8'); ?></div>
                      </td>
                      <td>
                        <div class="client-service-list">
                          <?php if ($clt_ti == 1) { ?><span class="client-service-badge service-ti"><i class="fas fa-microchip"></i> TI</span><?php } ?>
                          <?php if ($clt_adm == 1) { ?><span class="client-service-badge service-devops"><i class="fas fa-chart-bar"></i> DevOps</span><?php } ?>
                          <?php if ($clt_mkt == 1) { ?><span class="client-service-badge service-mkt"><i class="fas fa-bullhorn"></i> MKT</span><?php } ?>
                          <?php if ($clt_ti != 1 && $clt_adm != 1 && $clt_mkt != 1) { ?><span class="client-service-badge">Sem serviço</span><?php } ?>
                        </div>
                      </td>
                      <td>
                        <?php echo htmlspecialchars($clt_city, ENT_QUOTES, 'UTF-8'); ?> - <?php echo htmlspecialchars($clt_uf, ENT_QUOTES, 'UTF-8'); ?>
                      </td>
                      <td>
                        <?php echo htmlspecialchars($clt_tel, ENT_QUOTES, 'UTF-8'); ?>
                      </td>
                      <td>
                        <div class="client-actions">
                          <button type="button" class="btn btn-sm client-action-btn view_clt" id="<?php echo $row['clt_id']; ?>"><i class="far fa-edit"></i> Editar</button>
                          <button type="button" class="btn btn-sm client-action-btn view_contato" id="<?php echo $row['clt_id']; ?>"><i class="fas fa-user-tag"></i> Contatos</button>
                          <button type="button" class="btn btn-sm client-action-btn view_local" id="<?php echo $row['clt_id']; ?>"><i class="fas fa-map-marked-alt"></i> Locais</button>
                        </div>
                      </td>
                    </tr>
                  <?php } ?>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- -->
  <div class="modal fade client-modal" id="new_user" tabindex="-1" role="dialog" aria-labelledby="new_client_title" aria-hidden="true">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <form action="#" method="POST">
          <div class="modal-header">
            <div class="client-modal-title">
              <span class="client-modal-icon"><i class="fas fa-user-plus"></i></span>
              <div>
                <h6 class="modal-title" id="new_client_title">Cadastro de cliente</h6>
                <p>Preencha os dados comerciais, endereço e serviços vinculados ao cliente.</p>
              </div>
            </div>
            <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-12">

                <div class="form-group row my-1">
                  <label class="col-2 col-form-label text-right px-0">Razão Social:</label>
                  <div class="col-10">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="far fa-user"></i></div>
                      </div>
                      <input name="clt_nomer" placeholder="Razão Social" type="text" class="form-control" required="required">
                    </div>
                  </div>
                </div>

                <div class="form-group row my-1">
                  <label class="col-2 col-form-label text-right px-0">Nome Comercial:</label>
                  <div class="col-10">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="far fa-user"></i></div>
                      </div>
                      <input name="clt_nomef" placeholder="Nome Comercial" type="text" class="form-control" required="required">
                    </div>
                  </div>
                </div>

                <div class="form-group row my-1">
                  <label class="col-2 col-form-label text-right px-0">CNPJ:</label>
                  <div class="col-10">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-paste"></i></div>
                      </div>
                      <input type="text" name="clt_cnpj" id="cnpj" onkeyup="FormataCnpj(this,event)" maxlength="18" class="form-control" ng-model="cadastro.cnpj">
                    </div>
                    <div class="client-field-error" data-cnpj-error><i class="fas fa-exclamation-circle"></i> O CNPJ informado é inválido.</div>
                  </div>
                </div>

                <div class="form-group row my-1">
                  <label class="col-2 col-form-label text-right px-0">Endereço:</label>
                  <div class="col-10">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-route"></i></div>
                      </div>
                      <input name="clt_end" type="text" placeholder="Rua, Nºmero, Bairro" class="form-control">
                    </div>
                  </div>
                </div>

                <div class="form-group row my-1">
                  <label class="col-2 col-form-label text-right px-0">Cidade:</label>
                  <div class="col-10">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-map-marked-alt"></i></div>
                      </div>
                      <input name="clt_city" type="text" placeholder="Município" class="form-control" required="required">
                    </div>
                  </div>
                </div>

                <div class="form-group row my-1">
                  <label class="col-2 col-form-label text-right px-0">Estado:</label>
                  <div class="col-10">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-globe-americas"></i></div>
                      </div>
                      <select name="clt_uf" required="required" class="form-control">
                        <option></option>
                        <option value="AC">Acre</option>
                        <option value="AL">Alagoas</option>
                        <option value="AP">Amapá</option>
                        <option value="AM">Amazonas</option>
                        <option value="BA">Bahia</option>
                        <option value="CE">Ceará</option>
                        <option value="DF">Distrito Federal</option>
                        <option value="ES">Espírito Santo</option>
                        <option value="GO">Goiás</option>
                        <option value="MA">Maranháo</option>
                        <option value="MT">Mato Grosso</option>
                        <option value="MS">Mato Grosso do Sul</option>
                        <option value="MG">Minas Gerais</option>
                        <option value="PA">Pará</option>
                        <option value="PB">Paraíba</option>
                        <option value="PR">Paraná</option>
                        <option value="PE">Pernambuco</option>
                        <option value="PI">Piauí</option>
                        <option value="RJ">Rio de Janeiro</option>
                        <option value="RN">Rio Grande do Norte</option>
                        <option value="RS">Rio Grande do Sul</option>
                        <option value="RO">Rondônia</option>
                        <option value="RR">Roraima</option>
                        <option value="SC">Santa Catarina</option>
                        <option value="SP">São Paulo</option>
                        <option value="SE">Sergipe</option>
                        <option value="TO">Tocantins</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div class="form-group row my-1">
                  <label class="col-2 col-form-label text-right px-0">E-mail:</label>
                  <div class="col-10">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-at"></i></div>
                      </div>
                      <input name="clt_mail" type="email" class="form-control">
                    </div>
                  </div>
                </div>

                <div class="form-group row my-1">
                  <label class="col-2 col-form-label text-right px-0">Telefone:</label>
                  <div class="col-10">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-mobile-alt"></i></div>
                      </div>
                      <input name="clt_tel" placeholder="(00)00000-0000" type="text" required="required" class="form-control">
                    </div>
                  </div>
                </div>

                <div class="form-group row my-1">
                  <label class="col-2 col-form-label text-right px-0">TI:</label>
                  <div class="col-2">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-microchip"></i></div>
                      </div>
                      <select name="clt_ti" required="required" class="form-control">
                        <option></option>
                        <option value="1">Sim</option>
                        <option value="0">Não</option>
                      </select>
                    </div>
                  </div>
                  <label class="col-2 col-form-label text-right px-0">DEVOPS:</label>
                  <div class="col-2">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-chart-bar"></i></div>
                      </div>
                      <select name="clt_adm" required="required" class="form-control">
                        <option></option>
                        <option value="1">Sim</option>
                        <option value="0">Não</option>
                      </select>
                    </div>
                  </div>
                  <label class="col-2 col-form-label text-right px-0">MKT:</label>
                  <div class="col-2">
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-bullhorn"></i></div>
                      </div>
                      <select name="clt_mkt" required="required" class="form-control">
                        <option></option>
                        <option value="1">Sim</option>
                        <option value="0">Não</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
          <div class="modal-footer">
            <input type="hidden" name="action" value="new_clt">
            <input type="hidden" name="token" value="<?php echo $token; ?>">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar novo cliente</button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <!-- -->

  <?php include_once("../all/update_pass.php"); ?>
  <script src="../js/jquery-3.6.0.min.js"></script>
  <script src="../js/bootstrap.min.js"></script>
  <!--    <script src="../js/bootstrap.bundle.min.js"></script>    -->
  <!-- MODAL DE EDIÇÃO DE CLIENTE -->
  <div class="modal fade client-modal" id="modalEdtClt" tabindex="-1" role="dialog" aria-labelledby="modalEdtCltLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <?php if ($m2_01 == 3) { ?>
          <form method="POST" action="#">
          <?php } ?>
          <div class="modal-header">
            <div class="client-modal-title">
              <span class="client-modal-icon"><i class="fas fa-user-edit"></i></span>
              <div>
                <h6 class="modal-title" id="modalEdtCltLabel">Edição de cliente</h6>
                <p>Atualize dados comerciais, serviços e situação do cliente.</p>
              </div>
            </div>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <span id="info_edt_clt"></span>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
            <input type="hidden" name="action" value="edt_clt">
            <input type="hidden" name="token" value="<?php echo $token; ?>">
            <?php if ($m2_01 == 3) { ?>
              <button type="submit" class="btn btn-primary">Salvar alterações</button>
            <?php } ?>
          </div>
          <?php if ($m2_01 == 3) { ?>
          </form>
        <?php } ?>
      </div>
    </div>
  </div>
  <script>
    $(document).ready(function() {
      $(document).on('click', '.view_clt', function() {
        var id = $(this).attr("id");
        if (id !== '') {
          var dados = {
            id: id
          };
          $("#info_edt_clt").html('<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><div class="mt-3 small text-muted">Carregando informações do cliente...</div></div>');
          $('#modalEdtClt').modal('show');
          $.post('clt_edt.php', dados, function(retorna) {
            $("#info_edt_clt").html(retorna);
          }).fail(function() {
            $("#info_edt_clt").html('<div class="alert alert-danger m-3">Erro ao carregar informações do cliente.</div>');
          });
        }
      });
    });
  </script>
  <!-- -->
  <!-- MODAL DE EDIÇÃO DE PESSOAS DE CONTATO -->
  <div class="modal fade client-modal" id="modalEdtContato" tabindex="-1" role="dialog" aria-labelledby="modalEdtContatoLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">

        <div class="modal-header">
          <div class="client-modal-title">
            <span class="client-modal-icon"><i class="fas fa-user-tag"></i></span>
            <div>
              <h6 class="modal-title" id="modalEdtContatoLabel">Contatos do cliente</h6>
              <p>Gerencie as pessoas de contato vinculadas ao cliente.</p>
            </div>
          </div>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <span id="info_edt_contato"></span>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
        </div>

      </div>
    </div>
  </div>
  <script>
    $(document).ready(function() {
      $(document).on('click', '.view_contato', function() {
        var id = $(this).attr("id");
        if (id !== '') {
          var dados = {
            id: id
          };
          $("#info_edt_contato").html('<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><div class="mt-3 small text-muted">Carregando contatos...</div></div>');
          $('#modalEdtContato').modal('show');
          $.post('contato.php', dados, function(retorna) {
            $("#info_edt_contato").html(retorna);
          }).fail(function() {
            $("#info_edt_contato").html('<div class="alert alert-danger m-3">Erro ao carregar contatos.</div>');
          });
        }
      });
    });
  </script>
  <!-- -->
  <!-- MODAL DE EDIÇÃO DE LOCAL DE ATENDIMENTO -->
  <div class="modal fade client-modal" id="modalEdtLocal" tabindex="-1" role="dialog" aria-labelledby="modalEdtLocalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">

        <div class="modal-header">
          <div class="client-modal-title">
            <span class="client-modal-icon"><i class="fas fa-map-marked-alt"></i></span>
            <div>
              <h6 class="modal-title" id="modalEdtLocalLabel">Locais de atendimento</h6>
              <p>Gerencie endereços e locais de atendimento vinculados ao cliente.</p>
            </div>
          </div>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <span id="info_edt_local"></span>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
        </div>

      </div>
    </div>
  </div>
  <!-- MODAL DE AJUDA PARA CADASTRO DE NOVO ATENDIMENTO -->
  <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
      <div class="modal-content">

        <div class="modal-header">
          <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Cadastro de Clientes</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        </div>

        <div class="modal-body">
          <p>Em construção...
          </p>
        </div>

      </div>
    </div>
  </div>

  <script>
    $(document).ready(function() {
      $(document).on('click', '.view_local', function() {
        var id = $(this).attr("id");
        if (id !== '') {
          var dados = {
            id: id
          };
          $("#info_edt_local").html('<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><div class="mt-3 small text-muted">Carregando locais...</div></div>');
          $('#modalEdtLocal').modal('show');
          $.post('local.php', dados, function(retorna) {
            $("#info_edt_local").html(retorna);
          }).fail(function() {
            $("#info_edt_local").html('<div class="alert alert-danger m-3">Erro ao carregar locais.</div>');
          });
        }
      });

      const flashMessage = $('#clientFlashMessage');
      if (flashMessage.length) {
        setTimeout(function() {
          flashMessage.addClass('fade-out');
          setTimeout(function() {
            flashMessage.alert('close');
          }, 240);
        }, 4200);
      }

      $(document).on('input', 'input[name="clt_cnpj"]', function() {
        $(this).removeClass('is-invalid');
        getCnpjError($(this)).removeClass('is-visible');
      });

      $(document).on('submit', 'form', function(event) {
        var form = $(this);
        var cnpjInput = form.find('input[name="clt_cnpj"]').first();
        if (!cnpjInput.length) {
          return;
        }

        var cnpjValue = $.trim(cnpjInput.val());
        if (!clientIsValidCnpj(cnpjValue)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          cnpjInput.addClass('is-invalid').focus();
          getCnpjError(cnpjInput).addClass('is-visible');
          return false;
        }
      });

      function clientIsValidCnpj(cnpj) {
        cnpj = String(cnpj || '').replace(/[^\d]+/g, '');

        if (cnpj.length !== 14) {
          return false;
        }

        if (/^(\d)\1{13}$/.test(cnpj)) {
          return false;
        }

        var size = cnpj.length - 2;
        var numbers = cnpj.substring(0, size);
        var digits = cnpj.substring(size);
        var sum = 0;
        var pos = size - 7;

        for (var i = size; i >= 1; i--) {
          sum += numbers.charAt(size - i) * pos--;
          if (pos < 2) {
            pos = 9;
          }
        }

        var result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        if (result !== Number(digits.charAt(0))) {
          return false;
        }

        size = size + 1;
        numbers = cnpj.substring(0, size);
        sum = 0;
        pos = size - 7;

        for (var j = size; j >= 1; j--) {
          sum += numbers.charAt(size - j) * pos--;
          if (pos < 2) {
            pos = 9;
          }
        }

        result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        return result === Number(digits.charAt(1));
      }

      function getCnpjError(input) {
        var error = input.closest('.form-group').find('[data-cnpj-error]').first();
        if (!error.length) {
          error = $('<div class="client-field-error" data-cnpj-error><i class="fas fa-exclamation-circle"></i> O CNPJ informado é inválido.</div>');
          input.closest('.input-group').after(error);
        }
        return error;
      }
    });
  </script>
  <!-- -->
</body>

</html>
