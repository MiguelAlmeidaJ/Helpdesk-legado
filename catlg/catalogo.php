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

function setor_catalogo($setor)
{
    if ($setor == 1) {
        return ['class' => 'service-ti', 'icon' => 'fas fa-microchip', 'label' => 'TI'];
    }
    if ($setor == 2) {
        return ['class' => 'service-devops', 'icon' => 'fas fa-chart-bar', 'label' => 'DevOps'];
    }

    return ['class' => '', 'icon' => 'fas fa-layer-group', 'label' => 'Desconhecido'];
}

if ($m8_04 == 5 || $m8_04 == 6) {
    $setor_padrao = [1, 2];
} elseif ($m8_04 == 1 || $m8_04 == 2) {
    $setor_padrao = [1];
} elseif ($m8_04 == 3 || $m8_04 == 4) {
    $setor_padrao = [2];
} else {
    $setor_padrao = [];
}

$canManageCatalog = in_array($m8_04, [2, 4, 6]);
$pageSize = 30;
$pdo = ConnectionN3();
$isAjax = ($_POST['ajax'] ?? '') === '1';
$requestData = $isAjax ? $_POST : $_GET;

if (isset($_GET['delete']) && $canManageCatalog) {
    $id = intval($_GET['delete']);
    $stmt = $pdo->prepare("DELETE FROM catalogos WHERE id = ?");
    $stmt->execute([$id]);
    header("Location: catalogo.php");
    exit;
}

$stmtCategorias = $pdo->query("SELECT categoria_id, categoria_nome FROM catalogos_categoria ORDER BY categoria_nome ASC");
$categorias = $stmtCategorias->fetchAll(PDO::FETCH_KEY_PAIR);

$stmtClientes = $pdo->query("SELECT clt_id, clt_nomef, clt_cnpj, clt_end, clt_city, clt_uf FROM clientes ORDER BY clt_nomef ASC");
$clientes = $stmtClientes->fetchAll(PDO::FETCH_ASSOC);

$search_client = "";
$search_category = "";
$search_title = "";
$search_setor = [];

if (!empty($requestData)) {
    $search_client = $requestData["search_client"] ?? $requestData["clt_id"] ?? "";
    $search_category = $requestData["search_cat"] ?? $requestData["catalogo_categoria"] ?? "";
    $search_title = trim($requestData["search_title"] ?? "");
    $posted_setor = $requestData["search_setor"] ?? $requestData["setor"] ?? [];
    $search_setor = is_array($posted_setor) ? $posted_setor : (!empty($posted_setor) ? [$posted_setor] : []);
}

$allowedSetores = $setor_padrao;
if (!empty($search_setor)) {
    $search_setor = array_values(array_intersect(array_map('intval', $search_setor), $allowedSetores));
}

if (empty($search_setor) && count($allowedSetores) === 1) {
    $search_setor = $allowedSetores;
}

$sortableColumns = [
    'id' => 'catalogos.id',
    'setor' => 'catalogos.setor',
    'catalogo_categoria' => 'catalogos.catalogo_categoria',
    'clt_nomef' => 'clientes.clt_nomef',
    'titulo' => 'catalogos.titulo',
    'data_criacao' => 'catalogos.data_criacao',
];

$order_by = $requestData['order_by'] ?? 'id';
$order_dir = (isset($requestData['order_dir']) && $requestData['order_dir'] === 'ASC') ? 'ASC' : 'DESC';
$orderSql = $sortableColumns[$order_by] ?? $sortableColumns['id'];
$offset = max(0, intval($requestData['offset'] ?? 0));

$query = "
    SELECT catalogos.*, clientes.clt_nomef
    FROM catalogos
    LEFT JOIN clientes ON catalogos.cliente_id = clientes.clt_id
    WHERE 1=1
";
$params = [];

if (!empty($search_client)) {
    $query .= " AND clientes.clt_id = :search_client";
    $params[':search_client'] = (int)$search_client;
}

if (!empty($search_category)) {
    $query .= " AND catalogos.catalogo_categoria = :search_category";
    $params[':search_category'] = (int)$search_category;
}

if ($search_title !== "") {
    $query .= " AND (catalogos.titulo LIKE :search_text OR catalogos.conteudo LIKE :search_text)";
    $params[':search_text'] = "%$search_title%";
}

if (!empty($search_setor)) {
    $placeholders = [];
    foreach ($search_setor as $index => $setor_id) {
        $param_name = ":setor" . $index;
        $placeholders[] = $param_name;
        $params[$param_name] = (int)$setor_id;
    }
    $query .= " AND catalogos.setor IN (" . implode(", ", $placeholders) . ")";
} elseif (!empty($allowedSetores)) {
    $placeholders = [];
    foreach ($allowedSetores as $index => $setor_id) {
        $param_name = ":setor_default" . $index;
        $placeholders[] = $param_name;
        $params[$param_name] = (int)$setor_id;
    }
    $query .= " AND catalogos.setor IN (" . implode(", ", $placeholders) . ")";
}

$query .= " ORDER BY $orderSql $order_dir LIMIT :limit OFFSET :offset";

$stmt = $pdo->prepare($query);
foreach ($params as $key => $value) {
    $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
}
$stmt->bindValue(':limit', $pageSize + 1, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$catalogos = $stmt->fetchAll(PDO::FETCH_ASSOC);
$hasMore = count($catalogos) > $pageSize;
$catalogos = array_slice($catalogos, 0, $pageSize);

function sort_inputs($column, $order_by, $order_dir, $search_client, $search_category, $search_title, $search_setor)
{
    $nextDir = ($order_by == $column && $order_dir == 'ASC') ? 'DESC' : 'ASC';
    $html = '<input type="hidden" name="order_by" value="' . h($column) . '">';
    $html .= '<input type="hidden" name="order_dir" value="' . h($nextDir) . '">';
    $html .= '<input type="hidden" name="search_client" value="' . h($search_client) . '">';
    $html .= '<input type="hidden" name="search_cat" value="' . h($search_category) . '">';
    $html .= '<input type="hidden" name="search_title" value="' . h($search_title) . '">';
    foreach ($search_setor as $setor) {
        $html .= '<input type="hidden" name="search_setor[]" value="' . h($setor) . '">';
    }
    return $html;
}

function render_catalog_rows($catalogos, $categorias, $canManageCatalog)
{
    ob_start();
    foreach ($catalogos as $catalogo) {
        $setor = setor_catalogo($catalogo['setor']);
        $categoria_id = $catalogo['catalogo_categoria'];
        $categoria_nome = $categorias[$categoria_id] ?? 'Desconhecido';
        $cliente_nome = $catalogo['clt_nomef'] ?? 'Sem cliente';
?>
        <tr>
            <td class="catalog-id">#<?php echo h($catalogo['id']); ?></td>
            <td>
                <span class="catalog-badge <?php echo h($setor['class']); ?>">
                    <i class="<?php echo h($setor['icon']); ?>"></i> <?php echo h($setor['label']); ?>
                </span>
            </td>
            <td><span class="catalog-badge"><i class="fas fa-tags"></i> <?php echo h($categoria_nome); ?></span></td>
            <td>
                <div class="catalog-title-main"><?php echo h($cliente_nome); ?></div>
            </td>
            <td>
                <div class="catalog-title-main"><?php echo h($catalogo['titulo']); ?></div>
                <div class="catalog-title-sub">Catálogo operacional</div>
            </td>
            <td><?php echo h(date('d/m/Y H:i:s', strtotime($catalogo['data_edicao']))); ?></td>
            <td>
                <div class="catalog-actions">
                    <a href="catalogo_visualizar.php?id=<?php echo h($catalogo['id']); ?>" class="btn btn-sm catalog-action-btn" target="_blank"><i class="far fa-eye"></i> Visualizar</a>
                    <?php if ($canManageCatalog) { ?>
                        <a href="catalogo_editar.php?id=<?php echo h($catalogo['id']); ?>" class="btn btn-sm catalog-action-btn"><i class="far fa-edit"></i> Editar</a>
                        <button type="button" onclick="confirmarExclusao(<?php echo h($catalogo['id']); ?>)" class="btn btn-sm catalog-action-btn is-danger"><i class="far fa-trash-alt"></i> Excluir</button>
                    <?php } ?>
                </div>
            </td>
        </tr>
<?php
    }
    return ob_get_clean();
}

if ($isAjax) {
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode([
        'html' => render_catalog_rows($catalogos, $categorias, $canManageCatalog),
        'count' => count($catalogos),
        'nextOffset' => $offset + count($catalogos),
        'hasMore' => $hasMore,
    ], JSON_UNESCAPED_UNICODE);
    exit;
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
    <title>Catálogos Operacionais</title>
    <style>
        html {
            min-height: 100%;
        }

        body.catalog-dashboard {
            zoom: 1;
            min-height: 100dvh;
            width: 100%;
            overflow-x: hidden;
            background: #f6f8fb;
            color: #0f172a;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        body.catalog-dashboard,
        body.catalog-dashboard input,
        body.catalog-dashboard button,
        body.catalog-dashboard select,
        body.catalog-dashboard .card,
        body.catalog-dashboard .table {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .catalog-page {
            min-height: 100dvh;
            padding: 14px 18px 18px;
        }

        .catalog-page-card {
            min-height: calc(100dvh - 32px);
            border: 1px solid #dbe3ef;
            border-radius: 8px;
            box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .catalog-page-card .card-header {
            flex: 0 0 auto;
            background: #fff;
            border-bottom: 1px solid #d9e0ea;
        }

        .catalog-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 14px 16px;
        }

        .catalog-title-wrap {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
        }

        .catalog-title-icon {
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

        .catalog-page-title {
            margin: 0;
            font-size: 1rem;
            font-weight: 700;
            line-height: 1.25;
            color: #111827;
        }

        .catalog-page-subtitle {
            margin: 2px 0 0;
            color: #64748b;
            font-size: .82rem;
            line-height: 1.3;
        }

        .catalog-add-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border-color: #0d6efd;
            color: #0b5ed7 !important;
            font-weight: 600;
            border-radius: 6px;
            padding: 6px 12px;
            white-space: nowrap;
        }

        .catalog-add-button:hover {
            background: #0d6efd;
            color: #fff !important;
        }

        .catalog-filter-bar {
            padding: 12px 16px 14px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }

        .catalog-filter-bar label {
            color: #475569;
            font-size: .76rem;
            font-weight: 650;
            margin-bottom: 4px;
        }

        .catalog-filter-bar .form-control {
            border-color: #d8e0eb;
            color: #111827;
        }

        .catalog-filter-actions {
            display: flex;
            gap: 8px;
        }

        .catalog-page-card .card-body {
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
            background: #fbfdff;
        }

        .catalog-table-container {
            height: 100%;
            max-height: calc(100dvh - 210px);
            overflow: auto;
            display: block;
            border: 0;
        }

        .catalog-table {
            width: 100%;
            min-width: 1080px;
            margin-bottom: 0;
            border-collapse: collapse;
        }

        .catalog-table thead th {
            position: sticky;
            top: 0;
            z-index: 2;
            background: #f8fafc;
            border-bottom: 1px solid #d9e0ea;
            color: #475569;
            font-size: .76rem;
            font-weight: 600;
            text-transform: uppercase;
            padding: 9px 12px;
            white-space: nowrap;
        }

        .catalog-sort-button {
            width: 100%;
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

        .catalog-sort-button:hover {
            color: #0b5ed7;
        }

        .catalog-table tbody tr {
            background: #fff;
            transition: background-color .16s ease;
        }

        .catalog-table tbody tr:hover {
            background: #f8fbff;
        }

        .catalog-table tbody td {
            border-top: 0;
            border-bottom: 1px solid #edf1f6;
            padding: 12px;
            vertical-align: middle;
        }

        .catalog-id {
            color: #64748b;
            font-weight: 700;
            text-align: center;
        }

        .catalog-title-main {
            color: #111827;
            font-weight: 650;
            line-height: 1.25;
            overflow-wrap: anywhere;
        }

        .catalog-title-sub {
            margin-top: 2px;
            color: #64748b;
            font-size: .78rem;
        }

        .catalog-badge {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            width: fit-content;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: .8rem;
            font-weight: 600;
            line-height: 1;
            border: 1px solid #e2e8f0;
            background: #f1f5f9;
            color: #334155;
            white-space: nowrap;
        }

        .catalog-badge.service-ti {
            color: #067647;
            background: #ecfdf3;
            border-color: #b7ebc6;
        }

        .catalog-badge.service-devops {
            color: #0b5ed7;
            background: #eef6ff;
            border-color: #bfdbfe;
        }

        .catalog-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            white-space: nowrap;
        }

        .catalog-action-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            min-width: 94px;
            border-radius: 6px;
            font-weight: 600;
            padding: 5px 10px;
            border-color: #cbd5e1;
            color: #334155;
            background: #fff;
        }

        .catalog-action-btn:hover {
            border-color: #0d6efd;
            color: #0b5ed7;
            background: #eef6ff;
            text-decoration: none;
        }

        .catalog-action-btn.is-danger:hover {
            border-color: #dc3545;
            color: #b42318;
            background: #fff7f7;
        }

        .catalog-action-btn.is-danger {
            border-color: #dc3545;
            color: #fff;
            background: #dc3545;
        }

        .catalog-action-btn.is-danger:hover {
            border-color: #b42318;
            color: #fff;
            background: #b42318;
        }

        .catalog-empty {
            padding: 42px 18px;
            color: #64748b;
            text-align: center;
        }

        .catalog-load-state {
            display: none;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 14px 18px;
            color: #64748b;
            font-size: .86rem;
            background: #fbfdff;
            border-top: 1px solid #edf1f6;
        }

        .catalog-load-state.is-visible {
            display: flex;
        }

        @media (max-width: 1024px) {
            .catalog-page {
                padding: 10px 8px 12px;
            }

            .catalog-page-card {
                min-height: calc(100dvh - 22px);
            }
        }

        @media (max-width: 767.98px) {
            .catalog-card-header {
                align-items: flex-start;
                flex-direction: column;
            }

            .catalog-add-button,
            .catalog-filter-actions .btn {
                width: 100%;
                justify-content: center;
            }

            .catalog-filter-actions {
                flex-direction: column;
            }
        }
    </style>
    <script>
        function confirmarExclusao(id) {
            if (confirm("Tem certeza que deseja excluir este catálogo?")) {
                window.location.href = "catalogo.php?delete=" + id;
            }
        }
    </script>
</head>

<body class="catalog-dashboard">
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid catalog-page">
        <div class="row">
            <div class="col-md-12">
                <div class="card catalog-page-card">
                    <div class="card-header p-0">
                        <div class="catalog-card-header">
                            <div class="catalog-title-wrap">
                                <span class="catalog-title-icon"><i class="fas fa-book"></i></span>
                                <div>
                                    <h1 class="catalog-page-title">Gerenciamento de catálogos</h1>
                                    <p class="catalog-page-subtitle">Consulte, filtre e mantenha os catálogos operacionais por cliente, setor e categoria.</p>
                                </div>
                            </div>
                            <a href="catalogo_editar.php" class="btn btn-outline-primary btn-sm catalog-add-button">
                                <i class="far fa-plus-square"></i> Criar Novo Catálogo
                            </a>
                        </div>
                    </div>

                    <div class="catalog-filter-bar">
                        <form method="GET" action="catalogo.php" class="form-row align-items-end">
                            <div class="form-group col-lg-2 col-md-4">
                                <label for="setor">Setor</label>
                                <select name="search_setor" id="setor" class="form-control form-control-sm">
                                    <?php if ($m8_04 == 1 || $m8_04 == 2) { ?>
                                        <option value="1" selected>TI</option>
                                    <?php } elseif ($m8_04 == 3 || $m8_04 == 4) { ?>
                                        <option value="2" selected>DevOps</option>
                                    <?php } elseif ($m8_04 == 5 || $m8_04 == 6) { ?>
                                        <option value="">Todos</option>
                                        <option value="1" <?php echo in_array(1, $search_setor) ? 'selected' : ''; ?>>TI</option>
                                        <option value="2" <?php echo in_array(2, $search_setor) ? 'selected' : ''; ?>>DevOps</option>
                                    <?php } ?>
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

                            <div class="form-group col-lg-2 col-md-4">
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

                            <div class="form-group col-lg-4 col-md-8">
                                <label for="search_title">Título/conteúdo</label>
                                <input type="text" name="search_title" id="search_title" class="form-control form-control-sm" value="<?php echo h($search_title); ?>" placeholder="Buscar por título ou conteúdo">
                            </div>

                            <div class="form-group col-lg-2 col-md-4">
                                <div class="catalog-filter-actions">
                                    <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-search"></i> Buscar</button>
                                    <a href="catalogo.php" class="btn btn-secondary btn-sm"><i class="fas fa-times"></i> Limpar</a>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div class="card-body p-0">
                        <div class="catalog-table-container" id="catalogTableContainer">
                            <table class="catalog-table">
                                <thead>
                                    <tr>
                                        <th style="width: 70px">
                                            <form action="catalogo.php" method="GET">
                                                <?php echo sort_inputs('id', $order_by, $order_dir, $search_client, $search_category, $search_title, $search_setor); ?>
                                                <button type="submit" class="catalog-sort-button"><i class="fas fa-sort-amount-down-alt"></i> ID</button>
                                            </form>
                                        </th>
                                        <th style="width: 120px">
                                            <form action="catalogo.php" method="GET">
                                                <?php echo sort_inputs('setor', $order_by, $order_dir, $search_client, $search_category, $search_title, $search_setor); ?>
                                                <button type="submit" class="catalog-sort-button"><i class="fas fa-sort-amount-down-alt"></i> Setor</button>
                                            </form>
                                        </th>
                                        <th style="width: 180px">
                                            <form action="catalogo.php" method="GET">
                                                <?php echo sort_inputs('catalogo_categoria', $order_by, $order_dir, $search_client, $search_category, $search_title, $search_setor); ?>
                                                <button type="submit" class="catalog-sort-button"><i class="fas fa-sort-alpha-down"></i> Categoria</button>
                                            </form>
                                        </th>
                                        <th style="width: 220px">
                                            <form action="catalogo.php" method="GET">
                                                <?php echo sort_inputs('clt_nomef', $order_by, $order_dir, $search_client, $search_category, $search_title, $search_setor); ?>
                                                <button type="submit" class="catalog-sort-button"><i class="fas fa-sort-alpha-down"></i> Cliente</button>
                                            </form>
                                        </th>
                                        <th>
                                            <form action="catalogo.php" method="GET">
                                                <?php echo sort_inputs('titulo', $order_by, $order_dir, $search_client, $search_category, $search_title, $search_setor); ?>
                                                <button type="submit" class="catalog-sort-button"><i class="fas fa-sort-alpha-down"></i> Título</button>
                                            </form>
                                        </th>
                                        <th style="width: 170px">
                                            <form action="catalogo.php" method="GET">
                                                <?php echo sort_inputs('data_criacao', $order_by, $order_dir, $search_client, $search_category, $search_title, $search_setor); ?>
                                                <button type="submit" class="catalog-sort-button"><i class="fas fa-sort"></i> Última edição</button>
                                            </form>
                                        </th>
                                        <th class="text-right" style="width: 290px">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="catalogRows" data-offset="<?php echo h(count($catalogos)); ?>" data-has-more="<?php echo $hasMore ? '1' : '0'; ?>">
                                    <?php if (count($catalogos) === 0) { ?>
                                        <tr>
                                            <td colspan="7">
                                                <div class="catalog-empty">Nenhum catálogo encontrado para os filtros informados.</div>
                                            </td>
                                        </tr>
                                    <?php } ?>

                                    <?php foreach ($catalogos as $catalogo) {
                                        $setor = setor_catalogo($catalogo['setor']);
                                        $categoria_id = $catalogo['catalogo_categoria'];
                                        $categoria_nome = $categorias[$categoria_id] ?? 'Desconhecido';
                                        $cliente_nome = $catalogo['clt_nomef'] ?? 'Sem cliente';
                                    ?>
                                        <tr>
                                            <td class="catalog-id">#<?php echo h($catalogo['id']); ?></td>
                                            <td>
                                                <span class="catalog-badge <?php echo h($setor['class']); ?>">
                                                    <i class="<?php echo h($setor['icon']); ?>"></i> <?php echo h($setor['label']); ?>
                                                </span>
                                            </td>
                                            <td><span class="catalog-badge"><i class="fas fa-tags"></i> <?php echo h($categoria_nome); ?></span></td>
                                            <td>
                                                <div class="catalog-title-main"><?php echo h($cliente_nome); ?></div>
                                            </td>
                                            <td>
                                                <div class="catalog-title-main"><?php echo h($catalogo['titulo']); ?></div>
                                                <div class="catalog-title-sub">Catálogo operacional</div>
                                            </td>
                                            <td><?php echo h(date('d/m/Y H:i:s', strtotime($catalogo['data_edicao']))); ?></td>
                                            <td>
                                                <div class="catalog-actions">
                                                    <a href="catalogo_visualizar.php?id=<?php echo h($catalogo['id']); ?>" class="btn btn-sm catalog-action-btn" target="_blank"><i class="far fa-eye"></i> Visualizar</a>
                                                    <?php if ($canManageCatalog) { ?>
                                                        <a href="catalogo_editar.php?id=<?php echo h($catalogo['id']); ?>" class="btn btn-sm catalog-action-btn"><i class="far fa-edit"></i> Editar</a>
                                                        <button type="button" onclick="confirmarExclusao(<?php echo h($catalogo['id']); ?>)" class="btn btn-sm catalog-action-btn is-danger"><i class="far fa-trash-alt"></i> Excluir</button>
                                                    <?php } ?>
                                                </div>
                                            </td>
                                        </tr>
                                    <?php } ?>
                                </tbody>
                            </table>
                            <div class="catalog-load-state" id="catalogLoadState">
                                <i class="fas fa-spinner fa-spin"></i>
                                <span>Carregando mais catálogos...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="../js/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.min.js"></script>
    <script>
        const catalogInfiniteState = {
            order_by: <?php echo json_encode($order_by); ?>,
            order_dir: <?php echo json_encode($order_dir); ?>,
            search_client: <?php echo json_encode((string)$search_client); ?>,
            search_cat: <?php echo json_encode((string)$search_category); ?>,
            search_title: <?php echo json_encode((string)$search_title); ?>,
            search_setor: <?php echo json_encode(array_values($search_setor)); ?>
        };

        document.addEventListener('DOMContentLoaded', function() {
            const container = document.getElementById('catalogTableContainer');
            const rows = document.getElementById('catalogRows');
            const loader = document.getElementById('catalogLoadState');
            let loading = false;

            function hasMoreRows() {
                return rows && rows.dataset.hasMore === '1';
            }

            function setLoading(isLoading) {
                loading = isLoading;
                if (loader) {
                    loader.classList.toggle('is-visible', isLoading);
                }
            }

            function buildRequestBody() {
                const body = new URLSearchParams();
                body.append('ajax', '1');
                body.append('offset', rows.dataset.offset || '0');
                body.append('order_by', catalogInfiniteState.order_by);
                body.append('order_dir', catalogInfiniteState.order_dir);
                body.append('search_client', catalogInfiniteState.search_client);
                body.append('search_cat', catalogInfiniteState.search_cat);
                body.append('search_title', catalogInfiniteState.search_title);
                catalogInfiniteState.search_setor.forEach(function(setor) {
                    body.append('search_setor[]', setor);
                });
                return body;
            }

            function loadMoreCatalogs() {
                if (!rows || loading || !hasMoreRows()) {
                    return;
                }

                setLoading(true);
                fetch('catalogo.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    },
                    body: buildRequestBody()
                })
                    .then(function(response) {
                        if (!response.ok) {
                            throw new Error('Falha ao buscar catálogos.');
                        }
                        return response.json();
                    })
                    .then(function(data) {
                        if (data.html) {
                            rows.insertAdjacentHTML('beforeend', data.html);
                        }
                        rows.dataset.offset = String(data.nextOffset || rows.dataset.offset || '0');
                        rows.dataset.hasMore = data.hasMore ? '1' : '0';
                    })
                    .catch(function() {
                        rows.dataset.hasMore = '0';
                    })
                    .finally(function() {
                        setLoading(false);
                    });
            }

            function maybeLoadMore() {
                if (!container || !hasMoreRows()) {
                    return;
                }

                const nearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 120;
                if (nearBottom) {
                    loadMoreCatalogs();
                }
            }

            if (container) {
                container.addEventListener('scroll', maybeLoadMore);
            }
        });
    </script>
</body>

</html>
