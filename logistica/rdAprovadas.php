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

$pdo = ConnectionN3();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

$id_usuario_sessao = (int)$_SESSION['allterusN3Id'];
$usuarioStmt = $pdo->prepare("SELECT * FROM usuarios WHERE user_id = :id");
$usuarioStmt->execute([':id' => $id_usuario_sessao]);
$usuario = $usuarioStmt->fetch(PDO::FETCH_ASSOC);

// --- LÓGICA DE FILTROS E TOTAIS ---

$dataInicio = $_GET['data_inicio'] ?? date('Y-m-01');
$dataFim = $_GET['data_fim'] ?? date('Y-m-t');
$filtroData = "";
$params = [];

if ($dataInicio && $dataFim) {
    $filtroData = "AND r.date_created BETWEEN :inicio AND :fim";
    $params[':inicio'] = $dataInicio;
    $params[':fim'] = $dataFim . " 23:59:59";
}

// Total Aguardando (respeita o filtro de data)
$stmtAguardando = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance r WHERE r.status = 1 AND r.aj = 1 $filtroData");
$stmtAguardando->execute($params);
$totalAguardando = $stmtAguardando->fetchColumn();

// Total Aprovado (respeita o filtro de data)
$stmtAprovado = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance r WHERE r.status = 2 AND r.aj = 1 $filtroData");
$stmtAprovado->execute($params);
$totalAprovado = $stmtAprovado->fetchColumn();

$totalAprovadoGeral = $pdo->query("SELECT IFNULL(SUM(amount), 0) FROM running_balance WHERE status = 2 AND aj = 1")->fetchColumn();

// Total Pago (respeita o filtro de data)
$stmtPagas = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance r WHERE r.status = 4 AND r.aj = 1 $filtroData");
$stmtPagas->execute($params);
$totalPagas = $stmtPagas->fetchColumn();

// Contagem Aguardando (respeita o filtro de data)
$stmtTotalAguardando = $pdo->prepare("SELECT COUNT(*) FROM running_balance r WHERE r.status = 1 AND r.aj = 1 $filtroData");
$stmtTotalAguardando->execute($params);
$countTotalAguardando = $stmtTotalAguardando->fetchColumn();

// Contagem Aprovado (respeita o filtro de data)
$stmtTotalAprovado = $pdo->prepare("SELECT COUNT(*) FROM running_balance r WHERE r.status = 2 AND r.aj = 1 $filtroData");
$stmtTotalAprovado->execute($params);
$countTotalAprovado = $stmtTotalAprovado->fetchColumn();


// ## NOVA LÓGICA PARA ALERTA DE MESES ANTERIORES ##
$totalAprovadoAnterior = 0;
// Verifica se a visualização é a padrão do mês atual
if (($dataInicio == date('Y-m-01')) && ($dataFim == date('Y-m-t'))) {
    $primeiroDiaMesAtual = date('Y-m-01');

    // Calcula o total aprovado ANTES do início deste mês
    $sqlAnterior = "SELECT IFNULL(SUM(amount), 0) 
                    FROM running_balance 
                    WHERE status = 2 AND aj = 1 AND date_created < :primeiroDiaMesAtual";

    $stmtAnterior = $pdo->prepare($sqlAnterior);
    $stmtAnterior->execute([':primeiroDiaMesAtual' => $primeiroDiaMesAtual]);
    $totalAprovadoAnterior = $stmtAnterior->fetchColumn();
}


// ## LÓGICA SIMPLIFICADA PARA RESUMOS ##

// Resumo por Categoria (sem data de corte)
$sqlCategorias = "SELECT c.nome AS categories, SUM(r.amount) as balance 
                  FROM running_balance r 
                  JOIN categorias_subgrupo c ON c.id = r.category_id 
                  WHERE r.status = 2 AND r.aj = 1 AND c.aplicavel IN ('Ambos', 'RD') $filtroData
                  GROUP BY c.id, c.nome
                  ORDER BY balance DESC";
$stmtCategorias = $pdo->prepare($sqlCategorias);
$stmtCategorias->execute($params);
$categoriasResumo = $stmtCategorias->fetchAll(PDO::FETCH_ASSOC);


// Resumo por Cliente 
$stmtEmpresas = $pdo->prepare("SELECT r.cliente, SUM(r.amount) as balance FROM running_balance r WHERE r.status = 2 AND r.aj = 1 $filtroData GROUP BY r.cliente ORDER BY balance DESC");
$stmtEmpresas->execute($params);
$empresasResumo = $stmtEmpresas->fetchAll(PDO::FETCH_ASSOC);

// Resumo por Colaborador
$stmtUsuarios = $pdo->prepare("SELECT u.user_id, u.user_nome, SUM(r.amount) AS balance FROM running_balance r JOIN usuarios u ON u.user_id = r.user_id WHERE r.status = 2 AND r.aj = 1 $filtroData GROUP BY u.user_id, u.user_nome ORDER BY balance DESC");
$stmtUsuarios->execute($params);
$usuariosResumo = $stmtUsuarios->fetchAll(PDO::FETCH_ASSOC);

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
            overflow: hidden;

        }

        .resumo-box .btn {
            text-transform: uppercase;
            font-size: 0.75rem;
            font-weight: bold;
        }

        .card-principal {
            min-height: calc(100vh - 60px);
            max-height: calc(100vh - 60px);
            /* desabilitar scroll */
            overflow-y: hidden;
        }

        .card-body,
        .table {
            font-size: 0.85rem !important;

        }

        .tabela {
            overflow-y: auto;
            /* max-height: calc(100vh - 380px); */
            /* Ajuste se quiser mais ou menos espaço */
            width: 100%;
            padding: 0;
            font-size: 0.85rem;
            color: #333;
        }

        .tabela .card {
            height: 98%;
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

        /* Estilos para a matriz expansível */
        .linha-resumo {
            /* Antiga .summary-row */
            cursor: pointer;
            -webkit-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }

        .linha-resumo:hover {
            background-color: #f5f5f5;
        }

        .linha-detalhes>td {
            /* Antiga .details-row */
            padding: 0 !important;
            border: 0 !important;
        }

        .conteudo-detalhes {
            /* Antiga .details-content */
            padding: 15px;
            background-color: #f8f9fa;
            border-top: 2px solid #dee2e6;
        }

        .icone-expandir {
            /* Antiga .expand-icon */
            margin-right: 8px;
            color: #007bff;
            transition: transform 0.2s ease-in-out;
        }

        .resumo-box .fa-exclamation-triangle {
            font-size: 14px;
        }

        .resumo-box .badge-danger {
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
            animation: pulse-glow 2s infinite;
        }

        @keyframes pulse-glow {
            0% {
                box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
            }

            70% {
                box-shadow: 0 0 0 10px rgba(220, 53, 69, 0);
            }

            100% {
                box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
            }
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid mt-2">
        <div class="d-flex flex-column" style="min-height: 100vh;">

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

                <div class="card-body card-principal mt-0">
                    <div class="container-fluid">
                        <div class="row text-center resumo-box mt-0">

                            <div class="col-md-4 mb-3 mt-0">
                                <div class="card border-left-warning shadow h-100 py-2 card-metric">
                                    <div class="card-body">
                                        <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Aguardando Aprovação</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800">R$ <?= number_format($totalAguardando, 2, ',', '.') ?></div>
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
                                        <?php if ($m9_02 > 3) : ?>
                                            <button id="btnPagarAprovadas" class="btn btn-sm btn-primary">Pagar</button>
                                            <?php // Exibe o ícone de alerta SE houver valor pendente de meses anteriores 
                                            ?>
                                            <!-- <?php if ($totalAprovadoAnterior > 0) : ?>
                                                <span class="badge badge-danger" style="position: absolute; top: 5px; right: 5px;" title="Existem R$ <?= number_format($totalAprovadoAnterior, 2, ',', '.') ?> em pendências do mês anterior, totalizando R$ <?= number_format($totalAprovadoAnterior + $totalAprovado, 2, ',', '.') ?>">
                                                    <i class="fas fa-exclamation-triangle"> Atenção!</i>
                                                </span>
                                            <?php endif; ?> -->
                                            <?php if ($totalAprovadoAnterior > 0) : ?>
                                                <span class="badge badge-danger pulse-glow" style="position: absolute; top: 5px; right: 5px; padding: .35em .65em;" title="Existem R$ <?= number_format($totalAprovadoAnterior, 2, ',', '.') ?> em pendências de meses anteriores.">

                                                    <i class="fas fa-exclamation-triangle"></i>
                                                    <span class="fonte-poppins">Atenção!</span>

                                                </span>
                                            <?php endif; ?>
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
                                        <button id="btnRelatorio" class="btn btn-sm btn-secondary">Relatério</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="text-center m-0 p-0">
                            <hr class="m-1">
                            <!-- <h4 class="m-0 p-0">Despesas Pagas</h4> -->
                            <h4 class="m-0 p-0">Aprovadas Aguardando Pagamento</h4>
                            <hr class="m-1 mb-3">
                        </div>

                        <div class="row tabela">
                            <div class="col-lg-4 mb-4">
                                <div class="card shadow">
                                    <div class="card-header bg-dark text-white">Por Categoria</div>
                                    <div class="card-body">
                                        <table class="table table-sm table-hover">
                                            <?php foreach ($categoriasResumo as $item) : ?>
                                                <tbody class="container-resumo">
                                                    <tr class="linha-resumo" data-tipo="categoria" data-identificador="<?= htmlspecialchars($item['categories']) ?>">
                                                        <td>
                                                            <i class="fas fa-plus icone-expandir"></i>
                                                            <?= htmlspecialchars($item['categories']) ?>
                                                        </td>
                                                        <td class="text-right font-weight-bold">R$ <?= number_format($item['balance'], 2, ',', '.') ?></td>
                                                    </tr>
                                                    <tr class="linha-detalhes" style="display: none;">
                                                        <td colspan="2"></td>
                                                    </tr>
                                                </tbody>
                                            <?php endforeach;
                                            if (empty($categoriasResumo)) echo '<tr><td colspan="2" class="text-center text-muted">Nenhum dado.</td></tr>'; ?>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-4 mb-4">
                                <div class="card shadow">
                                    <div class="card-header bg-dark text-white">Por Cliente</div>
                                    <div class="card-body">
                                        <table class="table table-sm table-hover">
                                            <?php foreach ($empresasResumo as $item) : ?>
                                                <tbody class="container-resumo">
                                                    <tr class="linha-resumo" data-tipo="cliente" data-identificador="<?= htmlspecialchars($item['cliente']) ?>">
                                                        <td>
                                                            <i class="fas fa-plus icone-expandir"></i>
                                                            <?= htmlspecialchars($item['cliente']) ?>
                                                        </td>
                                                        <td class="text-right font-weight-bold" style="width: 100px;">R$ <?= number_format($item['balance'], 2, ',', '.') ?></td>
                                                    </tr>
                                                    <tr class="linha-detalhes" style="display: none;">
                                                        <td colspan="2"></td>
                                                    </tr>
                                                </tbody>
                                            <?php endforeach;
                                            if (empty($empresasResumo)) echo '<tr><td colspan="2" class="text-center text-muted">Nenhum dado.</td></tr>'; ?>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-4 mb-4">
                                <div class="card shadow">
                                    <div class="card-header bg-dark text-white">Por Colaborador</div>
                                    <div class="card-body">
                                        <table class="table table-sm table-hover">
                                            <?php foreach ($usuariosResumo as $item) : ?>
                                                <tbody class="container-resumo">
                                                    <tr class="linha-resumo" data-tipo="colaborador" data-identificador="<?= $item['user_id'] ?>">
                                                        <td>
                                                            <i class="fas fa-plus icone-expandir"></i>
                                                            <?= htmlspecialchars($item['user_nome']) ?>
                                                        </td>
                                                        <td class="text-right font-weight-bold">R$ <?= number_format($item['balance'], 2, ',', '.') ?></td>
                                                    </tr>
                                                    <tr class="linha-detalhes" style="display: none;">
                                                        <td colspan="2"></td>
                                                    </tr>
                                                </tbody>
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
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
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

            // --- CÓDIGO PARA MATRIZ EXPANSÍVEL ---
            $('.linha-resumo').on('click', function() {
                const linhaResumo = $(this);
                const linhaDetalhes = linhaResumo.next('.linha-detalhes');
                const jaCarregado = linhaDetalhes.attr('data-carregado') === 'true';
                const icone = linhaResumo.find('.icone-expandir'); // Pega o elemento do ícone

                // --- LÓGICA PARA TROCAR O ÍCONE ---
                // Verifica qual ícone está presente e troca para o outro
                if (icone.hasClass('fa-plus')) {
                    icone.removeClass('fa-plus').addClass('fa-minus');
                } else {
                    icone.removeClass('fa-minus').addClass('fa-plus');
                }
                // -----------------------------------

                // O resto do código permanece o mesmo
                linhaDetalhes.toggle();

                if (linhaDetalhes.is(':visible') && !jaCarregado) {
                    const tipo = linhaResumo.data('tipo');
                    const identificador = linhaResumo.data('identificador');
                    const dataInicio = '<?= $dataInicio ?>';
                    const dataFim = '<?= $dataFim ?>';
                    const containerDetalhes = linhaDetalhes.find('td');

                    containerDetalhes.html('<div class="conteudo-detalhes text-center">Carregando...</div>');

                    // A chamada AJAX continua exatamente a mesma
                    $.ajax({
                        url: 'buscar_detalhesRD.php',
                        type: 'GET',
                        data: {
                            status: 2,
                            tipo,
                            identificador,
                            data_inicio: dataInicio,
                            data_fim: dataFim
                        },
                        dataType: 'json',
                        success: function(resposta) {
                            let htmlConteudo = '';
                            if (resposta.erro) {
                                htmlConteudo = '<div class="alert alert-danger mb-0">' + resposta.erro + '</div>';
                            } else if (resposta.length === 0) {
                                htmlConteudo = '<p class="text-center text-muted mb-0">Nenhum registro encontrado.</p>';
                            } else {
                                let htmlTabela = '<table class="table table-sm table-striped mb-0">';
                                htmlTabela += '<thead><tr><th>ID</th><th>Data</th><th>Colaborador</th><th>Descrição</th><th class="text-right">Valor</th></tr></thead><tbody>';

                                let total = 0;
                                resposta.forEach(function(item) {
                                    const data = new Date(item.date_created);
                                    const dataFormatada = ('0' + data.getDate()).slice(-2) + '/' + ('0' + (data.getMonth() + 1)).slice(-2) + '/' + data.getFullYear();
                                    const valorFormatado = parseFloat(item.amount).toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    });

                                    htmlTabela += `
                            <tr>
                                <td>${item.id}</td>
                                <td>${dataFormatada}</td>
                                <td>${item.user_nome}</td>
                                <td>${item.remarks || ''}</td>
                                <td class="text-right">${valorFormatado}</td>
                            </tr>
                        `;
                                    total += parseFloat(item.amount);
                                });

                                htmlTabela += '</tbody><tfoot><tr><th colspan="4" class="text-right">Total:</th><th class="text-right">' + total.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }) + '</th></tr></tfoot>';
                                htmlTabela += '</table>';
                                htmlConteudo = htmlTabela;
                            }

                            containerDetalhes.html('<div class="conteudo-detalhes">' + htmlConteudo + '</div>');
                            linhaDetalhes.attr('data-carregado', 'true');
                        },
                        error: function(jqXHR, textStatus, errorThrown) {
                            console.error("Erro na chamada AJAX:", textStatus, errorThrown, jqXHR.responseText);
                            containerDetalhes.html('<div class="conteudo-detalhes"><div class="alert alert-danger">Ocorreu um erro ao buscar os detalhes.</div></div>');
                        }
                    });
                }
            });
        });
    </script>
</body>

</html>