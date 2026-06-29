<?php
require_once __DIR__ . "/all/session.php";
n3_session_start();

include_once("./all/seguranca.php");
include_once("./all/conect.php");
include_once("./all/permissoes.php");
$data = date("Y-m-d");

//VERIFICA SE HÃ¡ REQUISICAO PARA SER EXECUTADA
if (isset($_POST['action'])) {
  $action  = $_POST['action'];
  //SE A REQUISIÃ‡ÃƒO FOR PARA ALTERAR SENHA
  if ($action == "alterar_senha") {
    include_once("all/update_senha.php");
  }
}

//DEFINE DATAS QUE PODEM SER USADAS PARA OBTER INDICADORES
$dia = new DateTime($data);
$data_d7 =  date('Y-m-d', strtotime($data . ' -7 days'));
?>
<!doctype html>
<html lang="pt-BR">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link rel="stylesheet" href="./css/bootstrap.min.css">
  <link rel="stylesheet" href="./fontawesome/css/all.css">
  <link rel="icon" href="./img/favicon.ico">
  <title>Allterus</title>
</head>
<style>
  .modal-header {
    background-color: #007bff;
    color: white;
  }

  .modal-footer {
    background-color: #f1f1f1;
  }

  .modal-body h5 {
    font-family: 'Arial', sans-serif;
    font-weight: bold;
    margin-top: 20px;
  }

  .modal-body p {
    font-family: 'Arial', sans-serif;
    font-size: 14px;
    color: #333;
  }

  .modal-body ul {
    list-style: none;
    padding: 0;
  }

  .modal-body ul li {
    margin-bottom: 10px;
  }

  .modal-body ul li i {
    margin-right: 5px;
  }

  body {
    width: 100%;
    min-height: auto !important;
    overflow-x: hidden;
    overflow-y: auto;
  }

  html {
    height: 100%;
    overflow: hidden;
  }

  body.home-dashboard {
    height: 100vh;
    min-height: 100vh !important;
    overflow: hidden;
    padding-bottom: 0;
  }

  body.home-dashboard>.card.shadow {
    height: calc(100vh - 1px);
    margin-bottom: 0 !important;
    overflow: hidden;
    box-sizing: border-box;
  }

  body.home-dashboard>.card.shadow:last-of-type {
    margin-bottom: 0 !important;
  }

  .navbar-nav {
    font-size: 16px;
    margin-right: 0.7rem;
    padding: 0;
    margin: 0;
  }

  .navbar-nav .nav-link,
  .navbar-nav .dropdown-item {
    padding: 0.4rem 1rem;
    /* Segunda medida regula o espaÃ§o entre colunas */
    margin: 0;
    font-size: 16px;
  }

  .navbar-nav .dropdown-menu .dropdown-item {
    padding: 0.4rem 1rem;
  }

  .navbar-brand img {
    max-height: 40px;
  }

  .card-body {
    overflow-y: auto;
    max-height: calc(100vh - 57px);
  }

  body.home-dashboard>.card.shadow>.card-body {
    max-height: calc(100vh - 49px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-bottom: .25rem;
  }

  .monthly-ranking-row,
  .annual-ranking-grid {
    flex: 0 0 auto;
  }

  .annual-ranking-intro {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .75rem;
    margin: auto 0 .65rem;
    padding: .55rem .75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #f7f7f7;
  }

  .annual-ranking-intro h6 {
    margin: 0;
    color: #212529;
    font-weight: 700;
  }

  .annual-ranking-intro span {
    color: #405167;
    font-size: .82rem;
  }

  .annual-ranking-intro i {
    color: #f59e0b;
  }

  @keyframes pulse {
    0% {
      /* Tamanho normal e inclinado */
      transform: scale(1) rotate(-15deg);
    }

    50% {
      /* Aumenta o tamanho e mantÃ©m a inclinaÃ§Ã£o */
      transform: scale(1.5) rotate(-15deg);
    }

    100% {
      /* Volta ao normal, mantendo a inclinaÃ§Ã£o */
      transform: scale(1) rotate(-15deg);
    }
  }

  /* 2. Aplica a animaÃ§Ã£o (esta parte nÃ£o muda) */
  .crown-pulse {
    display: inline-block;
    animation: pulse 2s ease-in-out infinite;
  }

  .annual-card {
    height: 100%;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    overflow: hidden;
  }

  .annual-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .5rem;
    padding: .55rem .75rem;
    border-bottom: 1px solid #ddd;
    background: #f7f7f7;
  }

  .annual-card-title {
    display: flex;
    align-items: center;
    gap: .4rem;
    margin: 0;
    color: #212529;
    font-size: .88rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .annual-card-title i {
    color: #f59e0b;
  }

  .annual-card-year {
    color: #405167;
    font-size: .75rem;
    font-weight: 600;
  }

  .annual-card-body {
    padding: .95rem 1rem .95rem;
  }

  .annual-first {
    display: flex;
    grid-template-columns: 34px minmax(0, 1fr);
    align-items: center;
    gap: .65rem;
    min-height: 64px;
    padding-bottom: .8rem;
    justify-content: center;
    border-bottom: 1px solid #eee;
  }

  .annual-medal {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    font-size: 1.65rem;
    line-height: 1;
  }

  .annual-name {
    margin: 0;
    overflow: hidden;
    color: #111827;
    font-size: 1.12rem;
    font-weight: 700;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .annual-total {
    margin: .15rem 0 0;
    color: #405167;
    font-size: .78rem;
  }

  .annual-runners {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0;
    padding-top: .35rem;
  }

  .annual-runner {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    align-items: center;
    gap: .4rem;
    min-height: 50px;
    padding: .55rem .35rem;
    background: #fff;
  }

  .annual-runner-rank {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    font-size: 1.15rem;
    line-height: 1;
  }

  .annual-runner-name {
    margin: 0;
    overflow: hidden;
    color: #111827;
    font-size: .84rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: normal;
  }

  .annual-runner-total {
    color: #405167;
    font-size: .72rem;
  }

  .annual-empty {
    display: flex;
    min-height: 112px;
    align-items: center;
    justify-content: center;
    color: #405167;
    font-size: .85rem;
    text-align: center;
  }

  .ranking-period-form {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    position: relative;
  }

  .ranking-range-toggle {
    display: flex;
    align-items: center;
    gap: .45rem;
    min-width: 235px;
    height: 31px;
    padding: .2rem .65rem;
    border: 1px solid #6c757d;
    border-radius: 3px;
    background: #fff;
    color: #405167;
    font-size: .84rem;
    text-align: left;
  }

  .ranking-range-toggle i {
    color: #007bff;
  }

  .ranking-range-picker {
    display: none;
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 1060;
    width: 340px;
    padding: 0;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    box-shadow: 0 8px 18px rgba(15, 23, 42, .12);
    overflow: hidden;
  }

  .ranking-period-form.range-open .ranking-range-picker {
    display: block;
  }

  .ranking-calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: .7rem .75rem .45rem;
  }

  .ranking-calendar-nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: #405167;
    cursor: pointer;
  }

  .ranking-calendar-nav:hover {
    background: #eef2f7;
  }

  .ranking-calendar-title {
    display: flex;
    align-items: baseline;
    gap: .45rem;
    color: #405167;
    font-size: 1.05rem;
    font-weight: 600;
  }

  .ranking-calendar-weekdays,
  .ranking-calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }

  .ranking-calendar-weekdays {
    padding: 0 .65rem;
    color: #6c757d;
    font-size: .78rem;
    font-weight: 700;
    text-align: center;
  }

  .ranking-calendar-weekdays span {
    padding: .35rem 0;
  }

  .ranking-calendar-grid {
    padding: 0 .65rem .65rem;
  }

  .ranking-day {
    position: relative;
    height: 38px;
    border: 0;
    background: transparent;
    color: #405167;
    font-size: .82rem;
    cursor: pointer;
  }

  .ranking-day::before {
    content: "";
    position: absolute;
    inset: 0;
    background: transparent;
  }

  .ranking-day span {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
  }

  .ranking-day:hover span {
    background: #e9ecef;
  }

  .ranking-day.is-muted {
    color: #c4c9cf;
  }

  .ranking-day.is-in-range::before {
    background: #e9ecef;
  }

  .ranking-day.is-range-start::before {
    left: 50%;
    background: #e9ecef;
  }

  .ranking-day.is-range-end::before {
    right: 50%;
    background: #e9ecef;
  }

  .ranking-day.is-range-start span,
  .ranking-day.is-range-end span {
    background: #5aa2ff;
    color: #fff;
  }

  .ranking-day.is-range-start.is-range-end::before {
    background: transparent;
  }

  .ranking-range-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .5rem;
    padding: .55rem .75rem;
    border-top: 1px solid #ddd;
    background: #f7f7f7;
  }

  .ranking-range-hint {
    color: #405167;
    font-size: .75rem;
  }

  @media (max-height: 880px) and (min-width: 992px) {
    body.home-dashboard>.card.shadow>.card-body {
      max-height: calc(100vh - 49px);
      overflow-y: auto;
    }

    .monthly-ranking-row>[class*="col-"]>.card {
      height: 500px !important;
    }

    .monthly-ranking-row .atd-list {
      height: 436px !important;
    }

    .monthly-ranking-row>[class*="col-"] {
      margin-bottom: .35rem !important;
    }

    .monthly-ranking-row+hr {
      margin-top: .2rem !important;
      margin-bottom: .2rem !important;
    }

    .annual-ranking-intro {
      margin: auto 0 .45rem;
      padding: .45rem .7rem;
    }

    .annual-card-body {
      padding: .75rem .85rem;
    }

    .annual-first {
      min-height: 56px;
      padding-bottom: .55rem;
    }

    .annual-runner {
      min-height: 42px;
      padding-top: .4rem;
      padding-bottom: .4rem;
    }
  }

  @media (max-height: 760px) and (min-width: 992px) {
    .monthly-ranking-row>[class*="col-"]>.card {
      height: 420px !important;
    }

    .monthly-ranking-row .atd-list {
      height: 356px !important;
    }

    .monthly-ranking-row>[class*="col-"] {
      margin-bottom: .2rem !important;
    }

    .monthly-ranking-row+hr {
      margin-top: .15rem !important;
      margin-bottom: .15rem !important;
    }

    .annual-ranking-intro {
      margin: auto 0 .35rem;
      padding: .35rem .65rem;
    }

    .annual-card-header {
      padding: .4rem .65rem;
    }

    .annual-card-body {
      padding: .55rem .75rem;
    }

    .annual-first {
      min-height: 48px;
      padding-bottom: .4rem;
    }

    .annual-medal {
      font-size: 1.45rem;
    }

    .annual-name {
      font-size: 1rem;
    }

    .annual-runners {
      padding-top: .2rem;
    }

    .annual-runner {
      min-height: 36px;
      padding-top: .3rem;
      padding-bottom: .3rem;
    }
  }

  @media (max-height: 680px) and (min-width: 992px) {
    .monthly-ranking-row>[class*="col-"]>.card {
      height: 360px !important;
    }

    .monthly-ranking-row .atd-list {
      height: 296px !important;
    }

    .monthly-ranking-row>[class*="col-"] {
      margin-bottom: .15rem !important;
    }

    .monthly-ranking-row+hr {
      margin-top: .1rem !important;
      margin-bottom: .1rem !important;
    }

    .annual-ranking-intro {
      margin: auto 0 .3rem;
    }

    .annual-ranking-intro span {
      display: none;
    }

    .annual-card-body {
      padding: .45rem .65rem;
    }

    .annual-first {
      min-height: 42px;
    }

    .annual-runner {
      min-height: 32px;
    }
  }

  @media (max-width: 991.98px) {
    html {
      height: auto;
      overflow: auto;
    }

    body.home-dashboard {
      height: auto;
      min-height: 100vh !important;
      overflow-y: auto;
    }

    body.home-dashboard>.card.shadow {
      height: auto;
      min-height: 100vh;
      overflow: visible;
    }

    body.home-dashboard>.card.shadow>.card-body {
      display: block;
      max-height: none;
      overflow: visible;
    }

    .monthly-ranking-row>[class*="col-"]>.card {
      height: 380px !important;
    }

    .monthly-ranking-row .atd-list {
      height: 316px !important;
    }

    .annual-ranking-intro {
      flex-direction: column;
      align-items: flex-start;
    }

    .annual-ranking-grid>[class*="col-"] {
      margin-bottom: .75rem !important;
    }

    .ranking-period-form {
      justify-content: flex-start;
      margin-top: .5rem;
    }

    .ranking-range-picker {
      left: 0;
      right: auto;
      width: min(340px, calc(100vw - 120px));
    }
  }

</style>

<body class="home-dashboard">
  <?php include_once("./all/loading_home.php"); ?>
  <?php include_once("all/sidebar.php"); ?>


  <?php

  // --- nova pagina home ---
  $ano_atual = date('Y');

  $trimestre_atual = (int) ceil(date('n') / 3);
  $trimestre_mes_inicio = (($trimestre_atual - 1) * 3) + 1;
  $trimestre_mes_fim = $trimestre_mes_inicio + 2;
  $trimestre_inicio = date('Y-m-d', mktime(0, 0, 0, $trimestre_mes_inicio, 1, $ano_atual));
  $trimestre_fim = date('Y-m-t', mktime(0, 0, 0, $trimestre_mes_fim, 1, $ano_atual));
  $ranking_trimestral_titulo = $trimestre_atual . '&ordm; trimestre ' . $ano_atual;
  $ranking_trimestral_periodo = 'T' . $trimestre_atual . ' ' . $ano_atual;

  $data_inicio_padrao = date('Y-m-01');
  $data_fim_padrao = date('Y-m-t');
  $data_inicio = $_GET['data_inicio'] ?? $data_inicio_padrao;
  $data_fim = $_GET['data_fim'] ?? $data_fim_padrao;

  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data_inicio) || !strtotime($data_inicio)) {
    $data_inicio = $data_inicio_padrao;
  }

  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data_fim) || !strtotime($data_fim)) {
    $data_fim = $data_fim_padrao;
  }

  if ($data_inicio > $data_fim) {
    [$data_inicio, $data_fim] = [$data_fim, $data_inicio];
  }

  $periodo_inicio_valor = htmlspecialchars($data_inicio, ENT_QUOTES, 'UTF-8');
  $periodo_fim_valor = htmlspecialchars($data_fim, ENT_QUOTES, 'UTF-8');
  $periodo_label = date('d/m/Y', strtotime($data_inicio)) . ' - ' . date('d/m/Y', strtotime($data_fim));

  $filtro_data_sql_atendimentos = " AND a.abertura BETWEEN '{$data_inicio} 00:00:00' AND '{$data_fim} 23:59:59' ";
  $filtro_data_sql_tarefas = " AND t.fechamento BETWEEN '{$data_inicio}' AND '{$data_fim} 23:59:59' ";
  $filtro_data_sql_QA = " AND interacoes.inter_data BETWEEN '{$data_inicio}' AND '{$data_fim} 23:59:59' ";


  // Filtros para o trimestre atual
  $filtro_trimestre_atendimentos = " AND a.abertura BETWEEN '{$trimestre_inicio} 00:00:00' AND '{$trimestre_fim} 23:59:59' ";
  $filtro_trimestre_tarefas = " AND t.fechamento BETWEEN '{$trimestre_inicio}' AND '{$trimestre_fim} 23:59:59' ";
  $filtro_trimestre_sql_QA = " AND interacoes.inter_data BETWEEN '{$trimestre_inicio}' AND '{$trimestre_fim} 23:59:59' ";

  // 1. PÃ³dio do ano: TI (alterado para LIMIT 3)
  $pdo = ConnectionN3();
  $sql_podio_ti = "SELECT u.user_nome AS nome_tecnico, COUNT(a.id) AS total
                 FROM atendimentos a JOIN usuarios u ON a.tecnico = u.user_id
                 WHERE u.user_funcao IN (1, 2, 3, 4, 5, 6)
                 AND u.user_sts = 1
                 AND (a.status = 4 OR a.status = 5)
                 {$filtro_trimestre_atendimentos}
                 GROUP BY u.user_id, u.user_nome ORDER BY total DESC LIMIT 3";
  $stmt_podio_ti = $pdo->prepare($sql_podio_ti);
  $stmt_podio_ti->execute();
  $podio_ti = $stmt_podio_ti->fetchAll(PDO::FETCH_ASSOC);


  // 2. PÃ³dio do ano: DevOps (alterado para LIMIT 3)
  $sql_podio_devops = "SELECT nome_tecnico, COUNT(*) AS total FROM (
                       SELECT u.user_nome AS nome_tecnico 
                       FROM atendimentos a
                       JOIN usuarios u ON a.tecnico = u.user_id
                     --  WHERE (u.user_funcao BETWEEN 12 AND 14 OR u.user_funcao = 9)
                     WHERE (u.user_funcao BETWEEN 9 AND 14)
                         AND u.user_sts = 1
                         AND (a.status = 4 OR a.status = 5)
                         {$filtro_trimestre_atendimentos}

                       UNION ALL

                       SELECT u.user_nome AS nome_tecnico 
                       FROM tarefas t
                       JOIN usuarios u ON t.tecnico = u.user_id
                     --  WHERE (u.user_funcao BETWEEN 12 AND 14 OR u.user_funcao = 9)
                     WHERE (u.user_funcao BETWEEN 9 AND 14)
                         AND u.user_sts = 1
                         AND (t.status = 4 OR t.status = 5)
                         {$filtro_trimestre_tarefas}
                   ) AS dados_combinados
                   GROUP BY nome_tecnico 
                   ORDER BY total DESC 
                   LIMIT 3";
  $stmt_podio_devops = $pdo->prepare($sql_podio_devops);
  $stmt_podio_devops->execute();
  $podio_devops = $stmt_podio_devops->fetchAll(PDO::FETCH_ASSOC);


  // 3. PÃ³dio do ano: MKT (a lÃ³gica de pegar os 3 primeiros Ã© em PHP)
  $pdoMkt = ConnectionMkt();
  $params_mkt_trimestre = [':inicio' => $trimestre_inicio, ':fim' => $trimestre_fim];
  $where_mkt_ano = "WHERE f.rel_type = 'task' 
                  AND COALESCE(ta.staffid, f.staffid) IN (SELECT staffid FROM tblstaff WHERE active = 1 AND staffid != 23)
                  AND DATE(f.dateadded) BETWEEN :inicio AND :fim";
  $sqlInteracoesAno = "SELECT COALESCE(ta.staffid, f.staffid) AS staffid, COUNT(CASE WHEN cfv.fieldid = 8 THEN cfv.relid END) AS artes_feitas
                     FROM tblfiles f
                     LEFT JOIN tbltasks t ON t.id = f.rel_id
                     LEFT JOIN tbltask_assigned ta ON ta.taskid = t.id
                     LEFT JOIN tblcustomfieldsvalues cfv ON f.rel_id = cfv.relid AND cfv.fieldid = 8
                     {$where_mkt_ano}
                     GROUP BY COALESCE(ta.staffid, f.staffid)";
  $stmt_mkt_ano = $pdoMkt->prepare($sqlInteracoesAno);
  $stmt_mkt_ano->execute($params_mkt_trimestre);
  $dadosInteracoesAno = $stmt_mkt_ano->fetchAll(PDO::FETCH_ASSOC);
  $dados_mkt_ano = [];
  foreach ($dadosInteracoesAno as $linha) {
    if ($linha['artes_feitas'] > 0) {
      $dados_mkt_ano[$linha['staffid']] = ['artes_feitas' => $linha['artes_feitas']];
    }
  }
  $sqlTecnicos = "SELECT staffid, CONCAT(firstname, ' ', lastname) FROM tblstaff WHERE active = 1";
  $stmt_tecnicos = $pdoMkt->query($sqlTecnicos);
  $todosTecnicos = $stmt_tecnicos->fetchAll(PDO::FETCH_KEY_PAIR);
  foreach ($dados_mkt_ano as $staffid => &$dado) {
    if (isset($todosTecnicos[$staffid])) {
      $dado['nome_tecnico'] = $todosTecnicos[$staffid];
    } else {
      unset($dados_mkt_ano[$staffid]);
    }
  }
  unset($dado);
  usort($dados_mkt_ano, function ($a, $b) {
    return $b['artes_feitas'] <=> $a['artes_feitas'];
  });
  // Pega os 3 primeiros do array apÃ³s ordenar
  $podio_mkt = array_slice($dados_mkt_ano, 0, 3);

  // 4. PÃ³dio do ano: QA
  $sql_podio_qa = "SELECT
                            CASE
                                WHEN u.user_funcao = 7 THEN u.user_nome
                                ELSE 'Outros Colaboradores'
                            END AS nome_colaborador,
                            
                            COUNT(*) AS total
                          FROM (
                            SELECT inter_user, inter_data 
                            FROM interatividade WHERE inter_tipo = 1
                            UNION ALL
                            SELECT inter_user, inter_data 
                            FROM inter_tarefa WHERE inter_tipo = 1
                          ) AS interacoes
                          JOIN usuarios u ON u.user_id = interacoes.inter_user
                          WHERE u.user_sts = 1
                        {$filtro_trimestre_sql_QA}
                      GROUP BY u.user_id, u.user_nome ORDER BY total DESC LIMIT 3";
  $stmt_podio_qa = $pdo->prepare($sql_podio_qa);
  $stmt_podio_qa->execute();
  $podio_qa = $stmt_podio_qa->fetchAll(PDO::FETCH_ASSOC);



  ?>

  <?php if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 1) : ?>
    <div class="card shadow">

      <div class="card-header py-2 ">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="mb-0">RANKING
          </h5>
          <form class="ranking-period-form" method="get" id="rankingPeriodForm">
            <input type="hidden" id="data_inicio" name="data_inicio" value="<?= $periodo_inicio_valor ?>">
            <input type="hidden" id="data_fim" name="data_fim" value="<?= $periodo_fim_valor ?>">
            <button type="button" class="ranking-range-toggle" id="rankingRangeToggle" aria-expanded="false" aria-controls="rankingRangePicker">
              <i class="far fa-calendar-alt"></i>
              <span id="rankingRangeLabel"><?= htmlspecialchars($periodo_label, ENT_QUOTES, 'UTF-8') ?></span>
            </button>
            <div class="ranking-range-picker" id="rankingRangePicker">
              <div class="ranking-calendar-header">
                <button type="button" class="ranking-calendar-nav" id="rankingCalendarPrev" aria-label="Mes anterior">
                  <i class="fas fa-chevron-left"></i>
                </button>
                <div class="ranking-calendar-title">
                  <span id="rankingCalendarMonth"></span>
                  <span id="rankingCalendarYear"></span>
                </div>
                <button type="button" class="ranking-calendar-nav" id="rankingCalendarNext" aria-label="Proximo mes">
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
              <div class="ranking-calendar-weekdays">
                <span>Dom</span>
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sab</span>
              </div>
              <div class="ranking-calendar-grid" id="rankingCalendarGrid"></div>
              <div class="ranking-range-actions">
                <span class="ranking-range-hint" id="rankingRangeHint">Selecione o período</span>
                <a href="home.php" class="btn btn-outline-secondary btn-sm">Mês atual</a>
                <button type="submit" class="btn btn-secondary btn-sm" id="rankingRangeApply">Aplicar</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div class="card-body bg-light;">
        <div class="row monthly-ranking-row">

          <!-- Coluna de 1 barras TI-->
          <div class="col-lg-3 col-md-6 col-sm-12 mb-3">
            <div class="card h-100" style="overflow-y: auto; height: 500px;">
              <?php
              $pdo = ConnectionN3();
              $sql_prod_1 = "SELECT u.user_nome AS nome_tecnico, COUNT(a.id) AS total
                                   FROM atendimentos a JOIN usuarios u ON a.tecnico = u.user_id
                                   WHERE u.user_funcao IN (1,2, 4, 5, 6)
                                     AND u.user_sts = 1
                                     AND (a.status = 4 OR a.status = 5)
                                     {$filtro_data_sql_atendimentos}
                                   GROUP BY u.user_id, u.user_nome ORDER BY total DESC";

              $stmt_prod_1 = $pdo->prepare($sql_prod_1);
              $stmt_prod_1->execute();
              $resultados_1 = $stmt_prod_1->fetchAll(PDO::FETCH_ASSOC);
              $max_valor_1 = !empty($resultados_1) ? max(array_column($resultados_1, 'total')) : 0;
              $total_geral_ti = array_sum(array_column($resultados_1, 'total'));
              ?>

              <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h6><i class="fas fa-microchip text-primary"></i> TI</h6>
                <span style="font-size: 0.9em;font-weight: bold;"> Total: <?= $total_geral_ti ?></span>
              </div>

              <div class="card-body atd-list" style="overflow-y: auto; height: 500px;">
                <?php
                if (empty($resultados_1)) {
                  echo '<p class="p-2 text-muted">Nenhum dado no período.</p>';
                } else {
                  // AlteraÃ§Ã£o aqui para adicionar a coroa
                  foreach ($resultados_1 as $index => $item) {
                    $percentual = $max_valor_1 > 0 ? ($item['total'] / $max_valor_1) * 100 : 0;
                    $coroa = ($index == 0) ? '<i class="fas fa-crown text-warning crown-pulse" style="margin-right: 5px;"></i>' : '';
                    echo '<div class="tecnico-item" style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                                        <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                            <span>' . $coroa . htmlspecialchars($item['nome_tecnico']) . '</span>
                                            <span style="font-size: 1.1em;">' . $item['total'] . '</span>
                                        </div>
                                        <div style="background-color: #e9ecef; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 4px;">
                                            <div style="height: 100%; width: ' . $percentual . '%; background-color: #007bff;"></div>
                                        </div>
                                      </div>';
                  }
                }
                ?>
              </div>
            </div>
          </div>

          <!-- Coluna de barras 2 Devops-->
          <div class="col-lg-3 col-md-6 col-sm-12 mb-3">
            <div class="card h-100" style="overflow-y: auto; height: 500px;">
              <?php
              // Consulta separada para atendimentos
              $sql_atendimentos = "SELECT u.user_nome AS nome_tecnico, COUNT(a.id) AS total
                     FROM atendimentos a
                     JOIN usuarios u ON a.tecnico = u.user_id
                    --  WHERE (u.user_funcao BETWEEN 12 AND 14 OR u.user_funcao = 9)
                     WHERE (u.user_funcao BETWEEN 9 AND 14)

                       AND u.user_sts = 1
                       AND (a.status = 4 OR a.status = 5)
                       {$filtro_data_sql_atendimentos}
                     GROUP BY u.user_id, u.user_nome";


              // Consulta separada para tarefas
              $sql_tarefas = "SELECT u.user_nome AS nome_tecnico, COUNT(t.id) AS total
                FROM tarefas t
                JOIN usuarios u ON t.tecnico = u.user_id
                --  WHERE (u.user_funcao BETWEEN 12 AND 14 OR u.user_funcao = 9)
                WHERE (u.user_funcao BETWEEN 9 AND 14)
                  AND u.user_sts = 1
                  AND (t.status = 4 OR t.status = 5)
                  {$filtro_data_sql_tarefas}
                GROUP BY u.user_id, u.user_nome";

              $stmt_atendimentos = $pdo->prepare($sql_atendimentos);
              $stmt_atendimentos->execute();
              $atendimentos_list = $stmt_atendimentos->fetchAll(PDO::FETCH_ASSOC);

              $stmt_tarefas = $pdo->prepare($sql_tarefas);
              $stmt_tarefas->execute();
              $tarefas_list = $stmt_tarefas->fetchAll(PDO::FETCH_ASSOC);

              // Combinar dados mantendo a separaÃ§Ã£o por cores
              $resultados_2 = [];

              foreach ($atendimentos_list as $atd) {
                $nome = $atd['nome_tecnico'];
                if (!isset($resultados_2[$nome])) {
                  $resultados_2[$nome] = ['total' => 0, 'atendimentos' => 0, 'tarefas' => 0];
                }
                $resultados_2[$nome]['atendimentos'] = $atd['total'];
                $resultados_2[$nome]['total'] += $atd['total'];
              }

              foreach ($tarefas_list as $trf) {
                $nome = $trf['nome_tecnico'];
                if (!isset($resultados_2[$nome])) {
                  $resultados_2[$nome] = ['total' => 0, 'atendimentos' => 0, 'tarefas' => 0];
                }
                $resultados_2[$nome]['tarefas'] = $trf['total'];
                $resultados_2[$nome]['total'] += $trf['total'];
              }

              // Ordenar por total
              uasort($resultados_2, function ($a, $b) {
                return $b['total'] <=> $a['total'];
              });

              $max_valor_2 = !empty($resultados_2) ? max(array_column($resultados_2, 'total')) : 0;
              $total_geral_devops = array_sum(array_column($resultados_2, 'total'));
              ?>

              <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h6><i class="fas fa-code text-warning"></i> DevOps</h6>
                <span style="font-size: 0.9em;font-weight: bold;">Total: <?= $total_geral_devops ?></span>
              </div>

              <div class="card-body atd-list" style="overflow-y: auto; height: 500px;">
                <?php
                if (empty($resultados_2)) {
                  echo '<p class="p-2 text-muted">Nenhum dado no período.</p>';
                } else {
                  $index = 0;
                  foreach ($resultados_2 as $nome_tecnico => $item) {
                    $percentual_total = $max_valor_2 > 0 ? ($item['total'] / $max_valor_2) * 100 : 0;
                    $percentual_atd = $item['total'] > 0 ? ($item['atendimentos'] / $item['total']) * 100 : 0;
                    $percentual_trf = $item['total'] > 0 ? ($item['tarefas'] / $item['total']) * 100 : 0;

                    $coroa = ($index == 0) ? '<i class="fas fa-crown text-warning crown-pulse" style="margin-right: 5px;"></i>' : '';

                    $largura_atd = ($percentual_total * $percentual_atd) / 100;
                    $largura_trf = ($percentual_total * $percentual_trf) / 100;

                    echo '<div class="tecnico-item" style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                                        <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                            <span>' . $coroa . htmlspecialchars($nome_tecnico) . '</span>
                                            <span style="font-size: 1.1em;">' . $item['total'] . '</span>
                                        </div>
                                        <div style="background-color: #e9ecef; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 4px; display: flex; align-items: center;">';

                    if ($item['atendimentos'] > 0) {
                      echo '<div title="Atendimentos: ' . $item['atendimentos'] . '" style="height: 100%; width: ' . $largura_atd . '%; background-color: #c23a1bff; display: flex; align-items: center; justify-content: center; color: #ffffffff; font-weight: bold; font-size: 0.75em;">' . $item['atendimentos'] . '</div>';
                    }
                    if ($item['tarefas'] > 0) {
                      echo '<div title="Tarefas: ' . $item['tarefas'] . '" style="height: 100%; width: ' . $largura_trf . '%; background-color: #f5981e; display: flex; align-items: center; justify-content: center; color: #ffffffff; font-weight: bold; font-size: 0.75em;">' . $item['tarefas'] . '</div>';
                    }
                    echo '</div>
                                      </div>';
                    $index++;
                  }
                }
                ?>
              </div>
            </div>
          </div>

          <!-- Coluna de barras 3 Marketing-->
          <div class="col-lg-3 col-md-6 col-sm-12 mb-3">
            <div class="card h-100 " style="overflow-y: auto; height: 500px;">
              <?php
              $pdoMkt = ConnectionMkt();
              $params_mkt = [':inicio' => $data_inicio, ':fim' => $data_fim];
              $where_mkt = "WHERE f.rel_type = 'task' 
                                  AND COALESCE(ta.staffid, f.staffid) IN (SELECT staffid FROM tblstaff WHERE active = 1 AND staffid != 23)
                                  AND DATE(f.dateadded) BETWEEN :inicio AND :fim";
              $sqlInteracoes = "
                        SELECT 
                            COALESCE(ta.staffid, f.staffid) AS staffid,
                            COUNT(CASE WHEN cfv.fieldid = 8 THEN cfv.relid END) AS artes_feitas
                        FROM tblfiles f
                        LEFT JOIN tbltasks t ON t.id = f.rel_id
                        LEFT JOIN tbltask_assigned ta ON ta.taskid = t.id
                        LEFT JOIN tblcustomfieldsvalues cfv ON f.rel_id = cfv.relid AND cfv.fieldid = 8
                        {$where_mkt}
                        GROUP BY COALESCE(ta.staffid, f.staffid)
                    ";
              $stmt_mkt = $pdoMkt->prepare($sqlInteracoes);
              $stmt_mkt->execute($params_mkt);
              $dadosInteracoes = $stmt_mkt->fetchAll(PDO::FETCH_ASSOC);
              $dados_mkt = [];
              foreach ($dadosInteracoes as $linha) {
                if ($linha['artes_feitas'] > 0) {
                  $dados_mkt[$linha['staffid']] = ['artes_feitas' => $linha['artes_feitas']];
                }
              }
              $sqlTecnicos = "SELECT staffid, CONCAT(firstname, ' ', lastname) FROM tblstaff WHERE active = 1";
              $stmt_tecnicos = $pdoMkt->query($sqlTecnicos);
              $todosTecnicos = $stmt_tecnicos->fetchAll(PDO::FETCH_KEY_PAIR);
              foreach ($dados_mkt as $staffid => &$dado) {
                if (isset($todosTecnicos[$staffid])) {
                  $dado['nome_tecnico'] = $todosTecnicos[$staffid];
                } else {
                  unset($dados_mkt[$staffid]);
                }
              }
              unset($dado);
              usort($dados_mkt, function ($a, $b) {
                return $b['artes_feitas'] <=> $a['artes_feitas'];
              });
              $total_geral_mkt = array_sum(array_column($dados_mkt, 'artes_feitas'));
              $max_valor_mkt = !empty($dados_mkt) ? max(array_column($dados_mkt, 'artes_feitas')) : 0;
              ?>

              <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h6><i class="fas fa-bullhorn text-success"></i> MKT</h6>
                <span style="font-size: 0.9em;font-weight: bold;"> Total: <?= $total_geral_mkt ?></span>
              </div>

              <div class="card-body atd-list" style="overflow-y: auto; height: 500px;">
                <?php
                if (empty($dados_mkt)) {
                  echo '<p class="p-2 text-muted">Nenhum dado no período.</p>';
                } else {
                  // AlteraÃ§Ã£o aqui para adicionar a coroa
                  foreach ($dados_mkt as $index => $item) {
                    $percentual = $max_valor_mkt > 0 ? ($item['artes_feitas'] / $max_valor_mkt) * 100 : 0;
                    // DEPOIS (com a nova classe):
                    $coroa = ($index == 0) ? '<i class="fas fa-crown text-warning crown-pulse" style="margin-right: 5px; "></i>' : '';
                    echo '<div class="tecnico-item" style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                                        <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                            <span>' . $coroa . htmlspecialchars($item['nome_tecnico']) . '</span>
                                            <span style="font-size: 1.1em;">' . $item['artes_feitas'] . '</span>
                                        </div>
                                        <div style="background-color: #e9ecef; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 4px;">
                                            <div style="height: 100%; width: ' . $percentual . '%; background-color: #109618;"></div>
                                        </div>
                                      </div>';
                  }
                }
                ?>
              </div>
            </div>
          </div>

          <!-- Coluna de Barras 4 QA -->
          <div class="col-lg-3 col-md-6 col-sm-12 mb-3">
            <div class="card h-100">
              <?php
              // ConexÃ£o com o banco de dados
              $pdo = ConnectionN3();
              $sql_QA = "SELECT
              CASE
                WHEN u.user_funcao IN (3,7) THEN u.user_nome
                ELSE 'Outros Colaboradores'
              END AS nome_colaborador,
              COUNT(*) AS total
           FROM (
             SELECT inter_user, inter_data FROM interatividade WHERE inter_tipo = 1
             UNION ALL
             SELECT inter_user, inter_data FROM inter_tarefa WHERE inter_tipo = 1
           ) AS interacoes
           JOIN usuarios u ON u.user_id = interacoes.inter_user
           WHERE u.user_sts > 0
             {$filtro_data_sql_QA}
           GROUP BY
             CASE
               WHEN u.user_funcao IN (3,7) THEN u.user_nome
               ELSE 'Outros Colaboradores'
             END
           ORDER BY total DESC";


              $stmt_QA = $pdo->prepare($sql_QA);
              $stmt_QA->execute();
              $resultados_interacao = $stmt_QA->fetchAll(PDO::FETCH_ASSOC);
              $max_valor_criacao = !empty($resultados_interacao) ? max(array_column($resultados_interacao, 'total')) : 0;
              $total_geral_criacao = array_sum(array_column($resultados_interacao, 'total'));
              ?>

              <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h6><i class="fas fa-info-circle" style="color: #6f42c1;"></i> QA - Abertura de Atd</h6> <span style="font-size: 0.9em; font-weight: bold;"> Total: <?= $total_geral_criacao ?></span>
              </div>

              <div class="card-body atd-list" style="overflow-y: auto; height: 500px;">
                <?php
                if (empty($resultados_interacao)) {
                  echo '<p class="p-2 text-muted">Nenhum dado no período.</p>';
                } else {
                  foreach ($resultados_interacao as $index => $item) {
                    $percentual = $max_valor_criacao > 0 ? ($item['total'] / $max_valor_criacao) * 100 : 0;
                    $coroa = ($index == 0) ? '<i class="fas fa-crown text-warning crown-pulse" style="margin-right: 5px;"></i>' : '';

                    echo '
                    <div class="tecnico-item" style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; font-weight: bold;">
                            <span>' . $coroa . htmlspecialchars($item['nome_colaborador']) . '</span>
                            <span style="font-size: 1.1em;">' . $item['total'] . '</span>
                        </div>
                        <div style="background-color: #e9ecef; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 4px;">
                            <div style="height: 100%; width: ' . $percentual . '%; background-color: #6f42c1;"></div>
                        </div>
                    </div>';
                  }
                }
                ?>
              </div>
            </div>
          </div>

        </div>
        <!-- </div> -->

        <hr class="my-1">
        <div class="annual-ranking-intro">
          <h6><i class="fas fa-trophy"></i> Ranking trimestral <?= $ranking_trimestral_titulo ?></h6>
        </div>
        <div class="row annual-ranking-grid mt-1 mb-0">

          <div class="col-lg-3 col-md-6 col-sm-12 mb-0">
            <?php
            if (!empty($podio_ti)) :
              $primeiro_ti = $podio_ti[0] ?? null;
              $segundo_ti  = $podio_ti[1] ?? null;
              $terceiro_ti = $podio_ti[2] ?? null;
            ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>TI</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-card-body">
                  <?php if ($primeiro_ti) : ?>
                    <div class="annual-first">
                      <span class="annual-medal">&#129351;</span>
                      <div>
                        <p class="annual-name"><?= htmlspecialchars($primeiro_ti['nome_tecnico']) ?></p>
                        <p class="annual-total"><?= $primeiro_ti['total'] ?> atendimentos</p>
                      </div>
                    </div>
                  <?php endif; ?>
                  <div class="annual-runners">
                    <?php if ($segundo_ti) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129352;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($segundo_ti['nome_tecnico']) ?></p>
                          <span class="annual-runner-total"><?= $segundo_ti['total'] ?> atendimentos</span>
                        </div>
                      </div>
                    <?php endif; ?>
                    <?php if ($terceiro_ti) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129353;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($terceiro_ti['nome_tecnico']) ?></p>
                          <span class="annual-runner-total"><?= $terceiro_ti['total'] ?> atendimentos</span>
                        </div>
                      </div>
                    <?php endif; ?>
                  </div>
                </div>
              </div>
            <?php else : ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>TI</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-empty">Nenhum registro no trimestre.</div>
              </div>
            <?php endif; ?>
          </div>

          <div class="col-lg-3 col-md-6 col-sm-12 mb-0">
            <?php
            if (!empty($podio_devops)) :
              $primeiro_devops = $podio_devops[0] ?? null;
              $segundo_devops  = $podio_devops[1] ?? null;
              $terceiro_devops = $podio_devops[2] ?? null;
            ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>DevOps</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-card-body">
                  <?php if ($primeiro_devops) : ?>
                    <div class="annual-first">
                      <span class="annual-medal">&#129351;</span>
                      <div>
                        <p class="annual-name"><?= htmlspecialchars($primeiro_devops['nome_tecnico']) ?></p>
                        <p class="annual-total"><?= $primeiro_devops['total'] ?> chamados</p>
                      </div>
                    </div>
                  <?php endif; ?>
                  <div class="annual-runners">
                    <?php if ($segundo_devops) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129352;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($segundo_devops['nome_tecnico']) ?></p>
                          <span class="annual-runner-total"><?= $segundo_devops['total'] ?> chamados</span>
                        </div>
                      </div>
                    <?php endif; ?>
                    <?php if ($terceiro_devops) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129353;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($terceiro_devops['nome_tecnico']) ?></p>
                          <span class="annual-runner-total"><?= $terceiro_devops['total'] ?> chamados</span>
                        </div>
                      </div>
                    <?php endif; ?>
                  </div>
                </div>
              </div>
            <?php else : ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>DevOps</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-empty">Nenhum registro no trimestre.</div>
              </div>
            <?php endif; ?>
          </div>

          <div class="col-lg-3 col-md-6 col-sm-12 mb-0">
            <?php
            if (!empty($podio_mkt)) :
              $primeiro_mkt = $podio_mkt[0] ?? null;
              $segundo_mkt  = $podio_mkt[1] ?? null;
              $terceiro_mkt = $podio_mkt[2] ?? null;
            ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>MKT</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-card-body">
                  <?php if ($primeiro_mkt) : ?>
                    <div class="annual-first">
                      <span class="annual-medal">&#129351;</span>
                      <div>
                        <p class="annual-name"><?= htmlspecialchars($primeiro_mkt['nome_tecnico']) ?></p>
                        <p class="annual-total"><?= $primeiro_mkt['artes_feitas'] ?> artes</p>
                      </div>
                    </div>
                  <?php endif; ?>
                  <div class="annual-runners">
                    <?php if ($segundo_mkt) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129352;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($segundo_mkt['nome_tecnico']) ?></p>
                          <span class="annual-runner-total"><?= $segundo_mkt['artes_feitas'] ?> artes</span>
                        </div>
                      </div>
                    <?php endif; ?>
                    <?php if ($terceiro_mkt) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129353;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($terceiro_mkt['nome_tecnico']) ?></p>
                          <span class="annual-runner-total"><?= $terceiro_mkt['artes_feitas'] ?> artes</span>
                        </div>
                      </div>
                    <?php endif; ?>
                  </div>
                </div>
              </div>
            <?php else : ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>MKT</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-empty">Nenhum registro no trimestre.</div>
              </div>
            <?php endif; ?>
          </div>

          <div class="col-lg-3 col-md-6 col-sm-12 mb-0">
            <?php
            if (!empty($podio_qa)) :
              $primeiro_qa = $podio_qa[0] ?? null;
              $segundo_qa  = $podio_qa[1] ?? null;
              $terceiro_qa = $podio_qa[2] ?? null;
            ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>QA</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-card-body">
                  <?php if ($primeiro_qa) : ?>
                    <div class="annual-first">
                      <span class="annual-medal">&#129351;</span>
                      <div>
                        <p class="annual-name"><?= htmlspecialchars($primeiro_qa['nome_colaborador']) ?></p>
                        <p class="annual-total"><?= $primeiro_qa['total'] ?> chamados</p>
                      </div>
                    </div>
                  <?php endif; ?>
                  <div class="annual-runners">
                    <?php if ($segundo_qa) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129352;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($segundo_qa['nome_colaborador']) ?></p>
                          <span class="annual-runner-total"><?= $segundo_qa['total'] ?> chamados</span>
                        </div>
                      </div>
                    <?php endif; ?>
                    <?php if ($terceiro_qa) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129353;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($terceiro_qa['nome_colaborador']) ?></p>
                          <span class="annual-runner-total"><?= $terceiro_qa['total'] ?> chamados</span>
                        </div>
                      </div>
                    <?php endif; ?>
                  </div>
                </div>
              </div>
            <?php else : ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>QA</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-empty">Nenhum registro no trimestre.</div>
              </div>
            <?php endif; ?>
          </div>
        </div>
        </div>
      </div>

      <?php endif; ?>

      <?php if (isset($mensagem)) { ?>
        <div class="row pull-right" style="position:absolute; top: 65px; right:25px;">
          <div class="alert <?php echo $mensagem_cor; ?> alert-dismissible fade show" role="alert">
            <?php echo $mensagem; ?>
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        </div>
      <?php } ?>
      <script src="./js/jquery-3.6.0.min.js"></script>
      <script src="./js/bootstrap.min.js"></script>
      <?php include_once("./all/update_pass.php"); ?>
      <?php if (isset($mensagem)) { ?>
        <script>
          window.setTimeout(function() {
            $(".alert").alert('close');
          }, 4000);
        </script>
      <?php } ?>

      <script>
        $(document).ready(function() {
          $('#modalSenha').on('click', '.toggle-password', function() {

            // 'this' Ã© o <span> que foi clicado
            var icon = $(this).find('i');
            var input = $(this).closest('.input-group').find('input');

            // Verifica o tipo atual do input
            if (input.attr('type') === 'password') {
              // Muda para texto
              input.attr('type', 'text');
              // Muda o Ã­cone para 'olho cortado'
              icon.removeClass('fa-eye').addClass('fa-eye-slash');
            } else {
              // Muda para senha
              input.attr('type', 'password');
              // Muda o Ã­cone de volta para 'olho'
              icon.removeClass('fa-eye-slash').addClass('fa-eye');
            }
          });

          var periodForm = $('#rankingPeriodForm');
          var rangeToggle = $('#rankingRangeToggle');
          var hiddenStart = $('#data_inicio');
          var hiddenEnd = $('#data_fim');
          var calendarGrid = $('#rankingCalendarGrid');
          var calendarMonth = $('#rankingCalendarMonth');
          var calendarYear = $('#rankingCalendarYear');
          var rangeLabel = $('#rankingRangeLabel');
          var rangeHint = $('#rankingRangeHint');
          var monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
          var selectedStart = parseDateValue(hiddenStart.val());
          var selectedEnd = parseDateValue(hiddenEnd.val());
          var viewDate = new Date(selectedStart.getFullYear(), selectedStart.getMonth(), 1);
          var selectingEnd = false;

          function parseDateValue(value) {
            var parts = (value || '').split('-');
            if (parts.length !== 3) {
              return new Date();
            }

            return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          }

          function formatDateValue(date) {
            var month = String(date.getMonth() + 1).padStart(2, '0');
            var day = String(date.getDate()).padStart(2, '0');
            return date.getFullYear() + '-' + month + '-' + day;
          }

          function formatDateLabel(date) {
            var day = String(date.getDate()).padStart(2, '0');
            var month = String(date.getMonth() + 1).padStart(2, '0');
            return day + '/' + month + '/' + date.getFullYear();
          }

          function sameDate(first, second) {
            return first && second && first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
          }

          function normalizeDate(date) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
          }

          function syncRangePreview(updateHidden) {
            if (!selectedStart) {
              rangeHint.text('Selecione a data inicial');
              return;
            }

            var finalEnd = selectedEnd || selectedStart;

            if (updateHidden) {
              hiddenStart.val(formatDateValue(selectedStart));
              hiddenEnd.val(formatDateValue(finalEnd));
              rangeLabel.text(formatDateLabel(selectedStart) + ' - ' + formatDateLabel(finalEnd));
            }

            if (selectingEnd) {
              rangeHint.text('Escolha a data final');
            } else {
              rangeHint.text(formatDateLabel(selectedStart) + ' - ' + formatDateLabel(finalEnd));
            }
          }

          function renderCalendar() {
            var year = viewDate.getFullYear();
            var month = viewDate.getMonth();
            var firstDay = new Date(year, month, 1);
            var gridStart = new Date(year, month, 1 - firstDay.getDay());
            var rangeStart = selectedStart ? normalizeDate(selectedStart) : null;
            var rangeEnd = selectedStart ? normalizeDate(selectedEnd || selectedStart) : null;

            if (rangeStart && rangeEnd && rangeEnd < rangeStart) {
              var tempDate = rangeStart;
              rangeStart = rangeEnd;
              rangeEnd = tempDate;
            }

            calendarMonth.text(monthNames[month]);
            calendarYear.text(year);
            calendarGrid.empty();

            for (var index = 0; index < 42; index++) {
              var dayDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
              var normalizedDay = normalizeDate(dayDate);
              var dayButton = $('<button type="button" class="ranking-day"><span></span></button>');

              dayButton.find('span').text(dayDate.getDate());
              dayButton.attr('data-date', formatDateValue(dayDate));

              if (dayDate.getMonth() !== month) {
                dayButton.addClass('is-muted');
              }

              if (rangeStart && rangeEnd && normalizedDay >= rangeStart && normalizedDay <= rangeEnd) {
                dayButton.addClass('is-in-range');
              }

              if (rangeStart && sameDate(normalizedDay, rangeStart)) {
                dayButton.addClass('is-range-start');
              }

              if (rangeEnd && sameDate(normalizedDay, rangeEnd)) {
                dayButton.addClass('is-range-end');
              }

              calendarGrid.append(dayButton);
            }
          }

          rangeToggle.on('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            periodForm.toggleClass('range-open');
            rangeToggle.attr('aria-expanded', periodForm.hasClass('range-open') ? 'true' : 'false');
            renderCalendar();
          });

          periodForm.on('click', function(event) {
            event.stopPropagation();
          });

          $('#rankingCalendarPrev').on('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
            renderCalendar();
          });

          $('#rankingCalendarNext').on('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
            renderCalendar();
          });

          calendarGrid.on('click', '.ranking-day', function(event) {
            event.preventDefault();
            event.stopPropagation();
            var clickedDate = parseDateValue($(this).attr('data-date'));

            if ((selectedStart && sameDate(clickedDate, selectedStart)) || (selectedEnd && sameDate(clickedDate, selectedEnd))) {
              selectedStart = null;
              selectedEnd = null;
              selectingEnd = false;
              rangeHint.text('Selecione a data inicial');
              renderCalendar();
              return;
            }

            if (!selectingEnd) {
              selectedStart = clickedDate;
              selectedEnd = null;
              selectingEnd = true;
            } else {
              selectedEnd = clickedDate;

              if (selectedEnd < selectedStart) {
                var oldStart = selectedStart;
                selectedStart = selectedEnd;
                selectedEnd = oldStart;
              }

              selectingEnd = false;
            }

            syncRangePreview(false);
            renderCalendar();
          });

          $('#rankingRangeApply').on('click', function(event) {
            if (!selectedStart) {
              event.preventDefault();
              rangeHint.text('Selecione a data inicial');
              return;
            }

            syncRangePreview(true);
          });

          $(document).on('click', function(event) {
            if (!$(event.target).closest('#rankingPeriodForm').length) {
              periodForm.removeClass('range-open');
              rangeToggle.attr('aria-expanded', 'false');
            }
          });

          syncRangePreview(true);
          renderCalendar();

        })
      </script>

</body>

</html>
