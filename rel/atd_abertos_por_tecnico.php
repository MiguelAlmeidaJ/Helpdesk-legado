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

header("Refresh:60");

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
    <title>Allterus</title>
  </head>
<body>
<?php include_once("../all/header.php"); ?>
<!-- parte acima direcionada ao cabeçalho (incluir e ajustar para necessário)-->

    <div class="container-fluid">
      <div class="row">
        <div class="col-md-12 mt-2">
          <div class="card">
            <div class="card-header h4 text-center py-2"> 
              <i class="fas fa-list-ul"></i> Lista de atendimentos abertos por técnico 
            </div>
            
            <div class="card-body p-0">
              <table class="table table-hover h2 ">
                <thead>
    
                  <tr>
                    <th class="text-right h4"></th>
                    <th class="text-center h4">Aberto</th>
                    <th class="text-center h4">Em espera</th>
                    <th class="text-center h4">Vencidos</th>
                  </tr>
                </thead>
                <tbody>
<?php //Buscando lista de usuários//
$filterEmpresas = "";

if(isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
  $filterEmpresas.= " AND atendimentos.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
}

$pdo = ConnectionN3();
$show_atd = $pdo->prepare("SELECT usuarios.user_nome,usuarios.user_id FROM usuarios WHERE usuarios.user_sts ='1' AND usuarios.user_id >'1' ORDER BY usuarios.user_nome ASC");
$show_atd->execute();
while($row=$show_atd->fetch(PDO::FETCH_ASSOC)){
  $user_name=$row["user_nome"];
  $user_id=$row["user_id"];
  //Contar chamados em aberto para usuário//
  $cont_atd = $pdo->prepare("SELECT COUNT(atendimentos.id)AS atendimentos_abertos FROM atendimentos WHERE atendimentos.tecnico = '$user_id' AND atendimentos.`status`IN (1,2) " . $filterEmpresas);
  $cont_atd->execute();
  $row2=$cont_atd->fetch(PDO::FETCH_ASSOC);
  $atd_ab=$row2["atendimentos_abertos"];

  //Contar chamados em espera para usuário//
  $cont_atd = $pdo->prepare("SELECT COUNT(atendimentos.id)AS atendimentos_espera FROM atendimentos WHERE atendimentos.tecnico = '$user_id' AND atendimentos.`status`= '3' " . $filterEmpresas);
  $cont_atd->execute();
  $row2=$cont_atd->fetch(PDO::FETCH_ASSOC);
  $atd_ep=$row2["atendimentos_espera"];

  //Contar chamados vencidos//
  $atd_venc = 0;
  //buscar cada atendimento aberto do usuário
  $show_atd_user = $pdo->prepare("SELECT atendimentos.id, atendimentos.nivel, atendimentos.abertura FROM atendimentos WHERE atendimentos.tecnico = '$user_id' AND atendimentos.`status` IN (1,2)" . $filterEmpresas);
  $show_atd_user->execute();
  while($row_user=$show_atd_user->fetch(PDO::FETCH_ASSOC)){
  //para cada atendimento aberto, teremos que verificar:
    //ID do atendimento para buscar as esperas que ele teve
    $atd_id=$row_user["id"];
    //nivel para determinar o prazo de fechamento
    $atd_nivel=$row_user["nivel"];
    if($atd_nivel==1){$sla = 1;} 
    if($atd_nivel==2){$sla = 2;} 
    if($atd_nivel==3){$sla = 3;} 
    if($atd_nivel==4){$sla = 4;} 
    if($atd_nivel==5){$sla = 5;} 
    //data hora em que o atendimento foi aberto
    $atd_hora_abertura=$row_user["abertura"];

    //TIME TO CLOSE
    //calcula hora limite para o fechamento do atendimento: Abertura + SLA
    $time_limit_to_close = date("Y-m-d H:i:s",strtotime($atd_hora_abertura." +$sla hours"));
    //hora atual
    $time_now = date("Y-m-d H:i:s");
    $start_date = new DateTime($time_now);
    //$end_date = new DateTime($time_limit_to_close);
    
    //total de tempo em que o atendimento ficou pausado (em espera)
    $pdo = ConnectionN3();
    $show_espera = $pdo->prepare("SELECT SUM(TIMESTAMPDIFF(SECOND, espera_start, espera_end)) AS segundos FROM espera WHERE espera.espera_atd = '$atd_id'");
    $show_espera->execute();
    //$conta_espera = $show_espera->rowCount();
    $exibe_espera=$show_espera->fetch(PDO::FETCH_ASSOC);
    $espera_tempo_total=$exibe_espera["segundos"];
    //SE NÃO TIVER RETORNO, ATRIBUI 0 SEGUNDOS AO TEMPO DE ESPERA
    if($espera_tempo_total==""){$espera_tempo_total=0;}
    //SOMA O TEMPO TOTAL DE ESPERA AO PRAZO PARA O FECHAMENTO DO ATENDIMENTO
    $end_date0 = date("Y-m-d H:i:s",strtotime($time_limit_to_close." +$espera_tempo_total SECOND"));
    $end_date = new DateTime($end_date0);    
    //calcular se o atendimento está atrasado
    if($start_date>$end_date){
      $atd_venc ++;
    }
    //se atrazado, conta para o total de atendimentos atrasados do técnico
  }
?>
<?php if($atd_ab>0 || $atd_ep>0 || $atd_venc>0){ ?>
                  <tr>
                    <td class="text-right"><?php echo $user_name;?></td>
                    <td class="text-center"><?php echo $atd_ab; ?></td>
                    <td class="text-center"><?php echo $atd_ep; ?></td>
                    <td class="text-center <?php if($atd_venc>0){ echo "text-danger";}?>"><?php echo $atd_venc; ?></td>
                  </tr>
<?php } ?>
<?php } ?>



                </tbody>
              </table>
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
        <p><strong>Relatório de atendimentos abertos por técnico:</strong></p>
        <p>Em desenvolvimento...</p>
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


