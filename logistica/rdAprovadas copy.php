<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m9_02 < 2) {
    header("Location: ../home.php");
    exit;
}

// if (!isset($_SESSION['allterusN3Id'])) {
//     header("Location: ../index.php");

//     exit;
// }

$pdo = ConnectionN3rd();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");
$id_allterus = (int)$_SESSION['allterusN3Id'];
$usuarioStmt = $pdo->prepare("SELECT * FROM user WHERE id_allterus = :id");
$usuarioStmt->execute([':id' => $id_allterus]);
$usuario = $usuarioStmt->fetch(PDO::FETCH_ASSOC);

// if (!$usuario || $usuario['type'] != 1) {
//     header("Location: ../index.php");
//     exit;
// }

$dataIni = $_GET['data_inicio'] ?? date('Y-m-01');
$dataInicio = $_GET['data_inicio'] ?? '2025-01-01';
$dataFim = $_GET['data_fim'] ?? date('Y-m-t');
$filtroData = "";
$params = [];
if ($dataInicio && $dataFim) {
    $filtroData = "AND r.date_created BETWEEN :inicio AND :fim";
    $params[':inicio'] = $dataInicio;
    $params[':fim'] = $dataFim . " 23:59:59";
}


$stmtAguardandoGeral = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance WHERE status = 1 AND aj = 1");
$stmtAguardandoGeral->execute();
$totalAguardandoGeral = $stmtAguardandoGeral->fetchColumn();

$stmtAprovadoGeral = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance WHERE status = 2 AND aj = 1");
$stmtAprovadoGeral->execute();
$totalAprovadoGeral = $stmtAprovadoGeral->fetchColumn();


$stmtAguardando = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance r WHERE r.status = 1 AND r.aj = 1 $filtroData");
$stmtAguardando->execute($params);
$totalAguardando = $stmtAguardando->fetchColumn();

$stmtAprovado = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance r WHERE r.status = 2 AND r.aj = 1 $filtroData");
$stmtAprovado->execute($params);
$totalAprovado = $stmtAprovado->fetchColumn();

$stmtPagas = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance r WHERE r.status = 4 AND r.aj = 1 $filtroData");
// $stmtPagas = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance r WHERE r.status = 4 AND r.aj = 1 $filtroData");
$stmtPagas->execute($params);
$totalPagas = $stmtPagas->fetchColumn();

$stmtTotalAguardando = $pdo->prepare("SELECT COUNT(*) FROM running_balance r WHERE r.status = 1 AND r.aj = 1 $filtroData");
$stmtTotalAguardando->execute($params);
$countTotalAguardando = $stmtTotalAguardando->fetchColumn();

$stmtTotalAprovado = $pdo->prepare("SELECT COUNT(*) FROM running_balance r WHERE r.status = 2 AND r.aj = 1 $filtroData");
$stmtTotalAprovado->execute($params);
$countTotalAprovado = $stmtTotalAprovado->fetchColumn();

//... (O resto das suas queries PHP continua igual)
$stmtCategorias = $pdo->prepare("SELECT c.categories, SUM(r.amount) as balance FROM running_balance r INNER JOIN category c ON c.id = r.category_id WHERE r.status IN (2) AND r.aj = 1 $filtroData GROUP By c.categories ORDER BY balance DESC");
$stmtCategorias->execute($params);
$categoriasResumo = $stmtCategorias->fetchAll(PDO::FETCH_ASSOC);

$stmtEmpresas = $pdo->prepare("SELECT r.cliente, SUM(r.amount) as balance FROM running_balance r WHERE r.status IN (2) AND r.aj = 1 $filtroData GROUP BY r.cliente ORDER BY balance DESC");
$stmtEmpresas->execute($params);
$empresasResumo = $stmtEmpresas->fetchAll(PDO::FETCH_ASSOC);

$stmt = $pdo->prepare("SELECT u.firstname, u.lastname, SUM(r.amount) AS balance FROM running_balance r JOIN user u ON u.id = r.user_id WHERE r.status IN (2) AND r.aj = 1 $filtroData GROUP BY u.id ORDER BY balance DESC");
$stmt->execute($params);
$usuariosResumo = $stmt->fetchAll(PDO::FETCH_ASSOC);

?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <title>RD - Administrador</title>
    <style>
        body {
            zoom: 0.9;
        }

        .resumo-box .btn {
            text-transform: uppercase;
            font-size: 0.75rem;
            font-weight: bold;
        }

        /* .card-body,
        .table {
            font-size: 0.85rem !important;
        }

        .table-container {
            max-height: 85vh;
            overflow-y: auto;
            display: block;
            border: 1px solid #dee2e6;
        } */

        .card-body,
        .table {
            font-size: 0.85rem !important;
        }

        .tabela {
            overflow-y: auto;
            max-height: calc(100vh - 380px);
            /* Ajuste se quiser mais ou menos espaço */
            width: 100%;
            padding: 0;
            font-size: 0.85rem;
            color: #333;
        }

        .tabela .card {
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .tabela .card-body {
            flex: 1 1 auto;
            overflow-y: auto;
        }


        .card-metric .card-body {
            transition: transform 0.2s;
        }

        .card-metric:hover .card-body {
            transform: translateY(-5px);
        }

        .border-left-warning {
            border-left: .25rem solid #ffc107 !important;
        }

        .border-left-info {
            border-left: .25rem solid #17a2b8 !important;
        }

        .border-left-success {
            border-left: .25rem solid #28a745 !important;
        }

        .border-left-danger {
            border-left: .25rem solid #dc3545 !important;
        }

        .summary-table-container {
            max-height: 350px;
            overflow-y: auto;
        }

        a.card-metric-link {
            text-decoration: none;
            color: inherit;
        }

        .text-xs {
            font-size: .8rem;
        }
    </style>
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid mt-2">
        <div class="card">
            <div class="card-header py-2">
                <div class="row">
                    <div class="col-md-6 mt-2 mb-0 ml-2 row">
                        <h4 class="m-0 font-weight-bold">Painel Financeiro</h4>
                        <a href="gestaoRD.php" class="ml-4"><i class="fas fa-home" style="font-size: 25px;" data-toggle="tooltip" title="Home RD"></i></a>
                    </div>
                    <div class="col-md-6 text-right">
                        <form method="GET" class="form-inline justify-content-end">
                            <label class="mr-2 small">De:</label>
                            <input type="date" name="data_inicio" class="form-control form-control-sm mr-2" value="<?= htmlspecialchars($_GET['data_inicio'] ?? $dataInicio) ?>">
                            <label class="mr-2 small">Até:</label>
                            <input type="date" name="data_fim" class="form-control form-control-sm mr-2" value="<?= htmlspecialchars($_GET['data_fim'] ?? $dataFim) ?>">
                            <button type="submit" class="btn btn-sm btn-primary mr-2">Filtrar</button>
                            <a href="gestaoRD.php" class="btn btn-sm btn-secondary">Limpar</a>
                        </form>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <div class="container-fluid">
                    <div class="row text-center resumo-box mt-0">
                        <div class="col-md-4 mb-2">
                            <div class="card border-left-warning shadow h-100 py-2 card-metric">
                                <div class="card-body">
                                    <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Aguardando Aprovação</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800">R$ <?= number_format($totalAguardandoGeral, 2, ',', '.') ?></div>
                                </div>
                                <div class="m-1">
                                    <button id="btnVerRegistradas" class="btn btn-sm btn-outline-dark">Ver Resumo</button>
                                    <button id="btnAprovarPendentes" class="btn btn-sm btn-warning">Aprovar</button>
                                </div>
                            </div>
                            </a>
                        </div>

                        <div class="col-md-4 mb-3">
                            <div class="card border-left-info shadow h-100 py-2 card-metric">
                                <div class="card-body">
                                    <div class="text-xs font-weight-bold text-info text-uppercase mb-1">Aprovadas Aguardando Pagamento</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800">R$ <?= number_format($totalAprovadoGeral, 2, ',', '.') ?></div>
                                </div>

                                <div class="mt-2">
                                    <button id="btnVerAprovadas" class="btn btn-sm btn-outline-dark">Ver Resumo</button>
                                    <?php if ($m9_02 > 2) : ?>
                                        <button id="btnPagarAprovadas" class="btn btn-sm btn-primary">Pagar</button>
                                    <?php endif; ?>
                                    <?php if ($m9_02 == 2) : ?>
                                        <button id="btnAprovarPendentes2" class="btn btn-sm btn-warning">Aprovar</button>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-4 mb-3">
                            <div class="card border-left-info shadow h-100 py-2 card-metric">
                                <div class="card-body">
                                    <div class="text-xs font-weight-bold text-success text-uppercase mb-1"><i class="fas fa-money-check-alt "></i> Pagas</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800">R$ <?= number_format($totalPagas, 2, ',', '.') ?></span></div>
                                </div>
                                <div class="mt-2">
                                    <button id="btnVerPagas" class="btn btn-sm btn-outline-dark">Ver Resumo</button>
                                    <button id="btnRelatorio" class="btn btn-sm btn-secondary">Relatório</button>
                                </div>
                            </div>
                        </div>
                    </div>



                    <div class="text-center m-0 p-0">
                        <hr class="m-1">
                        <h4 class="m-0 p-0">Aprovadas Aguardando Pagamento</h4>
                        <hr class="m-1 mb-3">
                    </div>

                    <div class="row tabela">
                        <div class="col-lg-4 mb-4">
                            <div class="card shadow">
                                <div class="card-header bg-dark text-white">Por Categoria</div>
                                <div class="card-body summary-table-container">
                                    <table class="table table-sm table-hover">
                                        <?php foreach ($categoriasResumo as $item) : ?>
                                            <tr>
                                                <td><?= htmlspecialchars($item['categories']) ?></td>
                                                <td class="text-right font-weight-bold">R$ <?= number_format($item['balance'], 2, ',', '.') ?></td>
                                            </tr>
                                        <?php endforeach;
                                        if (empty($categoriasResumo)) echo '<tr><td colspan="2" class="text-center text-muted">Nenhum dado.</td></tr>'; ?>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4 mb-4">
                            <div class="card shadow">
                                <div class="card-header bg-dark text-white">Por Cliente</div>
                                <div class="card-body summary-table-container">
                                    <table class="table table-sm table-hover">
                                        <?php foreach ($empresasResumo as $item) : ?>
                                            <tr>
                                                <td><?= htmlspecialchars($item['cliente']) ?></td>
                                                <td class="text-right font-weight-bold">R$ <?= number_format($item['balance'], 2, ',', '.') ?></td>
                                            </tr>
                                        <?php endforeach;
                                        if (empty($empresasResumo)) echo '<tr><td colspan="2" class="text-center text-muted">Nenhum dado.</td></tr>'; ?>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4 mb-4">
                            <div class="card shadow">
                                <div class="card-header bg-dark text-white">Por Colaborador</div>
                                <div class="card-body summary-table-container">
                                    <table class="table table-sm table-hover">
                                        <?php foreach ($usuariosResumo as $item) : ?>
                                            <tr>
                                                <td><?= htmlspecialchars($item['firstname']) ?></td>
                                                <td class="text-right font-weight-bold">R$ <?= number_format($item['balance'], 2, ',', '.') ?></td>
                                            </tr>
                                        <?php endforeach;
                                        if (empty($usuariosResumo)) echo '<tr><td colspan="2" class="text-center text-muted">Nenhum dado.</td></tr>'; ?>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

    <script>
        $(document).ready(function() {
            // --- Variáveis vindas do PHP ---
            const countTotalAguardando = <?= (int)($countTotalAguardando ?? 0) ?>;
            const countTotalAprovado = <?= (int)($countTotalAprovado ?? 0) ?>;

            // --- Funções de Ação ---

            $('#btnVerRegistradas').on('click', verRegistradas);

            function verRegistradas() {
                window.location.href = 'rdRegistradas.php?data_inicio=<?= $dataInicio ?>&data_fim=<?= $dataFim ?>';
            }

            $('#btnVerAprovadas').on('click', verAprovadas);

            function verAprovadas() {
                window.location.href = 'rdAprovadas.php?data_inicio=<?= $dataInicio ?>&data_fim=<?= $dataFim ?>';
            }

            $('#btnVerPagas').on('click', verPagas);

            function verPagas() {
                window.location.href = 'gestaoRD.php?data_inicio=<?= $dataInicio ?>&data_fim=<?= $dataFim ?>';
            }

            $('#btnAprovarPendentes').on('click', aprovarPendentes);
            $('#btnAprovarPendentes2').on('click', aprovarPendentes);

            function aprovarPendentes() {
                if (countTotalAguardando === 0) {
                    alert('Nenhuma despesa pendente de aprovação!');
                    return;
                }
                window.location.href = 'aprovarRD.php';
            }

            $('#btnPagarAprovadas').on('click', pagarAprovadas);

            function pagarAprovadas() {
                if (countTotalAprovado === 0) {
                    alert('Nenhuma despesa pendente de pagamento!');
                    return;
                }
                window.location.href = 'pagarRD.php';
            }

            $('#btnVerRelatorio').on('click', verRelatorioFinanceiro);

            function relatorio() {
                window.location.href = 'detalharRD.php?data_inicio=<?= $dataInicio ?>&data_fim=<?= $dataFim ?>';
            }

            function verRelatorioFinanceiro() {
                window.location.href = 'rdFinanceiro.php?data_inicio=<?= $dataInicio ?>&data_fim=<?= $dataFim ?>';
            }


            $('#btnRelatorio').on('click', relatorio);
        });
    </script>
</body>

</html>