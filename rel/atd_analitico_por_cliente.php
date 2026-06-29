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

if (isset($_GET['ajax']) && $_GET['ajax'] === 'locais') {
  header('Content-Type: application/json; charset=UTF-8');
  $clienteId = filter_input(INPUT_GET, 'f_clt', FILTER_VALIDATE_INT) ?: 0;
  $locais = [];

  if ($clienteId > 0) {
    $pdo = ConnectionN3();
    $stmtLocais = $pdo->prepare("SELECT local_id, local_nom FROM locais WHERE local_clt = :f_clt ORDER BY local_nom ASC");
    $stmtLocais->execute([':f_clt' => $clienteId]);
    $locais = $stmtLocais->fetchAll(PDO::FETCH_ASSOC);
  }

  echo json_encode(['locais' => $locais], JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);
  exit;
}

$ano = date('Y', strtotime('-0 months', strtotime(date('Y-m-d'))));
$mes = date('m', strtotime('-0 months', strtotime(date('Y-m-d'))));
//RECEBE INFORMAÇÕES PARA FILTRO
$f_clt = filter_input(INPUT_GET, 'f_clt', FILTER_VALIDATE_INT) ?: 0;
$f_local = filter_input(INPUT_GET, 'f_local', FILTER_VALIDATE_INT) ?: 0;
$p_local = $f_local === 0 ? '%' : (string)$f_local;

$data_1 = filter_input(INPUT_GET, 'data_1', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?: "$ano-$mes-01";
$data_2 = filter_input(INPUT_GET, 'data_2', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?: date("Y-m-d");
$f_nivel = filter_input(INPUT_GET, 'f_nivel', FILTER_VALIDATE_INT) ?: 0;
$allowedNiveis = [1, 2, 3, 4, 5];
if (!in_array($f_nivel, $allowedNiveis, true)) {$f_nivel = 0;}
$p_nivel = $f_nivel === 0 ? "1,2,3,4,5" : (string)$f_nivel;


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

    <div class="container-fluid rel-page rel-legacy-page rel-analitico-full-page">
      <div class="row">
        <div class="col-md-12 mt-2">
          <div class="card">
            <div id="accordion">
              <div class="card py-0 my-0">
                <div class="card-header my-0 py-2 h6 rel-filter-header" id="headingOne">
                  <button class="btn" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                      <i class="fas fa-chart-bar"></i> Relatório de atendimentos por Técnico
                  </button>
                </div>
                <div id="collapseOne" class="collapse show" aria-labelledby="headingOne" data-parent="#accordion">
                  <div class="card-body py-0">
                    <div class="row">
                      <div class="col-12">
                        <form action="atd_analitico_por_cliente.php" method="GET" class="rel-modern-filter rel-analitico-filter">
                          <div class="rel-filter-grid">
                            <div class="rel-filter-field rel-filter-client">
                              <label for="f_clt"><i class="fas fa-building"></i> Cliente</label>
                              <select name="f_clt" id="f_clt" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="1">
                                <option value="">Selecione um cliente</option>
                                <?php
                                $filterEmpresas = null;
                                if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                                  $filterEmpresas .= " AND clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
                                }
                                $sql = "SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1'";
                                if ($filterEmpresas) {$sql .= $filterEmpresas;}
                                $sql .= " ORDER BY clientes.clt_nomef ASC";
                                $pdo = ConnectionN3();
                                $show_clt = $pdo->prepare($sql);
                                $show_clt->execute();
                                while($exibe=$show_clt->fetch(PDO::FETCH_ASSOC)){
                                  $clt_id = $exibe["clt_id"];
                                  $clt_nome = $exibe["clt_nomef"];
                                ?>
                                  <option value="<?php echo $clt_id; ?>" <?php if($f_clt == $clt_id){echo " selected ";}?>><?php echo htmlspecialchars($clt_nome); ?></option>
                                <?php } ?>
                              </select>
                            </div>

                            <div class="rel-filter-field">
                              <label for="data_1"><i class="far fa-calendar-alt"></i> De</label>
                              <input id="data_1" name="data_1" type="date" value="<?php echo htmlspecialchars($data_1); ?>" class="form-control form-control-sm">
                            </div>

                            <div class="rel-filter-field">
                              <label for="data_2"><i class="far fa-calendar-check"></i> Até</label>
                              <input id="data_2" name="data_2" type="date" value="<?php echo htmlspecialchars($data_2); ?>" class="form-control form-control-sm">
                            </div>

                            <div class="rel-filter-field">
                              <label for="f_local"><i class="fas fa-map-marker-alt"></i> Local</label>
                              <select name="f_local" id="f_local" class="form-control form-control-sm selectpicker" data-live-search="true" tabindex="1" <?php echo $f_clt > 0 ? '' : 'disabled'; ?>>
                                <option value="0"><?php echo $f_clt > 0 ? 'Todos' : 'Selecione o cliente'; ?></option>
                                <?php if($f_clt > 0){ ?>
                                <?php
                                $pdo = ConnectionN3();
                                $show_clt = $pdo->prepare("SELECT locais.* FROM locais WHERE locais.local_clt = :f_clt ORDER BY locais.local_nom ASC");
                                $show_clt->execute([':f_clt' => $f_clt]);
                                while($exibe=$show_clt->fetch(PDO::FETCH_ASSOC)){
                                  $local_id = $exibe["local_id"];
                                  $local_nom = $exibe["local_nom"];
                                ?>
                                  <option value="<?php echo $local_id; ?>" <?php if($f_local == $local_id){echo " selected ";}?>><?php echo htmlspecialchars($local_nom); ?></option>
                                <?php } ?>
                                <?php } ?>
                              </select>
                            </div>

                            <div class="rel-filter-field">
                              <label for="f_nivel"><i class="fas fa-layer-group"></i> Nível</label>
                              <select id="f_nivel" name="f_nivel" class="form-control form-control-sm">
                                <option value="0"<?php if(0 == $f_nivel){echo " selected";} ?>>Todos</option>
                                <option value="1"<?php if(1 == $f_nivel){echo " selected";} ?>>Nível 1</option>
                                <option value="2"<?php if(2 == $f_nivel){echo " selected";} ?>>Nível 2</option>
                                <option value="3"<?php if(3 == $f_nivel){echo " selected";} ?>>Nível 3</option>
                                <option value="4"<?php if(4 == $f_nivel){echo " selected";} ?>>Rotina</option>
                                <option value="5"<?php if(5 == $f_nivel){echo " selected";} ?>>Administrativo</option>
                              </select>
                            </div>

                            <div class="rel-filter-actions">
                              <button type="submit" class="btn btn-info rel-pill-btn"><i class="fas fa-filter"></i> Filtrar</button>
                              <a href="atd_analitico_por_cliente.php" class="btn btn-outline-secondary rel-pill-btn"><i class="fas fa-eraser"></i> Limpar</a>
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
      
      <div class="row mt-2 mb-0 rel-analitico-result-row">
        <div class="col-md-12 rel-analitico-result-col">
          <div class="card bg-default rel-analitico-result-card">
            <div class="card-header py-2 h6 rel-section-header">
              <i class="fas fa-chart-pie"></i>
              Relatório analítico de Atendimentos Por Cliente
            </div>
<?php 
$pdo = ConnectionN3();
$filterEmpresas = "";

if(isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
  $filterEmpresas.= " AND atendimentos.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
}

$params = [':data_1' => $data_1, ':data_2' => $data_2, ':f_clt' => $f_clt];
$query = "SELECT COUNT(atendimentos.id) as n
          FROM atendimentos
          WHERE atendimentos.cliente = :f_clt
          AND atendimentos.abertura >= :data_1
          AND atendimentos.abertura < DATE_ADD(:data_2, INTERVAL 1 DAY)" . $filterEmpresas;
if ($f_nivel != 0){
  $query .= " AND atendimentos.nivel = :f_nivel";
  $params[':f_nivel'] = $f_nivel;
}
$qnt = $pdo->prepare($query);
if ($f_clt > 0) {
  $qnt->execute($params);
  $total = $qnt->fetch(PDO::FETCH_ASSOC);
} else {
  $total = ['n' => 0];
}
?>
            <div class="card-header py-2 h6 rel-section-header">
              <i class="fas fa-chart-pie"></i>
              Total de registros:  <?php echo $total["n"]?> 
            </div>
            <div class="card-body rel-analitico-result-body">
<?php if($f_clt>0 && (int)$total["n"] > 0){ ?>
<?php 
$pdo = ConnectionN3();
$detailParams = [
  ':f_clt' => $f_clt,
  ':p_local' => $p_local,
  ':data_1' => $data_1,
  ':data_2' => $data_2
];
$show = $pdo->prepare("SELECT clientes.clt_nomer,
locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
COALESCE(pessoas.pessoa_nom, 'Não informado') AS pessoa_nom,
COALESCE(categorias.cat_nome, '') AS cat_nome,
COALESCE(subcategorias.scat_nome, '') AS scat_nome,
COALESCE(itens.itens_nome, '') AS itens_nome,
COALESCE(usuarios.user_nome, 'Sem Técnico') AS user_nome,
atendimentos.id, atendimentos.tipo, atendimentos.nivel, atendimentos.forma, atendimentos.desc_abertura, atendimentos.desc_fechamento, atendimentos.abertura, atendimentos.fechamento, atendimentos.`status`
FROM atendimentos
INNER JOIN clientes ON clientes.clt_id = atendimentos.cliente
LEFT JOIN locais ON locais.local_id = atendimentos.`local`
LEFT JOIN pessoas ON pessoas.pessoa_id = atendimentos.pessoa
LEFT JOIN categorias ON categorias.cat_id = atendimentos.categoria
LEFT JOIN subcategorias ON subcategorias.scat_id = atendimentos.subcategoria
LEFT JOIN itens ON itens.itens_id = atendimentos.item
LEFT JOIN usuarios ON usuarios.user_id = atendimentos.tecnico
WHERE atendimentos.`status` > '0'
AND atendimentos.cliente = :f_clt
AND CAST(atendimentos.local AS CHAR) LIKE :p_local
AND atendimentos.abertura >= :data_1
AND atendimentos.abertura < DATE_ADD(:data_2, INTERVAL 1 DAY)
AND atendimentos.nivel IN ($p_nivel)
ORDER BY atendimentos.abertura ASC");
$show->execute($detailParams);
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
        ATD #<?php echo str_pad($atd_id , 5 , '0' , STR_PAD_LEFT); ?> | <i class="fas fa-map-marked-alt mr-2"></i><?php echo htmlspecialchars($local_nom ?? 'Não informado'); ?> | <i class="fas fa-user-tag mr-2"></i><?php echo htmlspecialchars($pessoa_nom ?? 'Não informado'); ?> 
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
          <?php if($atd_forma==4){ ?> <i class="fas fa-briefcase mx-1"></i> Atendimento Presencial - Plantão <?php } ?>
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
<?php if($cat_nome!=""){ ?> <span class="badge badge-light mx-1"> <i class="far fa-folder-open mx-1 text-dark"></i> <?php echo htmlspecialchars($cat_nome); ?> </span> <?php } ?>
<?php if($scat_nome!=""){ ?> <span class="badge badge-light mx-1"> <i class="far fa-file-alt mx-1 text-dark"></i> <?php echo htmlspecialchars($scat_nome); ?> </span> <?php } ?>
<?php if($itens_nome!=""){ ?> <span class="badge badge-light mx-1"> <i class="fas fa-list-ol mx-1 text-dark"></i> <?php echo htmlspecialchars($itens_nome); ?> </span> <?php } ?>
        </div>
      </div>
      <div class="col-md-4 mb-3 px-4">
        <div class="row py-1 ">
           <span class="badge badge-light mx-1"> <i class="fas fa-user-tie mr-1"></i> Técnico: <?php echo htmlspecialchars($user_nome ?? 'Sem Técnico'); ?> </span>
        </div>
        <div class="row py-1">
        <p>Descrição de abertura: <?php echo nl2br(htmlspecialchars($atd_desc_abertura ?? '')); ?></p>
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
          <p>Descrição de fechamento: <?php echo nl2br(htmlspecialchars($atd_desc_fechamento ?? '')); ?></p>
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
              <div class="rel-empty-state">
                <i class="fas fa-filter"></i>
                <strong>Selecione um cliente para visualizar o relatório</strong>
                <span>Use os filtros acima para carregar os atendimentos analíticos.</span>
              </div>
<?php } ?>
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
        <p><strong>Relatório analítico de atendimentos por cliente:</strong></p>
        <p>Este relatório exibe de forma analítica os atendimentos para um determinado cliente em um determinado período de tempo.</p>
        <p>SÃ£o considerados os atendimentos com os seguintes status:</p>
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
        <p>Adicionalmente, existe ainda a possibilidade de especificar o local para onde o atendimento foi prestado e o nível do atendimento.</p>
      </div>
      
    </div>
  </div>
</div> 


<?php include_once("../all/update_pass.php"); ?>
        <script src="../js/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.bundle.min.js"></script>
<script>
$(function() {
  const $cliente = $('#f_clt');
  const $local = $('#f_local');

  function refreshSelectpicker($select) {
    if ($.fn.selectpicker && $select.hasClass('selectpicker')) {
      $select.selectpicker('refresh');
    }
  }

  $cliente.on('change', function() {
    const clienteId = $(this).val();
    $local.prop('disabled', true).html('<option value="0">Carregando...</option>');
    refreshSelectpicker($local);

    if (!clienteId) {
      $local.html('<option value="0">Selecione o cliente</option>');
      refreshSelectpicker($local);
      return;
    }

    $.getJSON('atd_analitico_por_cliente.php', { ajax: 'locais', f_clt: clienteId })
      .done(function(response) {
        let options = '<option value="0">Todos</option>';
        (response.locais || []).forEach(function(local) {
          options += `<option value="${local.local_id}">${$('<div>').text(local.local_nom || '').html()}</option>`;
        });
        $local.html(options).prop('disabled', false);
        refreshSelectpicker($local);
      })
      .fail(function() {
        $local.html('<option value="0">Erro ao carregar locais</option>').prop('disabled', true);
        refreshSelectpicker($local);
      });
  });
});
</script>

    
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



