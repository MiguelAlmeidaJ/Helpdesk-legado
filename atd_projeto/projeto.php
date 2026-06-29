<?php
session_start();
ob_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");


$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");


//REGRA PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC
$exibe_bt_projeto_interacao = true;
$exibe_bt_projeto_aceitar = false;
$exibe_bt_projeto_devolver = false;
$exibe_bt_projeto_espera = false;
$exibe_bt_projeto_finalizar = false;
$exibe_bt_projeto_retomar = false;

if ($m5_00 == 0) {
  header("Location: ../home.php");
}
?>
<!doctype html>
<html lang="pt-BR">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link rel="icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../css/help.css">
  <link rel="stylesheet" href="../css/bootstrap.min.css">
  <link rel="stylesheet" href="../fontawesome/css/all.css">
  <link rel="stylesheet" href="../css/bootstrap-select.min.css">
  <link rel="stylesheet" href="../css/timeline.css">
  <link rel="stylesheet" href="../css/progress_bar.css">
  <link rel="stylesheet" href="../css/blink.css">
  <link rel="stylesheet" href="../css/bootstrap-datetimepicker.min.css">

  <title>Allterus</title>
  <style type="text/css">
    html,
    body {
      width: 100%;
      min-height: 100vh;
      min-height: 100dvh;
    }

    body {
      zoom: 1;
      overflow-x: hidden;
    }

    .carregando {
      color: #ff0000;
      display: none;
    }

    .carregando2 {
      color: #ff0000;
      display: none;
    }

    .carregando3 {
      color: #ff0000;
      display: none;
    }

    .carregando4 {
      color: #ff0000;
      display: none;
    }

    .project-page {
      height: calc(100vh - 16px);
      overflow: hidden;
      padding-bottom: 8px;
      font-family: "Segoe UI", Arial, sans-serif;
    }

    .project-main-column,
    .project-history-column {
      height: calc(100vh - 24px);
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .project-card {
      border: 1px solid #d8e3ef;
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      background: #fff;
    }

    .project-hero {
      padding: 14px 16px;
      margin-bottom: 8px;
    }

    .project-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .project-title-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .project-title h1 {
      font-size: 18px;
      line-height: 1.2;
      margin: 0;
      font-weight: 700;
      color: #0f172a;
    }

    .project-title small {
      font-size: 12px;
      font-weight: 700;
      color: #53677f;
      text-transform: uppercase;
    }

    .project-meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(150px, 1fr));
      gap: 8px;
      margin-bottom: 10px;
    }

    .project-meta-item {
      border: 1px solid #d8e3ef;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
      min-width: 0;
    }

    .project-meta-item span {
      display: block;
      font-size: 10px;
      font-weight: 700;
      color: #53677f;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .project-meta-item strong {
      display: block;
      color: #0f172a;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .project-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

    .project-status-0 {
      color: #7a4c00;
      background: #fff4c6;
    }

    .project-status-1 {
      color: #7f1d1d;
      background: #fee2e2;
    }

    .project-status-2 {
      color: #075985;
      background: #cffafe;
    }

    .project-status-3 {
      color: #92400e;
      background: #ffedd5;
    }

    .project-status-4 {
      color: #166534;
      background: #dcfce7;
    }

    .project-description {
      border: 1px solid #d8e3ef;
      border-radius: 6px;
      padding: 10px 12px;
      background: #fff;
      color: #0f172a;
      line-height: 1.45;
      max-height: 92px;
      overflow: auto;
      margin-bottom: 10px;
    }

    .project-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .project-actions .btn {
      border-radius: 5px;
      font-weight: 700;
      padding: 6px 10px;
    }

    .project-info-btn {
      width: 34px;
      height: 34px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      flex: 0 0 auto;
    }

    .project-info-modal .modal-content {
      border: 1px solid #d8e3ef;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 22px 70px rgba(15, 23, 42, 0.22);
      font-family: "Segoe UI", Arial, sans-serif;
    }

    .project-info-modal .modal-header {
      background: #fff;
      border-bottom: 1px solid #d8e3ef;
      padding: 14px 18px;
    }

    .project-info-modal .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .project-info-modal .modal-body {
      background: #f8fafc;
      padding: 16px;
    }

    .project-info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .project-info-group {
      border: 1px solid #d8e3ef;
      border-radius: 6px;
      background: #fff;
      padding: 12px;
    }

    .project-info-group h3 {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 10px;
    }

    .project-info-line {
      display: grid;
      grid-template-columns: 110px minmax(0, 1fr);
      gap: 8px;
      font-size: 13px;
      padding: 5px 0;
      border-top: 1px solid #edf2f7;
    }

    .project-info-line:first-of-type {
      border-top: 0;
    }

    .project-info-line span {
      color: #53677f;
      font-weight: 700;
    }

    .project-info-line strong {
      color: #0f172a;
      font-weight: 600;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .project-tasks-card {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .project-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid #d8e3ef;
      gap: 10px;
    }

    .project-section-header h2 {
      font-size: 15px;
      font-weight: 700;
      margin: 0;
      color: #0f172a;
    }

    .project-tasks-scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      background: #fff;
    }

    .project-tasks-table {
      margin: 0;
      table-layout: fixed;
      width: 100%;
    }

    .project-tasks-table th:nth-child(1),
    .project-tasks-table td:nth-child(1) {
      width: 5% !important;
    }

    .project-tasks-table th:nth-child(2),
    .project-tasks-table td:nth-child(2) {
      width: 31% !important;
    }

    .project-tasks-table th:nth-child(3),
    .project-tasks-table td:nth-child(3) {
      width: 22% !important;
    }

    .project-tasks-table th:nth-child(4),
    .project-tasks-table td:nth-child(4) {
      width: 11% !important;
    }

    .project-tasks-table th:nth-child(5),
    .project-tasks-table td:nth-child(5) {
      width: 13% !important;
    }

    .project-tasks-table th:nth-child(6),
    .project-tasks-table td:nth-child(6) {
      width: 10% !important;
    }

    .project-tasks-table th:nth-child(7),
    .project-tasks-table td:nth-child(7) {
      width: 8% !important;
    }

    .project-tasks-table thead th {
      position: sticky;
      top: 0;
      z-index: 2;
      background: #f8fafc;
      border-bottom: 1px solid #d8e3ef;
      font-size: 12px;
      color: #334155;
      font-weight: 700;
      height: 40px;
      vertical-align: middle;
    }

    .project-tasks-table td {
      vertical-align: middle !important;
      padding-top: 10px;
      padding-bottom: 10px;
    }

    .project-tasks-table th:nth-child(1),
    .project-tasks-table td:nth-child(1),
    .project-tasks-table th:nth-child(4),
    .project-tasks-table td:nth-child(4),
    .project-tasks-table th:nth-child(6),
    .project-tasks-table td:nth-child(6),
    .project-tasks-table th:nth-child(7),
    .project-tasks-table td:nth-child(7) {
      text-align: center;
    }

    .project-task-row {
      cursor: pointer;
      height: 86px;
    }

    .project-task-row:hover {
      background: #f8fbff;
    }

    .project-task-row.is-hidden {
      display: none;
    }

    .project-task-name {
      display: block;
      font-weight: 700;
      color: #0f172a;
      max-height: 32px;
      font-size: 12px;
      overflow: hidden;
    }

    .project-task-desc,
    .project-task-meta {
      color: #53677f;
      font-size: 11px;
      line-height: 1.22;
    }

    .project-task-desc {
      display: block;
      max-height: 28px;
      overflow: hidden;
    }

    .project-task-id {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 52px;
      color: #0f172a;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }

    .project-task-classification {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 6px;
      min-height: 52px;
      max-width: 100%;
    }

    .project-task-classification-line {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-start;
      gap: 5px 6px;
    }

    .project-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      max-width: 100%;
      border-radius: 999px;
      padding: 4px 8px;
      background: #eef4fb;
      color: #334155;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .project-chip i {
      margin-right: 4px;
      font-size: 10px;
    }

    .project-chip-forma {
      background: #e8f8fc;
      color: #075985;
    }

    .project-tasks-table .project-status-badge {
      padding: 5px 9px;
      font-size: 11px;
    }

    .project-task-action-form {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }

    .project-task-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      min-width: 34px;
      height: 30px;
      border-radius: 5px;
      padding: 0;
      border: 1px solid #cfd9e6;
      background: #fff;
      color: #334155;
      font-size: 0;
      font-weight: 800;
      line-height: 1;
      box-shadow: none;
      transition: background .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease, transform .15s ease;
    }

    .project-task-action-btn i {
      margin-right: 0;
      font-size: 16px;
    }

    .project-task-action-btn.is-start {
      border-color: #0ea5e9;
      color: #087ea4;
      background: #f0fbff;
    }

    .project-task-action-btn.is-finish {
      border-color: #16a34a;
      color: #0f7a35;
      background: #f2fcf5;
    }

    .project-task-action-btn .project-action-check {
      position: relative;
      display: inline-block;
      width: 18px;
      height: 12px;
      transform: rotate(-45deg);
    }

    .project-task-action-btn .project-action-check:before,
    .project-task-action-btn .project-action-check:after {
      content: "";
      position: absolute;
      border-radius: 4px;
      background: currentColor;
    }

    .project-task-action-btn .project-action-check:before {
      left: 0;
      bottom: 0;
      width: 6px;
      height: 12px;
    }

    .project-task-action-btn .project-action-check:after {
      left: 0;
      bottom: 0;
      width: 18px;
      height: 6px;
    }

    .project-task-action-btn.is-done {
      border-color: #86efac;
      color: #15803d;
      background: #ecfdf3;
      cursor: default;
      opacity: .85;
    }

    .project-task-action-btn.is-start:hover,
    .project-task-action-btn.is-finish:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 14px rgba(15, 23, 42, .12);
    }

    .project-task-action-btn.is-start:hover {
      border-color: #0284c7;
      color: #075985;
      background: #e0f7ff;
    }

    .project-task-action-btn.is-finish:hover {
      border-color: #15803d;
      color: #166534;
      background: #dcfce7;
    }

    .project-load-indicator {
      display: none;
      padding: 12px;
      text-align: center;
      color: #53677f;
      font-size: 12px;
      border-top: 1px solid #edf2f7;
    }

    .project-load-indicator.is-visible {
      display: block;
    }

    .project-history-card {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .project-history-card .card-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 12px !important;
    }

    .project-history-filter {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 32px;
      margin-bottom: 14px;
      border: 1px solid #d9e3ef;
      border-radius: 5px;
      background: #fff;
      color: #263244;
      font-size: .84rem;
      font-weight: 600;
    }

    .project-history-filter i {
      color: #334155;
    }

    .project-history-card .timeline {
      position: relative;
      margin: 0;
      padding: 0 0 0 28px;
    }

    .project-history-card .timeline:before {
      content: "";
      position: absolute;
      top: 10px;
      bottom: 10px;
      left: 9px;
      width: 2px;
      border-radius: 999px;
      background: #93c5fd;
    }

    .project-history-card .tl-item {
      position: relative;
      display: block;
      padding: 0 0 10px;
      margin: 0;
    }

    .project-history-card .tl-item>* {
      padding: 0;
    }

    .project-history-card .tl-dot {
      position: absolute;
      top: 12px;
      left: -28px;
      width: 18px;
      height: 18px;
      min-height: 0;
      margin: 0;
      border: 0;
      background: transparent;
      z-index: 2;
    }

    .project-history-card .tl-dot:before {
      content: "";
      position: absolute;
      inset: 0;
      width: 18px;
      height: 18px;
      border: 4px solid #60a5fa;
      border-radius: 999px;
      background: #fff;
      box-shadow: 0 0 0 4px #dbeafe;
      transform: none;
    }

    .project-history-card .tl-dot:after {
      display: none;
    }

    .project-history-card .tl-dot.b-success:before {
      border-color: #22c55e;
      box-shadow: 0 0 0 4px #dcfce7;
    }

    .project-history-card .tl-dot.b-danger:before {
      border-color: #f43f5e;
      box-shadow: 0 0 0 4px #ffe4ec;
    }

    .project-history-card .tl-dot.b-warning:before {
      border-color: #f59e0b;
      box-shadow: 0 0 0 4px #fef3c7;
    }

    .project-history-card .tl-dot.b-primary:before {
      border-color: #60a5fa;
      box-shadow: 0 0 0 4px #dbeafe;
    }

    .project-history-card .tl-content {
      min-width: 0;
      margin-left: 0;
      padding: 10px 12px !important;
      border-radius: 7px;
      background: #fff;
      border: 1px solid #dbe4ef;
      box-shadow: 0 3px 10px rgba(15, 23, 42, .05);
    }

    .proj-history-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 8px;
      min-width: 0;
      margin-bottom: 6px;
      color: #64748b;
      font-size: .78rem;
      font-weight: 600;
    }

    .proj-history-author {
      min-width: 0;
      color: #172033;
      font-weight: 800;
      overflow-wrap: anywhere;
    }

    .proj-history-desc {
      color: #263244;
      font-size: .86rem;
      line-height: 1.42;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .proj-history-desc br {
      content: "";
      display: block;
      margin-top: 5px;
    }

    @media (max-width: 1199px) {
      .project-page {
        height: auto;
        overflow: visible;
      }

      .project-main-column,
      .project-history-column {
        height: auto;
      }

      .project-meta-grid {
        grid-template-columns: repeat(2, minmax(150px, 1fr));
      }

      .project-tasks-card,
      .project-history-card {
        max-height: none;
      }
    }

    @media (max-width: 767px) {
      .project-meta-grid {
        grid-template-columns: 1fr;
      }

      .project-title {
        align-items: flex-start;
        flex-direction: column;
      }

      .project-info-grid {
        grid-template-columns: 1fr;
      }

      .project-info-line {
        grid-template-columns: 1fr;
      }
    }

    /* MODAL STYLES (MATCHING TELA DE ATENDIMENTOS / ATD.PHP) */
    .modal-content {
      border: 1px solid #dbe4ef;
      border-radius: 8px;
      box-shadow: 0 18px 48px rgba(15, 23, 42, .24);
      overflow: hidden;
    }

    .modal-header {
      min-height: 42px;
      border-bottom: 1px solid #e7edf5;
      background: #fff;
      color: #172033;
      align-items: center;
      padding: 13px 16px;
    }

    .modal-title {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: #172033;
      font-size: 1rem;
      font-weight: 800;
      line-height: 1.2;
    }

    .modal-header .close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      margin: 0;
      padding: 0;
      border-radius: 999px;
      color: #64748b;
      opacity: 1;
      transition: background 0.15s ease, color 0.15s ease;
    }

    #projeto_edt .modal-content {
      border: 1px solid #dbe4ef;
      border-radius: 12px;
      box-shadow: 0 20px 48px rgba(15, 23, 42, .28);
      overflow: hidden;
    }

    #projeto_edt .modal-header {
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e1e8f2;
      background: #f8fafc;
      color: #172033;
    }

    #projeto_edt .modal-title {
      font-size: 1.05rem;
      font-weight: 800;
    }

    #projeto_edt .modal-body {
      padding: 20px;
      color: #263244;
      font-size: .94rem;
      line-height: 1.5;
    }

    #projeto_edt .modal-footer {
      gap: 8px;
      padding: 14px 18px;
      background: #fff;
      border-top: 1px solid #e6edf5;
    }

    #projeto_edt .modal-footer .btn {
      min-width: 94px;
      min-height: 36px;
      border-radius: 6px;
      font-weight: 700;
      box-shadow: none;
    }

    #projeto_edt .modal-footer .btn-secondary {
      border-color: #cfd8e3;
      background: #f8fafc;
      color: #344054;
    }

    #projeto_edt .modal-footer .btn-danger {
      border-color: #0ea5e9;
      background: #0ea5e9;
      color: #fff;
    }

    #projeto_edt .modal-footer .btn-danger:hover {
      border-color: #0284c7;
      background: #0284c7;
    }

    @media (max-width: 767.98px) {
      #projeto_edt .modal-dialog {
        max-width: calc(100vw - 16px);
        margin: .5rem auto;
      }

      #projeto_edt .modal-body {
        padding: 14px !important;
      }

      #projeto_edt .modal-footer {
        flex-direction: column-reverse;
        align-items: stretch;
      }

      #projeto_edt .modal-footer .btn {
        width: 100%;
      }
    }

    .modal-header .close:hover {
      background: #f1f5f9;
      color: #172033;
      text-decoration: none;
    }

    .modal-title i {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      margin: 0 !important;
      border-radius: 999px;
      background: #edf8fb;
      color: #169bb5 !important;
      font-size: .88rem;
    }

    #projeto_espera .modal-title i {
      background: #fff7ed;
      color: #d97706 !important;
    }

    #projeto_recusar .modal-title i {
      background: #fff1f2;
      color: #dc2626 !important;
    }

    #projeto_aceitar .modal-title i,
    #projeto_retomar .modal-title i,
    #projeto_finalizar .modal-title i {
      background: #f0fdf4;
      color: #16a34a !important;
    }

    #Help .modal-title i {
      background: #fff1f2;
      color: #dc2626 !important;
    }

    .modal-body {
      padding: 16px;
      color: #263244;
      font-size: .9rem;
      line-height: 1.5;
    }

    .modal-body > label.small {
      display: block;
      width: 100%;
      margin-bottom: 12px !important;
      padding: 12px;
      border: 1px solid #e1e8f2;
      border-radius: 8px;
      background: #fbfcfe;
      color: #334155;
      line-height: 1.45;
    }
    
    .modal-body > label.small + label.small {
      margin-top: -6px;
    }

    .modal-body .form-row {
      margin-left: 0;
      margin-right: 0;
    }

    .modal-body .form-group {
      padding-left: 0;
      padding-right: 0;
      margin-bottom: 12px;
    }

    .modal-body label,
    .modal-body .my-0.small {
      color: #334155;
      font-weight: 600;
      display: block;
      margin-bottom: 4px !important;
      font-size: .86rem;
      line-height: 1.15;
    }

    .modal-body textarea.form-control,
    .modal-body textarea {
      min-height: 120px;
      padding: 10px 11px;
      border-radius: 6px;
      line-height: 1.45;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid #e7edf5;
      background: #fbfcfe;
    }

    .modal-footer form {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      width: 100%;
      margin: 0;
    }

    .modal-footer .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 34px;
      min-width: 96px;
      border-radius: 6px;
      padding: 7px 13px;
      font-weight: 600;
    }

    .modal-body .form-control,
    .modal-body .form-control-sm,
    .modal-body .bootstrap-select>.dropdown-toggle {
      min-height: 34px;
      border: 1px solid #d3dbe7;
      border-radius: 4px;
      background-color: #fff;
      color: #172033;
      font-size: .86rem;
      box-shadow: none;
    }

    .modal-body .form-control:focus,
    .modal-body .form-control-sm:focus,
    .modal-body .bootstrap-select>.dropdown-toggle:focus {
      border-color: #74a7e8;
      box-shadow: 0 0 0 2px rgba(13, 110, 253, .12);
      outline: none !important;
    }

    .bootstrap-select .dropdown-menu,
    .dropdown-menu {
      border: 1px solid #d9e3ef;
      border-radius: 6px;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .14);
    }

    #projeto_new_inter .modal-dialog,
    #projeto_aceitar .modal-dialog,
    #projeto_retomar .modal-dialog,
    #projeto_espera .modal-dialog,
    #projeto_recusar .modal-dialog,
    #projeto_finalizar .modal-dialog {
      max-width: 620px;
    }

    .modal:not(#Help) .modal-dialog {
      max-width: min(760px, calc(100vw - 32px));
      margin: 1.25rem auto;
    }

    #new_tarefa .modal-dialog {
      max-width: min(1200px, calc(100vw - 32px));
    }

    #relacionar .modal-dialog,
    #projeto_edt .modal-dialog,
    #project_info_modal .modal-dialog {
      max-width: min(920px, calc(100vw - 32px));
    }

    #relacionar .bootstrap-select {
      width: 100% !important;
    }

    #relacionar .modal-content,
    #relacionar .modal-body,
    #relacionar .form-row,
    #relacionar .form-group {
      overflow: visible !important;
    }

    #relacionar .bootstrap-select>.dropdown-toggle {
      width: 100%;
      max-width: 100%;
    }

    #relacionar .bootstrap-select>.dropdown-menu {
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      max-height: none !important;
      overflow: hidden !important;
      z-index: 1070;
    }

    #relacionar .bootstrap-select .dropdown-menu.inner {
      max-height: 260px !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
    }

    #relacionar .bootstrap-select .bs-searchbox {
      display: none !important;
    }

    #relacionar .bootstrap-select .inner.show {
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
    }

    #relacionar .bootstrap-select .dropdown-menu li a {
      white-space: normal;
      word-break: break-word;
      line-height: 1.35;
    }

    #relacionar .bootstrap-select .filter-option-inner-inner {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .modal:not(#Help) .modal-content {
      border: 1px solid #dbe4ef;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 22px 58px rgba(15, 23, 42, .28);
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    }

    .modal:not(#Help) .modal-header {
      min-height: 56px;
      padding: 14px 18px;
      border-bottom: 1px solid #e7edf5;
      background: #fff;
      color: #172033;
    }

    .modal:not(#Help) .modal-title {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      color: #172033;
      font-size: 1rem;
      font-weight: 800;
      letter-spacing: 0;
    }

    .modal:not(#Help) .modal-title i {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 30px;
      width: 30px;
      height: 30px;
      border-radius: 999px;
      background: #e8f8fc;
      color: #169bb5 !important;
      font-size: .9rem;
    }

    .modal:not(#Help) .modal-header .close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      margin: 0 0 0 auto;
      padding: 0;
      border-radius: 999px;
      color: #64748b;
      opacity: 1;
      text-shadow: none;
      transition: background .15s ease, color .15s ease;
    }

    .modal:not(#Help) .modal-header .close:hover {
      background: #f1f5f9;
      color: #172033;
      text-decoration: none;
    }

    .modal:not(#Help) .modal-body {
      padding: 18px 20px !important;
      background: #fff;
      color: #263244;
      font-size: .9rem;
      line-height: 1.45;
    }

    .modal:not(#Help) .modal-body .form-row {
      margin-right: -6px;
      margin-left: -6px;
    }

    .modal:not(#Help) .modal-body .form-group {
      margin-bottom: 13px;
      padding-right: 6px;
      padding-left: 6px;
    }

    .modal:not(#Help) .modal-body label,
    .modal:not(#Help) .modal-body .my-0.small {
      display: block;
      margin-bottom: 5px !important;
      color: #334155;
      font-size: .84rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .modal:not(#Help) .modal-body > label.small {
      padding: 12px 14px;
      border: 1px solid #e1e8f2;
      border-radius: 7px;
      background: #f8fafc;
      color: #334155;
    }

    .modal:not(#Help) .modal-body .form-control,
    .modal:not(#Help) .modal-body .form-control-sm,
    .modal:not(#Help) .modal-body .bootstrap-select>.dropdown-toggle {
      min-height: 36px;
      border: 1px solid #cfd9e6;
      border-radius: 5px;
      background-color: #fff;
      color: #172033;
      font-size: .88rem;
      box-shadow: none;
    }

    .modal:not(#Help) .modal-body textarea.form-control,
    .modal:not(#Help) .modal-body textarea {
      min-height: 118px;
      padding: 10px 11px;
      line-height: 1.45;
      resize: vertical;
    }

    .modal:not(#Help) .modal-body .form-control:focus,
    .modal:not(#Help) .modal-body .form-control-sm:focus,
    .modal:not(#Help) .modal-body .bootstrap-select>.dropdown-toggle:focus {
      border-color: #74a7e8;
      box-shadow: 0 0 0 3px rgba(13, 110, 253, .12);
      outline: none !important;
    }

    .modal:not(#Help) .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 13px 18px;
      border-top: 1px solid #e7edf5;
      background: #fbfcfe;
    }

    .modal:not(#Help) .modal-footer form {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      width: 100%;
      margin: 0;
    }

    .modal:not(#Help) .modal-footer .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 96px;
      min-height: 36px;
      border-radius: 5px;
      padding: 7px 14px;
      font-weight: 700;
      box-shadow: none;
    }

    @media (max-width: 767.98px) {
      .modal:not(#Help) .modal-dialog,
      #new_tarefa .modal-dialog,
      #relacionar .modal-dialog,
      #projeto_edt .modal-dialog,
      #project_info_modal .modal-dialog {
        max-width: calc(100vw - 16px);
        margin: .5rem auto;
      }

      .modal:not(#Help) .modal-body {
        padding: 14px !important;
      }

      .modal:not(#Help) .modal-footer {
        flex-direction: column-reverse;
        align-items: stretch;
      }

      .modal:not(#Help) .modal-footer .btn,
      .modal:not(#Help) .modal-footer form {
        width: 100%;
      }
    }

    /* GENERAL BUTTON OVERRIDES (MATCHING ATD.PHP) */
    .btn {
      border-radius: 4px;
      font-weight: 500;
    }

    .btn-sm {
      min-height: 32px;
      font-size: .84rem;
    }

    .btn-primary,
    .btn-info {
      border-color: #169bb5;
      background-color: #169bb5;
      color: #fff;
    }

    .btn-outline-primary,
    .btn-outline-info {
      border-color: #1597bd;
      color: #1597bd;
      background-color: #fff;
    }

    .btn-outline-primary:hover,
    .btn-outline-info:hover {
      border-color: #1597bd;
      background-color: #e9f8fc;
      color: #0f7897;
    }

    .btn-outline-secondary {
      border-color: #cfd9e6;
      color: #263244;
      background: #fff;
    }

    .btn-outline-secondary:hover {
      background: #f8fafc;
      color: #172033;
    }

    .badge {
      border-radius: 999px;
      padding: .26rem .48rem;
      font-weight: 700;
    }

    hr {
      border-top-color: #e7edf5;
    }

  </style>

</head>

<body>
  <?php include_once("../all/sidebar.php"); ?>
  <?php
  //verifico se existe alguma requisição POST chamada action
  $action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

  //verifico se existe alguma requisição via post cahamda projeto
  // $projeto = filter_input(INPUT_POST, 'projeto', FILTER_SANITIZE_NUMBER_INT);
  $projeto = $_POST['projeto'] ?? $_GET['projeto'] ??  0;


  if ($action == "alterar_senha") {
    include_once("../all/update_senha.php");
  }

  if ($action && $action !== "alterar_senha") {
    $projeto = (int)$projeto;
    $actionProjetoTecnico = null;

    if ($projeto > 0 && $action !== "projeto_adc") {
      $pdoPerm = ConnectionN3();
      $stmtPerm = $pdoPerm->prepare("SELECT tecnico FROM projetos WHERE id = :id LIMIT 1");
      $stmtPerm->execute([':id' => $projeto]);
      $permRow = $stmtPerm->fetch(PDO::FETCH_ASSOC);
      if (!$permRow) {
        n3_forbidden('Projeto nao encontrado.', 404);
      }
      $actionProjetoTecnico = (int)$permRow['tecnico'];
    }

    $allowedAction = true;
    switch ($action) {
      case 'projeto_adc':
      case 'new_tarefa':
        $allowedAction = ((int)$m5_01 >= 2);
        break;
      case 'projeto_edt':
      case 'relacionar_tar':
        $allowedAction = ((int)$m5_01 >= 3 || (int)$m5_05 >= 2);
        break;
      case 'projeto_new_inter':
        $allowedAction = ((int)$m5_00 >= 1);
        break;
      case 'projeto_aceitar':
      case 'projeto_retomar':
      case 'projeto_finalizar':
        $allowedAction = n3_can_project_execute_owner_or_manager($actionProjetoTecnico);
        break;
      case 'projeto_espera':
        $allowedAction = ((int)$m5_03 >= 2 && n3_can_project_execute_owner_or_manager($actionProjetoTecnico));
        break;
      case 'projeto_recusar':
        $allowedAction = ((int)$m5_04 >= 2 || (int)$m5_05 >= 2);
        break;
      default:
        $allowedAction = false;
        break;
    }

    if (!$allowedAction) {
      n3_forbidden('Voce nao tem permissao para executar esta acao no projeto.');
    }
  }

  if ($usar_token == "true") {
    if ($action) {
      if ($action == "projeto_adc") {
        $nome_proj = htmlspecialchars(filter_input(INPUT_POST,  'nome_proj',  FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
        $cliente = filter_input(INPUT_POST, 'cliente', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pessoa = filter_input(INPUT_POST, 'solicitante', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $local = filter_input(INPUT_POST, 'local', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_NUMBER_INT);
        $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $nivel = filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        /* $dias = filter_input(INPUT_POST, 'dias', FILTER_SANITIZE_FULL_SPECIAL_CHARS); */
        // $desc_abertura = filter_input(INPUT_POST, 'desc_abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        //$abertura = date("Y-m-d H:i:s");
        $desc_abertura = htmlspecialchars(filter_input(INPUT_POST, 'desc_abertura', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');

        $abertura = filter_input(INPUT_POST, 'abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        //VERIFICA SE DATA HORA ABERTURA É MAIOR DO QUE DATA HORA ATUAL.
        //SE POSITIVO: UM PROJETO AGENDADO
        //MUDA O STATUS PADRÃO DE ABERTURA PARA 0 (AGENDADO)
        if (strtotime($abertura) > strtotime($agora)) {
          $projeto_sts = 0;
          $agendamento = date("d/m/Y H:i", strtotime($abertura));
          $inter_msg = "Registrou o Agendamento do projeto para $agendamento.";
        } else {
          $projeto_sts = 1;
          $inter_msg = "Registrou solicitação de projeto.";
        }

        //VERIFICA SE EXISTE UM PROJETO ABERTO PARA O MESMO CLIENTE, COM A MESMA CATEGORIA E MESMA SUBCATEGORIA NOS ÚLTIMOS 30 DIAS
        //SE HOUVER, CLASSIFICA O PROJETO COMO REINCIDENTE
        $prazo_reincidente = 30; //PERIODO EM DIAS PARA VERIFICAR REINCIDÊNCIA
        $data_reincidente = date("Y-m-d", strtotime($hoje . " - $prazo_reincidente days"));
        $show = $pdo->prepare("SELECT projetos.id FROM projetos WHERE projetos.abertura > '$data_reincidente' AND projetos.cliente = '$cliente' AND projetos.categoria = '$categoria' AND projetos.subcategoria = '$subcategoria'");
        $show->execute();
        $conta_projeto = $show->rowCount();
        if ($conta_projeto > 0) {
          $reincidente = 1;
        } else {
          $reincidente = 0;
        }

        //INICIA PROCESSO DE GRAVAÇÃO DO PROJETO NA BASE DE DADOS
        $pdo = ConnectionN3();
        $adc = $pdo->prepare("INSERT INTO `projetos` (`nome_proj`, `cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, /* `dias`, */ `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`) VALUES (:nome_proj, :cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, /* :dias, */ :forma, :desc_abertura, :abertura, :tecnico, '$reincidente', '$projeto_sts');");
        $adc->bindParam(':nome_proj', $nome_proj);
        $adc->bindParam(':cliente', $cliente);
        $adc->bindParam(':pessoa', $pessoa);
        $adc->bindParam(':local', $local);
        $adc->bindParam(':tipo', $tipo);
        $adc->bindParam(':categoria', $categoria);
        $adc->bindParam(':subcategoria', $subcategoria);
        $adc->bindParam(':item', $item);
        /* $adc->bindParam(':dias', $dias); */
        $adc->bindParam(':forma', $forma);
        $adc->bindParam(':desc_abertura', $desc_abertura);
        $adc->bindParam(':abertura', $abertura);
        $adc->bindParam(':tecnico', $tecnico);

        //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
        //if($tecnico>0 && $tecnico!= $user_id){
        //}

        if ($adc->execute()) {
          $projeto = $pdo->lastInsertId();
          $mensagem = "<i class=\"fas fa-check\"></i> projeto cadastrado!";
          $mensagem_cor = "alert-success";
          $log = "true";

          //cadastra abertura do projeto na tabela de interatividade
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$projeto', '$user_id', '$agora', '$inter_msg');");
          $adc->execute();

          //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
          //registra interação de direcionamento de projeto
          if ($tecnico > 0 && $tecnico != $user_id) {
            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$projeto', '$user_id', '$agora', 'Direcionou o projeto para $tecnico_nome.')");
            $adc->execute();
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar projeto!";
          $mensagem_cor = "alert-danger";
          $log = "false";
        }
      }

      //EDITA A CATEGORIZAÇÃO DO PROJETO
      if ($action == "projeto_edt") {
        $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        if ($tipo == 1) {
          $projeto_tipo_nome = "Falha";
        }
        if ($tipo == 2) {
          $projeto_tipo_nome = "Relacionamento";
        }
        if ($tipo == 3) {
          $projeto_tipo_nome = "Requisição de Serviços";
        }
        if ($tipo == 4) {
          $projeto_tipo_nome = "Requisição de informação";
        }
        if ($tipo == 5) {
          $projeto_tipo_nome = "Notificação de monitoramento";
        }
        if ($tipo == 0) {
          $projeto_tipo_nome = "Não informado";
        }
        $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_cat = $pdo->prepare("SELECT categorias.cat_nome FROM categorias WHERE categorias.cat_id = '$categoria'");
        $show_cat->execute();
        $row = $show_cat->fetch(PDO::FETCH_ASSOC);
        $projeto_cat_nome = $row["cat_nome"];

        $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_scat = $pdo->prepare("SELECT subcategorias.scat_nome FROM subcategorias WHERE subcategorias.scat_id = '$subcategoria'");
        $show_scat->execute();
        $row = $show_scat->fetch(PDO::FETCH_ASSOC);
        $projeto_scat_nome = $row["scat_nome"];

        $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_itens = $pdo->prepare("SELECT itens.itens_nome FROM itens WHERE itens.itens_id = :item"); // Usando bind para evitar SQL Injection
        $show_itens->bindParam(':item', $item, PDO::PARAM_INT); // Bind do parâmetro para maior segurança
        $show_itens->execute();

        $row = $show_itens->fetch(PDO::FETCH_ASSOC);

        if ($row) { // Verificando se a consulta retornou resultados
          $projeto_itens_nome = isset($row["itens_nome"]) ?$row["itens_nome"] : ''; // Acesso seguro é chave
        } else {
          $projeto_itens_nome = ''; // Valor padrão se não houver resultados
        }




        $nivel = filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        if ($nivel == 0) {
          $projeto_nivel_nome = "Não informado";
        }
        if ($nivel == 1) {
          $projeto_nivel_nome = "Nível 1";
        }
        if ($nivel == 2) {
          $projeto_nivel_nome = "Nível 2";
        }
        if ($nivel == 3) {
          $projeto_nivel_nome = "Nível 3";
        }
        if ($nivel == 4) {
          $projeto_nivel_nome = "Rotina";
        }
        if ($nivel == 5) {
          $projeto_nivel_nome = "Administrativo";
        }

        $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_SPECIAL_CHARS);
        if ($forma == 1) {
          $projeto_forma_nome = "Remoto";
        }
        if ($forma == 2) {
          $projeto_forma_nome = "Presencial";
        }
        if ($forma == 3) {
          $projeto_forma_nome = "Remoto - Plantão";
        }
        if ($forma == 4) {
          $projeto_forma_nome = "Presencial - Plantão";
        }

        $desc_abertura = htmlspecialchars(filter_input(INPUT_POST, 'desc_abertura'), ENT_QUOTES, 'UTF-8');


        $dias = filter_input(INPUT_POST, 'dias', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_dias = $pdo->prepare("SELECT projetos.dias FROM projetos WHERE projetos.id = '$projeto'");
        $show_dias->execute();
        $row = $show_dias->fetch(PDO::FETCH_ASSOC);
        $dias_nome = $row["dias"];


        //BUSCA A CLASSIFICAÇÃO ORIGINAL PARA COMPARAR COM A NOVA CLASSIFICAÇÃO
        $pdo = ConnectionN3();
        $show_projeto = $pdo->prepare("SELECT projetos.`tipo`, projetos.`categoria`, projetos.`subcategoria`, projetos.`item`, projetos.`nivel`,/* projetos.`dias`, */
        categorias.cat_nome, projetos.desc_abertura,
        subcategorias.scat_nome
        FROM projetos 
        LEFT JOIN categorias ON categorias.cat_id = projetos.categoria
        LEFT JOIN subcategorias ON subcategorias.scat_id = projetos.subcategoria
        WHERE projetos.id = '$projeto'");
        $show_projeto->execute();
        $row = $show_projeto->fetch(PDO::FETCH_ASSOC);

        $projeto_tipo_original = $row["tipo"];
        if ($projeto_tipo_original == 1) {
          $projeto_tipo_original_nome = "Falha";
        }
        if ($projeto_tipo_original == 2) {
          $projeto_tipo_original_nome = "Relacionamento";
        }
        if ($projeto_tipo_original == 3) {
          $projeto_tipo_original_nome = "Requisição de Serviços";
        }
        if ($projeto_tipo_original == 4) {
          $projeto_tipo_original_nome = "Requisição de informação";
        }
        if ($projeto_tipo_original == 5) {
          $projeto_tipo_original_nome = "Notificação de monitoramento";
        }
        if ($projeto_tipo_original == 0) {
          $projeto_tipo_original_nome = "Não informado";
        }
        $projeto_cat_original = $row["categoria"];
        $projeto_cat_original_nome = $row["cat_nome"];
        $projeto_scat_original = $row["subcategoria"];
        $projeto_scat_original_nome = $row["scat_nome"];
        $projeto_desc_abertura_original = $row["desc_abertura"];

        $projeto_nivel_original = $row["nivel"];
        if ($projeto_nivel_original == 0) {
          $projeto_nivel_original_nome = "Não informado";
        }
        if ($projeto_nivel_original == 1) {
          $projeto_nivel_original_nome = "Nível 1";
        }
        if ($projeto_nivel_original == 2) {
          $projeto_nivel_original_nome = "Nível 2";
        }
        if ($projeto_nivel_original == 3) {
          $projeto_nivel_original_nome = "Nível 3";
        }
        if ($projeto_nivel_original == 4) {
          $projeto_nivel_original_nome = "Rotina";
        }
        if ($projeto_nivel_original == 5) {
          $projeto_nivel_original_nome = "Administrativo";
        }



        /* $projeto_dias_original = $row["dias"];
        $projeto_dias = $row["dias"]; */
        //        if($projeto_nivel_original==0){$projeto_nivel_original_nome="Não informado";}
        //        if($projeto_nivel_original==1){$projeto_nivel_original_nome="Nível 1";}
        //        if($projeto_nivel_original==2){$projeto_nivel_original_nome="Nível 2";}
        //        if($projeto_nivel_original==3){$projeto_nivel_original_nome="Nível 3";}
        //        if($projeto_nivel_original==4){$projeto_nivel_original_nome="Rotina";} 

        //COMPARA O TIPO DO PROJETO:
        //SE DIFERENTE:
        if ($tipo != $projeto_tipo_original) {
          //ALTERA O CÓDIGO DO TIPO NA TABELA DE projetos
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `tipo`='$tipo' WHERE `id`='$projeto';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projeto', '$user_id', '$agora', 'Editou o Tipo: <s>De: $projeto_tipo_original_nome</s> para $projeto_tipo_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do projeto alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }

        //COMPARA O(S) DIAS DO PROJETO:
        /*  //SE DIFERENTE:
        if ($dias != $projeto_dias_original) {
          //ALTERA O CÓDIGO DO NºVEL NA TABELA DE projetos
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `dias`='$dias' WHERE `id`='$projeto';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projeto', '$user_id', '$agora', 'Editou o(s) dia(s): <s>De: $projeto_dias_original</s> para $dias.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Dia(s) do projeto alterado!";
              $mensagem_cor = "alert-success";
            }
          }
        } */

        //COMPARA A CATEGORIA :
        //SE DIFERENTE:
        if ($categoria != $projeto_cat_original) {
          //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE projetos
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `categoria`='$categoria' WHERE `id`='$projeto';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projeto', '$user_id', '$agora', 'Editou a Categoria: <s>De: $projeto_cat_original_nome</s> para $projeto_cat_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do projeto alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }


        //COMPARA A SUBCATEGORIA :
        //SE DIFERENTE:
        if ($subcategoria != $projeto_scat_original) {
          //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE PROJETOS
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `subcategoria`='$subcategoria' WHERE `id`='$projeto';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projeto', '$user_id', '$agora', 'Editou a Sub Categoria: <s>De: $projeto_scat_original_nome</s> para $projeto_scat_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do projeto alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }


        //COMPARA A Descrição de Abertura :
        //SE DIFERENTE:
        if ($desc_abertura != $projeto_desc_abertura_original) {
          //ALTERA O CÓDIGO DA desc_abertura DE ATENDIMENTO NA TABELA DE TAREFAS
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `desc_abertura`='$desc_abertura' WHERE `id`='$projeto';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projeto', '$user_id', '$agora', 'Editou a Descrição de Abertura: <s>De: $projeto_desc_abertura_original</s> para: $desc_abertura.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Descrição de abertura alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }


        //COMPARA O NºVEL DO ATENDIMENTO:
        //SE DIFERENTE:
        if ($nivel != $projeto_nivel_original) {
          //ALTERA O CÓDIGO DO NºVEL NA TABELA DE projetos
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `nivel`='$nivel' WHERE `id`='$projeto';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projeto', '$user_id', '$agora', 'Editou o Nível: <s>De: $projeto_nivel_original_nome</s> para $projeto_nivel_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do projeto alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }
      }


      ///////////////////////////////////////////////////////////////////

      //ACÕES DE GERENCIAMENTO DO PROJETO    
      //TIPOS DE INTERATIVIDADE
      //0 = Agendamento;
      //1 = Abertura de projeto
      //2 = Aceite de projeto
      //3 = Devolução de projeto para fila
      //4 = Transferência de projeto
      //5 = Envio para espera
      //6 = Retomada do projeto
      //7 = Interação com o solicitante
      //8 = Conclusão de projeto
      //9 = Edição de classificação

      //REGISTRAR NOVA INTERAÇÃO
      if ($action == "projeto_new_inter") {
        $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('7', :projeto, '$user_id', '$agora', :inter_desc);");
        $adc->bindParam(':inter_desc', $inter_desc);
        $adc->bindParam(':projeto', $projeto);
        if ($adc->execute()) {
          $mensagem = "<i class=\"fas fa-check\"></i> Interação cadastrada!";
          $mensagem_cor = "alert-success";
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar interação!";
          $mensagem_cor = "alert-danger";
        }
      }

      //USUÁRIO ACEITA INICIAR UM PROJETO
      if ($action == "projeto_aceitar") {
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
        //VERIFICA SE TECNICO ATRIBUÍDO é O PRÓPRIO USUÁRIO
        //SE VERDADEIRO:
        //1 - muda o status do projeto para 2 (projeto EM EXECUÇÃO)
        //2 - registra na tabela de interatividade que o usuário iniciou o projeto.
        if ($tecnico == $user_id) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `tecnico`='$tecnico', `status`='2' WHERE  `id`='$projeto';");
          if ($adc->execute()) {
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('2', '$projeto', '$user_id', '$agora', 'Iniciou o projeto.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> ótimo! <br> O status do projeto foi alterado para 'Em Execução'!";
              $mensagem_cor = "alert-success";
            }
          }
        }
        //SE FALSO:
        //1 - mantem status do projeto como 1 (projeto AGUARDANDO EXECUÇÃO)
        //1 - registra na tabela de projeto o novo técnico responsóvel 
        //2 - busca o NOME do técnico responsóvel
        //3 - registra na tabela de interatividade a atribuição do chamando
        if ($tecnico != $user_id) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `tecnico`='$tecnico', `status`='1' WHERE  `id`='$projeto';");
          if ($adc->execute()) {
            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$projeto', '$user_id', '$agora', 'Direcionou o projeto para $tecnico_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O projeto foi direcionado para $tecnico_nome.";
              $mensagem_cor = "alert-success";
            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o projeto a outro técnico!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o projeto a outro técnico!";
            $mensagem_cor = "alert-danger";
          }
        }
      }

      //USUÁRIO RETOMA UM PROJETO
      if ($action == "projeto_retomar") {
        $pdo = ConnectionN3();

        //altera o status do projeto para 2 (Em execução)
        $edt = $pdo->prepare("UPDATE `projetos` SET `status`='2' WHERE  `id`='$projeto';");
        if ($edt->execute()) {
          //busca o ID do registro de espera, na tabela espera
          $show_espera = $pdo->prepare("SELECT espera_projeto.espera_id FROM espera WHERE espera_projeto.espera_projeto = '$projeto' ORDER BY espera_projeto.espera_id DESC LIMIT 0,1");
          $show_espera->execute();
          $exibe = $show_espera->fetch(PDO::FETCH_ASSOC);
          $espera_id = $exibe["espera_id"];

          //registra A data hora final de espera, na tabela espera
          $edt_espera = $pdo->prepare("UPDATE `espera` SET `espera_end`='$agora' WHERE `espera_id`='$espera_id';");
          if ($edt_espera->execute()) {

            //insere o registro de uma nova interação 
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', '$projeto', '$user_id', '$agora', 'Retomou o projeto.');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> Beleza! <br> Agora vamos descrever as interAções com o cliente!";
              $mensagem_cor = "alert-success";
            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
            $mensagem_cor = "alert-danger";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao retomar o projeto!";
          $mensagem_cor = "alert-danger";
        }
      }

      //USUÁRIO RECUSA UM PROJETO
      if ($action == "projeto_recusar") {
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
        $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        //VERIFICA SE O PROJETO FOI DIRECIONADO PARA OUTRO TÉCNICO
        //SE VERDADEIRO:
        //1 - muda o status do projeto para 1 (aguardando projeto)
        //1 - registra na tabela de projeto o novo técnico responsóvel 
        //2 - busca o NOME do técnico responsóvel
        //2 - registra na tabela de interatividade que o usuário direcionou o projeto.      
        if ($tecnico != 0) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `tecnico`='$tecnico', `status`='1' WHERE `id`='$projeto';");
          if ($adc->execute()) {

            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$projeto', '$user_id', '$agora', 'Direcionou o projeto para $tecnico_nome: <br> $inter_desc');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> projeto direcionado para $tecnico_nome. <br> O que vamos fazer agora?";
              $mensagem_cor = "alert-warning";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o projeto!";
            $mensagem_cor = "alert-danger";
          }
        }
        //SE FALSO:
        //1 - muda o status do projeto para 1 (aguardando projeto)
        //1 - remove o técnico como responsóvel pelo projeto
        //2 - registra na tabela de interatividade que o usuário recusou o projeto.     
        if ($tecnico == 0) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `tecnico`='0', `status`='1' WHERE `id`='$projeto';");
          if ($adc->execute()) {

            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('3', '$projeto', '$user_id', '$agora', 'Recusou o projeto: <br> $inter_desc');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> projeto recusado. <br> O que vamos fazer agora?";
              $mensagem_cor = "alert-warning";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o projeto!";
            $mensagem_cor = "alert-danger";
          }
        }
      }

      //COLOCAR PROJETO EM ESPERA
      if ($action == "projeto_espera") {
        $espera_desc = filter_input(INPUT_POST, 'espera_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $espera_prev = filter_input(INPUT_POST, 'espera_prev', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $espera_prev_br = date('d/m/Y H:i', strtotime($espera_prev));
        $pdo = ConnectionN3();
        //altera status do projeto para 3 (Em espera)
        $edt = $pdo->prepare("UPDATE `projetos` SET `status`='3' WHERE  `id`='$projeto';");
        if ($edt->execute()) {
          //insere registro de espera na tabela de espera
          $adc = $pdo->prepare("INSERT INTO `espera_projeto` (`espera_projeto`, `espera_start`, `espera_prev`, `espera_desc`, `espera_user`) VALUES ('$projeto', '$agora', '$espera_prev', '$espera_desc', '$user_id');");
          if ($adc->execute()) {
            //insere registro da ação na tabela de interatividade
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('5', '$projeto', '$user_id', '$agora', 'Colocou o projeto Em Espera. <br> Previsão de retorno: $espera_prev_br <br> Descrição: $espera_desc');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O projeto foi colocado Em Espera.";
              $mensagem_cor = "alert-warning";
            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao colocar projeto em espera!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao inserir registro na tabela de espera!";
            $mensagem_cor = "alert-danger";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar o status do projeto!";
          $mensagem_cor = "alert-danger";
        }
      }

      //USUÁRIO FINALIZA UM PROJETO
      if ($action == "projeto_finalizar") {
        $desc_fechamento = htmlspecialchars(filter_input(INPUT_POST, 'desc_fechamento', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
        // $desc_fechamento = filter_input(INPUT_POST, 'desc_fechamento', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $adc = $pdo->prepare("UPDATE `projetos` SET `desc_fechamento`=:desc_fechamento, `fechamento`=:fechamento, `status`='4' WHERE  `id`='$projeto';");
        $adc->bindParam(':desc_fechamento', $desc_fechamento);
        $adc->bindParam(':fechamento', $agora);
        if ($adc->execute()) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('8', '$projeto', '$user_id', '$agora', 'Finalizou o projeto. <br> Descrição: $desc_fechamento');");
          if ($adc->execute()) {
            $mensagem = "<i class=\"fas fa-check\"></i> ótimo! <br> O que mais temos para hoje?!";
            $mensagem_cor = "alert-success";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao finalizar o projeto!";
          $mensagem_cor = "alert-danger";
        }
      }

      // CADASTRA NOVA TAREFA
      if ($action == "new_tarefa") {
        $nome_tarefa = htmlspecialchars(filter_input(INPUT_POST, 'nome_tarefa', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
        $cliente = filter_input(INPUT_POST, 'cliente', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pessoa = filter_input(INPUT_POST, 'solicitante', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $local = filter_input(INPUT_POST, 'local', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_NUMBER_INT);
        $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $nivel = filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $desc_abertura = htmlspecialchars(filter_input(INPUT_POST, 'desc_abertura', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
        $dias = filter_input(INPUT_POST, 'dias', FILTER_SANITIZE_NUMBER_INT);
        $abertura = filter_input(INPUT_POST, 'abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $dependencia = filter_input(INPUT_POST, 'dependencia', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        if (strtotime($abertura) > strtotime($agora)) {
          $tarefa_sts = 0;
          $agendamento = date("d/m/Y H:i", strtotime($abertura));
          $inter_msg = "Registrou o Agendamento da Tarefa para $agendamento.";
        } else {
          $tarefa_sts = 1;
          $inter_msg = "Registrou solicitação de Tarefa.";
        }

        $prazo_reincidente = 30;
        $data_reincidente = date("Y-m-d", strtotime($hoje . " - $prazo_reincidente days"));
        $show = $pdo->prepare("SELECT tarefas.id FROM tarefas WHERE tarefas.abertura > '$data_reincidente' AND tarefas.cliente = '$cliente' AND tarefas.categoria = '$categoria' AND tarefas.subcategoria = '$subcategoria'");
        $show->execute();
        $conta_tarefa = $show->rowCount();
        if ($conta_tarefa > 0) {
          $reincidente = 1;
        } else {
          $reincidente = 0;
        }

        $pdo = ConnectionN3();
        $adc = $pdo->prepare("INSERT INTO `tarefas` (`id_projeto`,`nome_tarefa`, `cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `dias`,`tarefas_relacionadas`) VALUES (:id_projeto,:nome_tarefa, :cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, '$reincidente', '$tarefa_sts', :dias , :dependencia);");
        $adc->bindParam(':nome_tarefa', $nome_tarefa);
        $adc->bindParam(':cliente', $cliente);
        $adc->bindParam(':pessoa', $pessoa);
        $adc->bindParam(':local', $local);
        $adc->bindParam(':tipo', $tipo);
        $adc->bindParam(':categoria', $categoria);
        $adc->bindParam(':subcategoria', $subcategoria);
        $adc->bindParam(':item', $item);
        $adc->bindParam(':nivel', $nivel);
        $adc->bindParam(':forma', $forma);
        $adc->bindParam(':desc_abertura', $desc_abertura);
        $adc->bindParam(':abertura', $abertura);
        $adc->bindParam(':tecnico', $tecnico);
        $adc->bindParam(':dias', $dias);
        $adc->bindParam(':id_projeto', $projeto);
        $adc->bindParam(':dependencia', $dependencia);

        if ($adc->execute()) {
          $tarefa = $pdo->lastInsertId();
          $mensagem = "<i class=\"fas fa-check\"></i> Tarefa cadastrada!";
          $mensagem_cor = "alert-success";
          $log = "true";

          $pdo = ConnectionN3();
          $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$tarefa', '$user_id', '$agora', '$inter_msg');");
          $adc->execute();

          if ($tecnico > 0 && $tecnico != $user_id) {
            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$tarefa', '$user_id', '$agora', 'Direcionou o tarefa para $tecnico_nome.')");
            $adc->execute();
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar tarefa!";
          $mensagem_cor = "alert-danger";
          $log = "false";
        }
      }

      // RELACIONAR TAREFAS
      if ($action == "relacionar_tar") {
        $tarefa = filter_input(INPUT_POST, 'tarefa', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $dependencia = filter_input(INPUT_POST, 'dependencia', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        $pdo = ConnectionN3();
        $adc = $pdo->prepare("UPDATE `tarefas` SET `tarefas_relacionadas`='$dependencia' WHERE `id`='$tarefa';");
        if ($adc->execute()) {
          $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Tarefas relacionadas com sucesso";
          $mensagem_cor = "alert-success";
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao relacionar tarefas!";
          $mensagem_cor = "alert-danger";
        }
      }

    }
  }

  // PRG blanket redirect: any POST request redirects to the GET view to avoid form resubmission
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($mensagem)) {
      $_SESSION['projeto_msg'] = $mensagem;
      $_SESSION['projeto_msg_cor'] = $mensagem_cor;
    }

    if (ob_get_length()) {
      ob_clean();
    }

    if (!empty($projeto)) {
      header("Location: projeto.php?projeto=" . urlencode((string)$projeto));
    } else {
      header("Location: projeto.php");
    }
    exit;
  }

  // Recupera mensagem da sessão (após redirect PRG)
  if (isset($_SESSION['projeto_msg'])) {
    $mensagem = $_SESSION['projeto_msg'];
    $mensagem_cor = $_SESSION['projeto_msg_cor'] ?? 'alert-info';
    unset($_SESSION['projeto_msg'], $_SESSION['projeto_msg_cor']);
  }
  ?>
  <?php
  // Verifica de existe o ID de um projeto setado.
  // Se não houver, exibe a parte de CADASTRO projetos
  if (empty($projeto)) {
    if ($m5_01 == 0) {
      header("Location: ../home.php");
    }
  ?>
    <div class="container-fluid">
      <div class="row  justify-content-md-center">
        <div class="col-12 col-sm-12 col-md-11 col-lg-10">
          <div class="card">
            <div class="h6 card-header">
              <i class="fas fa-headset text-danger"></i> Cadastro de solicitação projetos
            </div>
            <div class="card-body py-3">
              <form action="#" method="POST">
                <div class="form-row">
                  <div class="form-group col-sm-12 col-md-4">
                    <label class="my-0 small">Cliente:</label>
                    <select name="cliente" id="cliente" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="1">
                      <option></option>
                      <?php
                      $filterEmpresas = null;

                      if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                        $filterEmpresas .= " AND clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
                      }

                      $sql = "SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1'";

                      if ($filterEmpresas) {
                        $sql .= $filterEmpresas;
                      }

                      $sql .= " ORDER BY clientes.clt_nomef ASC";

                      $pdo = ConnectionN3();
                      $show_clt = $pdo->prepare($sql);
                      $show_clt->execute();
                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $clt_id = $exibe["clt_id"];
                        $clt_nome = $exibe["clt_nomef"];
                      ?>
                        <option value="<?php echo $clt_id; ?>"><?php echo $clt_nome; ?></option>
                      <?php } ?>
                    </select>
                  </div>

                  <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-4">
                    <label class="my-0 small">Solicitante:</label>
                    <span class="carregando small">Carregando...</span>
                    <select name="solicitante" id="solicitante" class="form-control form-control-sm" required="required" tabindex="2">
                      <option></option>
                    </select>
                  </div>

                  <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-4">
                    <label class="my-0 small">Local:</label>
                    <span class="carregando2 small">Carregando...</span>
                    <select name="local" id="local" class="form-control form-control-sm" required="required" tabindex="3">
                      <option></option>
                    </select>
                  </div>
                </div>

                <div class="form-row pt-2">
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Tipo de projeto:</label>
                    <select name="tipo" class="form-control form-control-sm" tabindex="4">
                      <option></option>
                      <option value="1">Falha</option>
                      <option value="2">Relacionamento</option>
                      <option value="3">Requisição de Serviços</option>
                      <option value="4">Requisição de informação</option>
                      <option value="5">Notificação de monitoramento</option>
                      <option value="6">Melhorias</option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Categoria:</label>
                    <select name="categoria" id="categoria" class="form-control form-control-sm" tabindex="5">
                      <option></option>
                      <?php
                      $pdo = ConnectionN3();
                      $show_clt = $pdo->prepare("SELECT categorias.cat_id, categorias.cat_nome FROM categorias WHERE categorias.cat_sts = '1' AND categorias.cat_setor = '1' ORDER BY categorias.cat_nome ASC");
                      $show_clt->execute();
                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $cat_id = $exibe["cat_id"];
                        $cat_nome = $exibe["cat_nome"];
                      ?>
                        <option value="<?php echo $cat_id; ?>"><?php echo $cat_nome; ?></option>
                      <?php } ?>
                    </select>
                  </div>

                  <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Sub Categoria:</label>
                    <span class="carregando3 small">Aguarde, carregando...</span>
                    <select name="subcategoria" id="subcategoria" class="form-control form-control-sm" tabindex="6">
                      <option></option>
                    </select>
                  </div>

                  <!-- Este select será populado por um Java Script, de acordo com o valor escolhido no select 'subcategoria'-->
                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Item:</label>
                    <span class="carregando4 small">Aguarde, carregando...</span>
                    <select name="item" id="item" class="form-control form-control-sm" tabindex="7">
                      <option></option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Nível:</label>
                    <select name="nivel" class="form-control form-control-sm" required="required" tabindex="8">
                      <option></option>
                      <option value="1">Nível 1</option>
                      <option value="2">Nível 2</option>
                      <option value="3">Nível 3</option>
                      <option value="4">Rotina</option>
                      <option value="5">Administrativo</option>
                      <option value="0">NA</option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-2">
                    <!-- <label class="my-0 small">Dias:</label>
                    <input type="number" id="dias2" name="dias" min="1" max="999" class="form-control form-control-sm"  tabindex="8">
                     --><!--                    <select name="dias" class="form-control form-control-sm"  tabindex="8">
                      <option></option>
                      <option value="5">1 dia</option>
                      <option value="6">2 dias</option>
                      <option value="7">5 dias</option>
                      <option value="8">15 dias</option>
                      <option value="9">30 dias</option>
                      <option value="10">60 dias</option>
                      <option value="11">90 dias</option>
                      <option value="0">NA</option>
                    </select> -->
                  </div>
                </div>

                <div class="form-row pt-2">

                  <div class="form-group col-sm-6 col-md-6">
                    <label class="my-0 small">Nome do Projeto:</label>
                    <textarea name="nome_proj" class="form-control form-control-sm" rows="1" tabindex="9"></textarea>
                  </div>
                  <div class="form-group col-sm-6 col-md-6">
                    <label class="my-0 small">Descrição de abertura:</label>
                    <textarea name="desc_abertura" class="form-control form-control-sm" rows="1" tabindex="9"></textarea>
                  </div>

                  <div class="form-group col-sm-6 col-md-6">
                    <div class="form-row">

                      <div class="form-group col-sm-12 col-md-6">
                        <label class="my-0 small">Tecnico:</label>
                        <select name="tecnico" id="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" tabindex="10">
                          <option></option>
                          <option value="0">Não determinado</option>
                          <?php
                          $pdo = ConnectionN3();
                          $show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' AND usuarios.user_id > '1' AND user_funcao >= '8' AND user_funcao <= '14' ORDER BY usuarios.user_nome ASC");
                          $show_clt->execute();
                          while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                            $user_id = $exibe["user_id"];
                            $user_nome = $exibe["user_nome"];
                          ?>
                            <option value="<?php echo $user_id; ?>"><?php echo $user_nome; ?></option>
                          <?php } ?>
                        </select>
                      </div>

                      <div class="form-group col-sm-12 col-md-6">
                        <label class="my-0 small">Forma de projeto:</label>
                        <select name="forma" class="form-control form-control-sm" tabindex="11">
                          <option value="1">Remoto</option>
                          <option value="2">Presencial</option>
                          <option value="1">Remoto - Plantão</option>
                          <option value="2">Presencial - Plantão</option>
                        </select>
                      </div>

                      <div class="form-group col-sm-12 col-md-6">
                        <label class="my-0 small">Abertura:</label>
                        <input type="text" name="abertura" value="<?php echo date("Y-m-d H:i", strtotime($agora)); ?>" readonly class="form-control form-control-sm form_datetime" tabindex="12">
                      </div>

                      <div class="form-group col-sm-12 col-md-6 pt-3 text-center">
                        <input type="hidden" name="token" value="<?php echo $token; ?>">
                        <input type="hidden" name="action" value="projeto_adc">
                        <button type="submit" class="btn btn-danger btn-sm p-1"><i class="fas fa-plus"></i> Iniciar projeto</button>
                      </div>

                    </div>
                  </div>

                </div>

              </form>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE AJUDA PARA CADASTRO projetos -->
    <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
      <div class="modal-dialog" role="document">
        <div class="modal-content">

          <div class="modal-header">
            <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Cadastro de projetos</h6>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          </div>

          <div class="modal-body">
            <p>Em construção...
            </p>
          </div>

        </div>
      </div>
    </div>


  <?php } ?>


  <?php
  // Verifica de existe o ID de um projeto setado.
  // Se não houver, exibe a parte de CADASTRO DE projetos
  if (isset($projeto) && $projeto != 0) { ?>


    <?php
    //  var_dump($projeto);
    //  exit;
    //Busca informações do projeto

    $pdo = ConnectionN3();
    $show_projeto = $pdo->prepare("SELECT projetos.`nome_proj`, projetos.`area`, projetos.`tipo`, projetos.`categoria`, projetos.`subcategoria`, projetos.`item`, projetos.`nivel`, projetos.`local`, projetos.`dias`, projetos.forma, projetos.desc_abertura, projetos.desc_fechamento, projetos.abertura, projetos.fechamento, projetos.reincidente, projetos.`status`, projetos.`tecnico`,
    clientes.clt_id, clientes.clt_nomer, clientes.clt_nomef, clientes.clt_cnpj,
    pessoas.pessoa_nom, pessoas.pessoa_cargo, pessoas.pessoa_tel, pessoas.pessoa_mail,
    locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
    categorias.cat_nome,
    subcategorias.scat_nome,
    itens.itens_nome,
    usuarios.user_nome AS tecnico_nome, usuarios.user_cel AS tecnico_tel, usuarios.user_mail AS tecnico_mail
    FROM projetos 
    INNER JOIN clientes ON clientes.clt_id = projetos.cliente
    LEFT JOIN pessoas ON pessoas.pessoa_id = projetos.pessoa
    LEFT JOIN locais ON locais.local_id = projetos.`local`
    LEFT JOIN categorias ON categorias.cat_id = projetos.categoria
    LEFT JOIN subcategorias ON subcategorias.scat_id = projetos.subcategoria
    LEFT JOIN itens ON itens.itens_id = projetos.item
    LEFT JOIN usuarios ON usuarios.user_id = projetos.tecnico
    WHERE projetos.id = '$projeto'");
    $show_projeto->execute();
    $row = $show_projeto->fetch(PDO::FETCH_ASSOC);
    // $projeto_desc_abertura = $row["desc_abertura"];
    // $projeto_desc_fechamento = $row["desc_fechamento"];
    // $projeto_hora_abertura = $row["abertura"];
    // $projeto_hora_fechamento = $row["fechamento"];
    // $projeto_reincidente = $row["reincidente"];
    // $projeto_status = $row["status"];
    // $projeto_tipo = $row["tipo"];

    $projeto_nome            = $row['nome_proj']       ??  '';
    $projeto_desc_abertura   = $row['desc_abertura']   ??  null;
    $projeto_desc_fechamento = $row['desc_fechamento'] ??  null;
    $projeto_hora_abertura   = $row['abertura']        ??  null;
    $projeto_hora_fechamento = $row['fechamento']     ??  null;
    $projeto_reincidente     = $row['reincidente']    ??  0;
    $projeto_status          = $row['status']         ?? 0;
    $projeto_tipo            = $row['tipo']           ?? null;
    $projeto_tipo_nome       = "Não informado";
    if ($projeto_tipo == 1) {
      $projeto_tipo_nome = "Falha";
    }
    if ($projeto_tipo == 2) {
      $projeto_tipo_nome = "Relacionamento";
    }
    if ($projeto_tipo == 3) {
      $projeto_tipo_nome = "Requisição de Serviços";
    }
    if ($projeto_tipo == 4) {
      $projeto_tipo_nome = "Requisição de informação";
    }
    if ($projeto_tipo == 5) {
      $projeto_tipo_nome = "Notificação de monitoramento";
    }
    if ($projeto_tipo == 0) {
      $projeto_tipo_nome = "Não informado";
    }
    $projeto_dias = $row["dias"] ??  '';
    //    if($projeto_nivel==5){$projeto_nivel_nome="1 dia";}
    //    if($projeto_nivel==6){$projeto_nivel_nome="2 dias";}
    //    if($projeto_nivel==7){$projeto_nivel_nome="5 dias";}
    //    if($projeto_nivel==8){$projeto_nivel_nome="15 dias";}
    //    if($projeto_nivel==9){$projeto_nivel_nome="30 dias";}
    //    if($projeto_nivel==10){$projeto_nivel_nome="60 dias";}
    //    if($projeto_nivel==11){$projeto_nivel_nome="90 dias";}


    $projeto_nivel = $row["nivel"] ??  '';
    $projeto_nivel_nome = "Não informado";
    if ($projeto_nivel == 0) {
      $projeto_nivel_nome = "Não informado";
    }
    if ($projeto_nivel == 1) {
      $projeto_nivel_nome = "Nível 1";
    }
    if ($projeto_nivel == 2) {
      $projeto_nivel_nome = "Nível 2";
    }
    if ($projeto_nivel == 3) {
      $projeto_nivel_nome = "Nível 3";
    }
    if ($projeto_nivel == 4) {
      $projeto_nivel_nome = "Rotina";
    }
    if ($projeto_nivel == 5) {
      $projeto_nivel_nome = "Administrativo";
    }


    // $projeto_forma = $row["forma"] ??  '';

    // $clt_id = $row["clt_id"];
    // $clt_nomer = $row["clt_nomer"];
    // $clt_nomef = $row["clt_nomef"];
    // $clt_cnpj = $row["clt_cnpj"];

    // $pessoa_nom = $row["pessoa_nom"];
    // $pessoa_cargo = $row["pessoa_cargo"];
    // $pessoa_tel = $row["pessoa_tel"];
    // $pessoa_mail = $row["pessoa_mail"];

    // $local = $row["local"];
    // $local_nom = $row["local_nom"];
    // if ($local == 0) {
    //   $local_nom = "Não informado";
    // }
    // $local_end = $row["local_end"];
    // $local_city = $row["local_city"];
    // $local_uf = $row["local_uf"];
    // $projeto_cat = $row["categoria"];
    // $projeto_item = $row["item"];
    // $cat_nome = $row["cat_nome"];
    // $projeto_scat = $row["subcategoria"];
    // $scat_nome = $row["scat_nome"];
    // $projeto_itens_nome = $row["itens_nome"];

    // $tecnico_nome = $row["tecnico_nome"];
    // $tecnico_id = $row["tecnico"];
    // if ($tecnico_id == 0) {
    //   $tecnico_nome = "Não Atribuído";
    // }

    $projeto_forma = $row["forma"] ??  '';

    $clt_id    = $row["clt_id"]    ??  0;
    $clt_nomer = $row["clt_nomer"] ??  '';
    $clt_nomef = $row["clt_nomef"] ??  '';
    $clt_cnpj  = $row["clt_cnpj"]  ??  '';

    $pessoa_nom   = $row["pessoa_nom"]   ??  '';
    $pessoa_cargo = $row["pessoa_cargo"] ??  '';
    $pessoa_tel   = $row["pessoa_tel"]   ??  '';
    $pessoa_mail  = $row["pessoa_mail"]  ??  '';

    $local       = $row["local"]       ??  0;
    $local_nom   = $row["local_nom"]   ?? 'Não informado';
    $local_end   = $row["local_end"]   ??  '';
    $local_city  = $row["local_city"]  ??  '';
    $local_uf    = $row["local_uf"]    ??  '';

    $projeto_cat      = $row["categoria"]   ??  0;
    $projeto_item     = $row["item"]        ?? 0;
    $cat_nome         = $row["cat_nome"]    ??  '';
    $projeto_scat     = $row["subcategoria"] ??  0;
    $scat_nome        = $row["scat_nome"]   ??  '';
    $projeto_itens_nome = $row["itens_nome"] ??  '';

    $tecnico_nome = $row["tecnico_nome"] ??  'Não Atribuído';
    $tecnico_id   = $row["tecnico"]      ?? 0;
    if ($tecnico_id == 0) {
      $tecnico_nome = "Não Atribuído";
    }
    
    if ($projeto_status == 2) {
      $exibe_bt_cont_new_tarefa = true;
    } else {
      $exibe_bt_cont_new_tarefa = false;
    }

    if ($tecnico_id == 0) {
      $exibe_bt_projeto_aceitar = true;
    }

    if ($projeto_status == 1 && $tecnico_id == $user_id) {
      $exibe_bt_projeto_aceitar = true;
    }

    if ($projeto_status == 3 && $tecnico_id == $user_id) {
      $exibe_bt_projeto_retomar = true;
    }

    if ($projeto_status == 2 && $tecnico_id == $user_id) {
      $exibe_bt_projeto_devolver = true;
    }

    if ($m3_02 == 0) {
      $exibe_bt_projeto_aceitar = false;
    }
    if ($m3_04 == 0) {
      $exibe_bt_projeto_devolver = false;
    }

    if ($m3_05 == 2) {
      if ($projeto_status == 3) {
        $exibe_bt_projeto_retomar = true;
      }
      $exibe_bt_projeto_devolver = true;
      if ($projeto_status == 2) {
        $exibe_bt_projeto_espera = true;
      }
    }

    $project_status_labels = [
      0 => 'Projeto agendado',
      1 => 'Aguardando execução',
      2 => 'Projeto em execução',
      3 => 'Projeto em espera',
      4 => 'Projeto finalizado'
    ];
    $project_status_icons = [
      0 => 'far fa-clock',
      1 => 'fas fa-hourglass-half',
      2 => 'fas fa-magic',
      3 => 'far fa-pause-circle',
      4 => 'fas fa-check'
    ];
    $project_status_label = $project_status_labels[(int)$projeto_status] ??  'Não informado';
    $project_status_icon = $project_status_icons[(int)$projeto_status] ??  'fas fa-info-circle';
    $project_status_class = 'project-status-' . (int)$projeto_status;
    $project_deadline = $projeto_hora_abertura ?date("d/m/y H:i", strtotime($projeto_hora_abertura . " +20 hours")) : 'Não informado';

    $pdo = ConnectionN3();
    $show_last_project_inter = $pdo->prepare("SELECT inter_data FROM inter_projeto WHERE inter_projeto = :projeto AND inter_tipo > '0' ORDER BY inter_id DESC LIMIT 1");
    $show_last_project_inter->bindParam(':projeto', $projeto, PDO::PARAM_INT);
    $show_last_project_inter->execute();
    $last_project_inter = $show_last_project_inter->fetch(PDO::FETCH_ASSOC);
    $last_project_inter_label = !empty($last_project_inter['inter_data']) ?date('d/m/y H:i', strtotime($last_project_inter['inter_data'])) : 'Sem interação';

    $time_now = date("Y-m-d H:i:s");
    $pdo = ConnectionN3();
    $show_tarefas = $pdo->prepare("SELECT tarefas.id, tarefas.abertura, tarefas.id_projeto FROM tarefas WHERE tarefas.`status` = '0'");
    $show_tarefas->execute();
    while ($exibe = $show_tarefas->fetch(PDO::FETCH_ASSOC)) {
      $tarefas = $exibe["id"];
      $tarefas_agendamento = $exibe["abertura"];
      if (strtotime($time_now) > strtotime($tarefas_agendamento)) {
        $edt = $pdo->prepare("UPDATE `tarefas` SET `status`='1' WHERE `id`='$tarefas';");
        if ($edt->execute()) {
          $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$tarefas', '1', '$time_now', 'Status do atendimento alterado automaticamente para Aguardando Execução.');");
          if (!$adc->execute()) {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
            $mensagem_cor = "alert-danger";
          }
        }
      }
    }
    ?>

    <div class="container-fluid project-page">
      <div class="row mt-2 h-100">
        <div class="col-lg-9 col-md-12 px-1 project-main-column">
          <div class="project-card project-hero">
            <div class="project-title">
              <div>
                <small>Projeto #<?php echo str_pad($projeto, 5, '0', STR_PAD_LEFT); ?></small>
                <h1><?php echo htmlspecialchars($projeto_nome ?: 'Projeto sem nome'); ?></h1>
              </div>
              <div class="project-title-actions">
                <span class="project-status-badge <?php echo $project_status_class; ?>">
                  <i class="<?php echo $project_status_icon; ?>"></i> <?php echo $project_status_label; ?>
                </span>
                <button type="button" class="btn btn-outline-secondary btn-sm project-info-btn" data-toggle="modal" data-target="#project_info_modal" title="Mais informações">
                  <i class="fas fa-info"></i>
                </button>
              </div>
            </div>

            <div class="project-meta-grid">
              <div class="project-meta-item">
                <span>Cliente</span>
                <strong title="<?php echo htmlspecialchars($clt_nomer); ?>"><?php echo htmlspecialchars($clt_nomer); ?></strong>
              </div>
              <div class="project-meta-item">
                <span>Prazo</span>
                <strong><?php echo $project_deadline; ?></strong>
              </div>
              <div class="project-meta-item">
                <span>Técnico</span>
                <strong title="<?php echo htmlspecialchars($tecnico_nome); ?>"><?php echo htmlspecialchars($tecnico_nome); ?></strong>
              </div>
              <div class="project-meta-item">
                <span>Última interação</span>
                <strong><?php echo $last_project_inter_label; ?></strong>
              </div>
            </div>

            <div class="project-description">
              <strong>Descrição:</strong>
              <?php echo nl2br(htmlspecialchars($projeto_desc_abertura ?: 'Sem descrição informada.')); ?>
            </div>

            <div class="row pt-2 pb-2 mt-3">
              <?php if ($exibe_bt_cont_new_tarefa == true) { ?>
                <div class="col-12 col-md-3 px-1 mb-2">
                  <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#new_tarefa"><i class="fas fa-plus"></i> Adicionar tarefa</button>
                </div>
              <?php } ?>
              <?php if ($exibe_bt_projeto_interacao == true) { ?>
                <div class="col-12 col-md-3 px-1 mb-2">
                  <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_new_inter"><i class="fas fa-headset"></i> Nova interação</button>
                </div>
              <?php } ?>
              <?php if ($exibe_bt_projeto_aceitar == true) { ?>
                <div class="col-12 col-md-3 px-1 mb-2">
                  <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_aceitar"><i class="far fa-arrow-alt-circle-down"></i> Iniciar/Direcionar</button>
                </div>
              <?php } ?>
              <?php if ($exibe_bt_projeto_retomar == true) { ?>
                <div class="col-12 col-md-3 px-1 mb-2">
                  <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_retomar"><i class="far fa-play-circle"></i> Retomar</button>
                </div>
              <?php } ?>
              <?php if ($exibe_bt_projeto_espera == true) { ?>
                <div class="col-12 col-md-3 px-1 mb-2">
                  <button type="button" class="btn btn-outline-warning btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_espera"><i class="far fa-pause-circle"></i> Alterar status</button>
                </div>
              <?php } ?>
              <?php if ($exibe_bt_projeto_finalizar == true) { ?>
                <div class="col-12 col-md-3 px-1 mb-2">
                  <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_finalizar"><i class="far fa-check-circle"></i> Finalizar</button>
                </div>
              <?php } ?>
              <?php if ($exibe_bt_projeto_devolver == true) { ?>
                <div class="col-12 col-md-3 px-1 mb-2">
                  <button type="button" class="btn btn-outline-danger btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_recusar"><i class="far fa-arrow-alt-circle-up"></i> Recusar</button>
                </div>
              <?php } ?>
            </div>
          </div>

          <?php
          $projeto = $_POST['projeto'] ?? $_GET['projeto'] ??  0;
          $f_sts = $_POST['f_sts'] ??  11;
          $f_clt = $_POST['f_clt'] ??  0;
          $p_clt = ($f_clt == 0) ?"%" : $f_clt;
          $f_sol = $_POST['f_sol'] ??  0;
          $p_sol = ($f_clt == 0 || $f_sol == 0) ?"%" : $f_sol;
          $f_tec = $_POST['f_tec'] ??  'all';
          $p_tec = ($f_tec === 'all') ?"%" : $f_tec;
          $ord = $_POST['ord'] ??  'abertura';
          $dir = $_POST['dir'] ??  'ASC';
          $direcao = ($dir === 'DESC') ?'DESC' : 'ASC';
          $status_order = "CASE tarefas.status WHEN 2 THEN 1 WHEN 1 THEN 2 WHEN 3 THEN 3 WHEN 0 THEN 4 WHEN 4 THEN 5 ELSE 6 END";
          $project_return_url = 'projeto.php?projeto=' . urlencode((string)$projeto);
          $task_quick_modals = '';
          $project_technicians = [];
          $pdo = ConnectionN3();
          $show_tecnicos_quick = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' ORDER BY usuarios.user_nome ASC");
          $show_tecnicos_quick->execute();
          while ($tec_row = $show_tecnicos_quick->fetch(PDO::FETCH_ASSOC)) {
            $project_technicians[] = [
              'id' => (int)$tec_row['user_id'],
              'nome' => $tec_row['user_nome'],
            ];
          }
          switch ($ord) {
            case 'tecnico':
              $order_by = "$status_order ASC, tecnico_nome $direcao, tarefas.abertura ASC";
              break;
            case 'status':
              $order_by = "$status_order ASC, tarefas.abertura ASC";
              break;
            case 'forma':
              $order_by = "$status_order ASC, tarefas.forma $direcao, tarefas.abertura ASC";
              break;
            case 'abertura':
            default:
              $order_by = "$status_order ASC, tarefas.abertura $direcao";
              break;
          }
          ?>

          <div class="project-card project-tasks-card">
            <div class="project-section-header">
              <h2><i class="fas fa-tasks"></i> Tarefas do projeto</h2>
              <span class="project-task-meta">Duplo clique em uma tarefa para abrir</span>
            </div>
            <div class="project-tasks-scroll" id="projectTasksScroll">
              <table class="table table-hover small project-tasks-table">
                <thead>
                  <tr>
                    <th style="width: 6%;">ID</th>
                    <th style="width: 32%;">Tarefa</th>
                    <th style="width: 25%;">Classificação</th>
                    <th style="width: 14%;">Abertura</th>
                    <th style="width: 15%;">Técnico</th>
                    <th style="width: 12%;">Status</th>
                    <th style="width: 8%;">Ação</th>
                  </tr>
                </thead>
                <tbody id="projectTasksBody">
                  <?php
                  $pdo = ConnectionN3();
                  $show_tarefas = $pdo->prepare("SELECT tarefas.id as id_tarefa,tarefas.`id_projeto`, tarefas.`nome_tarefa`, tarefas.`tipo`, tarefas.`local`, tarefas.dias, tarefas.forma, tarefas.desc_abertura, tarefas.desc_fechamento, tarefas.abertura, tarefas.fechamento, tarefas.tecnico, tarefas.reincidente, tarefas.tarefas_relacionadas, tarefas.`status`,
                    clientes.clt_id, clientes.clt_nomer, clientes.clt_nomef, clientes.clt_cnpj,
                    pessoas.pessoa_nom, pessoas.pessoa_cargo, pessoas.pessoa_tel, pessoas.pessoa_mail,
                    locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
                    projetos.id,
                    categorias.cat_nome,
                    subcategorias.scat_nome,
                    itens.itens_nome,
                    tarefa_dependencia.status AS dependencia_status,
                    usuarios.user_nome AS tecnico_nome, usuarios.user_cel AS tecnico_tel, usuarios.user_mail AS tecnico_mail
                    FROM tarefas
                    LEFT JOIN pessoas ON pessoas.pessoa_id = tarefas.pessoa
                    LEFT JOIN projetos ON projetos.id = id_projeto
                    INNER JOIN clientes ON clientes.clt_id = projetos.cliente
                    LEFT JOIN locais ON locais.local_id = tarefas.`local`
                    LEFT JOIN categorias ON categorias.cat_id = tarefas.categoria
                    LEFT JOIN subcategorias ON subcategorias.scat_id = tarefas.subcategoria
                    LEFT JOIN itens ON itens.itens_id = tarefas.item
                    LEFT JOIN tarefas tarefa_dependencia ON tarefa_dependencia.id = tarefas.tarefas_relacionadas
                    LEFT JOIN usuarios ON usuarios.user_id = tarefas.tecnico
                    WHERE tarefas.id_projeto = $projeto
                    AND clientes.clt_id LIKE '$p_clt'
                    AND tarefas.tecnico LIKE '$p_tec'
                    AND tarefas.pessoa LIKE '$p_sol'
                    ORDER BY $order_by");
                  $show_tarefas->execute();
                  $task_count = 0;
                  while ($row = $show_tarefas->fetch(PDO::FETCH_ASSOC)) {
                    $task_count++;
                    $tarefa = $row["id_tarefa"];
                    $nome_tarefa = $row["nome_tarefa"];
                    $tarefas_desc_abertura = $row["desc_abertura"];
                    $tarefas_hora_abertura = $row["abertura"];
                    $tarefas_status = (int)$row["status"];
                    $tarefas_forma = $row["forma"];
                    $tarefas_relacionadas = (int)($row["tarefas_relacionadas"] ?? 0);
                    $dependencia_status = isset($row["dependencia_status"]) ? (int)$row["dependencia_status"] : null;
                    $task_modal_suffix = (int)$tarefa;
                    $task_can_start = ($tarefas_relacionadas === 0 || $dependencia_status === 4);
                    $task_title = htmlspecialchars($nome_tarefa ?: 'Tarefa sem nome', ENT_QUOTES, 'UTF-8');

                    if ($tarefas_status === 2) {
                      ob_start();
                      ?>
                      <div class="modal fade" id="project_task_finish_<?php echo $task_modal_suffix; ?>" tabindex="-1" role="dialog">
                        <div class="modal-dialog" role="document">
                          <div class="modal-content">
                            <form action="tarefa.php" method="POST">
                              <div class="modal-header">
                                <h6 class="modal-title"><i class="far fa-check-circle text-primary"></i> Finalizar tarefa #<?php echo $task_modal_suffix; ?></h6>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                              </div>
                              <div class="modal-body">
                                <label class="small"><strong><?php echo $task_title; ?></strong></label>
                                <div class="form-group mb-0">
                                  <label class="my-0 small">Descricao de encerramento:</label>
                                  <textarea name="desc_fechamento" class="form-control form-control-sm" rows="4" required></textarea>
                                </div>
                              </div>
                              <div class="modal-footer">
                                <input type="hidden" name="tarefa" value="<?php echo $task_modal_suffix; ?>">
                                <input type="hidden" name="token" value="<?php echo $token; ?>">
                                <input type="hidden" name="action" value="tarefa_finalizar">
                                <input type="hidden" name="return_to" value="<?php echo htmlspecialchars($project_return_url, ENT_QUOTES, 'UTF-8'); ?>">
                                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                                <button type="submit" class="btn btn-sm btn-primary">Finalizar</button>
                              </div>
                            </form>
                          </div>
                        </div>
                      </div>
                      <?php
                      $task_quick_modals .= ob_get_clean();
                    } elseif ($tarefas_status === 3) {
                      ob_start();
                      ?>
                      <div class="modal fade" id="project_task_resume_<?php echo $task_modal_suffix; ?>" tabindex="-1" role="dialog">
                        <div class="modal-dialog" role="document">
                          <div class="modal-content">
                            <form action="tarefa.php" method="POST">
                              <div class="modal-header">
                                <h6 class="modal-title"><i class="far fa-play-circle text-success"></i> Retomar tarefa #<?php echo $task_modal_suffix; ?></h6>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                              </div>
                              <div class="modal-body">
                                <label class="small"><strong><?php echo $task_title; ?></strong></label>
                                <label class="small">Confirme para retomar a tarefa em espera e colocar novamente em execucao.</label>
                              </div>
                              <div class="modal-footer">
                                <input type="hidden" name="tarefa" value="<?php echo $task_modal_suffix; ?>">
                                <input type="hidden" name="token" value="<?php echo $token; ?>">
                                <input type="hidden" name="action" value="tarefa_retomar">
                                <input type="hidden" name="return_to" value="<?php echo htmlspecialchars($project_return_url, ENT_QUOTES, 'UTF-8'); ?>">
                                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                                <button type="submit" class="btn btn-sm btn-success">Retomar</button>
                              </div>
                            </form>
                          </div>
                        </div>
                      </div>
                      <?php
                      $task_quick_modals .= ob_get_clean();
                    } elseif ($tarefas_status !== 4 && $task_can_start) {
                      ob_start();
                      ?>
                      <div class="modal fade" id="project_task_start_<?php echo $task_modal_suffix; ?>" tabindex="-1" role="dialog">
                        <div class="modal-dialog" role="document">
                          <div class="modal-content">
                            <form action="tarefa.php" method="POST">
                              <div class="modal-header">
                                <h6 class="modal-title"><i class="far fa-play-circle text-success"></i> Iniciar ou direcionar tarefa #<?php echo $task_modal_suffix; ?></h6>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                              </div>
                              <div class="modal-body">
                                <label class="small"><strong><?php echo $task_title; ?></strong></label>
                                <label class="small">Selecione o tecnico responsavel. Se for voce, a tarefa entra em execucao; se for outro tecnico, ela sera direcionada para a fila dele.</label>
                                <div class="form-group mb-0">
                                  <label class="my-0 small">Tecnico responsavel:</label>
                                  <select name="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" required>
                                    <?php foreach ($project_technicians as $tec_option) { ?>
                                      <option value="<?php echo (int)$tec_option['id']; ?>" <?php if ((int)$tec_option['id'] === (int)$user_id) { echo ' selected'; } ?>><?php echo htmlspecialchars($tec_option['nome'], ENT_QUOTES, 'UTF-8'); ?></option>
                                    <?php } ?>
                                  </select>
                                </div>
                              </div>
                              <div class="modal-footer">
                                <input type="hidden" name="tarefa" value="<?php echo $task_modal_suffix; ?>">
                                <input type="hidden" name="token" value="<?php echo $token; ?>">
                                <input type="hidden" name="action" value="tarefa_aceitar">
                                <input type="hidden" name="return_to" value="<?php echo htmlspecialchars($project_return_url, ENT_QUOTES, 'UTF-8'); ?>">
                                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                                <button type="submit" class="btn btn-sm btn-success">Confirmar</button>
                              </div>
                            </form>
                          </div>
                        </div>
                      </div>
                      <?php
                      $task_quick_modals .= ob_get_clean();
                    }
                    $pessoa_nom_tarefa = $row["pessoa_nom"];
                    $cat_nome_tarefa = $row["cat_nome"];
                    $scat_nome_tarefa = $row["scat_nome"];
                    $itens_nome_tarefa = $row["itens_nome"];
                    $tecnico_nome_tarefa = $row["tecnico_nome"] ?: "Não direcionado";
                    $status_labels = [0 => 'Agendada', 1 => 'Aguardando', 2 => 'Em execução', 3 => 'Em espera', 4 => 'Finalizada'];
                    $status_icons = [0 => 'far fa-clock', 1 => 'fas fa-hourglass-half', 2 => 'fas fa-magic', 3 => 'far fa-pause-circle', 4 => 'fas fa-check'];
                    $status_label = $status_labels[$tarefas_status] ??  'Não informado';
                    $status_icon = $status_icons[$tarefas_status] ??  'fas fa-info-circle';
                  ?>
                    <tr class="project-task-row" data-task-row data-tarefa="<?php echo (int)$tarefa; ?>">
                      <td class="align-middle">
                        <span class="project-task-id">#<?php echo (int)$tarefa; ?></span>
                      </td>
                      <td class="align-middle">
                        <span class="project-task-name"><?php echo htmlspecialchars($nome_tarefa ?: 'Tarefa sem nome'); ?></span>
                        <span class="project-task-desc"><?php $task_desc_short = strip_tags(html_entity_decode($tarefas_desc_abertura ??  '', ENT_QUOTES, 'UTF-8')); echo htmlspecialchars(strlen($task_desc_short) > 140 ?substr($task_desc_short, 0, 140) . '...' : $task_desc_short); ?></span>
                        <?php if ($pessoa_nom_tarefa != '') { ?>
                          <span class="project-task-meta"><i class="far fa-user"></i> <?php echo htmlspecialchars($pessoa_nom_tarefa); ?></span>
                        <?php } ?>
                      </td>
                      <td class="align-middle">
                        <div class="project-task-classification">
                          <div class="project-task-classification-line">
                            <?php if ($cat_nome_tarefa != '') { ?><span class="project-chip"><?php echo htmlspecialchars(html_entity_decode($cat_nome_tarefa, ENT_QUOTES, 'UTF-8')); ?></span><?php } ?>
                            <?php if ($scat_nome_tarefa != '') { ?><span class="project-chip"><?php echo htmlspecialchars(html_entity_decode($scat_nome_tarefa, ENT_QUOTES, 'UTF-8')); ?></span><?php } ?>
                            <?php if ($itens_nome_tarefa != '') { ?><span class="project-chip"><?php echo htmlspecialchars(html_entity_decode($itens_nome_tarefa, ENT_QUOTES, 'UTF-8')); ?></span><?php } ?>
                          </div>
                          <div class="project-task-classification-line">
                            <?php if ($tarefas_forma == 1) { ?><span class="project-chip project-chip-forma"><i class="fas fa-laptop-house text-primary"></i> Remoto</span><?php } ?>
                            <?php if ($tarefas_forma == 2) { ?><span class="project-chip project-chip-forma"><i class="fas fa-briefcase text-danger"></i> Presencial</span><?php } ?>
                          </div>
                        </div>
                      </td>
                      <td class="align-middle">
                        <?php echo date('d/m/y', strtotime($tarefas_hora_abertura)); ?><br>
                        <span class="project-task-meta"><?php echo date('H:i', strtotime($tarefas_hora_abertura)); ?></span>
                      </td>
                      <td class="align-middle"><?php echo htmlspecialchars($tecnico_nome_tarefa); ?></td>
                      <td class="align-middle">
                        <span class="project-status-badge project-status-<?php echo $tarefas_status; ?>"><i class="<?php echo $status_icon; ?>"></i> <?php echo $status_label; ?></span>
                      </td>
                      <td class="align-middle text-center">
                        <?php if ($tarefas_status === 4) { ?>
                          <span class="project-task-action-empty" title="Tarefa finalizada sem ações disponíveis" aria-label="Tarefa finalizada sem ações disponíveis"></span>
                        <?php } elseif ($tarefas_status === 2) { ?>
                          <form action="tarefa.php" method="POST" class="project-task-action-form">
                            <input type="hidden" name="tarefa" value="<?php echo (int)$tarefa; ?>">
                            <input type="hidden" name="quick_modal" value="tarefa_finalizar">
                            <button type="submit" class="project-task-action-btn is-finish" title="Abrir finalização da tarefa"><span class="project-action-check"></span></button>
                          </form>
                        <?php } else { ?>
                          <form action="tarefa.php" method="POST" class="project-task-action-form">
                            <input type="hidden" name="tarefa" value="<?php echo (int)$tarefa; ?>">
                            <input type="hidden" name="quick_modal" value="<?php echo $tarefas_status === 3 ? 'tarefa_retomar' : 'tarefa_aceitar'; ?>">
                            <button type="submit" class="project-task-action-btn is-start" title="Abrir início da tarefa"><i class="fas fa-play"></i></button>
                          </form>
                        <?php } ?>
                      </td>
                    </tr>
                  <?php } ?>
                  <?php if ($task_count == 0) { ?>
                    <tr>
                      <td colspan="7" class="text-center text-muted py-4">Nenhuma tarefa cadastrada para este projeto.</td>
                    </tr>
                  <?php } ?>
                </tbody>
              </table>
              <div class="project-load-indicator" id="projectTasksLoader">Carregando mais tarefas...</div>
            </div>
          </div>
          <?php echo $task_quick_modals; ?>
        </div>

        <div class="col-lg-3 col-md-12 px-1 project-history-column">
          <div class="project-card project-history-card">
            <div class="project-section-header">
              <h2><i class="fas fa-list-ol"></i> Interações</h2>
              <span class="project-task-meta">#<?php echo str_pad($projeto, 5, '0', STR_PAD_LEFT); ?></span>
            </div>
            <div class="card-body">
              <div class="project-history-filter">
                <i class="fas fa-filter"></i>
                <span>Registros de Projeto</span>
              </div>
              <div class="timeline">
                <?php
                $pdo = ConnectionN3();
                $show_inter = $pdo->prepare("SELECT inter_projeto.*, usuarios.user_nome FROM inter_projeto INNER JOIN usuarios ON usuarios.user_id = inter_projeto.inter_user WHERE inter_projeto.inter_projeto = '$projeto' AND inter_projeto.inter_tipo > '0' ORDER BY inter_id DESC");
                $show_inter->execute();
                while ($exibe = $show_inter->fetch(PDO::FETCH_ASSOC)) {
                  $inter_tipo = $exibe["inter_tipo"];
                  $inter_data = $exibe["inter_data"];
                  $inter_desc = $exibe["inter_desc"];
                  $inter_user = $exibe["user_nome"];
                  $tl_dot_color = "b-primary";
                  $tl_active_color = "active-primary";
                  if ($inter_tipo == 1) { $tl_dot_color = "b-primary"; $tl_active_color = "active-primary"; }
                  if ($inter_tipo == 2) { $tl_dot_color = "b-success"; $tl_active_color = "active-success"; }
                  if ($inter_tipo == 3) { $tl_dot_color = "b-danger"; $tl_active_color = "active-danger"; }
                  if ($inter_tipo == 4) { $tl_dot_color = "b-warning"; $tl_active_color = "active-warning"; }
                  if ($inter_tipo == 5) { $tl_dot_color = "b-danger"; $tl_active_color = "active-danger"; }
                  if ($inter_tipo == 6) { $tl_dot_color = "b-primary"; $tl_active_color = "active-primary"; }
                  if ($inter_tipo == 7) { $tl_dot_color = "b-primary"; $tl_active_color = "active-primary"; }
                  if ($inter_tipo == 8) { $tl_dot_color = "b-success"; $tl_active_color = "active-success"; }
                  if ($inter_tipo == 9) { $tl_dot_color = "b-danger"; $tl_active_color = "active-danger"; }
                ?>
                  <div class="tl-item <?php echo $tl_active_color; ?>">
                    <div class="tl-dot <?php echo $tl_dot_color; ?>"></div>
                    <div class="tl-content">
                      <div class="tl-date text-muted proj-history-meta"><span class="proj-history-author"><i class="far fa-user"></i> <?php echo htmlspecialchars($inter_user); ?></span> <span><i class="far fa-clock"></i> <?php echo date('d/m/y H:i', strtotime($inter_data)); ?></span></div>
                      <div class="proj-history-desc"><?php echo nl2br(htmlspecialchars($inter_desc)); ?></div>
                    </div>
                  </div>
                <?php } ?>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL NOVA INTERAÇÃO -->
    <div class="modal fade" id="projeto_new_inter" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <h6 class="modal-title"> <i class="fas fa-headset text-primary"></i> Nova Interação</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body py-1">
              <div class="form-row">
                <div class="form-group col-sm-12">
                  <label class="my-0 small"><span style="color: grey;"><b>Descrição da interação:</b></span></label>
                  <textarea name="inter_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
              <input type="hidden" name="token" value="<?php echo $token; ?>">
              <input type="hidden" name="action" value="projeto_new_inter">
              <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
              <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="modal fade" id="relacionar" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <h6 class="modal-title"> <i class="fas fa-edit text-primary"></i> Edição de relação de tarefas</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body py-1">
              <div class="form-row pt-2">

                <div class="form-group col-sm-12 col-md-6">
                  <label class="my-0 small">Tarefas :</label>
                  <select name="tarefa" id="tarefa" class="form-control form-control-sm" required="required" tabindex="5">
                    <option></option>
                    <?php
                    $pdo = ConnectionN3();
                    $tarefas_rel = $pdo->prepare("SELECT tarefas.id, tarefas.nome_tarefa FROM tarefas WHERE tarefas.id_projeto = '$projeto'");
                    $tarefas_rel->execute();
                    while ($exibe = $tarefas_rel->fetch(PDO::FETCH_ASSOC)) {
                      $tarefa_id = $exibe["id"];
                      $tarefa_nom = $exibe["nome_tarefa"];
                    ?>
                      <option value="<?php echo $tarefa_id; ?>" <?php if ($tarefa_id == $projeto_cat) {
                                                                  echo " selected";
                                                                } ?>><?php echo $tarefa_nom; ?></option>
                    <?php } ?>
                  </select>
                </div>

                <div class="form-group col-sm-12 col-md-6">
                  <label class="my-0 small">Dependecia :</label>
                  <select name="dependencia" id="dependencia_rel" class="form-control form-control-sm" required="required" tabindex="5">
                    <option></option>
                    <?php
                    $pdo = ConnectionN3();
                    $tarefas_rel = $pdo->prepare("SELECT tarefas.id, tarefas.nome_tarefa FROM tarefas WHERE tarefas.id_projeto = '$projeto'");
                    $tarefas_rel->execute();
                    while ($exibe = $tarefas_rel->fetch(PDO::FETCH_ASSOC)) {
                      $tarefa_id = $exibe["id"];
                      $tarefa_nom = $exibe["nome_tarefa"];
                    ?>
                      <option value="<?php echo $tarefa_id; ?>" <?php if ($tarefa_id == $projeto_cat) {
                                                                  echo " selected";
                                                                } ?>><?php echo $tarefa_nom; ?></option>
                    <?php } ?>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
              <input type="hidden" name="token" value="<?php echo $token; ?>">
              <input type="hidden" name="action" value="relacionar_tar">
              <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
              <button type="submit" class="btn btn-sm btn-danger">Editar</button>
            </div>
          </form>
        </div>
      </div>
    </div>


    <!-- MODAL INFORMAÇÕES DO PROJETO -->
    <div class="modal fade project-info-modal" id="project_info_modal" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title"><i class="fas fa-info-circle text-primary"></i> Informações do projeto #<?php echo str_pad($projeto, 5, '0', STR_PAD_LEFT); ?></h6>
            <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="project-info-grid">
              <div class="project-info-group">
                <h3><i class="fas fa-building text-primary"></i> Cliente</h3>
                <div class="project-info-line"><span>Razão social</span><strong><?php echo htmlspecialchars($clt_nomer ?: 'Não informado'); ?></strong></div>
                <div class="project-info-line"><span>Fantasia</span><strong><?php echo htmlspecialchars($clt_nomef ?: 'Não informado'); ?></strong></div>
                <div class="project-info-line"><span>CNPJ</span><strong><?php echo htmlspecialchars($clt_cnpj ?: 'Não informado'); ?></strong></div>
              </div>

              <div class="project-info-group">
                <h3><i class="fas fa-user-tag text-primary"></i> Solicitante</h3>
                <div class="project-info-line"><span>Nome</span><strong><?php echo htmlspecialchars($pessoa_nom ?: 'Não informado'); ?></strong></div>
                <div class="project-info-line"><span>Cargo</span><strong><?php echo htmlspecialchars($pessoa_cargo ?: 'Não informado'); ?></strong></div>
                <div class="project-info-line"><span>Telefone</span><strong><?php echo htmlspecialchars($pessoa_tel ?: 'Não informado'); ?></strong></div>
                <div class="project-info-line"><span>E-mail</span><strong><?php echo htmlspecialchars($pessoa_mail ?: 'Não informado'); ?></strong></div>
              </div>

              <div class="project-info-group">
                <h3><i class="fas fa-map-marked-alt text-primary"></i> Local</h3>
                <div class="project-info-line"><span>Nome</span><strong><?php echo htmlspecialchars($local_nom ?: 'Não informado'); ?></strong></div>
                <div class="project-info-line"><span>Endereço</span><strong><?php echo htmlspecialchars($local_end ?: 'Não informado'); ?></strong></div>
                <div class="project-info-line"><span>Cidade/UF</span><strong><?php echo htmlspecialchars(trim(($local_city ?: '') . ' / ' . ($local_uf ?: ''), ' /') ?: 'Não informado'); ?></strong></div>
              </div>

              <div class="project-info-group">
                <h3><i class="fas fa-layer-group text-primary"></i> Classificação</h3>
                <div class="project-info-line"><span>Tipo</span><strong><?php echo htmlspecialchars($projeto_tipo_nome ?: 'Não informado'); ?></strong></div>
                <div class="project-info-line"><span>Categoria</span><strong><?php echo htmlspecialchars($cat_nome ?: 'Não informado'); ?></strong></div>
                <div class="project-info-line"><span>Subcategoria</span><strong><?php echo htmlspecialchars($scat_nome ?: 'Não informado'); ?></strong></div>
                <div class="project-info-line"><span>Item</span><strong><?php echo htmlspecialchars(html_entity_decode($projeto_itens_nome ?: 'Não informado', ENT_QUOTES, 'UTF-8')); ?></strong></div>
                <div class="project-info-line"><span>Nível</span><strong><?php echo htmlspecialchars($projeto_nivel_nome ?: 'Não informado'); ?></strong></div>
                <div class="project-info-line"><span>Forma</span><strong><?php echo $projeto_forma == 1 ?'Remoto' : ($projeto_forma == 2 ?'Presencial' : 'Não informado'); ?></strong></div>
              </div>

              <div class="project-info-group">
                <h3><i class="fas fa-clipboard-list text-primary"></i> Dados técnicos</h3>
                <div class="project-info-line"><span>Abertura</span><strong><?php echo $projeto_hora_abertura ?date('d/m/y H:i', strtotime($projeto_hora_abertura)) : 'Não informado'; ?></strong></div>
                <div class="project-info-line"><span>Prazo</span><strong><?php echo $project_deadline; ?></strong></div>
                <div class="project-info-line"><span>Dias</span><strong><?php echo htmlspecialchars((string)($projeto_dias ?: 'Não informado')); ?></strong></div>
                <div class="project-info-line"><span>Reincidente</span><strong><?php echo $projeto_reincidente == 1 ?'Sim' : 'Não'; ?></strong></div>
                <div class="project-info-line"><span>Fechamento</span><strong><?php echo $projeto_hora_fechamento ?date('d/m/y H:i', strtotime($projeto_hora_fechamento)) : 'Não informado'; ?></strong></div>
              </div>

              <div class="project-info-group">
                <h3><i class="fas fa-align-left text-primary"></i> Descrição de fechamento</h3>
                <div class="project-info-line"><span>Relato</span><strong><?php echo nl2br(htmlspecialchars($projeto_desc_fechamento ?: 'Não informado')); ?></strong></div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
            <?php if ($m3_01 == 3) { ?>
              <button type="button" class="btn btn-sm btn-primary" id="openProjectEditFromInfo"><i class="far fa-edit"></i> Alterar classificação</button>
            <?php } ?>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL EDIÇÃO DA CLASSIFICAÇÃO DO PROJETO-->
    <div class="modal fade" id="projeto_edt" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <h6 class="modal-title"> <i class="fas fa-edit text-primary"></i> Edição da classificação do projeto</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body py-1 d-flex flex-column">
              <div class="form-row pt-2">
                <div class="form-group col-sm-6 col-md-4">
                  <label class="my-0 small">Tipo de projeto:</label>
                  <select name="tipo" class="form-control form-control-sm" required="required" tabindex="4">
                    <option></option>
                    <option value="1" <?php if ($projeto_tipo == 1) {
                                        echo " selected";
                                      } ?>>Falha</option>
                    <option value="2" <?php if ($projeto_tipo == 2) {
                                        echo " selected";
                                      } ?>>Relacionamento</option>
                    <option value="3" <?php if ($projeto_tipo == 3) {
                                        echo " selected";
                                      } ?>>Requisição de Serviços</option>
                    <option value="4" <?php if ($projeto_tipo == 4) {
                                        echo " selected";
                                      } ?>>Requisição de informação</option>
                    <option value="5" <?php if ($projeto_tipo == 5) {
                                        echo " selected";
                                      } ?>>Notificação de monitoramento</option>
                    <option value="6" <?php if ($projeto_tipo == 6) {
                                        echo " selected";
                                      } ?>>Melhorias</option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Categoria:</label>
                  <select name="categoria" id="categoria" class="form-control form-control-sm" required="required" tabindex="5">
                    <option></option>
                    <?php
                    $pdo = ConnectionN3();
                    $show_clt = $pdo->prepare("SELECT categorias.cat_id, categorias.cat_nome FROM categorias WHERE categorias.cat_sts = '1' AND categorias.cat_setor = '1' ORDER BY categorias.cat_nome ASC");
                    $show_clt->execute();
                    while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                      $cat_id = $exibe["cat_id"];
                      $cat_nome = $exibe["cat_nome"];
                    ?>
                      <option value="<?php echo $cat_id; ?>" <?php if ($cat_id == $projeto_cat) {
                                                                echo " selected";
                                                              } ?>><?php echo $cat_nome; ?></option>
                    <?php } ?>
                  </select>
                </div>

                <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Sub Categoria:</label>
                  <span class="carregando3 small">Aguarde, carregando...</span>
                  <select name="subcategoria" id="subcategoria" class="form-control form-control-sm" required="required" tabindex="6">
                    <option value="<?php echo $projeto_scat; ?>"><?php echo $scat_nome; ?></option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-4">
                  <label class="my-0 small">Item:</label>
                  <span class="carregando4 small">Aguarde, carregando...</span>
                  <select name="item" id="item" class="form-control form-control-sm" required="required" tabindex="7">
                    <option value="<?php echo $projeto_item; ?>"><?php echo $projeto_itens_nome; ?></option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Nível:</label>
                  <select name="nivel" class="form-control form-control-sm" required="required" tabindex="8">
                    <option></option>
                    <option value="1" <?php if ($projeto_nivel == 1) {
                                        echo " selected";
                                      } ?>>Nível 1</option>
                    <option value="2" <?php if ($projeto_nivel == 2) {
                                        echo " selected";
                                      } ?>>Nível 2</option>
                    <option value="3" <?php if ($projeto_nivel == 3) {
                                        echo " selected";
                                      } ?>>Nível 3</option>
                    <option value="4" <?php if ($projeto_nivel == 4) {
                                        echo " selected";
                                      } ?>>Rotina</option>
                    <option value="5" <?php if ($projeto_nivel == 5) {
                                        echo " selected";
                                      } ?>>Administrativo</option>
                    <option value="0" <?php if ($projeto_nivel == 0) {
                                        echo " selected";
                                      } ?>>NA</option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Forma de atendimento:</label>
                  <select name="forma" class="form-control form-control-sm" required="required" tabindex="9">
                    <option></option>
                    <option value="1" <?php if ($projeto_forma == 1) {
                                        echo " selected";
                                      } ?>>Remoto</option>
                    <option value="2" <?php if ($projeto_forma == 2) {
                                        echo " selected";
                                      } ?>>Presencial</option>
                    <option value="3" <?php if ($projeto_forma == 3) {
                                        echo " selected";
                                      } ?>>Remoto - Plantão</option>
                    <option value="4" <?php if ($projeto_forma == 4) {
                                        echo " selected";
                                      } ?>>Presencial - Plantão</option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-10">
                  <label class="my-0 small">Descrição de abertura:</label>
                  <textarea name="desc_abertura" class="form-control form-control-sm" rows="5" required="required" tabindex="9"><?php echo htmlspecialchars($projeto_desc_abertura); ?></textarea>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <!-- <label class="my-0 small">Dias:</label>
                  <input type="number" id="dias" name="dias" min="1" max="999" value="<?php echo $projeto_dias; ?>" class="form-control form-control-sm" required="required" tabindex="7">
                   --><!--                    <select name="dias" class="form-control form-control-sm" required="required" tabindex="7">
                      <option></option>
                      <option value="5"</?php if($projeto_nivel==1){ echo" selected";}?>>1</option>
                      <option value="6"</?php if($projeto_nivel==2){ echo" selected";}?>>2</option>
                      <option value="7"</?php if($projeto_nivel==3){ echo" selected";}?>>3</option>
                      <option value="8"</?php if($projeto_nivel==4){ echo" selected";}?>>Rotina</option>
                      <option value="9"</?php if($projeto_nivel==0){ echo" selected";}?>>NA</option>
                      <option value="10"</?php if($projeto_nivel==0){ echo" selected";}?>>NA</option>
                      <option value="11"</?php if($projeto_nivel==0){ echo" selected";}?>>NA</option>
                    </select> -->
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
              <input type="hidden" name="token" value="<?php echo $token; ?>">
              <input type="hidden" name="action" value="projeto_edt">
              <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
              <button type="submit" class="btn btn-sm btn-danger">Editar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <?php if ($exibe_bt_projeto_aceitar == true) { ?>
      <!-- MODAL ACEITE DO CHAMADO -->
      <div class="modal fade" id="projeto_aceitar" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <form action="#" method="POST">
              <div class="modal-header">
                <h6 class="modal-title"><i class="far fa-arrow-alt-circle-down text-success"></i> Iniciar projeto ou direcionar para outro Tecnico</h6>
                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <label class="small"><strong>Iniciar o projeto:</strong></label>
                <label class="small">Se o técnico informado for o próprio usuário: a) este projeto ficará sob sua responsabilidade; b) o status do projeto será alterado para "Em execução".</label>
                <label class="small pt-1"><strong>Direcionar a outro técnico:</strong></label>
                <label class="small">Se o técnico informado NºO for o próprio usuário: a) este projeto será redirecionado para a fila de projetos do técnico informado; b) este projeto contuará com o status "Aguardando projeto" até que o técnico responsóvel confirme o início da execução.</label>
                <label class="small pt-1">Não esqueça de informar todas as interação com o cliente.</label>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Tecnico responsóvel:</label>
                    <select name="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="9">
                      <?php
                      $pdo = ConnectionN3();
                      $show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' ORDER BY usuarios.user_nome ASC");
                      $show_clt->execute();
                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $tecnico_id = $exibe["user_id"];
                        $tecnico_nome = $exibe["user_nome"];
                      ?>
                        <option value="<?php echo $tecnico_id; ?>" <?php if ($tecnico_id == $user_id) {
                                                                      echo " selected";
                                                                    } ?>><?php echo $tecnico_nome; ?></option>
                      <?php } ?>
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="projeto_aceitar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_projeto_retomar == true) { ?>
      <!-- MODAL RETOMAR PROJETO -->
      <div class="modal fade" id="projeto_retomar" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h6 class="modal-title"><i class="far fa-arrow-alt-circle-down"></i> Retomar</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <label class="small">Confirmação de retomada do projeto.</label>
              <label class="small">Este projeto estava aguardando o retorno de um terceiro. Ao retomar este projeto ele ficará sob sua responsabilidade. Não esqueça de informar todas as interação com o cliente.</label>
            </div>
            <div class="modal-footer">
              <form action="#" method="POST">
                <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="projeto_retomar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Retomar o projeto</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_projeto_espera == true) { ?>
      <!-- MODAL COLOCAR EM ESPERA -->
      <div class="modal fade" id="projeto_espera" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <form action="#" method="POST">
              <div class="modal-header">
                <h6 class="modal-title"><i class="far fa-pause-circle text-warning"></i> Colocar projeto em espera</h6>
                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <label class="small">projetos em Espera são aqueles que não podem ser finalizados pois é preciso aguardar um retorno de alguém <b> externo </b> a Nível 3 TI.</label>
                <label class="small">Ao colocar em espera: a) este projeto continuará sob a sua responsabilidade; b) o status do projeto será alterado para "Em espera"; c) Após o período de espera, o status do projeto será alterado para "Em Execução".</label>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Motivo da espera:</label>
                    <textarea name="espera_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Data prevista para encerramento da espera:</label>
                    <input type="text" id="datetimepicker" name="espera_prev" value="<?php echo date("Y-m-d H:i", strtotime($agora . " +2 days")); ?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="2">
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="projeto_espera">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Colocar em espera</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_projeto_devolver == true) { ?>
      <!-- MODAL RECUSAR PROJETO -->
      <div class="modal fade" id="projeto_recusar" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <form action="#" method="POST">
              <div class="modal-header">
                <h6 class="modal-title"><i class="far fa-arrow-alt-circle-up text-danger"></i> Recusar ou direcionar projeto</h6>
                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <div class="form-row">
                  <label class="small"><strong>Recusar projeto:</strong></label>
                  <label class="small">Ao confirmar esta tela SEM informar um técnico: a) o projeto voltará para a fila de projeto sem um responsóvel; b) este projeto contuará com o status "Aguardando projeto" até que um técnico o aceite.</label>
                  <label class="small pt-1"><strong>Direcionar projeto:</strong></label>
                  <label class="small">Ao confirmar esta tela informando um técnico responsóvel: a) este projeto será redirecionado para a fila de projetos do técnico informado; b) este projeto contuará com o status "Aguardando projeto" até que o técnico responsóvel confirme o início da execução.</label>
                  <label class="small pt-1">Não esqueça de informar todas as interação com o cliente.</label>
                </div>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Tecnico responsóvel:</label>
                    <select name="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="9">
                      <option value="0">Não atribuído</option>
                      <?php
                      $pdo = ConnectionN3();
                      $show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' ORDER BY usuarios.user_nome ASC");
                      $show_clt->execute();
                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $tecnico_id = $exibe["user_id"];
                        $tecnico_nome = $exibe["user_nome"];
                      ?>
                        <option value="<?php echo $tecnico_id; ?>"><?php echo $tecnico_nome; ?></option>
                      <?php } ?>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Justificativa para recusa ou direcionamento:</label>
                    <textarea name="inter_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="projeto_recusar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-danger">Recusar projeto</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_projeto_finalizar == true) { ?>
      <!-- MODAL FINALIZAR PROJETO -->
      <div class="modal fade" id="projeto_finalizar" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <form action="#" method="POST">
              <div class="modal-header">
                <h6 class="modal-title"><i class="far fa-check-circle text-primary"></i> Finalizar</h6>
                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body py-1">
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small"><span style="color: grey;"><b>Descrição de encerramento:</b></span></label>
                    <textarea name="desc_fechamento" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="projeto_finalizar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>


    <?php
    // Prefill do modal de nova tarefa com base na última tarefa do projeto.
    $prefill_tarefa = [
      'solicitante' => 0,
      'local' => 0,
      'tipo' => 0,
      'categoria' => 0,
      'subcategoria' => 0,
      'item' => 0,
      'nivel' => 0,
      'tecnico' => 0,
      'forma' => 0,
      'dependencia' => 0,
      'dias' => ''
    ];
    $has_prefill_tarefa = false;

    if (!empty($projeto)) {
      $pdo = ConnectionN3();
      $show_last_tarefa = $pdo->prepare("SELECT pessoa, local, tipo, categoria, subcategoria, item, nivel, tecnico, forma, tarefas_relacionadas, dias FROM tarefas WHERE id_projeto = :projeto ORDER BY id DESC LIMIT 1");
      $show_last_tarefa->bindParam(':projeto', $projeto, PDO::PARAM_INT);
      $show_last_tarefa->execute();
      $last_tarefa = $show_last_tarefa->fetch(PDO::FETCH_ASSOC);

      if ($last_tarefa) {
        $has_prefill_tarefa = true;
        $prefill_tarefa['solicitante'] = (int)($last_tarefa['pessoa'] ??  0);
        $prefill_tarefa['local'] = (int)($last_tarefa['local'] ??  0);
        $prefill_tarefa['tipo'] = (int)($last_tarefa['tipo'] ??  0);
        $prefill_tarefa['categoria'] = (int)($last_tarefa['categoria'] ??  0);
        $prefill_tarefa['subcategoria'] = (int)($last_tarefa['subcategoria'] ??  0);
        $prefill_tarefa['item'] = (int)($last_tarefa['item'] ??  0);
        $prefill_tarefa['nivel'] = (int)($last_tarefa['nivel'] ??  0);
        $prefill_tarefa['tecnico'] = (int)($last_tarefa['tecnico'] ??  0);
        $prefill_tarefa['forma'] = (int)($last_tarefa['forma'] ??  0);
        $dependencia_bruta = trim((string)($last_tarefa['tarefas_relacionadas'] ??  ''));
        if ($dependencia_bruta !== '') {
          $dependencia_lista = explode(',', $dependencia_bruta);
          $prefill_tarefa['dependencia'] = (int)$dependencia_lista[0];
        }
        $dias_ultima_tarefa = (int)($last_tarefa['dias'] ??  0);
        $prefill_tarefa['dias'] = $dias_ultima_tarefa > 0 ?$dias_ultima_tarefa : '';
      }
    }
    ?>

    <!-- MODAL NOVA TAREFA -->
    <div class="modal fade" id="new_tarefa" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-xl" role="document">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <h6 class="modal-title"><i class="fas fa-plus text-danger"></i> Cadastro de solicitação de tarefa</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body py-1">
              <div class="form-row pt-2">
                <div class="form-group col-sm-6 col-md-6">
                  <!-- você pode colocar campos adicionais aqui se necessário -->
                </div>

                <div class="card-body py-3">
                  <div class="form-row">
                    <div class="form-group col-sm-6 col-md-4">
                      <label class="my-0 small">Selecione o Projeto:</label>
                      <!-- <select id="cliente" class="form-control form-control-sm selectpicker" data-live-search="true" required disabled>
                        <option></option>
                        <?php
                        $pdo = ConnectionN3();
                        $show_clt = $pdo->prepare("SELECT projetos.id, projetos.nome_proj, projetos.cliente FROM projetos INNER JOIN CLIENTES ON PROJETOS.CLIENTE = CLIENTEs.clt_ID ORDER BY projetos.nome_proj ASC");
                        $show_clt->execute();

                        $cliente_do_projeto_selecionado = '';

                        while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                          $id = $exibe["id"];
                          $nome_proj = $exibe["nome_proj"];
                          $cliente_id_atual  = $exibe["cliente"];

                          $selecionado = '';
                          if ($id == $projeto) {
                            $selecionado = ' selected';
                            // Se for, guarde o ID do cliente
                            $cliente_do_projeto_selecionado = $cliente_id_atual;
                          }
                        ?>
                          <option value="<?php echo $id; ?>" <?php echo $selecionado; ?>>
                            #<?php echo $id ?>: <?php echo $nome_proj; ?>
                          </option> <?php } ?>
                      </select> -->
                      <select id="cliente" class="form-control form-control-sm selectpicker" data-live-search="true" required disabled>
                        <option></option>
                        <?php
                        $pdo = ConnectionN3();
                        $show_clt = $pdo->prepare("SELECT projetos.id, projetos.nome_proj, projetos.cliente FROM projetos INNER JOIN CLIENTES ON PROJETOS.CLIENTE = CLIENTEs.clt_ID ORDER BY projetos.nome_proj ASC");
                        $show_clt->execute();

                        // Esta variável guardará o cliente do projeto pré-selecionado para envio no formulário. SUA LÓGICA AQUI ESTÁ CORRETA.
                        $cliente_do_projeto_selecionado = '';

                        while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                          $id_projeto_atual = $exibe["id"];
                          $nome_proj = $exibe["nome_proj"];
                          $id_cliente_atual = $exibe["cliente"]; // ID do cliente associado ao projeto

                          $selecionado = '';
                          if ($id_projeto_atual == $projeto) {
                            $selecionado = ' selected';
                            // Guarda o cliente correto para o input hidden. SUA LÓGICA AQUI ESTÁ CORRETA.
                            $cliente_do_projeto_selecionado = $id_cliente_atual;
                          }
                        ?>
                          <option value="<?php echo $id_cliente_atual; ?>" <?php echo $selecionado; ?>>
                            #<?php echo $id_projeto_atual ?>: <?php echo $nome_proj; ?>
                          </option>
                        <?php } ?>
                      </select>
                    </div>

                    <!-- Campo hidden para envio do cliente_id -->
                    <input type="hidden" name="cliente" value="<?php echo $cliente_do_projeto_selecionado; ?>">

                    <div class="form-group col-sm-6 col-md-4">
                      <label class="my-0 small">Solicitante:</label>
                      <span class="carregando small">Carregando...</span>
                      <select name="solicitante" id="solicitante2" class="form-control form-control-sm" required tabindex="2">
                        <option></option>
                      </select>
                    </div>

                    <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                    <div class="form-group col-sm-6 col-md-4">
                      <label class="my-0 small">Local:</label>
                      <span class="carregando2 small">Carregando...</span>
                      <select name="local" id="local2" class="form-control form-control-sm" required="required" tabindex="3">
                        <option></option>
                      </select>
                    </div>
                  </div>

                  <div class="form-row pt-2">
                    <div class="form-group col-sm-6 col-md-3">
                      <label class="my-0 small">Tipo de atendimento:</label>
                      <select name="tipo" class="form-control form-control-sm" required="required" tabindex="4">
                        <option></option>
                        <option value="1" <?php if ($prefill_tarefa['tipo'] === 1) {
                                            echo 'selected';
                                          } ?>>Falha</option>
                        <option value="2" <?php if ($prefill_tarefa['tipo'] === 2) {
                                            echo 'selected';
                                          } ?>>Relacionamento</option>
                        <option value="3" <?php if ($prefill_tarefa['tipo'] === 3) {
                                            echo 'selected';
                                          } ?>>Requisição de Serviços</option>
                        <option value="4" <?php if ($prefill_tarefa['tipo'] === 4) {
                                            echo 'selected';
                                          } ?>>Requisição de informação</option>
                        <option value="5" <?php if ($prefill_tarefa['tipo'] === 5) {
                                            echo 'selected';
                                          } ?>>Notificação de monitoramento</option>
                      </select>
                    </div>

                    <div class="form-group col-sm-6 col-md-3">
                      <label class="my-0 small">Categoria:</label>
                      <select name="categoria" id="categoria2" class="form-control form-control-sm" required="required" tabindex="5">
                        <option></option>
                        <?php
                        $pdo = ConnectionN3();
                        $show_clt = $pdo->prepare("SELECT categorias.cat_id, categorias.cat_nome FROM categorias WHERE categorias.cat_sts = '1' AND categorias.cat_setor = '1' ORDER BY categorias.cat_nome ASC");
                        $show_clt->execute();
                        while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                          $cat_id = $exibe["cat_id"];
                          $cat_nome = $exibe["cat_nome"];
                        ?>
                          <option value="<?php echo $cat_id; ?>" <?php if ((int)$cat_id === $prefill_tarefa['categoria']) {
                                                                    echo 'selected';
                                                                  } ?>><?php echo $cat_nome; ?></option>
                        <?php } ?>
                      </select>
                    </div>

                    <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                    <div class="form-group col-sm-6 col-md-2">
                      <label class="my-0 small">Sub Categoria:</label>
                      <span class="carregando3 small">Aguarde, carregando...</span>
                      <select name="subcategoria" id="subcategoria2" class="form-control form-control-sm" required="required" tabindex="6">
                        <option></option>
                      </select>
                    </div>

                    <!-- Este select será populado por um Java Script, de acordo com o valor escolhido no select 'subcategoria'-->
                    <div class="form-group col-sm-6 col-md-2">
                      <label class="my-0 small">Item:</label>
                      <span class="carregando4 small">Aguarde, carregando...</span>
                      <select name="item" id="item2" class="form-control form-control-sm" required="required" tabindex="7">
                        <option></option>
                      </select>
                    </div>

                    <div class="form-group col-sm-6 col-md-2">
                      <label class="my-0 small">Nível:</label>
                      <select name="nivel" class="form-control form-control-sm" required="required" tabindex="8">
                        <option></option>
                        <option value="1" <?php if ($prefill_tarefa['nivel'] === 1) {
                                            echo 'selected';
                                          } ?>>Nível 1</option>
                        <option value="2" <?php if ($prefill_tarefa['nivel'] === 2) {
                                            echo 'selected';
                                          } ?>>Nível 2</option>
                        <option value="3" <?php if ($prefill_tarefa['nivel'] === 3) {
                                            echo 'selected';
                                          } ?>>Nível 3</option>
                        <option value="4" <?php if ($prefill_tarefa['nivel'] === 4) {
                                            echo 'selected';
                                          } ?>>Rotina</option>
                        <option value="5" <?php if ($prefill_tarefa['nivel'] === 5) {
                                            echo 'selected';
                                          } ?>>Administrativo</option>
                        <option value="0" <?php if ($prefill_tarefa['nivel'] === 0 && $has_prefill_tarefa) {
                                            echo 'selected';
                                          } ?>>NA</option>
                      </select>
                    </div>
                  </div>






                  <div class="form-row pt-2">

                    <div class="form-group col-sm-6 col-md-6">
                      <label class="my-0 small">Nome da Tarefa:</label>
                      <textarea name="nome_tarefa" class="form-control form-control-sm" rows="1" required="required" tabindex="9"></textarea>
                    </div>
                    <div class="form-group col-sm-6 col-md-6">
                      <label class="my-0 small">Descrição de abertura:</label>
                      <textarea name="desc_abertura" class="form-control form-control-sm" rows="1" required="required" tabindex="9"></textarea>
                    </div>

                    <div class="form-group col-sm-12 col-md-12">
                      <div class="form-row">

                        <div class="form-group col-sm-3 col-md-3">
                          <label class="my-0 small">Tecnico:</label>
                          <select name="tecnico" id="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="10">
                            <option></option>
                            <option value="0" <?php if ($prefill_tarefa['tecnico'] === 0 && $has_prefill_tarefa) {
                                                echo 'selected';
                                              } ?>>Não determinado</option>
                            <?php
                            $pdo = ConnectionN3();
                            $show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' AND usuarios.user_id > '1' ORDER BY usuarios.user_nome ASC");
                            $show_clt->execute();
                            while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                              $tec_opt_id = (int)$exibe["user_id"];
                              $tec_opt_nome = $exibe["user_nome"];
                            ?>
                              <option value="<?php echo $tec_opt_id; ?>" <?php if ($tec_opt_id === $prefill_tarefa['tecnico']) {
                                                                            echo 'selected';
                                                                          } ?>><?php echo $tec_opt_nome; ?></option>
                            <?php } ?>
                          </select>
                        </div>

                        <div class="form-group col-sm-3 col-md-3">
                          <label class="my-0 small">Forma de atendimento:</label>
                          <select name="forma" class="form-control form-control-sm" required="required" tabindex="12">
                            <option value="1" <?php if ($prefill_tarefa['forma'] === 1) {
                                                echo 'selected';
                                              } ?>>Remoto</option>
                            <option value="2" <?php if ($prefill_tarefa['forma'] === 2) {
                                                echo 'selected';
                                              } ?>>Presencial</option>
                            <option value="3" <?php if ($prefill_tarefa['forma'] === 3) {
                                                echo 'selected';
                                              } ?>>Remoto - Plantão</option>
                            <option value="4" <?php if ($prefill_tarefa['forma'] === 4) {
                                                echo 'selected';
                                              } ?>>Presencial - Plantão</option>
                          </select>
                        </div>

                        <div class="form-group col-sm-3 col-md-3">
                          <label class="my-0 small">Dependecia :</label>
                          <select name="dependencia" id="dependencia" class="form-control form-control-sm" tabindex="11">
                            <option></option>
                            <?php
                            $pdo = ConnectionN3();
                            $tarefas_rel = $pdo->prepare("SELECT tarefas.id, tarefas.nome_tarefa FROM tarefas WHERE tarefas.id_projeto = '$projeto'");
                            $tarefas_rel->execute();
                            while ($exibe = $tarefas_rel->fetch(PDO::FETCH_ASSOC)) {
                              $tarefa_id = $exibe["id"];
                              $tarefa_nom = $exibe["nome_tarefa"];
                            ?>
                              <option value="<?php echo $tarefa_id; ?>" <?php if ((int)$tarefa_id === $prefill_tarefa['dependencia']) {
                                                                          echo " selected";
                                                                        } ?>><?php echo $tarefa_nom; ?></option>
                            <?php } ?>
                          </select>
                        </div>

                        <div class="form-group col-sm-3 col-md-3">
                          <label class="my-0 small">Dias:</label>
                          <input type="number" id="dias" name="dias" min="1" max="999" value="<?php echo $prefill_tarefa['dias']; ?>" class="form-control form-control-sm" required="required" tabindex="8">
                        </div>
                      </div>


                      <div class="form-row">
                        <div class="form-group col-sm-3 col-md-3">
                          <label class="my-0 small">Abertura:</label>
                          <input type="text" name="abertura" value="<?php echo date("Y-m-d H:i", strtotime($agora)); ?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="12">
                        </div>


                        <div class="form-group col-sm-12 col-md-6 pt-3 text-center mt-2">
                          <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
                          <input type="hidden" name="token" value="<?php echo $token; ?>">
                          <input type="hidden" name="action" value="new_tarefa">


                          <button type="submit" class="btn btn-danger btn-sm p-1"><i class="fas fa-plus"></i> Adicionar Tarefa</button>
                        </div>

                      </div>
                      <!-- <button type="button" class="btn btn-sm btn-secondary " data-dismiss="modal" aria-label="Fechar">Fechar</button> -->



                    </div>

                  </div>

                </div>
              </div>


          </form>
        </div>
      </div>

    </div>

    </div>

    </div>
  <?php } ?>
  </div>
  </div>
  <!-- MODAL DE AJUDA PARA A GESTÃO DE UM PROJETO -->
  <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
      <div class="modal-content">

        <div class="modal-header">
          <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Gestão do projeto</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        </div>

        <div class="modal-body">
          <p><strong>O projeto deve ser gerido da seguinte forma:</strong></p>
          <ul class="list">
            <li>Registre tudo através de <span class="badge badge-light"><i class="fas fa-headset"></i> Nova Interação </span>
              <ul>
                <li class="small">Comentários do cliente, informações que você observar e o trabalho que você executou devem ser registrados.</li>
                <li class="small">Cada registro que você fizer será exibido no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Histórico do projeto</span> com a data/hora e o seu nome.</li>
              </ul>
            </li>
            <li class="pt-1">Iniciei a execução do projeto através do <span class="badge badge-light"><i class="far fa-arrow-alt-circle-down"></i> Iniciar ou Direcionar</span>
              <ul>
                <li class="small">Se você for o técnico que executará o projeto, apenas confirme o seu nome como <em>Tecnico Resposável</em>.</li>
                <li class="small">Quando você confirmar seu nome como <em>Tecnico Resposável</em> pelo projeto outras opçães de gestão do projeto aparecerão na sua tela.</li>
                <li class="small">Se não for você quem executará o projeto, você pode também informar quem será o técnico que deverá executar o projeto.</li>
                <li class="small">Cada ação que você fizer será exibida no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Histórico do projeto</span> com a data/hora e o seu nome.</li>
              </ul>
            </li>
            <li class="pt-1">Você pode usar o recurso <span class="badge badge-light"><i class="far fa-pause-circle"></i> Colocar em Espera</span> caso o projeto precise ser <em>pausado</em> enquanto aguarda um retorno externo.
              <ul>
                <li class="small">Mas, este recurso só deve ser utilizado quando estamos aguardando um retorno de alguém externo a Nível 3 TI.</li>
                <li class="small">Você precisará informar uma Data/Hora futura como previsão para encessamento da espera.</li>
                <li class="small">Quando você colocar um projeto em espera o prazo para finalizar será <em>pausado</em>.</li>
                <li class="small">Quando o prazo estabelecido <em>vencer</em> o projeto voltará para o status <span class="badge badge-light"><i class="fas fa-magic"></i> Em Execução</span>.</li>
              </ul>
            </li>
            <li class="pt-1">Você pode usar o recurso <span class="badge badge-light"><i class="far fa-arrow-alt-circle-up"></i> Recusar</span> para <em>devolver</em> o projeto a fila de espera ou tranferí-lo para outro técnico.
              <ul>
                <li class="small">Para fazer isso, você terá que inserir uma justificativa.</li>
                <li class="small">Cada ação que você fizer será exibida no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Histórico do projeto</span> com a data/hora e o seu nome.</li>
              </ul>
            </li>
            <li class="pt-1">Você deve <span class="badge badge-light"><i class="far fa-check-circle"></i> Finalizar</span> o projeto quando o problema do cliente for sanado.
              <ul>
                <li class="small">Para fazer isso, você terá que inserir um relato de encerramento.</li>
                <li class="small">Procure descrever bem o trabalho que você realizou e com quais pessoas você falou.</li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>


  <?php include_once("../all/update_pass.php"); ?>
  <script src="../js/bootstrap.min.js"></script>
  <script src="../js/jquery-3.6.0.min.js"></script>
  <script src="../js/bootstrap.bundle.min.js"></script>
  <script src="../js/bootstrap-select.min.js"></script>
  <script src="../js/bootstrap-datetimepicker.js"></script>


  <script>
    $('.selectpicker').selectpicker();
  </script>
  <script>
    window.novaTarefaPrefill = {
      solicitante: <?php echo (int)($prefill_tarefa['solicitante'] ??  0); ?>,
      local: <?php echo (int)($prefill_tarefa['local'] ??  0); ?>,
      categoria: <?php echo (int)($prefill_tarefa['categoria'] ??  0); ?>,
      subcategoria: <?php echo (int)($prefill_tarefa['subcategoria'] ??  0); ?>,
      item: <?php echo (int)($prefill_tarefa['item'] ??  0); ?>
    };
    window.novaTarefaPrefillApplied = {
      solicitante: false,
      local: false,
      subcategoria: false,
      item: false
    };
  </script>

  <?php if (empty($projeto) || $exibe_bt_projeto_espera == true) { ?>
    <!-- CAMPO DE DATA E HORA DA TELA DE ESPERA -->
    <script type="text/javascript" src="../js/bootstrap-datetimepicker.js" charset="UTF-8"></script>

    <script type="text/javascript">
      $.fn.datetimepicker.dates['en'] = {
        format: 'dd/mm/yyyy',
        days: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"],
        daysShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
        daysMin: ["Do", "Se", "Te", "Qu", "Qu", "Se", "Sa", "Do"],
        months: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
        monthsShort: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
        today: "Hoje",
        suffix: [],
        meridiem: []
      };
    </script>
    <script type="text/javascript">
      $(".form_datetime").datetimepicker({
        format: "yyyy-mm-dd hh:ii"
      });
    </script>
  <?php } ?>


  <!-- loader e os js abaixo são necessários para popular os selects dependentes (solicitante, local e subcategoria) -->
  <!-- <script src="../js/loader.js" type="text/javascript"></script> -->

  <script type="text/javascript">
    //pupula os selects solicitante e local de acordo com o cliente escolhido
    $(document).ready(function() {
      $('#cliente').change(function() {
        // console.log('entrou no change', $(this).val())
        if ($(this).val()) {
          // console.log('tem?');
          $('#solicitante').hide();
          $('#solicitante2').hide();
          $('#local').hide();
          $('#local2').hide();
          $('.carregando').show();
          $('.carregando2').show();
          $.getJSON('busca_solicitantes.php?search=', {
            cliente: $(this).val(),
            ajax: 'true'
          }, function(j) {
            var options = '<option value="">Escolha o solicitante</option>';
            for (var i = 0; i < j.length; i++) {
              options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
            }
            // console.log(options)
            $('#solicitante2').html(options).show();
            $('#solicitante').html(options).show();
            if (!window.novaTarefaPrefillApplied.solicitante && window.novaTarefaPrefill.solicitante > 0) {
              $('#solicitante2').val(String(window.novaTarefaPrefill.solicitante));
              window.novaTarefaPrefillApplied.solicitante = true;
            }
            $('.carregando').hide();
          });
          $.getJSON('busca_locais.php?search=', {
            cliente: $(this).val(),
            ajax: 'true'
          }, function(j) {
            var options = '<option value="">Escolha o local</option>';
            for (var i = 0; i < j.length; i++) {
              options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
            }
            $('#local2').html(options).show();
            $('#local').html(options).show();
            if (!window.novaTarefaPrefillApplied.local && window.novaTarefaPrefill.local > 0) {
              $('#local2').val(String(window.novaTarefaPrefill.local));
              window.novaTarefaPrefillApplied.local = true;
            }
            $('.carregando2').hide();
          });
        } else {
          $('#solicitante').html('<option value="">Escolha o Solicitante</option>');
          $('#local').html('<option value="">Escolha o Local</option>');
        }
      });

    });

    $(document).ready(function() {
      $('#cliente').trigger("change")
    });
  </script>

  <script type="text/javascript">
    //pupula os selects subcategoria de acordo com a categoria escolhida
    $(function() {
      $('#categoria').change(function() {
        if ($(this).val()) {
          $('#subcategoria').hide();
          $('.carregando3').show();
          $.getJSON('busca_subcategorias.php?search=', {
            categoria: $(this).val(),
            ajax: 'true'
          }, function(j) {
            var options = '<option value="">Escolha a Subcategoria</option>';
            for (var i = 0; i < j.length; i++) {
              options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
            }
            $('#subcategoria').html(options).show();
            $('.carregando3').hide();
          });

        } else {
          $('#subcategoria').html('<option value="">Escolha a Subcategoria</option>');
        }
      });
    });
  </script>

  <script type="text/javascript">
    //pupula os selects ITEM de acordo com a SUBcategoria escolhida
    $(function() {
      $('#subcategoria').change(function() {
        if ($(this).val()) {
          $('#item').hide();
          $('.carregando4').show();
          $.getJSON('busca_itens.php?search=', {
            subcategoria: $(this).val(),
            ajax: 'true'
          }, function(j) {
            var options = '<option value="">Escolha o Item</option>';
            for (var i = 0; i < j.length; i++) {
              options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
            }
            $('#item').html(options).show();
            $('.carregando4').hide();
          });
        } else {
          $('#item').html('<option value="">Escolha o Item</option>');
        }
      });
    });
  </script>



  <!-- loader e os js abaixo são necessários para popular os selects dependentes (solicitante, local e subcategoria) -->
  <!-- <script src="../js/loader.js" type="text/javascript">
  </script> -->

  <?php if (empty($new_tarefa)) { ?>
    <script type="text/javascript">
      //pupula os selects solicitante 2 e local 2 de acordo com o cliente escolhido
      $(function() {
        $('#cliente').change(function() {
          if ($(this).val()) {
            $('#solicitante2').hide();
            $('#local2').hide();
            $('.carregando').show();
            $('.carregando').show();
            $.getJSON('busca_solicitantes.php?search=', {
              cliente: $(this).val(),
              ajax: 'true'
            }, function(j) {
              var options = '<option value="">Escolha o solicitante</option>';
              for (var i = 0; i < j.length; i++) {
                options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
              }
              $('#solicitante2').html(options).show();
              if (!window.novaTarefaPrefillApplied.solicitante && window.novaTarefaPrefill.solicitante > 0) {
                $('#solicitante2').val(String(window.novaTarefaPrefill.solicitante));
                window.novaTarefaPrefillApplied.solicitante = true;
              }
              $('.carregando').hide();
            });
            $.getJSON('busca_locais.php?search=', {
              cliente: $(this).val(),
              ajax: 'true'
            }, function(j) {
              var options = '<option value="">Escolha o local</option>';
              for (var i = 0; i < j.length; i++) {
                options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
              }
              $('#local2').html(options).show();
              if (!window.novaTarefaPrefillApplied.local && window.novaTarefaPrefill.local > 0) {
                $('#local2').val(String(window.novaTarefaPrefill.local));
                window.novaTarefaPrefillApplied.local = true;
              }
              $('.carregando2').hide();
            });
          } else {
            $('#solicitante2').html('<option value="">Escolha o Solicitante</option>');
            $('#local2').html('<option value="">Escolha o Local</option>');
          }
        });
      });
    </script>

  <?php } ?>
  <script type="text/javascript">
    //pupula os selects subcategoria 2 de acordo com a categoria escolhida
    $(function() {
      $('#categoria2').change(function() {
        if ($(this).val()) {
          $('#subcategoria2').hide();
          $('.carregando3').show();
          $.getJSON('busca_subcategorias.php?search=', {
            categoria: $(this).val(),
            ajax: 'true'
          }, function(j) {
            var options = '<option value="">Escolha a Subcategoria</option>';
            for (var i = 0; i < j.length; i++) {
              options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
            }
            $('#subcategoria2').html(options).show();
            if (!window.novaTarefaPrefillApplied.subcategoria && window.novaTarefaPrefill.subcategoria > 0) {
              $('#subcategoria2').val(String(window.novaTarefaPrefill.subcategoria)).trigger('change');
              window.novaTarefaPrefillApplied.subcategoria = true;
            }
            $('.carregando3').hide();
          });

        } else {
          $('#subcategoria2').html('<option value="">Escolha a Subcategoria</option>');
        }
      });
    });
  </script>

  <script type="text/javascript">
    //pupula os selects ITEM 2 de acordo com a SUBcategoria escolhida
    $(function() {
      $('#subcategoria2').change(function() {
        if ($(this).val()) {
          $('#item2').hide();
          $('.carregando4').show();
          $.getJSON('busca_itens.php?search=', {
            subcategoria: $(this).val(),
            ajax: 'true'
          }, function(j) {
            var options = '<option value="">Escolha o Item</option>';
            for (var i = 0; i < j.length; i++) {
              options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
            }
            $('#item2').html(options).show();
            if (!window.novaTarefaPrefillApplied.item && window.novaTarefaPrefill.item > 0) {
              $('#item2').val(String(window.novaTarefaPrefill.item));
              window.novaTarefaPrefillApplied.item = true;
            }
            $('.carregando4').hide();
          });
        } else {
          $('#item2').html('<option value="">Escolha o Item</option>');
        }
      });
    });
  </script>
  <script type="text/javascript">
    $(document).ready(function() {
      if (window.novaTarefaPrefill && window.novaTarefaPrefill.categoria > 0) {
        $('#categoria2').val(String(window.novaTarefaPrefill.categoria)).trigger('change');
      }
    });
  </script>

  <script>
    (function() {
      var openProjectEditFromInfo = document.getElementById('openProjectEditFromInfo');
      if (openProjectEditFromInfo && window.jQuery) {
        openProjectEditFromInfo.addEventListener('click', function() {
          $('#project_info_modal').one('hidden.bs.modal', function() {
            $('#projeto_edt').modal('show');
          });
          $('#project_info_modal').modal('hide');
        });
      }

      var taskRows = Array.prototype.slice.call(document.querySelectorAll('[data-task-row]'));
      var taskScroll = document.getElementById('projectTasksScroll');
      var loader = document.getElementById('projectTasksLoader');
      var pageSize = 30;
      var visibleCount = 0;

      document.querySelectorAll('.project-task-action-form').forEach(function(form) {
        form.addEventListener('submit', function(event) {
          var tarefaInput = form.querySelector('input[name="tarefa"]');
          var modalInput = form.querySelector('input[name="quick_modal"]');
          var tarefa = tarefaInput ? tarefaInput.value : '';
          var quickModal = modalInput ? modalInput.value : '';
          var target = '';

          if (quickModal === 'tarefa_finalizar') {
            target = '#project_task_finish_' + tarefa;
          } else if (quickModal === 'tarefa_retomar') {
            target = '#project_task_resume_' + tarefa;
          } else if (quickModal === 'tarefa_aceitar') {
            target = '#project_task_start_' + tarefa;
          }

          if (target && window.jQuery && $(target).length) {
            event.preventDefault();
            $(target).modal('show');
            if ($.fn.selectpicker) {
              $(target).find('.selectpicker').selectpicker('refresh');
            }
            return;
          }

          if (target) {
            event.preventDefault();
          }
        });
      });

      function showMoreTasks() {
        if (!taskRows.length) {
          return;
        }

        var nextCount = Math.min(visibleCount + pageSize, taskRows.length);
        for (var i = visibleCount; i < nextCount; i++) {
          taskRows[i].classList.remove('is-hidden');
        }
        visibleCount = nextCount;

        if (loader) {
          loader.classList.toggle('is-visible', visibleCount < taskRows.length);
          loader.textContent = visibleCount < taskRows.length ?'Role até o fim para carregar mais tarefas' : 'Todas as tarefas foram exibidas';
        }
      }

      taskRows.forEach(function(row) {
        row.classList.add('is-hidden');
        row.addEventListener('dblclick', function(event) {
          if (event.target.closest('button, form, input, select, textarea, a')) {
            return;
          }

          var tarefa = row.getAttribute('data-tarefa');
          if (!tarefa) {
            return;
          }

          var form = document.createElement('form');
          form.method = 'POST';
          form.action = 'tarefa.php';

          var input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'tarefa';
          input.value = tarefa;

          form.appendChild(input);
          document.body.appendChild(form);
          form.submit();
        });
      });

      if (taskScroll) {
        taskScroll.addEventListener('scroll', function() {
          if (taskScroll.scrollTop + taskScroll.clientHeight >= taskScroll.scrollHeight - 80) {
            showMoreTasks();
          }
        });
      }

      showMoreTasks();
    })();
  </script>

</body>

</html>
