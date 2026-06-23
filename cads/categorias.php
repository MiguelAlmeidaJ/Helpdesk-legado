<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");
$flashMessage = $_SESSION['category_flash'] ?? null;
unset($_SESSION['category_flash']);

if ($m2_04 == 0) {
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

function h($value)
{
  return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function setor_label($setor)
{
  if ($setor == 1) {
    return ['class' => 'service-ti', 'icon' => 'fas fa-microchip', 'label' => 'TI'];
  }
  if ($setor == 3) {
    return ['class' => 'service-devops', 'icon' => 'fas fa-chart-bar', 'label' => 'ADM'];
  }
  if ($setor == 2) {
    return ['class' => 'service-mkt', 'icon' => 'fas fa-bullhorn', 'label' => 'MKT'];
  }

  return ['class' => '', 'icon' => 'fas fa-layer-group', 'label' => 'Sem setor'];
}

$action = post_text('action');
if ($usar_token == "true") {
  if ($action) {
    $categoryActionPermissions = [
      'new_cat' => [(int)$m2_04, 2],
      'edt_cat' => [(int)$m2_04, 3],
      'new_scat' => [(int)$m2_05, 2],
      'edt_scat' => [(int)$m2_05, 3],
      'new_item' => [(int)$m2_06, 2],
      'edt_item' => [(int)$m2_06, 3],
    ];

    if (isset($categoryActionPermissions[$action]) && $categoryActionPermissions[$action][0] < $categoryActionPermissions[$action][1]) {
      $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Você não tem permissão para executar esta ação.";
      $mensagem_cor = "alert-danger";
      $log = "false";
      $action = '';
    }

    if ($action == "alterar_senha") {
      include_once("../all/update_senha.php");
    }

    if ($action == "new_cat") {
      $cat_nome = post_text('cat_nome');
      $cat_setor = filter_input(INPUT_POST, 'cat_setor', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $adc = $pdo->prepare("INSERT INTO `categorias` (`cat_nome`, `cat_setor`, `cat_sts`) VALUES (:cat_nome, :cat_setor, '1');");
      $adc->bindParam(':cat_nome', $cat_nome);
      $adc->bindParam(':cat_setor', $cat_setor);
      if ($adc->execute()) {
        $mensagem = "<i class=\"fas fa-check\"></i> Categoria cadastrada com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      } else {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar categoria!";
        $mensagem_cor = "alert-danger";
        $log = "false";
      }
    }

    if ($action == "edt_cat") {
      $cat_id = filter_input(INPUT_POST, 'cat_id', FILTER_SANITIZE_NUMBER_INT);
      $cat_nome = post_text('cat_nome');
      $cat_setor = filter_input(INPUT_POST, 'cat_setor', FILTER_SANITIZE_NUMBER_INT);
      $cat_sts = filter_input(INPUT_POST, 'cat_sts', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $edt = $pdo->prepare("UPDATE `categorias` SET `cat_nome`=:cat_nome, `cat_setor`=:cat_setor, `cat_sts`=:cat_sts WHERE `cat_id`=:cat_id;");
      $edt->bindParam(':cat_nome', $cat_nome);
      $edt->bindParam(':cat_setor', $cat_setor);
      $edt->bindParam(':cat_sts', $cat_sts);
      $edt->bindParam(':cat_id', $cat_id);
      if ($edt->execute()) {
        $mensagem = "<i class=\"fas fa-check\"></i> Categoria editada com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      } else {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar Categoria!";
        $mensagem_cor = "alert-danger";
        $log = "false";
      }
    }

    if ($action == "new_scat") {
      $scat_nome = post_text('scat_nome');
      $scat_cat = filter_input(INPUT_POST, 'scat_cat', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $adc = $pdo->prepare("INSERT INTO `subcategorias` (`scat_cat`, `scat_nome`, `scat_sts`) VALUES (:scat_cat, :scat_nome, '1');");
      $adc->bindParam(':scat_cat', $scat_cat);
      $adc->bindParam(':scat_nome', $scat_nome);
      if ($adc->execute()) {
        $mensagem = "<i class=\"fas fa-check\"></i> Sub Categoria cadastrada com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      } else {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar Sub Categoria!";
        $mensagem_cor = "alert-danger";
        $log = "false";
      }
    }

    if ($action == "new_item") {
      $itens_nome = post_text('itens_nome');
      $itens_scat = filter_input(INPUT_POST, 'itens_scat', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $adc = $pdo->prepare("INSERT INTO `itens` (`itens_scat`, `itens_nome`, `itens_sts`) VALUES (:itens_scat, :itens_nome, '1');");
      $adc->bindParam(':itens_scat', $itens_scat);
      $adc->bindParam(':itens_nome', $itens_nome);
      if ($adc->execute()) {
        $mensagem = "<i class=\"fas fa-check\"></i> Item cadastrado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      } else {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar Item!";
        $mensagem_cor = "alert-danger";
        $log = "false";
      }
    }

    if ($action == "edt_scat") {
      $scat_id = filter_input(INPUT_POST, 'scat_id', FILTER_SANITIZE_NUMBER_INT);
      $scat_nome = post_text('scat_nome');
      $scat_sts = filter_input(INPUT_POST, 'scat_sts', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $edt = $pdo->prepare("UPDATE `subcategorias` SET `scat_nome`=:scat_nome, `scat_sts`=:scat_sts WHERE `scat_id`=:scat_id;");
      $edt->bindParam(':scat_nome', $scat_nome);
      $edt->bindParam(':scat_sts', $scat_sts);
      $edt->bindParam(':scat_id', $scat_id);
      if ($edt->execute()) {
        $mensagem = "<i class=\"fas fa-check\"></i> Sub Categoria editada com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      } else {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar Sub Categoria!";
        $mensagem_cor = "alert-danger";
        $log = "false";
      }
    }

    if ($action == "edt_item") {
      $itens_id = filter_input(INPUT_POST, 'itens_id', FILTER_SANITIZE_NUMBER_INT);
      $itens_nome = post_text('itens_nome');
      $itens_sts = filter_input(INPUT_POST, 'itens_sts', FILTER_SANITIZE_NUMBER_INT);

      $pdo = ConnectionN3();
      $edt = $pdo->prepare("UPDATE `itens` SET `itens_nome`=:itens_nome, `itens_sts`=:itens_sts WHERE `itens_id`=:itens_id;");
      $edt->bindParam(':itens_nome', $itens_nome);
      $edt->bindParam(':itens_sts', $itens_sts);
      $edt->bindParam(':itens_id', $itens_id);
      if ($edt->execute()) {
        $mensagem = "<i class=\"fas fa-check\"></i> Item editado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      } else {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar Item!";
        $mensagem_cor = "alert-danger";
        $log = "false";
      }
    }
  }

  if (isset($mensagem) && isset($mensagem_cor)) {
    $_SESSION['category_flash'] = [
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
  <title>Allterus</title>
</head>

<style>
  html {
    min-height: 100%;
  }

  body.category-dashboard {
    zoom: 1;
    min-height: 100dvh;
    width: 100%;
    overflow-x: hidden;
    background: #f6f8fb;
    color: #0f172a;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }

  body.category-dashboard,
  body.category-dashboard input,
  body.category-dashboard button,
  body.category-dashboard select,
  body.category-dashboard textarea,
  body.category-dashboard .modal,
  body.category-dashboard .card,
  body.category-dashboard .table {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }

  .category-page {
    min-height: 100dvh;
    padding: 14px 18px 18px;
  }

  .category-page-card {
    min-height: calc(100dvh - 32px);
    border: 1px solid #dbe3ef;
    border-radius: 8px;
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .category-page-card .card-header {
    flex: 0 0 auto;
    background: #fff;
    border-bottom: 1px solid #d9e0ea;
  }

  .category-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px;
  }

  .category-title-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .category-title-icon {
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

  .category-page-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.25;
    color: #111827;
  }

  .category-page-subtitle {
    margin: 2px 0 0;
    color: #64748b;
    font-size: .82rem;
    line-height: 1.3;
  }

  .category-add-button {
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

  .category-add-button:hover {
    background: #0d6efd;
    color: #fff !important;
  }

  .category-page-card .card-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    background: #fbfdff;
  }

  .category-scroll {
    height: 100%;
    max-height: calc(100dvh - 126px);
    overflow: auto;
  }

  .category-list {
    min-width: 860px;
    padding: 12px;
  }

  .category-block {
    border: 1px solid #dbe3ef;
    border-radius: 8px;
    background: #fff;
    overflow: hidden;
    margin-bottom: 10px;
  }

  .category-block:last-child {
    margin-bottom: 0;
  }

  .category-block.is-inactive {
    opacity: .72;
  }

  .category-block-header {
    display: grid;
    grid-template-columns: 38px minmax(240px, 1fr) 130px 118px 138px;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: #fff;
    border-bottom: 1px solid #edf1f6;
  }

  .category-block-header:hover {
    background: #f8fbff;
  }

  .category-children {
    position: relative;
    padding: 12px 14px 14px 54px;
    background: #f8fafc;
  }

  .category-children::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 31px;
    border-left: 1px dashed #cbd5e1;
  }

  .subcategory-panel {
    position: relative;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    overflow: hidden;
    margin-bottom: 10px;
  }

  .subcategory-panel::before {
    content: "";
    position: absolute;
    top: 19px;
    left: -23px;
    width: 22px;
    border-top: 1px dashed #cbd5e1;
  }

  .subcategory-panel:last-child {
    margin-bottom: 0;
  }

  .subcategory-panel.is-inactive {
    opacity: .72;
  }

  .subcategory-header {
    display: grid;
    grid-template-columns: 30px minmax(240px, 1fr) 118px 138px;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: #fff;
    border-bottom: 1px solid #edf1f6;
  }

  .item-list {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px 10px 42px;
    background: #fbfdff;
  }

  .item-list::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 26px;
    border-left: 1px dashed #d8e0eb;
  }

  .item-row {
    position: relative;
    display: grid;
    grid-template-columns: 30px minmax(220px, 1fr) 118px 138px;
    align-items: center;
    gap: 12px;
    min-height: 36px;
    padding: 7px 10px;
    border: 1px solid #e8eef6;
    border-radius: 6px;
    background: #fff;
  }

  .item-row::before {
    content: "";
    position: absolute;
    top: 18px;
    left: -17px;
    width: 16px;
    border-top: 1px dashed #d8e0eb;
  }

  .item-row.is-inactive {
    opacity: .72;
  }

  .item-row:hover {
    border-color: #bfdbfe;
    background: #f8fbff;
  }

  .item-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: #111827;
    font-size: .88rem;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .item-title i {
    color: #94a3b8;
  }

  .hierarchy-caret {
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    color: #64748b;
    background: #f8fafc;
    border: 1px solid #d8e0eb;
  }

  button.hierarchy-caret {
    cursor: pointer;
  }

  button.hierarchy-caret:hover {
    color: #0b5ed7;
    border-color: #bfdbfe;
    background: #eef6ff;
  }

  .hierarchy-caret.is-item {
    width: 22px;
    height: 22px;
    font-size: .72rem;
    background: #fff;
  }

  .category-toggle {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    color: #475569;
    border: 1px solid #d8e0eb;
    background: #fff;
  }

  .category-toggle:hover {
    color: #0b5ed7;
    border-color: #bfdbfe;
    background: #eef6ff;
    text-decoration: none;
  }

  .category-name {
    min-width: 0;
  }

  .category-name-main {
    color: #111827;
    font-weight: 650;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .category-name-sub {
    margin-top: 2px;
    color: #64748b;
    font-size: .78rem;
  }

  .category-status-badge,
  .category-sector-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    width: fit-content;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: .8rem;
    font-weight: 600;
    line-height: 1;
    border: 1px solid transparent;
    white-space: nowrap;
  }

  .category-status-badge.is-active {
    background: #ecfdf3;
    color: #067647;
    border-color: #b7ebc6;
  }

  .category-status-badge.is-inactive {
    background: #f8fafc;
    color: #667085;
    border-color: #d8dee8;
  }

  .category-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: currentColor;
    box-shadow: 0 0 0 3px rgba(6, 118, 71, .12);
  }

  .is-inactive .category-status-dot {
    box-shadow: 0 0 0 3px rgba(102, 112, 133, .12);
  }

  .category-sector-badge {
    background: #f1f5f9;
    color: #334155;
    border-color: #e2e8f0;
  }

  .category-sector-badge.service-ti {
    color: #067647;
    background: #ecfdf3;
    border-color: #b7ebc6;
  }

  .category-sector-badge.service-devops {
    color: #0b5ed7;
    background: #eef6ff;
    border-color: #bfdbfe;
  }

  .category-sector-badge.service-mkt {
    color: #b42318;
    background: #fff7f7;
    border-color: #ffd0d0;
  }

  .category-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    white-space: nowrap;
  }

  .category-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-width: 122px;
    border-radius: 6px;
    font-weight: 600;
    padding: 5px 10px;
    border-color: #cbd5e1;
    color: #334155;
    background: #fff;
  }

  .category-action-btn.is-compact {
    min-width: 88px;
  }

  .category-action-btn:hover {
    border-color: #0d6efd;
    color: #0b5ed7;
    background: #eef6ff;
  }

  .category-empty {
    padding: 12px;
    color: #64748b;
    font-size: .86rem;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    background: #fff;
  }

  .category-add-row {
    padding-top: 10px;
  }

  .category-modal .modal-content {
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

  .category-modal {
    overflow: hidden !important;
  }

  .category-modal .modal-dialog {
    max-height: calc(100dvh - 56px);
    margin-top: 28px;
    margin-bottom: 28px;
    display: flex;
    align-items: flex-start;
  }

  .category-modal .modal-header {
    flex: 0 0 auto;
    align-items: flex-start;
    background: #fff;
    color: #111827;
    border-bottom: 1px solid #e2e8f0;
    padding: 18px 20px;
  }

  .category-modal-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .category-modal-icon {
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

  .category-modal-title h6 {
    margin: 0;
    color: #111827;
    font-size: 1rem;
    font-weight: 700;
  }

  .category-modal-title p {
    margin: 2px 0 0;
    color: #64748b;
    font-size: .82rem;
  }

  .category-modal .modal-body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 18px 20px 4px;
    background: #f8fafc;
    max-height: calc(100dvh - 190px);
    overflow-y: auto;
    overflow-x: hidden;
  }

  .category-modal .modal-footer {
    flex: 0 0 auto;
    background: #fff;
    border-top: 1px solid #e2e8f0;
    padding: 12px 20px;
  }

  .category-modal .form-group.row {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin: 0 0 12px;
    padding: 12px 8px 2px;
  }

  .category-modal label {
    color: #475569;
    font-size: .78rem;
    font-weight: 650;
  }

  .category-modal .input-group-text {
    min-width: 34px;
    justify-content: center;
    background: #f8fafc;
    color: #64748b;
    border-color: #d8e0eb;
  }

  .category-modal .form-control {
    border-color: #d8e0eb;
    color: #111827;
  }

  .category-flash {
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

  .category-flash.fade-out {
    opacity: 0;
    transform: translateY(-8px);
    transition: opacity .22s ease, transform .22s ease;
  }

  @media (max-width: 1024px) {
    .category-page {
      padding: 10px 8px 12px;
    }

    .category-page-card {
      min-height: calc(100dvh - 22px);
    }
  }

  @media (max-width: 767.98px) {
    .category-card-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .category-add-button {
      width: 100%;
      justify-content: center;
    }

    .modal-dialog.modal-lg,
    .modal-dialog.modal-md {
      max-width: calc(100% - 16px);
      max-height: calc(100dvh - 16px);
      margin: 8px auto;
    }
  }
</style>

<body class="category-dashboard">
  <?php include_once("../all/loading.php"); ?>
  <?php include_once("../all/sidebar.php"); ?>
  <div class="container-fluid category-page">
    <div class="row">
      <div class="col-md-12">
        <div class="card category-page-card">
          <div class="card-header p-0">
            <div class="category-card-header">
              <div class="category-title-wrap">
                <span class="category-title-icon"><i class="fas fa-tags"></i></span>
                <div>
                  <h1 class="category-page-title">Categorias cadastradas</h1>
                  <p class="category-page-subtitle">Gerencie categorias, subcategorias e itens usados nos atendimentos.</p>
                </div>
              </div>
              <?php if ($m2_04 > 1) { ?>
                <button type="button" class="btn btn-outline-primary btn-sm category-add-button" data-toggle="modal" data-target="#new_cat">
                  <i class="far fa-plus-square"></i> Adicionar Categoria
                </button>
              <?php } ?>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="category-scroll">
              <div id="accordion" class="category-list">
                <?php
                $pdo = ConnectionN3();
                $show = $pdo->prepare("SELECT categorias.* FROM categorias ORDER BY categorias.cat_sts DESC, categorias.cat_nome ASC");
                $show->execute();
                while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
                  $cat_id = $row["cat_id"];
                  $cat_nome = $row["cat_nome"];
                  $cat_setor = $row["cat_setor"];
                  $cat_sts = $row["cat_sts"];
                  $setor = setor_label($cat_setor);
                  $collapseId = "collapseCategory-" . $cat_id;
                ?>
                  <div class="category-block <?php echo $cat_sts == 1 ? '' : 'is-inactive'; ?>">
                    <div class="category-block-header">
                      <div>
                        <button class="btn category-toggle" type="button" data-toggle="collapse" data-target="#<?php echo h($collapseId); ?>" aria-expanded="false" aria-controls="<?php echo h($collapseId); ?>">
                          <i class="fas fa-chevron-down"></i>
                        </button>
                      </div>
                      <div class="category-name">
                        <div class="category-name-main"><?php echo h($cat_nome); ?></div>
                        <div class="category-name-sub">Categoria</div>
                      </div>
                      <div>
                        <span class="category-sector-badge <?php echo h($setor['class']); ?>">
                          <i class="<?php echo h($setor['icon']); ?>"></i> <?php echo h($setor['label']); ?>
                        </span>
                      </div>
                      <div>
                        <span class="category-status-badge <?php echo $cat_sts == 1 ? 'is-active' : 'is-inactive'; ?>">
                          <span class="category-status-dot"></span><?php echo $cat_sts == 1 ? 'Ativo' : 'Inativo'; ?>
                        </span>
                      </div>
                      <div class="category-actions">
                        <?php if ($m2_04 > 2) { ?>
                          <button type="button" class="btn btn-sm category-action-btn is-compact view_cat" id="<?php echo h($cat_id); ?>"><i class="far fa-edit"></i> Editar</button>
                        <?php } ?>
                      </div>
                    </div>

                    <?php if ($m2_05 != 0) { ?>
                      <div id="<?php echo h($collapseId); ?>" class="collapse" data-parent="#accordion">
                        <div class="category-children">
                      <?php
                      $show_scat = $pdo->prepare("SELECT subcategorias.* FROM subcategorias WHERE subcategorias.scat_cat = :cat_id ORDER BY scat_sts DESC, scat_nome ASC");
                      $show_scat->bindParam(':cat_id', $cat_id, PDO::PARAM_INT);
                      $show_scat->execute();
                      $cont_scat = $show_scat->rowCount();
                      if ($cont_scat > 0) {
                        while ($exibe_scat = $show_scat->fetch(PDO::FETCH_ASSOC)) {
                          $scat_id = $exibe_scat["scat_id"];
                          $scat_nome = $exibe_scat["scat_nome"];
                          $scat_sts = $exibe_scat["scat_sts"];
                          $subCollapseId = "collapseSubcategory-" . $scat_id;
                      ?>
                          <div class="subcategory-panel <?php echo $scat_sts == 1 ? '' : 'is-inactive'; ?>">
                            <div class="subcategory-header">
                              <button class="btn hierarchy-caret" type="button" data-toggle="collapse" data-target="#<?php echo h($subCollapseId); ?>" aria-expanded="false" aria-controls="<?php echo h($subCollapseId); ?>">
                                <i class="fas fa-chevron-down"></i>
                              </button>
                              <div class="category-name">
                                <div class="category-name-main"><?php echo h($scat_nome); ?></div>
                                <div class="category-name-sub">Subcategoria</div>
                              </div>
                              <div>
                                <span class="category-status-badge <?php echo $scat_sts == 1 ? 'is-active' : 'is-inactive'; ?>">
                                  <span class="category-status-dot"></span><?php echo $scat_sts == 1 ? 'Ativo' : 'Inativo'; ?>
                                </span>
                              </div>
                              <div class="category-actions">
                                <?php if ($m2_05 > 2) { ?>
                                  <button type="button" class="btn btn-sm category-action-btn is-compact view_scat" id="<?php echo h($scat_id); ?>"><i class="far fa-edit"></i> Editar</button>
                                <?php } ?>
                              </div>
                            </div>

                          <?php if ($m2_06 != 0) { ?>
                            <div id="<?php echo h($subCollapseId); ?>" class="collapse">
                              <?php
                              $show_itens = $pdo->prepare("SELECT itens.* FROM itens WHERE itens.itens_scat = :scat_id ORDER BY itens_sts DESC, itens_nome ASC");
                              $show_itens->bindParam(':scat_id', $scat_id, PDO::PARAM_INT);
                              $show_itens->execute();
                              $cont_itens = $show_itens->rowCount();
                              if ($cont_itens > 0) {
                              ?>
                                <div class="item-list">
                              <?php
                                while ($exibe_itens = $show_itens->fetch(PDO::FETCH_ASSOC)) {
                                  $itens_id = $exibe_itens["itens_id"];
                                  $itens_nome = $exibe_itens["itens_nome"];
                                  $itens_sts = $exibe_itens["itens_sts"];
                              ?>
                                  <div class="item-row <?php echo $itens_sts == 1 ? '' : 'is-inactive'; ?>">
                                    <span class="hierarchy-caret is-item"><i class="fas fa-circle"></i></span>
                                    <div class="item-title">
                                      <i class="fas fa-tag"></i>
                                      <span><?php echo h($itens_nome); ?></span>
                                    </div>
                                    <div>
                                      <span class="category-status-badge <?php echo $itens_sts == 1 ? 'is-active' : 'is-inactive'; ?>">
                                        <span class="category-status-dot"></span><?php echo $itens_sts == 1 ? 'Ativo' : 'Inativo'; ?>
                                      </span>
                                    </div>
                                    <div class="category-actions">
                                      <?php if ($m2_06 > 2) { ?>
                                        <button type="button" class="btn btn-sm category-action-btn is-compact view_item" id="<?php echo h($itens_id); ?>"><i class="far fa-edit"></i> Editar</button>
                                      <?php } ?>
                                    </div>
                                  </div>
                                <?php } ?>
                                </div>
                              <?php } else { ?>
                                <div class="item-list">
                                  <div class="category-empty">Não há item cadastrado para esta subcategoria.</div>
                                </div>
                              <?php } ?>

                              <?php if ($m2_06 > 1) { ?>
                                <div class="category-add-row">
                                  <button type="button" class="btn btn-sm category-action-btn adc_item" id="<?php echo h($scat_id); ?>"><i class="far fa-plus-square"></i> Adicionar item</button>
                                </div>
                              <?php } ?>
                            </div>
                          <?php } ?>
                          </div>
                        <?php } ?>
                      <?php } else { ?>
                        <div class="category-empty">Não há subcategoria cadastrada para esta categoria.</div>
                      <?php } ?>

                      <?php if ($m2_05 > 1) { ?>
                        <div class="category-add-row">
                          <button type="button" class="btn btn-sm category-action-btn adc_scat" id="<?php echo h($cat_id); ?>"><i class="far fa-plus-square"></i> Adicionar subcategoria</button>
                        </div>
                      <?php } ?>
                        </div>
                      </div>
                    <?php } ?>
                  </div>
                <?php } ?>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <?php if ($m2_04 > 1) { ?>
    <div class="modal fade category-modal" id="new_cat" tabindex="-1" role="dialog" aria-labelledby="newCatTitle" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <div class="category-modal-title">
                <span class="category-modal-icon"><i class="fas fa-tags"></i></span>
                <div>
                  <h6 class="modal-title" id="newCatTitle">Cadastro de categoria</h6>
                  <p>Crie uma categoria para organizar atendimentos e itens vinculados.</p>
                </div>
              </div>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">Nome:</label>
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-tags"></i></div>
                    </div>
                    <input name="cat_nome" placeholder="Nome da Categoria" type="text" class="form-control" required="required">
                  </div>
                </div>
              </div>

              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">Setor:</label>
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-sitemap"></i></div>
                    </div>
                    <select name="cat_setor" required="required" class="form-control">
                      <option value="1">TI</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <input type="hidden" name="action" value="new_cat">
              <input type="hidden" name="token" value="<?php echo h($token); ?>">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
              <button type="submit" class="btn btn-primary">Salvar nova categoria</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  <?php } ?>

  <?php if ($flashMessage) { ?>
    <div class="alert <?php echo h($flashMessage['class']); ?> category-flash mb-0 py-2 px-3 pr-5" id="categoryFlashMessage" role="alert">
      <?php echo $flashMessage['message']; ?>
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  <?php } ?>

  <?php include_once("../all/update_pass.php"); ?>
  <script src="../js/jquery-3.6.0.min.js"></script>
  <script src="../js/bootstrap.min.js"></script>

  <?php if ($m2_04 > 2) { ?>
    <div class="modal fade category-modal" id="modalEdtCat" tabindex="-1" role="dialog" aria-labelledby="modalEdtCatLabel" aria-hidden="true">
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <form method="POST" action="#">
            <div class="modal-header">
              <div class="category-modal-title">
                <span class="category-modal-icon"><i class="fas fa-user-edit"></i></span>
                <div>
                  <h6 class="modal-title" id="modalEdtCatLabel">Edição de categoria</h6>
                  <p>Atualize nome, setor e situação da categoria.</p>
                </div>
              </div>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <span id="info_edt_cat"></span>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
              <input type="hidden" name="action" value="edt_cat">
              <input type="hidden" name="token" value="<?php echo h($token); ?>">
              <button type="submit" class="btn btn-primary">Salvar alterações</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  <?php } ?>

  <?php if ($m2_05 > 1) { ?>
    <div class="modal fade category-modal" id="modalAdcScat" tabindex="-1" role="dialog" aria-labelledby="modalAdcScatLabel" aria-hidden="true">
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <div class="category-modal-title">
                <span class="category-modal-icon"><i class="far fa-plus-square"></i></span>
                <div>
                  <h6 class="modal-title" id="modalAdcScatLabel">Cadastro de subcategoria</h6>
                  <p>Adicione uma subcategoria dentro da categoria selecionada.</p>
                </div>
              </div>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <span id="info_adc_scat"></span>
            </div>
            <div class="modal-footer">
              <input type="hidden" name="action" value="new_scat">
              <input type="hidden" name="token" value="<?php echo h($token); ?>">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
              <button type="submit" class="btn btn-primary">Salvar nova subcategoria</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  <?php } ?>

  <?php if ($m2_05 > 2) { ?>
    <div class="modal fade category-modal" id="modalEdtScat" tabindex="-1" role="dialog" aria-labelledby="modalEdtScatLabel" aria-hidden="true">
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <div class="category-modal-title">
                <span class="category-modal-icon"><i class="fas fa-tag"></i></span>
                <div>
                  <h6 class="modal-title" id="modalEdtScatLabel">Edição de subcategoria</h6>
                  <p>Atualize nome e situação da subcategoria.</p>
                </div>
              </div>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <span id="info_edt_scat"></span>
            </div>
            <div class="modal-footer">
              <input type="hidden" name="action" value="edt_scat">
              <input type="hidden" name="token" value="<?php echo h($token); ?>">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
              <button type="submit" class="btn btn-primary">Salvar alterações</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  <?php } ?>

  <?php if ($m2_06 > 1) { ?>
    <div class="modal fade category-modal" id="modalAdcItem" tabindex="-1" role="dialog" aria-labelledby="modalAdcItemLabel" aria-hidden="true">
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <div class="category-modal-title">
                <span class="category-modal-icon"><i class="far fa-plus-square"></i></span>
                <div>
                  <h6 class="modal-title" id="modalAdcItemLabel">Cadastro de item</h6>
                  <p>Adicione um item dentro da subcategoria selecionada.</p>
                </div>
              </div>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <span id="info_adc_item"></span>
            </div>
            <div class="modal-footer">
              <input type="hidden" name="action" value="new_item">
              <input type="hidden" name="token" value="<?php echo h($token); ?>">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
              <button type="submit" class="btn btn-primary">Salvar novo item</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  <?php } ?>

  <?php if ($m2_06 > 2) { ?>
    <div class="modal fade category-modal" id="modalEdtItens" tabindex="-1" role="dialog" aria-labelledby="modalEdtItemLabel" aria-hidden="true">
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <form method="POST" action="#">
            <div class="modal-header">
              <div class="category-modal-title">
                <span class="category-modal-icon"><i class="fas fa-user-edit"></i></span>
                <div>
                  <h6 class="modal-title" id="modalEdtItemLabel">Edição de item</h6>
                  <p>Atualize nome e situação do item.</p>
                </div>
              </div>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <span id="info_edt_item"></span>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
              <input type="hidden" name="action" value="edt_item">
              <input type="hidden" name="token" value="<?php echo h($token); ?>">
              <button type="submit" class="btn btn-primary">Salvar alterações</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  <?php } ?>

  <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Cadastro categorias e subcategorias</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        </div>
        <div class="modal-body">
          <p>Em construção...</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    $(document).ready(function() {
      $(document).on('click', '.view_cat', function() {
        var id = $(this).attr("id");
        if (id !== '') {
          $("#info_edt_cat").html('<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><div class="mt-3 small text-muted">Carregando categoria...</div></div>');
          $('#modalEdtCat').modal('show');
          $.post('cat_edt.php', { id: id }, function(retorna) {
            $("#info_edt_cat").html(retorna);
          }).fail(function() {
            $("#info_edt_cat").html('<div class="alert alert-danger m-3">Erro ao carregar categoria.</div>');
          });
        }
      });

      $(document).on('click', '.adc_scat', function() {
        var id = $(this).attr("id");
        if (id !== '') {
          $("#info_adc_scat").html('<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><div class="mt-3 small text-muted">Carregando categoria...</div></div>');
          $('#modalAdcScat').modal('show');
          $.post('scat_adc.php', { id: id }, function(retorna) {
            $("#info_adc_scat").html(retorna);
          }).fail(function() {
            $("#info_adc_scat").html('<div class="alert alert-danger m-3">Erro ao carregar categoria.</div>');
          });
        }
      });

      $(document).on('click', '.view_scat', function() {
        var id = $(this).attr("id");
        if (id !== '') {
          $("#info_edt_scat").html('<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><div class="mt-3 small text-muted">Carregando subcategoria...</div></div>');
          $('#modalEdtScat').modal('show');
          $.post('scat_edt.php', { id: id }, function(retorna) {
            $("#info_edt_scat").html(retorna);
          }).fail(function() {
            $("#info_edt_scat").html('<div class="alert alert-danger m-3">Erro ao carregar subcategoria.</div>');
          });
        }
      });

      $(document).on('click', '.adc_item', function() {
        var id = $(this).attr("id");
        if (id !== '') {
          $("#info_adc_item").html('<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><div class="mt-3 small text-muted">Carregando subcategoria...</div></div>');
          $('#modalAdcItem').modal('show');
          $.post('item_adc.php', { id: id }, function(retorna) {
            $("#info_adc_item").html(retorna);
          }).fail(function() {
            $("#info_adc_item").html('<div class="alert alert-danger m-3">Erro ao carregar subcategoria.</div>');
          });
        }
      });

      $(document).on('click', '.view_item', function() {
        var id = $(this).attr("id");
        if (id !== '') {
          $("#info_edt_item").html('<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><div class="mt-3 small text-muted">Carregando item...</div></div>');
          $('#modalEdtItens').modal('show');
          $.post('item_edt.php', { id: id }, function(retorna) {
            $("#info_edt_item").html(retorna);
          }).fail(function() {
            $("#info_edt_item").html('<div class="alert alert-danger m-3">Erro ao carregar item.</div>');
          });
        }
      });

      const flashMessage = $('#categoryFlashMessage');
      if (flashMessage.length) {
        setTimeout(function() {
          flashMessage.addClass('fade-out');
          setTimeout(function() {
            flashMessage.alert('close');
          }, 240);
        }, 4200);
      }
    });
  </script>
</body>

</html>
