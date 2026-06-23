<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");

//verifico se existe alguma requisição POST chamada action
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

if ($action == "alterar_senha") {
  include_once("../all/update_senha.php");
}

$ano = date('Y', strtotime('-0 months', strtotime(date('Y-m-d'))));
$mes = date('m', strtotime('-0 months', strtotime(date('Y-m-d'))));
//RECEBE INFORMAÇÕES PARA FILTRO
if (isset($_POST['f_clt'])) {
  $f_clt = $_POST['f_clt'];
} else {
  $f_clt = 0;
}
if (isset($_POST['f_local'])) {
  $f_local = $p_local = $_POST['f_local'];
} else {
  $f_local = 0;
}
if ($f_local == 0) {
  $p_local = "%";
}

if (isset($_POST['data_1'])) {
  $data_1 = $_POST['data_1'];
} else {
  $data_1 = "$ano-$mes-01";
}
if (isset($_POST['data_2'])) {
  $data_2 = $_POST['data_2'];
} else {
  $data_2 = date("Y-m-d");
}
if (isset($_POST['f_nivel'])) {
  $f_nivel = $p_nivel = $_POST['f_nivel'];
} else {
  $f_nivel = 0;
}
if ($f_nivel == 0) {
  $p_nivel = "1,2,3,4,5";
}




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

  <div class="container-fluid rel-page rel-legacy-page">
    <div class="row">
      <div class="col-md-12 mt-2">
        <div class="card">
          <div id="accordion">
            <div class="card py-0 my-0">
              <div class="card-header my-0 py-2 h6 rel-filter-header" id="headingOne">
                <button class="btn" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                  <i class="fas fa-chart-bar"></i> Relatório de atendimentos da TI por Tecnico
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
                            <select name="f_clt" id="f_clt" class="form-control form-control-sm mb-2 mt-n2 selectpicker" data-live-search="true" required="required" tabindex="1">
                              <option></option>
                              <?php
                              $filterEmpresas = null;
                              if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                                $filterEmpresas .= " AND clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
                              }
                              $sql = "SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1'";;
                              if ($filterEmpresas) {
                                $sql .= $filterEmpresas;
                              };
                              $sql .= " ORDER BY clientes.clt_nomef ASC";
                              $pdo = ConnectionN3();
                              $show_clt = $pdo->prepare($sql);
                              $show_clt->execute();
                              while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                                $clt_id = $exibe["clt_id"];
                                $clt_nome = $exibe["clt_nomef"];
                              ?>
                                <option value="<?php echo $clt_id; ?>" <?php if ($f_clt == $clt_id) {
                                                                          echo " selected ";
                                                                        } ?>><?php echo $clt_nome; ?></option>
                              <?php } ?>
                            </select>

                          </div>


                          <div class="col-auto col-form-label-sm">
                            <label>De:</label>
                            <input id="data_1" name="data_1" type="date" value="<?php echo $data_1; ?>" class="form-control mb-2 mt-n2 form-control-sm">
                          </div>
                          <div class="col-auto col-form-label-sm">
                            <label>a:</label>
                            <input id="data_2" name="data_2" type="date" value="<?php echo $data_2; ?>" class="form-control mb-2 mt-n2 form-control-sm">
                          </div>


                          <div class="col-auto col-form-label-sm">
                            <label>Local:</label>
                            <select name="f_local" id="f_local" class="form-control form-control-sm mb-2 mt-n2 selectpicker" data-live-search="true" required="required" tabindex="1">
                              <option value="0">Todos</option>
                            </select>
                          </div>

                          <div class="col-auto col-form-label-sm">
                            <label>Nível:</label>
                            <select name="f_nivel" class="form-control mb-2 mt-n2 form-control-sm">
                              <option value="0" <?php if (0 == $f_nivel) {
                                                  echo " selected";
                                                } ?>>Todos</option>
                              <option value="1" <?php if (1 == $f_nivel) {
                                                  echo " selected";
                                                } ?>>Nível 1</option>
                              <option value="2" <?php if (2 == $f_nivel) {
                                                  echo " selected";
                                                } ?>>Nível 2</option>
                              <option value="3" <?php if (3 == $f_nivel) {
                                                  echo " selected";
                                                } ?>>Nível 3</option>
                              <option value="4" <?php if (4 == $f_nivel) {
                                                  echo " selected";
                                                } ?>>Rotina</option>
                              <option value="5" <?php if (5 == $f_nivel) {
                                                  echo " selected";
                                                } ?>>Administrativo</option>
                            </select>
                          </div>



                          <div class="col-md-4 mb-2 ml-4">
                            <button type="submit" class="btn btn-info btn-sm mr-2">Filtrar</button>
                            <a href="rel_Unificado.php" class="btn btn-outline-secondary btn-sm mr-2 rel-pill-btn">Limpar</a>

                            <!-- <button onclick="baixarPDF()" class="btn btn-danger btn-sm">
                              <i class="fas fa-file-pdf"></i> Exportar PDF
                            </button> -->

                            <!-- <button id="btnBaixarPDF" class="btn btn-danger btn-sm">
    <i class="fas fa-file-pdf"></i> Exportar PDF
</button> -->


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
          <div class="card-header py-2 h6 rel-section-header">
            <i class="fas fa-chart-pie"></i>
            Relatório analítico de Atendimentos Por Cliente - Suporte T.I
          </div>
          <?php
          $pdo = ConnectionN3();
          $filterEmpresas = "";
          $filterLocal = "";

          if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
            $filterEmpresas .= " AND atendimentos.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
          }

          if (isset($f_local) && $f_local != 0) {
            $filterLocal .= " AND atendimentos.local = $f_local";
          }


          $query = "SELECT count(atendimentos.id) as n FROM atendimentos WHERE atendimentos.cliente = '$f_clt' AND atendimentos.abertura BETWEEN '$data_1' AND DATE_ADD('$data_2', INTERVAL 1 DAY)" . $filterEmpresas . $filterLocal;

          $f_nivel;
          if ($f_nivel != 0) {
            $query = $query . " and atendimentos.nivel = $f_nivel";
          }

          $query;
          $qnt = $pdo->prepare($query);
          $qnt->execute();
          $total = $qnt->fetch(PDO::FETCH_ASSOC);
          ?>
          <div class="card-header py-2 h6 rel-section-header">
            <i class="fas fa-chart-pie"></i>
            Total de registros: <?php echo $total["n"] ?>
          </div>
          <div class="card-body">
            <?php if ($f_clt > 0) { ?>
              <?php
              $pdo = ConnectionN3();
              $show = $pdo->prepare("SELECT clientes.clt_nomer, 
                locais.local_nom, locais.local_end, locais.local_city, locais.local_uf, 
                pessoas.pessoa_nom,
                categorias.cat_nome,
                subcategorias.scat_nome,
                itens.itens_nome,
                usuarios.user_nome,
                atendimentos.id, atendimentos.tipo, atendimentos.nivel, atendimentos.forma, atendimentos.desc_abertura, atendimentos.desc_fechamento, atendimentos.abertura, atendimentos.fechamento, atendimentos.`status` 
                FROM atendimentos
                INNER JOIN clientes ON clientes.clt_id = atendimentos.cliente
                LEFT JOIN locais ON locais.local_id = atendimentos.`local`
                INNER JOIN pessoas ON pessoas.pessoa_id = atendimentos.pessoa
                INNER JOIN categorias ON categorias.cat_id = atendimentos.categoria
                LEFT JOIN subcategorias ON subcategorias.scat_id = atendimentos.subcategoria
                LEFT JOIN itens ON itens.itens_id = atendimentos.item
                LEFT JOIN usuarios ON usuarios.user_id = atendimentos.tecnico
                WHERE atendimentos.`status` > '0'
                AND usuarios.user_funcao in ('1','2','3','4','5','6','7')
                AND atendimentos.cliente = '$f_clt'
                AND atendimentos.local LIKE '$p_local'
                AND atendimentos.abertura BETWEEN '$data_1' AND DATE_ADD('$data_2', INTERVAL 1 DAY)
                AND atendimentos.nivel IN ($p_nivel)
                ORDER BY atendimentos.abertura ASC");
              $show->execute();
              while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
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
                        ATD #<?php echo str_pad($atd_id, 5, '0', STR_PAD_LEFT); ?> | <i class="fas fa-map-marked-alt mr-2"></i><?php echo $local_nom; ?> | <i class="fas fa-user-tag mr-2"></i><?php echo $pessoa_nom; ?>
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
                            <?php if ($atd_forma == 1) { ?> <i class="fas fa-laptop-house mx-1"></i> Atendimento Remoto <?php } ?>
                            <?php if ($atd_forma == 2) { ?> <i class="fas fa-briefcase mx-1"></i> Atendimento Presencial <?php } ?>
                            <?php if ($atd_forma == 3) { ?> <i class="fas fa-laptop-house mx-1"></i> Atendimento Remoto - Plantão <?php } ?>
                            <?php if ($atd_forma == 4) { ?> <i class="fas fa-briefcase mx-1"></i> Atendimento Presencial - Plantão <?php } ?>
                          </span>
                          <span class="badge badge-secondary mx-1"> <i class="fas fa-archive ml-1 mr-1"></i> Nível <?php echo $atd_nivel; ?> </span>
                        </div>
                        <div class="row py-1">
                          <span class="badge badge-secondary mx-1">
                            <?php if ($atd_tipo == 1) { ?> <i class="fas fa-laptop-house mx-1"></i> Falha <?php } ?>
                            <?php if ($atd_tipo == 2) { ?> <i class="fas fa-laptop-house mx-1"></i> Relacionamento <?php } ?>
                            <?php if ($atd_tipo == 3) { ?> <i class="fas fa-laptop-house mx-1"></i> Requisição de Serviços <?php } ?>
                            <?php if ($atd_tipo == 4) { ?> <i class="fas fa-laptop-house mx-1"></i> Requisição de informação <?php } ?>
                            <?php if ($atd_tipo == 5) { ?> <i class="fas fa-laptop-house mx-1"></i> Notificação de monitoramento <?php } ?>
                          </span>
                        </div>
                        <div class="row py-1">
                          <?php if ($cat_nome != "") { ?> <span class="badge badge-light mx-1"> <i class="far fa-folder-open mx-1 text-dark"></i> <?php echo $cat_nome; ?> </span> <?php } ?>
                          <?php if ($scat_nome != "") { ?> <span class="badge badge-light mx-1"> <i class="far fa-file-alt mx-1 text-dark"></i> <?php echo $scat_nome; ?> </span> <?php } ?>
                          <?php if ($itens_nome != "") { ?> <span class="badge badge-light mx-1"> <i class="fas fa-list-ol mx-1 text-dark"></i> <?php echo $itens_nome; ?> </span> <?php } ?>
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
                        <?php if ($atd_status == 4) { ?>
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
                              <?php if ($atd_status == 1) { ?>
                                <i class="fas fa-hourglass-half"></i> Aguardando Execução
                              <?php } ?>
                              <?php if ($atd_status == 2) { ?>
                                <i class="fas fa-magic"></i> Em Execução
                              <?php } ?>
                              <?php if ($atd_status == 3) { ?>
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

    <div class="pt-5"></div>

    <!-- <div class="row mt-2 mb-2">
      <div class="col-md-12">
        <div class="card bg-default">
          <div class="card-header py-2 h6 rel-section-header">
            <i class="fas fa-chart-pie"></i>
            Relatório Analítico de Atendimentos Por Cliente - Suporte DevOps
          </div>
          <?php
          $pdo = ConnectionN3();
          $filterEmpresas = "";
          $filterLocal = "";

          if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
            $filterEmpresas .= " AND tarefas.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
          }

          if (isset($f_local) && $f_local > 0) {
            $filterLocal .= " AND tarefas.local = '$f_local'";
          }

          $query = "SELECT count(tarefas.id) as n FROM tarefas WHERE tarefas.cliente = '$f_clt' AND tarefas.abertura BETWEEN '$data_1' AND DATE_ADD('$data_2', INTERVAL 1 DAY)" . $filterEmpresas . $filterLocal;

          $query;
          $qnt = $pdo->prepare($query);
          $qnt->execute();
          $total = $qnt->fetch(PDO::FETCH_ASSOC);
          ?>
          <div class="card-header py-2 h6 rel-section-header">
            <i class="fas fa-chart-pie"></i>
            Total de registros: <?php echo $total["n"] ?>
          </div>
          <div class="card-body">

            <?php if ($f_clt > 0) { ?>
              <?php
              $pdo = ConnectionN3();
              $show = $pdo->prepare("SELECT clientes.clt_nomer, 
              locais.local_nom, locais.local_end, locais.local_city, locais.local_uf, 
              pessoas.pessoa_nom,
              categorias.cat_nome,
              subcategorias.scat_nome,
              itens.itens_nome,
              usuarios.user_nome,
              tarefas.id, tarefas.tipo, tarefas.forma, tarefas.desc_abertura, tarefas.desc_fechamento, tarefas.abertura, tarefas.fechamento, tarefas.`status` 
              FROM tarefas
              INNER JOIN clientes ON clientes.clt_id = tarefas.cliente
              LEFT JOIN locais ON locais.local_id = tarefas.`local`
              INNER JOIN pessoas ON pessoas.pessoa_id = tarefas.pessoa
              INNER JOIN categorias ON categorias.cat_id = tarefas.categoria
              LEFT JOIN subcategorias ON subcategorias.scat_id = tarefas.subcategoria
              LEFT JOIN itens ON itens.itens_id = tarefas.item
              LEFT JOIN usuarios ON usuarios.user_id = tarefas.tecnico
              WHERE tarefas.`status` > '0'
              AND tarefas.cliente = '$f_clt'
              AND tarefas.local LIKE '$p_local'
              AND tarefas.abertura BETWEEN '$data_1' AND DATE_ADD('$data_2', INTERVAL 1 DAY)
              ORDER BY tarefas.abertura ASC");
              $show->execute();
              while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
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
                $tarefas_id = $row["id"];
                $tarefas_tipo = $row["tipo"];
                $tarefas_forma = $row["forma"];
                $tarefas_desc_abertura = $row["desc_abertura"];
                $tarefas_desc_fechamento = $row["desc_fechamento"];
                $tarefas_abertura = $row["abertura"];
                $tarefas_fechamento = $row["fechamento"];
                $tarefas_status = $row["status"];

              ?>

                <section class="py-1">
                  <div class="container">
                    <div class="row">
                      <div class="col-12 h5 bg-light py-2 border-top">
                        Tarefas #<?php echo str_pad($tarefas_id, 5, '0', STR_PAD_LEFT); ?> | <i class="fas fa-map-marked-alt mr-2"></i><?php echo $local_nom; ?> | <i class="fas fa-user-tag mr-2"></i><?php echo $pessoa_nom; ?>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-md-4 mb-3">
                        <div class="row py-1">
                          <span class="badge badge-light mx-1">
                            <i class="far fa-clock text-info mr-1"></i> Abertura: <?php echo date('d/m/Y H:i', strtotime($tarefas_abertura)); ?>
                          </span>
                        </div>
                        <div class="row py-1">
                          <span class="badge badge-secondary mx-1">
                            <?php if ($tarefas_forma == 1) { ?> <i class="fas fa-laptop-house mx-1"></i> Atendimento Remoto <?php } ?>
                            <?php if ($tarefas_forma == 2) { ?> <i class="fas fa-briefcase mx-1"></i> Atendimento Presencial <?php } ?>
                          </span>
                          <span class="badge badge-secondary mx-1"> <i class="fas fa-archive ml-1 mr-1"></i> Nível <?php echo $tarefas_id; ?> </span>
                        </div>
                        <div class="row py-1">
                          <span class="badge badge-secondary mx-1">
                            <?php if ($tarefas_tipo == 1) { ?> <i class="fas fa-laptop-house mx-1"></i> Falha <?php } ?>
                            <?php if ($tarefas_tipo == 2) { ?> <i class="fas fa-laptop-house mx-1"></i> Relacionamento <?php } ?>
                            <?php if ($tarefas_tipo == 3) { ?> <i class="fas fa-laptop-house mx-1"></i> Requisição de Serviços <?php } ?>
                            <?php if ($tarefas_tipo == 4) { ?> <i class="fas fa-laptop-house mx-1"></i> Requisição de informação <?php } ?>
                            <?php if ($tarefas_tipo == 5) { ?> <i class="fas fa-laptop-house mx-1"></i> Notificação de monitoramento <?php } ?>
                          </span>
                        </div>
                        <div class="row py-1">
                          <?php if ($cat_nome != "") { ?> <span class="badge badge-light mx-1"> <i class="far fa-folder-open mx-1 text-dark"></i> <?php echo $cat_nome; ?> </span> <?php } ?>
                          <?php if ($scat_nome != "") { ?> <span class="badge badge-light mx-1"> <i class="far fa-file-alt mx-1 text-dark"></i> <?php echo $scat_nome; ?> </span> <?php } ?>
                          <?php if ($itens_nome != "") { ?> <span class="badge badge-light mx-1"> <i class="fas fa-list-ol mx-1 text-dark"></i> <?php echo $itens_nome; ?> </span> <?php } ?>
                        </div>
                      </div>
                      <div class="col-md-4 mb-3 px-4">
                        <div class="row py-1 ">
                          <span class="badge badge-light mx-1"> <i class="fas fa-user-tie mr-1"></i> Tecnico: <?php echo $user_nome; ?> </span>
                        </div>
                        <div class="row py-1">
                          <p>Descrição de abertura: <?php echo $tarefas_desc_abertura; ?></p>
                        </div>
                      </div>
                      <div class="col-md-4 mb-3 px-4">
                        <?php if ($tarefas_status == 4) { ?>
                          <div class="row py-1">
                            <span class="badge badge-light mx-1">
                              <i class="far fa-clock text-info mr-1"></i> Fechamento: <?php echo date('d/m/Y H:i', strtotime($tarefas_fechamento)); ?>
                            </span>
                          </div>tarefas
                          <div class="row py-1">
                            <p>Descrição de fechamento: <?php echo $tarefas_desc_fechamento; ?></p>
                          </div>
                        <?php } else { ?>
                          <div class="row py-1">
                            <span class="badge badge-light mx-1">
                              <?php if ($tarefas_status == 1) { ?>
                                <i class="fas fa-hourglass-half"></i> Aguardando Execução
                              <?php } ?>
                              <?php if ($tarefas_status == 2) { ?>
                                <i class="fas fa-magic"></i> Em Execução
                              <?php } ?>
                              <?php if ($tarefas_status == 3) { ?>
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
    </div> -->

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
          <p>Adicionalmente, existe ainda a possibilidade de espeficiar o local para onde o atendimento foi prestado e o nível do atendimento.</p>
        </div>

      </div>
    </div>
  </div>


  <?php include_once("../all/update_pass.php"); ?>
  <script src="../js/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.bundle.min.js"></script>


  <!-- <script>
  window.onload = function () {
    document.getElementById("btnBaixarPDF").addEventListener("click", function (event) {
      event.preventDefault(); // Impede o recarregamento da página

      // Capturar os valores dos campos
      let cliente = document.getElementById("f_clt") ? document.getElementById("f_clt").value : "";
      let data1 = document.getElementById("data_1") ? document.getElementById("data_1").value : "";
      let data2 = document.getElementById("data_2") ? document.getElementById("data_2").value : "";
      let local = document.getElementById("f_local") ? document.getElementById("f_local").value : "";
      let nivel = document.getElementById("f_nivel") ? document.getElementById("f_nivel").value : "0";

      // Obtenha o token da sessão de uma forma correta (usando uma variável PHP diretamente no script)
      let token = "<?php echo isset($_SESSION['token']) ? $_SESSION['token'] : ''; ?>"; 

      // Verificar se algum campo essencial está vazio
      if (!cliente || !data1 || !data2) {
          alert("Preencha todos os campos obrigatórios (Cliente e Datas) antes de gerar o PDF!");
          return;
      }

      let url = "gerar_pdf.php?f_clt=" + encodeURIComponent(cliente) + 
                "&data_1=" + encodeURIComponent(data1) + 
                "&data_2=" + encodeURIComponent(data2) + 
                "&f_local=" + encodeURIComponent(local) + 
                "&f_nivel=" + encodeURIComponent(nivel) + 
                "&token=" + encodeURIComponent(token);

      // Criar um link temporário para iniciar o download
      let a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
  </script> -->

  <script>
    function decodeHtmlEntities(str) {
      var txt = document.createElement("textarea");
      txt.innerHTML = str;
      return txt.value;
    }
    $(document).ready(function() {
      function carregarLocais(clienteId, localSelecionado = null) {
        $.ajax({
          url: '../atd/busca_locais.php',
          method: 'GET',
          data: {
            cliente: clienteId
          },
          dataType: 'json',
          success: function(response) {
            var localSelect = $('#f_local');
            localSelect.empty();
            localSelect.append('<option value="0">Todos</option>');

            $.each(response, function(index, local) {
              var option = $('<option>', {
                value: local.id,
                text: decodeHtmlEntities(local.nome)
              });

              // Marca o local como selecionado se for igual ao que veio do POST
              if (localSelecionado && local.id == localSelecionado) {
                option.prop('selected', true);
              }

              localSelect.append(option);
            });

            localSelect.selectpicker('refresh');
          }
        });
      }

      // 1. Detecta mudança do cliente
      $('#f_clt').change(function() {
        var clienteId = $(this).val();
        carregarLocais(clienteId); // limpa o selecionado atual ao trocar cliente
      });

      // 2. Ao carregar a página, se já houver cliente e local definidos, carrega os locais
      var clienteInicial = $('#f_clt').val();
      var localInicial = "<?php echo $f_local; ?>";
      if (clienteInicial && clienteInicial != "0") {
        carregarLocais(clienteInicial, localInicial);
      }
    });
  </script>

  <?php if (isset($mensagem)) { ?>
    <div class="rel-floating-alert">
      <div class="alert <?php echo $mensagem_cor; ?> alert-dismissible fade show" role="alert">
        <?php echo $mensagem; ?>
        <button type="button" class="close" data-dismiss="alert" aria-label="Fechar">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>
  <?php } ?>
  <?php if (isset($mensagem)) { ?>
    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 5000);
    </script>
  <?php } ?>
    <script src="js/relatorios_modern.js"></script>
</body>

</html>