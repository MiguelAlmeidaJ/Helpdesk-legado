<?php
require_once __DIR__ . '/../all/app_url.php';

$query = http_build_query($_GET, '', '&', PHP_QUERY_RFC3986);
$target = allterus_web_url('/logistics/expenses/admin');
if ($query !== '') {
    $target .= '?' . $query;
}
header('Location: ' . $target, true, 302);
exit;

// ARQUIVO ATUALIZADO NOVO FINANCEIRO

session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m9_02 < 2) {
    header("Location: ../home.php");
    exit;
}

// Conexão única com o banco de dados que contém AMBAS as tabelas (antiga e nova)
$pdo = ConnectionN3();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

// Busca o usuário logado na nova tabela 'usuarios'
$id_usuario_sessao = (int)$_SESSION['allterusN3Id'];
$usuarioStmt = $pdo->prepare("SELECT * FROM usuarios WHERE user_id = :id");
$usuarioStmt->execute([':id' => $id_usuario_sessao]);
$usuario = $usuarioStmt->fetch(PDO::FETCH_ASSOC);

// Define o filtro de datas
$dataInicio = $_GET['data_inicio'] ?? date('Y-m-01');
$dataFim = $_GET['data_fim'] ?? date('Y-m-t');
$filtroData = "AND r.date_created BETWEEN :inicio AND :fim";
$params = [
    ':inicio' => $dataInicio,
    ':fim' => $dataFim . " 23:59:59"
];

$statusPermitidosResumo = [1, 2, 4];
$statusResumo = isset($_GET['status']) ? (int)$_GET['status'] : 4;
if (!in_array($statusResumo, $statusPermitidosResumo, true)) {
    $statusResumo = 4;
}

$visoesResumo = [
    1 => ['titulo' => 'Despesas Aguardando Aprovação', 'label' => 'Aguardando Aprovação'],
    2 => ['titulo' => 'Despesas Aprovadas Aguardando Pagamento', 'label' => 'Aprovadas Aguardando Pagamento'],
    4 => ['titulo' => 'Despesas Pagas', 'label' => 'Pagas'],
];
$tituloResumo = $visoesResumo[$statusResumo]['titulo'];
$paramsResumo = $params + [':status_resumo' => $statusResumo];

// --- CÁLCULOS TOTAIS E PARA CARDS (sem alterações) ---
$totalAguardandoGeral = $pdo->query("SELECT IFNULL(SUM(amount), 0) FROM running_balance WHERE status = 1 AND aj = 1")->fetchColumn();

$totalAprovadoGeral = $pdo->query("SELECT IFNULL(SUM(amount), 0) FROM running_balance WHERE status = 2 AND aj = 1")->fetchColumn();

$stmtAguardando = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance r WHERE r.status = 1 AND r.aj = 1 $filtroData");
$stmtAguardando->execute($params);
$totalAguardando = $stmtAguardando->fetchColumn();

$stmtAprovado = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance r WHERE r.status = 2 AND r.aj = 1 $filtroData");
$stmtAprovado->execute($params);
$totalAprovado = $stmtAprovado->fetchColumn();

$stmtPagas = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance r WHERE r.status = 4 AND r.aj = 1 $filtroData");
$stmtPagas->execute($params);
$totalPagas = $stmtPagas->fetchColumn();

$stmtTotalAguardando = $pdo->prepare("SELECT COUNT(*) FROM running_balance r WHERE r.status = 1 AND r.aj = 1 $filtroData");
$stmtTotalAguardando->execute($params);
$countTotalAguardando = $stmtTotalAguardando->fetchColumn();

$stmtTotalAprovado = $pdo->prepare("SELECT COUNT(*) FROM running_balance r WHERE r.status = 2 AND r.aj = 1 $filtroData");
$stmtTotalAprovado->execute($params);
$countTotalAprovado = $stmtTotalAprovado->fetchColumn();

$countTotalAprovadoGeral = $pdo->query("SELECT COUNT(*) FROM running_balance WHERE status = 2 AND aj = 1")->fetchColumn();

// ======================================================================
// ## INÍCIO DA LÓGICA HÍBRIDA PARA RESUMO DE CATEGORIAS ##
// ======================================================================

$dataCorteCategorias = '2025-10-01'; // A partir desta data, usa o novo sistema
$resumoAgregado = [];

// 1. VERIFICA SE O FILTRO INCLUI O PERÍODO ANTIGO (até 30/09/2025)
if ($dataInicio < $dataCorteCategorias) {
    $fimBuscaAntiga = min($dataFim, '2025-09-30');
    $paramsAntigo = [':inicio' => $dataInicio, ':fim' => $fimBuscaAntiga . ' 23:59:59'];
    $sqlAntigo = "SELECT c.categories, SUM(r.amount) as balance 
                  FROM running_balance r 
                  JOIN category c ON c.id = r.category_id 
                  WHERE r.status = :status_resumo AND r.aj = 1 AND r.date_created BETWEEN :inicio AND :fim
                  GROUP BY c.categories";
    $stmtAntigo = $pdo->prepare($sqlAntigo);
    $stmtAntigo->execute($paramsAntigo + [':status_resumo' => $statusResumo]);
    $resultadoAntigo = $stmtAntigo->fetchAll(PDO::FETCH_ASSOC);
    foreach ($resultadoAntigo as $item) {
        $resumoAgregado[$item['categories']] = ($resumoAgregado[$item['categories']] ?? 0) + $item['balance'];
    }
}

// 2. VERIFICA SE O FILTRO INCLUI O PERÍODO NOVO (a partir de 01/10/2025)
if ($dataFim >= $dataCorteCategorias) {
    $inicioBuscaNova = max($dataInicio, $dataCorteCategorias);
    $paramsNovo = [':inicio' => $inicioBuscaNova, ':fim' => $dataFim . ' 23:59:59'];
    $sqlNovo = "SELECT c.nome AS categories, SUM(r.amount) as balance 
                FROM running_balance r 
                JOIN categorias_subgrupo c ON c.id = r.category_id 
                WHERE r.status = :status_resumo AND r.aj = 1 AND c.aplicavel IN ('Ambos', 'RD') AND r.date_created BETWEEN :inicio AND :fim
                GROUP BY c.id, c.nome";
    $stmtNovo = $pdo->prepare($sqlNovo);
    $stmtNovo->execute($paramsNovo + [':status_resumo' => $statusResumo]);
    $resultadoNovo = $stmtNovo->fetchAll(PDO::FETCH_ASSOC);
    foreach ($resultadoNovo as $item) {
        $resumoAgregado[$item['categories']] = ($resumoAgregado[$item['categories']] ?? 0) + $item['balance'];
    }
}

// 3. FORMATA O ARRAY FINAL E ORDENA
$categoriasResumo = [];
foreach ($resumoAgregado as $nome => $total) {
    $categoriasResumo[] = ['categories' => $nome, 'balance' => $total];
}
array_multisort(array_column($categoriasResumo, 'balance'), SORT_DESC, $categoriasResumo);

$totalAmountCategoria = array_sum(array_column($categoriasResumo, 'balance'));

// ======================================================================
// ## FIM DA LÓGICA HÍBRIDA ##
// ======================================================================

// Resumo por Cliente 
$stmtEmpresas = $pdo->prepare("SELECT r.cliente, SUM(r.amount) as balance FROM running_balance r WHERE r.status = :status_resumo AND r.aj = 1 $filtroData GROUP BY r.cliente ORDER BY balance DESC");
$stmtEmpresas->execute($paramsResumo);
$empresasResumo = $stmtEmpresas->fetchAll(PDO::FETCH_ASSOC);

// contar amount por empresa
$totalAmountEmpresa = array_sum(array_column($empresasResumo, 'balance'));



// Resumo por Colaborador 
$stmtUsuarios = $pdo->prepare("SELECT u.user_id, u.user_nome, SUM(r.amount) AS balance FROM running_balance r left JOIN usuarios u ON u.user_id = r.user_id WHERE r.status = :status_resumo AND r.aj = 1 $filtroData GROUP BY u.user_id, u.user_nome ORDER BY balance DESC");
$stmtUsuarios->execute($paramsResumo);
$usuariosResumo = $stmtUsuarios->fetchAll(PDO::FETCH_ASSOC);
// contar amount por colaborador
$totalAmountColaborador = array_sum(array_column($usuariosResumo, 'balance'));

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

        .card-principal {
            max-height: calc(100vh - 80px);

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
            height: 96%;
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
    </style>
    <link rel="stylesheet" href="css/gestao_rd_modern.css">
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid mt-2 gestao-rd-page">
        <div class="d-flex flex-column gestao-rd-shell" style="min-height: 100vh;">

            <div class="card gestao-rd-main-card">
                <div class="card-header py-2">
                    <div class="row">
                        <div class="col-md-6 mt-2 mb-0 ml-2 row">
                            <h4 class="m-0 font-weight-bold gestao-rd-title">Painel Financeiro</h4>
                            <a href="gestaoRD.php" class="ml-4 gestao-rd-home-link"><i class="fas fa-home" style="font-size: 25px;" data-toggle="tooltip" title="Home RD"></i></a>
                        </div>
                        <div class="col-md-6 text-right">
                            <form method="GET" class="form-inline justify-content-end gestao-rd-filter">
                                <input type="hidden" name="status" value="<?= (int)$statusResumo ?>">
                                <label class="mr-2 small">De:</label>
                                <input type="date" name="data_inicio" class="form-control form-control-sm mr-2" value="<?= htmlspecialchars($_GET['data_inicio'] ?? $dataInicio) ?>">
                                <label class="mr-2 small">Até:</label>
                                <input type="date" name="data_fim" class="form-control form-control-sm mr-2" value="<?= htmlspecialchars($_GET['data_fim'] ?? $dataFim) ?>">
                                <button type="submit" class="btn btn-sm btn-primary mr-2"><i class="fas fa-filter"></i> Filtrar</button>
                                <a href="gestaoRD.php" class="btn btn-sm btn-secondary"><i class="fas fa-eraser"></i> Limpar</a>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="card-body card-principal mt-0">
                    <div class="container-fluid">
                        <div class="row text-center resumo-box mt-0">

                            <div class="col-md-4 mb-3 mt-0">
                                <div class="card border-left-warning shadow h-100 py-2 card-metric <?= $statusResumo === 1 ? 'gestao-rd-active' : '' ?>">
                                    <div class="card-body">
                                        <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Aguardando Aprovação</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800">R$ <?= number_format($totalAguardandoGeral, 2, ',', '.') ?></div>
                                    </div>
                                    <div class="m-1">
                                        <button id="btnVerRegistradas" class="btn btn-sm btn-outline-dark">Ver Resumo</button>
                                        <button id="btnAprovarPendentes" class="btn btn-sm btn-warning">Aprovar</button>
                                    </div>
                                </div>
                            </div>

                            <div class="col-md-4 mb-3 mt-0">
                                <div class="card border-left-info shadow h-100 py-2 card-metric <?= $statusResumo === 2 ? 'gestao-rd-active' : '' ?>">
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

                            <div class="col-md-4 mb-3 mt-0">
                                <div class="card border-left-info shadow h-100 py-2 card-metric <?= $statusResumo === 4 ? 'gestao-rd-active' : '' ?>">
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
                            <h4 class="m-0 p-0"><?= htmlspecialchars($tituloResumo) ?></h4>
                            <hr class="m-1 mb-3">
                        </div>

                        <div class="row tabela">
                            <div class="col-lg-4 mb-4">
                                <div class="card shadow">
                                    <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                                        <div>Por Categoria</div>
                                        <!-- <div> Total: <?= $totalAmountCategoria ?> </div> -->
                                    </div>
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
                                    <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                                        <div>Por Cliente</div>
                                        <!-- <div> Total: <?= $totalAmountEmpresa ?> </div> -->
                                    </div>

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
                                    <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                                        <div>Por Colaborador</div>
                                        <!-- <div> Total: <?= $totalAmountColaborador ?> </div> -->
                                    </div>
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
            const countTotalAprovado = <?= (int)($countTotalAprovadoGeral ?? 0) ?>;

            // --- Funções de Ação dos Botões ---
            $('#btnVerRegistradas').on('click', function() {
                window.location.href = 'gestaoRD.php?status=1&data_inicio=<?= $dataInicio ?>&data_fim=<?= $dataFim ?>';
            });

            $('#btnVerAprovadas').on('click', function() {
                window.location.href = 'gestaoRD.php?status=2&data_inicio=<?= $dataInicio ?>&data_fim=<?= $dataFim ?>';
            });

            $('#btnVerPagas').on('click', function() {
                window.location.href = 'gestaoRD.php?status=4&data_inicio=<?= $dataInicio ?>&data_fim=<?= $dataFim ?>';
            });

            function aprovarPendentes() {
                if (countTotalAguardando === 0) {
                    alert('Nenhuma despesa pendente de aprovação!');
                    return;
                }
                window.location.href = 'aprovarRD.php';
            }
            $('#btnAprovarPendentes, #btnAprovarPendentes2').on('click', aprovarPendentes);

            $('#btnPagarAprovadas').on('click', function() {
                if (countTotalAprovado === 0) {
                    alert('Nenhuma despesa pendente de pagamento!');
                    return;
                }
                window.location.href = 'pagarRD.php';
            });

            $('#btnRelatorio').on('click', function() {
                window.location.href = 'detalharRD.php?data_inicio=<?= $dataInicio ?>&data_fim=<?= $dataFim ?>';
            });


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
                            status: <?= (int)$statusResumo ?>,
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
