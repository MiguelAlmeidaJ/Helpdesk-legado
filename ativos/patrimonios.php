<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../ativos/ativos_conect.php");
// Estabelece a conexão com o banco de dados
$pdo = ConnectionN3();
if (!$pdo) {
  exit("Erro ao conectar ao banco de dados.");
}
// Estabelece a conexão com o banco de dados patrimonios
$pdoPatrimonio = ConnectionPatrimonios();
if (!$pdoPatrimonio) {
  exit("Erro ao conectar ao banco de dados.");
}
// Verifica se os filtros foram enviados
$id = isset($_POST['id']) ? $_POST['id'] : '';
$item = isset($_POST['item']) ? $_POST['item'] : '';
$marca = isset($_POST['marca']) ? $_POST['marca'] : '';
$colaborador = isset($_POST['colaborador']) ? $_POST['colaborador'] : '';
$status_item = isset($_POST['status_item']) ? $_POST['status_item'] : '';
// Lógica de Ordenação
$ord = isset($_POST['ord']) ? $_POST['ord'] : "status";
switch ($ord) {
  case "num_registro":
    $order_by = "patrimonios.num_registro ASC";
    break;
  case "item":
    $order_by = "patrimonios.item ASC";
    break;
  case "marca":
    $order_by = "patrimonios.marca ASC";
    break;
  case "modelo":
    $order_by = "patrimonios.modelo ASC";
    break;
  case "colaborador":
    $order_by = "patrimonios.colaborador ASC";
    break;
  case "data_aquisicao":
    $order_by = "patrimonios.data_aquisicao ASC";
    break;
  case "garantia_expira":
    $order_by = "patrimonios.garantia_expira ASC";
    break;
  case "status_item":
    $order_by = "patrimonios.status_item ASC";
    break;
  case "localizacao":
    $order_by = "patrimonios.localizacao ASC";
    break;
  case "setor":
    $order_by = "patrimonios.setor ASC";
    break;
  case "fornecedor":
    $order_by = "patrimonios.fornecedor ASC";
    break;
  default:
    $order_by = "patrimonios.num_registro ASC";
}
// Query para selecionar os patrimônios
$query = "SELECT * FROM patrimonios WHERE 1=1";
$bindings = [];
// Verifica se os filtros foram enviados
if (!empty($item)) {
  $query .= " AND LOWER(item) LIKE LOWER(:item)";
  $bindings[':item'] = "%$item%";
}
if (!empty($marca)) {
  $query .= " AND LOWER(marca) LIKE LOWER(:marca)";
  $bindings[':marca'] = "%$marca%";
}
if (!empty($modelo)) {
  $query .= " AND LOWER(modelo) LIKE LOWER(:modelo)";
  $bindings[':modelo'] = "%$modelo%";
}
if (!empty($colaborador)) {
  $query .= " AND LOWER(colaborador) LIKE LOWER(:colaborador)";
  $bindings[':colaborador'] = "%$colaborador%";
}
if (!empty($status_item)) {
  $query .= " AND LOWER(status_item) LIKE LOWER(:status_item)";
  $bindings[':status_item'] = "%$status_item%";
}
if (!empty($order_by)) {
  $query .= " ORDER BY $order_by";
}
$stmt = $pdoPatrimonio->prepare($query);
if (!$stmt) {
  exit("Erro ao preparar a consulta: " . $pdoPatrimonio->errorInfo()[2]);
}
foreach ($bindings as $param => $value) {
  $stmt->bindValue($param, $value, PDO::PARAM_STR);
}
if (!$stmt->execute()) {
  exit("Erro ao executar a consulta: " . $stmt->errorInfo()[2]);
}
$patrimonios = $stmt->fetchAll(PDO::FETCH_ASSOC);
$count_patrimonios = 0;
$count_patrimonios =  $stmt->rowCount();
if ($patrimonios) {
  // Exemplo para o primeiro patrimônio da lista
  $patrimonio = $patrimonios[0];
  $num_registro = $patrimonio['num_registro'];
  $item = $patrimonio['item'];
  $marca = $patrimonio['marca'];
  $modelo = $patrimonio['modelo'];
  $numero_serie = $patrimonio['numero_serie'];
  $data_aquisicao = $patrimonio['data_aquisicao'];
  $garantia_expira = $patrimonio['garantia_expira'];
  $valor = $patrimonio['valor'];
  $valor = str_replace(',', '.', $valor);
  $valor_formatado = number_format($valor, 2, '.', '');
  $status_item = $patrimonio['status_item'];
  $localizacao = $patrimonio['localizacao'];
  $setor = $patrimonio['setor'];
  $colaborador = $patrimonio['colaborador'];
  $fornecedor = $patrimonio['fornecedor'];
  $especificacoes = $patrimonio['especificacoes'];
  $observacoes = $patrimonio['observacoes'];
  $nota_fiscal = $patrimonio['nota_fiscal'];
  $img_patrimonio = $patrimonio['img_patrimonio'];
  $img_url = 'data:image/jpeg;base64,' . base64_encode($img_patrimonio);
}
?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
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
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <style>
    body {
      zoom: 0.9;
      /* Escala o conteúdo sem alterar o contexto de layout */
      width: 100%;
      /* Mantém o layout responsivo */
      overflow-x: auto;
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
      table-layout: auto;
      width: 100%;
      /* Alinha o texto ao centro em todas as células da tabela */
    }

    .column-imagem {
      width: auto;
      /* Permita ajuste automático */
      max-width: 250px;
      /* Aumente a largura máxima se necessário */
      white-space: nowrap;
      /* Evite quebra de linha */
      overflow: visible;
      /* Permita que o texto seja exibido */
      vertical-align: middle;
      /* Centralize verticalmente */
    }

    th,
    td {
      padding: 8px;
      /* Dá espaço interno para cabeçalho e célula */
      text-align: center;
      /* Alinha ao centro */
    }

    .button-filtrar-limpar {
      width: 90px;
      margin-left: 10px;
    }

    .dropdown-menu {
      max-height: 400px;
      /* Define a altura maxima da caixa do menu suspenso */
      min-width: 190px;
      /*margem interna para o menu suspenso*/
      padding: 0.5rem;
      overflow-y: auto;
    }

    .dropdown-menu .form-check {
      font-size: 0.875rem;
      /* Tamanho da fonte dentro do menu suspenso*/
    }

    .dropdown-menu:after {
      display: none;
      /* Remove a setinha */
    }

    .dropdown-toggle-coluna {
      width: 190px;
      /* Ajusta a largura do botão controle de colunas para coincidir com o tamamnho do menu suspenso */
    }

    .navbar-nav {
      padding: 0 0.1rem;
    }

    .grandes-textos {
      align-items: center;
      min-width: 200px;
      /* Ajuste a largura conforme necessário */
      max-lines: 2;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .table-container {
      max-height: 82vh;
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

        <div class="card" style="width: 100%; overflow-x: auto; overflow-y: hidden">

          <div class="card-header py-1">
            <form action="#" method="POST">
              <div class="form-row align-items-center">
                <div class="col-auto col-form-label-sm">
                  <label class="my-0"> Item:</label>
                  <input type="text" name="item" class="form-control form-control-sm my-1" value="" tabindex="1">
                </div>
                <div class="col-auto col-form-label-sm">
                  <label class="my-0"> Marca:</label>
                  <input type="text" name="marca" class="form-control form-control-sm my-1" value="" tabindex="2">
                </div>
                <div class="col-auto col-form-label-sm">
                  <label class="my-0"> Colaborador:</label>
                  <input type="text" name="colaborador" class="form-control form-control-sm my-1" value="" tabindex="3">
                </div>
                <div class="col-auto col-form-label-sm">
                  <label class="my-0"> Status:</label>
                  <select class="form-control form-control-sm my-1" id="status_item" name="status_item" tabindex="4">
                    <option></option>
                    <option value="Em uso" <?= isset($_GET['status_item']) && $_GET['status_item'] === 'Em uso' ? 'selected' : '' ?>>Em uso</option>
                    <option value="Em manutenção" <?= isset($_GET['status_item']) && $_GET['status_item'] === 'Em manutenção' ? 'selected' : '' ?>>Em manutenção</option>
                    <option value="Desativado" <?= isset($_GET['status_item']) && $_GET['status_item'] === 'Desativado' ? 'selected' : '' ?>>Desativado</option>
                    <option value="Em estoque" <?= isset($_GET['status_item']) && $_GET['status_item'] === 'Em estoque' ? 'selected' : '' ?>>Em estoque</option>
                    <option value="Perdido" <?= isset($_GET['status_item']) && $_GET['status_item'] === 'Perdido' ? 'selected' : '' ?>>Perdido</option>
                    <option value="Doado" <?= isset($_GET['status_item']) && $_GET['status_item'] === 'Doado' ? 'selected' : '' ?>>Doado</option>
                    <option value="Vendida" <?= isset($_GET['status_item']) && $_GET['status_item'] === 'Vendida' ? 'selected' : '' ?>>Vendida</option>
                    <option value="Sucata" <?= isset($_GET['status_item']) && $_GET['status_item'] === 'Sucata' ? 'selected' : '' ?>>Sucata</option>
                  </select>
                </div>
                <div class="col-auto pt-3">
                  <button type="submit" class="btn btn-sm btn-outline-info button-filtrar-limpar my-1" tabindex="5">Filtrar</button>
                  <button type="button" class="btn btn-sm btn-outline-secondary button-filtrar-limpar my-1" onclick="limparFiltros()" tabindex="6">Limpar</button>
                </div>
                <div class="col-auto pt-3">
                  <button class="btn btn-sm btn-outline-info" tabindex="4">Total de Patrimônios: <?php echo $count_patrimonios; ?></button>
                </div>
                <div class="col-auto ml-auto pt-3 dropdown my-1" style="white-space: nowrap;">
                  <button class="btn btn-sm btn-outline-secondary dropdown-toggle-coluna" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> Controle Colunas </button>
                  <div class="dropdown-menu dropdown-menu-right p-2 dropdown-toggle" aria-labelledby="dropdownMenuButton" id="opcoes-visualizacao">
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" value="" id="toggle-all" checked>
                      <label class="form-check-label" for="toggle-all">Todos</label>
                    </div>
                    <!-- <div class="form-check">
                          <input class="form-check-input column-toggle" type="checkbox" value="id" id="toggle-id" data-column="id" checked>
                          <label class="form-check-label" for="toggle-id">ID</label>
                        </div> -->
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="item" id="toggle-item" data-column="item" checked>
                      <label class="form-check-label" for="toggle-item">item</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="marca" id="toggle-marca" data-column="marca" checked>
                      <label class="form-check-label" for="toggle-marca">Marca</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="modelo" id="toggle-modelo" data-column="modelo" checked>
                      <label class="form-check-label" for="toggle-modelo">Modelo</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="numero_serie" id="toggle-numero_serie" data-column="numero_serie" checked>
                      <label class="form-check-label" for="toggle-numero_serie">Nºmero de Série</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="data_aquisicao" id="toggle-data_aquisicao" data-column="data_aquisicao" checked>
                      <label class="form-check-label" for="toggle-data_aquisicao">Data de Aquisição</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="garantia_expira" id="toggle-garantia_expira" data-column="garantia_expira" checked>
                      <label class="form-check-label" for="toggle-garantia_expira">Garantia Expira</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="valor" id="toggle-valor" data-column="valor" checked>
                      <label class="form-check-label" for="toggle-valor">Valor</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="status_item" id="toggle-status_item" data-column="status_item" checked>
                      <label class="form-check-label" for="toggle-status_item">Status</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="localizacao" id="toggle-localizacao" data-column="localizacao" checked>
                      <label class="form-check-label" for="toggle-localizacao">Localização</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="setor" id="toggle-setor" data-column="setor" checked>
                      <label class="form-check-label" for="toggle-setor">Setor</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="colaborador" id="toggle-colaborador" data-column="colaborador" checked>
                      <label class="form-check-label" for="toggle-colaborador_posse_id">Colaborador</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="fornecedor" id="toggle-fornecedor" data-column="fornecedor" checked>
                      <label class="form-check-label" for="toggle-fornecedor">Fornecedor</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="especificacoes" id="toggle-especificacoes" data-column="especificacoes" checked>
                      <label class="form-check-label" for="toggle-especificacoes">Especificações</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="observacoes" id="toggle-observacoes" data-column="observacoes" checked>
                      <label class="form-check-label" for="toggle-observacoes">Observações</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input column-toggle" type="checkbox" value="data_registro" id="toggle-data_registro" data-column="data_registro" checked>
                      <label class="form-check-label" for="toggle-data_registro">Data de Registro</label>
                    </div>
                    <!-- <div class="form-check">
                          <input class="form-check-input column-toggle" type="checkbox" value="nota_fiscal" id="toggle-nota_fiscal" data-column="nota_fiscal" checked>
                          <label class="form-check-label" for="toggle-nota_fiscal">Nota Fiscal</label>
                        </div> -->
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
                    <button type="submit" class="btn btn-light btn-sm btn-block"></button>
                  </th>
                  <!-- ID -->
                  <!-- <th class="p-1 column-id">
                      <button type="submit" class="btn btn-light btn-sm btn-block">ID</button>
                    </th> -->
                  <!-- Num. Registro -->
                  <th class="p-1 column-num_registro">
                    <form action="#" method="POST">
                      <input type="hidden" name="num_registro" value="">
                      <input type="hidden" name="ord" value="num_registro">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Num. Registro</button>
                    </form>
                  </th>
                  <!-- item do Ativo -->
                  <th class="p-1 column-item">
                    <form action="#" method="POST">
                      <input type="hidden" name="item" value="">
                      <input type="hidden" name="ord" value="item">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Item</button>
                    </form>
                  </th>
                  <!-- Marca -->
                  <th class="p-1 column-marca">
                    <form action="#" method="POST">
                      <input type="hidden" name="marca" value="">
                      <input type="hidden" name="ord" value="marca">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Marca</button>
                    </form>
                  </th>
                  <!-- Modelo -->
                  <th class="p-1 column-modelo">
                    <form action="#" method="POST">
                      <input type="hidden" name="modelo" value="">
                      <input type="hidden" name="ord" value="modelo">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Modelo</button>
                    </form>
                  </th>
                  <!-- Nºmero de Série -->
                  <th class="p-1 column-numero_serie">
                    <form action="#" method="POST">
                      <input type="hidden" name="numero_serie" value="">
                      <input type="hidden" name="ord" value="numero_serie">
                      <button type="submit" class="btn btn-light btn-sm btn-block"></i> Nºmero de Série</button>
                    </form>
                  </th>
                  <!-- Data de Aquisição -->
                  <th class="p-1 column-data_aquisicao">
                    <form action="#" method="POST">
                      <input type="hidden" name="data_aquisicao" value="">
                      <input type="hidden" name="ord" value="data_aquisicao">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Data de Aquisição</button>
                    </form>
                  </th>
                  <!-- Garantia expira -->
                  <th class="p-1 column-garantia_expira">
                    <form action="#" method="POST">
                      <input type="hidden" name="garantia_expira" value="">
                      <input type="hidden" name="ord" value="garantia_expira">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Garantia expira</button>
                    </form>
                  </th>
                  <!-- Valor -->
                  <th class="p-1 column-valor">
                    <form action="#" method="POST">
                      <input type="hidden" name="valor" value="">
                      <input type="hidden" name="ord" value="valor">
                      <button type="submit" class="btn btn-light btn-sm btn-block">Valor</button>
                    </form>
                  </th>
                  <!-- status_item -->
                  <th class="p-1 column-status_item">
                    <form action="#" method="POST">
                      <input type="hidden" name="status_item" value="">
                      <input type="hidden" name="ord" value="status_item">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Status</button>
                    </form>
                  </th>
                  <!-- Localização -->
                  <th class="p-1 column-localizacao">
                    <form action="#" method="POST">
                      <input type="hidden" name="localizacao" value="">
                      <input type="hidden" name="ord" value="localizacao">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Localização</button>
                    </form>
                  </th>
                  <!-- Setor -->
                  <th class="p-1 column-setor">
                    <form action="#" method="POST">
                      <input type="hidden" name="setor" value="">
                      <input type="hidden" name="ord" value="setor">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Setor</button>
                    </form>
                  </th>
                  <!-- Colaborador -->
                  <th class="p-1 column-colaborador">
                    <form action="#" method="POST">
                      <input type="hidden" name="colaborador" value="">
                      <input type="hidden" name="ord" value="colaborador">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i>Colaborador</button>
                    </form>
                  </th>
                  <!-- Fornecedor -->
                  <th class="p-1 column-fornecedor">
                    <form action="#" method="POST">
                      <input type="hidden" name="fornecedor" value="">
                      <input type="hidden" name="ord" value="fornecedor">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Fornecedor</button>
                    </form>
                  </th>
                  <!-- Especificações -->
                  <th class="p-1 column-especificacoes">
                    <form action="#" method="POST">
                      <input type="hidden" name="especificacoes" value="">
                      <input type="hidden" name="ord" value="especificacoes">
                      <button type="submit" class="btn btn-light btn-sm btn-block"> Especificações</button>
                    </form>
                  </th>
                  <!-- Observações -->
                  <th class="p-1 column-observacoes">
                    <form action="#" method="POST">
                      <input type="hidden" name="observacoes" value="">
                      <input type="hidden" name="ord" value="observacoes">
                      <button type="submit" class="btn btn-light btn-sm btn-block"> Observações</button>
                    </form>
                  </th>
                  <!-- Data de Registro -->
                  <!-- <th class="p-1 column-data_registro">
                      <form action="#" method="POST">
                        <input type="hidden" name="data_registro" value="">
                        <input type="hidden" name="ord" value="data_registro">
                        <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Data de Registro</button>
                      </form>
                    </th> -->
                  <!-- Nota Fiscal -->
                  <!-- <th class="p-1 column-nota_fiscal">
                      <form action="#" method="POST">
                        <input type="hidden" name="nota_fiscal" value="">
                        <input type="hidden" name="ord" value="nota_fiscal">
                        <button type="submit" class="btn btn-light btn-sm btn-block"> Nota Fiscal</button>
                      </form>
                    </th> -->
                  <!-- Imagem -->
                  <th class="p-1 column-imagem">
                    <form action="#" method="POST">
                      <input type="hidden" name="imagem" value="">
                      <input type="hidden" name="ord" value="imagem">
                      <button type="submit" class="btn btn-light btn-sm btn-block"> Imagem</button>
                    </form>
                  </th>
                </tr>
              </thead>
              <tbody>
                <?php if (!empty($patrimonios)) : ?>
                  <?php foreach ($patrimonios as $patrimonio) : ?>
                    <?php
                    // Adicione esta lógica dentro do foreach
                    $img_url = !empty($patrimonio['img_patrimonio'])
                      ? 'data:image/jpeg;base64,' . base64_encode($patrimonio['img_patrimonio'])
                      : null;
                    ?>
                    <tr>
                      <td class="align-middle p-1 align-middle">
                        <form action="./patrimonios_edit.php" method="GET" class="d-inline">
                          <input type="hidden" name="id" value="<?php echo $patrimonio['id']; ?>">
                          <button type="submit" class="btn btn-light btn-sm p-1"><i class="far fa-folder-open"></i></button>
                        </form>
                      </td>
                      <td class="column-oculto align-middle" hidden><?php echo htmlspecialchars($patrimonio['id']); ?></td> <!-- id oculto -->
                      <td class="column-num_registro align-middle"><?php echo htmlspecialchars($patrimonio['num_registro']); ?></td>
                      <td class="column-item align-middle"><?php echo htmlspecialchars($patrimonio['item']); ?></td>
                      <td class="column-marca align-middle"><?php echo htmlspecialchars($patrimonio['marca']); ?></td>
                      <td class="column-modelo align-middle"><?php echo htmlspecialchars($patrimonio['modelo']); ?></td>
                      <td class="column-numero_serie align-middle"><?php echo htmlspecialchars($patrimonio['numero_serie']); ?></td>
                      <?php if ($patrimonio['data_aquisicao'] == '0000-00-00') :
                        echo '<td class="column-data_aquisicao align-middle"></td>';
                      else :
                        echo '<td class="column-data_aquisicao align-middle">' . htmlspecialchars(date('d/m/Y', strtotime($patrimonio['data_aquisicao']))) . '</td>';
                      endif;
                      ?>
                      <!-- <td class="column-data_aquisicao align-middle"><?php echo htmlspecialchars(date('d/m/Y', strtotime($patrimonio['data_aquisicao']))); ?></td> -->
                      <!-- <?php if ($patrimonio['garantia_expira'] == '0000-00-00') :
                              echo '<td class="column-garantia_expira align-middle"></td>';
                            else :
                              echo '<td class="column-garantia_expira align-middle">' . htmlspecialchars(date('d/m/Y', strtotime($patrimonio['garantia_expira']))) . '</td>';
                            endif;
                            ?> -->
                      <?php
                      if ($patrimonio['garantia_expira'] == '0000-00-00') {
                        echo '<td class="column-garantia_expira align-middle"></td>';
                      } else {
                        $dataAtual = strtotime(date('Y-m-d')); // Data atual no formato timestamp
                        $dataExpiracao = strtotime($patrimonio['garantia_expira']); // Data de expiração no formato timestamp
                        $tresDiasAntes = strtotime('-3 days', $dataExpiracao); // Subtrai 3 dias da data de expiração
                        // Verifica as condições de alerta e vencimento
                        if ($dataAtual > $dataExpiracao) {
                          // Garantia vencida (após a data de expiração)
                          echo '<td class="column-garantia_expira align-middle text-danger ">';
                          echo htmlspecialchars(date('d/m/Y', $dataExpiracao)) . ' <i class="fas fa-exclamation-triangle"></i> (Vencido)';
                          echo '</td>';
                        } elseif ($dataAtual >= $tresDiasAntes && $dataAtual <= $dataExpiracao) {
                          // Alerta de expiração (3 dias antes até a data de expiração)
                          echo '<td class="column-garantia_expira align-middle text-warning ">';
                          echo htmlspecialchars(date('d/m/Y', $dataExpiracao)) . ' <i class="fas fa-exclamation-triangle"></i> (Expira em breve)';
                          echo '</td>';
                        } else {
                          // Garantia válida e fora do período de alerta
                          echo '<td class="column-garantia_expira align-middle">';
                          echo htmlspecialchars(date('d/m/Y', $dataExpiracao));
                          echo '</td>';
                        }
                      }
                      ?>
                      <!-- <td class="column-garantia_expira align-middle"><?php echo htmlspecialchars(date('d/m/Y', strtotime($patrimonio['garantia_expira']))); ?></td> -->
                      <td class="column-valor align-middle">R$<?php echo htmlspecialchars($patrimonio['valor']); ?></td>
                      <td class="column-status_item align-middle"><?php echo htmlspecialchars($patrimonio['status_item']); ?></td>
                      <td class="column-localizacao align-middle"><?php echo htmlspecialchars($patrimonio['localizacao']); ?></td>
                      <td class="column-setor align-middle"><?php echo htmlspecialchars($patrimonio['setor']); ?></td>
                      <td class="column-colaborador align-middle"><?php echo htmlspecialchars($patrimonio['colaborador']); ?></td>
                      <td class="column-fornecedor align-middle"><?php echo htmlspecialchars($patrimonio['fornecedor']); ?></td>
                      <td class="column-especificacoes align-middlen grandes-textos">
                        <?php
                        $maxLength = 80; // Defina o número máximo de caracteres a serem exibidos
                        $especificacoes = htmlspecialchars($patrimonio['especificacoes']);
                        if (strlen($especificacoes) > $maxLength) {
                          $especificacoes = substr($especificacoes, 0, $maxLength) . '...';
                        }
                        echo $especificacoes;
                        ?>
                      </td>
                      <td class="column-observacoes align-middle grandes-textos">
                        <?php
                        $maxLength = 80; // Defina o número máximo de caracteres a serem exibidos
                        $observacoes = htmlspecialchars($patrimonio['observacoes']);
                        if (strlen($observacoes) > $maxLength) {
                          $observacoes = substr($observacoes, 0, $maxLength) . '...';
                        }
                        echo $observacoes;
                        ?>
                      </td>
                      <!-- <td class="column-nota_fiscal align-middle"><?php echo htmlspecialchars($patrimonio['nota_fiscal']); ?></td> -->
                      <!-- Adicione o código da imagem aqui -->
                      <td class="imagem align-middle column-imagem">
                        <?php if (!empty($img_url)) : ?>
                          <!-- Exibe a imagem com o atributo data-src -->
                          <a href="#" data-toggle="modal" data-target="#imagemModal" data-src="<?= $img_url ?>">
                            <img src="<?= $img_url ?>" alt="Imagem do Patrimônio" style="width: 100px; height: auto;">
                          </a>
                        <?php else : ?>
                          Sem Imagem
                        <?php endif; ?>
                      </td>
                    </tr>
                  <?php endforeach; ?>
                <?php else : ?>
                  <tr>
                    <td colspan="14">Nenhum registro encontrado.</td>
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
      <div class="modal fade" id="imagemModal" tabindex="-1" role="dialog" aria-labelledby="imagemModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="imagemModalLabel">Imagem do Patrimônio</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <img id="modalImagem" src="" alt="Imagem do Patrimônio" class="img-fluid">
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
            </div>
          </div>
        </div>
      </div>

      <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
      <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
      <script>
        $(document).ready(function() {
          $('#imagemModal').on('show.bs.modal', function(event) {
            var button = $(event.relatedTarget); // Botão que acionou o modal
            var imgSrc = button.data('src'); // Extraindo o atributo data-src do botão
            var modal = $(this);
            modal.find('.modal-body img').attr('src', imgSrc); // Atualiza a URL da imagem no modal
          });
        });

        function limparFiltros() {
          document.getElementsByName('item')[0].value = '';
          document.getElementsByName('marca')[0].value = '';
          document.getElementsByName('colaborador')[0].value = '';
          window.location.href = './patrimonios.php'; // Força a recarga da página
        }
        // Funçao para selecionar todas as opçães controlada pela checkbox id toggle-all
        function selectAllOptions() {
          var checkboxes = document.querySelectorAll('.column-toggle');
          checkboxes.forEach(function(checkbox) {
            checkbox.checked = true;
            updateColumnVisibility(checkbox);
          });
        }
        // Funçao para desselecionar todas as opçães controlada pela checkbox id toggle-all
        function deselectAllOptions() {
          var checkboxes = document.querySelectorAll('.column-toggle');
          checkboxes.forEach(function(checkbox) {
            checkbox.checked = false;
            updateColumnVisibility(checkbox);
          });
        }
        // Função para atualizar a visibilidade das colunas
        function updateColumnVisibility(checkbox) {
          var columnClass = 'column-' + checkbox.getAttribute('data-column');
          var cells = document.querySelectorAll('.' + columnClass);
          cells.forEach(function(cell) {
            cell.style.display = checkbox.checked ? '' : 'none';
          });
          var headerCells = document.querySelectorAll('th.' + columnClass);
          headerCells.forEach(function(cell) {
            cell.style.display = checkbox.checked ? '' : 'none';
          });
        }
        // verifica o estado da checkbox id toggle-all e chama a função correspondente
        var toggleAllCheckbox = document.getElementById('toggle-all');
        toggleAllCheckbox.addEventListener('click', function() {
          if (toggleAllCheckbox.checked) {
            selectAllOptions();
          } else {
            deselectAllOptions();
          }
        });
        // Adiciona evento de mudança a cada checkbox individualmente
        document.querySelectorAll('.column-toggle').forEach(function(checkbox) {
          checkbox.addEventListener('change', function() {
            updateColumnVisibility(checkbox);
          });
        });
      </script>
</body>

</html>