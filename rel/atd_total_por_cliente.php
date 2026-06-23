<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
//include_once("../all/token.php");
$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");

//verifico se existe alguma requisição POST chamada action
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

if ($action == "alterar_senha") {include_once("../all/update_senha.php");}

$ano = date('Y', strtotime('-0 months', strtotime(date('Y-m-d'))));
$mes = date('m', strtotime('-0 months', strtotime(date('Y-m-d'))));
//RECEBE INFORMAÇÕES PARA FILTRO
if (isset($_POST['data_1'])){$data_1 = $_POST['data_1'];} else {$data_1 = "$ano-$mes-01";}
if (isset($_POST['data_2'])){$data_2 = $_POST['data_2'];} else {$data_2 = date("Y-m-d");}
if (isset($_POST['f_nivel'])){$f_nivel = $p_nivel = $_POST['f_nivel'];} else {$f_nivel = 0;}
if($f_nivel==0){$p_nivel = "1,2,3";}


//header("Refresh:60");

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
    <link rel="stylesheet" href="css/relatorios_modern.css">
    <script type="text/javascript" src="../js/loader.js"></script>
    <title>Allterus</title>
  </head>
  <body class="rel-legacy-body">
<?php include_once("../all/sidebar.php"); ?>

    <div class="container-fluid rel-page rel-legacy-page rel-total-page">
      <div class="row rel-filter-row">
        <div class="col-md-12">
          <div class="card">
            <div id="accordion">
              <div class="card py-0 my-0">
                <div class="card-header my-0 py-2 h6 rel-filter-header" id="headingOne">
                  <button class="btn" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                      <i class="fas fa-chart-bar"></i> Relatório de atendimentos Por Cliente
                  </button>
                </div>
                <div id="collapseOne" class="collapse show" aria-labelledby="headingOne" data-parent="#accordion">
                  <div class="card-body py-0">
                    <div class="row">
                      <div class="col-12">
                        <form action="#" method="POST">
                          <div class="form-row align-items-center">                         
                            <div class="col-auto col-form-label-sm">
                              <label>De:</label>
                              <input id="dat" name="data_1" type="date" value="<?php echo $data_1; ?>" class="form-control mb-2 mt-n2 form-control-sm">
                            </div>
                            <div class="col-auto col-form-label-sm">
                              <label>a:</label>
                              <input id="dat" name="data_2" type="date" value="<?php echo $data_2; ?>" class="form-control mb-2 mt-n2 form-control-sm">
                            </div>
                            <div class="col-auto col-form-label-sm">
                              <label>Nível:</label>
                              <select name="f_nivel" class="form-control mb-2 mt-n2 form-control-sm" tabindex="2">
                                <option value="0"<?php if(0 == $f_nivel){echo " selected";} ?>>Todos</option>
                                <option value="1"<?php if(1 == $f_nivel){echo " selected";} ?>>Nível 1</option>
                                <option value="2"<?php if(2 == $f_nivel){echo " selected";} ?>>Nível 2</option>
                                <option value="3"<?php if(3 == $f_nivel){echo " selected";} ?>>Nível 3</option>
                              </select>
                            </div>
                            <div class="col-sm-2 col-4">
                              <button type="submit" class="btn btn-info rel-pill-btn">Filtrar</button>
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
      
      <div class="row rel-chart-row">
        <div class="col-md-12">
          <div class="card bg-default rel-chart-card">
            <div class="card-header py-2 h6 rel-section-header">
              <i class="fas fa-chart-pie"></i>
              Atendimentos Por Cliente
            </div>
            <div class="card-body rel-chart-body">
<?php
$chartData = [
  ['Cliente', 'Nível 1', 'Nível 2', 'Nível 3']
];
$pdo = ConnectionN3();

$filterEmpresas = "";

if(isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
  $filterEmpresas.= " AND atendimentos.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
}

$show = $pdo->prepare("SELECT clientes.clt_id, clientes.clt_nomer, 
count(nivel) as atendimentos,
count(case when nivel = '1' then 1 else null end) AS n1,
count(case when nivel = '2' then 1 else null end) AS n2,
count(case when nivel = '3' then 1 else null end) AS n3
FROM atendimentos
INNER JOIN clientes ON clientes.clt_id = atendimentos.cliente
WHERE atendimentos.`status` > '0'
AND atendimentos.abertura >= :data_1 AND atendimentos.abertura < DATE_ADD(:data_2, INTERVAL 1 DAY)
AND atendimentos.nivel IN ($p_nivel)
" . $filterEmpresas . "
GROUP BY clientes.clt_id
ORDER BY atendimentos DESC"); 
$show->execute([':data_1' => $data_1, ':data_2' => $data_2]);
while($row=$show->fetch(PDO::FETCH_ASSOC)){
  $nome = $row["clt_nomer"] ?: 'Sem identificação';
  $chartData[] = [$nome, (int)$row["n1"], (int)$row["n2"], (int)$row["n3"]];
}
$chartJson = json_encode($chartData, JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
?>
<script type="text/javascript">
google.charts.load('current', {packages: ['corechart', 'bar']});
google.charts.setOnLoadCallback(drawStacked);

function drawStacked() {
      var chartData = <?php echo $chartJson; ?>;
      var container = document.getElementById('chart_div');
      if (!chartData || chartData.length <= 1) {
        container.innerHTML = '<div class="rel-empty-state"><i class="fas fa-info-circle"></i><strong>Nenhum dado encontrado</strong><span>Altere os filtros e tente novamente.</span></div>';
        return;
      }
      var data = google.visualization.arrayToDataTable(chartData);
      var options = {
        legend: { position: 'top', maxLines: 3},
        bar: { groupWidth: '72%'},
        isStacked: true,
        colors: ['#2563eb', '#f59e0b', '#dc2626'],
        chartArea: {bottom:60, top:36, left:56, right:24, width: '88%', height: '72%'},
        backgroundColor: 'transparent',
        hAxis: { textStyle: { color: '#475569', fontSize: 11 } },
        vAxis: { minValue: 0, textStyle: { color: '#475569', fontSize: 11 }, gridlines: { color: '#e2e8f0' } }
      };

      var chart = new google.visualization.ColumnChart(container);
      chart.draw(data, options);
    }
</script>
              <div id="chart_div" class="rel-chart-box rel-chart-box-total"></div>
            </div>
          </div>
        </div>
      </div>
      
    </div>

<!-- MODAL DE AJUDA PARA A GESTÃO DE UM ATENDIMENTO -->    
<div class="modal fade rel-modal" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog modal-dialog-centered" role="document">
    <div class="modal-content">

      <div class="modal-header">
        <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-primary"></i> Ajuda com relatórios</h6>
        <button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
      </div>

      <div class="modal-body">
        <p><strong>Relatório de atendimentos totais Por Cliente:</strong></p>
        <p>Este relatório conta o total de atendimentos que foram abertos no período indicado para cada um dos cliente cadastrados e plota um gráfico de colunas.</p>
        <p>São considerados os atendimentos com os seguintes status:</p>
        <ul class="list">
          <li><i class="fas fa-hourglass-half"></i> Aguardando Execução</li>
          <li><i class="fas fa-magic"></i> Em Execução</li>
          <li class="pt-1"><i class="far fa-pause-circle"></i> Em Espera</li>
          <li class="pt-1"><i class="fas fa-check"></i> Finalizada</li>
        </ul>
        <p>Não são considerados os atendimentos com o status:</p>
        <ul class="list">
          <li><i class="far fa-clock"></i> Agendado </li>
        </ul>          
      </div>
      
    </div>
  </div>
</div> 


<?php include_once("../all/update_pass.php"); ?>
        <script src="../js/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.bundle.min.js"></script>
    
<?php if (isset($mensagem)){ ?>
<div class="rel-floating-alert">
  <div class="alert <?php echo $mensagem_cor; ?> alert-dismissible fade show" role="alert">
    <?php echo $mensagem; ?> 
    <button type="button" class="close" data-dismiss="alert" aria-label="Fechar">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
</div>
<?php }?>
<?php if (isset($mensagem)){ ?>
    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 5000); 
    </script>
<?php }?>
      <script src="js/relatorios_modern.js"></script>
</body>
</html>


