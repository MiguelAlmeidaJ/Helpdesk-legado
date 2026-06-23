<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once(__DIR__ . "/lib/list_helpers.php");


// STATUS DAS TAREFAS
//0 == agendado
//1 == aguardando execução
//2 == em execução
//3 == em espera
//4 == concluido

//Todos (10)
//Abertos (11)
//Aguardando (1)
//Em execução (2)
//Em espera (3)
//Concluído (4)
//Agendados (0)


if ($m5_00 == 0) {
  header("Location: ../index.php");
}

$hoje = date("Y-m-d");
$mensagem = filter_input(INPUT_POST, 'mensagem', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
if ($action == "alterar_senha") {
  include_once("../all/update_senha.php");
}

if (isset($_POST['f_sts'])) {
  $p_sts = $f_sts = $_POST['f_sts'];
} else {
  $f_sts = 11;
}

if ($f_sts == 10) {
  $p_sts = "0,1,2,3,4";
}

if ($f_sts == 11) {
  $p_sts = "1,2,3";
}

if (isset($_POST['f_sol'])) {
  $f_sol = $p_sol = $_POST['f_sol'];
} else {
  $f_sol = $p_sol = 0;
}

if ($f_sol == 0) {
  $p_sol = "%";
}

if (isset($_POST['f_clt'])) {
  $f_clt = $p_clt = $_POST['f_clt'];
} else {
  $f_clt = $p_clt = 0;
}

if ($f_clt == 0) {
  $p_clt = "%";
  $p_sol = "%";
}

if (isset($_POST['f_tec'])) {
  $f_tec = $p_tec = $_POST['f_tec'];
} else {
  $f_tec = $p_tec = "all";
}
if ($f_tec == "all") {
  $p_tec = "%";
}

if (isset($_POST['f_id'])) {
  $p_id = $f_id = $_POST['f_id'];
} else {
  $f_id = $p_id = "%";
}
if ($f_id == "") {
  $p_id = "%";
}



$f_palavra = '';  // Inicializa a variável
$filtro_palavra = '';  // Inicializa o filtro

if (isset($_SESSION['allterusN3Id']) && (int)$_SESSION['allterusN3Id'] == 134) {
  // Se o ID da sessão for 106, forçar a palavra para "NET DO BRASIL"
  $f_palavra_raw = 'NET DO BRASIL';
  $f_palavra = '%' . $f_palavra_raw . '%';
  $filtro_palavra = "AND (LOWER(tarefas.nome_tarefa) LIKE LOWER('$f_palavra') OR LOWER(tarefas.desc_abertura) LIKE LOWER('$f_palavra') OR LOWER(tarefas.desc_fechamento) LIKE LOWER('$f_palavra'))";
} else {
  if (isset($_POST['f_palavra']) && !empty(trim($_POST['f_palavra']))) {
    $f_palavra_raw = trim($_POST['f_palavra']);
    $f_palavra = '%' . $f_palavra_raw . '%';
    $filtro_palavra = "AND (LOWER(tarefas.nome_tarefa) LIKE LOWER('$f_palavra') OR LOWER(tarefas.desc_abertura) LIKE LOWER('$f_palavra') OR LOWER(tarefas.desc_fechamento) LIKE LOWER('$f_palavra'))";
  } else {
    $f_palavra_raw = '';
  }
}

if (isset($_POST['ord'])) {
  $ord = $_POST['ord'];
} else {
  $ord = "status"; // Valor padrão
}

// Definindo a direção de ordenação
if (isset($_POST['order_dir'])) {
  $order_dir = $_POST['order_dir'];
} else {
  $order_dir = "ASC"; // Direção padrão
}

$order_by = $ord . " " . $order_dir;

$tarefa_filter_source = array_merge($_GET, $_POST);
if (isset($_SESSION['allterusN3Id']) && (int)$_SESSION['allterusN3Id'] == 134 && empty($tarefa_filter_source['f_palavra'])) {
  $tarefa_filter_source['f_palavra'] = 'NET DO BRASIL';
}
$tarefa_filters = atd_projeto_collect_filters($tarefa_filter_source, 'tasks');
$f_sts = $tarefa_filters['f_sts'];
$f_sol = $tarefa_filters['f_sol'];
$f_clt = $tarefa_filters['f_clt'];
$f_tec = $tarefa_filters['f_tec'];
$f_id = $tarefa_filters['f_id'];
$f_palavra_raw = $tarefa_filters['f_palavra'];
$ord = $tarefa_filters['ord'];
$order_dir = $tarefa_filters['order_dir'];
$p_sts = implode(',', $tarefa_filters['statuses']);
$p_sol = $f_sol > 0 ? $f_sol : '%';
$p_clt = $f_clt > 0 ? $f_clt : '%';
$p_tec = $f_tec !== 'all' ? $f_tec : '%';
$p_id = $f_id !== '' ? $f_id : '%';
$filtro_palavra = '';
$order_by = $tarefa_filters['order_sql'];

$pdo = ConnectionN3();

$show = $pdo->prepare("SELECT configuracao.* FROM configuracao");
$show->execute();
$row = $show->fetch(PDO::FETCH_ASSOC);
$tempo_alerta = $row["tempo_alerta"];
$sla_n1 = $row["sla_n1"];

$sla_n2 = $row["sla_n2"];

$sla_n3 = $row["sla_n3"];

$sla_n4 = $row["sla_n4"];

$sla_n5 = $row["sla_n5"];


if (false) {
$count_tarefas = 0;

// Consulta para contar as tarefas
$sql_count_tarefas = "SELECT COUNT(*) AS count_tarefas FROM tarefas WHERE `status` IN ($p_sts) 
AND tarefas.tecnico LIKE '$p_tec'
AND tarefas.tecnico LIKE '$p_sol'
-- AND tarefas.id_projeto IS NULL
$filtro_palavra";

// Verificar se o ID foi fornecido para ajustar a consulta
if (!empty($p_id) && $p_id != "%") {
  $sql_count_tarefas .= " AND tarefas.id = '$p_id'";
  $p_sts = "0,1,2,3,4,5";
} else {
  $sql_count_tarefas .= " AND tarefas.id LIKE '$p_id'";
}

// Verifica se o usuário é empresa e monta filtro para tarefas.cliente
$filterEmpresas = "";
if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
  $empresas_ids = array_map('intval', $_SESSION['empresas']);
  $filterEmpresas = " AND tarefas.cliente IN (" . implode(',', $empresas_ids) . ")";
}

// Monta a consulta para contar tarefas, com os mesmos filtros da consulta de listagem
$sql_count_tarefas = "
    SELECT COUNT(*) AS count_tarefas
    FROM tarefas
    LEFT JOIN clientes ON clientes.clt_id = tarefas.cliente
    WHERE tarefas.`status` IN ($p_sts)
    AND clientes.clt_id LIKE '$p_clt'
    AND tarefas.tecnico LIKE '$p_tec'
    AND tarefas.pessoa LIKE '$p_sol'
    AND tarefas.id LIKE '$p_id'
    $filtro_palavra
    $filterEmpresas
";

// Ajusta filtro pelo ID da tarefa se necessário
if (!empty($p_id) && $p_id != "%") {
  $sql_count_tarefas .= " AND tarefas.id = '$p_id'";
  $p_sts = "0,1,2,3,4,5";
} else {
  $sql_count_tarefas .= " AND tarefas.id LIKE '$p_id'";
}

try {
  $stmt_count_tarefas = $pdo->prepare($sql_count_tarefas);
  $stmt_count_tarefas->execute();
  $result_count_tarefas = $stmt_count_tarefas->fetch(PDO::FETCH_ASSOC);
  $count_tarefas = $result_count_tarefas ? (int)$result_count_tarefas['count_tarefas'] : 0;
} catch (Exception $e) {
  error_log("Erro ao buscar a contagem de tarefas: " . $e->getMessage());
  $count_tarefas = 0;
}
}
?>
<?php
//BUSCA TODOS AS TAREFAS QUE ESTÃO AGENDADOS (STATUS = 0)
//COMPARA DATA HORA DO AGENDAMENTO COM DATA HORA ATUAL
//SE DATA HORA ATUAL MAIOR QUE DATA HORA DE AGENDAMENTO
//ALTERA O STATUS DO ATENDIMENTO PARA 1 (AGUARDANDO EXECUÇÃO)
//REGISTRA ALTERAÇÃO NA TABELA DE INTERATIVIDADE
$time_now = date("Y-m-d H:i:s");
$pdo = ConnectionN3();
$show_tarefas = $pdo->prepare("SELECT tarefas.id, tarefas.abertura FROM tarefas WHERE tarefas.`status` = '0'");
$show_tarefas->execute();

while ($exibe = $show_tarefas->fetch(PDO::FETCH_ASSOC)) {
  $tarefas = $exibe["id"];
  $tarefas_agendamento = $exibe["abertura"];
  if (strtotime($time_now) > strtotime($tarefas_agendamento)) {
    //altera o status do atendimento para 1 (Aguardando execução)
    $edt = $pdo->prepare("UPDATE `tarefas` SET `status`='1' WHERE  `id`='$tarefas';");
    if ($edt->execute()) {
      //insere o registro de uma nova interação 
      $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$tarefas', '1', '$time_now', 'Status do atendimento alterado automaticamente para Aguardando Execução.');");
      if ($adc->execute()) {
      } else {
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
        $mensagem_cor = "alert-danger";
      }
    }
  }
}
$tarefaListResult = atd_projeto_fetch_tasks($pdo, $tarefa_filters);
$count_tarefas = $tarefaListResult['pagination']['total'];
?>
<!doctype html>
<html lang="pt-BR">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=0.9, shrink-to-fit=no">
  <link rel="icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../css/bootstrap.min.css">
  <link rel="stylesheet" href="../fontawesome/css/all.css">
  <link rel="stylesheet" href="../css/bootstrap-select.min.css">
  <link rel="stylesheet" href="../css/progress_bar.css">
  <link rel="stylesheet" href="../css/blink.css">
  <link rel="stylesheet" href="../css/help.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <link rel="stylesheet" href="css/projeto_modern.css">
  <title>Allterus</title>
</head>
<style>
  body {
    zoom: 0.9;
    /* Escala o conteúdo sem alterar o contexto de layout */
    width: 100%;
    /* Mantém o layout responsivo */
    overflow-x: hidden;
    /* Garante que não haja rolagem horizontal */
  }

  /* Ajuste o cabeçalho */
  th form {
    margin: 0 !important;
  }

  .table-container {
    max-height: 85vh;
    /* Define um limite de altura para a tabela */
    overflow-y: auto;
    /* Habilita o scroll vertical */
    display: block;
    border: 1px solid #dee2e6;
  }

  table {
    display: auto;
    width: 100%;
    border-collapse: collapse;
  }
</style>

<body>

  <!-- <?php include_once("../all/loading.php"); ?> -->
  <?php include("../all/sidebar.php"); ?>

  <div class="container-fluid projeto-list-page">
    <div class="row projeto-list-page-row">
      <div class="col-12 mt-2 projeto-page-wrap">
        <div class="card projeto-list-shell-card">
          <div class="card-header py-1 projeto-filter-card-header">
            <form action="#" method="POST" id="tarefasFilterForm" class="projeto-filter-form" data-projeto-ajax-form>
              <div class="form-row align-items-center">

                <div class="col-auto col-form-label-sm">
                  <label class="my-0"> Cliente:</label>
                  <select name="f_clt" class="form-control form-control-sm " data-live-search="true" required="required" tabindex="1">
                    <option value="0">Todos os Clientes</option>
                    <?php
                    $pdo = ConnectionN3();
                    $filterEmpresas = null;
                    if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                      $filterEmpresas .= " AND clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
                    }
                    $sql = "SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1'";
                    if ($filterEmpresas) {
                      $sql .= $filterEmpresas;
                    }
                    $sql .= "ORDER BY clientes.clt_nomef ASC";
                    $show_clt = $pdo->prepare($sql);
                    $show_clt->execute();
                    while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                      $clt_id = $exibe["clt_id"];
                      $clt_nome = $exibe["clt_nomef"];
                    ?>
                      <option value="<?php echo $clt_id; ?>" <?php if ($f_clt == $clt_id) {
                                                                echo " selected";
                                                              } ?>><?php echo $clt_nome; ?></option>
                    <?php } ?>
                  </select>
                </div>
                <?php //se houver um cliente específico para a pesquisa, mostra a opção de solicitante no filtro
                if ($f_clt > 0) { ?>
                  <div class="col-auto col-form-label-sm">
                    <label class="my-0"> Solicitante:</label>
                    <select name="f_sol" class="form-control form-control-sm " data-live-search="true" required="required" tabindex="1">
                      <option value="0">Todos os Solicitantes</option>
                      <?php
                      $pdo = ConnectionN3();
                      $show_clt = $pdo->prepare("SELECT pessoas.pessoa_id, pessoas.pessoa_nom FROM pessoas WHERE pessoas.pessoa_clt = '$f_clt' ORDER BY pessoas.pessoa_nom ASC");
                      $show_clt->execute();
                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $pessoa_id = $exibe["pessoa_id"];
                        $pessoa_nom = $exibe["pessoa_nom"];
                      ?>
                        <option value="<?php echo $pessoa_id; ?>" <?php if ($f_sol == $pessoa_id) {
                                                                    echo " selected";
                                                                  } ?>><?php echo $pessoa_nom; ?></option>
                      <?php } ?>
                    </select>
                  </div>
                <?php } ?>
                <div class="col-auto col-form-label-sm">
                  <label class="my-0"> Status:</label>
                  <select name="f_sts" class="form-control form-control-sm" tabindex="2">
                    <option value="10" <?php if (10 == $f_sts) {
                                          echo " selected";
                                        } ?>>Todos</option>

                    <option value="11" <?php if (11 == $f_sts) {
                                          echo " selected";
                                        } ?>>Abertas</option>

                    <option value="1" <?php if (1 == $f_sts) {
                                        echo " selected";
                                      } ?>>Aguardando</option>

                    <option value="2" <?php if (2 == $f_sts) {
                                        echo " selected";
                                      } ?>>Em execução</option>

                    <option value="3" <?php if (3 == $f_sts) {
                                        echo " selected";
                                      } ?>>Em espera</option>

                    <option value="4" <?php if (4 == $f_sts) {
                                        echo " selected";
                                      } ?>>Concluído</option>

                    <option value="0" <?php if (0 == $f_sts) {
                                        echo " selected";
                                      } ?>>Agendados</option>
                  </select>
                </div>

                <?php if (isset($_SESSION['tipo']) && $_SESSION['tipo'] != 2) { ?>
                  <div class="col-auto col-form-label-sm">
                    <label class="my-0"> Tecnico:</label>
                    <select name="f_tec" class="form-control form-control-sm " data-live-search="true" required="required" tabindex="3">
                      <option value="all" <?php if ("all" == $f_sts) {
                                            echo " selected";
                                          } ?>>Todos</option>
                      <option value="0" <?php if (0 == $f_sts) {
                                          echo " selected";
                                        } ?>>Não determinado</option>
                      <?php
                      $pdo = ConnectionN3();
                      $show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE user_funcao IN (8,9,10,11,12,13,14) ORDER BY usuarios.user_nome ASC");
                      $show_clt->execute();

                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $user_id = $exibe["user_id"];
                        $user_nome = $exibe["user_nome"];
                      ?>
                        <option value="<?php echo $user_id; ?>" <?php if ($user_id == $f_tec) {
                                                                  echo " selected";
                                                                } ?>><?php echo $user_nome; ?></option>
                      <?php } ?>
                    </select>
                  </div>
                <?php } ?>

                <div class="col-auto col-form-label-sm">
                  <label class="my-0">ID:</label>
                  <input type="text" name="f_id" id="f_id" class="form-control form-control-sm" style="width: 100px;" placeholder="Digite o ID" tabindex="4" onfocus="this.placeholder=''" onblur="this.placeholder='Digite o ID'" oninput="updateItems()">
                </div>


                <div class="col-auto pt-3">
                  <button type="submit" class="btn btn-sm btn-outline-info" tabindex="5">Filtrar</button>
                </div>

                <div class="col-auto pt-3">
                  <button type="button" class="btn btn-sm btn-outline-info" tabindex="4" onclick="window.location.href='?action=limpar_filtros';">Limpar</button>
                </div>

                <input type="hidden" name="data_1" id="projeto_data_1" value="<?php echo atd_projeto_h($tarefa_filters['data_1'] ?? ''); ?>">
                <input type="hidden" name="data_2" id="projeto_data_2" value="<?php echo atd_projeto_h($tarefa_filters['data_2'] ?? ''); ?>">

                <?php if (isset($_SESSION['allterusN3Id']) && (int)$_SESSION['allterusN3Id'] !== 134) { ?>
                  <div class="col-auto pt-3">
                    <button type="button" class="btn btn-sm <?php echo (($tarefa_filters['data_1'] ?? '') || ($tarefa_filters['data_2'] ?? '')) ? 'btn-info' : 'btn-outline-info'; ?>" id="btn-projeto-date-range" tabindex="4" title="Filtrar por data de abertura">
                      <i class="far fa-calendar-alt"></i>
                      <span id="projeto-date-range-label" class="ml-1">Periodo</span>
                    </button>
                  </div>

                  <div class="col-auto pt-3">
                    <button class="btn btn-sm btn-outline-info" tabindex="4">Total de Tarefas: <?php echo $count_tarefas; ?></button>
                  </div>

            <?php } else { ?>

              <div class="col-auto pt-3">
                <button class="btn btn-sm btn-outline-info" tabindex="4">Total de Tarefas: <?php echo $count_tarefas; ?></button>
              </div>

            <?php } ?>

          </div>
          </form>

        </div>

        <div class="card-body p-0 projeto-list-card-body">
          <div id="atd-projeto-tarefas-list" class="projeto-list-container" data-projeto-list data-projeto-form="#tarefasFilterForm" data-projeto-endpoint="api/tarefas_list.php">
            <?php echo atd_projeto_render_tasks_table($tarefaListResult['rows'], $tarefa_filters, $tarefaListResult['pagination']); ?>
          </div>
          <?php if (false) { ?>
          <div class="table-container">
            <table class="table table-hover small">
              <thead>
                <tr>
                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                      <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                      <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                      <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                      <input type="hidden" name="ord" value="id">
                      <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> ID</button>
                    </form>
                  </th>
                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                      <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                      <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                      <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                      <input type="hidden" name="ord" value="cliente">
                      <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">

                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Cliente</button>
                    </form>
                  </th>
                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                      <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                      <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                      <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                      <input type="hidden" name="ord" value="abertura">
                      <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Abertura</button>
                    </form>
                  </th>
                  <th class="p-1">
                    <button type="submit" class="btn btn-light btn-sm btn-block">Categoria</button>
                  </th>

                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                      <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                      <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                      <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                      <input type="hidden" name="ord" value="forma">
                      <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i></button>
                    </form>
                  </th>

                  <th class="p-1">
                    <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                    <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                    <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                    <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">

                  </th>

                  <th class="p-1">

                    <button type="submit" class="btn btn-light btn-sm btn-block">Prazo para Conclusão</button>

                  </th>

                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                      <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                      <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                      <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                      <input type="hidden" name="ord" value="tecnico">
                      <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Tecnico</button>
                    </form>
                  </th>
                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                      <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                      <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                      <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                      <input type="hidden" name="ord" value="status">
                      <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Status</button>
                    </form>
                  </th>
                  <th class="p-1"></th>
                </tr>
              </thead>
              <tbody>


                <?php
                $pdo = ConnectionN3();

                $filterEmpresas = null;

                if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                  $filterEmpresas .= " AND tarefas.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
                }

                if ($p_id > 0 || $p_id != "%") {
                  //remover os zeros da esquerda 
                  $p_id = ltrim($p_id, '0');
                  // Se um ID foi fornecido, desconsidera o filtro de status do front e define todos os status possíveis
                  $p_sts = "0,1,2,3,4,5";
                }

                $sql = "SELECT tarefas.id, tarefas.`nome_tarefa`, tarefas.`dias`, tarefas.`area`, tarefas.`tipo`, tarefas.`local`, tarefas.forma, tarefas.desc_abertura, tarefas.desc_fechamento, tarefas.abertura, tarefas.fechamento, tarefas.tecnico, tarefas.reincidente, tarefas.nivel, tarefas.`status`,
                clientes.clt_id, clientes.clt_nomer, clientes.clt_nomef, clientes.clt_cnpj,
                pessoas.pessoa_nom, pessoas.pessoa_cargo, pessoas.pessoa_tel, pessoas.pessoa_mail,
                locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
                categorias.cat_nome,
                subcategorias.scat_nome,
                itens.itens_nome,
                usuarios.user_nome AS tecnico_nome, usuarios.user_cel AS tecnico_tel, usuarios.user_mail AS tecnico_mail
                FROM tarefas
                LEFT JOIN clientes ON clientes.clt_id = tarefas.cliente
                LEFT JOIN pessoas ON pessoas.pessoa_id = tarefas.pessoa
                LEFT JOIN locais ON locais.local_id = tarefas.`local`
                LEFT JOIN categorias ON categorias.cat_id = tarefas.categoria
                LEFT JOIN subcategorias ON subcategorias.scat_id = tarefas.subcategoria
                LEFT JOIN itens ON itens.itens_id = tarefas.item
                LEFT JOIN usuarios ON usuarios.user_id = tarefas.tecnico
                WHERE tarefas.`status` IN ($p_sts)
                AND clientes.clt_id LIKE '$p_clt'
                AND tarefas.tecnico LIKE '$p_tec'  
                AND tarefas.pessoa LIKE '$p_sol'
                AND tarefas.id LIKE '$p_id'  
                -- AND tarefas.id_projeto IS NULL
                $filtro_palavra
                ";

                $sql .= $filterEmpresas;
                $sql .= " ORDER BY $ord $order_dir";
                $show_tarefas = $pdo->prepare($sql);

                $show_tarefas->execute();

                while ($row = $show_tarefas->fetch(PDO::FETCH_ASSOC)) {
                  $tarefa = $row["id"];
                  $nome_tarefa = $row["nome_tarefa"];
                  $tarefas_desc_abertura = $row["desc_abertura"];
                  $tarefas_desc_fechamento = $row["desc_fechamento"];
                  $tarefas_hora_abertura = $row["abertura"];
                  $tarefas_hora_fechamento = $row["fechamento"];
                  $tarefas_reincidente = $row["reincidente"];
                  $tarefas_status = $row["status"];

                  $tarefas_tipo = $row["tipo"];
                  if ($tarefas_tipo == 1) {
                    $tarefas_tipo = "Falha";
                  }
                  if ($tarefas_tipo == 2) {
                    $tarefas_tipo = "Requisição de Serviços";
                  }
                  if ($tarefas_tipo == 3) {
                    $tarefas_tipo = "Requisição de informação";
                  }
                  if ($tarefas_tipo == 4) {
                    $tarefas_tipo = "Notificação de monitoramento";
                  }
                  if ($tarefas_tipo == 0) {
                    $tarefas_tipo = "Não informado";
                  }
                  $tarefas_nivel = $row["nivel"];
                  if ($tarefas_nivel == 0) {
                    $tarefas_niveln = "Não informado";
                    $sla = $sla_n1;
                  }
                  if ($tarefas_nivel == 1) {
                    $tarefas_niveln = "Nível 1";
                    $sla = $sla_n1;
                  }
                  if ($tarefas_nivel == 2) {
                    $tarefas_niveln = "Nível 2";
                    $sla = $sla_n2;
                  }
                  if ($tarefas_nivel == 3) {
                    $tarefas_niveln = "Nível 3";
                    $sla = $sla_n3;
                  }
                  if ($tarefas_nivel == 4) {
                    $tarefas_niveln = "Rotina";
                    $sla = $sla_n4;
                  }
                  if ($tarefas_nivel == 5) {
                    $tarefas_niveln = "Rotina";
                    $sla = $sla_n5;
                  }

                  $tarefas_forma = $row["forma"];

                  $clt_id = $row["clt_id"];
                  $clt_nomer = $row["clt_nomer"];
                  $clt_nomef = $row["clt_nomef"];
                  $clt_cnpj = $row["clt_cnpj"];

                  $pessoa_nom = $row["pessoa_nom"];
                  $pessoa_cargo = $row["pessoa_cargo"];
                  $pessoa_tel = $row["pessoa_tel"];
                  $pessoa_mail = $row["pessoa_mail"];

                  $local = $row["local"];
                  $local_nom = $row["local_nom"];
                  if ($local == 0) {
                    $local_nom = "Não informado";
                  }
                  $local_end = $row["local_end"];
                  $local_city = $row["local_city"];
                  $local_uf = $row["local_uf"];

                  $cat_nome = $row["cat_nome"];
                  $scat_nome = $row["scat_nome"];
                  $itens_nome = $row["itens_nome"];

                  $tecnico = $row["tecnico"];
                  $tecnico_nome = $row["tecnico_nome"];
                  if ($tecnico == 0) {
                    $tecnico_nome = "Não direcionado";
                  }
                  //atd ni
                  //TIME TO CLOSE
                  //calcula hora limite para o fechamento do atendimento: Abertura + SLA
                  $time_limit_to_close = date("Y-m-d H:i:s", strtotime($tarefas_hora_abertura . " +$sla minutes"));
                  //hora atual
                  $time_now = date("Y-m-d H:i:s");
                  $start_date = new DateTime($time_now);
                  // $end_date = new DateTime($time_limit_to_close);

                  //TRABALHA O TEMPO DE ESPERA
                  //SOMA TEMPO TOTAL EM QUE O ATENDIMENTO FICOU EM ESPERA
                  $pdo = ConnectionN3();
                  $show_espera = $pdo->prepare("SELECT SUM(TIMESTAMPDIFF(SECOND, espera_start, espera_end)) AS segundos FROM espera_tarefas et WHERE et.espera_tarefa = '$tarefa'");
                  $show_espera->execute();
                  $conta_espera = $show_espera->rowCount();
                  $exibe_espera = $show_espera->fetch(PDO::FETCH_ASSOC);
                  $espera_tempo_total = $exibe_espera["segundos"];
                  //SE NºO TIVER RETORNO, ATRIBUI 0 SEGUNDOS AO TEMPO DE ESPERA
                  if ($espera_tempo_total == "") {
                    $espera_tempo_total = 0;
                  }
                  //SOMA O TEMPO TOTAL DE ESPERA AO PRAZO PARA O FECHAMENTO DO ATENDIMENTO
                  $end_date0 = date("Y-m-d H:i:s", strtotime($time_limit_to_close . " +$espera_tempo_total SECOND"));
                  $end_date = new DateTime($end_date0);

                  //SE ATENDIMENTO ESTIVER EM ESPERA
                  //BUSCA A DATA HORA QUE FOI COLOCADO EM ESPERA
                  //BUSCA A DATA HORA QUE ELE DEVE VOLTAR PARA O ATENDIMENTO
                  if ($tarefas_status == 3) {
                    $pdo = ConnectionN3();
                    $show_espera = $pdo->prepare("SELECT et.espera_start, et.espera_prev FROM espera_tarefas et WHERE et.espera_tarefa = '$tarefa' ORDER BY et.espera_id DESC LIMIT 0,1");
                    $show_espera->execute();
                    $exibe_espera = $show_espera->fetch(PDO::FETCH_ASSOC);
                    $espera_start = $exibe_espera["espera_start"] ?? '';
                    $espera_prev = $exibe_espera["espera_prev"] ?? '';


                    //VERIFICA DE DATA HORA ATUAL FOR MAIOR DO QUE DATA HORA PREVISTA PARA RETOMADA
                    //SE POSITIVO:
                    if (strtotime($time_now) > strtotime($espera_prev)) {
                      //MUDA STATUS DO PEDIDO PARA 2 (EM EXECUÇÃO)
                      //ALTERA A INFORMAÇÃO DE ESPERA NA TABELA DE ESPERAS
                      //INSERE REGISTRO DE INTERAÇÃO NA TABELA DE INTERAÇÃO
                      $pdo = ConnectionN3();

                      // //altera o status do atendimento para 2 (Em execução)
                      // $edt = $pdo->prepare("UPDATE `tarefas` SET `status`='2' WHERE  `id`='$tarefa';");
                      // if ($edt->execute()) {

                      //   //busca o ID do registro de espera, na tabela espera
                      //   $show_espera = $pdo->prepare("SELECT espera.espera_id FROM espera_tarefas WHERE espera.espera_tarefas = '$tarefa' ORDER BY espera.espera_id DESC LIMIT 0,1");
                      //   $show_espera->execute();
                      //   $exibe_espera = $show_espera->fetch(PDO::FETCH_ASSOC);
                      //   $espera_id = $exibe["espera_id"] ?? '';

                      //   //registra A data hora final de espera, na tabela espera
                      //   $edt_espera = $pdo->prepare("UPDATE `espera` SET `espera_end`='$time_now' WHERE `espera_id`='$espera_id';");
                      //   if ($edt_espera->execute()) {

                      //     //insere o registro de uma nova interação 
                      //     $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', '$tarefa', '1', '$time_now', 'Status do atendimento alterado automaticamente para Em Execução.');");
                      //     if ($adc->execute()) {
                      //     } else {
                      //       $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
                      //       $mensagem_cor = "alert-danger";
                      //     }
                      //   } else {
                      //     $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
                      //     $mensagem_cor = "alert-danger";
                      //   }
                      // } else {
                      //   $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao retomar o atendimento!";
                      //   $mensagem_cor = "alert-danger";
                      // }
                    } else {
                      //SE NEGATIVO:
                      //DEFINE A DATA HORA DO INÍCIO DA ESPERA COMO A DATA HORA ATUAL PARA CALCULAR QUANTO TEMPO FALTA PARA ENCERRAR O PRAZO DE PROJETO
                      $time_now = $espera_start;
                      $start_date = new DateTime($espera_start);
                    }
                  }

                  //verifica se ainda existe prazo para atendimento
                  if ($start_date < $end_date) {

                    //calcula a diferença entre o prazo de fechamento e a hora atual
                    $interval = $start_date->diff($end_date);
                    $hours   = $interval->format('%h');
                    $minutes = $interval->format('%i');
                    $progress_color = "blue";
                    $tag = $hours . "h " . $minutes . "m";
                    //calcula o tamanho da barra de progresso do chamado
                    $minutos_restantes = $hours * 60 + $minutes;
                    $progress_width = (110 - ($minutos_restantes / 180 * 100));
                    if ($progress_width > 92) {
                      $progress_color = "orange";
                    }
                  } else {
                    $progress_color = "orange";
                    $progress_width = "100";
                    $tag = "Vencido";
                  }
                  //se atendimento concluído
                  if ($tarefas_status == 4) {

                    $progress_color = "green";
                    $progress_width = "100";
                    $tag = "ok";
                  }

                  //BUSCA A ÚLTIMA INTERAÇÃO QUE HOUVE NO CHAMADO
                  $pdo = ConnectionN3();

                  // var_dump($_SESSION); //_
                  // exit;

                  // $show_inter = $pdo->prepare("SELECT inter_tarefa.inter_data FROM inter_tarefa WHERE inter_tarefa.inter_tarefa = '$tarefa' AND inter_tarefa.inter_tipo > '0' ORDER BY inter_id DESC LIMIT 0,1");
                  // $show_inter->execute();
                  // $exibe_inter = $show_inter->fetch(PDO::FETCH_ASSOC);

                  // $last_inter_data = $exibe_inter["inter_data"];

                  // $end_date = new DateTime($time_now);
                  // $start_date = new DateTime("$last_inter_data");
                  // $interval = $start_date->diff($end_date);
                  // $hours   = $interval->format('%h');
                  // $minutes = $interval->format('%i');
                  // $time_last_inter = $hours * 60 + $minutes;

                  $show_inter = $pdo->prepare("
                      SELECT inter_data 
                      FROM inter_tarefa 
                      WHERE inter_tarefa = :tarefa 
                        AND inter_tipo > 0 
                      ORDER BY inter_id DESC 
                      LIMIT 1
                  ");
                  $show_inter->execute([':tarefa' => $tarefa]);

                  $exibe_inter = $show_inter->fetch(PDO::FETCH_ASSOC);

                  if ($exibe_inter) {
                    $last_inter_data = $exibe_inter["inter_data"];

                    $end_date = new DateTime($time_now);
                    $start_date = new DateTime($last_inter_data);

                    $interval = $start_date->diff($end_date);
                    $time_last_inter = $interval->h * 60 + $interval->i;
                  } else {
                    $time_last_inter = 0; // nenhum registro encontrado
                  }
                ?>
                  <tr>
                    <th class="align-middle" style="white-space:nowrap">
                      #<?php echo str_pad($tarefa, 5, '0', STR_PAD_LEFT); ?>
                      <!-- <button type="button" class="btn btn-outline-light btn-sm" data-container="body" data-toggle="popover" data-trigger="focus" data-placement="right" data-content="<?php echo $tarefas_desc_abertura; ?>"><i class="fas fa-comment-alt text-warning"></i></button> -->
                      <?php if ($tarefas_reincidente == 1) { ?>
                        <i class="fas fa-exclamation-triangle text-danger" title="Reincidente"></i>
                      <?php } ?>
                    </th>

                    <td class="align-middle">
                      <strong><?php echo substr($clt_nomef, 0, 35); ?> </strong><br>
                      <?php if ($pessoa_nom != "") { ?><i class="far fa-user mr-1"></i> <?php echo $pessoa_nom;
                                                                                      } ?>
                    </td>

                    <td class="align-middle text-left" style="width: 25%">
                      <?php $data = date('d/m/y', strtotime($tarefas_hora_abertura));
                      $hora = date('H:i', strtotime($tarefas_hora_abertura)); ?>
                      <?php echo $data . " às " . $hora . "h"; ?> <br>
                      <?php echo $nome_tarefa; ?><br>
                      <?php echo $tarefas_desc_abertura; ?>
                    </td>

                    <td class="align-middle text-center">
                      <?php echo $cat_nome; ?> <br />
                      <?php echo $scat_nome; ?> <br />
                      <?php echo $itens_nome; ?>
                    </td>

                    <!-- <th class="align-middle">
                      <?php if ($tarefas_forma == 1) { ?> <i class="fas fa-laptop-house text-primary" title="Remoto"></i> <?php } ?>
                      <?php if ($tarefas_forma == 2) { ?> <i class="fas fa-briefcase text-danger" title="Presencial"></i> <?php } ?>
                      <?php if ($tarefas_forma == 3) { ?> <i class="fas fa-laptop-house text-primary" title="Remoto - Plantão"></i> <?php } ?>
                      <?php if ($tarefas_forma == 4) { ?> <i class="fas fa-briefcase text-danger" title="Presencial - Plantão"></i> <?php } ?>
                    </th> -->

                    <td class="align-middle text-center">
                      <?php if ($tarefas_forma == 1) { ?> Remoto<?php } ?>
                        <?php if ($tarefas_forma == 2) { ?> Presencial <?php } ?>
                        <?php if ($tarefas_forma == 3) { ?> Remoto - Plantão <?php } ?>
                        <?php if ($tarefas_forma == 4) { ?> Presencial - Plantão<?php } ?>
                    </td>

                    <td class="align-middle">
                    </td>

                    <td class="align-middle">

                      <?php if ($tarefas_status > 0) { ?>
                        <div class="progress <?php echo $progress_color; ?>">
                          <div class="progress-bar" style="width:<?php echo $progress_width; ?>%;">
                            <div class="progress-value"><?php echo $tag; ?>
                            </div>
                          </div>
                        </div>
                      <?php } ?>
                    </td>

                    <td class="align-middle" style="white-space:nowrap">
                      <?php //se atendimento aberto e com mais de 20 minutos sem interação, mostra sino piscando
                      // if ($tarefas_status > 0 && $tarefas_status < 3 && $time_last_inter > $tempo_alerta) {
                      if ($tarefas_status == 1 or $tarefas_status == 2) {
                      ?>
                        <i class="fas fa-bell fa-2x blink"></i>
                      <?php } ?>
                      <?php echo $tecnico_nome; ?>
                    </td>

                    <td class="align-middle" style="white-space:nowrap">
                      <?php if ($tarefas_status == 0) { ?>
                        <i class="far fa-clock"></i> Agendado
                      <?php } ?>
                      <?php if ($tarefas_status == 1) { ?>
                        <i class="fas fa-hourglass-half"></i> Aguardando
                      <?php } ?>
                      <?php if ($tarefas_status == 2) { ?>
                        <i class="fas fa-magic"></i> Em Execução
                      <?php } ?>
                      <?php if ($tarefas_status == 3) { ?>
                        <i class="far fa-pause-circle"></i> Em Espera
                      <?php } ?>
                      <?php if ($tarefas_status == 4) { ?>
                        <i class="fas fa-check"></i> Finalizada
                      <?php } ?>
                    </td>
                    <td class="align-middle p-1">
                      <form action="tarefa.php" method="POST" target="_blank">
                        <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
                        <button type="submit" class="btn btn-light btn-sm p-1"><i class="far fa-folder-open"></i></button>
                      </form>
                    </td>
                  </tr>
                <?php } ?>
              </tbody>
            </table>
          </div>
          <?php } ?>
        </div>
      </div>
    </div>
  </div>
  <!-- MODAL DE AJUDA PARA A LISTA DE ATENDIMENTO -->
  <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
      <div class="modal-content">

        <div class="modal-header">
          <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Lista de atendimento</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        </div>

        <div class="modal-body">
          <p><strong>As tarefas são marcados com os seguintes status:</strong></p>
          <ul class="list">
            <li><i class="far fa-clock"></i> Agendado
              <ul>
                <li class="small">São tarefas cadastrados com Data/Hora futura.</li>
                <li class="small">Eles podem ser listados na tela através das opçães do filtro.</li>
                <li class="small">Quando for a Data/Hora do agendamento o Atendimento terá seu status alterado automaticamente para <span class="badge badge-light"><i class="fas fa-hourglass-half"></i> Aguardando Execução</span>.</li>
              </ul>
            </li>
            <li class="pt-1"><i class="fas fa-hourglass-half"></i> Aguardando Execução
              <ul>
                <li class="small">São tarefas que devem ser executados pelos tecnicos.</li>
                <li class="small">Cada atendimento tem um prazo para ser atendido.</li>
                <li class="small">Caso o atendimento fique por mais de 20 minutos sem uma interação, será exibido o seguinte alerta: <i class="fas fa-bell blink"></i>.</li>
                <li class="small">Quando um técnico iniciar o Atendimento, terá seu status alterado automaticamente para <span class="badge badge-light"><i class="fas fa-magic"></i> Em Execução</span>.</li>
              </ul>
            </li>
            <li class="pt-1"><i class="fas fa-magic"></i> Em Execução
              <ul>
                <li class="small">São tarefas que estão sob responsabilidade de um técnico.</li>
                <li class="small">O técnico responsóvel tem autonomia para transferir, colocar em espera e finalizar o atendimento.</li>
              </ul>
            </li>
            <li class="pt-1"><i class="far fa-pause-circle"></i> Em Espera
              <ul>
                <li class="small">São tarefas que estão aguardando uma resposta de alguém externo a Nível 3.</li>
                <li class="small">Durante o período de espera o prazo para atendimento é <em>pausado</em>.</li>
                <li class="small">Toda espera tem um prazo (Data/Hora).</li>
                <li class="small">Quando o prazo da espera vencer o Atendimento terá seu status alterado automaticamente para <span class="badge badge-light"><i class="fas fa-magic"></i> Em Execução</span>.</li>
              </ul>
            </li>
            <li class="pt-1"><i class="fas fa-check"></i> Finalizada
              <ul>
                <li class="small">São tarefas concluídos.</li>
              </ul>
            </li>
          </ul>
          <p><strong>Os tarefas serão classificados de forma automática como:</strong></p>
          <ul class="list">
            <li><i class="fas fa-exclamation-triangle text-danger"></i> Reincidente
              <ul>
                <li class="small">Quando já tiver sido registrado um atendimento para o mesmo cliente, a mesma categoria e a mesma sub-categoria em um período de 30 dias.</li>
              </ul>
            </li>
          </ul>
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

  <?php include_once("../all/update_pass.php"); ?>

  <script src="../js/bootstrap.min.js"></script>
  <script src="../js/jquery-3.6.0.min.js"></script>
  <script src="../js/bootstrap.bundle.min.js"></script>
  <script src="../js/bootstrap-select.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/pt.js"></script>
  <script src="js/projeto_list.js"></script>

  <?php if (isset($mensagem)) { ?>

    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 4000);
    </script>

  <?php } ?>

  <script>
    $(document).ready(function() {
      $('[data-toggle="popover"]').popover();
    });
  </script>

  <script>
    $('.popover-dismiss').popover({
      trigger: 'focus'
    })
  </script>
</body>

</html>
