<?php
// ARQUIVO ATUALIZADO NOVO FINANCEIRO

session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m9_02 < 2) {
    header("Location: ../home.php");
    exit;
}
if (!isset($_SESSION['allterusN3Id'])) {
    header("Location: ../index.php");
    exit;
}

$pdo = connectionN3();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

$dataInicio1 = $_POST['date_start_1'] ?? date('Y-m-01');
$dataFim1     = $_POST['date_end_1'] ?? date('Y-m-t');
$dataInicio2  = $_POST['date_start_2'] ?? date('Y-m-01', strtotime('first day of last month'));
$dataFim2     = $_POST['date_end_2'] ?? date('Y-m-t', strtotime('last day of last month'));
$percent_alert = isset($_POST['percent_alert']) ? (float)$_POST['percent_alert'] : 50;

if (strtotime($dataInicio1) > strtotime($dataInicio2)) {
    $data1Periodo2    = $dataInicio1;
    $data2Periodo2       = $dataFim1;
    $data1Periodo1 = $dataInicio2;
    $data2Periodo1    = $dataFim2;
} else {
    $data1Periodo2    = $dataInicio2;
    $data2Periodo2       = $dataFim2;
    $data1Periodo1 = $dataInicio1;
    $data2Periodo1    = $dataFim1;
}

$params = [
    ':start_current'  => $data1Periodo2,
    ':end_current'    => $data2Periodo2 . ' 23:59:59',
    ':start_previous' => $data1Periodo1,
    ':end_previous'   => $data2Periodo1 . ' 23:59:59'
];

$sqlCategorias = "
    SELECT c.categories AS nome,
           SUM(CASE WHEN r.date_created BETWEEN :start_previous AND :end_previous THEN r.amount ELSE 0 END) as total_anterior,
           SUM(CASE WHEN r.date_created BETWEEN :start_current AND :end_current THEN r.amount ELSE 0 END) as total_atual
    FROM running_balance r
    JOIN category c ON r.category_id = c.id
    WHERE r.status = 4 AND r.aj = 1 AND r.date_created BETWEEN :start_previous AND :end_current
    GROUP BY c.categories ORDER BY total_atual DESC";
$stmtCategorias = $pdo->prepare($sqlCategorias);
$stmtCategorias->execute($params);
$analiseCategorias = $stmtCategorias->fetchAll(PDO::FETCH_ASSOC);

$sqlClientes = "
    SELECT r.cliente AS nome,
           SUM(CASE WHEN r.date_created BETWEEN :start_previous AND :end_previous THEN r.amount ELSE 0 END) as total_anterior,
           SUM(CASE WHEN r.date_created BETWEEN :start_current AND :end_current THEN r.amount ELSE 0 END) as total_atual
    FROM running_balance r
    WHERE r.status = 4 AND r.aj = 1 AND r.cliente IS NOT NULL AND r.cliente != '' AND r.date_created BETWEEN :start_previous AND :end_current
    GROUP BY r.cliente ORDER BY total_atual DESC";
$stmtClientes = $pdo->prepare($sqlClientes);
$stmtClientes->execute($params);
$analiseClientes = $stmtClientes->fetchAll(PDO::FETCH_ASSOC);

$totalAtual = array_sum(array_column($analiseClientes, 'total_atual'));
$totalAnterior = array_sum(array_column($analiseClientes, 'total_anterior'));
$diferenca = $totalAtual - $totalAnterior;

function calcularVariacao($atual, $anterior)
{
    if ($anterior > 0) return (($atual - $anterior) / $anterior) * 100;
    if ($atual > 0) return 100.0;
    return 0.0;
}

$variacaoGeral = calcularVariacao($totalAtual, $totalAnterior);

function formatarDataBR($data)
{
    return date('d/m/Y', strtotime($data));
}

$labelPeriodo1 = "Período 1 <br>(" . formatarDataBR($data1Periodo1) . " até " . formatarDataBR($data2Periodo1) . ")";
$labelPeriodo2 = "Período 2 <br>(" . formatarDataBR($data1Periodo2) . " até " . formatarDataBR($data2Periodo2) . ")";

?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <title>Análise Comparativa de Despesas</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <style>
        body {
            zoom: 0.9;
            width: 100%;
            /* background-color: #f4f6f9; */
            font-size: 0.9rem;
        }

        .card-body {
            overflow-y: auto;
            max-height: calc(100vh - 80px);
        }

        .var-aumento {
            color: #dc3545;
        }

        .var-queda {
            color: #28a745;
        }

        .var-neutro {
            color: #6c757d;
        }

        .bg-warning {
            background-color: rgb(252, 185, 60) !important;
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid pt-2">
        <div class="card shadow-sm">
            <div class="card-header bg-light">
                <div class="row align-items-center">
                    <div class="col-md-6 mt-2 mb-0 ml-2 row">
                        <h4 class="m-0 font-weight-bold">Análise Comparativa de Despesas</h4>
                        <a href="gestaoRD.php" class="ml-4"><i class="fas fa-home" style="font-size: 25px;" data-toggle="tooltip" title="Home RD"></i></a>
                    </div>

                </div>
            </div>
            <div class="card-body">
                <div class="card shadow-sm mb-4">
                    <form method="POST">
                        <div class="row mb-0">
                            <div class="col-md-4 border-right">
                                <h6 class="ml-5 mt-2">Período 1</h6>
                                <div class="form-row mr-5 ml-4">
                                    <div class="form-group col-6">
                                        <label for="date_start_1">De:</label>
                                        <input type="date" name="date_start_1" class="form-control form-control-sm" value="<?= htmlspecialchars($data1Periodo1) ?>">
                                    </div>
                                    <div class="form-group col-6">
                                        <label for="date_end_1">Até:</label>
                                        <input type="date" name="date_end_1" class="form-control form-control-sm" value="<?= htmlspecialchars($data2Periodo1) ?>">
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4 border-right">
                                <h6 class="ml-5 mt-2">Período 2</h6>
                                <div class="form-row mr-5 ml-4">
                                    <div class="form-group col-6">
                                        <label for="date_start_2">De:</label>
                                        <input type="date" name="date_start_2" class="form-control form-control-sm" value="<?= htmlspecialchars($data1Periodo2) ?>">
                                    </div>
                                    <div class="form-group col-6">
                                        <label for="date_end_2">Até:</label>
                                        <input type="date" name="date_end_2" class="form-control form-control-sm" value="<?= htmlspecialchars($data2Periodo2) ?>">
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-2 mt-4">
                                <label class="mt-2">Destacar variação maior que:</label>
                                <select name="percent_alert" class="form-control form-control-sm" onchange="this.form.submit()">
                                    <?php foreach ([0, 10, 20, 30, 50, 75, 100, 150, 200] as $val) : ?>
                                        <option value="<?= $val ?>" <?= ($percent_alert == $val ? 'selected' : '') ?>><?= $val ?>%</option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-2 align-self-center mt-4">
                                <button type="submit" class="btn btn-primary btn-sm mt-3">Analisar</button>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="alert alert-secondary text-center">
                    Total de despesas no 1º período: <strong class="h5 mr-5"><?= number_format($totalAnterior, 2, ',', '.') ?></strong>
                    Total de despesas no 2º período: <strong class="h5 mr-5"><?= number_format($totalAtual, 2, ',', '.') ?></strong>
                    Variação Geral: <strong class="h5 mr-5 <?= $variacaoGeral > 0 ? 'var-aumento' : ($variacaoGeral < 0 ? 'var-queda' : '') ?>"><?= number_format($variacaoGeral, 2, ',', '.') ?>%</strong>
                    Diferença:
                    <strong class="h5 <?= $diferenca > 0 ? 'var-aumento' : ($diferenca < 0 ? 'var-queda' : 'var-neutro') ?>">
                        <?= $diferenca > 0 ? '<i class="fas fa-arrow-up"></i>' : ($diferenca < 0 ? '<i class="fas fa-arrow-down"></i>' : '<i class="fas fa-minus"></i>') ?>
                        <?= number_format($diferenca, 2, ',', '.') ?>
                    </strong>
                </div>

                <div class="row">
                    <div class="col-lg-6 mb-4">
                        <h5 class="mb-3">Análise por Categoria</h5>
                        <table class="table table-sm table-bordered table-hover">
                            <thead class="thead-dark">
                                <tr class="tread-dark">
                                    <th class="text-center ">Categoria</th>
                                    <th class="text-center small"><?= $labelPeriodo1 ?></th>
                                    <th class="text-center small"><?= $labelPeriodo2 ?></th>
                                    <th class="text-center">Variação (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($analiseCategorias as $item) :
                                    $variacao = calcularVariacao($item['total_atual'], $item['total_anterior']);
                                    $classe = ($percent_alert > 0 && $variacao >= $percent_alert) ? 'bg-warning' : '';
                                ?>
                                    <tr class="<?= $classe ?>">
                                        <td><?= htmlspecialchars($item['nome']) ?></td>
                                        <td class="text-right">R$ <?= number_format($item['total_anterior'], 2, ',', '.') ?></td>
                                        <td class="text-right">R$ <?= number_format($item['total_atual'], 2, ',', '.') ?></td>
                                        <td class="text-right font-weight-bold <?= $variacao > 0 ? 'var-aumento' : ($variacao < 0 ? 'var-queda' : 'var-neutro') ?>">
                                            <?= $variacao > 0 ? '<i class="fas fa-arrow-up"></i>' : ($variacao < 0 ? '<i class="fas fa-arrow-down"></i>' : '') ?>
                                            <?= number_format($variacao, 2, ',', '.') ?>%
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>

                    <div class="col-lg-6 mb-4">
                        <h5 class="mb-3">Análise por Cliente</h5>
                        <table class="table table-sm table-bordered table-hover">
                            <thead class="thead-dark">
                                <tr>
                                    <th class="text-center">Cliente</th>
                                    <th class="text-center small"><?= $labelPeriodo1 ?></th>
                                    <th class="text-center small"><?= $labelPeriodo2 ?></th>
                                    <th class="text-center">Variação (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($analiseClientes as $item) :
                                    $variacao = calcularVariacao($item['total_atual'], $item['total_anterior']);
                                    $classe = ($percent_alert > 0 && $variacao >= $percent_alert) ? 'bg-warning' : '';
                                ?>
                                    <tr class="<?= $classe ?>">
                                        <td><?= htmlspecialchars($item['nome']) ?></td>
                                        <td class="text-right">R$ <?= number_format($item['total_anterior'], 2, ',', '.') ?></td>
                                        <td class="text-right">R$ <?= number_format($item['total_atual'], 2, ',', '.') ?></td>
                                        <td class="text-right font-weight-bold <?= $variacao > 0 ? 'var-aumento' : ($variacao < 0 ? 'var-queda' : 'var-neutro') ?>">
                                            <?= $variacao > 0 ? '<i class="fas fa-arrow-up"></i>' : ($variacao < 0 ? '<i class="fas fa-arrow-down"></i>' : '') ?>
                                            <?= number_format($variacao, 2, ',', '.') ?>%
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
</body>

</html>