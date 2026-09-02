<?php
session_start();

include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once(__DIR__ . "/lib/home_data.php");
include_once(__DIR__ . "/lib/home_render.php");

if (!isset($m3_00) || (int)$m3_00 === 0) {
  header("Location: ../index.php");
  exit;
}

if (isset($_GET['action']) && $_GET['action'] === 'limpar_filtros') {
  atd_home_clear_filters();
  header('Location: ' . $_SERVER['PHP_SELF']);
  exit;
}

$mensagem = filter_input(INPUT_POST, 'mensagem', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
if ($action === 'alterar_senha') {
  include_once("../all/update_senha.php");
}

$pdo = ConnectionN3();
$filters = atd_home_normalize_filters(['ord' => 'sla', 'order_dir' => 'ASC'], false);
$state = atd_home_load_state($pdo, $filters, isset($_GET['page']) ? (int)$_GET['page'] : 1);
?>
<!doctype html>
<html lang="pt-BR">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link rel="icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../css/bootstrap.min.css">
  <link rel="stylesheet" href="../fontawesome/css/all.css">
  <link rel="stylesheet" href="../css/bootstrap-select.min.css">
  <link rel="stylesheet" href="../css/progress_bar.css">
  <link rel="stylesheet" href="../css/blink.css">
  <link rel="stylesheet" href="../css/help.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <title>Allterus</title>
  <style>
    html {
      height: 100%;
      background: #f6f8fb;
      overflow: hidden;
    }

    body {
      zoom: 1;
      height: 100vh;
      width: 100%;
      margin: 0;
      overflow: hidden;
      background: #f6f8fb;
      color: #0f172a;
      font-size: 90%;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    }

    body,
    body input,
    body button,
    body select,
    body textarea,
    body .card,
    body .table,
    body .dropdown-menu {
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    }

    .container-fluid {
      max-width: 100vw;
      padding-right: 0;
      padding-left: 0;
      overflow: visible;
    }

    .container-fluid>.row {
      margin-right: 0;
      margin-left: 0;
    }

    .container-fluid>.row>[class*="col-"] {
      max-width: 100%;
    }

    th form {
      margin: 0 !important;
    }

    #atdTableRegion {
      position: relative;
    }

    .atd-loading-overlay {
      position: absolute;
      inset: 0;
      z-index: 80;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(246, 248, 251, .72);
      backdrop-filter: blur(1px);
    }

    .atd-refreshing #atdTableRegion .atd-loading-overlay {
      display: flex;
    }

    .atd-loading-box {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border: 1px solid #d9e3ef;
      border-radius: 8px;
      background: #fff;
      color: #263244;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .14);
      font-size: .86rem;
      font-weight: 600;
    }

    .atd-loading-box i {
      color: #169bb5;
    }

    .atd-refreshing .table-container {
      pointer-events: none;
    }

    .table-container {
      height: calc(100vh - 205px);
      max-height: calc(100vh - 205px);
      max-width: 100vw;
      overflow-y: auto;
      overflow-x: auto;
      display: block;
      border: 1px solid #dee2e6;
      background: #fff;
      overscroll-behavior: contain;
    }

    .table-container table {
      display: table;
      width: 100%;
      min-width: 1580px;
      border-collapse: collapse;
      margin-bottom: 0;
    }

    .table-container th,
    .table-container td {
      max-width: 200px;
      white-space: normal;
      word-wrap: break-word;
    }

    .table-container thead th {
      vertical-align: middle;
    }

    .table-container thead th .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      min-height: 36px;
      padding: 5px 6px;
      line-height: 1.1;
      white-space: normal;
      word-break: keep-all;
      overflow-wrap: normal;
    }

    .table-container thead th .btn i {
      flex: 0 0 auto;
    }

    .table-container tr>*:nth-child(1) {
      white-space: nowrap;
      word-break: normal;
      overflow-wrap: normal;
    }

    .atd-row-clickable {
      cursor: pointer;
      height: 126px;
    }

    .atd-abertura-cell {
      min-width: 0;
      line-height: 1.35;
      height: 126px;
      vertical-align: middle !important;
    }

    .atd-abertura-date,
    .atd-abertura-preview {
      display: block;
    }

    .atd-abertura-date {
      margin-bottom: 3px;
      color: #0f172a;
      font-weight: 500;
      white-space: nowrap;
    }

    .atd-abertura-preview {
      display: -webkit-box;
      color: #172033;
      overflow: hidden;
      word-break: normal;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 5;
      line-clamp: 5;
    }

    .dropdown-menu .form-check-input {
      transform: scale(1.2);
      margin-right: 6px;
      cursor: pointer;
    }

    .filters-toolbar {
      position: relative;
      z-index: 30;
      overflow: visible;
      padding: 12px 14px 10px;
      background: #fff;
      border-top: 1px solid #eef2f7;
      border-bottom: 1px solid #d9e0ea;
      box-shadow: 0 2px 8px rgba(15, 23, 42, .05);
    }

    .filters-toolbar form {
      width: 100%;
      margin: 0;
    }

    .filters-toolbar .form-row {
      display: flex;
      flex-wrap: nowrap;
      align-items: flex-end;
      gap: 8px;
      width: 100%;
      margin: 0;
    }

    .filters-toolbar .form-row>.col-auto.col-form-label-sm {
      flex: 1 1 0;
      min-width: 0;
      padding-right: 0;
      padding-left: 0;
    }

    .filters-toolbar .form-row>.col-auto.col-form-label-sm.filter-wide {
      flex: 1.35 1 0;
      min-width: 190px;
    }

    .filters-toolbar .form-row>.col-auto.col-form-label-sm.filter-id {
      flex: .7 1 0;
      min-width: 110px;
    }

    .filters-toolbar .form-row>.col-auto.pt-3 {
      flex: 0 0 auto;
      padding-right: 0;
      padding-left: 0;
    }

    .filters-toolbar label {
      display: block;
      margin-bottom: 4px !important;
      color: #172033;
      font-size: .86rem;
      font-weight: 500;
      line-height: 1.15;
      white-space: nowrap;
    }

    .filters-toolbar .form-control,
    .filters-toolbar select.form-control,
    .filters-toolbar input.form-control,
    .filters-toolbar .dropdown {
      width: 100% !important;
    }

    .filters-toolbar .form-control,
    .filters-toolbar .dropdown-toggle-split {
      height: 34px;
      min-height: 34px;
      border: 1px solid #d3dbe7;
      border-radius: 4px;
      background-color: #fff;
      color: #172033;
      font-size: .86rem;
      box-shadow: none;
    }

    .filters-toolbar .form-control:focus,
    .filters-toolbar .dropdown-toggle-split:focus {
      border-color: #74a7e8;
      box-shadow: 0 0 0 2px rgba(13, 110, 253, .12);
    }

    .filters-toolbar .dropdown-toggle-split {
      display: flex;
      align-items: center;
      position: relative;
      padding-right: 30px;
    }

    .filters-toolbar .dropdown-toggle-split::after {
      position: absolute;
      right: 10px;
      top: 50%;
      margin: 0;
      transform: translateY(-50%);
    }

    .filters-toolbar .dropdown-menu {
      z-index: 4000;
      border: 1px solid #d9e3ef;
      border-radius: 6px !important;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .14);
    }

    .filters-toolbar .filter-dropdown {
      width: 100% !important;
    }

    .filters-toolbar .filter-dropdown .dropdown-toggle-split {
      width: 100%;
      justify-content: flex-start;
    }

    .filters-toolbar .filter-dropdown .dropdown-menu {
      right: auto;
      left: 0;
      width: 100% !important;
      min-width: 100%;
      padding: 10px;
      border-radius: 4px !important;
    }

    .filters-toolbar .form-check {
      display: flex;
      align-items: center;
      min-height: 24px;
      margin-bottom: 3px;
    }

    .filters-toolbar .form-check-label {
      margin: 0 !important;
      color: #263244;
      font-size: .84rem;
      font-weight: 400;
      white-space: normal;
    }

    .filters-toolbar .btn {
      height: 34px;
      min-width: 64px;
      border-radius: 4px;
      font-size: .86rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .filters-toolbar .btn-info {
      border-color: #169bb5;
      background-color: #169bb5;
      color: #fff;
    }

    .filters-toolbar .btn-outline-info {
      border-color: #1597bd;
      color: #1597bd;
      background-color: #fff;
    }

    .filters-toolbar .btn-outline-info:hover {
      border-color: #1597bd;
      background-color: #e9f8fc;
      color: #0f7897;
    }

    .filters-toolbar .btn-total-atd {
      border-color: #d7e0ec;
      color: #596778;
      background: #f8fafc;
      cursor: default;
    }

    .filters-toolbar #autoReloadToggle {
      color: #0d8fe3 !important;
      font-size: 19px !important;
      margin-left: 2px;
      transition: transform .15s ease, color .15s ease;
    }

    .filters-toolbar #autoReloadToggle:hover {
      color: #0a6fb0 !important;
      transform: rotate(20deg);
    }

    .status-card-bar {
      position: relative;
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 16px;
      padding: 12px 12px 14px;
      overflow: hidden;
      background: #fff;
      border-bottom: 1px solid #e9ecef;
    }

    .atd-refreshing .status-card-btn {
      position: relative;
      color: transparent;
    }

    .atd-refreshing .status-card-total,
    .atd-refreshing .status-card-label {
      opacity: 0;
    }

    .atd-refreshing .status-card-btn::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 22px;
      height: 22px;
      margin-top: -11px;
      margin-left: -11px;
      border: 3px solid #d9e3ef;
      border-top-color: #169bb5;
      border-radius: 50%;
      animation: atdCardSpin .7s linear infinite;
      pointer-events: none;
    }

    @keyframes atdCardSpin {
      to {
        transform: rotate(360deg);
      }
    }

    .status-card-form {
      margin: 0;
      min-width: 0;
    }

    .status-card-btn {
      width: 100%;
      min-height: 78px;
      padding: 8px 6px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 3px 8px rgba(15, 23, 42, .08);
      color: #172033;
      text-align: center;
      transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
    }

    .status-card-btn:hover,
    .status-card-btn.active {
      box-shadow: 0 6px 14px rgba(15, 23, 42, .12);
      transform: translateY(-1px);
    }

    .status-card-total {
      display: block;
      font-size: 1.08rem;
      font-weight: 700;
      line-height: 1.1;
      color: #111827;
    }

    .status-card-label {
      display: block;
      margin-top: 4px;
      color: #5f6b7a;
      font-size: .7rem;
      font-weight: 600;
      line-height: 1.15;
      text-transform: uppercase;
    }

    @media (max-width: 1599.98px) {
      .table-container table {
        min-width: 100%;
        table-layout: fixed;
      }

      .table-container th .btn {
        min-width: 0;
        white-space: normal;
        line-height: 1.15;
        font-size: .82rem;
      }

      .table-container th,
      .table-container td {
        overflow-wrap: anywhere;
        vertical-align: middle;
      }

      .table-container tr>*:nth-child(1) {
        width: 5.5%;
      }

      .table-container tr>*:nth-child(2) {
        width: 13%;
      }

      .table-container tr>*:nth-child(3) {
        width: 21%;
        max-width: none;
      }

      .table-container tr>*:nth-child(4) {
        width: 7%;
      }

      .table-container tr>*:nth-child(5) {
        width: 10%;
      }

      .table-container tr>*:nth-child(6) {
        width: 5%;
      }

      .table-container tr>*:nth-child(7) {
        width: 8%;
      }

      .table-container tr>*:nth-child(8) {
        width: 6%;
      }

      .table-container tr>*:nth-child(9) {
        width: 10.5%;
      }

      .table-container tr>*:nth-child(10) {
        width: 7%;
      }

      .table-container tr>*:nth-child(11) {
        width: 7%;
      }
    }

    @media (max-width: 1365.98px) {
      .table-container thead th .btn {
        gap: 3px;
        min-height: 34px;
        padding: 4px 3px;
        font-size: .74rem;
      }

      .table-container tr>*:nth-child(1) {
        width: 5.5%;
      }

      .table-container tr>*:nth-child(2) {
        width: 12.5%;
      }

      .table-container tr>*:nth-child(3) {
        width: 20%;
      }

      .table-container tr>*:nth-child(4) {
        width: 7%;
      }

      .table-container tr>*:nth-child(5) {
        width: 10%;
      }

      .table-container tr>*:nth-child(6) {
        width: 5%;
      }

      .table-container tr>*:nth-child(7) {
        width: 8.5%;
      }

      .table-container tr>*:nth-child(8) {
        width: 6%;
      }

      .table-container tr>*:nth-child(9) {
        width: 11%;
      }

      .table-container tr>*:nth-child(10) {
        width: 7.5%;
      }

      .table-container tr>*:nth-child(11) {
        width: 7%;
      }
    }

    @media (max-width: 1199.98px) {
      .filters-toolbar .form-row {
        flex-wrap: wrap;
        align-items: stretch;
      }

      .filters-toolbar .form-row>.col-auto.col-form-label-sm,
      .filters-toolbar .form-row>.col-auto.col-form-label-sm.filter-wide {
        flex: 1 1 calc(33.333% - 8px);
        min-width: 180px;
      }

      .filters-toolbar .form-row>.col-auto.pt-3 {
        flex: 1 1 auto;
        min-width: 96px;
      }

      .filters-toolbar .form-row>.col-auto.pt-3 .btn {
        width: 100%;
      }

      .status-card-bar {
        gap: 10px;
        padding: 10px;
      }

      .status-card-btn {
        min-height: 68px;
        padding: 7px 4px;
      }

      .status-card-total {
        font-size: 1rem;
      }

      .status-card-label {
        font-size: .62rem;
      }
    }

    @media (max-width: 991.98px) {
      .status-card-bar {
        gap: 6px;
        padding: 8px 6px;
      }

      .status-card-btn {
        min-height: 58px;
        padding: 6px 2px;
        border-radius: 6px;
      }

      .status-card-total {
        font-size: .88rem;
      }

      .status-card-label {
        font-size: .52rem;
        line-height: 1.05;
      }

      .filters-toolbar {
        padding: 10px;
      }

      .filters-toolbar .form-row>.col-auto.col-form-label-sm,
      .filters-toolbar .form-row>.col-auto.col-form-label-sm.filter-wide,
      .filters-toolbar .form-row>.col-auto.col-form-label-sm.filter-id,
      .filters-toolbar .form-row>.col-auto.pt-3 {
        flex: 1 1 calc(50% - 8px);
        min-width: 0;
      }

      .table-container {
        overflow-x: hidden;
        border-right: 0;
        border-left: 0;
      }

      .table-container table,
      .table-container tbody,
      .table-container tr,
      .table-container th,
      .table-container td {
        display: block;
        width: 100% !important;
        max-width: none !important;
        min-width: 0;
      }

      .table-container thead {
        display: none;
      }

      .table-container tbody tr {
        margin: 8px;
        padding: 8px 10px;
        border: 1px solid #dbe3ef;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 2px 8px rgba(15, 23, 42, .06);
      }

      .table-container tbody tr>th,
      .table-container tbody tr>td {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 0 !important;
        border: 0 !important;
        text-align: right !important;
      }

      .table-container tbody tr>th::before,
      .table-container tbody tr>td::before {
        flex: 0 0 116px;
        color: #64748b;
        font-size: .72rem;
        font-weight: 600;
        line-height: 1.2;
        text-align: left;
        text-transform: uppercase;
      }

      .table-container tbody tr>*:nth-child(1)::before {
        content: "ID";
      }

      .table-container tbody tr>*:nth-child(2)::before {
        content: "Cliente";
      }

      .table-container tbody tr>*:nth-child(3)::before {
        content: "Abertura";
      }

      .table-container tbody tr>*:nth-child(4)::before {
        content: "Tipo";
      }

      .table-container tbody tr>*:nth-child(5)::before {
        content: "Categoria";
      }

      .table-container tbody tr>*:nth-child(6)::before {
        content: "Nivel";
      }

      .table-container tbody tr>*:nth-child(7)::before {
        content: "Prioridade";
      }

      .table-container tbody tr>*:nth-child(8)::before {
        content: "Forma";
      }

      .table-container tbody tr>*:nth-child(9)::before {
        content: "Prazo";
      }

      .table-container tbody tr>*:nth-child(10)::before {
        content: "Tecnico";
      }

      .table-container tbody tr>*:nth-child(11)::before {
        content: "Status";
      }
    }

    @media (max-width: 575.98px) {
      .status-card-bar {
        gap: 4px;
        padding: 6px 4px;
      }

      .status-card-btn {
        min-height: 50px;
        padding: 4px 1px;
      }

      .status-card-total {
        font-size: .76rem;
      }

      .status-card-label {
        font-size: .45rem;
      }

      .filters-toolbar .form-row>.col-auto.col-form-label-sm,
      .filters-toolbar .form-row>.col-auto.col-form-label-sm.filter-wide,
      .filters-toolbar .form-row>.col-auto.col-form-label-sm.filter-id,
      .filters-toolbar .form-row>.col-auto.pt-3 {
        flex: 1 1 100%;
        min-width: 100%;
      }

      .table-container tbody tr>th,
      .table-container tbody tr>td {
        flex-direction: column;
        align-items: stretch;
        gap: 3px;
        text-align: left !important;
      }
    }
  </style>
</head>

<body>
  <?php include_once("../all/loading.php"); ?>
  <?php include("../all/sidebar.php"); ?>

  <div class="container-fluid">
    <div class="row">
      <div class="col-12 mt-2" style="padding-left: 1px; padding-right: 1px;">
        <div class="card" id="atdHomeShell">
          <div id="atdStatusCards">
            <?php echo atd_home_render_status_cards($state['statusCards'], $state['filters']); ?>
          </div>
          <div id="atdFilters">
            <?php echo atd_home_render_filters($state['filters'], $state['options'], $state['total']); ?>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="atdTableRegion">
    <?php echo atd_home_render_table($state); ?>
  </div>

  <?php echo atd_home_render_help_modal(); ?>

  <?php if (isset($mensagem) && $mensagem !== '') { ?>
    <div class="row pull-right" style="position:absolute; top: 65px; right:25px;">
      <div class="alert <?php echo atd_home_h($mensagem_cor ?? 'alert-info'); ?> alert-dismissible fade show" role="alert">
        <?php echo $mensagem; ?>
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>
  <?php } ?>

  <?php include_once("../all/update_pass.php"); ?>

  <script src="../js/jquery-3.6.0.min.js"></script>
  <script src="../js/bootstrap.bundle.min.js"></script>
  <script src="../js/bootstrap-select.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/pt.js"></script>
  <script src="js/home_dynamic.js"></script>
</body>

</html>
