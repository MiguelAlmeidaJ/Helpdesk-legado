<?php
session_start();
include_once("./all/seguranca.php");
include_once("./all/conect.php");
include_once("./all/permissoes.php");
$data = date("Y-m-d");

//VERIFICA SE HÁ REQUISICAO PARA SER EXECUTADA
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
  <nav class="navbar navbar-expand-lg navbar-light bg-light">
    <a class="navbar-brand" href="./home.php">
      <img src="./img/logo_allterus_001.png" height="30" class="d-inline-block align-top pr-1" alt="">ALLTERUS
    </a>
    <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNavDropdown">

      <ul class="navbar-nav mr-1">
        <?php //verifica as permissões de acesso do usuário
        if ($m1_00 == 1) { ?>
          <li class="nav-item text-left px-1 pt-1">
            <a class="dropdown-item m-0 pt-1" href="./user/home.php"><i class="text-info fas fa-users"></i><small> Usuários</small></a>
          </li>
        <?php } ?>
        <?php if ($m2_00 == 1) { ?>
          <li class="dropdown px-1 pt-1">
            <a class="dropdown-item dropdown-toggle m-0 pt-1" href="#" data-toggle="dropdown" role="button" aria-expanded="false" aria-haspopup="true" tabindex="-1"><i class="fas fa-file-medical"></i><small> Cadastros</small></a>
            <div class="dropdown-menu">
              <?php if ($m2_01 > 0) { ?>
                <a class="dropdown-item" href="./cads/clientes.php"><i class="fas fa-file-medical"></i><small> Clientes</small></a>
                <div class="dropdown-divider"></div>
              <?php } ?>
              <?php if ($m2_04 > 0) { ?>
                <a class="dropdown-item" href="./cads/categorias.php"><i class="fas fa-tags"></i><small> Categorias</small></a>
                <div class="dropdown-divider"></div>
              <?php } ?>
              <?php if ($m7_00 == 1) { ?>
                <a class="dropdown-item" href="./cads_cont/centros_custo.php"><i class="fas fa-funnel-dollar"></i><small> Centros de Custo</small></a>
                <div class="dropdown-divider"></div>
              <?php } ?>
              <?php if ($m7_00 == 1) { ?>
                <a class="dropdown-item" href="./cads_cont/class_contab.php"><i class="fas fa-tags"></i><small> Classificação Contábil</small></a>
                <div class="dropdown-divider"></div>
              <?php } ?>
              <?php if ($m7_00 == 1) { ?>
                <a class="dropdown-item" href="./cads_cont/ind_reaju.php"><i class="fas fa-donate"></i><small> Índices de reajuste</small></a>
                <div class="dropdown-divider"></div>
              <?php } ?>
              <?php if ($m7_00 == 1) { ?>
                <a class="dropdown-item" href="./cads_cont/forma_pag.php"><i class="fas fa-comments-dollar"></i><small> Formas de Pagamento</small></a>
                <div class="dropdown-divider"></div>
              <?php } ?>
              <?php if ($m7_00 == 1) { ?>
                <a class="dropdown-item" href="./cads_cont/tipo_despesa.php"><i class="fas fa-tag"></i><small> Tipo de Despesa</small></a>
                <div class="dropdown-divider"></div>
              <?php } ?>
              <?php if ($m7_00 == 1) { ?>
                <a class="dropdown-item" href="./cads_cont/tipo_servi.php"><i class="fas fa-tag"></i><small> Tipo de Serviço</small></a>
                <div class="dropdown-divider"></div>
              <?php } ?>
              <?php if ($m7_00 == 1) { ?>
                <a class="dropdown-item" href="./cads_cont/tipo_taxas.php"><i class="fas fa-tag"></i><small> Tipo Taxas</small></a>

              <?php } ?>
            </div>
          </li>

        <?php } ?>

        <?php if ($m3_00 == 1) { ?>
          <li class="dropdown px-1 pt-1">
            <a class="dropdown-item dropdown-toggle m-0 pt-1 text-danger" href="#" data-toggle="dropdown" role="button" aria-expanded="false" aria-haspopup="true" tabindex="-1"><i class="fas fa-headset text-danger"></i><small> Atendimentos</small></a>
            <div class="dropdown-menu">
              <a class="dropdown-item" href="./atd/home.php"><i class="fas fa-list-ul text-primary"></i><small> Lista de Atendimentos</small></a>

              <?php if ($m3_01 > 0) { ?>
                <div class="dropdown-divider"></div>
                <a class="dropdown-item text-danger" href="./atd/atd.php"><i class="fas fa-plus text-danger"></i><small> Novo Atendimento</small></a>
              <?php } ?>
            </div>
          </li>
        <?php } ?>


        <li class="dropdown px-1 pt-1">
          <a class="dropdown-item dropdown-toggle m-0 pt-1 text-info" href="#" data-toggle="dropdown" role="button" aria-expanded="false" aria-haspopup="true" tabindex="-1"><i class="fas fa-clipboard-list text-info"></i><small> Relatórios</small></a>
          <div class="dropdown-menu">
            <a class="dropdown-item" href="./rel/atd_abertos_por_tecnico.php"><i class="fas fa-user-tie text-info"></i><small> Atd abertos por tecnico</small></a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" href="./rel/atd_total_por_cliente.php"><i class="fas fa-headset text-info"></i><small> Atd total por cliente</small></a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" href="./rel/atd_total_por_tecnico.php"><i class="fas fa-user-tie text-info"></i><small> Atd total por técnico</small></a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" href="./rel/atd_total_por_categoria.php"><i class="fas fa-tags text-info"></i><small> Atd total por categoria</small></a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" href="./rel/atd_tempo_por_tecnico.php"><i class="far fa-clock text-warning"></i><small> Tempo médio para atendmento</small></a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" href="./rel/atd_analitico_por_cliente.php"><i class="fas fa-align-justify text-info"></i><small> Atd analítico por cliente</small></a>
          </div>
        </li>

        <?php if ($m4_00 == 1) { ?>
          <li class="nav-item text-left px-1 pt-1">
            <a class="dropdown-item m-0 pt-1" href="./config/home.php"><i class="fas fa-cogs"></i><small> Cofigurações</small></a>
          </li>
        <?php } ?>

      </ul>
      <ul class="navbar-nav ml-auto">
        <li class="nav-item text-left px-1 pt-1">
          <a class="dropdown-item m-0 pt-1 text-danger" href="#" data-toggle="modal" data-target="#Help"><i class="far fa-question-circle"></i><small> Help</small></a>
          <!--            <a class="dropdown-item m-0 pt-1" href="#" data-toggle="modal" data-target="#modal-right"><i class="far fa-question-circle"></i><small> Help</small></a>-->
        </li>
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle" id="navbarDropdownMenuLink" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="fas fa-user"></i> </a>
          <div class="dropdown-menu dropdown-menu-right dropdown-unique" aria-labelledby="navbarDropdownMenuLink">
            <a class="dropdown-item disabled" href="#"><i class="text-dark fas fa-address-book"></i> <?php echo $user_nome; ?></a>
            <a class="dropdown-item" href="#" data-toggle="modal" data-target="#modalSenha"><i class="fas fa-user-cog"></i> Senha</a>
            <a class="dropdown-item" href="./index.php"><i class="fas fa-sign-out-alt"></i> Sair</a>
          </div>
        </li>
      </ul>
    </div>
  </nav>

  <div class="container-fluid mt-2">

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

            if(isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
              $filterEmpresas.= " AND atendimentos.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
            }

            $sql = "SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.tipo = '1' AND atendimentos.`status` IN (1,2,3,4,5) ";
            if($filterEmpresas) {
              $sql.= $filterEmpresas;
            }
            $show = $pdo->prepare($sql);
            $show->execute();
            $exibe = $show->fetch(PDO::FETCH_ASSOC);
            $atd_1 = $exibe["atd_num"];
            if ($atd_1 == "") {
              $atd_1 = 0;
            }

            $sql2 = "SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.tipo = '2' AND atendimentos.`status` IN (1,2,3,4,5)";
            if($filterEmpresas) {
              $sql2.= $filterEmpresas;
            }
            $show = $pdo->prepare($sql2);
            $show->execute();
            $exibe = $show->fetch(PDO::FETCH_ASSOC);
            $atd_2 = $exibe["atd_num"];
            if ($atd_2 == "") {
              $atd_2 = 0;
            }

            $sql3 = "SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.tipo = '3' AND atendimentos.`status` IN (1,2,3,4,5)";
            if($filterEmpresas) {
              $sql3.= $filterEmpresas;
            }
            $show = $pdo->prepare($sql3);
            $show->execute();
            $exibe = $show->fetch(PDO::FETCH_ASSOC);
            $atd_3 = $exibe["atd_num"];
            if ($atd_3 == "") {
              $atd_3 = 0;
            }

            $sql4 = "SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.tipo = '4' AND atendimentos.`status` IN (1,2,3,4,5)";
            if($filterEmpresas) {
              $sql4.= $filterEmpresas;
            }
            $show = $pdo->prepare($sql4);
            $show->execute();
            $exibe = $show->fetch(PDO::FETCH_ASSOC);
            $atd_4 = $exibe["atd_num"];
            if ($atd_4 == "") {
              $atd_4 = 0;
            }

            $sql5 = "SELECT count(atendimentos.id) AS atd_num FROM atendimentos WHERE atendimentos.tipo = '5' AND atendimentos.`status` IN (1,2,3,4,5)";
            if($filterEmpresas) {
              $sql5.= $filterEmpresas;
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
            <i class="fas fa-chart-bar text-danger"></i> Chamados Abertos <small>(Por Cliente)</small>
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
            <i class="fas fa-trophy text-primary"></i> Matadores <small>(Últimos 7 Dias)</small>
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