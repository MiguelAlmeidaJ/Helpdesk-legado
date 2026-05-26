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

// Receber filtros enviados via POST
$idFiltro = $_POST['id'] ?? '';
$tituloFiltro = $_POST['titulo'] ?? '';
$clienteFiltro = $_POST['cliente'] ?? '';
$statusFiltro = $_POST['status'] ?? '';
$prioridadeFiltro = $_POST['prioridade'] ?? '';
$dataFiltro = $_POST['data_1'] ?? '';
$tecnicoFiltro = $_POST['tecnico'] ?? '';
$typeDataFiltro = $_POST['typeDataFiltro'] ?? 1;

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
";

$stmt = $pdoMkt->prepare($query);
$stmt->execute($params);

$count_atendimentos = $stmt->rowCount();
$todosAtendimentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Carregar opçães para filtros
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
            zoom: 0.9;
            width: 100%;
            overflow-x: hidden;
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
            height: 87vh;
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
            white-space: normal;
            word-wrap: break-word;
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

    <div class="container-fluid">
        <div class="row">
            <div class="col-12 mt-2" style="padding-left: 1px; padding-right: 1px;">
                <div class="card w-100" style="overflow-x: auto;">
                    <div class="card-header py-1">
                        <form action="#" method="POST">
                            <div class="form-row align-items-center">
                                <div class="col-auto col-form-label-sm">
                                    <label class="my-0">ID:</label>
                                    <input type="text" name="id" class="form-control form-control-sm my-1" value="<?= isset($_POST['id']) ? htmlspecialchars($_POST['id']) : '' ?>">
                                </div>

                                <div class="col-2 col-form-label-sm">
                                    <label class="my-0">Cliente:</label>
                                    <select class="form-control form-control-sm" name="cliente" id="cliente">
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
                                    <div class="dropdown" style="width: 190px">
                                        <div class="form-control form-control-sm dropdown-toggle dropdown-toggle-split" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="cursor: pointer;">
                                            Selecione
                                        </div>
                                        <div class="dropdown-menu p-2" style="width: 190px; border-radius: 4px;">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="select-all-status" onclick="toggleAllStatuses()">
                                                <label class="form-check-label" for="select-all-status">Todos</label>
                                            </div>
                                            <?php foreach ($todosStatus as $status) : ?>
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" name="status[]" value="<?= $status['id'] ?>" id="status<?= $status['id'] ?>" <?= (isset($_POST['status']) && in_array($status['id'], $_POST['status'])) ? 'checked' : '' ?>>
                                                    <label class="form-check-label" for="status<?= $status['id'] ?>"><?= $status['name'] ?></label>
                                                </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>

                                <div class="col-auto col-form-label-sm">
                                    <label class="my-0">Prioridade:</label>
                                    <select class="form-control form-control-sm" name="prioridade" id="prioridade">
                                        <option value="">Todas</option>
                                        <option value="1" <?= (isset($_POST['prioridade']) && $_POST['prioridade'] == "1") ? 'selected' : '' ?>>Baixa</option>
                                        <option value="2" <?= (isset($_POST['prioridade']) && $_POST['prioridade'] == "2") ? 'selected' : '' ?>>Média</option>
                                        <option value="3" <?= (isset($_POST['prioridade']) && $_POST['prioridade'] == "3") ? 'selected' : '' ?>>Alta</option>
                                        <option value="4" <?= (isset($_POST['prioridade']) && $_POST['prioridade'] == "4") ? 'selected' : '' ?>>Urgente</option>

                                    </select>
                                </div>

                                <div class="col-auto col-form-label-sm">
                                    <label class="my-0">Tecnico:</label>
                                    <select class="form-control form-control-sm" name="tecnico" id="tecnico">
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

                    <div class="card-body p-0">
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
                                <tbody>
                                    <?php foreach ($todosAtendimentos as $atendimento) : ?>
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
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div> <!-- card-body -->
                </div> <!-- card -->
            </div> <!-- col -->
        </div> <!-- row -->
    </div> <!-- container -->

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

    <script>
        function limparFiltros() {
            // Limpa todos os inputs e selects
            document.querySelectorAll('form input, form select').forEach(element => {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    element.checked = false;
                } else if (element.tagName === 'SELECT') {
                    element.selectedIndex = 0;
                } else {
                    element.value = '';
                }
            });


            document.querySelector('form').submit();
        }
    </script>

    <script>
        function toggleAllStatuses() {
            const checkboxes = document.querySelectorAll("input[name='status[]']");
            const master = document.getElementById("select-all-status");
            checkboxes.forEach(c => c.checked = master.checked);
        }
    </script>
</body>

</html>