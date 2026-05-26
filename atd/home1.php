<?php
session_start();
// var_dump($_POST);

include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");


if ($m3_00 == 0) {
  header("Location: ../index.php");
}


// Verificar a página atual. Se não estiver definida, iniciará na página 1.
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;

// Definir o número de resultados por página
$results_per_page = 200;

// Determinar o número de resultados que serão pulados com base na página atual
$start_from = ($page - 1) * $results_per_page;

// DATA 1
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['f_date_1'])) {
  $_SESSION['f_date_1'] = $_POST['f_date_1'];
}
$f_date_1 = $_SESSION['f_date_1'] ?? '';
$data_1 = $f_date_1;

// DATA 2
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['f_date_2'])) {
  $_SESSION['f_date_2'] = $_POST['f_date_2'];
}
$f_date_2 = $_SESSION['f_date_2'] ?? '';
$data_2 = $f_date_2;

// f_sts
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['f_sts'])) {
  $_SESSION['f_sts'] = $_POST['f_sts'];
}
$f_sts = $_SESSION['f_sts'] ?? 11;

// f_sol
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['f_sol'])) {
  $_SESSION['f_sol'] = $_POST['f_sol'];
}
$f_sol = $_SESSION['f_sol'] ?? 0;

// f_clt
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['f_clt'])) {
  $_SESSION['f_clt'] = $_POST['f_clt'];
}
$f_clt = $_SESSION['f_clt'] ?? 0;

// f_id
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['f_id'])) {
  $_SESSION['f_id'] = $_POST['f_id'];
}
$f_id = $_SESSION['f_id'] ?? '';

// f_palavra
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['f_palavra'])) {
  $_SESSION['f_palavra'] = trim($_POST['f_palavra']);
}
$f_palavra_raw = $_SESSION['f_palavra'] ?? '';

// ordenação
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ord'])) {
  $_SESSION['ord'] = $_POST['ord'];
}
$ord = $_SESSION['ord'] ?? 'status';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['order_dir'])) {
  $_SESSION['order_dir'] = $_POST['order_dir'];
}
$order_dir = $_SESSION['order_dir'] ?? 'ASC';

$order_by = $ord . " " . $order_dir;


$count_atendimentos = 0; // Initialize with a default value
$hoje = date("Y-m-d");
$mensagem = filter_input(INPUT_POST, 'mensagem', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

if ($action == "alterar_senha") {
  include_once("../all/update_senha.php");
}

// STATUS DAS TAREFAS
//0 == agendado
//1 == aguardando execução
//2 == em execução
//3 == em espera
//4 == finalizado
//5 == concluido

//FILTROS

//Todos (10)
//Abertos (11)
//Aguardando (1)
//Em execução (2)
//Em espera (3)
//Finalizado (4)
//Concluído (5)
//Agendados (0)


// Verifica se a ação é limpar
if (isset($_GET['action']) && $_GET['action'] === 'limpar_filtros') {
  // Limpa os filtros da sessão
  unset($_SESSION['f_tipo']);
  unset($_SESSION['tecnicos_selecionados']);
  unset($_SESSION['f_tec']);
  unset($_SESSION['f_sts']);
  unset($_SESSION['f_sol']);
  unset($_SESSION['f_clt']);
  unset($_SESSION['f_id']);
  unset($_SESSION['f_date_1']);
  unset($_SESSION['f_date_2']);
  unset($_SESSION['f_palavra']);
  unset($_SESSION['ord']);
  unset($_SESSION['order_dir']);

  session_write_close();

  // Limpa os filtros do formulário
  $_POST['f_tipo'] = [];
  $_POST['tecnicos_selecionados'] = [];
  $_POST['f_tec'] = '%';
  $_POST['f_sts'] = 11;
  $_POST['f_sol'] = 0;
  $_POST['f_clt'] = 0;
  $_POST['f_id'] = '';
  $_POST['f_date_1'] = '';
  $_POST['f_date_2'] = '';
  $_POST['f_palavra'] = '';
  $_POST['ord'] = 'status';
  $_POST['order_dir'] = 'ASC';

  // Redireciona de volta para a página principal sem parâmetros
  header('Location: ' . $_SERVER['PHP_SELF']);
  exit;
}



// alteração 12/04/2025 - apagar apos teste
$f_palavra = '';  // Inicializa a variável
$filtro_palavra = '';  // Inicializa o filtro

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  // Salvar os filtro de tecnicos na sessão
  if (isset($_POST['f_tec'])) {
    $_SESSION['f_tec'] = $_POST['f_tec'];
  } else {
    unset($_SESSION['f_tec']);
  }
} else {
  // Mantendo os filtros da sessão
  $_POST['f_tec'] = isset($_SESSION['f_tec']) ? $_SESSION['f_tec'] : [];
}


// Salvando os filtros na sessão

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if (isset($_POST['f_tipo'])) {
    $_SESSION['f_tipo'] = $_POST['f_tipo']; // Salvar os tipos selecionados
  } else {
    unset($_SESSION['f_tipo']); // Remove o filtro caso nada seja selecionado
  }
} else {
  // Mantendo os filtros da sessão
  $_POST['f_tipo'] = isset($_SESSION['f_tipo']) ? $_SESSION['f_tipo'] : [];
}


if (isset($_SESSION['allterusN3Id']) && (int)$_SESSION['allterusN3Id'] == 134) {
  // Se o ID da sessão for 134, forçar a palavra para "NET DO BRASIL"
  $f_palavra_raw = 'NET DO BRASIL';
  $f_palavra = '%' . $f_palavra_raw . '%';
  $filtro_palavra = "AND (LOWER(atendimentos.desc_abertura) LIKE LOWER('$f_palavra') OR LOWER(atendimentos.desc_fechamento) LIKE LOWER('$f_palavra'))";
} else {
  // Para os demais usuários, usa a palavra digitada no filtro
  if (isset($_POST['f_palavra']) && !empty(trim($_POST['f_palavra']))) {
    $f_palavra_raw = trim($_POST['f_palavra']);
    $f_palavra = '%' . $f_palavra_raw . '%';
    $filtro_palavra = "AND (LOWER(atendimentos.desc_abertura) LIKE LOWER('$f_palavra') OR LOWER(atendimentos.desc_fechamento) LIKE LOWER('$f_palavra'))";
  } else {
    $f_palavra_raw = '';
  }
}

// Filtro de status
$f_sts = $_POST['f_sts'] ?? 11;
switch ($f_sts) {
  case 10:
    $p_sts = "0,1,2,3,4";
    break;
  case 11:
    $p_sts = "1,2,3,5";
    break;
  default:
    $p_sts = $f_sts;
    break;
}

// Filtro de solicitante
$f_sol = $_POST['f_sol'] ?? 0;
$p_sol = ($f_sol == 0) ? "%" : $f_sol;

// Filtro de cliente
$f_clt = $_POST['f_clt'] ?? 0;
$p_clt = ($f_clt == 0) ? "%" : $f_clt;
if ($f_clt == 0) $p_sol = "%"; // forma reset de solicitante

// Filtro de ID
$f_id = $_POST['f_id'] ?? "%";
$p_id = ($f_id == "") ? "%" : $f_id;


$pdo = ConnectionN3();

if (!empty($p_id) && $p_id != "%") {
  $p_sts = "0,1,2,3,4,5";
}


// ------------------ CONSTRUÇÃO DA CONSULTA SQL DE CONTAGEM ------------------
// $tiposSelecionados = '0,1,2,3,4,5';

$f_tipo = isset($_POST['f_tipo']) ? (is_array($_POST['f_tipo']) ? $_POST['f_tipo'] : explode(',', $_POST['f_tipo'])) : [];

if (!empty($f_tipo)) {
  $tiposSelecionadosArray = array_map('intval', $f_tipo);
  $tiposSelecionados = "AND atendimentos.tipo IN (" . implode(',', $tiposSelecionadosArray) . ")";
} else {
  $tiposSelecionados = "AND atendimentos.tipo IN (0,1,2,3,4,5)"; // nenhum filtro = traz todos
}

$f_tec = isset($_POST['f_tec']) ? (is_array($_POST['f_tec']) ? $_POST['f_tec'] : explode(',', $_POST['f_tec'])) : [];

if (!empty($f_tec)) {
  $tecnicosSelecionadosArray = array_map('intval', $f_tec);
  $filtro_tecnico = "AND atendimentos.tecnico IN (" . implode(',', $tecnicosSelecionadosArray) . ")";
} else {
  $filtro_tecnico = ""; // nenhum filtro = traz todos
}


// Monta o SQL base
$baseSql = "
    FROM atendimentos 
    INNER JOIN clientes ON clientes.clt_id = atendimentos.cliente
    LEFT JOIN pessoas ON pessoas.pessoa_id = atendimentos.pessoa
    LEFT JOIN locais ON locais.local_id = atendimentos.`local`
    LEFT JOIN categorias ON categorias.cat_id = atendimentos.categoria
    LEFT JOIN subcategorias ON subcategorias.scat_id = atendimentos.subcategoria
    LEFT JOIN itens ON itens.itens_id = atendimentos.item
    LEFT JOIN usuarios ON usuarios.user_id = atendimentos.tecnico
    WHERE atendimentos.`status` IN ($p_sts)
    AND clientes.clt_id LIKE '$p_clt'
    AND atendimentos.pessoa LIKE '$p_sol'
    $tiposSelecionados
    $filtro_palavra
    $filtro_tecnico
";

// Filtro por ID
if (!empty($p_id) && $p_id != "%") {
  $baseSql .= " AND atendimentos.id = '$p_id'";
} else {
  $baseSql .= " AND atendimentos.id LIKE '$p_id'";
}

// Filtros por data
if (!empty($f_date_1) && !empty($f_date_2)) {
  $baseSql .= " AND atendimentos.abertura BETWEEN '$f_date_1' AND '$f_date_2'";
} elseif (!empty($f_date_1)) {
  $baseSql .= " AND atendimentos.abertura >= '$f_date_1'";
} elseif (!empty($f_date_2)) {
  $baseSql .= " AND atendimentos.abertura <= '$f_date_2'";
}

// Consulta de contagem
$sql_count = "SELECT COUNT(*) AS count_atendimentos " . $baseSql;

// Consulta de IDs
$sql_ids = "SELECT atendimentos.id " . $baseSql;

try {

  // echo "<script>
  //     // console.log('?? SQL Count:', " . json_encode($sql_count) . ");
  //     // console.log('?? SQL IDs:', " . json_encode($sql_ids) . ");
  //     // console.log('?? SQL Base:', " . json_encode($baseSql) . ");
  //     console.log('?? Filtros ativos:', " . json_encode($_POST) . ");
  // </script>";

  // echo "<script>console.log(" . json_encode($_SESSION) . ")</script>";

  // 1. Obter contagem
  $show_count = $pdo->prepare($sql_count);
  $show_count->execute();

  $row_count = $show_count->fetch(PDO::FETCH_ASSOC);
  $count_atendimentos = $row_count ? $row_count['count_atendimentos'] : 0;

  // 2. Obter IDs para conferência
  $stmt_ids = $pdo->prepare($sql_ids);
  $stmt_ids->execute();
  $ids = $stmt_ids->fetchAll(PDO::FETCH_COLUMN);
  $js_count = $count_atendimentos;
  $js_ids = json_encode($ids);
  // echo "<script>
  //   console.log('?? Contagem total de atendimentos:', $js_count);
  //   console.log('?? IDs dos atendimentos:', $js_ids);
  // </script>";
} catch (Exception $e) {
  error_log("Erro nas consultas: " . $e->getMessage());
  // echo "<script>console.error('Erro ao buscar dados');</script>";
}


if (isset($_POST['ord'])) {
  $ord = $_POST['ord'];
} else {
  $ord = "status";
}

// Definindo a direção de ordenação
if (isset($_POST['order_dir'])) {
  $order_dir = $_POST['order_dir'];
} else {
  $order_dir = "ASC";
}
$order_by = $ord . " " . $order_dir;

//BUSCA INFORMAÇÕES DE CONFIGURAÇÃO DE TEMPO DE ATENDIMENTO
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
$sla_n6 = $row["sla_n12"];


//imprime os dados da sessao
// echo "<pre>";
// print_r($_SESSION);
// echo "</pre>";
// echo $sql;
// exit;

?>


<?php



//BUSCA TODOS OS ATENDIMENTOS QUE ESTÃO AGENDADOS (STATUS = 0)

//COMPARA DATA HORA DO AGENDAMENTO COM DATA HORA ATUAL

//SE DATA HORA ATUAL MAIOR QUE DATA HORA DE AGENDAMENTO

//ALTERA O STATUS DO ATENDIMENTO PARA 1 (AGUARDANDO EXECUÇÃO)

//REGISTRA ALTERAÇÃO NA TABELA DE INTERATIVIDADE

$time_now = date("Y-m-d H:i:s");

$pdo = ConnectionN3();

$show_atd = $pdo->prepare("SELECT atendimentos.id, atendimentos.abertura FROM atendimentos WHERE atendimentos.`status` = '0'");

$show_atd->execute();

while ($exibe = $show_atd->fetch(PDO::FETCH_ASSOC)) {

  $atd = $exibe["id"];

  $atd_agendamento = $exibe["abertura"];

  if (strtotime($time_now) > strtotime($atd_agendamento)) {

    //altera o status do atendimento para 1 (Aguardando execução)

    $edt = $pdo->prepare("UPDATE `atendimentos` SET `status`='1' WHERE  `id`='$atd';");

    if ($edt->execute()) {

      //insere o registro de uma nova interação

      $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$atd', '1', '$time_now', 'Status do atendimento alterado automaticamente para Aguardando Execução.');");

      if ($adc->execute()) {
      } else {

        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";

        $mensagem_cor = "alert-danger";
      }
    }
  }
}

?>

<!doctype html>

<html lang="pt-BR">

<head>

  <meta charset="utf-8">

  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

  <link rel="icon" href="../img/favicon.ico">

  <link rel="stylesheet" href="../css/bootstrap.min.css">

  <link rel="stylesheet" href="../fontawesome/css/all.css">

  <link rel="stylesheet" href="../css/bootstrap-select.min.css">

  <link rel="stylesheet" href="../css/progress_bar.css">

  <link rel="stylesheet" href="../css/blink.css">

  <link rel="stylesheet" href="../css/help.css">

  <title>Allterus</title>

</head>
<style>
  body {
    zoom: 0.9;
    width: 100%;
    overflow-x: hidden;
  }

  .form-check-label {
    font-size: 13px;
    /* Ajuste do texto préximo aos checkboxes */
    padding: 1px;
  }

  .-dropdown-toggle-split::after {
    /*alinha o icone da setinha na direita*/
    position: absolute;
    right: 10px;
    top: 45%;
  }

  .dropdown-toggle-split::before {
    content: none;
    /* Remove a setinha */
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

  th,
  td {
    max-width: 200px;
    /* Defina um limite máximo de largura */
    white-space: normal;
    /* Permite a quebra de linha */
    word-wrap: break-word;
    /* Quebra palavras longas */
  }

  .dropdown-menu .form-check-input {
    transform: scale(1.2);
    margin-right: 6px;
    cursor: pointer;
  }
</style>

</style>

<body>

  <?php include_once("../all/loading.php"); ?>

  <?php include("../all/sidebar.php"); ?>

  <div class="container-fluid">
    <div class="row">
      <div class="col-12 mt-2" style="padding-left: 1px; padding-right: 1px;">
        <div class="card">
          <div class="card-header py-1">
            <form action="#" method="POST">
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
                    ?><option value="<?php echo $clt_id; ?>" <?php if ($f_clt == $clt_id) {
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
                      ?><option value="<?php echo $pessoa_id; ?>" <?php if ($f_sol == $pessoa_id) {
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
                                      } ?>>Finalizado</option>
                    <option value="5" <?php if (5 == $f_sts) {
                                        echo " selected";
                                      } ?>>Concluído</option>
                    <option value="0" <?php if (0 == $f_sts) {
                                        echo " selected";
                                      } ?>>Agendados</option>
                  </select>
                </div>


                <?php if (isset($_SESSION['tipo']) && $_SESSION['tipo'] != 2) { ?>
                  <div class="col-auto col-form-label-sm">
                    <label class="my-0">Tipo Atendimento:</label>
                    <div class="dropdown" style="width: 160px">
                      <div class="form-control form-control-sm dropdown-toggle dropdown-toggle-split" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="cursor: pointer;">
                        Selecione
                      </div>
                      <div class="dropdown-menu" style="padding: 10px; width: 200px; border-radius: 4px;">

                        <!-- Checkbox "Selecionar Todos" -->
                        <div class="form-check">
                          <input class="form-check-input" type="checkbox" id="select-all-tipo" onclick="toggleAllTipos()">
                          <label class="form-check-label" for="select-all-tipo">Todos</label>
                        </div>

                        <?php
                        $tiposAtendimento = [
                          '1' => 'Falha',
                          '2' => 'Relacionamento',
                          '3' => 'Requisição de Serviços',
                          '4' => 'Requisição de Informação',
                          '6' => 'Melhoria',
                          '0' => 'Não Informado'
                        ];
                        foreach ($tiposAtendimento as $valor => $nome) {
                          $checked = in_array($valor, $f_tipo) ? 'checked' : '';
                          echo '<div class="form-check">';
                          echo '<input class="form-check-input tipo-checkbox" type="checkbox" name="f_tipo[]" value="' . $valor . '" id="tipo' . $valor . '" ' . $checked . '>';
                          echo '<label class="form-check-label" for="tipo' . $valor . '">' . $nome . '</label>';
                          echo '</div>';
                        }
                        ?>
                      </div>
                    </div>
                  </div>



                  <?php
                  $pdo = ConnectionN3();
                  $show_clt = $pdo->prepare("SELECT user_id, user_nome FROM usuarios WHERE user_sts = '1' AND user_id > '1' AND user_funcao IN (2,3,4,5,6,7,9,10,11,12,13,14) ORDER BY user_nome ASC");
                  $show_clt->execute();
                  // Garante que os tecnicos selecionados sejam sempre um array
                  $tecnicosSelecionadosRaw = $_SESSION['f_tec'] ?? [];
                  $tecnicosSelecionados = is_array($tecnicosSelecionadosRaw)
                    ? $tecnicosSelecionadosRaw
                    : explode(',', $tecnicosSelecionadosRaw);
                  ?>

                  <div class="col-auto col-form-label-sm">
                    <label class="my-0">Tecnicos:</label>
                    <div class="dropdown" style="width: 160px;">
                      <div class="form-control form-control-sm dropdown-toggle dropdown-toggle-split" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="cursor: pointer;">
                        Selecione o técnico
                      </div>
                      <div class="dropdown-menu" style="padding: 10px; width: 200px; border-radius: 4px; max-height: 400px; overflow-y: auto; ">

                        <!-- Checkbox "Selecionar Todos" -->
                        <div class="form-check">
                          <input class="form-check-input" type="checkbox" id="select-all-tecnicos" onclick="toggleAllTecnicos()">
                          <label class="form-check-label" for="select-all-tecnicos">Todos os tecnicos</label>
                        </div>

                        <!-- Tecnico "Não direcionado" -->
                        <div class="form-check">
                          <input class="form-check-input tec-checkbox" type="checkbox" name="f_tec[]" value="0" id="tec0" <?= in_array("0", $tecnicosSelecionados) ? 'checked' : '' ?>>
                          <label class="form-check-label" for="tec0">Não direcionado</label>
                        </div>

                        <!-- Lista de Tecnicos dinâmicos -->
                        <?php while ($tec = $show_clt->fetch(PDO::FETCH_ASSOC)) : ?>
                          <div class="form-check">
                            <input class="form-check-input tec-checkbox" type="checkbox" name="f_tec[]" value="<?= $tec['user_id'] ?>" id="tec<?= $tec['user_id'] ?>" <?= in_array($tec['user_id'], $tecnicosSelecionados) ? 'checked' : '' ?>>
                            <label class="form-check-label" for="tec<?= $tec['user_id'] ?>">
                              <?= htmlspecialchars($tec['user_nome']) ?>
                            </label>
                          </div>
                        <?php endwhile; ?>

                      </div>
                    </div>
                  </div>




                <?php } ?>

                <div class="col-auto col-form-label-sm">
                  <label class="my-0">ID:</label>
                  <input type="text" name="f_id" id="f_id" class="form-control form-control-sm" style="width: 100px;" placeholder="Digite o ID" tabindex="4" onfocus="this.placeholder=''" onblur="this.placeholder='Digite o ID'" oninput="updateItems()">
                </div>

                <div class="col-auto pt-3">
                  <button type="submit" class="btn btn-sm btn-info" tabindex="4">Filtrar</button>
                </div>

                <div class="col-auto pt-3">
                  <button type="button" class="btn btn-sm btn-outline-info" tabindex="4" onclick="window.location.href='?action=limpar_filtros';">Limpar</button>
                </div>

                <?php if (isset($_SESSION['allterusN3Id']) && (int)$_SESSION['allterusN3Id'] !== 134) { ?>
                  <div class="col-auto pt-3">
                    <a href="./srhome.php" class="btn btn-sm btn-outline-info" tabindex="4">
                      <i class="fas fa-calendar-alt"></i> Filtro Avançado
                    </a>
                  </div>

                  <div class="col-auto pt-3 mr-3">
                    <button class="btn btn-sm btn-outline-info" tabindex="4">Total de Atendimentos: <?php echo $count_atendimentos; ?></button>
                  </div>

                  <!-- ícone único para auto-reload (sem texto) -->
                  <i id="autoReloadToggle" class="fas fa-sync text-muted  mt-2" style="font-size: 16px; cursor: pointer;" title="Atualização automática"></i>

              </div>

            <?php } else { ?>

              <div class="col-auto pt-3">
                <button class="btn btn-sm btn-outline-info" tabindex="4">Total de Atendimentos: <?php echo $count_atendimentos; ?></button>
              </div>

            <?php } ?>

          </div>
          </form>


          <script>
            function updateItems() {
              var selectedId = document.getElementById('f_id').value;
              var xhr = new XMLHttpRequest();
              xhr.onreadystatechange = function() {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                  // console.log('Resposta do servidor:', xhr.responseText);
                  if (xhr.status === 200) {
                    try {
                      var items = JSON.parse(xhr.responseText);
                      console.log('JSON convertido:', items);
                      displayItems(items);
                    } catch (e) {
                      // console.error('Erro ao fazer parse do JSON:', e);
                      // console.log('Resposta recebida:', xhr.responseText);
                    }
                  } else {
                    console.error('Erro ao obter os itens:', xhr.status);
                  }
                }
              };
              var url = 'home.php?action=getItems&f_id=' + encodeURIComponent(selectedId);
              // console.log('Requisição AJAX para URL:', url);
              xhr.open('GET', url);
              xhr.send();
            }

            function displayItems(items) {
              var itemsContainer = document.getElementById('items-container');
              itemsContainer.innerHTML = '';
              items.forEach(function(item) {
                console.log('Item atual:', item); // Aqui a depuração completa do objeto item
                var div = document.createElement('div');
                div.className = 'item';
                div.textContent = 'ID: ' + item.id + ', Nome: ' + item.name;
                itemsContainer.appendChild(div);
              });
            }

            document.addEventListener('DOMContentLoaded', function() {
              updateItems();
            });
          </script>


        </div>
      </div>
    </div>
  </div>
  </div>



  <div class="card-body p-0" style="overflow-x: auto; overflow-y: auto">
    <div class="table-container">
      <table class="table table-hover small">

        <thead>
          <tr>
            <th class="p-1">
              <form action="#" method="POST">
                <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                <?php
                if (is_array($f_tec)) {
                  foreach ($f_tec as $tec) {
                    echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                }
                ?>

                <?php
                if (is_array($f_tipo)) {
                  foreach ($f_tipo as $tipo) {
                    echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($tipo) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($f_tipo) . '">';
                }
                ?>
                <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                <input type="hidden" name="data_1" value="<?php echo $data_1; ?>">
                <input type="hidden" name="data_2" value="<?php echo $data_2; ?>">
                <input type="hidden" name="ord" value="id">
                <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> ID</button>
              </form>
            </th>

            <th class="p-1">
              <form action="#" method="POST">
                <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                <?php
                if (is_array($f_tec)) {
                  foreach ($f_tec as $tec) {
                    echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                }
                ?>

                <?php
                if (is_array($f_tipo)) {
                  foreach ($f_tipo as $tipo) {
                    echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($tipo) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($f_tipo) . '">';
                }
                ?>
                <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                <input type="hidden" name="data_1" value="<?php echo $data_1; ?>">
                <input type="hidden" name="data_2" value="<?php echo $data_2; ?>">
                <input type="hidden" name="ord" value="cliente">
                <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Cliente</button>
              </form>
            </th>
            <th class="p-1">
              <form action="#" method="POST">
                <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                <?php
                if (is_array($f_tec)) {
                  foreach ($f_tec as $tec) {
                    echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                }
                ?>

                <?php
                if (is_array($f_tipo)) {
                  foreach ($f_tipo as $tipo) {
                    echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($tipo) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($f_tipo) . '">';
                }
                ?>
                <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                <input type="hidden" name="data_1" value="<?php echo $data_1; ?>">
                <input type="hidden" name="data_2" value="<?php echo $data_2; ?>">
                <input type="hidden" name="ord" value="abertura">
                <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Abertura</button>
              </form>
            </th>

            <th class="p-1">
              <button type="submit" class="btn btn-light btn-sm btn-block">Tipo</button>
            </th>


            <th class="p-1">
              <button type="submit" class="btn btn-light btn-sm btn-block">Categoria</button>
            </th>


            <th class="p-1">
              <form action="#" method="POST">
                <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                <?php
                if (is_array($f_tec)) {
                  foreach ($f_tec as $tec) {
                    echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                }
                ?>

                <?php
                if (is_array($f_tipo)) {
                  foreach ($f_tipo as $tipo) {
                    echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($tipo) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($f_tipo) . '">';
                }
                ?>
                <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                <input type="hidden" name="data_1" value="<?php echo $data_1; ?>">
                <input type="hidden" name="data_2" value="<?php echo $data_2; ?>">
                <input type="hidden" name="ord" value="nivel">
                <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i>Nível</button>
              </form>
            </th>

            <th class="p-1">
              <form action="#" method="POST">
                <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                <?php
                if (is_array($f_tec)) {
                  foreach ($f_tec as $tec) {
                    echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                }
                ?>

                <?php
                if (is_array($f_tipo)) {
                  foreach ($f_tipo as $tipo) {
                    echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($tipo) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($f_tipo) . '">';
                }
                ?>
                <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                <input type="hidden" name="data_1" value="<?php echo $data_1; ?>">
                <input type="hidden" name="data_2" value="<?php echo $data_2; ?>">
                <input type="hidden" name="ord" value="Prioridade">
                <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i>Prioridade</button>
              </form>
            </th>


            <th class="p-1">
              <form action="#" method="POST">
                <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                <?php
                if (is_array($f_tec)) {
                  foreach ($f_tec as $tec) {
                    echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                }
                ?>

                <?php
                if (is_array($f_tipo)) {
                  foreach ($f_tipo as $tipo) {
                    echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($tipo) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($f_tipo) . '">';
                }
                ?>
                <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                <input type="hidden" name="data_1" value="<?php echo $data_1; ?>">
                <input type="hidden" name="data_2" value="<?php echo $data_2; ?>">
                <input type="hidden" name="ord" value="forma">
                <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i>Forma</button>
              </form>
            </th>

            <th class="p-1">
              <button type="submit" class="btn btn-light btn-sm btn-block">Prazo para Conclusão</button>
            </th>

            <th class="p-1">
              <form action="#" method="POST">
                <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                <?php
                if (is_array($f_tec)) {
                  foreach ($f_tec as $tec) {
                    echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                }
                ?>

                <?php
                if (is_array($f_tipo)) {
                  foreach ($f_tipo as $tipo) {
                    echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($tipo) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($f_tipo) . '">';
                }
                ?>
                <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                <input type="hidden" name="data_1" value="<?php echo $data_1; ?>">
                <input type="hidden" name="data_2" value="<?php echo $data_2; ?>">
                <input type="hidden" name="ord" value="tecnico">
                <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Tecnico</button>
              </form>
            </th>

            <th class="p-1">
              <form action="#" method="POST">
                <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                <?php
                if (is_array($f_tec)) {
                  foreach ($f_tec as $tec) {
                    echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tec[]" value="' . htmlspecialchars($tec) . '">';
                }
                ?>

                <?php
                if (is_array($f_tipo)) {
                  foreach ($f_tipo as $tipo) {
                    echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($tipo) . '">';
                  }
                } else {
                  echo '<input type="hidden" name="f_tipo[]" value="' . htmlspecialchars($f_tipo) . '">';
                }
                ?>
                <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                <input type="hidden" name="data_1" value="<?php echo $data_1; ?>">
                <input type="hidden" name="data_2" value="<?php echo $data_2; ?>">
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
            $filterEmpresas .= " AND atendimentos.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
          }

          // Se um ID específico for fornecido, buscar em todos os status
          if ($p_id > 0 || $p_id != "%") {
            //remover os zeros da esquerda 
            $p_id = ltrim($p_id, '0');
            // Se um ID foi fornecido, desconsidera o filtro de status do front e define todos os status possíveis
            $p_sts = "0,1,2,3,4,5";
          }


          // echo '<script>console.log("Valor de f_tipo_array: ", ' . json_encode($f_tipo_array) . ');</script>';

          // echo '<script>console.log("Valor de p_sts: ", ' . json_encode($p_sts) . ');</script>';
          // echo '<script>console.log("Valor de p_id: ", ' . json_encode($p_id) . ');</script>';

          // Construção da consulta SQL
          $sql = "SELECT atendimentos.id, atendimentos.cliente, atendimentos.`area`, atendimentos.`tipo`, atendimentos.`local`, atendimentos.nivel, atendimentos.prioridade, atendimentos.forma, atendimentos.desc_abertura, atendimentos.desc_fechamento, atendimentos.abertura, atendimentos.fechamento, atendimentos.tecnico, atendimentos.reincidente, atendimentos.`status`,
                                clientes.clt_id, clientes.clt_nomer, clientes.clt_nomef, clientes.clt_cnpj,
                                pessoas.pessoa_nom, pessoas.pessoa_cargo, pessoas.pessoa_tel, pessoas.pessoa_mail,
                                locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
                                categorias.cat_nome, subcategorias.scat_nome, itens.itens_nome,
                                usuarios.user_nome AS tecnico_nome, usuarios.user_cel AS tecnico_tel, usuarios.user_mail AS tecnico_mail
                            FROM atendimentos 
                            INNER JOIN clientes ON clientes.clt_id = atendimentos.cliente
                            LEFT JOIN pessoas ON pessoas.pessoa_id = atendimentos.pessoa
                            LEFT JOIN locais ON locais.local_id = atendimentos.`local`
                            LEFT JOIN categorias ON categorias.cat_id = atendimentos.categoria
                            LEFT JOIN subcategorias ON subcategorias.scat_id = atendimentos.subcategoria
                            LEFT JOIN itens ON itens.itens_id = atendimentos.item
                            LEFT JOIN usuarios ON usuarios.user_id = atendimentos.tecnico
                            WHERE atendimentos.`status` IN ($p_sts)
                            AND clientes.clt_id LIKE '$p_clt'
                            AND atendimentos.pessoa LIKE '$p_sol'
                            AND atendimentos.id LIKE '$p_id'
                            $filtro_palavra
                            ";


          $f_tipo = isset($_POST['f_tipo']) ? (is_array($_POST['f_tipo']) ? $_POST['f_tipo'] : explode(',', $_POST['f_tipo'])) : [];

          if (!empty($f_tipo)) {
            $tiposSelecionadosArray = array_map('intval', $f_tipo);
            $tiposSelecionados = "AND atendimentos.tipo IN (" . implode(',', $tiposSelecionadosArray) . ")";
          } else {
            $tiposSelecionados = "AND atendimentos.tipo IN (0,1,2,3,4,5)"; // nenhum filtro = traz todos
          }

          $sql .= $tiposSelecionados;


          $f_tec = isset($_POST['f_tec']) ? (is_array($_POST['f_tec']) ? $_POST['f_tec'] : explode(',', $_POST['f_tec'])) : [];

          if (!empty($f_tec)) {
            $tecnicosSelecionadosArray = array_map('intval', $f_tec);
            $filtro_tecnico = "AND atendimentos.tecnico IN (" . implode(',', $tecnicosSelecionadosArray) . ")";
          } else {
            $filtro_tecnico = ""; // nenhum filtro = traz todos
          }

          $sql .= $filtro_tecnico;


          $sql .= $filterEmpresas;
          $sql .= " ORDER BY $ord $order_dir";

          // Limitar a busca quando todos os filtros estiverem definidos como "%", ou seja, sem filtros específicos
          if ($p_sts == "0,1,2,3,4" || $p_sts == "4" || $p_sts == "5" || $p_sts == "10" && $p_clt == "%" && $p_tec == "%" && $p_sol == "%" && $p_id == "%") {
            // Se estiver buscando tudo, limite os resultados por página
            $results_per_page = 200; // Limite máximo por página
            $start_from = ($page - 1) * $results_per_page;
            $sql .= " LIMIT $start_from, $results_per_page";
          }

          // var_dump($sql);
          // echo '<script>console.log("Valor de p_sts: ", ' . json_encode($p_sts) . ');</script>';
          // echo '<script>console.log("Valor de p_id: ", ' . json_encode($p_id) . ');</script>';

          $show_atd = $pdo->prepare($sql);
          $show_atd->execute();

          $count_atendimentos = 0;
          $count_atendimentos = $show_atd->rowCount();
          // echo '<script>console.log("count_atendimentos: ", ' . json_encode($count_atendimentos) . ');</script>';

          while ($row = $show_atd->fetch(PDO::FETCH_ASSOC)) {

            $atd = $row["id"];
            $atd_desc_abertura = $row["desc_abertura"];
            $atd_desc_fechamento = $row["desc_fechamento"];
            $atd_hora_abertura = $row["abertura"];
            $atd_hora_fechamento = $row["fechamento"];
            $atd_reincidente = $row["reincidente"];
            $atd_status = $row["status"];

            $atd_tipo = $row["tipo"];
            if ($atd_tipo == 1) {
              $atd_tipon = "Falha";
            }
            if ($atd_tipo == 2) {
              $atd_tipon = "Relacionamento";
            }
            if ($atd_tipo == 3) {
              $atd_tipon = "Requisição de Serviços";
            }
            if ($atd_tipo == 4) {
              $atd_tipon = "Requisição de informação";
            }
            if ($atd_tipo == 6) {
              $atd_tipon = "Melhoria";
            }
            if ($atd_tipo == 0) {
              $atd_tipon = "Não informado";
            }

            $atd_nivel = $row["nivel"];
            if ($atd_nivel == 0) {
              $atd_niveln = "Não informado";
              $sla = $sla_n1;
            }
            if ($atd_nivel == 1) {
              $atd_niveln = "Nível 1";
              $sla = $sla_n1;
            }
            if ($atd_nivel == 2) {
              $atd_niveln = "Nível 2";
              $sla = $sla_n2;
            }
            if ($atd_nivel == 3) {
              $atd_niveln = "Nível 3";
              $sla = $sla_n3;
            }
            if ($atd_nivel == 4) {
              $atd_niveln = "Rotina";
              $sla = $sla_n4;
            }
            if ($atd_nivel == 5) {
              $atd_niveln = "Rotina";
              $sla = $sla_n5;
            }
            if ($atd_nivel == 6) {
              $atd_niveln = "Tarefa";
              $sla = $sla_n6;
            }

            $atd_prioridade = $row["prioridade"];
            if ($atd_prioridade == 0) {
              $atd_prioridaden = "Não informado";
            }
            if ($atd_prioridade == 1) {
              $atd_prioridaden = "Baixa";
            }
            if ($atd_prioridade == 2) {
              $atd_prioridaden = "Média";
            }
            if ($atd_prioridade == 3) {
              $atd_prioridaden = "Alta";
            }
            if ($atd_prioridade == 4) {
              $atd_prioridaden = "Urgente";
            }

            $atd_forma = $row["forma"];
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



            //TIME TO CLOSE
            //calcula hora limite para o fechamento do atendimento: Abertura + SLA

            $time_limit_to_close = date("Y-m-d H:i:s", strtotime($atd_hora_abertura . " +$sla minutes"));

            //hora atual

            $time_now = date("Y-m-d H:i:s");
            $start_date = new DateTime($time_now);

            //$end_date = new DateTime($time_limit_to_close);



            //TRABALHA O TEMPO DE ESPERA
            //SOMA TEMPO TOTAL EM QUE O ATENDIMENTO FICOU EM ESPERA

            $pdo = ConnectionN3();
            $show_espera = $pdo->prepare("SELECT SUM(TIMESTAMPDIFF(SECOND, espera_start, espera_end)) AS segundos FROM espera WHERE espera.espera_atd = '$atd'");
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

            if ($atd_status == 3) {
              $pdo = ConnectionN3();
              $show_espera = $pdo->prepare("SELECT espera.espera_start, espera.espera_prev FROM espera WHERE espera.espera_atd = '$atd' ORDER BY espera_id DESC LIMIT 0,1");
              $show_espera->execute();
              $exibe_espera = $show_espera->fetch(PDO::FETCH_ASSOC);
              $espera_start = $exibe_espera["espera_start"];
              $espera_prev = $exibe_espera["espera_prev"];



              //VERIFICA DE DATA HORA ATUAL FOR MAIOR DO QUE DATA HORA PREVISTA PARA RETOMADA
              //SE POSITIVO:

              if (strtotime($time_now) > strtotime($espera_prev)) {

                //MUDA STATUS DO PEDIDO PARA 2 (EM EXECUÇÃO)
                //ALTERA A INFORMAÇÃO DE ESPERA NA TABELA DE ESPERAS
                //INSERE REGISTRO DE INTERAÇÃO NA TABELA DE INTERAÇÃO

                $pdo = ConnectionN3();

                //altera o status do atendimento para 2 (Em execução)

                $edt = $pdo->prepare("UPDATE `atendimentos` SET `status`='2' WHERE  `id`='$atd';");

                if ($edt->execute()) {

                  //busca o ID do registro de espera, na tabela espera

                  $show_espera = $pdo->prepare("SELECT espera.espera_id FROM espera WHERE espera.espera_atd = '$atd' ORDER BY espera.espera_id DESC LIMIT 1");
                  $show_espera->execute();
                  $exibe = $show_espera->fetch(PDO::FETCH_ASSOC);
                  $espera_id = $exibe["espera_id"];



                  //registra A data hora final de espera, na tabela espera

                  $edt_espera = $pdo->prepare("UPDATE `espera` SET `espera_end`='$time_now' WHERE `espera_id`='$espera_id';");

                  if ($edt_espera->execute()) {

                    //insere o registro de uma nova interação

                    $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', '$atd', '1', '$time_now', 'Status do atendimento alterado automaticamente para Em Execução.');");

                    if ($adc->execute()) {
                    } else {

                      $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
                      $mensagem_cor = "alert-danger";
                    }
                  } else {

                    $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
                    $mensagem_cor = "alert-danger";
                  }
                } else {

                  $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao retomar o atendimento!";
                  $mensagem_cor = "alert-danger";
                }
              } else {

                //SE NEGATIVO:
                //DEFINE A DATA HORA DO INÍCIO DA ESPERA COMO A DATA HORA ATUAL PARA CALCULAR QUANTO TEMPO FALTA PARA ENCERRAR O PRAZO DE ATENDIMENTO

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

            if ($atd_status == 4) {
              $progress_color = "green";
              $progress_width = "100";
              $tag = "ok";
            }



            //BUSCA A ÚLTIMA INTERAÇÃO QUE HOUVE NO CHAMADO

            $pdo = ConnectionN3();
            $show_inter = $pdo->prepare("SELECT interatividade.inter_data FROM interatividade WHERE interatividade.inter_atd = '$atd' AND interatividade.inter_tipo > '0' ORDER BY inter_id DESC LIMIT 1");
            $show_inter->execute();
            $exibe_inter = $show_inter->fetch(PDO::FETCH_ASSOC);
            $last_inter_data = isset($exibe_inter["inter_data"]) ? $exibe_inter["inter_data"] : '';
            $end_date = new DateTime($time_now);
            $start_date = new DateTime("$last_inter_data");
            $interval = $start_date->diff($end_date);
            $hours   = $interval->format('%h');
            $minutes = $interval->format('%i');
            $time_last_inter = $hours * 60 + $minutes;
          ?>

            <tr>
              <th class="align-middle">
                #<?php echo str_pad($atd, 5, '0', STR_PAD_LEFT); ?>
                <!-- <button type="button" class="btn btn-outline-light btn-sm" data-container="body" data-toggle="popover" data-trigger="focus" data-placement="right" data-content=""><i class="fas fa-comment-alt text-warning"></i></button> -->
                <!-- echo $atd_desc_abertura; -->
                <?php if ($atd_reincidente == 1) { ?>
                  <i class="fas fa-exclamation-triangle text-danger" title="Reincidente"></i>
                <?php } ?>
              </th>

              <td class="align-middle">
                <strong><?php echo substr($clt_nomer, 0, 35); ?></strong>
                <?php if ($pessoa_nom != "") { ?> <br> <i class="far fa-user mr-1"></i> <?php echo $pessoa_nom;
                                                                                      } ?>
              </td>

              <td class="align-middle text-left" style="width: 25%">
                <?php $data = date('d/m/y', strtotime($atd_hora_abertura));
                $hora = date('H:i', strtotime($atd_hora_abertura)); ?>
                <?php echo $data . " às " . $hora . "h"; ?> <br> <?php echo $atd_desc_abertura; ?>
              </td>

              <td class="align-middle text-left">
                <?php if ($atd_tipo == 0) { ?> Não Informado<?php } ?>
                  <?php if ($atd_tipo == 1) { ?> Falha<?php } ?>
                    <?php if ($atd_tipo == 2) { ?> Relacionamento<?php } ?>
                      <?php if ($atd_tipo == 3) { ?> Requisição de Serviços<?php } ?>
                        <?php if ($atd_tipo == 4) { ?> Requisição de Informação<?php } ?>
                          <?php if ($atd_tipo == 6) { ?> Melhoria<?php } ?>
              </td>


              <td class="align-middle text-center">
                <?php echo $cat_nome; ?> <br /> <?php echo $scat_nome; ?> <br /> <?php echo $itens_nome; ?>

              </td>

              <th class="align-middle text-center">
                <?php if ($atd_nivel == 0) { ?> <span class="badge badge-danger"> NA </span> <?php } ?>
                <?php if ($atd_nivel == 1) { ?> <span class="badge badge-secondary">Nível 1</span> <?php } ?>
                <?php if ($atd_nivel == 2) { ?> <span class="badge badge-info">Nível 2</span> <?php } ?>
                <?php if ($atd_nivel == 3) { ?> <span class="badge badge-primary">Nível 3</span> <?php } ?>
                <?php if ($atd_nivel == 4) { ?> <span class="badge badge-primary">Rotina</span> <?php } ?>
                <?php if ($atd_nivel == 6) { ?> <span class="badge badge-primary">Tarefa</span> <?php } ?>
              </th>

              <th class="align-middle text-center">
                <?php if ($atd_prioridade == 0) { ?> <span class="badge badge-secondary">NA</span> <?php } ?>
                <?php if ($atd_prioridade == 1) { ?> <span class="badge badge-success">Baixa</span> <?php } ?>
                <?php if ($atd_prioridade == 2) { ?> <span class="badge badge-warning">Média</span> <?php } ?>
                <?php if ($atd_prioridade == 3) { ?> <span class="badge badge-alert" style="color: black; background-color:  #FF8C00;">Alta</span> <?php } ?>
                <?php if ($atd_prioridade == 4) { ?> <span class="badge badge-danger">Urgente</span> <?php } ?>
              </th>

              <!-- <th class="align-middle">
                        <?php if ($atd_forma == 1) { ?> <i class="fas fa-laptop-house text-primary" title="Remoto"></i> <?php } ?>
                        <?php if ($atd_forma == 2) { ?> <i class="fas fa-briefcase text-danger" title="Presencial"></i> <?php } ?>
                        <?php if ($atd_forma == 3) { ?> <i class="fas fa-laptop-house text-primary" title="Remoto - Plantão"></i> <?php } ?>
                        <?php if ($atd_forma == 4) { ?> <i class="fas fa-briefcase text-danger" title="Presencial - Plantão"></i> <?php } ?>
                    </th> -->

              <td class="align-middle text-center">
                <?php if ($atd_forma == 1) { ?> Remoto<?php } ?>
                  <?php if ($atd_forma == 2) { ?> Presencial <?php } ?>
                  <?php if ($atd_forma == 3) { ?> Remoto - Plantão <?php } ?>
                  <?php if ($atd_forma == 4) { ?> Presencial - Plantão<?php } ?>
              </td>

              <td class="align-middle">
                <?php if ($atd_status > 0) { ?>
                  <div class="progress <?php echo $progress_color; ?>">
                    <div class="progress-bar" style="width:<?php echo $progress_width; ?>%;">
                      <div class="progress-value"><?php echo $tag; ?></div>
                    </div>
                  </div>
                <?php } ?>
              </td>

              <!-- inicio da alteração modificando o sino na tela de atendimentos comemntando da linha 926 a 960 -->
              <!-- <td class="align-middle">
                      <?php //se atendimento aberto com mais de 40 minutos e menos de 80 min,sem interação, mostra sino piscando verde
                      if ($atd_status > 1 && $atd_status < 3 && $time_last_inter >= 0 && $time_last_inter < 20) { ?>
                        <i class="fas fa-bell fa-2x blinkkkk"></i>

                      <?php } ?>

                      <?php //se atendimento aberto com mais de 40 minutos e menos de 80 min,sem interação, mostra sino piscando verde
                      if ($atd_status == 1 && $time_last_inter >= 20) { ?>
                        <i class="fas fa-bell fa-2x blinkk"></i>
                      <?php } elseif ($atd_status == 1 && $time_last_inter < 20) { ?>
                        <i class="fas fa-bell fa-2x blinkkkk"></i>

                      <?php } ?>

                      <?php //se atendimento aberto com mais de 80 minutos e menos de 120 min,sem interação, mostra sino piscando amarelo
                      if ($atd_status > 1 && $atd_status < 3 && $time_last_inter >= 20 && $time_last_inter < 40) { ?>
                        <i class="fas fa-bell fa-2x blink"></i>

                      <?php } ?>

                      <?php //se atendimento aberto com mais de 120 minutos e menos de 160 min,sem interação, mostra sino piscando vermelho
                      if ($atd_status > 1 && $atd_status < 3 && $time_last_inter >= 40 && $time_last_inter < 60) { ?>
                        <i class="fas fa-bell fa-2x blinkkk"></i>

                      <?php } ?>

                      <?php //se atendimento aberto com mais de 160 minutos sem interação, mostra sino piscando preto
                      if ($atd_status > 1 && $atd_status < 3 && $time_last_inter >= 60) { ?>
                        <i class="fas fa-bell fa-2x blinkk"></i>

                      <?php } ?>

                      <?php echo $tecnico_nome; ?>
                    </td> -->
              <!-- codigo acima comentado para modificar o sino de sla -->

              <!-- Novo comportamento do sino do SLA ficando somente vermelho e preto para melhor legibilidade -->
              <td class="align-middle">
                <?php //se atendimento aberto com mais de 120 minutos e menos de 160 min,sem interação, mostra sino piscando vermelho
                if ($atd_status >= 1 && $atd_status < 3 && $time_last_inter >= 40 && $time_last_inter < 60) { ?>
                  <i class="fas fa-bell fa-2x blinkkk"></i>

                <?php } ?>

                <?php //se atendimento aberto com mais de 160 minutos sem interação, mostra sino piscando preto
                if ($atd_status >= 1 && $atd_status < 3 && $time_last_inter >= 60) { ?>
                  <i class="fas fa-bell fa-2x blinkk"></i>

                <?php } ?>

                <?php echo $tecnico_nome; ?>
              </td>

              <!-- fim da alteração do codigo para modificar o sino do SLA -->

              <td class="align-middle">
                <?php if ($atd_status == 0) { ?><i class="far fa-clock"></i> Agendado
                <?php } ?>
                <?php if ($atd_status == 1) { ?><i class="fas fa-hourglass-half"></i> Aguardando
                <?php } ?>
                <?php if ($atd_status == 2) { ?><i class="fas fa-magic"></i> Em Execução
                <?php } ?>
                <?php if ($atd_status == 3) { ?><i class="far fa-pause-circle"></i> Em Espera
                <?php } ?>
                <?php if ($atd_status == 5) { ?><i class="fas fa-check"></i> Concluído
                <?php } ?>
                <?php if ($atd_status == 4) { ?><i class="fas fa-check"></i> Finalizado
                <?php } ?>
              </td>

              <td class="align-middle p-1">
                <a href="atd.php?atd=<?php echo urlencode($atd); ?>" class="btn btn-light btn-sm p-1">
                  <i class="far fa-folder-open"></i>
                </a>
              </td>

            </tr>
          <?php } ?>
        </tbody>
      </table>
    </div>
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
          <p><strong>Os atendimentos são marcados com os seguintes status:</strong></p>
          <ul class="list">
            <li><i class="far fa-clock"></i> Agendado
              <ul>
                <li class="small">São atendimentos cadastrados com Data/Hora futura.</li>
                <li class="small">Eles podem ser listados na tela através das opçães do filtro.</li>
                <li class="small">Quando for a Data/Hora do agendamento o Atendimento terá seu status alterado automaticamente para <span class="badge badge-light"><i class="fas fa-hourglass-half"></i> Aguardando Execução</span>.</li>
              </ul>
            </li>

            <li class="pt-1"><i class="fas fa-hourglass-half"></i> Aguardando Execução
              <ul>
                <li class="small">São atendimentos que devem ser executados pelos tecnicos.</li>
                <li class="small">Cada atendimento tem um prazo para ser atendido.</li>
                <li class="small">Caso o atendimento fique por mais de 20 minutos sem uma interação, será exibido o seguinte alerta: <i class="fas fa-bell blink"></i>.</li>
                <li class="small">Quando um técnico iniciar o Atendimento, terá seu status alterado automaticamente para <span class="badge badge-light"><i class="fas fa-magic"></i> Em Execução</span>.</li>
              </ul>
            </li>

            <li class="pt-1"><i class="fas fa-magic"></i> Em Execução
              <ul>
                <li class="small">São atendimentos que estão sob responsabilidade de um técnico.</li>
                <li class="small">O técnico responsóvel tem autonomia para transferir, colocar em espera e finalizar o atendimento.</li>
              </ul>
            </li>

            <li class="pt-1"><i class="far fa-pause-circle"></i> Em Espera
              <ul>
                <li class="small">São atendimentos que estão aguardando uma resposta de alguém externo a Nível 3.</li>
                <li class="small">Durante o período de espera o prazo para atendimento é <em>pausado</em>.</li>
                <li class="small">Toda espera tem um prazo (Data/Hora).</li>
                <li class="small">Quando o prazo da espera vencer o Atendimento terá seu status alterado automaticamente para <span class="badge badge-light"><i class="fas fa-magic"></i> Em Execução</span>.</li>
              </ul>
            </li>

            <li class="pt-1"><i class="fas fa-check"></i> Finalizada
              <ul>
                <li class="small">São atendimentos concluídos.</li>
              </ul>
            </li>
          </ul>

          <p><strong>Os atendimentos serão classificados de forma automática como:</strong></p>
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

  <!-- Recorrentes -->
  <!-- <?php
        $pdo = ConnectionN3();
        $recor = $pdo->prepare("SELECT * FROM atendimentos WHERE recorrente = '2'");
        $recor->execute();
        $conta_recorrentes = $recor->rowCount();
        if ($conta_recorrentes > 0) {
          /* var_dump($conta_recorrentes); */
          while ($row = $recor->fetch(PDO::FETCH_ASSOC)) {
            $idR = $row["id"];
            $areaR = $row["area"];
            $clienteR = $row["cliente"];
            $pessoaR = $row["pessoa"];
            $localR = $row["local"];
            $tipoR = $row["tipo"];
            $categoriaR = $row["categoria"];
            $subcategoriaR = $row["subcategoria"];
            $itemR = $row["item"];
            $nivelR = $row["nivel"];
            $prioridadeR = $row["prioridade"];
            $formaR = $row["forma"];
            $desc_aberturaR = $row["desc_abertura"];
            $aberturaR = $row["abertura"];
            $tecnicoR = $row["tecnico"];
            $reincidenteR = $row["reincidente"];
            $statusR = 0;
            $recorrenteR = $row["recorrente"];
            $data_recorrenteR = $row["data_recorrencia"];
            $vezes_reabrirR = $row["vezes_reabrir"];
            $vezes = $row["vezes"];
            $semana_real = $row["semana"];
            $vezes = $vezes - 1;
            $dia = false;

            /*  $dataRRRRRR = new DateTime($data_recorrenteR);
        $dataRRRRRR = $dataRRRRRR->format("Y-m-d"); */
          }
          if ($aberturaR != $data_recorrenteR && $vezes != -1) {
            if ($vezes_reabrirR == 1) {
              $dataRR = new DateTime($data_recorrenteR);
              $dataRR->modify('+1 day');
              $dataRRR = $dataRR->format("Y-m-d H:i:s");
            //   $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `prioridade`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes, :prioridade);");
            //   $adc->bindParam(':cliente', $clienteR);
            //   $adc->bindParam(':pessoa', $pessoaR);
            //   $adc->bindParam(':local', $localR);
            //   $adc->bindParam(':tipo', $tipoR);
            //   $adc->bindParam(':categoria', $categoriaR);
            //   $adc->bindParam(':subcategoria', $subcategoriaR);
            //   $adc->bindParam(':item', $itemR);
            //   $adc->bindParam(':nivel', $nivelR);
            //   $adc->bindParam(':prioridade', $prioridadeR);
            //   $adc->bindParam(':forma', $formaR);
            //   $adc->bindParam(':desc_abertura', $desc_aberturaR);
            //   $adc->bindParam(':abertura', $data_recorrenteR);
            //   $adc->bindParam(':tecnico', $tecnicoR);
            //   $adc->bindParam(':recorrente', $recorrenteR);
            //   $adc->bindParam(':data_recorrente', $dataRRR);
            //   $adc->bindParam(':reincidente', $reincidenteR);
            //   $adc->bindParam(':status', $statusR);
            //   $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
            //   $adc->bindParam(':vezes', $vezes);
            //   $adc->execute();
            }
            //TODO MES
            elseif ($vezes_reabrirR == 2) {
              $dataRR = new DateTime($data_recorrenteR);
              $dataRR->modify('+1 month');
              $dataRRR = $dataRR->format("Y-m-d H:i:s");
            //   $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`, `prioridade`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes,:prioridade);");
            //   $adc->bindParam(':cliente', $clienteR);
            //   $adc->bindParam(':pessoa', $pessoaR);
            //   $adc->bindParam(':local', $localR);
            //   $adc->bindParam(':tipo', $tipoR);
            //   $adc->bindParam(':categoria', $categoriaR);
            //   $adc->bindParam(':subcategoria', $subcategoriaR);
            //   $adc->bindParam(':item', $itemR);
            //   $adc->bindParam(':nivel', $nivelR);
            //   $adc->bindParam(':prioridade', $prioridadeR);
            //   $adc->bindParam(':forma', $formaR);
            //   $adc->bindParam(':desc_abertura', $desc_aberturaR);
            //   $adc->bindParam(':abertura', $data_recorrenteR);
            //   $adc->bindParam(':tecnico', $tecnicoR);
            //   $adc->bindParam(':recorrente', $recorrenteR);
            //   $adc->bindParam(':data_recorrente', $dataRRR);
            //   $adc->bindParam(':reincidente', $reincidenteR);
            //   $adc->bindParam(':status', $statusR);
            //   $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
            //   $adc->bindParam(':vezes', $vezes);
            //   $adc->execute();
            } //3 EM 3 MESES
            elseif ($vezes_reabrirR == 3) {
              $dataRR = new DateTime($data_recorrenteR);
              $dataRR->modify('+3 month');
              $dataRRR = $dataRR->format("Y-m-d H:i:s");
            //   $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`, `prioridade`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes, :prioridade);");
            //   $adc->bindParam(':cliente', $clienteR);
            //   $adc->bindParam(':pessoa', $pessoaR);
            //   $adc->bindParam(':local', $localR);
            //   $adc->bindParam(':tipo', $tipoR);
            //   $adc->bindParam(':categoria', $categoriaR);
            //   $adc->bindParam(':subcategoria', $subcategoriaR);
            //   $adc->bindParam(':item', $itemR);
            //   $adc->bindParam(':nivel', $nivelR);
            //   $adc->bindParam(':prioridade', $prioridadeR);
            //   $adc->bindParam(':forma', $formaR);
            //   $adc->bindParam(':desc_abertura', $desc_aberturaR);
            //   $adc->bindParam(':abertura', $data_recorrenteR);
            //   $adc->bindParam(':tecnico', $tecnicoR);
            //   $adc->bindParam(':recorrente', $recorrenteR);
            //   $adc->bindParam(':data_recorrente', $dataRRR);
            //   $adc->bindParam(':reincidente', $reincidenteR);
            //   $adc->bindParam(':status', $statusR);
            //   $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
            //   $adc->bindParam(':vezes', $vezes);
            //   $adc->execute();
            } //6 EM 6 MESES
            elseif ($vezes_reabrirR == 4) {
              $dataRR = new DateTime($data_recorrenteR);
              $dataRR->modify('+6 month');
              $dataRRR = $dataRR->format("Y-m-d H:i:s");
            //   $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`, `prioridade`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes, :prioridade);");
            //   $adc->bindParam(':cliente', $clienteR);
            //   $adc->bindParam(':pessoa', $pessoaR);
            //   $adc->bindParam(':local', $localR);
            //   $adc->bindParam(':tipo', $tipoR);
            //   $adc->bindParam(':categoria', $categoriaR);
            //   $adc->bindParam(':subcategoria', $subcategoriaR);
            //   $adc->bindParam(':item', $itemR);
            //   $adc->bindParam(':nivel', $nivelR);
            //   $adc->bindParam(':prioridade', $prioridadeR);
            //   $adc->bindParam(':forma', $formaR);
            //   $adc->bindParam(':desc_abertura', $desc_aberturaR);
            //   $adc->bindParam(':abertura', $data_recorrenteR);
            //   $adc->bindParam(':tecnico', $tecnicoR);
            //   $adc->bindParam(':recorrente', $recorrenteR);
            //   $adc->bindParam(':data_recorrente', $dataRRR);
            //   $adc->bindParam(':reincidente', $reincidenteR);
            //   $adc->bindParam(':status', $statusR);
            //   $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
            //   $adc->bindParam(':vezes', $vezes);
            //   $adc->execute();
            } //12 EM 12 MESES
            elseif ($vezes_reabrirR == 5) {
              $dataRR = new DateTime($data_recorrenteR);
              $dataRR->modify('+12 month');
              $dataRRR = $dataRR->format("Y-m-d H:i:s");
            //   $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`, `prioridade`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes, :prioridade);");
            //   $adc->bindParam(':cliente', $clienteR);
            //   $adc->bindParam(':pessoa', $pessoaR);
            //   $adc->bindParam(':local', $localR);
            //   $adc->bindParam(':tipo', $tipoR);
            //   $adc->bindParam(':categoria', $categoriaR);
            //   $adc->bindParam(':subcategoria', $subcategoriaR);
            //   $adc->bindParam(':item', $itemR);
            //   $adc->bindParam(':nivel', $nivelR);
            //   $adc->bindParam(':prioridade', $prioridadeR);
            //   $adc->bindParam(':forma', $formaR);
            //   $adc->bindParam(':desc_abertura', $desc_aberturaR);
            //   $adc->bindParam(':abertura', $data_recorrenteR);
            //   $adc->bindParam(':tecnico', $tecnicoR);
            //   $adc->bindParam(':recorrente', $recorrenteR);
            //   $adc->bindParam(':data_recorrente', $dataRRR);
            //   $adc->bindParam(':reincidente', $reincidenteR);
            //   $adc->bindParam(':status', $statusR);
            //   $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
            //   $adc->bindParam(':vezes', $vezes);
            //   $adc->execute();
            } elseif ($vezes_reabrirR == 6) {
              $dataRR = new DateTime($data_recorrenteR);
              $dataRR->modify('+1 week');
              $dataRRR = $dataRR->format("Y-m-d H:i:s");
            //   $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`, `prioridade`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes, :prioridade);");
            //   $adc->bindParam(':cliente', $clienteR);
            //   $adc->bindParam(':pessoa', $pessoaR);
            //   $adc->bindParam(':local', $localR);
            //   $adc->bindParam(':tipo', $tipoR);
            //   $adc->bindParam(':categoria', $categoriaR);
            //   $adc->bindParam(':subcategoria', $subcategoriaR);
            //   $adc->bindParam(':item', $itemR);
            //   $adc->bindParam(':nivel', $nivelR);
            //   $adc->bindParam(':prioridade', $prioridadeR);
            //   $adc->bindParam(':forma', $formaR);
            //   $adc->bindParam(':desc_abertura', $desc_aberturaR);
            //   $adc->bindParam(':abertura', $data_recorrenteR);
            //   $adc->bindParam(':tecnico', $tecnicoR);
            //   $adc->bindParam(':recorrente', $recorrenteR);
            //   $adc->bindParam(':data_recorrente', $dataRRR);
            //   $adc->bindParam(':reincidente', $reincidenteR);
            //   $adc->bindParam(':status', $statusR);
            //   $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
            //   $adc->bindParam(':vezes', $vezes);
            //   $adc->execute();
            } elseif ($vezes_reabrirR == 7) {
              $dataRR = new DateTime($data_recorrenteR);
              $data_dia_original = date_format($dataRR, 'w');
              $data_mes_real = date_format($dataRR, 'm');
              $data_ano_real = date_format($dataRR, 'y');
              $data_dia_real = date_format($dataRR, 'd');
              $dataRR->modify('+1 month');
              $data_mes_2 = date_format($dataRR, 'm');
              $data_ano_2 = date_format($dataRR, 'y');
              $data_dia_2 = date_format($dataRR, 'd');
              $dataRRR = $dataRR->format("Y-m-d H:i:s");
              $dia_mes_2 = date_format(date_create($dataRRR), 'd');
              $semana_mes_2 = ceil($dia_mes_2 / 7);
              $data_dia = date_format($dataRR, 'w');

              if ($semana_real == 0) {
                $dia_referencia = $data_dia_real;
                $mes = $data_mes_real;
                $ano = $data_ano_real;
                $referencia = new DateTime("$ano-$mes-$dia_referencia");
                $ultimo_dia_mes = $referencia->format('t');
                $ultima_semana = ceil($ultimo_dia_mes / 7);
                $dia_referencia_2 = $data_dia_2;
                $mes_2 = $data_mes_2;
                $ano_2 = $data_ano_2;
                $referencia_2 = new DateTime("$ano_2-$mes_2-$dia_referencia_2");
                $ultimo_dia_mes_2 = $referencia->format('t');
                $ultima_semana_2 = ceil($ultimo_dia_mes_2 / 7);

                if ($ultima_semana == $ultima_semana_2) {
                  echo "ultima semana";
                  while ($dia == false) {
                    if ($data_dia_original < $data_dia) {
                      $dataRR->modify('-1 day');
                      $data_mes_2 = date_format($dataRR, 'm');
                      $dataRRR = $dataRR->format("Y-m-d H:i:s");
                      $data_dia = date_format($dataRR, 'w');
                      $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                      $semana_mes_2 = ceil($dia_mes_2 / 7);
                    } elseif ($data_dia_original > $data_dia) {
                      $dataRR->modify('+1 day');
                      $data_mes_2 = date_format($dataRR, 'm');
                      $dataRRR = $dataRR->format("Y-m-d H:i:s");
                      $data_dia = date_format($dataRR, 'w');
                      $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                      $semana_mes_2 = ceil($dia_mes_2 / 7);
                    } elseif ($data_dia_original == $data_dia && $semana_mes_2 < 4) {
                      $dataRR->modify('-1 week');
                      $dataRRR = $dataRR->format("Y-m-d H:i:s");
                      $data_dia = date_format($dataRR, 'w');
                      $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                      $semana_mes_2 = ceil($dia_mes_2 / 7);
                      $dia = true;
                    } elseif ($data_dia_original == $data_dia && $semana_mes_2 > 4) {
                      $dataRR->modify('+1 week');
                      $dataRRR = $dataRR->format("Y-m-d H:i:s");
                      $data_dia = date_format($dataRR, 'w');
                      $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                      $semana_mes_2 = ceil($dia_mes_2 / 7);
                      $dia = true;
                    } else {
                      $dia = true;
                    }
                  }
                }
              }


              if ($semana_real == $semana_mes_2) {
                while ($dia == false) {
                  if ($data_dia_original < $data_dia) {
                    $dataRR->modify('-1 day');
                    $data_mes_2 = date_format($dataRR, 'm');
                    $dataRRR = $dataRR->format("Y-m-d H:i:s");
                    $data_dia = date_format($dataRR, 'w');
                    $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                    $semana_mes_2 = ceil($dia_mes_2 / 7);
                    if ($data_mes_real == $data_mes_2) {
                      $dataRR->modify('+1 week');
                      $dataRRR = $dataRR->format("Y-m-d H:i:s");
                    }
                  } elseif ($data_dia_original > $data_dia) {
                    $dataRR->modify('+1 day');
                    $dataRRR = $dataRR->format("Y-m-d H:i:s");
                    $data_dia = date_format($dataRR, 'w');
                    $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                    $semana_mes_2 = ceil($dia_mes_2 / 7);
                  } elseif ($data_dia_original == $data_dia && $semana_real > $semana_mes_2) {
                    $dataRR->modify('+1 week');
                    $dataRRR = $dataRR->format("Y-m-d H:i:s");
                    $data_dia = date_format($dataRR, 'w');
                    $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                    $semana_mes_2 = ceil($dia_mes_2 / 7);
                    $dia = true;
                  } else {
                    $dia = true;
                  }
                }
              }


              if ($semana_real > $semana_mes_2) {
                while ($dia == false) {
                  if ($data_dia_original < $data_dia) {
                    $dataRR->modify('-1 day');
                    $dataRRR = $dataRR->format("Y-m-d H:i:s");
                    $data_dia = date_format($dataRR, 'w');
                    $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                    $semana_mes_2 = ceil($dia_mes_2 / 7);
                  } elseif ($data_dia_original > $data_dia) {
                    $dataRR->modify('+1 day');
                    $dataRRR = $dataRR->format("Y-m-d H:i:s");
                    $data_dia = date_format($dataRR, 'w');
                    $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                    $semana_mes_2 = ceil($dia_mes_2 / 7);
                  } elseif ($data_dia_original == $data_dia) {
                    $dataRR->modify('+1 week');
                    $dataRRR = $dataRR->format("Y-m-d H:i:s");
                    $data_dia = date_format($dataRR, 'w');
                    $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                    $semana_mes_2 = ceil($dia_mes_2 / 7);
                    $dia = true;
                  } else {
                    $dia = true;
                  }
                }
              }


              if ($semana_real < $semana_mes_2) {
                while ($dia == false) {
                  if ($data_dia_original < $data_dia) {
                    $dataRR->modify('-1 day');
                    $dataRRR = $dataRR->format("Y-m-d H:i:s");
                    $data_dia = date_format($dataRR, 'w');
                    $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                    $semana_mes_2 = ceil($dia_mes_2 / 7);
                  } elseif ($data_dia_original > $data_dia) {
                    $dataRR->modify('+1 day');
                    $dataRRR = $dataRR->format("Y-m-d H:i:s");
                    $data_dia = date_format($dataRR, 'w');
                    $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                    $semana_mes_2 = ceil($dia_mes_2 / 7);
                  } elseif ($data_dia_original == $data_dia) {
                    $dataRR->modify('-1 week');
                    $dataRRR = $dataRR->format("Y-m-d H:i:s");
                    $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                    $semana_mes_2 = ceil($dia_mes_2 / 7);
                    $dia = true;
                  } else {
                    $dia = true;
                  }
                }
              }

              $data_mes_real = date_format($dataRR, 'm');
              if ($dia) {
                // $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`,`semana`, `prioridade`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes,:semana, :prioridade);");
                // $adc->bindParam(':cliente', $clienteR);
                // $adc->bindParam(':pessoa', $pessoaR);
                // $adc->bindParam(':local', $localR);
                // $adc->bindParam(':tipo', $tipoR);
                // $adc->bindParam(':categoria', $categoriaR);
                // $adc->bindParam(':subcategoria', $subcategoriaR);
                // $adc->bindParam(':item', $itemR);
                // $adc->bindParam(':nivel', $nivelR);
                // $adc->bindParam(':prioridade', $prioridadeR);
                // $adc->bindParam(':forma', $formaR);
                // $adc->bindParam(':desc_abertura', $desc_aberturaR);
                // $adc->bindParam(':abertura', $data_recorrenteR);
                // $adc->bindParam(':tecnico', $tecnicoR);
                // $adc->bindParam(':recorrente', $recorrenteR);
                // $adc->bindParam(':data_recorrente', $dataRRR);
                // $adc->bindParam(':reincidente', $reincidenteR);
                // $adc->bindParam(':status', $statusR);
                // $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
                // $adc->bindParam(':vezes', $vezes);
                // $adc->bindParam(':semana', $semana_real);
                // $adc->execute();
              }
            }
          }
        }
        ?> -->

  <?php include_once("../all/update_pass.php"); ?>

  <!-- <script src="../js/bootstrap.min.js"></script> -->
  <script src="../js/jquery-3.6.0.min.js"></script>
  <script src="../js/bootstrap.bundle.min.js"></script>
  <script src="../js/bootstrap-select.min.js"></script>

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

  <!-- controle de checkbox tipo Atd-->
  <script>
    function toggleAllTipos() {
      const selectAllCheckbox = document.getElementById('select-all-tipo');
      const checkboxes = document.querySelectorAll('.tipo-checkbox');
      checkboxes.forEach((checkbox) => {
        checkbox.checked = selectAllCheckbox.checked;
      });
    }
  </script>


  <script>
    function toggleAllTecnicos() {
      const selectAllCheckbox = document.getElementById('select-all-tecnicos');
      const checkboxes = document.querySelectorAll('.tec-checkbox');
      checkboxes.forEach((checkbox) => {
        checkbox.checked = selectAllCheckbox.checked;
      });
    }
  </script>

  <script>
    window.addEventListener("pageshow", function(event) {
      if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        // Se a página foi carregada via bfcache (navegador), forçar reload
        window.location.reload();
      }
    });
  </script>

  <script>
    const reloadInterval = 60000; // 60 segundos
    const toggleIcon = document.getElementById('autoReloadToggle');
    let reloadTimer = null;

    // Ativar por padrão se não estiver definido no localStorage
    if (localStorage.getItem('autoReload') === null) {
      localStorage.setItem('autoReload', 'true');
    }

    let autoReload = localStorage.getItem('autoReload') === 'true';

    function updateIconVisual() {
      if (autoReload) {
        toggleIcon.classList.add('fa-spin', 'text-primary');
        toggleIcon.classList.remove('text-secondary');
        toggleIcon.title = "Auto-reload ativado (clique para desativar)";
      } else {
        toggleIcon.classList.remove('fa-spin', 'text-primary');
        toggleIcon.classList.add('text-secondary');
        toggleIcon.title = "Auto-reload desativado (clique para ativar)";
      }
    }

    function startAutoReload() {
      // Evita múltiplos timers
      clearInterval(reloadTimer);
      reloadTimer = setInterval(() => {
        if (autoReload) {
          location.reload();
        }
      }, reloadInterval);
    }

    updateIconVisual();

    if (autoReload) {
      startAutoReload();
    }

    toggleIcon.addEventListener('click', () => {
      autoReload = !autoReload;
      localStorage.setItem('autoReload', autoReload);
      updateIconVisual();

      if (autoReload) {
        startAutoReload(); // inicia ciclo de reload
      } else {
        clearInterval(reloadTimer); // para o ciclo
      }
    });
  </script>




</body>

</html>