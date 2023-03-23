<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
//include_once("../all/token.php");
$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");

//verifico se existe alguma requisição POST chamada action
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_STRING);

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
    <script type="text/javascript" src="../js/loader.js"></script>
    <title>Allterus</title>
  </head>
  <body>
<?php include_once("../all/header.php"); ?>

    <div class="container-fluid">
      <div class="row">
        <div class="col-md-12 mt-2">
          <div class="card">
            <div id="accordion">
              <div class="card py-0 my-0">
                <div class="card-header my-0 bg-light py-0 h6" id="headingOne">
                  <button class="btn" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                      <i class="fas fa-chart-bar"></i> Relatório de atendimentos por Técnico
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
                              <button type="submit" class="btn btn-info">Filtrar</button>
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
      
      <div class="row mt-2 mb-2">
        <div class="col-md-12">
          <div class="card bg-default">
            <div class="card-header py-2 h6">
              <i class="fas fa-chart-pie"></i>
              Atendimentos por Técnico
            </div>
            <div class="card-body small text-danger text-justify">
<?php 
$matriz = "['Técnico', 'Nível 1', 'Nível 2', 'Nível 3']";
$pdo = ConnectionN3();

$filterEmpresas = "";

if(isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
  $filterEmpresas.= " AND atendimentos.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
}

$show = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome,
COUNT(atendimentos.id) AS atendimentos,
count(case when nivel = '1' then 1 else null end) AS n1,
count(case when nivel = '2' then 1 else null end) AS n2,
count(case when nivel = '3' then 1 else null end) AS n3
FROM atendimentos 
INNER JOIN usuarios ON atendimentos.tecnico = usuarios.user_id
WHERE atendimentos.`status` > '0'  
AND atendimentos.abertura BETWEEN '$data_1' AND '$data_2' 
AND atendimentos.nivel IN ($p_nivel)
" . $filterEmpresas . "
GROUP BY usuarios.user_id ORDER BY atendimentos DESC"); 
$show->execute();
while($row=$show->fetch(PDO::FETCH_ASSOC)){
  $id = $row["user_id"];
  $nome = $row["user_nome"];
  $n1 = $row["n1"];
  $n2 = $row["n2"];
  $n3 = $row["n3"];
$matriz = "$matriz, ['$nome',$n1,$n2,$n3]";
}
?>
<script type="text/javascript">
google.charts.load('current', {packages: ['corechart', 'bar']});
google.charts.setOnLoadCallback(drawStacked);

function drawStacked() {
      var data = google.visualization.arrayToDataTable([
<?php echo $matriz; ?>
        ]);
      var options = {
        legend: { position: 'none'},
        bar: { groupWidth: '80%'},
        isStacked: true,
        chartArea: {bottom:50, top:5, left:40, right:40},
      };

      var chart = new google.visualization.ColumnChart(document.getElementById('chart_div'));
      chart.draw(data, options);
    }
</script>
              <div id="chart_div" style="width: 100%; height: 400px;"></div>
            </div>
          </div>
        </div>
      </div>
      
    </div>

<!-- MODAL DE AJUDA PARA A GESTÃO DE UM ATENDIMENTO -->    
<div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">

      <div class="modal-header">
        <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Ajuda com relatórios</h6>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
      </div>

      <div class="modal-body">
        <p><strong>Relatório de atendimentos totais por técnico:</strong></p>
        <p>Este relatório conta o total de atendimentos que foram atendidos no período indicado para cada um dos técnicos e plota um gráfico de colunas.</p>
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
        <p>Adicionalmente, existe ainda a possibilidade de espeficiar o nível dos atendimentos.</p>
      </div>
      
    </div>
  </div>
</div> 


<?php include_once("../all/update_pass.php"); ?>
    <script src="../js/bootstrap.min.js"></script>
    <script src="../js/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.bundle.min.js"></script>
    
<?php if (isset($mensagem)){ ?>
<div class="row pull-right" style="position:absolute; top: 65px; right:25px; z-index: 3;">
  <div class="alert <?php echo $mensagem_cor; ?> alert-dismissible fade show" role="alert">
    <?php echo $mensagem; ?> 
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
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
  </body>
</html>


