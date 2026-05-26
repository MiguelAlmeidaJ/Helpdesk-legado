<?php
session_start();

require_once "../all/seguranca.php";
require_once "../all/conect.php";
require_once "../all/permissoes.php";

if ($m9_02 < 2) {
    header("Location: ../home.php");
    exit;
}

$pdo = connectionN3();
if (!$pdo) {
    exit("Erro ao conectar ao banco.");
}

$userId = (int) $_SESSION['allterusN3Id'];

/* =======================
   FILTROS
======================= */
$dataInicio = $_GET['date_start'] ?? date('Y-m-01');
$dataFim    = $_GET['date_end']   ?? date('Y-m-t');
$userFiltro = $_GET['user_id']    ?? null;
$cliente    = $_GET['cliente']    ?? null;
$categorias = $_GET['category_id'] ?? [];

$categorias = is_array($categorias)
    ? array_map('intval', $categorias)
    : [];

/* =======================
   USUÁRIO LOGADO
======================= */
$usuario = $pdo->prepare("SELECT user_id FROM usuarios WHERE user_id = ?");
$usuario->execute([$userId]);
$usuario = $usuario->fetch();

/* =======================
   SQL DINÂMICO
======================= */
$params = [
    ':inicio' => $dataInicio,
    ':fim'    => $dataFim
];

$where = "WHERE r.status = 4 
          AND r.aj = 1
          AND DATE(r.date_created) BETWEEN :inicio AND :fim";

/* Restrição por usuário */
if (!in_array($userId, [3, 4, 96])) {
    $where .= " AND r.user_id = :user_logado";
    $params[':user_logado'] = $userId;
} elseif (!empty($userFiltro)) {
    $where .= " AND r.user_id = :user_filtro";
    $params[':user_filtro'] = $userFiltro;
}

/* Cliente */
if (!empty($cliente)) {
    $where .= " AND r.cliente = :cliente";
    $params[':cliente'] = $cliente;
}

/* Categorias */
if ($categorias) {
    $in = [];
    foreach ($categorias as $i => $cat) {
        $key = ":cat$i";
        $in[] = $key;
        $params[$key] = $cat;
    }
    $where .= " AND r.category_id IN (" . implode(',', $in) . ")";
}

/* =======================
   CONSULTA
======================= */
$sql = "
SELECT
    r.id,
    r.date_updated,
    r.amount,
    r.remarks,
    r.cliente,
    u.user_nome,
    cs.nome AS categoria
FROM running_balance r
JOIN usuarios u ON u.user_id = r.user_id
LEFT JOIN categorias_subgrupo cs ON cs.id = r.category_id
$where
ORDER BY r.date_created ASC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

$total = array_sum(array_column($resultados, 'amount'));

/* =======================
   DADOS PARA FILTROS
======================= */
$usuarios  = $pdo->query("SELECT user_id, user_nome FROM usuarios WHERE user_sts = 1 ORDER BY user_nome")->fetchAll();
$clientes  = $pdo->query("SELECT clt_nomef FROM clientes GROUP BY clt_nomef ORDER BY clt_nomef")->fetchAll();
$cats      = $pdo->query("SELECT id, nome FROM categorias_subgrupo WHERE aplicavel = 'RD' ORDER BY nome")->fetchAll();

?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css" />
    <link rel="stylesheet" href="../fontawesome/css/all.css" />
    <link rel="stylesheet" href="https://cdn.datatables.net/1.10.25/css/dataTables.bootstrap4.min.css" />
    <link rel="stylesheet" href="https://cdn.datatables.net/buttons/1.7.1/css/buttons.bootstrap4.min.css" />
    <title>Relatério de Pagamentos</title>
    <style>
        /* =========================
   RESET CONTROLADO
========================= */
        * {
            box-sizing: border-box;
        }

        body {
            font-family: Inter, Arial, sans-serif;
            background-color: #f1f5f9;
            color: #1e293b;
            line-height: 1.4;
        }

        /* =========================
   CONTAINER
========================= */
        .container {
            max-width: 100%;
            padding: 20px;
        }

        /* =========================
   HEADER
========================= */
        .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
            margin-bottom: 24px;
        }

        .header-text h3 {
            margin: 0;
            font-weight: 600;
        }

        .subtitle {
            font-size: 14px;
            color: #64748b;
        }

        /* =========================
   FORMULÁRIO DE FILTRO
========================= */
        form.row {
            background: #ffffff;
            padding: 12px;
            border-radius: 8px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, .05);
        }

        form label {
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 4px;
        }

        .form-control,
        .form-select {
            font-size: 13px;
            padding: 6px 8px;
        }

        /* =========================
   BOTÕES
========================= */
        .btn {
            font-size: 13px;
            padding: 6px 10px;
        }

        /* =========================
   TABELA
========================= */
        .table-responsive {
            overflow-x: auto;
        }

        .table {
            width: 100%;
            table-layout: fixed;
            /* ?? evita estouro */
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
        }

        .table th,
        .table td {
            font-size: 13px;
            padding: 8px;
            vertical-align: middle;
            white-space: normal;
            /* ?? permite quebra */
            word-break: break-word;
            /* ?? quebra texto grande */
        }

        .table th {
            background-color: #f8fafc;
            font-weight: 600;
            color: #334155;
        }

        /* =========================
   COLUNAS ESPECÍFICAS
========================= */
        .table td:nth-child(1),
        .table th:nth-child(1) {
            width: 110px;
            /* Data */
        }

        .table td:nth-child(2),
        .table th:nth-child(2) {
            width: 90px;
            /* Pedido */
        }

        .table td:nth-child(3),
        .table th:nth-child(3) {
            width: 90px;
            /* NF */
        }

        .table td:nth-child(5),
        .table th:nth-child(5) {
            width: 140px;
            /* CNPJ */
        }

        .table td:last-child,
        .table th:last-child {
            width: 110px;
        }

        /* =========================
   STATUS
========================= */
        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            text-align: center;
            white-space: nowrap;
        }

        .status-authorized {
            background: #dcfce7;
            color: #166534;
        }

        .status-canceled {
            background: #fee2e2;
            color: #991b1b;
        }

        /* =========================
   DROPDOWN / SELECT
========================= */
        .dropdown-menu {
            z-index: 1055;
            /* ?? acima da tabela */
        }

        select {
            max-width: 100%;
        }

        /* =========================
   RESPONSIVO
========================= */
        @media (max-width: 992px) {
            .table {
                font-size: 12px;
            }

            .header-container {
                flex-direction: column;
                align-items: flex-start;
            }
        }

        /* =========================
   PRINT / PDF
========================= */
        @media print {

            body {
                background: #fff !important;
            }

            .menu-lateral,
            .header-actions,
            form {
                display: none !important;
            }

            .container {
                padding: 0;
                margin: 0;
            }

            table {
                font-size: 11px;
                width: 100%;
                table-layout: fixed;
            }

            th,
            td {
                padding: 4px 6px;
                word-break: break-word;
                white-space: normal;
            }

            th {
                background: #eee !important;
                color: #000 !important;
            }

            .status {
                padding: 2px 6px;
                font-size: 10px;
            }
        }
    </style>

</head>

<body>

    <?php include "../all/sidebar.php"; ?>

    <div class="container">

        <!-- =======================
         CABEÇALHO
    ======================== -->
        <div class="header-container">
            <div class="header-text">
                <h3>Relatério de Pagamentos</h3>
                <div class="subtitle">
                    Período de <?= date('d/m/Y', strtotime($dataInicio)) ?>
                    até <?= date('d/m/Y', strtotime($dataFim)) ?>
                </div>
            </div>
        </div>

        <!-- =======================
         FILTROS
    ======================== -->
        <form method="GET" class="row g-2 mb-3">

            <div class="col-md-2">
                <label>De</label>
                <input type="date" name="date_start" value="<?= $dataInicio ?>" class="form-control">
            </div>

            <div class="col-md-2">
                <label>Até</label>
                <input type="date" name="date_end" value="<?= $dataFim ?>" class="form-control">
            </div>

            <div class="col-md-3">
                <label>Cliente</label>
                <select name="cliente" class="form-control">
                    <option value="">Todos</option>
                    <?php foreach ($clientes as $c) : ?>
                        <option value="<?= htmlspecialchars($c['clt_nomef']) ?>" <?= ($cliente == $c['clt_nomef']) ? 'selected' : '' ?>>
                            <?= htmlspecialchars($c['clt_nomef']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="col-md-3">
                <label>Usuário</label>
                <select name="user_id" class="form-control">
                    <option value="">Todos</option>
                    <?php foreach ($usuarios as $u) : ?>
                        <option value="<?= $u['user_id'] ?>" <?= ($userFiltro == $u['user_id']) ? 'selected' : '' ?>>
                            <?= htmlspecialchars($u['user_nome']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="col-md-2 d-flex align-items-end gap-2">
                <button class="btn btn-primary w-100">
                    <i class="fas fa-filter"></i> Filtrar
                </button>
            </div>

        </form>

        <!-- =======================
         TABELA
    ======================== -->
        <div class="table-responsive">
            <table id="dataTable" class="table table-bordered table-striped">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Usuário</th>
                        <th>Categoria</th>
                        <th>Cliente</th>
                        <th>Observações</th>
                        <th class="text-end">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!$resultados) : ?>
                        <tr>
                            <td colspan="6" class="text-center">
                                Nenhum registro encontrado
                            </td>
                        </tr>
                    <?php else : ?>
                        <?php foreach ($resultados as $r) : ?>
                            <tr>
                                <td><?= date('d/m/Y', strtotime($r['date_updated'])) ?></td>
                                <td><?= htmlspecialchars($r['user_nome']) ?></td>
                                <td><?= htmlspecialchars($r['categoria']) ?></td>
                                <td><?= htmlspecialchars($r['cliente']) ?></td>
                                <td><?= nl2br(htmlspecialchars($r['remarks'])) ?></td>
                                <td class="text-end">
                                    R$ <?= number_format($r['amount'], 2, ',', '.') ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="5" class="text-end">Total</th>
                        <th class="text-end">
                            R$ <?= number_format($total, 2, ',', '.') ?>
                        </th>
                    </tr>
                </tfoot>
            </table>
        </div>

    </div>

    <!-- =======================
     SCRIPTS
======================== -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.bundle.min.js"></script>

    <script src="https://cdn.datatables.net/1.10.25/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.10.25/js/dataTables.bootstrap4.min.js"></script>

    <script src="https://cdn.datatables.net/buttons/1.7.1/js/dataTables.buttons.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/1.7.1/js/buttons.bootstrap4.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/1.7.1/js/buttons.html5.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/1.7.1/js/buttons.print.min.js"></script>

    <script>
        $(function() {
            $('#dataTable').DataTable({
                language: {
                    url: "https://cdn.datatables.net/plug-ins/1.10.25/i18n/Portuguese-Brasil.json"
                },
                paging: true,
                searching: false,
                order: [
                    [0, 'asc']
                ],
                pageLength: 25,
                dom: 'Bfrtip',
                buttons: [{
                        extend: 'print',
                        text: '<i class="fas fa-print"></i> Imprimir',
                        className: 'btn btn-secondary btn-sm'
                    },
                    {
                        extend: 'excelHtml5',
                        text: '<i class="fas fa-file-excel"></i> Excel',
                        className: 'btn btn-success btn-sm'
                    }
                ]
            });
        });
    </script>

</body>

</html>