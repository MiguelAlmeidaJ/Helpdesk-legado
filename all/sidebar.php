<?php
include_once(__DIR__ . "/app_url.php");
include_once(__DIR__ . "/permissoes.php");

$showCadastroUsuarios = (($m1_00 ?? 0) == 1 || ($m3_00 > 0 && isset($_SESSION['tipo']) && $_SESSION['tipo'] != 2));
$showCadastrosMenu = ($showCadastroUsuarios || $m2_00 == 1);

if (!function_exists('sidebar_href')) {
  function sidebar_href($path)
  {
    return htmlspecialchars(allterus_app_href($path), ENT_QUOTES, 'UTF-8');
  }
}
?>

<style>
  html {
    min-height: 100dvh;
  }

  body {
    min-height: 100dvh;
    margin: 0;
    padding-left: 80px;
    box-sizing: border-box;
    overflow-x: hidden;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }

  body,
  input,
  button,
  select,
  optgroup,
  textarea,
  .popover,
  .tooltip,
  .dropdown-menu,
  .modal,
  .card,
  .table {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }

  .modal-header {
    background-color: #007bff;
    color: #fff;
  }

  .modal-footer {
    background-color: #f1f1f1;
  }

  .card-body {
    overflow-y: auto;
    max-height: calc(100vh - 57px);
  }

  #sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    height: 100dvh;
    width: 80px;
    z-index: 1050;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    background: #f8fafc;
    color: #111827;
    border-right: 1px solid #dbe3ef;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12);
    transition: width 0.22s ease;
    overflow: hidden;
    contain: layout paint style;
    transform: translateZ(0);
    will-change: width;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
    font-size: 15px !important;
    line-height: 1.2 !important;
  }

  #sidebar,
  #sidebar a,
  #sidebar button,
  #sidebar .label,
  #sidebar .menu-subitem span,
  #sidebar .name,
  #sidebar .hint {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
  }

  #sidebar i.fas,
  #sidebar i.far,
  #sidebar i.fa,
  #sidebar i[class*="fa-"] {
    font-family: "Font Awesome 5 Free" !important;
  }

  #sidebar i.fas,
  #sidebar i.fa {
    font-weight: 900 !important;
  }

  #sidebar i.far {
    font-weight: 400 !important;
  }

  #sidebar i.fab {
    font-family: "Font Awesome 5 Brands" !important;
    font-weight: 400 !important;
  }

  #sidebar.sidebar-expanded {
    width: 270px;
  }

  #sidebarHeader {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 58px;
    height: 58px;
    min-height: 58px;
    padding: 10px;
    border-bottom: 1px solid #dbe3ef;
    overflow: hidden;
  }

  #sidebarHeader img {
    display: block;
    position: absolute;
    max-width: calc(100% - 20px);
    height: auto;
    object-fit: contain;
    opacity: 1;
    transform: translateZ(0);
    transition: opacity 0.14s ease;
    will-change: opacity;
  }

  .logo-expanded {
    width: 100px;
    opacity: 0 !important;
  }

  .logo-minimized {
    width: 50px;
  }

  #sidebar.sidebar-expanded .logo-minimized {
    opacity: 0 !important;
  }

  #sidebar.sidebar-expanded .logo-expanded {
    opacity: 1 !important;
  }

  #sidebarNav {
    flex: 1 1 auto;
    min-height: 0;
    padding: 10px 8px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-gutter: stable;
    scrollbar-width: thin;
    scrollbar-color: rgba(120, 130, 145, 0.45) transparent;
    contain: layout paint;
  }

  #sidebarNav::-webkit-scrollbar {
    width: 6px;
  }

  #sidebarNav::-webkit-scrollbar-track {
    background: transparent;
  }

  #sidebarNav::-webkit-scrollbar-thumb {
    background: rgba(120, 130, 145, 0.45);
    border-radius: 999px;
  }

  #sidebar .menu-item {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 42px;
    padding: 10px 12px;
    margin-bottom: 6px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: inherit;
    text-align: left;
    text-decoration: none;
    transition: background-color 0.16s ease;
    font-size: 15px !important;
  }

  #sidebar .menu-item:hover,
  #sidebar .menu-subitem:hover {
    background-color: #e8eef8;
    color: #0f172a;
    text-decoration: none;
  }

  #sidebar .menu-item:focus,
  #sidebar .menu-item:active,
  #sidebar .menu-subitem:focus,
  #sidebar .menu-subitem:active {
    outline: none !important;
    box-shadow: none !important;
    text-decoration: none;
  }

  #sidebar .menu-item i {
    width: 24px;
    flex: 0 0 24px;
    text-align: center;
    font-size: 18px !important;
  }

  #sidebar .text-xl {
    font-size: 19px !important;
    line-height: 1 !important;
  }

  #sidebar .menu-group {
    margin-bottom: 4px;
  }

  #sidebar .menu-toggle {
    justify-content: flex-start;
    margin-bottom: 0;
    cursor: pointer;
  }

  #sidebar .menu-arrow {
    margin-left: auto;
    opacity: 0;
    transition: transform 0.18s ease;
  }

  #sidebar.sidebar-expanded .menu-arrow {
    opacity: 1;
  }

  #sidebar .menu-group.open .menu-arrow {
    transform: rotate(180deg);
  }

  #sidebar .submenu {
    display: none;
    padding-left: 36px;
    margin-top: 2px;
  }

  #sidebar.sidebar-expanded .menu-group.open .submenu {
    display: block;
  }

  #sidebar .menu-subitem {
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 8px;
    padding: 8px 10px;
    margin-bottom: 4px;
    color: inherit;
    text-decoration: none;
    font-size: 13.5px !important;
    line-height: 1.2;
    opacity: 0;
  }

  #sidebar.sidebar-expanded .menu-subitem {
    opacity: 1;
  }

  #sidebar .label {
    min-width: 0;
    opacity: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: opacity 0.16s ease;
    font-size: 14px !important;
  }

  #sidebar.sidebar-expanded .label {
    opacity: 1;
  }

  #sidebarFooter {
    flex: 0 0 auto;
    width: 100%;
    padding: 10px 8px 16px;
    border-top: 1px solid #dbe3ef;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-sizing: border-box;
    overflow: hidden;
  }

  #sidebarFooter .menu-item {
    margin-bottom: 0;
  }

  #userInfo {
    margin: 0 10px 8px;
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.16s ease;
  }

  #sidebar.sidebar-expanded #userInfo {
    opacity: 1;
  }

  #userInfo p {
    margin: 0;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #userInfo .name {
    font-size: 13px;
    font-weight: 600;
  }

  #userInfo .hint {
    color: #6b7280;
    font-size: 11px;
  }

  [data-theme="dark"] #sidebar {
    background: #0f1a2a;
    color: #e5e7eb;
    border-right-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
  }

  [data-theme="dark"] #sidebarHeader,
  [data-theme="dark"] #sidebarFooter {
    border-color: rgba(255, 255, 255, 0.08);
  }

  [data-theme="dark"] #sidebar .menu-item:hover,
  [data-theme="dark"] #sidebar .menu-subitem:hover {
    background-color: rgba(255, 255, 255, 0.12);
    color: #fff;
  }

  [data-theme="dark"] #userInfo .hint {
    color: #a8b4c7;
  }



  /* Alertas globais: sempre acima do conteúdo e fora dos cards/modais */
  body > .row.pull-right:has(> .alert.alert-dismissible),
  body > div:has(> .alert.alert-dismissible.auto-fade-alert),
  body > div:has(> .alert.alert-dismissible.fade.show) {
    position: fixed !important;
    top: 72px !important;
    right: 24px !important;
    left: auto !important;
    width: min(420px, calc(100vw - 48px)) !important;
    max-width: calc(100vw - 48px) !important;
    margin: 0 !important;
    z-index: 3000 !important;
    pointer-events: none;
  }

  body > .row.pull-right:has(> .alert.alert-dismissible) {
    display: block !important;
  }

  body > .row.pull-right:has(> .alert.alert-dismissible) > .alert,
  body > div:has(> .alert.alert-dismissible.auto-fade-alert) > .alert,
  body > div:has(> .alert.alert-dismissible.fade.show) > .alert {
    position: relative !important;
    z-index: 3001 !important;
    width: 100% !important;
    margin: 0 0 10px 0 !important;
    box-shadow: 0 14px 34px rgba(15, 23, 42, .18) !important;
    pointer-events: auto;
  }

  body > .alert.alert-dismissible.fade.show {
    position: fixed !important;
    top: 72px !important;
    right: 24px !important;
    left: auto !important;
    z-index: 3001 !important;
    width: min(420px, calc(100vw - 48px)) !important;
    margin: 0 !important;
    box-shadow: 0 14px 34px rgba(15, 23, 42, .18) !important;
  }

  @media (max-width: 1024px) {
    body {
      zoom: 1 !important;
      padding-left: 64px;
      max-width: 100%;
      overflow-x: hidden;
    }

    #sidebar {
      width: 64px;
    }

    #sidebar.sidebar-expanded {
      width: 235px;
    }

    .container-fluid,
    .container {
      padding-left: 8px !important;
      padding-right: 8px !important;
    }
  }
</style>

<aside id="sidebar">
  <div id="sidebarHeader">
    <img src="<?php echo sidebar_href('img/logo_sidebar_minimized.png'); ?>" alt="N3TI" class="logo-minimized" width="50" height="48" loading="eager" decoding="async">
    <img src="<?php echo sidebar_href('img/logo_sidebar_expanded.png'); ?>" alt="Allterus" class="logo-expanded" width="100" height="46" loading="eager" decoding="async">
  </div>

  <nav id="sidebarNav">
    <a href="<?php echo htmlspecialchars(allterus_web_url('/dashboard'), ENT_QUOTES, 'UTF-8'); ?>" class="menu-item">
      <i class="fas fa-chart-line text-xl"></i>
      <span class="label">Dashboard</span>
    </a>


    <?php if ($m3_00 == 1) { ?>
      <div class="menu-group" data-menu-group>
        <button class="menu-item menu-toggle" type="button" data-submenu-toggle aria-expanded="false">
          <i class="fas fa-headset text-xl"></i>
          <span class="label">Atendimentos</span>
          <i class="fas fa-chevron-down menu-arrow"></i>
        </button>
        <div class="submenu">
          <a href="<?php echo htmlspecialchars(allterus_web_url('/tickets'), ENT_QUOTES, 'UTF-8'); ?>" class="menu-subitem"><i class="fas fa-list-ul"></i><span>Lista de Atendimentos</span></a>
          <?php if ($m8_00 > 0) { ?>
            <a href="<?php echo htmlspecialchars(allterus_web_url('/tickets/availability'), ENT_QUOTES, 'UTF-8'); ?>" class="menu-subitem"><i class="fas fa-user-clock"></i><span>Disponibilidade Tecnica</span></a>
            <a href="<?php echo htmlspecialchars(allterus_web_url('/tickets/timeline'), ENT_QUOTES, 'UTF-8'); ?>" class="menu-subitem"><i class="far fa-clock"></i><span>Timeline</span></a>
          <?php } ?>
          <?php if ($m3_01 > 0) { ?>
            <a href="<?php echo htmlspecialchars(allterus_web_url('/tickets/new'), ENT_QUOTES, 'UTF-8'); ?>" class="menu-subitem"><i class="fas fa-plus"></i><span>Novo Atendimento</span></a>
          <?php } ?>
        </div>
      </div>
    <?php } ?>

    <?php if ($m5_00 > 0) { ?>
      <div class="menu-group" data-menu-group>
        <button class="menu-item menu-toggle" type="button" data-submenu-toggle aria-expanded="false">
          <i class="fas fa-code text-xl"></i>
          <span class="label">DevOps</span>
          <i class="fas fa-chevron-down menu-arrow"></i>
        </button>
        <div class="submenu">
          <?php if ($m5_01 > 0) { ?>
            <a href="<?php echo sidebar_href('atd_projeto/home.php'); ?>" class="menu-subitem"><i class="fas fa-list-ul"></i><span>Lista de Projetos</span></a>
          <?php } ?>
          <a href="<?php echo sidebar_href('atd_projeto/hometarefas.php'); ?>" class="menu-subitem"><i class="fas fa-list-ul"></i><span>Lista de Tarefas</span></a>
          <?php if ($m5_01 > 1) { ?>
            <a href="<?php echo sidebar_href('atd_projeto/projeto.php'); ?>" class="menu-subitem"><i class="fas fa-plus"></i><span>Novo Projeto</span></a>
          <?php } ?>
          <?php if ($m5_00 > 1) { ?>
            <a href="<?php echo sidebar_href('atd_projeto/tarefa.php'); ?>" class="menu-subitem"><i class="fas fa-plus"></i><span>Nova Tarefa</span></a>
          <?php } ?>
        </div>
      </div>
    <?php } ?>

    <?php if ($m8_00 > 0) { ?>
      <div class="menu-group" data-menu-group>
        <button class="menu-item menu-toggle" type="button" data-submenu-toggle aria-expanded="false">
          <i class="fas fa-bullhorn text-xl"></i>
          <span class="label">Mkt</span>
          <i class="fas fa-chevron-down menu-arrow"></i>
        </button>
        <div class="submenu">
          <a href="<?php echo sidebar_href('atd_3andar/home.php'); ?>" class="menu-subitem"><i class="fas fa-list-ul"></i><span>Lista de Tarefas</span></a>
          <?php if ($m8_01 > 0) { ?>
            <a href="<?php echo sidebar_href('atd_3andar/tarefa.php'); ?>" class="menu-subitem"><i class="fas fa-plus"></i><span>Criar Nova Tarefa</span></a>
          <?php } ?>
        </div>
      </div>
    <?php } ?>

    <?php if ($m9_00 > 0) { ?>
      <div class="menu-group" data-menu-group>
        <button class="menu-item menu-toggle" type="button" data-submenu-toggle aria-expanded="false">
          <i class="fas fa-truck text-xl"></i>
          <span class="label">Logistica</span>
          <i class="fas fa-chevron-down menu-arrow"></i>
        </button>
        <div class="submenu">
          <?php if ($m9_01 > 0) { ?>
            <a href="<?php echo sidebar_href('logistica/agendaVeiculos.php'); ?>" class="menu-subitem"><i class="fas fa-car"></i><span>Agenda Veiculos</span></a>
            <a href="<?php echo sidebar_href('logistica/rdPainel.php'); ?>" class="menu-subitem"><i class="fas fa-wallet"></i><span>RD</span></a>
          <?php } ?>
          <?php if ($m9_02 > 1) { ?>
            <a href="<?php echo sidebar_href('logistica/gestaoRD.php'); ?>" class="menu-subitem"><i class="fas fa-cogs"></i><span>Gestao RDs</span></a>
            <a href="<?php echo sidebar_href('logistica/analiseRD.php'); ?>" class="menu-subitem"><i class="fas fa-chart-line"></i><span>Analise Comparativa RDs</span></a>
            <a href="<?php echo sidebar_href('logistica/detalharRD.php'); ?>" class="menu-subitem"><i class="fas fa-clipboard-list"></i><span>Relatorio RDs</span></a>
            <a href="<?php echo sidebar_href('logistica/cadastros_financeiros.php'); ?>" class="menu-subitem"><i class="fas fa-pencil-alt"></i><span>Cadastro Dados RD</span></a>
            <a href="<?php echo sidebar_href('logistica/contas_receber.php'); ?>" class="menu-subitem"><i class="fas fa-arrow-circle-up"></i><span>Contas a Receber - Competencia</span></a>
            <a href="<?php echo sidebar_href('logistica/contas_receber_fluxo.php'); ?>" class="menu-subitem"><i class="fas fa-arrow-circle-up"></i><span>Contas a Receber - Fluxo</span></a>
            <a href="<?php echo sidebar_href('logistica/contas_pagar.php'); ?>" class="menu-subitem"><i class="fas fa-arrow-circle-down"></i><span>Contas a Pagar</span></a>
            <a href="<?php echo sidebar_href('logistica/recorrentes.php'); ?>" class="menu-subitem"><i class="fas fa-sync-alt"></i><span>Lancamentos Recorrentes</span></a>
            <a href="<?php echo sidebar_href('logistica/contabilidade.php'); ?>" class="menu-subitem"><i class="fas fa-calculator"></i><span>Contabilidade</span></a>
          <?php } ?>
        </div>
      </div>
    <?php } ?>

    <!-- <?php if (($m6_00 ?? 0) == 1) { ?>
      <div class="menu-group" data-menu-group>
        <button class="menu-item menu-toggle" type="button" data-submenu-toggle aria-expanded="false">
          <i class="fab fa-medapps text-xl"></i>
          <span class="label">Facility</span>
          <i class="fas fa-chevron-down menu-arrow"></i>
        </button>
        <div class="submenu">
          <a href="<?php echo sidebar_href('atd_facility/home.php'); ?>" class="menu-subitem"><i class="fas fa-list-ul"></i><span>Lista de Facility</span></a>
          <a href="<?php echo sidebar_href('atd_facility/dash_pro.php'); ?>" class="menu-subitem"><i class="fas fa-poll-h"></i><span>Dash Facility</span></a>
          <?php if (($m6_01 ?? 0) > 0) { ?>
            <a href="<?php echo sidebar_href('atd_facility/atd.php'); ?>" class="menu-subitem"><i class="fas fa-plus"></i><span>Novo Facility</span></a>
          <?php } ?>
        </div>
      </div>
    <?php } ?>

    <?php if ($m7_00 == 1) { ?>
      <div class="menu-group" data-menu-group>
        <button class="menu-item menu-toggle" type="button" data-submenu-toggle aria-expanded="false">
          <i class="far fa-file-alt text-xl"></i>
          <span class="label">Contratos</span>
          <i class="fas fa-chevron-down menu-arrow"></i>
        </button>
        <div class="submenu">
          <a href="<?php echo sidebar_href('cont/home.php'); ?>" class="menu-subitem"><i class="fas fa-list-ul"></i><span>Lista de Contratos</span></a>
          <a href="<?php echo sidebar_href('cont/contrato.php'); ?>" class="menu-subitem"><i class="fas fa-plus"></i><span>Novo Contrato</span></a>
        </div>
      </div>
    <?php } ?>

    <?php if ($m8_02 > 0) { ?>
      <div class="menu-group" data-menu-group>
        <button class="menu-item menu-toggle" type="button" data-submenu-toggle aria-expanded="false">
          <i class="fas fa-server text-xl"></i>
          <span class="label">Gestao de Ativos</span>
          <i class="fas fa-chevron-down menu-arrow"></i>
        </button>
        <div class="submenu">
          <a href="<?php echo sidebar_href('ativos/ativos.php'); ?>" class="menu-subitem"><i class="fas fa-list-ul"></i><span>Ativos</span></a>
          <a href="<?php echo sidebar_href('ativos/ativos_programas.php'); ?>" class="menu-subitem"><i class="fas fa-poll-h"></i><span>Programas</span></a>
          <a href="<?php echo sidebar_href('ativos/patrimonios.php'); ?>" class="menu-subitem"><i class="fas fa-box"></i><span>Controle de Patrimonios</span></a>
          <a href="<?php echo sidebar_href('ativos/downloads.php'); ?>" class="menu-subitem"><i class="fas fa-download"></i><span>Downloads</span></a>
          <a href="<?php echo sidebar_href('ativos/ativos_insert.php'); ?>" class="menu-subitem"><i class="fas fa-plus"></i><span>Adicionar Ativo</span></a>
          <a href="<?php echo sidebar_href('ativos/patrimonios_insert.php'); ?>" class="menu-subitem"><i class="fas fa-plus"></i><span>Adicionar Patrimonio</span></a>
        </div>
      </div>
    <?php } ?> -->

    <?php if ($m8_00 > 0) { ?>
      <div class="menu-group" data-menu-group>
        <button class="menu-item menu-toggle" type="button" data-submenu-toggle aria-expanded="false">
          <i class="fas fa-clipboard-list text-xl"></i>
          <span class="label">Relatórios</span>
          <i class="fas fa-chevron-down menu-arrow"></i>
        </button>
        <div class="submenu">
          <?php if ($m8_00 == 2) { ?>
            <a href="<?php echo sidebar_href('rel/atd_abertos_por_tecnico.php'); ?>" class="menu-subitem"><i class="fas fa-user-tie"></i><span>Atd. abertos por Técnico</span></a>
            <a href="<?php echo sidebar_href('rel/atd_total_por_cliente.php'); ?>" class="menu-subitem"><i class="fas fa-headset"></i><span>Atd. total por Cliente</span></a>
            <a href="<?php echo sidebar_href('rel/atd_total_por_tecnico.php'); ?>" class="menu-subitem"><i class="fas fa-user-tie"></i><span>Atd. total por Técnico</span></a>
            <a href="<?php echo sidebar_href('rel/atd_total_por_categoria.php'); ?>" class="menu-subitem"><i class="fas fa-tags"></i><span>Atd. total por Categoria</span></a>
            <a href="<?php echo sidebar_href('rel/atd_tempo_por_tecnico.php'); ?>" class="menu-subitem"><i class="far fa-clock"></i><span>Tempo médio para Atendimento</span></a>
          <?php } ?>
          <a href="<?php echo sidebar_href('rel/atd_analitico_por_cliente.php'); ?>" class="menu-subitem"><i class="fas fa-align-justify"></i><span>Atd. Analítico por Cliente</span></a>
          <a href="<?php echo sidebar_href('rel/atd_analitico_por_tarefa.php'); ?>" class="menu-subitem"><i class="fas fa-tasks"></i><span>Atd. Analítico por Tarefa</span></a>
          <a href="<?php echo sidebar_href('rel/rel_Unificado.php'); ?>" class="menu-subitem"><i class="fas fa-tasks"></i><span>Relatório Unificado</span></a>
          <a href="<?php echo sidebar_href('rel/rel_ti.php'); ?>" class="menu-subitem"><i class="fas fa-tasks"></i><span>Relatório Somente TI</span></a>
          <?php if ($m8_00 == 2) { ?>
            <a href="<?php echo sidebar_href('rel/rel_tempo_atd.php'); ?>" class="menu-subitem"><i class="fas fa-clock"></i><span>Tempo de Atendimento</span></a>
          <?php } ?>
          <?php if ($m8_03 == 1) { ?>
            <a href="<?php echo sidebar_href('rel/relatoriosPDF.php'); ?>" class="menu-subitem"><i class="fas fa-file-pdf"></i><span>Gerar PDF</span></a>
          <?php } ?>
        </div>
      </div>
    <?php } ?>

    <?php if ($showCadastrosMenu) { ?>
      <div class="menu-group" data-menu-group>
        <button class="menu-item menu-toggle" type="button" data-submenu-toggle aria-expanded="false">
          <i class="fas fa-folder-open text-xl"></i>
          <span class="label">Cadastros</span>
          <i class="fas fa-chevron-down menu-arrow"></i>
        </button>
        <div class="submenu">
          <?php if ($showCadastroUsuarios) { ?>
            <a href="<?php echo htmlspecialchars(allterus_web_url('/users'), ENT_QUOTES, 'UTF-8'); ?>" class="menu-subitem"><i class="fas fa-users"></i><span>Usuários</span></a>
          <?php } ?>
          <?php if ($m2_01 > 0) { ?>
            <a href="<?php echo sidebar_href('cads/clientes.php'); ?>" class="menu-subitem"><i class="fas fa-building"></i><span>Clientes</span></a>
          <?php } ?>
          <?php if ($m2_04 > 0) { ?>
            <a href="<?php echo sidebar_href('cads/categorias.php'); ?>" class="menu-subitem"><i class="fas fa-tags"></i><span>Categorias</span></a>
          <?php } ?>
          <?php if ($m8_04 > 0) { ?>
            <a href="<?php echo sidebar_href('catlg/catalogo.php'); ?>" class="menu-subitem"><i class="fas fa-book"></i><span>Catalogos</span></a>
            <a href="<?php echo sidebar_href('catlg/check_catlg.php'); ?>" class="menu-subitem"><i class="fas fa-check"></i><span>Verificacao de Catalogos</span></a>
          <?php } ?>
          <?php if ($m7_00 == 1) { ?>
            <a href="<?php echo sidebar_href('cads_cont/centros_custo.php'); ?>" class="menu-subitem"><i class="fas fa-funnel-dollar"></i><span>Centros de Custo</span></a>
            <a href="<?php echo sidebar_href('cads_cont/class_contab.php'); ?>" class="menu-subitem"><i class="fas fa-tags"></i><span>Classificacao Contabil</span></a>
            <a href="<?php echo sidebar_href('cads_cont/ind_reaju.php'); ?>" class="menu-subitem"><i class="fas fa-donate"></i><span>Indices de Reajuste</span></a>
            <a href="<?php echo sidebar_href('cads_cont/forma_pag.php'); ?>" class="menu-subitem"><i class="fas fa-comments-dollar"></i><span>Formas de Pagamento</span></a>
            <a href="<?php echo sidebar_href('cads_cont/tipo_despesa.php'); ?>" class="menu-subitem"><i class="fas fa-tag"></i><span>Tipo de Despesa</span></a>
            <a href="<?php echo sidebar_href('cads_cont/tipo_servi.php'); ?>" class="menu-subitem"><i class="fas fa-tag"></i><span>Tipo de Servico</span></a>
            <a href="<?php echo sidebar_href('cads_cont/tipo_taxas.php'); ?>" class="menu-subitem"><i class="fas fa-tag"></i><span>Tipo Taxas</span></a>
          <?php } ?>
        </div>
      </div>
    <?php } ?>

    <a href="<?php echo sidebar_href('radio.php'); ?>" class="menu-item">
      <i class="fas fa-play text-xl"></i>
      <span class="label">Rádio</span>
    </a>

    <?php if ($m9_09 > 0) { ?>
      <a href="<?php echo sidebar_href('logistica/contabilidade.php'); ?>" class="menu-item">
        <i class="fas fa-calculator text-xl"></i>
        <span class="label">Extratos</span>
      </a>
    <?php } ?>
  </nav>

  <div id="sidebarFooter">
    <div id="userInfo">
      <p class="name"><?php echo htmlspecialchars((string)$user_nome, ENT_QUOTES, 'UTF-8'); ?></p>
      <p class="hint">Usuario logado</p>
    </div>
    <button class="menu-item" type="button" data-toggle="modal" data-target="#Help">
      <i class="far fa-question-circle text-xl"></i>
      <span class="label">Help</span>
    </button>
    <a href="<?php echo htmlspecialchars(allterus_web_url('/account/password'), ENT_QUOTES, 'UTF-8'); ?>" class="menu-item">
      <i class="fas fa-user-cog text-xl"></i>
      <span class="label">Senha</span>
    </a>
    <a href="<?php echo sidebar_href('logout.php'); ?>" class="menu-item">
      <i class="fas fa-sign-out-alt text-xl"></i>
      <span class="label">Sair</span>
    </a>
  </div>
</aside>

<script>
  (function() {
    var sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    var menuGroups = Array.prototype.slice.call(sidebar.querySelectorAll('[data-menu-group]'));
    var submenuToggles = Array.prototype.slice.call(sidebar.querySelectorAll('[data-submenu-toggle]'));
    var interactiveItems = Array.prototype.slice.call(sidebar.querySelectorAll('.menu-item, .menu-subitem'));
    var sidebarImages = Array.prototype.slice.call(sidebar.querySelectorAll('img'));
    var enterEvent = window.PointerEvent ? 'pointerenter' : 'mouseenter';
    var leaveEvent = window.PointerEvent ? 'pointerleave' : 'mouseleave';
    var resizeFrame = null;

    function getCollapsedWidth() {
      return window.matchMedia('(max-width: 1024px)').matches ? 64 : 80;
    }

    function syncSidebarLayout() {
      resizeFrame = null;
      sidebar.style.zoom = '';
      sidebar.style.transform = '';
      sidebar.style.transformOrigin = '';
      document.body.style.paddingLeft = getCollapsedWidth() + 'px';
    }

    function scheduleSidebarLayout() {
      if (resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(syncSidebarLayout);
    }

    function warmSidebarImages() {
      sidebarImages.forEach(function(img) {
        if (img.decode) {
          img.decode().catch(function() {});
        }
      });
    }

    sidebar.addEventListener(enterEvent, function() {
      if (!sidebar.classList.contains('sidebar-expanded')) {
        sidebar.classList.add('sidebar-expanded');
      }
    });

    sidebar.addEventListener(leaveEvent, function() {
      sidebar.classList.remove('sidebar-expanded');
      menuGroups.forEach(function(group) {
        group.classList.remove('open');
      });
      submenuToggles.forEach(function(toggle) {
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    submenuToggles.forEach(function(toggle) {
      toggle.addEventListener('click', function() {
        var group = toggle.closest('[data-menu-group]');
        if (!group) return;
        var willOpen = !group.classList.contains('open');

        menuGroups.forEach(function(menuGroup) {
          menuGroup.classList.remove('open');
        });
        submenuToggles.forEach(function(btn) {
          btn.setAttribute('aria-expanded', 'false');
        });

        if (willOpen) {
          group.classList.add('open');
          toggle.setAttribute('aria-expanded', 'true');
        }

        if (typeof toggle.blur === 'function') {
          toggle.blur();
        }
      });
    });

    interactiveItems.forEach(function(item) {
      item.addEventListener('mouseup', function() {
        if (typeof item.blur === 'function') {
          item.blur();
        }
      });
    });

    scheduleSidebarLayout();
    if ('requestIdleCallback' in window) {
      requestIdleCallback(warmSidebarImages, { timeout: 1000 });
    } else {
      window.setTimeout(warmSidebarImages, 120);
    }
    window.addEventListener('resize', scheduleSidebarLayout);
    window.addEventListener('load', scheduleSidebarLayout);
  })();
</script>
