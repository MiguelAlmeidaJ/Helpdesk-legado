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
if (isset($_POST['f_clt'])){$f_clt = $_POST['f_clt'];} else {$f_clt = 0;}
if (isset($_POST['f_local'])){$f_local = $p_local =$_POST['f_local'];} else {$f_local = 0;}
if($f_local==0){$p_local = "%";}

if (isset($_POST['data_1'])){$data_1 = $_POST['data_1'];} else {$data_1 = "$ano-$mes-01";}
if (isset($_POST['data_2'])){$data_2 = $_POST['data_2'];} else {$data_2 = date("Y-m-d");}
if (isset($_POST['f_nivel'])){$f_nivel = $p_nivel = $_POST['f_nivel'];} else {$f_nivel = 0;}
if($f_nivel==0){$p_nivel = "1,2,3,4,5";}


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
  <style>
            body {
            zoom: 0.9;
            width: 100%;
            overflow-x: hidden;
        }

  </style>
  <body>
<?php include_once("../all/sidebar.php"); ?>

    <div class="container-fluid">
      <div class="row">
        <div class="col-md-12 mt-2">
          <div class="card">
            <div id="accordion">
              <div class="card py-0 my-0">
                <div class="card-header my-0 bg-light py-0 h6" id="headingOne">
                  <button class="btn" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                      <i class="fas fa-chart-bar"></i> Relatério de melhorias por Tecnico
                  </button>
                </div>
                <div id="collapseOne" class="collapse show" aria-labelledby="headingOne" data-parent="#accordion">
                  <div class="card-body py-0">
                    <div class="row">
                      <div class="col-12">
                        <form action="#" method="POST">
                          <div class="form-row align-items-center">                         
                            <div class="col-auto col-form-label-sm">
                              <label>Cliente:</label>
                              <select name="f_clt" id="f_clt"  class="form-control form-control-sm mb-2 mt-n2 selectpicker" data-live-search="true" required="required" tabindex="1">
                                <option></option>
                                <label>Cliente:</label>
                              <select name="f_clt" id="f_clt"  class="form-control form-control-sm mb-2 mt-n2 selectpicker"  data-live-search="true" required="required" tabindex="1">
                                <option></option>
                                <?php
                                $filterEmpresas = null;
                               if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                                  $filterEmpresas .= " AND clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";}
                                $sql = "SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1'";;
                                if ($filterEmpresas) {$sql .= $filterEmpresas;};
                                $sql .= " ORDER BY clientes.clt_nomef ASC";
                                $pdo = ConnectionN3();
                                $show_clt = $pdo->prepare($sql);
                                $show_clt->execute();
                                while($exibe=$show_clt->fetch(PDO::FETCH_ASSOC)){
                                  $clt_id = $exibe["clt_id"];
                                  $clt_nome = $exibe["clt_nomef"];
                                ?>
                                                                <option value="<?php echo $clt_id; ?>" <?php if($f_clt == $clt_id){echo " selected ";}?>><?php echo $clt_nome;?></option>
                                <?php } ?>
                              </select>
                              
                            </div>
<?php if($f_clt>0){ ?>                            
                            <div class="col-auto col-form-label-sm">
                              <label>De:</label>
                              <input id="dat" name="data_1" type="date" value="<?php echo $data_1; ?>" class="form-control mb-2 mt-n2 form-control-sm">
                            </div>
                            <div class="col-auto col-form-label-sm">
                              <label>a:</label>
                              <input id="dat" name="data_2" type="date" value="<?php echo $data_2; ?>" class="form-control mb-2 mt-n2 form-control-sm">
                            </div>
                            <div class="col-auto col-form-label-sm">
                              <label>Local:</label>
                              <select name="f_local" id="f_local"  class="form-control form-control-sm mb-2 mt-n2 selectpicker" data-live-search="true" required="required" tabindex="1">
                                <option value="0">Todos</option>
<?php
$pdo = ConnectionN3();
$show_clt = $pdo->prepare("SELECT locais.* FROM locais WHERE locais.local_clt = '$f_clt' ORDER BY locais.local_nom ASC");
$show_clt->execute();
while($exibe=$show_clt->fetch(PDO::FETCH_ASSOC)){
  $local_id = $exibe["local_id"];
  $local_nom = $exibe["local_nom"];
?>

                                <option value="<?php echo $local_id; ?>" <?php if($f_local == $local_id){echo " selected ";}?>><?php echo $local_nom;?></option>
<?php } ?>
                              </select>
                            </div>
                            <div class="col-auto col-form-label-sm">
                              <label>Nível:</label>
                              <select name="f_nivel" class="form-control mb-2 mt-n2 form-control-sm">
                                <option value="0"<?php if(0 == $f_nivel){echo " selected";} ?>>Todos</option>
                                <option value="1"<?php if(1 == $f_nivel){echo " selected";} ?>>Nível 1</option>
                                <option value="2"<?php if(2 == $f_nivel){echo " selected";} ?>>Nível 2</option>
                                <option value="3"<?php if(3 == $f_nivel){echo " selected";} ?>>Nível 3</option>
                                <option value="4"<?php if(4 == $f_nivel){echo " selected";} ?>>Rotina</option>
                                <option value="5"<?php if(5 == $f_nivel){echo " selected";} ?>>Administrativo</option>
                              </select>
                            </div>
<?php } ?>
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
              Relatério analítico de Melhorias Por Cliente
            </div>
<?php 
$pdo = ConnectionN3();
$filterEmpresas = "";

if(isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
  $filterEmpresas.= " AND melhorias.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
}

$query = "SELECT count(melhorias.id) as n FROM melhorias WHERE melhorias.cliente = '$f_clt' AND melhorias.abertura BETWEEN '$data_1' AND DATE_ADD('$data_2', INTERVAL 1 DAY)" . $filterEmpresas;
$f_nivel;
if ($f_nivel != 0){
  $query = $query." and melhorias.nivel = $f_nivel";
}
$query;
$qnt = $pdo->prepare($query);
$qnt->execute();
$total = $qnt->fetch(PDO::FETCH_ASSOC);
?>
            <div class="card-header py-2 h6">
              <i class="fas fa-chart-pie"></i>
              Total de registros:  <?php echo $total["n"]?> 
            </div>
            <div class="card-body">
<?php if($f_clt>0){ ?>
<?php 
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT clientes.clt_nomer, 
locais.local_nom, locais.local_end, locais.local_city, locais.local_uf, 
pessoas.pessoa_nom,
categorias.cat_nome,
subcategorias.scat_nome,
itens.itens_nome,
usuarios.user_nome,
melhorias.id, melhorias.tipo, melhorias.nivel, melhorias.forma, melhorias.desc_abertura, melhorias.desc_fechamento, melhorias.abertura, melhorias.fechamento, melhorias.`status` 
FROM melhorias
INNER JOIN clientes ON clientes.clt_id = melhorias.cliente
LEFT JOIN locais ON locais.local_id = melhorias.`local`
INNER JOIN pessoas ON pessoas.pessoa_id = melhorias.pessoa
INNER JOIN categorias ON categorias.cat_id = melhorias.categoria
LEFT JOIN subcategorias ON subcategorias.scat_id = melhorias.subcategoria
LEFT JOIN itens ON itens.itens_id = melhorias.item
LEFT JOIN usuarios ON usuarios.user_id = melhorias.tecnico
WHERE melhorias.`status` > '0'
AND melhorias.cliente = '$f_clt'
AND melhorias.local LIKE '$p_local'
AND melhorias.abertura BETWEEN '$data_1' AND DATE_ADD('$data_2', INTERVAL 1 DAY)
AND melhorias.nivel IN ($p_nivel)
ORDER BY melhorias.abertura ASC"); 
$show->execute();
while($row=$show->fetch(PDO::FETCH_ASSOC)){
  $clt_nomer = $row["clt_nomer"];
  $local_nom = $row["local_nom"];
  $local_end = $row["local_end"];
  $local_city = $row["local_city"];
  $local_uf = $row["local_uf"];
  $pessoa_nom = $row["pessoa_nom"];
  $cat_nome = $row["cat_nome"];
  $scat_nome = $row["scat_nome"];
  $itens_nome = $row["itens_nome"];
  $user_nome = $row["user_nome"];
  $atd_id = $row["id"];
  $atd_tipo = $row["tipo"];
  $atd_nivel = $row["nivel"];
  $atd_forma = $row["forma"];
  $atd_desc_abertura = $row["desc_abertura"];
  $atd_desc_fechamento = $row["desc_fechamento"];
  $atd_abertura = $row["abertura"];
  $atd_fechamento = $row["fechamento"];
  $atd_status = $row["status"];
  
?>  
  
<section class="py-1">
  <div class="container">
    <div class="row">
      <div class="col-12 h5 bg-light py-2 border-top">
        ATD #<?php echo str_pad($atd_id , 5 , '0' , STR_PAD_LEFT); ?> | <i class="fas fa-map-marked-alt mr-2"></i><?php echo $local_nom; ?> | <i class="fas fa-user-tag mr-2"></i><?php echo $pessoa_nom; ?> 
      </div>
    </div>
    <div class="row">
      <div class="col-md-4 mb-3">
        <div class="row py-1">
          <span class="badge badge-light mx-1">
          <i class="far fa-clock text-info mr-1"></i> Abertura: <?php echo date('d/m/Y H:i', strtotime($atd_abertura)); ?>
          </span>
        </div>
        <div class="row py-1">
          <span class="badge badge-secondary mx-1">
          <?php if($atd_forma==1){ ?> <i class="fas fa-laptop-house mx-1"></i> Atendimento Remoto <?php } ?>
          <?php if($atd_forma==2){ ?> <i class="fas fa-briefcase mx-1"></i> Atendimento Presencial <?php } ?>
          <?php if($atd_forma==3){ ?> <i class="fas fa-laptop-house mx-1"></i> Atendimento Remoto - Plantão <?php } ?>
          <?php if($atd_forma==4){ ?> <i class="fas fa-briefcase mx-1"></i> Atendimento Presencial - Plantão<?php } ?>
          </span>
          <span class="badge badge-secondary mx-1"> <i class="fas fa-archive ml-1 mr-1"></i> Nível <?php echo $atd_nivel; ?> </span>
          </div>
          <div class="row py-1">
          <span class="badge badge-secondary mx-1">
          <?php if($atd_tipo==1){ ?> <i class="fas fa-laptop-house mx-1"></i> Falha <?php } ?>
          <?php if($atd_tipo==2){ ?> <i class="fas fa-laptop-house mx-1"></i> Relacionamento <?php } ?>
          <?php if($atd_tipo==3){ ?> <i class="fas fa-laptop-house mx-1"></i> Requisição de Serviços <?php } ?>
          <?php if($atd_tipo==4){ ?> <i class="fas fa-laptop-house mx-1"></i> Requisição de informação <?php } ?>
          <?php if($atd_tipo==5){ ?> <i class="fas fa-laptop-house mx-1"></i> Notificação de monitoramento <?php } ?> 
          </span>
        </div>
        <div class="row py-1">
<?php if($cat_nome!=""){ ?> <span class="badge badge-light mx-1"> <i class="far fa-folder-open mx-1 text-dark"></i> <?php echo $cat_nome; ?> </span> <?php } ?>
<?php if($scat_nome!=""){ ?> <span class="badge badge-light mx-1"> <i class="far fa-file-alt mx-1 text-dark"></i> <?php echo $scat_nome; ?> </span> <?php } ?>
<?php if($itens_nome!=""){ ?> <span class="badge badge-light mx-1"> <i class="fas fa-list-ol mx-1 text-dark"></i> <?php echo $itens_nome; ?> </span> <?php } ?>
        </div>
      </div>
      <div class="col-md-4 mb-3 px-4">
        <div class="row py-1 ">
           <span class="badge badge-light mx-1"> <i class="fas fa-user-tie mr-1"></i> Tecnico: <?php echo $user_nome; ?> </span>
        </div>
        <div class="row py-1">
        <p>Descrição de abertura: <?php echo $atd_desc_abertura; ?></p>
        </div>
      </div>
      <div class="col-md-4 mb-3 px-4">
<?php if($atd_status==4){ ?>
        <div class="row py-1">
          <span class="badge badge-light mx-1">
          <i class="far fa-clock text-info mr-1"></i> Fechamento: <?php echo date('d/m/Y H:i', strtotime($atd_fechamento)); ?>
          </span>
        </div>
        <div class="row py-1">
          <p>Descrição de fechamento: <?php echo $atd_desc_fechamento; ?></p>
        </div>
<?php } else { ?>
        <div class="row py-1">
          <span class="badge badge-light mx-1">
<?php if($atd_status==1){ ?>
            <i class="fas fa-hourglass-half"></i> Aguardando Execução
<?php } ?>
<?php if($atd_status==2){ ?>
          <i class="fas fa-magic"></i> Em Execução
<?php } ?>
<?php if($atd_status==3){ ?>
          <i class="far fa-pause-circle"></i> Em Espera
<?php } ?>
          </span>
        </div>
<?php } ?>
      </div>
    </div>
  </div>
</section>
  
<?php } ?>
<?php } else { ?>
              Não há informações para exibir com os filtros selecionado.
<?php } ?>
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
        <p><strong>Relatério analítico de melhorias por cliente:</strong></p>
        <p>Este relatório exibe de forma analítica os melhorias para um determinado cliente em um determinado período de tempo.</p>
        <p>São considerados os melhorias com os seguintes status:</p>
        <ul class="list">
          <li><i class="fas fa-hourglass-half"></i> Aguardando Execução</li>
          <li><i class="fas fa-magic"></i> Em Execução</li>
          <li class="pt-1"><i class="far fa-pause-circle"></i> Em Espera</li>
          <li class="pt-1"><i class="fas fa-check"></i> Finalizada</li>
        </ul>
        <p>Não são considerados os melhorias com o status:</p>
        <ul class="list">
          <li><i class="far fa-clock"></i> Agendado </li>
        </ul>
        <p>Adicionalmente, existe ainda a possibilidade de espeficiar o local para onde o atendimento foi prestado e o nível do atendimento.</p>
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


