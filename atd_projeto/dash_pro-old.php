<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
$data = date("Y-m-d");

//VERIFICA SE Há REQUISICAO PARA SER EXECUTADA
if (isset($_POST['action'])) { $action  = $_POST['action'];
  //SE A REQUISIÇÃO FOR PARA ALTERAR SENHA
  if ($action == "alterar_senha") {include_once("..all/update_senha.php");}
}

//DEFINE DATAS QUE PODEM SER USADAS PARA OBTER INDICADORES
$dia = new DateTime($data);
$data_d7 =  date('Y-m-d', strtotime($data. ' -7 days'));
?>
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="icon" href="../img/favicon.ico">
    <script type="text/javascript" src="../js/loader.js"></script>
    <title>Allterus</title>
  </head>
  <body>
<?php include_once("../all/loading_home.php"); ?>
    <?php include_once("../all/sidebar.php"); ?>
    <div class="container-fluid mt-2">

        <div class="row">
          
            <div class="col-sx-12 col-sm-6 col-md-4 mb-1 px-1">
              <div class="card bg-default">
                <h6 class="card-header py-2">
                 <i class="fas fa-chart-pie text-info"></i> Projetos abertos <small>(Por Tipo)</small>
                </h6>
                <div class="card-body">
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.tipo = '1' AND projetos.`status` IN (1,2,3)"); $show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_1 = $exibe["atd_num"]; if($atd_1==""){$atd_1=0;}

$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.tipo = '2' AND projetos.`status` IN (1,2,3)"); $show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_2 = $exibe["atd_num"]; if($atd_2==""){$atd_2=0;}

$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.tipo = '3' AND projetos.`status` IN (1,2,3)"); $show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_3 = $exibe["atd_num"]; if($atd_3==""){$atd_3=0;}

$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.tipo = '4' AND projetos.`status` IN (1,2,3)"); $show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_4 = $exibe["atd_num"]; if($atd_4==""){$atd_4=0;}

$matriz = "
['Falha',$atd_1],
['Requisição de Serviços',$atd_2],
['Requisição de informação',$atd_3],
['Notificação de monitoramento',$atd_4]
";

    ?>
    <script type="text/javascript">
    google.charts.load("current", {packages:["corechart"]});
    google.charts.setOnLoadCallback(drawChart);
    function drawChart() {
    var data = google.visualization.arrayToDataTable([
    ['Tipo', 'projetos'],
    <?php echo $matriz; ?>
    ]);
        var options = {is3D: true,
            pieHole: 0.4,
            chartArea:{left:2,top:5,bottom:35,width:'100%',height:'90%'},
            legend: { position: 'bottom', alignment: 'start'},
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
                  <i class="fas fa-chart-bar text-danger"></i> Projetos Abertos <small>(Por Cliente)</small>
                </h6>
                <div class="card-body">
<?php
$pdo = ConnectionN3();
$show_clt = $pdo->prepare("SELECT count(projetos.id) AS atd_num, clientes.clt_nomer
FROM projetos
INNER JOIN clientes ON projetos.cliente = clientes.clt_id
WHERE projetos.`status` IN (1,2,3) 
GROUP BY clientes.clt_id
ORDER BY atd_num DESC LIMIT 0,10");
$show_clt->execute();
$matriz = "['Cliente','projetos']";

while($exibe=$show_clt->fetch(PDO::FETCH_ASSOC)){
  $clt_nom = $exibe["clt_nomer"]; 
  $atd_num = $exibe["atd_num"]; 
  $clt_nom = mb_strimwidth("$clt_nom", 0, 10, ".");
  $matriz = "$matriz,['$clt_nom',$atd_num]";
}
?>
<script type="text/javascript">
        google.charts.load('current', {'packages':['bar']});
        google.charts.setOnLoadCallback(drawStuff);
        function drawStuff() {
          var data = new google.visualization.arrayToDataTable([
<?php echo $matriz; ?>
  ]);
          var options = {
            //width: 300,
            width: "100%",
            legend: { position: 'none' },
            //chart: {
            //title: 'Produtos mais vendidos',
            //subtitle: 'Peso Total'
            //},
            bars: 'horizontal', 
            bar: { groupWidth: "90%" },
            

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
$cont_atd = $pdo->prepare("SELECT COUNT(projetos.id) AS atd_qnt, usuarios.user_nome FROM projetos INNER JOIN usuarios ON usuarios.user_id = projetos.tecnico WHERE projetos.abertura > '$data_d7' AND projetos.`status` = 4 GROUP BY projetos.tecnico ORDER BY atd_qnt DESC LIMIT 0,3");
$cont_atd->execute();
$n = 1;
while ($e1=$cont_atd->fetch(PDO::FETCH_ASSOC)){
$positions[] = array(
    'posicao' => "$n",
    'tecnico' => $e1["user_nome"],
    'projetos' => $e1["atd_qnt"]
);
$n++;        
}

if(isset($positions[0]['tecnico'])){ $p1_nome = ($positions[0]['tecnico']); } else{$p1_nome = "";}
if(isset($positions[1]['tecnico'])){ $p2_nome = ($positions[1]['tecnico']); } else{$p2_nome = "";}
if(isset($positions[2]['tecnico'])){ $p3_nome = ($positions[2]['tecnico']); } else{$p3_nome = "";}

if(isset($positions[0]['projetos'])){ $p1_atd = ($positions[0]['projetos']); } else{$p1_atd = "";}
if(isset($positions[1]['projetos'])){ $p2_atd = ($positions[1]['projetos']); } else{$p2_atd = "";}
if(isset($positions[2]['projetos'])){ $p3_atd = ($positions[2]['projetos']); } else{$p3_atd = "";}

?>                
<script type="text/javascript">
    google.charts.load("current", {packages:['corechart']});
    google.charts.setOnLoadCallback(drawChart);
    function drawChart() {
      var data = google.visualization.arrayToDataTable([
          ['Período', '<?php echo $p2_nome;?>', '<?php echo $p1_nome;?>', '<?php echo $p3_nome;?>'],
          ['7 Dias', <?php echo $p2_atd;?>, <?php echo $p1_atd;?>, <?php echo $p3_atd;?>]
         ]);

      var view = new google.visualization.DataView(data);
      var options = {
        width: '100%',
        height: '100%',
        bar: {groupWidth: "100%"},
        legend: { position: "right" },
        chartArea: {bottom:3, top:5, left:20, right:120},
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
                  <i class="fas fa-chart-line text-primary"></i> Abertura de Projetos <small>(Últimas 8 semanas)</small>
                </h6>
                <div class="card-body">
<?php 

$hoje = date("Y-m-d");
$dia = new DateTime($hoje);
$dia->modify( 'next saturday' );
$dia_0 = $dia->format('Y-m-d');

//$dia_0 = $hoje;
$dia_0_n =  date('d/m', strtotime($dia_0));
$dia_0a =  date('Y-m-d', strtotime($dia_0. ' -6 days'));
$dia_0a_n =  date('d/m', strtotime($dia_0. ' -6 days'));

$dia_1 =  date('Y-m-d', strtotime($dia_0. ' -7 days'));
$dia_1_n =  date('d/m', strtotime($dia_0. ' -7 days'));
$dia_1a =  date('Y-m-d', strtotime($dia_0. ' -13 days'));
$dia_1a_n =  date('d/m', strtotime($dia_0. ' -13 days'));

$dia_2 =  date('Y-m-d', strtotime($dia_0. ' -14 days'));
$dia_2_n =  date('d/m', strtotime($dia_0. ' -14 days'));
$dia_2a =  date('Y-m-d', strtotime($dia_0. ' -20 days'));
$dia_2a_n =  date('d/m', strtotime($dia_0. ' -20 days'));

$dia_3 =  date('Y-m-d', strtotime($dia_0. ' -21 days'));
$dia_3_n =  date('d/m', strtotime($dia_0. ' -21 days'));
$dia_3a =  date('Y-m-d', strtotime($dia_0. ' -27 days'));
$dia_3a_n =  date('d/m', strtotime($dia_0. ' -27 days'));

$dia_4 =  date('Y-m-d', strtotime($dia_0. ' -28 days'));
$dia_4_n =  date('d/m', strtotime($dia_0. ' -28 days'));
$dia_4a =  date('Y-m-d', strtotime($dia_0. ' -34 days'));
$dia_4a_n =  date('d/m', strtotime($dia_0. ' -34 days'));

$dia_5 =  date('Y-m-d', strtotime($dia_0. ' -35 days'));
$dia_5_n =  date('d/m', strtotime($dia_0. ' -35 days'));
$dia_5a =  date('Y-m-d', strtotime($dia_0. ' -41 days'));
$dia_5a_n =  date('d/m', strtotime($dia_0. ' -41 days'));

$dia_6 =  date('Y-m-d', strtotime($dia_0. ' -42 days'));
$dia_6_n =  date('d/m', strtotime($dia_0. ' -42 days'));
$dia_6a =  date('Y-m-d', strtotime($dia_0. ' -48 days'));
$dia_6a_n =  date('d/m', strtotime($dia_0. ' -48 days'));

$dia_7 =  date('Y-m-d', strtotime($dia_0. ' -49 days'));
$dia_7_n =  date('d/m', strtotime($dia_0. ' -49 days'));
$dia_7a =  date('Y-m-d', strtotime($dia_0. ' -55 days'));
$dia_7a_n =  date('d/m', strtotime($dia_0. ' -55 days'));

$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_0a' AND '$dia_0' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_0 = $exibe["atd_num"]; if($atd_0==""){$atd_0=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_1a' AND '$dia_1' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_1 = $exibe["atd_num"]; if($atd_1==""){$atd_1=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_2a' AND '$dia_2' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_2 = $exibe["atd_num"]; if($atd_2==""){$atd_2=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_3a' AND '$dia_3' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_3 = $exibe["atd_num"]; if($atd_3==""){$atd_3=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_4a' AND '$dia_4' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_4 = $exibe["atd_num"]; if($atd_4==""){$atd_4=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_5a' AND '$dia_5' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_5 = $exibe["atd_num"]; if($atd_5==""){$atd_5=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_6a' AND '$dia_6' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_6 = $exibe["atd_num"]; if($atd_6==""){$atd_6=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_7a' AND '$dia_7' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_7 = $exibe["atd_num"]; if($atd_7==""){$atd_7=0;}

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
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(drawVisualization);
    function drawVisualization() {
    var data = google.visualization.arrayToDataTable([
['Month','Chamados'],
<?php  echo $matriz; ?>
    ]);
  var options = {
          curveType: 'function',
          chartArea:{left:30,bottom:30,top:0,width:'100%',height:'100%'}
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
                  <i class="fas fa-chart-line text-danger"></i> Projetos reincidentes <small>(Últimas 8 semanas)</small>
                </h6>
                <div class="card-body">
<?php 
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_0a' AND '$dia_0' AND projetos.`reincidente` = '1' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_0 = $exibe["atd_num"]; if($atd_0==""){$atd_0=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_1a' AND '$dia_1' AND projetos.`reincidente` = '1' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_1 = $exibe["atd_num"]; if($atd_1==""){$atd_1=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_2a' AND '$dia_2' AND projetos.`reincidente` = '1' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_2 = $exibe["atd_num"]; if($atd_2==""){$atd_2=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_3a' AND '$dia_3' AND projetos.`reincidente` = '1' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_3 = $exibe["atd_num"]; if($atd_3==""){$atd_3=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_4a' AND '$dia_4' AND projetos.`reincidente` = '1' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_4 = $exibe["atd_num"]; if($atd_4==""){$atd_4=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_5a' AND '$dia_5' AND projetos.`reincidente` = '1' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_5 = $exibe["atd_num"]; if($atd_5==""){$atd_5=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_6a' AND '$dia_6' AND projetos.`reincidente` = '1' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_6 = $exibe["atd_num"]; if($atd_6==""){$atd_6=0;}
$show = $pdo->prepare("SELECT count(projetos.id) AS atd_num FROM projetos WHERE projetos.abertura BETWEEN '$dia_7a' AND '$dia_7' AND projetos.`reincidente` = '1' AND projetos.`status` > '0' ");$show ->execute();$exibe=$show->fetch(PDO::FETCH_ASSOC);
$atd_7 = $exibe["atd_num"]; if($atd_7==""){$atd_7=0;}

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
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(drawVisualization);
    function drawVisualization() {
    var data = google.visualization.arrayToDataTable([
['Month','Reincidentes'],
<?php echo $matriz; ?>
    ]);
  var options = {
          curveType: 'function',
          chartArea:{left:30,bottom:30,top:0,width:'100%',height:'100%'},
          colors:['red','#004411'],
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
<?php if (isset($mensagem)){ ?>
<div class="row pull-right" style="position:absolute; top: 65px; right:25px;">
  <div class="alert <?php echo $mensagem_cor; ?> alert-dismissible fade show" role="alert">
    <?php echo $mensagem; ?> 
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
</div>
<?php }?>
    <script src="../js/jquery-3.6.0.min.js"></script>    
    <script src="../js/bootstrap.min.js"></script>
    <?php include_once("../all/update_pass.php"); ?>
<?php if (isset($mensagem)){ ?>
    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 4000); 
    </script>
<?php }?>
  </body>
</html>