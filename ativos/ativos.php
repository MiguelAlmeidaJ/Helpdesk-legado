<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../ativos/ativos_conect.php");



if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id'], $_POST['status_envio'])) {
  $id_ativo = $_POST['id'];
  $new_status = $_POST['status_envio'];

  // Conexão com o banco de dados
  $pdoAtivos = ConnectionPluginsApp();
  if (!$pdoAtivos) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Erro na conexão com o banco de dados']);
    exit;
  }

  if (in_array($new_status, ['0', '1'], true)) {
    try {
      $query = "UPDATE comando_ativos SET comando_enviar = :status_envio WHERE id_ativo = :id_ativo";
      $stmt = $pdoAtivos->prepare($query);
      $stmt->execute([':status_envio' => $new_status, ':id_ativo' => $id_ativo]);

      header('Content-Type: application/json');
      echo json_encode(['status' => 'success', 'new_status' => $new_status]);
    } catch (PDOException $e) {
      header('Content-Type: application/json');
      echo json_encode(['status' => 'error', 'message' => 'Erro ao atualizar o status']);
    }
  } else {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Status inválido']);
  }
  exit;
}




// Estabelece a conexão com o banco de dados
$pdo = ConnectionN3();
if (!$pdo) {
  exit("Erro ao conectar ao banco de dados.");
}

// Estabelece a conexão com o banco de dados plugins_app
$pdoAtivos = ConnectionPluginsApp();
if (!$pdoAtivos) {
  exit("Erro ao conectar ao banco de dados plugins_app.");
}

$filters = ['id', 'hora_coleta', 'empresa', 'nome_computador', 'sistema_operacional', 'armazenamento_disco_total', 'status_envio', 'armazenamento_disco_uso', 'armazenamento_disco_livre', 'armazenamento_porcentagem_uso', 'endereco_mac'];

foreach ($filters as $filter) {
  $$filter = $_POST[$filter] ?? ($_GET[$filter] ?? '');
}


// Definir parâmetros de paginação
$limit = isset($_POST['limit']) ? intval($_POST['limit']) : (isset($_GET['limit']) ? intval($_GET['limit']) : 25);
$page = isset($_GET['page']) ? intval($_GET['page']) : 1;
$empresa = isset($_GET['empresa']) ? $_GET['empresa'] : '';


// echo "<script>console.log('Empresa: " . json_encode($empresa) . "');</script>";



// Lógica de Ordenação
$ord = $_POST['ord'] ?? ($_GET['ord'] ?? 'id');
$order_dir = strtoupper($_POST['order_dir'] ?? ($_GET['order_dir'] ?? 'ASC'));

$validColumns = ['id', 'hora_da_coleta', 'empresa', 'nome_computador', 'sistema_operacional',  'armazenamento_disco_total', 'status_envio', 'armazenamento_disco_uso', 'armazenamento_disco_livre', 'armazenamento_porcentagem_uso', 'endereco_mac'];
if (!in_array($ord, $validColumns)) {
  $ord = 'id';
}

$order_by = "$ord $order_dir";

switch ($ord) {
  case "armazenamento_disco_total":
    $order_by = "CAST(REGEXP_REPLACE(armazenamento_disco_total, '[^0-9.]', '') AS DECIMAL(10,2)) $order_dir";
    break;
  case "armazenamento_disco_uso":
    $order_by = "CAST(REGEXP_REPLACE(armazenamento_disco_uso, '[^0-9.]', '') AS DECIMAL(10,2)) $order_dir";
    break;
  case "armazenamento_disco_livre":
    $order_by = "CAST(REGEXP_REPLACE(armazenamento_disco_livre, '[^0-9.]', '') AS DECIMAL(10,2)) $order_dir";
    break;
  case "armazenamento_porcentagem_uso":
    $order_by = "CAST(REPLACE(armazenamento_porcentagem_uso, '%', '') AS DECIMAL(10,2)) $order_dir";
    break;
  case "status_envio":
    $order_by = "status_envio $order_dir";
    break;
  case "hora_da_coleta":
    $order_by = "STR_TO_DATE(hora_da_coleta, '%d/%m/%Y %H:%i:%s') $order_dir";
    break;
  default:
    $order_by = "$ord $order_dir";
    break;
}


$filterEmpresas = '';

if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
  // Prepare os IDs para a consulta
  $ids = implode(',', array_map('intval', $_SESSION['empresas'])); // Garantimos que são inteiros

  // Consulta para buscar os nomes das empresas com base nos IDs
  $sql = "SELECT clt_nomef FROM clientes WHERE clt_id IN ($ids)";
  try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $result = $stmt->fetchAll(PDO::FETCH_COLUMN); // Apenas os nomes das empresas

    if ($result) {
      // Adicionar os nomes no filtro com '%' para busca parcial
      $nomesEmpresas = array_map(function ($nome) {
        return "%" . addslashes($nome) . "%"; // Escapa caracteres e adiciona '%'
      }, $result);

      // Constrói o filtro para SQL
      $filterEmpresas .= " AND (" . implode(" OR ", array_map(function ($nome) {
        return "empresa LIKE '$nome'";
      }, $nomesEmpresas)) . ")";
    }
  } catch (PDOException $e) {
    die("Erro ao buscar nomes das empresas: " . $e->getMessage());
  }
}


// Construção da consulta SQL com os filtros
$baseQuery = "
    SELECT 
        ativos.*, 
        comando_ativos.comando_enviar AS status_envio
    FROM 
        ativos
    LEFT JOIN 
        comando_ativos 
    ON 
        ativos.id = comando_ativos.id_ativo
    WHERE 1=1   $filterEmpresas
";


// echo "<script>console.log('Base Query: " . $baseQuery . "');</script>";

$bindings = [];



if (!empty($id)) {
  $baseQuery .= " AND id = :id";
  $bindings[':id'] = $id;
}

if (!empty($hora_coleta)) {
  $baseQuery .= " AND hora_da_coleta = :hora_coleta";
  $bindings[':hora_coleta'] = $hora_coleta;
}

if (!empty($_POST['empresa'])) {
  $empresa = $_POST['empresa'];
  // echo "<script>console.log('empresa empty: " . json_encode($empresa) . "');</script>";
  $baseQuery .= " AND LOWER(empresa) LIKE LOWER(:empresa)";
  $bindings[':empresa'] = "%$empresa%"; // Inclui como busca parcial
}


if (!empty($nome_computador)) {
  $baseQuery .= " AND LOWER(nome_computador) LIKE LOWER(:nome_computador)";
  $bindings[':nome_computador'] = "%$nome_computador%";
}

if (!empty($sistema_operacional)) {
  $baseQuery .= " AND sistema_operacional = :sistema_operacional";
  $bindings[':sistema_operacional'] = $sistema_operacional;
}

if (!empty($endereco_mac)) {
  $baseQuery .= " AND LOWER(endereco_mac) LIKE LOWER(:endereco_mac)";
  $bindings[':endereco_mac'] = "%$endereco_mac%";
}


// Calculate total records and pages
$countQuery = "SELECT COUNT(*) FROM (" . $baseQuery . ") as filtered";

$countStmt = $pdoAtivos->prepare($countQuery);
if (!$countStmt) {
  exit("Erro na preparação da consulta de contagem de ativos: " . $pdoAtivos->errorInfo()[2]);
}

foreach ($bindings as $param => $value) {
  $countStmt->bindValue($param, $value);
}

if (!$countStmt->execute()) {
  exit("Erro na execução da consulta de contagem de ativos: " . $countStmt->errorInfo()[2]);
}

$totalRecords = $countStmt->fetchColumn();
// $totalPages = ceil($totalRecords / $limit);
$totalPages = ($limit > 0) ? ceil($totalRecords / $limit) : 1;

// Verifica e corrige o número da página
if ($page > $totalPages && $totalPages > 0) {
  $page = $totalPages;
} elseif ($page < 1) {
  $page = 1;
}
$offset = ($page - 1) * $limit;

// // Recalcula o offset ao mudar de critério de ordenação
// if (!empty($_GET['last_id']) && $ord !== 'id') {
//   $lastId = intval($_GET['last_id']);
//   $queryToFindPosition = $pdoAtivos->prepare("
//       SELECT COUNT(*) AS position
//       FROM ativos
//       WHERE $ord <= (SELECT $ord FROM ativos WHERE id = :id)
//   ");
//   $queryToFindPosition->bindValue(':id', $lastId, PDO::PARAM_INT);
//   $queryToFindPosition->execute();
//   $position = $queryToFindPosition->fetchColumn();

//   if ($position !== false) {
//     $offset = max(0, $position - 1);
//     $page = floor($offset / $limit) + 1;
//   }
// }

// // Prepare and execute the data query with pagination
// $queryPaginated = $baseQuery . " ORDER BY $order_by LIMIT :limit OFFSET :offset";
// $stmtPaginated = $pdoAtivos->prepare($queryPaginated);
// if (!$stmtPaginated) {
//   exit("Erro na preparação da consulta paginada de ativos: " . $pdoAtivos->errorInfo()[2]);
// }

// foreach ($bindings as $param => $value) {
//   $stmtPaginated->bindValue($param, $value);
// }

// $stmtPaginated->bindValue(':limit', $limit, PDO::PARAM_INT);
// $stmtPaginated->bindValue(':offset', $offset, PDO::PARAM_INT);

// if (!$stmtPaginated->execute()) {
//   exit("Erro na execução da consulta paginada de ativos: " . $stmtPaginated->errorInfo()[2]);
// }

// $ativos = $stmtPaginated->fetchAll(PDO::FETCH_ASSOC);
// $qtPaginated = count($ativos);

// $lastIdOnPage = end($ativos)['id'] ?? null; // ID do último ativo na página atual
// $firstIdOnPage = reset($ativos)['id'] ?? null; // ID do primeiro ativo na página atual

// Recalcula o offset ao mudar de critério de ordenação e inclui filtros adicionais
if (!empty($_GET['last_id']) && $ord !== 'id') {
  $lastId = intval($_GET['last_id']);

  // Base da consulta para determinar a posição com filtros adicionais
  $queryToFindPosition = $pdoAtivos->prepare("
      SELECT COUNT(*) AS position
      FROM ativos
      WHERE $ord <= (SELECT $ord FROM ativos WHERE id = :id)
      " . (!empty($empresa) ? " AND LOWER(empresa) LIKE LOWER(:empresa)" : "") . "
      " . (!empty($nome_computador) ? " AND LOWER(nome_computador) LIKE LOWER(:nome_computador)" : "") . "
      " . (!empty($endereco_mac) ? " AND LOWER(endereco_mac) LIKE LOWER(:endereco_mac)" : "") . "
  ");

  $queryToFindPosition->bindValue(':id', $lastId, PDO::PARAM_INT);

  if (!empty($empresa)) {
    $queryToFindPosition->bindValue(':empresa', "%$empresa%", PDO::PARAM_STR);
  }
  if (!empty($nome_computador)) {
    $queryToFindPosition->bindValue(':nome_computador', "%$nome_computador%", PDO::PARAM_STR);
  }
  if (!empty($endereco_mac)) {
    $queryToFindPosition->bindValue(':endereco_mac', "%$endereco_mac%", PDO::PARAM_STR);
  }

  $queryToFindPosition->execute();
  $position = $queryToFindPosition->fetchColumn();

  if ($position !== false) {
    $offset = max(0, $position - 1);
    $page = floor($offset / $limit) + 1;
  }
}

// Prepare and execute the data query with pagination
$queryPaginated = $baseQuery . " ORDER BY $order_by LIMIT :limit OFFSET :offset";
$stmtPaginated = $pdoAtivos->prepare($queryPaginated);

if (!$stmtPaginated) {
  exit("Erro na preparação da consulta paginada de ativos: " . $pdoAtivos->errorInfo()[2]);
}

foreach ($bindings as $param => $value) {
  $stmtPaginated->bindValue($param, $value);
}

$stmtPaginated->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmtPaginated->bindValue(':offset', $offset, PDO::PARAM_INT);

if (!$stmtPaginated->execute()) {
  exit("Erro na execução da consulta paginada de ativos: " . $stmtPaginated->errorInfo()[2]);
}

$ativos = $stmtPaginated->fetchAll(PDO::FETCH_ASSOC);
$qtPaginated = count($ativos);

$lastIdOnPage = end($ativos)['id'] ?? null; // ID do último ativo na página atual
$firstIdOnPage = reset($ativos)['id'] ?? null; // ID do primeiro ativo na página atual

// Função para construir a URL de paginação com os filtros aplicados
function buildPaginationUrl($page, $lastId = null)
{
  $params = [
    'page' => $page,
    'id' => $_POST['id'] ?? ($_GET['id'] ?? ''),
    'empresa' => $_POST['empresa'] ?? ($_GET['empresa'] ?? ''),
    'nome_computador' => $_POST['nome_computador'] ?? ($_GET['nome_computador'] ?? ''),
    'endereco_mac' => $_POST['endereco_mac'] ?? ($_GET['endereco_mac'] ?? ''),
    'ord' => $_POST['ord'] ?? ($_GET['ord'] ?? 'id'), // Ordenação
    'order_dir' => $_POST['order_dir'] ?? ($_GET['order_dir'] ?? 'ASC'), // Direção
    'limit' => $_POST['limit'] ?? ($_GET['limit'] ?? 25),
    'last_id' => $lastId // Adiciona o último ID como parâmetro
  ];
  return '?' . http_build_query($params);
}

?>

<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=0.9, shrink-to-fit=no">
  <link rel="icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../css/help.css">
  <link rel="stylesheet" href="../css/bootstrap.min.css">
  <link rel="stylesheet" href="../fontawesome/css/all.css">
  <link rel="stylesheet" href="../css/bootstrap-select.min.css">
  <link rel="stylesheet" href="../css/timeline.css">
  <link rel="stylesheet" href="../css/bootstrap-datetimepicker.min.css">
  <title>Allterus</title>
  <!-- CSS do Bootstrap -->
  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
  <style>
    body {
      zoom: 0.9;
      /* Escala o conteúdo sem alterar o contexto de layout */
      width: 100%;
      /* Mantém o layout responsivo */
      overflow-x: hidden;
      /* Garante que não haja rolagem horizontal */
    }

    .table thead th {
      vertical-align: top;
      max-width: 200px;
      /* Defina a largura máxima da célula */
      white-space: nowrap;
      /* Evita quebra de linha nos cabeçalhos */
      word-wrap: break-word;
      /* Compatibilidade com navegadores mais antigos */
      text-align: center;
      /* Alinha o texto ao centro em todas as células da tabela */
    }

    .table td {
      text-align: center;
      /* Alinha o texto ao centro em todas as células da tabela */
    }

    .button-filtrar-limpar {
      width: 90px;
      margin-left: 1%;
    }

    .dropdown-menu .dropdown-visualizar {
      max-height: 600px !important;
      /* Define a altura maxima da caixa do menu suspenso */
      overflow-y: auto;
      /* Adiciona barra de rolagem vertical */
      position: absolute;
      /* Garante posicionamento baseado no botão */
      margin-left: 0 !important;
      /* Alinha a borda esquerda do menu com o botão */
      margin-right: 0 !important;
      /* Alinha a borda esquerda do menu com o botão */
      width: 100%;
      /* Faz com que o menu tenha a mesma largura do botão */
      font-size: 10px;
    }

    .form-check {
      font-size: 0.95rem;
      /* Tamanho da fonte dentro do menu suspenso*/
    }

    .dropdown-visualizar:after {
      display: none;
      /* Remove a setinha */
    }

    .dropdown-toggle-coluna {
      position: relative;
      /* Define o botão como referência para posicionar o menu */
      width: 180px;
      /* Ajusta a largura do botão controle de colunas para coincidir com o tamamnho do menu suspenso */
    }

    .navbar-nav {
      padding: 0;
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

    @media screen and (max-width: 768px) {
      .card-header {
        padding: 6px;
        flex-direction: column;
        align-items: flex-start;
      }

    }
  </style>
</head>

<body>

  <?php include("../all/sidebar.php"); ?>

  <div class="container-fluid">
    <div class="row">
      <div class="col-md-12 mt-1" style="padding-left: 4px; padding-right: 4px;">

        <div class="card" style="width: 100%; overflow-x: auto; overflow-y: hidden; min-height: 630px">
          <div class="card-header py-1">
            <form action="#" method="POST">
              <div class="form-row align-items-center">
                <div class="col-auto col-form-label-sm">

                  <?php
                  $pdo = ConnectionN3();
                  $filterEmpresas = null;

                  // Verifica se a sessão é do tipo 2 e ajusta o filtro de empresas
                  if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                    $filterEmpresas .= " AND clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
                  }

                  // Consulta para obter as empresas
                  $sql = "SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1'";
                  if ($filterEmpresas) {
                    $sql .= $filterEmpresas;
                  }
                  $sql .= " ORDER BY clientes.clt_nomef ASC";

                  try {
                    $show_clt = $pdo->prepare($sql);
                    $show_clt->execute();
                    $empresas = $show_clt->fetchAll(PDO::FETCH_ASSOC);
                  } catch (PDOException $e) {
                    die("Erro ao buscar empresas: " . $e->getMessage());
                  }

                  // Exibição do campo com base no tipo de sessão
                  if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2) :
                  ?>
                    <!-- Sessão tipo 2: dropdown preenchido com empresas -->

                  <?php else : ?>
                    <!-- Para session == 1, mantêm campo de texto livre -->
                    <label class="my-0">Empresa:</label>
                    <input type="text" id="filtro_empresa" name="empresa" class="form-control form-control-sm my-1" value="<?php echo htmlspecialchars($_POST['empresa'] ?? ''); ?>" tabindex="1">
                  <?php endif; ?>
                </div>

                <div class="col-auto col-form-label-sm">
                  <label class="my-0"> Nome do Computador:</label>
                  <input type="text" id="filtro_nome_computador" name="nome_computador" class="form-control form-control-sm my-1" value="<?php echo htmlspecialchars($nome_computador); ?>" tabindex="1">
                </div>

                <div class="col-auto col-form-label-sm">
                  <label class="my-0"> Endereço MAC:</label>
                  <input type="text" id="filtro_endereco_mac" name="endereco_mac" class="form-control form-control-sm my-1" value="<?php echo htmlspecialchars($endereco_mac); ?>" tabindex="1">
                </div>
                <div class="col-auto pt-3">
                  <button type="submit" class="btn btn-sm btn-outline-info button-filtrar-limpar my-0" tabindex="2">Filtrar</button>
                </div>
                <div class="col-auto pt-3">
                  <button type="button" class="btn btn-sm btn-outline-secondary button-filtrar-limpar my-0" onclick="limparFiltros()" tabindex="3">Limpar</button>
                </div>


                <!-- Novo seletor para o limite de registros por página -->
                <div class="col-auto col-form-label-sm">
                  <label class="my-0">Ativos por página:</label>
                  <select id="limit" name="limit" class="form-control form-control-sm my-1" onchange="this.form.submit()">
                    <option value="25" <?php echo ($limit == 25) ? 'selected' : ''; ?>>25</option>
                    <option value="5" <?php echo ($limit == 5) ? 'selected' : ''; ?>>5</option>
                    <option value="10" <?php echo ($limit == 10) ? 'selected' : ''; ?>>10</option>
                    <option value="20" <?php echo ($limit == 20) ? 'selected' : ''; ?>>20</option>
                    <option value="30" <?php echo ($limit == 30) ? 'selected' : ''; ?>>30</option>
                    <option value="50" <?php echo ($limit == 50) ? 'selected' : ''; ?>>50</option>
                    <option value="100" <?php echo ($limit == 100) ? 'selected' : ''; ?>>100</option>
                    <option value="200" <?php echo ($limit == 200) ? 'selected' : ''; ?>>500</option>
                  </select>
                </div>

                <!-- selector para selecionar o tipo de relatorio pdf, csv ou outros -->
                <div class="col-auto col-form-label-sm">
                  <label for="formato_relatorio" class="my-0">Formato:</label>
                  <select id="formato_relatorio" class="form-control form-control-sm  my-1" tabindex="4">
                    <!-- <option value="pdf">PDF</option> -->
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>

                <div class="col-auto pt-3">
                  <button type="button" class="btn btn-sm btn-outline-success my-0" style="margin-right: 1px" onclick="exportarRelatorio()" tabindex="5">Exportar Relatério</button>
                </div>

                <div class="col-auto pt-3">
                  <span class="btn btn-sm btn-outline-info my-0" style="margin-left: 1px">Nº Ativos = <?php echo $totalRecords; ?></span>
                </div>

                <!-- botao menu de controle de colunas -->
                <div class="col-auto dropdown pt-3" style="white-space: nowrap;">
                  <button class="btn btn-sm btn-outline-secondary dropdown-toggle-coluna" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    Controle Colunas </button>

                  <div class="dropdown-menu dropdown-visualizar p-2 dropdown-toggle" aria-labelledby="dropdownMenuButton" id="opcoes-visualizacao">
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" value="" id="toggle-all" checked>
                      <label class="form-check-label" for="toggle-all">Todos</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="id" id="toggle-id" data-column="id" checked>
                      <label class="form-check-label" for="toggle-id">ID</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="hora_coleta" id="toggle-hora_coleta" data-column="hora_coleta" checked>
                      <label class="form-check-label" for="toggle-hora_coleta">Atualizado</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="sistema_operacional" id="toggle-sistema_operacional" data-column="sistema_operacional" checked>
                      <label class="form-check-label" for="toggle-sistema_operacional">Sistema Operacional</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="informacao_processador" id="toggle-informacao_processador" data-column="informacao_processador" checked>
                      <label class="form-check-label" for="toggle-informacao_processador">Info. Processador</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="placa_de_video" id="toggle-placa_de_video" data-column="placa_de_video" checked>
                      <label class="form-check-label" for="toggle-placa_de_video">Placa de Video</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="armazenamento_disco_total" id="toggle-armazenamento_disco_total" data-column="armazenamento_disco_total" checked>
                      <label class="form-check-label" for="toggle-armazenamento_disco_total">Armaz. Total</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="armazenamento_disco_uso" id="toggle-armazenamento_disco_uso" data-column="armazenamento_disco_uso" checked>
                      <label class="form-check-label" for="toggle-armazenamento_disco_uso">Armaz. Uso</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="armazenamento_disco_livre" id="toggle-armazenamento_disco_livre" data-column="armazenamento_disco_livre" checked>
                      <label class="form-check-label" for="toggle-armazenamento_disco_livre">Armaz. Livre</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="armazenamento_porcentagem_uso" id="toggle-porcentagem_uso" data-column="porcentagem_uso" checked>
                      <label class="form-check-label" for="toggle-porcentagem_uso">% Uso Armaz.</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="tipo_de_armazenamento" id="toggle-tipo_de_armazenamento" data-column="tipo_de_armazenamento" checked>
                      <label class="form-check-label" for="toggle-tipo_de_armazenamento">Tipo Armaz.</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="memoria_ram_total" id="toggle-memoria_ram_total" data-column="memoria_ram_total" checked>
                      <label class="form-check-label" for="toggle-memoria_ram_total">RAM Total</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="memoria_ram_uso" id="toggle-memoria_ram_uso" data-column="memoria_ram_uso" checked>
                      <label class="form-check-label" for="toggle-memoria_ram_uso">RAM Uso</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="memoria_ram_livre" id="toggle-memoria_ram_livre" data-column="memoria_ram_livre" checked>
                      <label class="form-check-label" for="toggle-memoria_ram_livre">RAM Livre</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="percentual_uso_ram" id="toggle-percentual_uso_ram" data-column="percentual_uso_ram" checked>
                      <label class="form-check-label" for="toggle-percentual_uso_ram">% Uso RAM</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="fabricante_placa_mae" id="toggle-fabricante_placa_mae" data-column="fabricante_placa_mae" checked>
                      <label class="form-check-label" for="toggle-fabricante_placa_mae">Fabricante Placa Mãe</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="nome_placa_mae" id="toggle-nome_placa_mae" data-column="nome_placa_mae" checked>
                      <label class="form-check-label" for="toggle-nome_placa_mae">Nome Placa Mãe</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="versao_placa_mae" id="toggle-versao_placa_mae" data-column="versao_placa_mae" checked>
                      <label class="form-check-label" for="toggle-versao_placa_mae">Versão Placa Mãe</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="num_serie_placa_mae" id="toggle-num_serie_placa_mae" data-column="num_serie_placa_mae" checked>
                      <label class="form-check-label" for="toggle-num_serie_placa_mae">Num. Serie Placa Mãe</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="endereco_mac" id="toggle-endereco_mac" data-column="endereco_mac" checked>
                      <label class="form-check-label" for="toggle-endereco_mac">MAC</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="endereco_ip" id="toggle-endereco_ip" data-column="endereco_ip" checked>
                      <label class="form-check-label" for="toggle-endereco_ip">IP</label>
                    </div>
                  </div>
                </div>
            </form>
          </div>
        </div>

        <div class="card-body p-0" style="overflow-x: auto; overflow-y: auto">
          <div class="table-container">
            <table class="table table-hover table-striped small">
              <thead>
                <tr>
                  <th class="p-1">
                  </th>

                  <!-- ID -->
                  <th class="p-1 column-id">
                    <form action="#" method="POST">
                      <input type="hidden" name="id" value="<?php echo htmlspecialchars($id); ?>">
                      <input type="hidden" name="hora_coleta" value="<?php echo htmlspecialchars($hora_coleta); ?>">
                      <input type="hidden" name="empresa" value="<?php echo htmlspecialchars($empresa); ?>">
                      <input type="hidden" name="nome_computador" value="<?php echo htmlspecialchars($nome_computador); ?>">
                      <input type="hidden" name="sistema_operacional" value="<?php echo htmlspecialchars($sistema_operacional); ?>">
                      <input type="hidden" name="endereco_mac" value="<?php echo htmlspecialchars($endereco_mac); ?>">
                      <input type="hidden" name="armazenamento_disco_total" value="<?php echo htmlspecialchars($armazenamento_disco_total); ?>">
                      <input type="hidden" name="armazenamento_disco_livre" value="<?php echo htmlspecialchars($armazenamento_disco_livre); ?>">
                      <input type="hidden" name="armazenamento_porcentagem_uso" value="<?php echo htmlspecialchars($armazenamento_porcentagem_uso); ?>">
                      <input type="hidden" name="limit" value="<?php echo htmlspecialchars($limit); ?>">
                      <input type="hidden" name="ord" value="id">
                      <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> ID</button>
                    </form>
                  </th>
                  <!-- Hora da Coleta -->
                  <th class="p-1 column-hora_coleta">
                    <form action="#" method="POST">
                      <input type="hidden" name="id" value="<?php echo htmlspecialchars($id); ?>">
                      <input type="hidden" name="hora_coleta" value="<?php echo htmlspecialchars($hora_coleta); ?>">
                      <input type="hidden" name="empresa" value="<?php echo htmlspecialchars($empresa); ?>">
                      <input type="hidden" name="nome_computador" value="<?php echo htmlspecialchars($nome_computador); ?>">
                      <input type="hidden" name="sistema_operacional" value="<?php echo htmlspecialchars($sistema_operacional); ?>">
                      <input type="hidden" name="endereco_mac" value="<?php echo htmlspecialchars($endereco_mac); ?>">
                      <input type="hidden" name="armazenamento_disco_total" value="<?php echo htmlspecialchars($armazenamento_disco_total); ?>">
                      <input type="hidden" name="armazenamento_disco_livre" value="<?php echo htmlspecialchars($armazenamento_disco_livre); ?>">
                      <input type="hidden" name="armazenamento_porcentagem_uso" value="<?php echo htmlspecialchars($armazenamento_porcentagem_uso); ?>">
                      <input type="hidden" name="limit" value="<?php echo htmlspecialchars($limit); ?>">
                      <input type="hidden" name="ord" value="hora_da_coleta">
                      <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Atualizado</button>
                    </form>
                  </th>

                  <th class="p-1 status_envio">
                    <form action="" method="POST" class="ajax-update-status">
                      <input type="hidden" name="limit" value="<?php echo htmlspecialchars($limit); ?>">

                      <input type="hidden" name="ord" value="status_envio">
                      <input type="hidden" name="order_dir" value="<?php echo ($ord === 'status_envio' && $order_dir === 'ASC') ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Envio</button>
                    </form>
                  </th>


                  <!-- Empresa -->
                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="id" value="<?php echo htmlspecialchars($id); ?>">
                      <input type="hidden" name="hora_coleta" value="<?php echo htmlspecialchars($hora_coleta); ?>">
                      <input type="hidden" name="empresa" value="<?php echo htmlspecialchars($empresa); ?>">
                      <input type="hidden" name="nome_computador" value="<?php echo htmlspecialchars($nome_computador); ?>">
                      <input type="hidden" name="sistema_operacional" value="<?php echo htmlspecialchars($sistema_operacional); ?>">
                      <input type="hidden" name="endereco_mac" value="<?php echo htmlspecialchars($endereco_mac); ?>">
                      <input type="hidden" name="armazenamento_disco_total" value="<?php echo htmlspecialchars($armazenamento_disco_total); ?>">
                      <input type="hidden" name="armazenamento_disco_livre" value="<?php echo htmlspecialchars($armazenamento_disco_livre); ?>">
                      <input type="hidden" name="armazenamento_porcentagem_uso" value="<?php echo htmlspecialchars($armazenamento_porcentagem_uso); ?>">
                      <input type="hidden" name="limit" value="<?php echo htmlspecialchars($limit); ?>">
                      <input type="hidden" name="ord" value="empresa">
                      <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Empresa</button>
                    </form>
                  </th>
                  <!-- Nome do Computador -->
                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="id" value="<?php echo htmlspecialchars($id); ?>">
                      <input type="hidden" name="hora_coleta" value="<?php echo htmlspecialchars($hora_coleta); ?>">
                      <input type="hidden" name="empresa" value="<?php echo htmlspecialchars($empresa); ?>">
                      <input type="hidden" name="nome_computador" value="<?php echo htmlspecialchars($nome_computador); ?>">
                      <input type="hidden" name="sistema_operacional" value="<?php echo htmlspecialchars($sistema_operacional); ?>">
                      <input type="hidden" name="endereco_mac" value="<?php echo htmlspecialchars($endereco_mac); ?>">
                      <input type="hidden" name="armazenamento_disco_total" value="<?php echo htmlspecialchars($armazenamento_disco_total); ?>">
                      <input type="hidden" name="armazenamento_disco_livre" value="<?php echo htmlspecialchars($armazenamento_disco_livre); ?>">
                      <input type="hidden" name="armazenamento_porcentagem_uso" value="<?php echo htmlspecialchars($armazenamento_porcentagem_uso); ?>">
                      <input type="hidden" name="limit" value="<?php echo htmlspecialchars($limit); ?>">
                      <input type="hidden" name="ord" value="nome_computador">
                      <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Nome do Computador</button>
                    </form>
                  </th>
                  <!-- Sistema Operacional -->
                  <th class="p-1 column-sistema_operacional">
                    <form action="#" method="POST">
                      <input type="hidden" name="id" value="<?php echo htmlspecialchars($id); ?>">
                      <input type="hidden" name="hora_coleta" value="<?php echo htmlspecialchars($hora_coleta); ?>">
                      <input type="hidden" name="empresa" value="<?php echo htmlspecialchars($empresa); ?>">
                      <input type="hidden" name="nome_computador" value="<?php echo htmlspecialchars($nome_computador); ?>">
                      <input type="hidden" name="sistema_operacional" value="<?php echo htmlspecialchars($sistema_operacional); ?>">
                      <input type="hidden" name="endereco_mac" value="<?php echo htmlspecialchars($endereco_mac); ?>">
                      <input type="hidden" name="armazenamento_disco_total" value="<?php echo htmlspecialchars($armazenamento_disco_total); ?>">
                      <input type="hidden" name="armazenamento_disco_livre" value="<?php echo htmlspecialchars($armazenamento_disco_livre); ?>">
                      <input type="hidden" name="armazenamento_porcentagem_uso" value="<?php echo htmlspecialchars($armazenamento_porcentagem_uso); ?>">
                      <input type="hidden" name="limit" value="<?php echo htmlspecialchars($limit); ?>">
                      <input type="hidden" name="ord" value="sistema_operacional">
                      <input type="hidden" name="order_dir" value="<?php echo isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Sistema Op.</button>
                    </form>
                  </th>


                  <th class="p-1 column-informacao_processador">
                    <button type="submit" class="btn btn-light btn-sm btn-block">Informações Processador</button>
                  </th>

                  <th class="p-1 column-placa_de_video teste">
                    <button type="submit" class="btn btn-light btn-sm btn-block">Informações Placa de Vídeo</button>
                  </th>

                  <th class="p-1 column-armazenamento_disco_total">
                    <form action="#" method="POST">
                      <input type="hidden" name="limit" value="<?php echo htmlspecialchars($limit); ?>">

                      <input type="hidden" name="ord" value="armazenamento_disco_total">
                      <input type="hidden" name="order_dir" value="<?php echo ($ord === 'armazenamento_disco_total' && $order_dir === 'ASC') ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i>Armazenamento Total</button>
                    </form>
                  </th>
                  <th class="p-1 column-armazenamento_disco_uso">
                    <form action="#" method="POST">
                      <input type="hidden" name="ord" value="armazenamento_disco_uso">
                      <input type="hidden" name="order_dir" value="<?php echo ($ord === 'armazenamento_disco_uso' && $order_dir === 'ASC') ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Armazenamento Uso</button>
                    </form>
                  </th>


                  <th class="p-1 column-armazenamento_disco_livre">
                    <form action="#" method="POST">
                      <input type="hidden" name="ord" value="armazenamento_disco_livre">
                      <input type="hidden" name="order_dir" value="<?php echo ($ord === 'armazenamento_disco_livre' && $order_dir === 'ASC') ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Armazenamento Livre</button>
                    </form>
                  </th>


                  <th class="p-1 column-porcentagem_uso">
                    <form action="#" method="POST">
                      <input type="hidden" name="ord" value="armazenamento_porcentagem_uso">
                      <input type="hidden" name="order_dir" value="<?php echo ($ord === 'armazenamento_porcentagem_uso' && $order_dir === 'ASC') ? 'DESC' : 'ASC'; ?>">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> % Uso Amaz.</button>
                    </form>
                  </th>


                  <th class="p-1 column-tipo_de_armazenamento" style=<?php echo empty($ativos) ? 'display: none;' : ''; ?>>
                    <button type="submit" class="btn btn-light btn-sm btn-block">Tipo de Armaz.</button>
                  </th>

                  <th class="p-1 column-memoria_ram_total" style=<?php echo empty($ativos) ? 'display: none;' : ''; ?>>
                    <button type="submit" class="btn btn-light btn-sm btn-block">Memória RAM Total</button>
                  </th>

                  <th class="p-1 column-memoria_ram_uso" style=<?php echo empty($ativos) ? 'display: none;' : ''; ?>>
                    <button type="submit" class="btn btn-light btn-sm btn-block">Memória RAM em Uso</button>
                  </th>

                  <th class="p-1 column-memoria_ram_livre" style=<?php echo empty($ativos) ? 'display: none;' : ''; ?>>
                    <button type="submit" class="btn btn-light btn-sm btn-block">Memória RAM Livre</button>
                  </th>

                  <th class="p-1 column-percentual_uso_ram" style=<?php echo empty($ativos) ? 'display: none;' : ''; ?>>
                    <button type="submit" class="btn btn-light btn-sm btn-block">% Uso Memória</button>
                  </th>

                  <th class="p-1 column-fabricante_placa_mae" style:<?php echo empty($ativos) ? 'display: none;' : ''; ?>>
                    <button type="submit" class="btn btn-light btn-sm btn-block">Fabricante Placa Mãe</button>
                  </th>

                  <th class="p-1 column-nome_placa_mae" style:<?php echo empty($ativos) ? 'display: none;' : ''; ?>>
                    <button type="submit" class="btn btn-light btn-sm btn-block">Nome Placa Mãe</button>
                  </th>

                  <th class="p-1  column-versao_placa_mae" style:<?php echo empty($ativos) ? 'display: none;' : ''; ?>>
                    <button type="submit" class="btn btn-light btn-sm btn-block">Versão Placa Mãe</button>
                  </th>

                  <th class="p-1 column-num_serie_placa_mae" style:<?php echo empty($ativos) ? 'display: none;' : ''; ?>>
                    <button type="submit" class="btn btn-light btn-sm btn-block">Nºmero de Série Placa Mãe</button>
                  </th>

                  <th class="p-1 column-endereco_mac">
                    <form action="#" method="POST">
                      <input type="hidden" name="hora_coleta" value="<?php echo htmlspecialchars($hora_coleta); ?>">
                      <input type="hidden" name="empresa" value="<?php echo htmlspecialchars($empresa); ?>">
                      <input type="hidden" name="nome_computador" value="<?php echo htmlspecialchars($nome_computador); ?>">
                      <input type="hidden" name="ord" value="sistema_operacional">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Endereço MAC</button>
                    </form>
                  </th>

                  <th class="p-1 column-endereco_ip" style:<?php echo empty($ativos) ? 'display: none;' : ''; ?>>
                    <button type="submit" class="btn btn-light btn-sm btn-block">Endereço IP</button>
                  </th>


                  <th class="p-1 column-rede_detalhada" style:<?php echo empty($ativos) ? 'display: none;' : ''; ?>>
                    <button type="submit" class="btn btn-light btn-sm btn-block">Rede Detalhada</button>
                  </th>

                </tr>
              </thead>
              <tbody>
                <?php if (!empty($ativos)) : ?>
                  <?php foreach ($ativos as $ativo) : ?>
                    <tr>
                      <td class="align-middle p-1">
                        <div class="dropdown ">
                          <a class="dropdown-item dropdown-toggle m-0 pt-0 dropdown-folder" href="#" data-toggle="dropdown" role="button" aria-expanded="false" aria-haspopup="true" tabindex="-1">
                            <i class="far fa-folder-open"></i>
                          </a>
                          <div class="dropdown-menu dropdown-info" style="margin-left:50px">
                            <!-- Primeira opção - Envia para ativos_edit.php -->
                            <form action="ativos_edit.php" method="GET" class="d-inline">
                              <input type="hidden" name="id" value="<?php echo htmlspecialchars($ativo['id']); ?>">
                              <input type="hidden" name="page" value="<?php echo htmlspecialchars($page); ?>">
                              <input type="hidden" name="limit" value="<?php echo htmlspecialchars($limit); ?>">
                              <input type="hidden" name="ord" value="<?php echo htmlspecialchars($ord); ?>">
                              <input type="hidden" name="empresa" value="<?php echo htmlspecialchars($empresa); ?>">
                              <input type="hidden" name="nome_computador" value="<?php echo htmlspecialchars($nome_computador); ?>">
                              <input type="hidden" name="endereco_mac" value="<?php echo htmlspecialchars($endereco_mac); ?>">
                              <button type="submit" class="dropdown-item"><i class="fas fa-list-ul text-primary"></i><small> Informações</small></button>
                            </form>
                            <div class="dropdown-divider"></div>

                            <!-- Segunda opção - Envia para programas.php -->
                            <form action="programas.php" method="GET" class="d-inline">
                              <input type="hidden" name="id" value="<?php echo htmlspecialchars($ativo['id']); ?>">
                              <input type="hidden" name="page" value="<?php echo htmlspecialchars($page); ?>">
                              <input type="hidden" name="limit" value="<?php echo htmlspecialchars($limit); ?>">
                              <input type="hidden" name="ord" value="<?php echo htmlspecialchars($ord); ?>">
                              <input type="hidden" name="empresa" value="<?php echo htmlspecialchars($empresa); ?>">
                              <input type="hidden" name="nome_computador" value="<?php echo htmlspecialchars($nome_computador); ?>">
                              <input type="hidden" name="endereco_mac" value="<?php echo htmlspecialchars($endereco_mac); ?>">
                              <button type="submit" class="dropdown-item"><small> Programas</small></button>
                            </form>
                            <div class="dropdown-divider"></div>


                            <!-- Terceira opção - Envia para processos.php -->
                            <form action="processos.php" method="GET" class="d-inline">
                              <input type="hidden" name="id" value="<?php echo htmlspecialchars($ativo['id']); ?>">
                              <input type="hidden" name="page" value="<?php echo htmlspecialchars($page); ?>">
                              <input type="hidden" name="limit" value="<?php echo htmlspecialchars($limit); ?>">
                              <input type="hidden" name="ord" value="<?php echo htmlspecialchars($ord); ?>">
                              <input type="hidden" name="empresa" value="<?php echo htmlspecialchars($empresa); ?>">
                              <input type="hidden" name="nome_computador" value="<?php echo htmlspecialchars($nome_computador); ?>">
                              <input type="hidden" name="endereco_mac" value="<?php echo htmlspecialchars($endereco_mac); ?>">
                              <button type="submit" class="dropdown-item"><small> Processos</small></button>
                            </form>
                            <div class="dropdown-divider"></div>

                            <!-- Quarta opção - Envia para ativos_prog.php -->
                            <button type="button" class="dropdown-item dropdown-sair" data-bs-toggle="dropdown"><small> Sair</small>
                            </button>
                          </div>
                        </div>
                      </td>




                      <td class="column-id align-middle"><?php echo htmlspecialchars($ativo['id']); ?></td>

                      <!-- ALERTA DE ATUALIZAÇÕES -->

                      <td class="column-hora_coleta align-middle">
                        <?php
                        // Especifica o formato da data/hora
                        $horaColetaFormat = 'd/m/Y H:i:s';

                        // Converte a hora_coleta para DateTime usando o formato especificado
                        $horaColetaDate = DateTime::createFromFormat($horaColetaFormat, $ativo['hora_da_coleta']);

                        if ($horaColetaDate) {
                          // Pega a data atual
                          $dataAtual = new DateTime();
                          // Calcula a diferença em dias
                          $diferencaDias = $horaColetaDate->diff($dataAtual)->days;

                          // Exibe a hora da coleta
                          echo htmlspecialchars($ativo['hora_da_coleta']);

                          // Se a diferença for maior ou igual a 30 dias, exibe o triângulo de alerta
                          if ($diferencaDias >= 30) {
                            echo ' <i class="fas fa-exclamation-triangle text-danger" title="Mais de 30 dias sem atualização"></i>';
                          }
                        } else {
                          // Se a data não puder ser convertida, exibe um erro ou uma mensagem padrão
                          echo 'Data inválida';
                        }
                        ?>
                      </td>

                      <td class="column-status_envio align-middle">
                        <form action="" method="POST" class="form-status_envio">
                          <input type="hidden" name="id" value="<?php echo htmlspecialchars($ativo['id']); ?>">
                          <input type="hidden" name="status_envio" value="<?php echo (int)$ativo['status_envio'] === 1 ? '0' : '1'; ?>">
                          <button type="submit" class="btn btn-<?php echo (int)$ativo['status_envio'] === 1 ? 'success' : 'secondary'; ?> btn-sm btn-block">
                            <?php echo (int)$ativo['status_envio'] === 1 ? 'Imediato' : 'Padrão'; ?>
                          </button>
                        </form>
                      </td>

                      <td class="column-empresa align-middle"><strong><?php echo htmlspecialchars($ativo['empresa']); ?></strong></td>
                      <td class="column-nome_computador align-middle"><strong><?php echo htmlspecialchars($ativo['nome_computador']); ?></strong></td>

                      <td class="column-sistema_operacional align-middle"><?php echo htmlspecialchars($ativo['sistema_operacional']); ?></td>

                      <!-- <td><?php echo htmlspecialchars($ativo['versao_sistema']); ?></td>
                        <td><?php echo htmlspecialchars($ativo['arquitetura']); ?></td> -->

                      <td class="column-informacao_processador align-middle"><?php echo htmlspecialchars($ativo['processador']); ?></td>

                      <!-- <td><?php echo htmlspecialchars($ativo['nucleos_fisicos']); ?></td>
                        <td><?php echo htmlspecialchars($ativo['threads']); ?></td>
                        <td><?php echo htmlspecialchars($ativo['frequencia_max_cpu']); ?></td>
                        <td><?php echo htmlspecialchars($ativo['frequencia_max_memoria']); ?></td> -->

                      <td class="column-placa_de_video align-middle"><?php echo htmlspecialchars($ativo['placa_de_video']); ?></td>

                      <td class="column-armazenamento_disco_total align-middle"><?php echo htmlspecialchars($ativo['armazenamento_disco_total']); ?></td>
                      <td class="column-armazenamento_disco_uso align-middle"><?php echo htmlspecialchars($ativo['armazenamento_disco_uso']); ?></td>
                      <td class="column-armazenamento_disco_livre align-middle"><?php echo htmlspecialchars($ativo['armazenamento_disco_livre']); ?></td>
                      <td class="column-porcentagem_uso align-middle"><?php echo htmlspecialchars($ativo['armazenamento_porcentagem_uso']); ?></td>
                      <td class="column-tipo_de_armazenamento align-middle"><?php echo htmlspecialchars($ativo['tipo_de_armazenamento']); ?></td>
                      <td class="column-memoria_ram_total align-middle"><?php echo htmlspecialchars($ativo['memoria_ram_total']); ?></td>
                      <td class="column-memoria_ram_uso align-middle"><?php echo htmlspecialchars($ativo['memoria_ram_em_uso']); ?></td>
                      <td class="column-memoria_ram_livre align-middle"><?php echo htmlspecialchars($ativo['memoria_ram_disponivel']); ?></td>
                      <td class="column-percentual_uso_ram align-middle"><?php echo htmlspecialchars($ativo['percentual_uso_memoria']); ?></td>
                      <td class="column-fabricante_placa_mae align-middle"><?php echo htmlspecialchars($ativo['fabricante_placa_mae']); ?></td>
                      <td class="column-nome_placa_mae align-middle"><?php echo htmlspecialchars($ativo['nome_placa_mae']); ?></td>
                      <td class="column-versao_placa_mae align-middle"><?php echo htmlspecialchars($ativo['versao_placa_mae']); ?></td>
                      <td class="column-num_serie_placa_mae align-middle"><?php echo htmlspecialchars($ativo['numero_serie_placa_mae']); ?></td>
                      <td class="column-endereco_mac align-middle" style="white-space: nowrap;"><?php echo htmlspecialchars($ativo['endereco_mac']); ?></td>
                      <td class="column-endereco_ip align-middle"><?php echo htmlspecialchars($ativo['endereco_ip']); ?></td>

                      <td>
                        <!-- <?php echo htmlspecialchars(substr($ativo['rede_detalhada'], 0, 25)) . '...'; ?> -->
                        <button type="button" class="btn btn-sm btn-outline-info align-middle" data-toggle="modal" data-target="#redeDetalhadaModal" data-rede="<?php echo htmlspecialchars($ativo['rede_detalhada']); ?>">Ver Detalhes</button>
                      </td>



                    </tr>
                  <?php endforeach; ?>

                  <!-- Navegação -->
                  <!-- paginação só ocorre se nao houver filtro de empresa e nome_computador senao exibir a paginacao -->
                  <div style="text-align: center;">
                    <?php if ($page > 1) : ?>
                      <a href="<?php echo buildPaginationUrl(1); ?>" style="margin: 0 5px;">
                        << </a>
                          <a href="<?php echo buildPaginationUrl($page - 1); ?>" style="margin: 0 5px;">
                            < </a>
                            <?php endif; ?>

                            <?php
                            // Define o número máximo de páginas a serem exibidas
                            $maxPagesToShow = 5;
                            $startPage = max(1, $page - floor($maxPagesToShow / 2));
                            $endPage = min($totalPages, $startPage + $maxPagesToShow - 1);

                            // Ajusta o início se houver menos páginas disponíveis
                            if ($endPage - $startPage < $maxPagesToShow - 1) {
                              $startPage = max(1, $totalPages - $maxPagesToShow + 1);
                            }

                            for ($i = $startPage; $i <= $endPage; $i++) : ?>
                              <?php if ($i == $page) : ?>
                                <span style="margin: 0 5px;"><?php echo $i; ?></span>
                              <?php else : ?>
                                <a href="<?php echo buildPaginationUrl($i); ?>" style="margin: 0 5px;"><?php echo $i; ?></a>
                              <?php endif; ?>
                            <?php endfor; ?>

                            <?php if ($page < $totalPages) : ?>
                              <a href="<?php echo buildPaginationUrl($page + 1); ?>" style="margin: 0 5px;">></a>
                              <a href="<?php echo buildPaginationUrl($totalPages); ?>" style="margin: 0 5px;">>></a>
                            <?php endif; ?>
                  </div>



                <?php else : ?>
                  <tr>
                    <td colspan="12" class="text-center">Nenhum ativo encontrado</td>
                  </tr>
                <?php endif; ?>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>


  <!-- Modal -->
  <div class="modal fade" id="redeDetalhadaModal" tabindex="-1" aria-labelledby="redeDetalhadaModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="redeDetalhadaModalLabel">Rede Detalhada</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <!-- área para exibir os detalhes da rede -->
          <pre id="redeDetalhadaContent" style="max-width: 100%; overflow-x: auto; white-space: pre-wrap;"></pre>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- JavaScript do jQuery e do Bootstrap -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
  <script>
    function exportarRelatorio() {
      // Captura o formato selecionado
      var formato = document.getElementById('formato_relatorio').value;

      // Captura os filtros adicionais
      var empresa = document.getElementById('filtro_empresa').value;
      var nomeComputador = document.getElementById('filtro_nome_computador').value;
      var enderecoMac = document.getElementById('filtro_endereco_mac').value;
      var ativosPorPagina = document.getElementById('limit').value;

      // Captura as colunas selecionadas
      var colunasSelecionadas = [];
      var checkboxes = document.querySelectorAll('input[name="colunas[]"]:checked');
      checkboxes.forEach(function(checkbox) {
        colunasSelecionadas.push(checkbox.value);
      });

      // Cria a URL com todos os parâmetros, incluindo as colunas selecionadas
      var url = 'gerar_relatorio.php?formato=' + formato +
        '&empresa=' + encodeURIComponent(empresa) +
        '&nome_computador=' + encodeURIComponent(nomeComputador) +
        '&endereco_mac=' + encodeURIComponent(enderecoMac) +
        '&ativos_pagina=' + encodeURIComponent(ativosPorPagina) +
        '&colunas=' + encodeURIComponent(colunasSelecionadas.join(','));

      // Redireciona para a URL para gerar o relatório
      window.location.href = url;
    }
  </script>
  <script>
    $(document).ready(function() {
      // Adiciona evento quando o modal é exibido
      $('#redeDetalhadaModal').on('show.bs.modal', function(event) {
        var button = $(event.relatedTarget);
        var redeDetalhada = button.data('rede');
        var modal = $(this);
        modal.find('.modal-body pre').text(redeDetalhada);
      });

      // Função para limpar o campo da empresa e recarregar a página
      function limparCampoEmpresa() {
        document.getElementsByName('empresa')[0].value = '';
        document.getElementsByName('nome_computador')[0].value = '';
        document.getElementsByName('endereco_mac')[0].value = '';
        window.location.href = './ativos.php';
      }

      // Adiciona evento de mudança a cada checkbox individualmente
      document.querySelectorAll('.column-toggle').forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
          updateColumnVisibility(checkbox);
        });
      });

      // Adiciona evento ao checkbox de selecionar/desselecionar todas
      var toggleAllCheckbox = document.getElementById('toggle-all');
      if (toggleAllCheckbox) {
        toggleAllCheckbox.addEventListener('click', function() {
          if (toggleAllCheckbox.checked) {
            selectAllOptions();
          } else {
            deselectAllOptions();
          }
        });
      }

      // Carrega a visibilidade das colunas quando a página é carregada
      loadColumnVisibility();
    });

    // Função para limpar todos os filtros e recarregar a página
    function limparFiltros() {
      document.getElementsByName('hora_coleta')[0].value = '';
      document.getElementsByName('empresa')[0].value = '';
      document.getElementsByName('nome_computador')[0].value = '';
      document.getElementsByName('endereco_mac')[0].value = '';
      window.location.href = './ativos.php';
    }

    // Função para atualizar a visibilidade das colunas
    function updateColumnVisibility(checkbox) {
      var columnClass = 'column-' + checkbox.getAttribute('data-column');
      var displayStyle = checkbox.checked ? '' : 'none';

      document.querySelectorAll('.' + columnClass).forEach(function(cell) {
        cell.style.display = displayStyle;
      });
      document.querySelectorAll('th.' + columnClass).forEach(function(headerCell) {
        headerCell.style.display = displayStyle;
      });

      // Armazena o estado da visibilidade da coluna no cookie
      document.cookie = columnClass + "=" + displayStyle + "; path=/";
    }

    // Função para carregar o estado das colunas a partir dos cookies
    function loadColumnVisibility() {
      var checkboxes = document.querySelectorAll('.column-toggle');
      checkboxes.forEach(function(checkbox) {
        var columnClass = 'column-' + checkbox.getAttribute('data-column');
        var cookies = document.cookie.split('; ');
        var displayStyle = 'table-cell'; // Valor padrão para display
        cookies.forEach(function(cookie) {
          var [name, value] = cookie.split('=');
          if (name === columnClass) {
            displayStyle = value;
          }
        });
        checkbox.checked = displayStyle !== 'none';
        updateColumnVisibility(checkbox);
      });
    }

    // Função para selecionar todas as opçães
    function selectAllOptions() {
      document.querySelectorAll('.column-toggle').forEach(function(checkbox) {
        checkbox.checked = true;
        updateColumnVisibility(checkbox);
      });
    }

    // Função para desselecionar todas as opçães
    function deselectAllOptions() {
      document.querySelectorAll('.column-toggle').forEach(function(checkbox) {
        checkbox.checked = false;
        updateColumnVisibility(checkbox);
      });
    }
  </script>

  <script>
    $(document).ready(function() {
      $('.form-status_envio').on('submit', function(e) {
        e.preventDefault(); // Impede o envio normal do formulário

        const form = $(this);
        const formData = form.serialize(); // Serializa os dados do formulário

        $.ajax({
          url: '', // URL de destino (atual)
          type: 'POST',
          data: formData,
          dataType: 'json',
          success: function(response) {
            if (response.status === 'success') {
              const newStatus = response.new_status;
              const button = form.find('button');

              // Atualiza o valor oculto do formulário
              form.find('input[name="status_envio"]').val(newStatus);


              // Atualiza o botão com base no novo status
              if (newStatus === '1') {
                button.removeClass('btn-secondary').addClass('btn-success').text('Imediato');
                recarregarPagina();
              } else {
                button.removeClass('btn-success').addClass('btn-secondary').text('Padrão');
                recarregarPagina();
              }


            } else {
              alert('Erro ao atualizar o status.');
            }
          },
          error: function() {
            alert('Erro ao processar a solicitação.');
          },
        });
      });
    });

    function recarregarPagina() {
      // window.location.href = window.location.href.split('?')[0];
      window.location.reload();
    }
  </script>

</body>

</html>