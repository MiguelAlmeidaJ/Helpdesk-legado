<?php

session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// Verificar permissões
if ($m7_00 == 0) {
    header("Location: ../home.php");
    exit;
}

// Criar conexão com o banco MKT
$pdoMkt = ConnectionMkt();
if (!$pdoMkt) {
    exit("Erro ao conectar ao banco de dados.");
}

// Mapeamento dos status
$statusMap = [
    1  => "Não Iniciado",
    4  => "Em Progresso",
    3  => "Em Alteração",
    2  => "Aprovação Interna",
    50 => "Enviar Time Design",
    53 => "Aprovação Cliente",
    51 => "Aguardando Publicação",
    54 => "Standby",
    52 => "Atenção",
    5  => "Completo",
    55 => "Aprovação DOC"
];

function mktShortText(string $text, int $limit = 120): string
{
    $text = trim(strip_tags(html_entity_decode($text, ENT_QUOTES, 'UTF-8')));
    if (function_exists('mb_strimwidth')) {
        return mb_strimwidth($text, 0, $limit, '...', 'UTF-8');
    }
    return strlen($text) > $limit ? substr($text, 0, $limit) . '...' : $text;
}

function renderMktRows(array $atendimentos): string
{
    ob_start();
    foreach ($atendimentos as $atendimento) : ?>
        <tr class="mkt-row" data-mkt-id="<?= (int)$atendimento['id'] ?>">
            <td><strong>#<?= (int)$atendimento['id'] ?></strong></td>
            <td>
                <strong><?= htmlspecialchars($atendimento['name'] ?? '') ?></strong>
                <?php if (!empty($atendimento['description'])) : ?>
                    <span class="mkt-row-desc"><?= htmlspecialchars(mktShortText($atendimento['description'])) ?></span>
                <?php endif; ?>
            </td>
            <td><strong><?= htmlspecialchars($atendimento['nome_cliente'] ?? '') ?></strong></td>
            <td>
                <?php
                $prio = (int)($atendimento['priority'] ?? 0);
                $cores = [1 => 'success', 2 => 'warning', 3 => 'custom', 4 => 'danger'];
                $labels = [1 => 'Baixa', 2 => 'Média', 3 => 'Alta', 4 => 'Urgente'];
                if ($prio == 0) {
                    echo '<span class="mkt-badge mkt-badge-muted">NA</span>';
                } elseif ($prio == 3) {
                    echo '<span class="mkt-badge mkt-badge-high">Alta</span>';
                } else {
                    echo "<span class='mkt-badge mkt-badge-{$cores[$prio]}'>{$labels[$prio]}</span>";
                }
                ?>
            </td>
            <td><?= htmlspecialchars((string)($atendimento['total_artes'] ?? '')) ?></td>
            <td><?= htmlspecialchars(trim(($atendimento['nome_tecnico'] ?? '') . ' ' . ($atendimento['sobrenome_tecnico'] ?? ''))) ?></td>
            <td><?= htmlspecialchars(trim(($atendimento['nome_direcionador'] ?? '') . ' ' . ($atendimento['sobrenome_direcionador'] ?? ''))) ?></td>
            <td><span class="mkt-status"><?= htmlspecialchars($atendimento['status'] ?? '') ?></span></td>
            <td><?= htmlspecialchars((string)($atendimento['inicio'] ?? '')) ?></td>
            <td><?= htmlspecialchars((string)($atendimento['prazo'] ?? '')) ?></td>
            <td><?= htmlspecialchars((string)($atendimento['finalizado'] ?? '')) ?></td>
            <td class="align-middle p-1">
                <form action="mkt_atd.php" method="POST" class="mkt-open-form">
                    <input type="hidden" name="mkt_atd" value="<?php echo (int)$atendimento['id']; ?>">
                    <button type="submit" class="btn btn-light btn-sm p-1" title="Abrir"><i class="far fa-folder-open"></i></button>
                </form>
            </td>
        </tr>
    <?php endforeach;
    return ob_get_clean();
}

// Receber filtros enviados via POST
$idFiltro = $_POST['id'] ?? '';
$tituloFiltro = $_POST['titulo'] ?? '';
$clienteFiltro = $_POST['cliente'] ?? '';
$statusFiltro = $_POST['status'] ?? '';
$prioridadeFiltro = $_POST['prioridade'] ?? '';
$dataFiltro = $_POST['data_1'] ?? '';
$tecnicoFiltro = $_POST['tecnico'] ?? '';
$typeDataFiltro = $_POST['typeDataFiltro'] ?? 1;
$isAjax = ($_POST['ajax_mode'] ?? '') === 'append';
$pageSize = 50;
$page = max(1, (int)($_POST['page'] ?? 1));
$offset = ($page - 1) * $pageSize;

// Converter data do formato dd/mm/aaaa para yyyy-mm-dd
if (!empty($dataFiltro)) {
    $dataFiltro = DateTime::createFromFormat('d/m/Y', $dataFiltro)->format('Y-m-d');
}

// Montar a cláusula WHERE dinamicamente
$whereClauses = [];
$params = [];

if (!empty($idFiltro)) {
    $whereClauses[] = "t.id = :id";
    $params[':id'] = $idFiltro;
}
if (!empty($tituloFiltro)) {
    $whereClauses[] = "t.name LIKE :titulo";
    $params[':titulo'] = "%$tituloFiltro%";
}
if (!empty($clienteFiltro)) {
    $whereClauses[] = "c.userid = :cliente";
    $params[':cliente'] = $clienteFiltro;
}
if (!empty($statusFiltro)) {
    if (is_array($statusFiltro)) {
        $placeholders = [];
        foreach ($statusFiltro as $index => $status) {
            $placeholder = ":status$index";
            $placeholders[] = $placeholder;
            $params[$placeholder] = $status;
        }
        $whereClauses[] = "t.status IN (" . implode(", ", $placeholders) . ")";
    } else {
        $whereClauses[] = "t.status = :status";
        $params[':status'] = $statusFiltro;
    }
}
if (!empty($prioridadeFiltro)) {
    $whereClauses[] = "t.priority = :prioridade";
    $params[':prioridade'] = $prioridadeFiltro;
}
if (!empty($dataFiltro)) {
    $whereClauses[] = "DATE(t.dateadded) = :data";
    $params[':data'] = $dataFiltro;
}
if (!empty($tecnicoFiltro)) {
    $whereClauses[] = "ta.staffid = :tecnico";
    $params[':tecnico'] = $tecnicoFiltro;
}

$whereSql = (count($whereClauses) > 0) ? "WHERE " . implode(' AND ', $whereClauses) : "";

// Definir ordenação com aliases corretos
$ord = $_POST['ord'] ?? 'id';
$order_dir = $_POST['order_dir'] ?? 'DESC';

$colunas_validas = [
    'id' => 't.id',
    'name' => 't.name',
    'nome_cliente' => 'c.company',
    'priority' => 't.priority',
    'total_artes' => 'cfv.value',
    'nome_tecnico' => 's.firstname',
    'nome_direcionador' => 'd.firstname',
    'status' => 'ts.name',
    'inicio' => 't.dateadded',
    'prazo' => 't.duedate',
    'finalizado' => 't.datefinished'
];

$order_dir_validas = ['ASC', 'DESC'];

if (!array_key_exists($ord, $colunas_validas)) {
    $ord = 'id';
}
if (!in_array($order_dir, $order_dir_validas)) {
    $order_dir = 'DESC';
}

$orderColumn = $colunas_validas[$ord];

$countQuery = "
    SELECT COUNT(*) AS total
    FROM tbltasks t
    LEFT JOIN tbltask_assigned ta ON t.id = ta.taskid
    LEFT JOIN tbltask_statuses ts ON t.status = ts.id
    LEFT JOIN tblcustomfieldsvalues cfv ON t.id = cfv.relid AND cfv.fieldid = 8
    LEFT JOIN tblstaff s ON ta.staffid = s.staffid
    LEFT JOIN tblclients c ON t.rel_id = c.userid
    LEFT JOIN tblstaff d ON t.addedfrom = d.staffid
    $whereSql
";

$stmtCount = $pdoMkt->prepare($countQuery);
$stmtCount->execute($params);
$count_atendimentos = (int)($stmtCount->fetchColumn() ?: 0);

$query = "
    SELECT t.id, t.name, t.description, c.userid AS id_cliente, c.company AS nome_cliente,
           t.priority, t.status, ts.name AS status, 
           cfv.value AS total_artes,
           t.addedfrom AS direcionado_por_ID, d.firstname AS nome_direcionador, d.lastname AS sobrenome_direcionador,
           ta.staffid AS id_tecnico, s.firstname AS nome_tecnico, s.lastname AS sobrenome_tecnico,
           DATE_FORMAT(t.dateadded, '%d/%m/%Y %H:%i:%s') AS inicio,
           DATE_FORMAT(t.duedate, '%d/%m/%Y %H:%i:%s') AS prazo,
           IF(t.datefinished IS NULL, 'Não finalizado', DATE_FORMAT(t.datefinished, '%d/%m/%Y %H:%i:%s')) AS finalizado
    FROM tbltasks t
    LEFT JOIN tbltask_assigned ta ON t.id = ta.taskid
    LEFT JOIN tbltask_statuses ts ON t.status = ts.id
    LEFT JOIN tblcustomfieldsvalues cfv ON t.id = cfv.relid AND cfv.fieldid = 8
    LEFT JOIN tblstaff s ON ta.staffid = s.staffid
    LEFT JOIN tblclients c ON t.rel_id = c.userid
    LEFT JOIN tblstaff d ON t.addedfrom = d.staffid
    $whereSql
    ORDER BY $orderColumn $order_dir
    LIMIT :limit OFFSET :offset
";

$stmt = $pdoMkt->prepare($query);
foreach ($params as $key => $value) {
    $stmt->bindValue($key, $value);
}
$stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();

$todosAtendimentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
$loadedCount = min($offset + count($todosAtendimentos), $count_atendimentos);
$hasMore = $loadedCount < $count_atendimentos;

if ($isAjax) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'ok' => true,
        'html' => renderMktRows($todosAtendimentos),
        'pagination' => [
            'total' => $count_atendimentos,
            'loaded' => $loadedCount,
            'nextPage' => $hasMore ? $page + 1 : null,
            'hasMore' => $hasMore,
        ],
    ]);
    exit;
}

// Carregar opções para filtros
$stmtTodosClientes = $pdoMkt->prepare("SELECT userid, company FROM tblclients ORDER BY company ASC");
$stmtTodosClientes->execute();
$todosClientes = $stmtTodosClientes->fetchAll(PDO::FETCH_ASSOC);

$stmtTodosTecnicos = $pdoMkt->prepare("SELECT staffid, firstname, lastname FROM tblstaff WHERE active = 1 ORDER BY firstname ASC");
$stmtTodosTecnicos->execute();
$todosTecnicos = $stmtTodosTecnicos->fetchAll(PDO::FETCH_ASSOC);

$stmtTodosStatus = $pdoMkt->prepare("SELECT id, name FROM tbltask_statuses ORDER BY name ASC");
$stmtTodosStatus->execute();
$todosStatus = $stmtTodosStatus->fetchAll(PDO::FETCH_ASSOC);

?>

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
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">

    <title>Allterus</title>

    <style>
        body {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            zoom: 1;
            width: 100%;
            overflow-x: hidden;
            background: #f3f6fa;
        }

        .mkt-page {
            height: 100vh;
            height: 100dvh;
            overflow: hidden;
            padding: 6px 8px 8px;
        }

        .mkt-shell {
            height: calc(100vh - 14px);
            height: calc(100dvh - 14px);
            display: flex;
            flex-direction: column;
            border: 1px solid #d8e3ef;
            border-radius: 6px;
            background: #fff;
            box-shadow: 0 8px 22px rgba(15, 23, 42, .06);
            overflow: hidden;
        }

        .mkt-filter-card {
            flex: 0 0 auto;
            border-bottom: 1px solid #d8e3ef;
            background: #fbfcfe;
            padding: 10px 12px;
        }

        .mkt-filter-card label {
            color: #172033;
            font-size: 13px;
            font-weight: 600;
        }

        .mkt-filter-card .form-control,
        .mkt-filter-card .btn {
            border-radius: 4px;
            box-shadow: none;
        }

        .mkt-filter-card .bootstrap-select {
            width: 100% !important;
        }

        .mkt-filter-card .bootstrap-select>.dropdown-toggle {
            min-height: 32px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            background: #fff;
            color: #172033;
            font-size: 13px;
            box-shadow: none;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .bootstrap-select .filter-option-inner-inner {
            overflow: hidden;
            text-overflow: ellipsis;
        }

        body>.bootstrap-select .dropdown-menu,
        .bs-container.bootstrap-select .dropdown-menu,
        .bootstrap-select.show .dropdown-menu {
            z-index: 2055;
            min-width: 0 !important;
            max-width: min(420px, calc(100vw - 24px));
            max-height: 280px !important;
            overflow: hidden;
            border: 1px solid #d9e3ef;
            border-radius: 6px;
            box-shadow: 0 10px 24px rgba(15, 23, 42, .14);
        }

        .bs-container.bootstrap-select {
            width: auto !important;
            min-width: 0 !important;
            max-width: calc(100vw - 24px);
        }

        body>.bootstrap-select .dropdown-menu.inner,
        .bs-container.bootstrap-select .dropdown-menu.inner,
        .bootstrap-select .dropdown-menu.inner {
            max-height: 238px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
        }

        .bootstrap-select .dropdown-menu li a,
        .bootstrap-select .dropdown-item {
            white-space: normal;
            line-height: 1.25;
            padding: 7px 10px;
            font-size: 13px;
        }

        .bootstrap-select .bs-searchbox {
            padding: 8px;
        }

        .bootstrap-select .bs-searchbox .form-control {
            min-height: 32px;
            border-radius: 5px;
            font-size: 13px;
        }

        .mkt-list-card {
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
        }

        .form-check-label {
            font-size: 13px;
            /* Ajuste do texto préximo aos checkboxes */
            padding: 1px;
        }

        th form {
            margin: 0 !important;
        }

        .table-container {
            height: 100%;
            /* Define um limite de altura para a tabela */
            overflow-y: auto;
            /* Habilita o scroll vertical */
            overflow-x: hidden;
            border: 0;
            background: #fff;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 0 !important;
        }

        thead th {
            position: sticky;
            top: 0;
            z-index: 2;
            background: #f8fafc;
            border-bottom: 1px solid #d8e3ef !important;
            color: #172033;
            font-size: 12px;
            font-weight: 700;
        }

        th,
        td {
            white-space: normal;
            word-wrap: break-word;
            vertical-align: middle !important;
        }

        .mkt-row {
            height: 72px;
            cursor: pointer;
        }

        .mkt-row:hover {
            background: #f8fbff;
        }

        .mkt-row-desc {
            display: block;
            margin-top: 2px;
            color: #53677f;
            font-size: 11px;
            line-height: 1.25;
        }

        .mkt-badge,
        .mkt-status {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: 700;
            line-height: 1;
            white-space: nowrap;
        }

        .mkt-status {
            background: #e8f8fc;
            color: #075985;
        }

        .mkt-badge-muted {
            background: #eef2f7;
            color: #475569;
        }

        .mkt-badge-success {
            background: #dcfce7;
            color: #15803d;
        }

        .mkt-badge-warning {
            background: #fef3c7;
            color: #a16207;
        }

        .mkt-badge-high {
            background: #ffedd5;
            color: #c2410c;
        }

        .mkt-badge-danger {
            background: #ffe4e6;
            color: #be123c;
        }

        .mkt-open-form {
            margin: 0;
        }

        .mkt-loader {
            display: none;
            padding: 12px;
            text-align: center;
            color: #53677f;
            font-size: 12px;
            border-top: 1px solid #e7edf5;
            background: #fbfcfe;
        }

        .mkt-loader.is-visible {
            display: block;
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
    </style>

</head>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid mkt-page">
        <div class="row h-100">
            <div class="col-12 h-100" style="padding-left: 1px; padding-right: 1px;">
                <div class="mkt-shell">
                    <div class="mkt-filter-card">
                        <form action="#" method="POST" id="mktFilterForm">
                            <div class="form-row align-items-center">
                                <div class="col-auto col-form-label-sm">
                                    <label class="my-0">ID:</label>
                                    <input type="text" name="id" class="form-control form-control-sm my-1" value="<?= isset($_POST['id']) ? htmlspecialchars($_POST['id']) : '' ?>">
                                </div>

                                <div class="col-2 col-form-label-sm">
                                    <label class="my-0">Cliente:</label>
                                    <select class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" name="cliente" id="cliente">
                                        <option value="">Todos</option>
                                        <?php foreach ($todosClientes as $cliente) : ?>
                                            <option value="<?= $cliente['userid'] ?>" <?= (isset($_POST['cliente']) && $_POST['cliente'] == $cliente['userid']) ? 'selected' : '' ?>>
                                                <?= $cliente['company'] ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>

                                <div class="col-auto col-form-label-sm">
                                    <label class="my-0">Status:</label>
                                    <select class="form-control form-control-sm selectpicker" name="status[]" id="status" multiple data-live-search="true" data-actions-box="true" data-selected-text-format="count > 1" data-none-selected-text="Selecione" data-container="body" data-width="100%">
                                        <?php foreach ($todosStatus as $status) : ?>
                                            <option value="<?= $status['id'] ?>" <?= (isset($_POST['status']) && is_array($_POST['status']) && in_array($status['id'], $_POST['status'])) ? 'selected' : '' ?>>
                                                <?= $status['name'] ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>

                                <div class="col-auto col-form-label-sm">
                                    <label class="my-0">Prioridade:</label>
                                    <select class="form-control form-control-sm selectpicker" data-container="body" data-width="100%" name="prioridade" id="prioridade">
                                        <option value="">Todas</option>
                                        <option value="1" <?= (isset($_POST['prioridade']) && $_POST['prioridade'] == "1") ? 'selected' : '' ?>>Baixa</option>
                                        <option value="2" <?= (isset($_POST['prioridade']) && $_POST['prioridade'] == "2") ? 'selected' : '' ?>>Média</option>
                                        <option value="3" <?= (isset($_POST['prioridade']) && $_POST['prioridade'] == "3") ? 'selected' : '' ?>>Alta</option>
                                        <option value="4" <?= (isset($_POST['prioridade']) && $_POST['prioridade'] == "4") ? 'selected' : '' ?>>Urgente</option>

                                    </select>
                                </div>

                                <div class="col-auto col-form-label-sm">
                                    <label class="my-0">Técnico:</label>
                                    <select class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" name="tecnico" id="tecnico">
                                        <option value="">Todos</option>
                                        <?php foreach ($todosTecnicos as $tecnico) : ?>
                                            <option value="<?= $tecnico['staffid'] ?>" <?= (isset($_POST['tecnico']) && $_POST['tecnico'] == $tecnico['staffid']) ? 'selected' : '' ?>>
                                                <?= $tecnico['firstname'] . ' ' . $tecnico['lastname'] ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>

                                <button type="submit" name="filtrar" class="btn btn-sm btn-info my-1 mr-3 ml-3 mt-4">Filtrar</button>

                                <button type="button" class="btn btn-sm btn-outline-info my-1 mt-4" onclick="limparFiltros()">Limpar</button>

                                <div class="col-auto">
                                    <a href="./srhomeMKT.php" class="btn btn-sm btn-outline-info my-1 mt-4">
                                        <i class="fas fa-calendar-alt"></i> Filtro Avançado
                                    </a>
                                </div>

                                <div class="col-auto pt-3 mt-1">
                                    <button class="btn btn-sm btn-outline-info">Total de Atendimentos: <?= $count_atendimentos ?></button>
                                </div>

                                <!-- Campos ocultos para ordenação -->
                                <input type="hidden" name="ord" id="ord" value="<?= htmlspecialchars($_POST['ord'] ?? '') ?>">
                                <input type="hidden" name="order_dir" id="order_dir" value="<?= htmlspecialchars($_POST['order_dir'] ?? 'ASC') ?>">
                            </div>
                        </form>
                    </div>

                    <div class="mkt-list-card">
                        <div class="table-container">
                            <table class="table table-hover small">
                                <thead>
                                    <tr>
                                        <?php
                                        $colunas = [
                                            'id' => 'ID',
                                            'name' => 'Título',
                                            'nome_cliente' => 'Nome Cliente',
                                            'priority' => 'Prioridade',
                                            'total_artes' => 'Nº Artes',
                                            'nome_tecnico' => 'Designer',
                                            'nome_direcionador' => 'Direcionado por',
                                            'status' => 'Status',
                                            'inicio' => 'Criação',
                                            'prazo' => 'Prazo',
                                            'finalizado' => 'Finalizado'
                                        ];

                                        foreach ($colunas as $campo => $titulo) {
                                            $ord = $_POST['ord'] ?? '';
                                            $dir = $_POST['order_dir'] ?? 'ASC';
                                            $nextDir = ($ord == $campo && $dir == 'ASC') ? 'DESC' : 'ASC';
                                            echo "<th>
                                                    <form method='POST' style='display:inline;'>
                                                        <input type='hidden' name='ord' value='$campo'>
                                                        <input type='hidden' name='order_dir' value='$nextDir'>";
                                            // Manter filtros ao ordenar
                                            foreach ($_POST as $key => $val) {
                                                if ($key != 'ord' && $key != 'order_dir') {
                                                    if (is_array($val)) {
                                                        foreach ($val as $v) {
                                                            echo "<input type='hidden' name='{$key}[]' value='" . htmlspecialchars($v) . "'>";
                                                        }
                                                    } else {
                                                        echo "<input type='hidden' name='$key' value='" . htmlspecialchars($val) . "'>";
                                                    }
                                                }
                                            }
                                            echo "<button type='submit' class='btn btn-light btn-sm btn-block'><i class='fas fa-sort'></i> $titulo</button>
                                                    </form>
                                                </th>";
                                        }
                                        ?>
                                    </tr>
                                </thead>
                                <tbody id="mktRows">
                                    <?= renderMktRows($todosAtendimentos) ?>
                                    <?php if (false) : foreach ($todosAtendimentos as $atendimento) : ?>
                                        <tr>
                                            <td><strong>#<?= $atendimento['id'] ?></strong></td>
                                            <td><?= htmlspecialchars($atendimento['name']) ?></td>
                                            <td><strong><?= htmlspecialchars($atendimento['nome_cliente']) ?></strong></td>
                                            <td>
                                                <?php
                                                $prio = $atendimento['priority'];
                                                $cores = [1 => 'success', 2 => 'warning', 3 => 'custom', 4 => 'danger'];
                                                $labels = [1 => 'Baixa', 2 => 'Média', 3 => 'Alta', 4 => 'Urgente'];
                                                if ($prio == 0) {
                                                    echo '<span class="badge badge-secondary">NA</span>';
                                                } elseif ($prio == 3) {
                                                    echo '<span class="badge" style="color: black; background-color: #FF8C00;">Alta</span>';
                                                } else {
                                                    echo "<span class='badge badge-{$cores[$prio]}'>{$labels[$prio]}</span>";
                                                }
                                                ?>
                                            </td>
                                            <td><?= $atendimento['total_artes'] ?></td>
                                            <td><?= htmlspecialchars($atendimento['nome_tecnico'] . ' ' . $atendimento['sobrenome_tecnico']) ?></td>
                                            <td><?= htmlspecialchars($atendimento['nome_direcionador'] . ' ' . $atendimento['sobrenome_direcionador']) ?></td>
                                            <td><?= htmlspecialchars($atendimento['status']) ?></td>
                                            <td><?= $atendimento['inicio'] ?></td>
                                            <td><?= $atendimento['prazo'] ?></td>
                                            <td><?= $atendimento['finalizado'] ?></td>
                                            <td class="align-middle p-1">
                                                <form action="mkt_atd.php" method="POST">
                                                    <input type="hidden" name="mkt_atd" value="<?php echo $atendimento['id']; ?>">
                                                    <button type="submit" class="btn btn-light btn-sm p-1"><i class="far fa-folder-open"></i></button>
                                                </form>
                                            </td>
                                        </tr>
                                    <?php endforeach; endif; ?>
                                </tbody>
                            </table>
                            <div id="mktLoader" class="mkt-loader <?= $hasMore ? 'is-visible' : '' ?>">
                                <?= $hasMore ? 'Role ate o fim para carregar mais atendimentos' : 'Todos os atendimentos foram exibidos' ?>
                            </div>
                        </div>
                    </div> <!-- card-body -->
                </div> <!-- card -->
            </div> <!-- col -->
        </div> <!-- row -->
    </div> <!-- container -->

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
    <script src="../js/bootstrap-select.min.js"></script>

    <script>
        function normalizeMktSelects(scope) {
            if (!window.jQuery || !$.fn.selectpicker) {
                return;
            }

            $(scope || document).find('.selectpicker').each(function() {
                var $select = $(this);
                $select.attr('data-container', 'body');
                $select.attr('data-width', '100%');

                if ($select.data('selectpicker')) {
                    $select.selectpicker('refresh');
                } else {
                    $select.selectpicker({
                        container: 'body',
                        width: '100%',
                        dropupAuto: false,
                        size: 8
                    });
                }
            });
        }

        normalizeMktSelects(document);

        $(document).on('shown.bs.select', '.selectpicker', function() {
            var $select = $(this);
            var $button = $select.parent('.bootstrap-select').find('> button.dropdown-toggle');
            var $container = $('.bs-container.bootstrap-select').last();
            var $menu = $container.find('> .dropdown-menu');

            if ($button.length && $menu.length) {
                var width = Math.min(Math.max($button.outerWidth(), 180), 420, window.innerWidth - 24);
                $container.css({
                    width: width,
                    minWidth: width,
                    maxWidth: width
                });
                $menu.css({
                    width: width,
                    minWidth: width,
                    maxWidth: width
                });
            }
        });

        function limparFiltros() {
            // Limpa todos os inputs e selects
            document.querySelectorAll('#mktFilterForm input, #mktFilterForm select').forEach(element => {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    element.checked = false;
                } else if (element.tagName === 'SELECT') {
                    element.selectedIndex = 0;
                } else {
                    element.value = '';
                }
            });

            normalizeMktSelects(document);

            document.getElementById('mktFilterForm').submit();
        }
    </script>

    <script>
        function toggleAllStatuses() {
            const checkboxes = document.querySelectorAll("input[name='status[]']");
            const master = document.getElementById("select-all-status");
            checkboxes.forEach(c => c.checked = master.checked);
        }
    </script>

    <script>
        (function() {
            var tableContainer = document.querySelector('.table-container');
            var rowsContainer = document.getElementById('mktRows');
            var loader = document.getElementById('mktLoader');
            var filterForm = document.getElementById('mktFilterForm');
            var nextPage = <?= $hasMore ? ($page + 1) : 'null' ?>;
            var loading = false;
            var hasMore = <?= $hasMore ? 'true' : 'false' ?>;

            function bindRowOpen(scope) {
                (scope || document).querySelectorAll('.mkt-row').forEach(function(row) {
                    if (row.dataset.boundOpen === '1') {
                        return;
                    }
                    row.dataset.boundOpen = '1';
                    row.addEventListener('dblclick', function(event) {
                        if (event.target.closest('button, form, input, select, textarea, a')) {
                            return;
                        }
                        var id = row.getAttribute('data-mkt-id');
                        if (!id) {
                            return;
                        }
                        var form = document.createElement('form');
                        form.method = 'POST';
                        form.action = 'mkt_atd.php';
                        var input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'mkt_atd';
                        input.value = id;
                        form.appendChild(input);
                        document.body.appendChild(form);
                        form.submit();
                    });
                });
            }

            function setLoader(text, visible) {
                if (!loader) {
                    return;
                }
                loader.textContent = text;
                loader.classList.toggle('is-visible', visible);
            }

            function loadMore() {
                if (!hasMore || loading || !nextPage || !filterForm || !rowsContainer) {
                    return;
                }
                loading = true;
                setLoader('Carregando mais atendimentos...', true);

                var data = new FormData(filterForm);
                data.set('ajax_mode', 'append');
                data.set('page', String(nextPage));

                fetch('home.php', {
                    method: 'POST',
                    body: data,
                    credentials: 'same-origin'
                })
                    .then(function(response) {
                        return response.json();
                    })
                    .then(function(payload) {
                        if (!payload || !payload.ok) {
                            throw new Error('Resposta inválida');
                        }
                        var temp = document.createElement('tbody');
                        temp.innerHTML = payload.html || '';
                        Array.prototype.slice.call(temp.children).forEach(function(row) {
                            rowsContainer.appendChild(row);
                        });
                        bindRowOpen(rowsContainer);
                        hasMore = !!payload.pagination.hasMore;
                        nextPage = payload.pagination.nextPage;
                        setLoader(hasMore ? 'Role ate o fim para carregar mais atendimentos' : 'Todos os atendimentos foram exibidos', true);
                    })
                    .catch(function() {
                        setLoader('Nao foi possivel carregar mais atendimentos.', true);
                    })
                    .finally(function() {
                        loading = false;
                    });
            }

            if (tableContainer) {
                tableContainer.addEventListener('scroll', function() {
                    if (tableContainer.scrollTop + tableContainer.clientHeight >= tableContainer.scrollHeight - 120) {
                        loadMore();
                    }
                });
            }

            bindRowOpen(document);
        })();
    </script>
</body>

</html>
