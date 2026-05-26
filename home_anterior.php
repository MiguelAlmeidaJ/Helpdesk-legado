<?php
session_start();

include_once("./all/seguranca.php");
include_once("./all/conect.php");
include_once("./all/permissoes.php");
$data = date("Y-m-d");

//VERIFICA SE Há REQUISICAO PARA SER EXECUTADA
if (isset($_POST['action'])) {
  $action  = $_POST['action'];
  //SE A REQUISIÇÃO FOR PARA ALTERAR SENHA
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
  <script type="text/javascript" src="./js/loader.js"></script>
  <title>Allterus</title>
</head>

<body>
  <?php include_once("./all/loading_home.php"); ?>
  <?php include_once("all/sidebar.php"); ?>


  <?php

  // --- nova pagina home ---
  $ano_atual = date('Y');
  $mes_selecionado = isset($_GET['mes']) ? (int)$_GET['mes'] : date('n');
  $mes_selecionado = max(1, min(12, $mes_selecionado));

  $ano_inicio = "{$ano_atual}-01-01";
  $ano_fim = "{$ano_atual}-12-31";

  $data_inicio = "{$ano_atual}-{$mes_selecionado}-01";
  $data_fim = "{$ano_atual}-{$mes_selecionado}-31";

  $filtro_data_sql_atendimentos = " AND a.abertura BETWEEN '{$data_inicio} 00:00:00' AND '{$data_fim} 23:59:59' ";
  $filtro_data_sql_tarefas = " AND t.fechamento BETWEEN '{$data_inicio}' AND '{$data_fim}' ";


  // Filtros para o ANO INTEIRO
  $filtro_ano_atendimentos = " AND a.abertura BETWEEN '{$ano_inicio} 00:00:00' AND '{$ano_fim} 23:59:59' ";
  $filtro_ano_tarefas = " AND t.fechamento BETWEEN '{$ano_inicio}' AND '{$ano_fim}' ";

  // 1. Pódio do ano: TI (alterado para LIMIT 3)
  $pdo = ConnectionN3();
  $sql_podio_ti = "SELECT u.user_nome AS nome_tecnico, COUNT(a.id) AS total
                 FROM atendimentos a JOIN usuarios u ON a.tecnico = u.user_id
                 WHERE u.user_funcao BETWEEN 4 AND 6 AND u.user_sts = 1 AND (a.status = 4 OR a.status = 5)
                 {$filtro_ano_atendimentos}
                 GROUP BY u.user_id, u.user_nome ORDER BY total DESC LIMIT 3";
  $stmt_podio_ti = $pdo->prepare($sql_podio_ti);
  $stmt_podio_ti->execute();
  $podio_ti = $stmt_podio_ti->fetchAll(PDO::FETCH_ASSOC);


  // 2. Pódio do ano: DevOps (alterado para LIMIT 3)
  $sql_podio_devops = "SELECT nome_tecnico, COUNT(*) AS total FROM (
                       SELECT u.user_nome AS nome_tecnico FROM atendimentos a
                       JOIN usuarios u ON a.tecnico = u.user_id
                       WHERE u.user_funcao BETWEEN 13 AND 14 AND u.user_sts = 1 AND (a.status = 4 OR a.status = 5)
                       {$filtro_ano_atendimentos}
                       UNION ALL
                       SELECT u.user_nome AS nome_tecnico FROM tarefas t
                       JOIN usuarios u ON t.tecnico = u.user_id
                       WHERE u.user_funcao BETWEEN 13 AND 14 AND u.user_sts = 1 AND (t.status = 4 OR t.status = 5)
                       {$filtro_ano_tarefas}
                   ) AS dados_combinados
                   GROUP BY nome_tecnico ORDER BY total DESC LIMIT 3";
  $stmt_podio_devops = $pdo->prepare($sql_podio_devops);
  $stmt_podio_devops->execute();
  $podio_devops = $stmt_podio_devops->fetchAll(PDO::FETCH_ASSOC);


  // 3. Pódio do ano: MKT (a lógica de pegar os 3 primeiros é em PHP)
  $pdoMkt = ConnectionMkt();
  $params_mkt_ano = [':inicio' => $ano_inicio, ':fim' => $ano_fim];
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
  $stmt_mkt_ano->execute($params_mkt_ano);
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
  // Pega os 3 primeiros do array após ordenar
  $podio_mkt = array_slice($dados_mkt_ano, 0, 3);






  ?>

  <?php if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 1) : ?>
    <div class="card shadow">

      <div class="card-header py-2 ">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="mb-0">RANKING
          </h5>
          <div class="btn-toolbar" role="toolbar">
            <div class="btn-group btn-group-sm flex-wrap" role="group">
              <?php
              $meses_abrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              foreach ($meses_abrev as $i => $nome_mes) {
                $num_mes = $i + 1;
                $classe_ativo = ($num_mes == $mes_selecionado) ? 'btn-secondary' : 'btn-outline-secondary';
                echo "<a href='?mes={$num_mes}' class='btn {$classe_ativo} mb-1'>{$nome_mes}</a>";
              }
              ?>
            </div>
          </div>
        </div>
      </div>

      <div class="card-body bg-light;">
        <div class="row">

          <div class="col-lg-4 col-md-6 col-sm-12 mb-3">
            <div class="card h-100" style="overflow-y: auto; height: 450px;">
              <?php
              $pdo = ConnectionN3();
              $sql_prod_1 = "SELECT u.user_nome AS nome_tecnico, COUNT(a.id) AS total
                                   FROM atendimentos a JOIN usuarios u ON a.tecnico = u.user_id
                                   WHERE u.user_funcao BETWEEN 4 AND 6 
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

              <div class="card-body atd-list" style="overflow-y: auto; height: 450px;">
                <?php
                if (empty($resultados_1)) {
                  echo '<p class="p-2 text-muted">Nenhum dado no período.</p>';
                } else {
                  // Alteração aqui para adicionar a coroa
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

          <div class="col-lg-4 col-md-6 col-sm-12 mb-3">
            <div class="card h-100" style="overflow-y: auto; height: 450px;">
              <?php
              $sql_prod_2 = "SELECT 
                                   nome_tecnico,
                                   COUNT(*) AS total
                               FROM (
                                   SELECT u.user_nome AS nome_tecnico FROM atendimentos a
                                   JOIN usuarios u ON a.tecnico = u.user_id
                                   WHERE u.user_funcao BETWEEN 13 AND 14
                                     AND u.user_sts = 1
                                     AND (a.status = 4 OR a.status = 5)
                                     {$filtro_data_sql_atendimentos}

                                   UNION ALL

                                   SELECT u.user_nome AS nome_tecnico FROM tarefas t
                                   JOIN usuarios u ON t.tecnico = u.user_id
                                   WHERE u.user_funcao BETWEEN 13 AND 14
                                     AND u.user_sts = 1
                                     AND (t.status = 4 OR t.status = 5)
                                     {$filtro_data_sql_tarefas}
                               ) AS dados_combinados
                               GROUP BY nome_tecnico
                               ORDER BY total DESC";

              $stmt_prod_2 = $pdo->prepare($sql_prod_2);
              $stmt_prod_2->execute();
              $resultados_2 = $stmt_prod_2->fetchAll(PDO::FETCH_ASSOC);
              $max_valor_2 = !empty($resultados_2) ? max(array_column($resultados_2, 'total')) : 0;
              $total_geral_devops = array_sum(array_column($resultados_2, 'total'));
              ?>

              <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h6><i class="fas fa-code text-warning"></i> DevOps</h6>
                <span style="font-size: 0.9em;font-weight: bold;">Total: <?= $total_geral_devops ?></span>
              </div>

              <div class="card-body atd-list" style="overflow-y: auto; height: 450px;">
                <?php
                if (empty($resultados_2)) {
                  echo '<p class="p-2 text-muted">Nenhum dado no período.</p>';
                } else {
                  // Alteração aqui para adicionar a coroa
                  foreach ($resultados_2 as $index => $item) {
                    $percentual = $max_valor_2 > 0 ? ($item['total'] / $max_valor_2) * 100 : 0;
                    // DEPOIS (com a nova classe):
                    $coroa = ($index == 0) ? '<i class="fas fa-crown text-warning crown-pulse" style="margin-right: 5px;"></i>' : '';
                    echo '<div class="tecnico-item" style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                                        <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                            <span>' . $coroa . htmlspecialchars($item['nome_tecnico']) . '</span>
                                            <span style="font-size: 1.1em;">' . $item['total'] . '</span>
                                        </div>
                                        <div style="background-color: #e9ecef; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 4px;">
                                            <div style="height: 100%; width: ' . $percentual . '%; background-color: #f5981eff;"></div>
                                        </div>
                                      </div>';
                  }
                }
                ?>
              </div>
            </div>
          </div>

          <div class="col-lg-4 col-md-6 col-sm-12 mb-3">
            <div class="card h-100 " style="overflow-y: auto; height: 450px;">
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
                  // Alteração aqui para adicionar a coroa
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

        </div>
        <!-- </div> -->

        <hr class="mt-5 mb-5">
        <div class="row mt-3 mb-3">

          <div class="col-lg-4 col-md-12 mb-2 text-center">
            <h6 class="text-muted">?? RANKING TI <?= date('Y') ?></h6>
            <?php
            if (!empty($podio_ti)) :
              // Separa os colocados em variáveis para facilitar o uso
              $primeiro_ti = $podio_ti[0] ?? null;
              $segundo_ti  = $podio_ti[1] ?? null;
              $terceiro_ti = $podio_ti[2] ?? null;
            ?>

              <?php if ($primeiro_ti) : ?>
                <div class="mb-3">
                  <span style="font-size: 2.4em;">??</span>
                  <p class="lead mb-0" style="font-weight: 600; font-size: 1.8rem;"><?= htmlspecialchars($primeiro_ti['nome_tecnico']) ?></p>
                  <small class="text-muted"><?= $primeiro_ti['total'] ?> atendimentos</small>
                </div>
              <?php endif; ?>

              <div class="row">
                <?php if ($segundo_ti) : ?>
                  <div class="col-6 ">
                    <span style="font-size: 1.5em;">??</span>
                    <p class="lead mb-0" style="font-weight: 500;"><?= htmlspecialchars($segundo_ti['nome_tecnico']) ?></p>
                    <small class="text-muted"><?= $segundo_ti['total'] ?> atendimentos</small>
                  </div>
                <?php endif; ?>

                <?php if ($terceiro_ti) : ?>
                  <div class="col-6">
                    <span style="font-size: 1.5em;">??</span>
                    <p class="lead mb-0" style="font-weight: 500;"><?= htmlspecialchars($terceiro_ti['nome_tecnico']) ?></p>
                    <small class="text-muted"><?= $terceiro_ti['total'] ?> atendimentos</small>
                  </div>
                <?php endif; ?>
              </div>

            <?php else : ?>
              <p class="text-muted">Nenhum registro no ano.</p>
            <?php endif; ?>
          </div>

          <div class="col-lg-4 col-md-12 mb-2 text-center border-left border-right">
            <h6 class="text-muted">?? RANKING DEVOPS <?= date('Y') ?></h6>
            <?php
            if (!empty($podio_devops)) :
              $primeiro_devops = $podio_devops[0] ?? null;
              $segundo_devops  = $podio_devops[1] ?? null;
              $terceiro_devops = $podio_devops[2] ?? null;
            ?>

              <?php if ($primeiro_devops) : ?>
                <div class="mb-3">
                  <span style="font-size: 2.4em;">??</span>
                  <p class="lead mb-0" style="font-weight: 600; font-size: 1.8rem;"><?= htmlspecialchars($primeiro_devops['nome_tecnico']) ?></p>
                  <small class="text-muted"><?= $primeiro_devops['total'] ?> chamados</small>
                </div>
              <?php endif; ?>

              <div class="row">
                <?php if ($segundo_devops) : ?>
                  <div class="col-6 ">
                    <span style="font-size: 1.5em;">??</span>
                    <p class="lead mb-0" style="font-weight: 500;"><?= htmlspecialchars($segundo_devops['nome_tecnico']) ?></p>
                    <small class="text-muted"><?= $segundo_devops['total'] ?> chamados</small>
                  </div>
                <?php endif; ?>

                <?php if ($terceiro_devops) : ?>
                  <div class="col-6">
                    <span style="font-size: 1.5em;">??</span>
                    <p class="lead mb-0" style="font-weight: 500;"><?= htmlspecialchars($terceiro_devops['nome_tecnico']) ?></p>
                    <small class="text-muted"><?= $terceiro_devops['total'] ?> chamados</small>
                  </div>
                <?php endif; ?>
              </div>

            <?php else : ?>
              <p class="text-muted">Nenhum registro no ano.</p>
            <?php endif; ?>
          </div>

          <div class="col-lg-4 col-md-12 mb-2 text-center">
            <h6 class="text-muted">?? RANKING MKT <?= date('Y') ?></h6>
            <?php
            if (!empty($podio_mkt)) :
              $primeiro_mkt = $podio_mkt[0] ?? null;
              $segundo_mkt  = $podio_mkt[1] ?? null;
              $terceiro_mkt = $podio_mkt[2] ?? null;
            ?>
              <?php if ($primeiro_mkt) : ?>
                <div class="mb-3">
                  <span style="font-size: 2.4em;">??</span>
                  <p class="lead mb-0" style="font-weight: 600; font-size: 1.8rem;"><?= htmlspecialchars($primeiro_mkt['nome_tecnico']) ?></p>
                  <small class="text-muted"><?= $primeiro_mkt['artes_feitas'] ?> artes</small>
                </div>
              <?php endif; ?>

              <div class="row">
                <?php if ($segundo_mkt) : ?>
                  <div class="col-6 ">
                    <span style="font-size: 1.5em;">??</span>
                    <p class="lead mb-0" style="font-weight: 500;"><?= htmlspecialchars($segundo_mkt['nome_tecnico']) ?></p>
                    <small class="text-muted"><?= $segundo_mkt['artes_feitas'] ?> artes</small>
                  </div>
                <?php endif; ?>

                <?php if ($terceiro_mkt) : ?>
                  <div class="col-6">
                    <span style="font-size: 1.5em;">??</span>
                    <p class="lead mb-0" style="font-weight: 500;"><?= htmlspecialchars($terceiro_mkt['nome_tecnico']) ?></p>
                    <small class="text-muted"><?= $terceiro_mkt['artes_feitas'] ?> artes</small>
                  </div>
                <?php endif; ?>
              </div>

            <?php else : ?>
              <p class="text-muted">Nenhum registro no ano.</p>
            <?php endif; ?>
          </div>
        </div>
        <hr class="mt-5 mb-5 py-3">

      <?php endif; ?>


      <!-- inicio -->
      <div class="container-fluid mt-4 ">

        <div class="row">

          <div class="col-sx-12 col-sm-6 col-md-4 mb-1 px-1">
            <div class="card bg-default">
              <h6 class="card-header py-2">
                <i class="fas fa-chart-pie text-info"></i> Chamados abertos <small>(Por Tipo)</small>
              </h6>
              <div class="card-body">
                <?php
                $pdo = ConnectionN3();

                $filterEmpresas = "";

                if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                  $filterEmpresas .= " AND atendimentos.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
                }

                $sql = "SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.tipo = '1' AND atendimentos.`status` IN (1,2,3,4,5) ";
                if ($filterEmpresas) {
                  $sql .= $filterEmpresas;
                }
                $show = $pdo->prepare($sql);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_1 = $exibe["atd_num"];
                if ($atd_1 == "") {
                  $atd_1 = 0;
                }

                $sql2 = "SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.tipo = '2' AND atendimentos.`status` IN (1,2,3,4,5)";
                if ($filterEmpresas) {
                  $sql2 .= $filterEmpresas;
                }




                $show = $pdo->prepare($sql2);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);

                $atd_2 = $exibe["atd_num"];
                if ($atd_2 == "") {
                  $atd_2 = 0;
                }

                $sql3 = "SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.tipo = '3' AND atendimentos.`status` IN (1,2,3,4,5)";
                if ($filterEmpresas) {
                  $sql3 .= $filterEmpresas;
                }
                $show = $pdo->prepare($sql3);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_3 = $exibe["atd_num"];
                if ($atd_3 == "") {
                  $atd_3 = 0;
                }

                $sql4 = "SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.tipo = '4' AND atendimentos.`status` IN (1,2,3,4,5)";
                if ($filterEmpresas) {
                  $sql4 .= $filterEmpresas;
                }
                $show = $pdo->prepare($sql4);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_4 = $exibe["atd_num"];
                if ($atd_4 == "") {
                  $atd_4 = 0;
                }

                $sql5 = "SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.tipo = '5' AND atendimentos.`status` IN (1,2,3,4,5)";
                if ($filterEmpresas) {
                  $sql5 .= $filterEmpresas;
                }
                $show = $pdo->prepare($sql5);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_5 = $exibe["atd_num"];
                if ($atd_5 == "") {
                  $atd_5 = 0;
                }

                $matriz = "
            ['Falha',$atd_1],
            ['Relacionamento',$atd_2],
            ['Requisição de Serviços',$atd_3],
            ['Requisição de informação',$atd_4],
            ['Notificação de monitoramento',$atd_5]
            ";

                ?>
                <script type="text/javascript">
                  google.charts.load("current", {
                    packages: ["corechart"]
                  });
                  google.charts.setOnLoadCallback(drawChart);

                  function drawChart() {
                    var data = google.visualization.arrayToDataTable([
                      ['Tipo', 'Atendimentos'],
                      <?php echo $matriz; ?>
                    ]);
                    var options = {
                      is3D: true,
                      pieHole: 0.4,
                      chartArea: {
                        left: 2,
                        top: 5,
                        bottom: 35,
                        width: '100%',
                        height: '90%'
                      },
                      legend: {
                        position: 'bottom',
                        alignment: 'start'
                      },
                    };
                    var chart = new google.visualization.PieChart(document.getElementById('donutchart'));
                    chart.draw(data, options);
                  }
                </script>
                <div id="donutchart" style="width: 100%; height: 200px;"></div>
              </div>
            </div>
          </div>

          <div class="col-sx-12 col-sm-6 col-md-4 mb-1 px-1">
            <div class="card bg-default">
              <h6 class="card-header py-2">
                <!--  -->
                <i class="fas fa-chart-bar text-danger"></i> Chamados abertos <small>(Por Cliente)</small>
              </h6>
              <div class="card-body">
                <?php
                $pdo = ConnectionN3();

                $show_clt = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num, clientes.clt_nomer
            FROM atendimentos
            INNER JOIN clientes ON atendimentos.cliente = clientes.clt_id
            WHERE atendimentos.`status` IN (1,2,3) " . $filterEmpresas . "
            GROUP BY clientes.clt_id
            ORDER BY atd_num DESC LIMIT 0,10");
                $show_clt->execute();
                $matriz = "['Cliente','Atendimentos']";

                while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                  $clt_nom = $exibe["clt_nomer"];
                  $atd_num = $exibe["atd_num"];
                  $clt_nom = mb_strimwidth("$clt_nom", 0, 10, ".");
                  $matriz = "$matriz,['$clt_nom',$atd_num]";
                }
                ?>
                <script type="text/javascript">
                  google.charts.load('current', {
                    'packages': ['bar']
                  });
                  google.charts.setOnLoadCallback(drawStuff);

                  function drawStuff() {
                    var data = new google.visualization.arrayToDataTable([
                      <?php echo $matriz; ?>
                    ]);
                    var options = {
                      //width: 300,
                      width: "100%",
                      legend: {
                        position: 'none'
                      },
                      //chart: {
                      //title: 'Produtos mais vendidos',
                      //subtitle: 'Peso Total'
                      //},
                      bars: 'horizontal',
                      bar: {
                        groupWidth: "90%"
                      },


                    };
                    var chart = new google.charts.Bar(document.getElementById('top_10'));
                    chart.draw(data, options);
                  };
                </script>
                <div id="top_10" style="width: 100%; height: 200px;"></div>
              </div>
            </div>
          </div>

          <div class="col-sx-12 col-sm-6 col-md-4 mb-1 px-1">
            <div class="card bg-default">
              <h6 class="card-header py-2">
                <i class="fas fa-trophy text-primary"></i> Ranking <small>(últimos 7 Dias)</small>
              </h6>
              <div class="card-body">
                <?php
                //conta o total atendido pelos 3 maiores matadores de chamados
                $pdo = ConnectionN3();
                $cont_atd = $pdo->prepare("SELECT COUNT(atendimentos.id) AS atd_qnt, usuarios.user_nome FROM atendimentos INNER JOIN usuarios ON usuarios.user_id = atendimentos.tecnico WHERE atendimentos.abertura > '$data_d7' AND atendimentos.`status` = 4 " . $filterEmpresas . " GROUP BY atendimentos.tecnico ORDER BY atd_qnt DESC LIMIT 0,3");
                $cont_atd->execute();
                $n = 1;
                while ($e1 = $cont_atd->fetch(PDO::FETCH_ASSOC)) {
                  $positions[] = array(
                    'posicao' => "$n",
                    'tecnico' => $e1["user_nome"],
                    'atendimentos' => $e1["atd_qnt"]
                  );
                  $n++;
                }

                if (isset($positions[0]['tecnico'])) {
                  $p1_nome = ($positions[0]['tecnico']);
                } else {
                  $p1_nome = "";
                }
                if (isset($positions[1]['tecnico'])) {
                  $p2_nome = ($positions[1]['tecnico']);
                } else {
                  $p2_nome = "";
                }
                if (isset($positions[2]['tecnico'])) {
                  $p3_nome = ($positions[2]['tecnico']);
                } else {
                  $p3_nome = "";
                }

                if (isset($positions[0]['atendimentos'])) {
                  $p1_atd = ($positions[0]['atendimentos']);
                } else {
                  $p1_atd = "";
                }
                if (isset($positions[1]['atendimentos'])) {
                  $p2_atd = ($positions[1]['atendimentos']);
                } else {
                  $p2_atd = "";
                }
                if (isset($positions[2]['atendimentos'])) {
                  $p3_atd = ($positions[2]['atendimentos']);
                } else {
                  $p3_atd = "";
                }

                ?>
                <script type="text/javascript">
                  google.charts.load("current", {
                    packages: ['corechart']
                  });
                  google.charts.setOnLoadCallback(drawChart);

                  function drawChart() {
                    var data = google.visualization.arrayToDataTable([
                      ['Período', '<?php echo $p2_nome; ?>', '<?php echo $p1_nome; ?>', '<?php echo $p3_nome; ?>'],
                      ['7 Dias', <?php echo $p2_atd; ?>, <?php echo $p1_atd; ?>, <?php echo $p3_atd; ?>]
                    ]);

                    var view = new google.visualization.DataView(data);
                    var options = {
                      width: '100%',
                      height: '100%',
                      bar: {
                        groupWidth: "100%"
                      },
                      legend: {
                        position: "right"
                      },
                      chartArea: {
                        bottom: 3,
                        top: 5,
                        left: 20,
                        right: 120
                      },
                    };
                    var chart = new google.visualization.ColumnChart(document.getElementById("matadores"));
                    chart.draw(view, options);
                  }
                </script>
                <div id="matadores" style="width: 100%; height: 200px;"></div>
              </div>
            </div>
          </div>

        </div>


        <div class="row">
          <div class="col-sx-12 col-sm-12 col-md-6 mb-1 px-1">
            <div class="card bg-default">
              <h6 class="card-header py-2">
                <i class="fas fa-chart-line text-primary"></i> Abertura de Chamados <small>(Últimas 8 semanas)</small>
              </h6>
              <div class="card-body">
                <?php

                $hoje = date("Y-m-d");
                $dia = new DateTime($hoje);
                $dia->modify('next saturday');
                $dia_0 = $dia->format('Y-m-d');

                //$dia_0 = $hoje;
                $dia_0_n =  date('d/m', strtotime($dia_0));
                $dia_0a =  date('Y-m-d', strtotime($dia_0 . ' -6 days'));
                $dia_0a_n =  date('d/m', strtotime($dia_0 . ' -6 days'));

                $dia_1 =  date('Y-m-d', strtotime($dia_0 . ' -7 days'));
                $dia_1_n =  date('d/m', strtotime($dia_0 . ' -7 days'));
                $dia_1a =  date('Y-m-d', strtotime($dia_0 . ' -13 days'));
                $dia_1a_n =  date('d/m', strtotime($dia_0 . ' -13 days'));

                $dia_2 =  date('Y-m-d', strtotime($dia_0 . ' -14 days'));
                $dia_2_n =  date('d/m', strtotime($dia_0 . ' -14 days'));
                $dia_2a =  date('Y-m-d', strtotime($dia_0 . ' -20 days'));
                $dia_2a_n =  date('d/m', strtotime($dia_0 . ' -20 days'));

                $dia_3 =  date('Y-m-d', strtotime($dia_0 . ' -21 days'));
                $dia_3_n =  date('d/m', strtotime($dia_0 . ' -21 days'));
                $dia_3a =  date('Y-m-d', strtotime($dia_0 . ' -27 days'));
                $dia_3a_n =  date('d/m', strtotime($dia_0 . ' -27 days'));

                $dia_4 =  date('Y-m-d', strtotime($dia_0 . ' -28 days'));
                $dia_4_n =  date('d/m', strtotime($dia_0 . ' -28 days'));
                $dia_4a =  date('Y-m-d', strtotime($dia_0 . ' -34 days'));
                $dia_4a_n =  date('d/m', strtotime($dia_0 . ' -34 days'));

                $dia_5 =  date('Y-m-d', strtotime($dia_0 . ' -35 days'));
                $dia_5_n =  date('d/m', strtotime($dia_0 . ' -35 days'));
                $dia_5a =  date('Y-m-d', strtotime($dia_0 . ' -41 days'));
                $dia_5a_n =  date('d/m', strtotime($dia_0 . ' -41 days'));

                $dia_6 =  date('Y-m-d', strtotime($dia_0 . ' -42 days'));
                $dia_6_n =  date('d/m', strtotime($dia_0 . ' -42 days'));
                $dia_6a =  date('Y-m-d', strtotime($dia_0 . ' -48 days'));
                $dia_6a_n =  date('d/m', strtotime($dia_0 . ' -48 days'));

                $dia_7 =  date('Y-m-d', strtotime($dia_0 . ' -49 days'));
                $dia_7_n =  date('d/m', strtotime($dia_0 . ' -49 days'));
                $dia_7a =  date('Y-m-d', strtotime($dia_0 . ' -55 days'));
                $dia_7a_n =  date('d/m', strtotime($dia_0 . ' -55 days'));

                $pdo = ConnectionN3();
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_0a' AND '$dia_0' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_0 = $exibe["atd_num"];
                if ($atd_0 == "") {
                  $atd_0 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_1a' AND '$dia_1' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_1 = $exibe["atd_num"];
                if ($atd_1 == "") {
                  $atd_1 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_2a' AND '$dia_2' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_2 = $exibe["atd_num"];
                if ($atd_2 == "") {
                  $atd_2 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_3a' AND '$dia_3' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_3 = $exibe["atd_num"];
                if ($atd_3 == "") {
                  $atd_3 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_4a' AND '$dia_4' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_4 = $exibe["atd_num"];
                if ($atd_4 == "") {
                  $atd_4 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_5a' AND '$dia_5' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_5 = $exibe["atd_num"];
                if ($atd_5 == "") {
                  $atd_5 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_6a' AND '$dia_6' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_6 = $exibe["atd_num"];
                if ($atd_6 == "") {
                  $atd_6 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_7a' AND '$dia_7' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_7 = $exibe["atd_num"];
                if ($atd_7 == "") {
                  $atd_7 = 0;
                }

                $matriz = "
            ['$dia_7a_n a $dia_7_n',$atd_7],
            ['$dia_6a_n a $dia_6_n',$atd_6],
            ['$dia_5a_n a $dia_5_n',$atd_5],
            ['$dia_4a_n a $dia_4_n',$atd_4],
            ['$dia_3a_n a $dia_3_n',$atd_3],
            ['$dia_2a_n a $dia_2_n',$atd_2],
            ['$dia_1a_n a $dia_1_n',$atd_1],
            ['$dia_0a_n a $dia_0_n',$atd_0]
            ";
                ?>
                <script type="text/javascript">
                  google.charts.load('current', {
                    'packages': ['corechart']
                  });
                  google.charts.setOnLoadCallback(drawVisualization);

                  function drawVisualization() {
                    var data = google.visualization.arrayToDataTable([
                      ['Month', 'Chamados'],
                      <?php echo $matriz; ?>
                    ]);
                    var options = {
                      curveType: 'function',
                      chartArea: {
                        left: 30,
                        bottom: 30,
                        top: 0,
                        width: '100%',
                        height: '100%'
                      }
                    };
                    var chart = new google.visualization.ComboChart(document.getElementById('chart_div'));
                    chart.draw(data, options);
                  }
                </script>
                <div id="chart_div" style="width: 100%; height: 200px;"></div>
              </div>
            </div>
          </div>

          <div class="col-sx-12 col-sm-12 col-md-6 mb-1 px-1">
            <div class="card bg-default">
              <h6 class="card-header py-2">
                <i class="fas fa-chart-line text-danger"></i> Chamados Reincidentes <small>(Últimas 8 semanas)</small>
              </h6>
              <div class="card-body">
                <?php
                $pdo = ConnectionN3();
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_0a' AND '$dia_0' AND atendimentos.`reincidente` = '1' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_0 = $exibe["atd_num"];
                if ($atd_0 == "") {
                  $atd_0 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_1a' AND '$dia_1' AND atendimentos.`reincidente` = '1' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_1 = $exibe["atd_num"];
                if ($atd_1 == "") {
                  $atd_1 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_2a' AND '$dia_2' AND atendimentos.`reincidente` = '1' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_2 = $exibe["atd_num"];
                if ($atd_2 == "") {
                  $atd_2 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_3a' AND '$dia_3' AND atendimentos.`reincidente` = '1' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_3 = $exibe["atd_num"];
                if ($atd_3 == "") {
                  $atd_3 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_4a' AND '$dia_4' AND atendimentos.`reincidente` = '1' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_4 = $exibe["atd_num"];
                if ($atd_4 == "") {
                  $atd_4 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_5a' AND '$dia_5' AND atendimentos.`reincidente` = '1' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_5 = $exibe["atd_num"];
                if ($atd_5 == "") {
                  $atd_5 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_6a' AND '$dia_6' AND atendimentos.`reincidente` = '1' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_6 = $exibe["atd_num"];
                if ($atd_6 == "") {
                  $atd_6 = 0;
                }
                $show = $pdo->prepare("SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.abertura BETWEEN '$dia_7a' AND '$dia_7' AND atendimentos.`reincidente` = '1' AND atendimentos.`status` > '0' " . $filterEmpresas);
                $show->execute();
                $exibe = $show->fetch(PDO::FETCH_ASSOC);
                $atd_7 = $exibe["atd_num"];
                if ($atd_7 == "") {
                  $atd_7 = 0;
                }

                $matriz = "
            ['$dia_7a_n a $dia_7_n',$atd_7],
            ['$dia_6a_n a $dia_6_n',$atd_6],
            ['$dia_5a_n a $dia_5_n',$atd_5],
            ['$dia_4a_n a $dia_4_n',$atd_4],
            ['$dia_3a_n a $dia_3_n',$atd_3],
            ['$dia_2a_n a $dia_2_n',$atd_2],
            ['$dia_1a_n a $dia_1_n',$atd_1],
            ['$dia_0a_n a $dia_0_n',$atd_0]
            ";
                ?>
                <script type="text/javascript">
                  google.charts.load('current', {
                    'packages': ['corechart']
                  });
                  google.charts.setOnLoadCallback(drawVisualization);

                  function drawVisualization() {
                    var data = google.visualization.arrayToDataTable([
                      ['Month', 'Reincidentes'],
                      <?php echo $matriz; ?>
                    ]);
                    var options = {
                      curveType: 'function',
                      chartArea: {
                        left: 30,
                        bottom: 30,
                        top: 0,
                        width: '100%',
                        height: '100%'
                      },
                      colors: ['red', '#004411'],
                    };
                    var chart = new google.visualization.ComboChart(document.getElementById('chart_div1'));
                    chart.draw(data, options);
                  }
                </script>
                <div id="chart_div1" style="width: 100%; height: 200px;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>


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

</body>

</html>