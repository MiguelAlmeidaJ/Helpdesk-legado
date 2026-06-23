<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m8_04 == 0) {
    header("Location: ../index.php");
    exit;
}

function h($value)
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function setor_options($m8_04, $search_setor)
{
    if ($m8_04 == 1 || $m8_04 == 2) {
        return '<option value="1" selected>TI</option>';
    }

    if ($m8_04 == 3 || $m8_04 == 4) {
        return '<option value="2" selected>DevOps</option>';
    }

    if ($m8_04 == 5 || $m8_04 == 6) {
        $html = '<option value="">Todos</option>';
        $html .= '<option value="1" ' . ($search_setor == '1' ? 'selected' : '') . '>TI</option>';
        $html .= '<option value="2" ' . ($search_setor == '2' ? 'selected' : '') . '>DevOps</option>';
        return $html;
    }

    return '<option value="">Sem permissão</option>';
}

$pdo = ConnectionN3();

if ($m8_04 == 5 || $m8_04 == 6) {
    $setor_padrao = [1, 2];
} elseif ($m8_04 == 1 || $m8_04 == 2) {
    $setor_padrao = [1];
} elseif ($m8_04 == 3 || $m8_04 == 4) {
    $setor_padrao = [2];
} else {
    $setor_padrao = [];
}

$search_client = $_GET["search_client"] ?? "";
$search_category = $_GET["search_cat"] ?? "";
$search_setor = $_GET["search_setor"] ?? "";

$allowed_columns = ["clt_id", "clt_nomef"];
$order_by = "clt_nomef";
$order_dir = "ASC";

if (!empty($_GET['ord']) && in_array($_GET['ord'], $allowed_columns)) {
    $order_by = $_GET['ord'];
}

if (!empty($_GET['order_dir']) && in_array(strtoupper($_GET['order_dir']), ["ASC", "DESC"])) {
    $order_dir = strtoupper($_GET['order_dir']);
}

$stmtCategorias = $pdo->query("SELECT categoria_id, categoria_nome FROM catalogos_categoria ORDER BY categoria_nome ASC");
$categorias = $stmtCategorias->fetchAll(PDO::FETCH_KEY_PAIR);

$queryclientes = "SELECT DISTINCT c.clt_id, c.clt_nomef
                  FROM clientes c
                  LEFT JOIN catalogos cat ON c.clt_id = cat.cliente_id
                  WHERE 1=1";

$paramsClientes = [];

if (!empty($search_client)) {
    $queryclientes .= " AND c.clt_id = :search_client";
    $paramsClientes[':search_client'] = (int)$search_client;
}

if (!empty($search_category)) {
    $queryclientes .= " AND cat.catalogo_categoria = :search_cat";
    $paramsClientes[':search_cat'] = (int)$search_category;
}

$queryclientes .= " ORDER BY $order_by $order_dir";

$stmtclientes = $pdo->prepare($queryclientes);
$stmtclientes->execute($paramsClientes);
$clientes = $stmtclientes->fetchAll(PDO::FETCH_ASSOC);

$queryCatalogos = "SELECT cliente_id, catalogo_categoria, setor FROM catalogos WHERE 1=1";
$paramsCatalogos = [];

if (!empty($search_client)) {
    $queryCatalogos .= " AND cliente_id = :search_client";
    $paramsCatalogos[':search_client'] = (int)$search_client;
}

if (!empty($search_category)) {
    $queryCatalogos .= " AND catalogo_categoria = :search_cat";
    $paramsCatalogos[':search_cat'] = (int)$search_category;
}

if (!empty($search_setor)) {
    $queryCatalogos .= " AND setor = :search_setor";
    $paramsCatalogos[':search_setor'] = (int)$search_setor;
} elseif (!empty($setor_padrao)) {
    $queryCatalogos .= " AND setor IN (" . implode(", ", array_map('intval', $setor_padrao)) . ")";
}

$stmtCatalogos = $pdo->prepare($queryCatalogos);
$stmtCatalogos->execute($paramsCatalogos);
$catalogos = $stmtCatalogos->fetchAll(PDO::FETCH_ASSOC);

$clienteCategorias = [];
foreach ($catalogos as $catalogo) {
    $clienteCategorias[$catalogo['cliente_id']][$catalogo['catalogo_categoria']] = true;
}

$nextOrderDir = $order_dir === 'ASC' ? 'DESC' : 'ASC';
?>
<!doctype html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/help.css">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <title>Checklist de Catálogos</title>
    <style>
        html {
            min-height: 100%;
        }

        body.check-dashboard {
            zoom: 1;
            min-height: 100dvh;
            width: 100%;
            overflow-x: hidden;
            background: #f6f8fb;
            color: #0f172a;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        body.check-dashboard,
        body.check-dashboard input,
        body.check-dashboard button,
        body.check-dashboard select,
        body.check-dashboard .card,
        body.check-dashboard .table {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .check-page {
            min-height: 100dvh;
            padding: 14px 18px 18px;
        }

        .check-page-card {
            min-height: calc(100dvh - 32px);
            border: 1px solid #dbe3ef;
            border-radius: 8px;
            box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .check-page-card .card-header {
            flex: 0 0 auto;
            background: #fff;
            border-bottom: 1px solid #d9e0ea;
        }

        .check-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 14px 16px;
        }

        .check-title-wrap {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
        }

        .check-title-icon {
            width: 38px;
            height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            background: #edf5ff;
            color: #0d6efd;
            flex: 0 0 38px;
        }

        .check-page-title {
            margin: 0;
            font-size: 1rem;
            font-weight: 700;
            line-height: 1.25;
            color: #111827;
        }

        .check-page-subtitle {
            margin: 2px 0 0;
            color: #64748b;
            font-size: .82rem;
            line-height: 1.3;
        }

        .check-filter-bar {
            padding: 12px 16px 14px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }

        .check-filter-bar label {
            color: #475569;
            font-size: .76rem;
            font-weight: 650;
            margin-bottom: 4px;
        }

        .check-filter-bar .form-control {
            border-color: #d8e0eb;
            color: #111827;
        }

        .check-filter-actions {
            display: flex;
            gap: 8px;
        }

        .check-page-card .card-body {
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
            background: #fbfdff;
        }

        .check-table-container {
            height: 100%;
            max-height: calc(100dvh - 210px);
            overflow-y: auto;
            overflow-x: hidden;
            display: block;
            border: 0;
        }

        .check-table {
            width: 100%;
            min-width: 0;
            table-layout: fixed;
            margin-bottom: 0;
            border-collapse: separate;
            border-spacing: 0;
        }

        .check-table thead th {
            position: sticky;
            top: 0;
            z-index: 3;
            background: #f8fafc;
            border-bottom: 1px solid #d9e0ea;
            color: #475569;
            font-size: .76rem;
            font-weight: 700;
            text-transform: uppercase;
            padding: 9px 6px;
            white-space: normal;
            text-align: center;
            overflow-wrap: anywhere;
        }

        .check-table thead th:first-child,
        .check-table tbody td:first-child {
            position: sticky;
            left: 0;
            z-index: 2;
            background: #fff;
            box-shadow: 1px 0 0 #edf1f6;
        }

        .check-table thead th:first-child {
            z-index: 4;
            background: #f8fafc;
            text-align: left;
            width: 260px;
        }

        .check-table tbody tr:hover td {
            background: #f8fbff;
        }

        .check-table tbody td {
            border-bottom: 1px solid #edf1f6;
            padding: 9px 6px;
            vertical-align: middle;
            background: #fff;
            overflow: hidden;
        }

        .check-table tbody td:first-child {
            width: 260px;
            padding-left: 12px;
            padding-right: 12px;
        }

        .check-client-name {
            color: #111827;
            font-weight: 650;
            line-height: 1.25;
            overflow-wrap: anywhere;
        }

        .check-client-sub {
            margin-top: 2px;
            color: #64748b;
            font-size: .78rem;
        }

        .check-sort-button {
            display: inline-flex;
            align-items: center;
            justify-content: flex-start;
            gap: 7px;
            border: 0;
            background: transparent;
            color: #475569;
            font-size: .76rem;
            font-weight: 700;
            text-transform: uppercase;
            padding: 0;
        }

        .check-sort-button:hover {
            color: #0b5ed7;
        }

        .check-category-head {
            min-width: 0;
            white-space: normal;
            line-height: 1.2;
        }

        .check-state {
            width: 24px;
            height: 24px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            border: 1px solid #d8dee8;
            color: #94a3b8;
            background: #f8fafc;
            font-size: .72rem;
        }

        .check-state.has-catalog {
            color: #067647;
            background: #ecfdf3;
            border-color: #b7ebc6;
        }

        .check-empty {
            padding: 42px 18px;
            color: #64748b;
            text-align: center;
        }

        @media (max-width: 1024px) {
            .check-page {
                padding: 10px 8px 12px;
            }

            .check-page-card {
                min-height: calc(100dvh - 22px);
            }

            .check-table thead th:first-child,
            .check-table tbody td:first-child {
                width: 210px;
            }
        }

        @media (max-width: 767.98px) {
            .check-card-header {
                align-items: flex-start;
                flex-direction: column;
            }

            .check-filter-actions {
                flex-direction: column;
            }

            .check-filter-actions .btn {
                width: 100%;
                justify-content: center;
            }
        }
    </style>
</head>

<body class="check-dashboard">
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid check-page">
        <div class="row">
            <div class="col-md-12">
                <div class="card check-page-card">
                    <div class="card-header p-0">
                        <div class="check-card-header">
                            <div class="check-title-wrap">
                                <span class="check-title-icon"><i class="fas fa-clipboard-check"></i></span>
                                <div>
                                    <h1 class="check-page-title">Checklist de catálogos</h1>
                                    <p class="check-page-subtitle">Visualize quais clientes possuem catálogo cadastrado por categoria e setor.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="check-filter-bar">
                        <form method="GET" action="check_catlg.php" class="form-row align-items-end">
                            <div class="form-group col-lg-2 col-md-4">
                                <label for="setor">Setor</label>
                                <select name="search_setor" id="setor" class="form-control form-control-sm">
                                    <?php echo setor_options($m8_04, $search_setor); ?>
                                </select>
                            </div>

                            <div class="form-group col-lg-2 col-md-4">
                                <label for="search_cat">Categoria</label>
                                <select name="search_cat" id="search_cat" class="form-control form-control-sm">
                                    <option value="">Todos</option>
                                    <?php foreach ($categorias as $categoria_id => $categoria_nome) { ?>
                                        <option value="<?php echo h($categoria_id); ?>" <?php echo ($search_category == $categoria_id) ? 'selected' : ''; ?>>
                                            <?php echo h($categoria_nome); ?>
                                        </option>
                                    <?php } ?>
                                </select>
                            </div>

                            <div class="form-group col-lg-4 col-md-4">
                                <label for="search_client">Cliente</label>
                                <select name="search_client" id="search_client" class="form-control form-control-sm">
                                    <option value="">Todos</option>
                                    <?php foreach ($clientes as $cliente) { ?>
                                        <option value="<?php echo h($cliente['clt_id']); ?>" <?php echo ($search_client == $cliente['clt_id']) ? 'selected' : ''; ?>>
                                            <?php echo h($cliente['clt_nomef']); ?>
                                        </option>
                                    <?php } ?>
                                </select>
                            </div>

                            <div class="form-group col-lg-4 col-md-12">
                                <div class="check-filter-actions">
                                    <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-search"></i> Buscar</button>
                                    <a href="check_catlg.php" class="btn btn-secondary btn-sm"><i class="fas fa-times"></i> Limpar</a>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div class="card-body p-0">
                        <div class="check-table-container">
                            <table class="check-table">
                                <thead>
                                    <tr>
                                        <th>
                                            <form method="GET" action="check_catlg.php">
                                                <input type="hidden" name="ord" value="clt_nomef">
                                                <input type="hidden" name="order_dir" value="<?php echo h($nextOrderDir); ?>">
                                                <input type="hidden" name="search_client" value="<?php echo h($search_client); ?>">
                                                <input type="hidden" name="search_cat" value="<?php echo h($search_category); ?>">
                                                <input type="hidden" name="search_setor" value="<?php echo h($search_setor); ?>">
                                                <button type="submit" class="check-sort-button"><i class="fas fa-sort-alpha-down"></i> Cliente</button>
                                            </form>
                                        </th>
                                        <?php foreach ($categorias as $categoriaNome) { ?>
                                            <th class="check-category-head"><?php echo h($categoriaNome); ?></th>
                                        <?php } ?>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if (count($clientes) === 0) { ?>
                                        <tr>
                                            <td colspan="<?php echo h(count($categorias) + 1); ?>">
                                                <div class="check-empty">Nenhum cliente encontrado para os filtros informados.</div>
                                            </td>
                                        </tr>
                                    <?php } ?>

                                    <?php foreach ($clientes as $cliente) { ?>
                                        <tr>
                                            <td>
                                                <div class="check-client-name"><?php echo h($cliente['clt_nomef']); ?></div>
                                                <div class="check-client-sub">Cliente</div>
                                            </td>
                                            <?php foreach ($categorias as $categoriaId => $categoriaNome) {
                                                $hasCatalog = isset($clienteCategorias[$cliente['clt_id']][$categoriaId]);
                                            ?>
                                                <td class="text-center align-middle">
                                                    <span class="check-state <?php echo $hasCatalog ? 'has-catalog' : ''; ?>" title="<?php echo $hasCatalog ? 'Catálogo cadastrado' : 'Sem catálogo'; ?>">
                                                        <i class="fas <?php echo $hasCatalog ? 'fa-check' : 'fa-minus'; ?>"></i>
                                                    </span>
                                                </td>
                                            <?php } ?>
                                        </tr>
                                    <?php } ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="../js/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.bundle.min.js"></script>
</body>

</html>
