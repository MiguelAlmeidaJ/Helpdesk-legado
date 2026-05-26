<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m9_03 < 1) {
    header("Location: ../home.php");
    exit;
}

$pdo = ConnectionN3();
setlocale(LC_TIME, 'pt_BR', 'pt_BR.utf-8', 'portuguese');

$ano_selecionado = isset($_GET['ano']) ? filter_var($_GET['ano'], FILTER_VALIDATE_INT) : date('Y');
$mes_selecionado = isset($_GET['mes']) ? filter_var($_GET['mes'], FILTER_VALIDATE_INT) : date('m');
$ano_selecionado = $ano_selecionado ?: date('Y');
$mes_selecionado = $mes_selecionado ?: date('m');

// --- 1. CÁLCULO DOS KPIs ---
$stmt_kpi = $pdo->prepare("
    SELECT
        COALESCE(SUM(cr.valor_total), 0) AS previsto,
        COALESCE(SUM(r.total_recebido_no_ano), 0) AS recebido,
        COALESCE(SUM(CASE WHEN cr.data_vencimento >= CURDATE() THEN cr.saldo ELSE 0 END), 0) AS a_vencer,
        COALESCE(SUM(CASE WHEN cr.data_vencimento < CURDATE() THEN cr.saldo ELSE 0 END), 0) AS inadimplencia,
        COALESCE(SUM(CASE WHEN cr.data_vencimento < CURDATE() AND cr.data_vencimento BETWEEN DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01') AND LAST_DAY(CURDATE() - INTERVAL 1 MONTH) THEN cr.saldo ELSE 0 END), 0) AS inadimplencia_mes_anterior
    FROM contas_receber cr
    LEFT JOIN (SELECT id_conta_receber, SUM(valor_recebido) as total_recebido_no_ano FROM recebimentos WHERE YEAR(data_recebimento) = :ano GROUP BY id_conta_receber) r ON cr.id = r.id_conta_receber
    WHERE YEAR(cr.data_vencimento) = :ano
");
$stmt_kpi->execute([':ano' => $ano_selecionado]);
$kpis = $stmt_kpi->fetch(PDO::FETCH_ASSOC);
$inadimplencia_percent = ($kpis['previsto'] > 0) ? ($kpis['inadimplencia_mes_anterior'] / $kpis['previsto']) * 100 : 0;

// --- 2. DADOS GRÁFICO DE BARRAS ---
$dados_previsto = array_fill(1, 12, 0);
$dados_realizado = array_fill(1, 12, 0);
$stmt_previsto = $pdo->prepare("SELECT MONTH(data_vencimento) as mes, SUM(valor_total) as total FROM contas_receber WHERE YEAR(data_vencimento) = :ano GROUP BY mes");
$stmt_previsto->execute([':ano' => $ano_selecionado]);
while ($row = $stmt_previsto->fetch(PDO::FETCH_ASSOC)) {
    $dados_previsto[$row['mes']] = (float)$row['total'];
}
$stmt_realizado = $pdo->prepare("SELECT MONTH(data_recebimento) as mes, SUM(valor_recebido) as total FROM recebimentos WHERE YEAR(data_recebimento) = :ano GROUP BY mes");
$stmt_realizado->execute([':ano' => $ano_selecionado]);
while ($row = $stmt_realizado->fetch(PDO::FETCH_ASSOC)) {
    $dados_realizado[$row['mes']] = (float)$row['total'];
}

// --- 3. DADOS GRÁFICO DE SETORES ---
$stmt_setores = $pdo->prepare("SELECT g.nome as grupo_nome, SUM(r.valor_recebido) AS total FROM recebimentos r JOIN contas_receber cr ON r.id_conta_receber = cr.id JOIN categorias_grupo g ON cr.id_grupo = g.id WHERE YEAR(r.data_recebimento) = :ano AND MONTH(r.data_recebimento) = :mes GROUP BY g.nome ORDER BY total DESC");
$stmt_setores->execute([':ano' => $ano_selecionado, ':mes' => $mes_selecionado]);
$dados_setores = $stmt_setores->fetchAll(PDO::FETCH_ASSOC);

// --- 4. DADOS PARA AS ABAS ---
$params = [':ano' => $ano_selecionado, ':mes' => $mes_selecionado];

$stmt_avencer = $pdo->prepare("SELECT c.clt_nomef, cr.saldo FROM contas_receber cr JOIN clientes c ON cr.id_cliente = c.clt_id WHERE cr.status IN ('Pendente', 'Parcialmente Recebido') AND cr.data_vencimento >= CURDATE() AND YEAR(cr.data_vencimento) = :ano AND MONTH(cr.data_vencimento) = :mes ORDER BY cr.saldo DESC LIMIT 10");
$stmt_avencer->execute($params);
$a_vencer_lista = $stmt_avencer->fetchAll(PDO::FETCH_ASSOC);

$stmt_vencido = $pdo->prepare("SELECT c.clt_nomef, cr.saldo FROM contas_receber cr JOIN clientes c ON cr.id_cliente = c.clt_id WHERE cr.status IN ('Pendente', 'Parcialmente Recebido') AND cr.data_vencimento < CURDATE() AND YEAR(cr.data_vencimento) = :ano AND MONTH(cr.data_vencimento) = :mes ORDER BY cr.saldo DESC LIMIT 10");
$stmt_vencido->execute($params);
$vencido_lista = $stmt_vencido->fetchAll(PDO::FETCH_ASSOC);

$stmt_recebido = $pdo->prepare("SELECT c.clt_nomef, r.valor_recebido FROM recebimentos r JOIN contas_receber cr ON r.id_conta_receber = cr.id JOIN clientes c ON cr.id_cliente = c.clt_id WHERE YEAR(r.data_recebimento) = :ano AND MONTH(r.data_recebimento) = :mes ORDER BY r.valor_recebido DESC LIMIT 10");
$stmt_recebido->execute($params);
$recebido_lista = $stmt_recebido->fetchAll(PDO::FETCH_ASSOC);

// --- 5. GRÁFICO DE INADIMPLÊNCIA ---
$stmt_inadimplencia = $pdo->prepare("SELECT c.clt_nomef, SUM(cr.saldo) as total_devido FROM contas_receber cr JOIN clientes c ON cr.id_cliente = c.clt_id WHERE cr.status IN ('Pendente', 'Parcialmente Recebido') AND cr.data_vencimento < CURDATE() AND YEAR(cr.data_vencimento) = :ano GROUP BY c.clt_nomef ORDER BY total_devido DESC LIMIT 10");
$stmt_inadimplencia->execute([':ano' => $ano_selecionado]);
$inadimplencia_clientes = $stmt_inadimplencia->fetchAll(PDO::FETCH_ASSOC);

$meses_pt = [1 => 'Janeiro', 2 => 'Fevereiro', 3 => 'Março', 4 => 'Abril', 5 => 'Maio', 6 => 'Junho', 7 => 'Julho', 8 => 'Agosto', 9 => 'Setembro', 10 => 'Outubro', 11 => 'Novembro', 12 => 'Dezembro'];

?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <title>Dashboard de Receitas</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0"></script>
    <style>
        body {
            background-color: #f0f2f5;
        }

        .kpi-card {
            border-left: 4px solid;
            background-color: #fff;
            border-radius: .375rem;
        }

        .kpi-card-previsto {
            border-left-color: #6c757d;
        }

        .kpi-card-recebido {
            border-left-color: #17a2b8;
        }

        .kpi-card-avencer {
            border-left-color: #28a745;
        }

        .kpi-card-inadimplencia {
            border-left-color: #dc3545;
        }

        .kpi-valor {
            font-size: 1.5rem;
            font-weight: 600;
        }

        .kpi-label {
            font-size: 0.8rem;
            color: #6c757d;
            text-transform: uppercase;
        }

        .chart-card {
            background-color: #fff;
            border-radius: .375rem;
            padding: 1.25rem;
        }

        .list-group-item-sm {
            padding: .5rem .75rem;
            font-size: 0.85rem;
        }

        .nav-pills .nav-link {
            font-size: 0.8rem;
            padding: .3rem .7rem;
            color: #6c757d;
        }

        .nav-pills .nav-link.active {
            background-color: #343a40;
            color: #fff;
        }

        .card-scrollable {
            height: 320px;
            overflow-y: auto;
        }

        .chart-container {
            position: relative;
            height: 350px;
            width: 100%;
        }

        .chart-container-sm {
            position: relative;
            height: 300px;
            width: 100%;
        }

        .debug-box {
            background-color: #ffc;
            border: 1px solid #ccc;
            padding: 15px;
            margin-bottom: 20px;
            font-family: monospace;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .navbar-nav {
            zoom: 0.9 !important;
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid p-3">


        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="m-0 text-dark font-weight-bold">Controle Financeiro: Receitas</h5>
            <form method="GET" action="" class="form-inline">
                <div class="form-group mr-2"><select name="mes" class="form-control form-control-sm"><?php foreach ($meses_pt as $num => $nome) : ?><option value="<?= $num ?>" <?= ($num == $mes_selecionado) ? 'selected' : '' ?>><?= $nome ?></option><?php endforeach; ?></select></div>
                <div class="form-group mr-2"><select name="ano" class="form-control form-control-sm"><?php for ($ano = date('Y') + 1; $ano >= date('Y') - 5; $ano--) : ?><option value="<?= $ano ?>" <?= ($ano == $ano_selecionado) ? 'selected' : '' ?>><?= $ano ?></option><?php endfor; ?></select></div>
                <button type="submit" class="btn btn-sm btn-dark"><i class="fas fa-filter mr-1"></i>Filtrar</button>
            </form>
        </div>

        <div class="row">
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card kpi-card kpi-card-previsto shadow-sm h-100">
                    <div class="card-body py-2">
                        <div class="kpi-label">Previsto (Ano)</div>
                        <div class="kpi-valor">R$ <?= number_format($kpis['previsto'], 2, ',', '.') ?></div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card kpi-card kpi-card-recebido shadow-sm h-100">
                    <div class="card-body py-2">
                        <div class="kpi-label">Recebido (Ano)</div>
                        <div class="kpi-valor">R$ <?= number_format($kpis['recebido'], 2, ',', '.') ?></div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card kpi-card kpi-card-avencer shadow-sm h-100">
                    <div class="card-body py-2">
                        <div class="kpi-label">A vencer (Geral)</div>
                        <div class="kpi-valor">R$ <?= number_format($kpis['a_vencer'], 2, ',', '.') ?></div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="card kpi-card kpi-card-inadimplencia shadow-sm h-100">
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between">
                            <div class="kpi-label">Inadimplência M.A.</div><span class="badge badge-danger"><?= number_format($inadimplencia_percent, 1, ',', '.') ?>%</span>
                        </div>
                        <div class="kpi-valor">R$ <?= number_format($kpis['inadimplencia_mes_anterior'], 2, ',', '.') ?></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-lg-7 mb-3">
                <div class="chart-card shadow-sm">
                    <h6 class="font-weight-bold">Previsto x Realizado (<?= $ano_selecionado ?>)</h6>
                    <div class="chart-container"><canvas id="graficoPrevistoRealizado"></canvas></div>
                </div>
            </div>
            <div class="col-lg-5 mb-3">
                <div class="chart-card shadow-sm">
                    <ul class="nav nav-pills mb-2" id="pills-tab" role="tablist">
                        <li class="nav-item"><a class="nav-link active" data-toggle="pill" href="#pills-avencer">A vencer (Mês)</a></li>
                        <li class="nav-item"><a class="nav-link" data-toggle="pill" href="#pills-vencido">Vencido (Mês)</a></li>
                        <li class="nav-item"><a class="nav-link" data-toggle="pill" href="#pills-recebido">Recebido (Mês)</a></li>
                    </ul>
                    <div class="tab-content" id="pills-tabContent">
                        <div class="tab-pane fade show active card-scrollable" id="pills-avencer">
                            <ul class="list-group list-group-flush"><?php if (empty($a_vencer_lista)) : ?><li class="list-group-item text-muted">Nenhum registro a vencer para este mês.</li><?php else : foreach ($a_vencer_lista as $item) : ?><li class="list-group-item list-group-item-sm d-flex justify-content-between align-items-center"><span><?= htmlspecialchars($item['clt_nomef']) ?></span><span class="font-weight-bold">R$ <?= number_format($item['saldo'], 2, ',', '.') ?></span></li><?php endforeach;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    endif; ?></ul>
                        </div>
                        <div class="tab-pane fade card-scrollable" id="pills-vencido">
                            <ul class="list-group list-group-flush"><?php if (empty($vencido_lista)) : ?><li class="list-group-item text-muted">Nenhum registro vencido para este mês.</li><?php else : foreach ($vencido_lista as $item) : ?><li class="list-group-item list-group-item-sm d-flex justify-content-between align-items-center"><span><?= htmlspecialchars($item['clt_nomef']) ?></span><span class="font-weight-bold text-danger">R$ <?= number_format($item['saldo'], 2, ',', '.') ?></span></li><?php endforeach;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            endif; ?></ul>
                        </div>
                        <div class="tab-pane fade card-scrollable" id="pills-recebido">
                            <ul class="list-group list-group-flush"><?php if (empty($recebido_lista)) : ?><li class="list-group-item text-muted">Nenhum registro recebido para este mês.</li><?php else : foreach ($recebido_lista as $item) : ?><li class="list-group-item list-group-item-sm d-flex justify-content-between align-items-center"><span><?= htmlspecialchars($item['clt_nomef']) ?></span><span class="font-weight-bold text-info">R$ <?= number_format($item['valor_recebido'], 2, ',', '.') ?></span></li><?php endforeach;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    endif; ?></ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-lg-6 mb-3">
                <div class="chart-card shadow-sm">
                    <h6 class="font-weight-bold">Recebimento por Setor (<?= $meses_pt[$mes_selecionado] ?>)</h6>
                    <div class="chart-container-sm"><canvas id="graficoSetores"></canvas></div>
                </div>
            </div>
            <div class="col-lg-6 mb-3">
                <div class="chart-card shadow-sm">
                    <h6 class="font-weight-bold">Inadimplência Acumulada por Cliente (Top 10 / <?= $ano_selecionado ?>)</h6>
                    <div class="chart-container-sm"><canvas id="graficoInadimplencia"></canvas></div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

    <script>
        console.group('🔍 DEBUG DASHBOARD');

        console.log('Filtros Ativos:', {
            mes: <?= json_encode($mes_selecionado) ?>,
            ano: <?= json_encode($ano_selecionado) ?>
        });

        console.log('Dados para "A Vencer":', <?= json_encode($a_vencer_lista) ?>);
        console.log('Dados para "Vencido":', <?= json_encode($vencido_lista) ?>);
        console.log('Dados para "Recebido":', <?= json_encode($recebido_lista) ?>);

        console.groupEnd();
    </script>
    <script>
        // O CÓDIGO DOS GRÁFICOS CONTINUA AQUI (sem alterações)
        Chart.register(ChartDataLabels);
        Chart.defaults.font.family = "'Segoe UI', 'Roboto', 'Arial', sans-serif";
        Chart.defaults.font.size = 12;
        Chart.defaults.color = '#6c757d';

        document.addEventListener('DOMContentLoaded', function() {
            const formatadorReais = (value) => 'R$ ' + new Intl.NumberFormat('pt-BR', {
                notation: "compact",
                maximumFractionDigits: 1
            }).format(value);
            new Chart(document.getElementById('graficoPrevistoRealizado').getContext('2d'), {
                /* ... options ... */
                type: 'bar',
                data: {
                    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                    datasets: [{
                        label: 'Previsto',
                        data: <?= json_encode(array_values($dados_previsto)) ?>,
                        type: 'line',
                        borderColor: '#6c757d',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointBackgroundColor: '#6c757d',
                        pointRadius: 4,
                        fill: false,
                        tension: 0.1
                    }, {
                        label: 'Recebido',
                        data: <?= json_encode(array_values($dados_realizado)) ?>,
                        backgroundColor: '#17a2b8',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio: window.devicePixelRatio || 1,
                    plugins: {
                        legend: {
                            position: 'top',
                            align: 'start',
                            labels: {
                                usePointStyle: true,
                                boxWidth: 8,
                                padding: 20
                            }
                        },
                        datalabels: {
                            display: (context) => context.dataset.type !== 'line' && context.dataset.data[context.dataIndex] > 0,
                            anchor: 'end',
                            align: 'end',
                            formatter: formatadorReais,
                            font: {
                                size: 10,
                                weight: 'bold'
                            },
                            color: '#555'
                        }
                    },
                    scales: {
                        y: {
                            display: false,
                            grid: {
                                display: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
            const setorData = <?= json_encode($dados_setores) ?>;
            new Chart(document.getElementById('graficoSetores').getContext('2d'), {
                /* ... options ... */
                type: 'bar',
                data: {
                    labels: setorData.map(d => d.grupo_nome),
                    datasets: [{
                        label: 'Total Recebido',
                        data: setorData.map(d => d.total),
                        backgroundColor: '#4DB2AC',
                        borderRadius: 3
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio: window.devicePixelRatio || 1,
                    plugins: {
                        legend: {
                            display: false
                        },
                        datalabels: {
                            anchor: 'end',
                            align: 'end',
                            formatter: (value) => new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            }).format(value),
                            font: {
                                size: 10
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                display: false
                            }
                        },
                        y: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
            const inadData = <?= json_encode($inadimplencia_clientes) ?>;
            new Chart(document.getElementById('graficoInadimplencia').getContext('2d'), {
                /* ... options ... */
                type: 'bar',
                data: {
                    labels: inadData.map(d => d.clt_nomef),
                    datasets: [{
                        label: 'Total Devido',
                        data: inadData.map(d => d.total_devido),
                        backgroundColor: '#dc3545',
                        borderRadius: 3
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio: window.devicePixelRatio || 1,
                    plugins: {
                        legend: {
                            display: false
                        },
                        datalabels: {
                            anchor: 'end',
                            align: 'end',
                            formatter: (value) => new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            }).format(value),
                            font: {
                                size: 10
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                display: false
                            }
                        },
                        y: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        });
    </script>
</body>

</html>