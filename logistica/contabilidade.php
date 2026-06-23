<?php
// MODO DE DEBUG: HABILITE PARA VER ERROS
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m8_00 == 0) {
    header("Location: ../home.php");
    exit;
}

$pdo = connectionN3(); // Assumindo que esta função retorna a conexão PDO

// ## CAPTURA DOS FILTROS ##
// ## CAPTURA DOS FILTROS UNIFICADOS (Màs/Ano) ##
$tipoFiltro = $_GET['tipo'] ?? 'notas_servico';
$mesFiltro = $_GET['mes'] ?? date('m');
$anoFiltro = $_GET['ano'] ?? date('Y');

$timestamp = mktime(0, 0, 0, $mesFiltro, 1, $anoFiltro);
$dataInicio = date('Y-m-d', $timestamp);
$dataFim = date('Y-m-t', $timestamp);

// Inicializa variáveis
$arquivos = [];
$extrato_data = [];
$tituloPagina = '';

// ## LÓGICA PRINCIPAL PARA CADA TIPO DE VISUALIZAÇÃO ##
if ($tipoFiltro === 'extrato') {
    $tituloPagina = 'Extrato Geral';

    // Query para buscar dados da sua VIEW
    $sql = "SELECT * FROM vw_fluxo_caixa_realizado WHERE data BETWEEN :dataInicio AND :dataFim ORDER BY data ASC, id_tabela_origem ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':dataInicio' => $dataInicio, ':dataFim' => $dataFim]);
    $extrato_data = $stmt->fetchAll(PDO::FETCH_ASSOC);
} else { // Lógica para 'notas_servico' e 'comprov_diversos' (usando Màs/Ano)
    if ($tipoFiltro === 'comprov_diversos') {
        $pastaDocumento = 'comprov_diversos';
        $tituloPagina = 'Comprovantes Diversos';
    } else {
        $pastaDocumento = 'notas_servico';
        $tituloPagina = 'Notas de Serviço';
    }

    $mesesNomes = [1 => 'janeiro', 2 => 'fevereiro', 3 => 'marco', 4 => 'abril', 5 => 'maio', 6 => 'junho', 7 => 'julho', 8 => 'agosto', 9 => 'setembro', 10 => 'outubro', 11 => 'novembro', 12 => 'dezembro'];
    $nomeMes = $mesesNomes[(int)$mesFiltro] ?? 'mes_invalido';
    $diretorioParaBuscar = dirname(__DIR__) . '/uploads_rd/' . $pastaDocumento . '/' . $nomeMes . '_' . $anoFiltro . '/';
    $baseUrlSistema = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/\\');
    $urlBase = $baseUrlSistema . '/uploads_rd/' . $pastaDocumento . '/' . $nomeMes . '_' . $anoFiltro . '/';

    if (is_dir($diretorioParaBuscar)) {
        $arquivosEncontrados = glob($diretorioParaBuscar . '*.pdf');

        foreach ($arquivosEncontrados as $caminhoCompleto) {
            $nomeArquivo = basename($caminhoCompleto);
            $arquivos[] = [
                'nome' => $nomeArquivo,
                'url' => $urlBase . rawurlencode($nomeArquivo),
                'arquivo_relativo' => $pastaDocumento . '/' . $nomeMes . '_' . $anoFiltro . '/' . $nomeArquivo,
                'tamanho' => filesize($caminhoCompleto)
            ];
        }
    }
}

//  LÓGICA PARA EXPORTAÇÃO DE EXCEL ##
if (isset($_GET['action']) && $_GET['action'] === 'download_excel') {
    if (!function_exists('mb_convert_encoding')) {
        die('A extensão PHP mbstring não está habilitada no servidor.');
    }

    // Pega o mês e ano da URL para a exportação
    $mesExport = $_GET['mes'] ?? date('m');
    $anoExport = $_GET['ano'] ?? date('Y');

    // Calcula as datas com base no mês/ano recebido
    $timestampExport = mktime(0, 0, 0, $mesExport, 1, $anoExport);
    $dataInicioExport = date('Y-m-d', $timestampExport);
    $dataFimExport = date('Y-m-t', $timestampExport);

    // Usa as datas calculadas na query
    $sql = "SELECT * FROM vw_fluxo_caixa_realizado WHERE data BETWEEN :dataInicio AND :dataFim ORDER BY data ASC, id_tabela_origem ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':dataInicio' => $dataInicioExport, ':dataFim' => $dataFimExport]);
    $dados_excel = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $nomeArquivo = "Extrato_Geral_" . date('Y-m-d') . ".csv";
    header('Content-Type: text/csv; charset=Windows-1252'); // Informa a codificação correta
    header('Content-Disposition: attachment; filename=' . $nomeArquivo);

    $output = fopen('php://output', 'w');

    $header = [
        'Data',
        'Tipo Mov',
        'Tipo Doc',
        'Descrição',
        'Entrada (Cliente)',
        'Saída (Favorecido)',
        'Obs.',
        'Grupo',
        'Subgrupo',
        'Classificação',
        'Empresa',
        'Valor (R$)'
    ];

    $converter = function ($string) {
        return mb_convert_encoding($string, 'Windows-1252', 'UTF-8');
    };

    fputcsv($output, array_map($converter, $header), ';');

    foreach ($dados_excel as $linha) {
        $csvRow = [
            date('d/m/Y', strtotime($linha['data'])),
            $converter($linha['tipo_movimento'] ?? ''),
            $converter($linha['tipo_documento'] ?? ''),
            $converter($linha['descricao'] ?? ''),
            $converter($linha['entrada_entidade'] ?? ''),
            $converter($linha['saida_entidade'] ?? ''),
            $converter($linha['obs'] ?? ''),
            $converter($linha['grupo'] ?? ''),
            $converter($linha['subgrupo'] ?? ''),
            $converter($linha['classificacao'] ?? ''),
            $converter($linha['empresa'] ?? ''),
            number_format($linha['valor'], 2, ',', '.')
        ];

        fputcsv($output, $csvRow, ';');
    }

    fclose($output);
    exit;
}

// Lógica de açães em massa para ZIP (seu código original)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['acao'])) {
    if (!empty($_POST['arquivos_selecionados']) && is_array($_POST['arquivos_selecionados'])) {

        // --- DOWNLOAD EM ZIP ---
        if ($_POST['acao'] === 'download_zip') {
            $zip = new ZipArchive();
            $nome_zip = sys_get_temp_dir() . '/' . ucfirst($pastaDocumento) . '_' . $nomeMes . '_' . $anoFiltro . '.zip';
            $baseUploads = realpath(dirname(__DIR__) . '/uploads_rd');

            if ($zip->open($nome_zip, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {
                foreach ($_POST['arquivos_selecionados'] as $arquivoRelativo) {
                    $caminhoFisico = realpath($baseUploads . '/' . ltrim($arquivoRelativo, '/\\'));
                    if ($caminhoFisico && strpos($caminhoFisico, $baseUploads) === 0 && file_exists($caminhoFisico)) {
                        $zip->addFile($caminhoFisico, basename($caminhoFisico));
                    }
                }
                $zip->close();

                header('Content-Type: application/zip');
                header('Content-Disposition: attachment; filename="' . basename($nome_zip) . '"');
                header('Content-Length: ' . filesize($nome_zip));
                readfile($nome_zip);
                unlink($nome_zip);
                exit;
            }
        }
        // --- EXCLUSÃO EM MASSA ---
        elseif ($_POST['acao'] === 'excluir_selecionados') {
            $baseUploads = realpath(dirname(__DIR__) . '/uploads_rd');
            foreach ($_POST['arquivos_selecionados'] as $arquivoRelativo) {
                $caminhoFisico = realpath($baseUploads . '/' . ltrim($arquivoRelativo, '/\\'));
                if ($caminhoFisico && strpos($caminhoFisico, $baseUploads) === 0 && file_exists($caminhoFisico)) {
                    unlink($caminhoFisico);
                }
            }
            header("Location: " . $_SERVER['REQUEST_URI']);
            exit;
        }
    }
}

?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <title>Contabilidade - <?= htmlspecialchars($tituloPagina) ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="css/contabilidade_modern.css">
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid pt-2 contabilidade-page">
        <div class="card contabilidade-main-card">
            <div class="card-header py-2 d-flex justify-content-between align-items-center contabilidade-toolbar">
                <div class="contabilidade-title"><i class="fas fa-calculator"></i><h4 class="m-0 font-weight-bold">Contabilidade - <?= htmlspecialchars($tituloPagina) ?></h4></div>
                <form method="GET" class="form-inline contabilidade-filter-form">
                    <label for="tipo" class="mr-2">Visualizar:</label>
                    <select name="tipo" id="tipo" class="form-control form-control-sm mr-3">
                        <option value="notas_servico" <?= $tipoFiltro == 'notas_servico' ? 'selected' : '' ?>>Notas de Serviço</option>
                        <option value="comprov_diversos" <?= $tipoFiltro == 'comprov_diversos' ? 'selected' : '' ?>>Comprovantes Diversos</option>
                        <option value="extrato" <?= $tipoFiltro == 'extrato' ? 'selected' : '' ?>>Extrato Geral</option>
                    </select>

                    <div class="form-inline">
                        <label for="mes" class="mr-2">Màs:</label>
                        <select name="mes" id="mes" class="form-control form-control-sm mr-3">
                            <?php
                            $meses = [
                                1 => 'Janeiro',
                                2 => 'Fevereiro',
                                3 => 'Março',
                                4 => 'Abril',
                                5 => 'Maio',
                                6 => 'Junho',
                                7 => 'Julho',
                                8 => 'Agosto',
                                9 => 'Setembro',
                                10 => 'Outubro',
                                11 => 'Novembro',
                                12 => 'Dezembro'
                            ];
                            foreach ($meses as $numero => $nome) {
                                $selected = ((int)$mesFiltro == $numero) ? 'selected' : '';
                                echo "<option value=\"$numero\" $selected>" . htmlspecialchars($nome) . "</option>";
                            }
                            ?>
                        </select>
                        <label for="ano" class="mr-2">Ano:</label>
                        <input type="number" name="ano" id="ano" class="form-control form-control-sm mr-3 contabilidade-year-input" value="<?= $anoFiltro ?>">
                    </div>

                    <button type="submit" class="btn btn-sm btn-secondary contabilidade-btn" title="Aplicar Filtro"><i class="fas fa-filter"></i></button>
                </form>

            </div>

            <div class="card card-lista contabilidade-content-card">
                <?php if ($tipoFiltro !== 'extrato') : ?>
                    <form action="" method="POST" id="formAcoes">
                        <input type="hidden" name="acao" id="acao">
                        <div class="card-header d-flex justify-content-between align-items-center contabilidade-section-header">
                            <h5 class="m-0">Arquivos Encontrados</h5>
                            <?php if (!empty($arquivos)) : ?>
                                <div>
                                    <button type="button" id="btnDownloadZip" class="btn btn-success btn-sm contabilidade-btn mr-2"><i class="fas fa-file-archive"></i> Download Selecionados (.zip)</button>
                                </div>
                            <?php endif; ?>
                        </div>
                        <div class="table-responsive contabilidade-table-area contabilidade-files-area">
                        <table class="table table-hover table-sm mb-0 contabilidade-table contabilidade-files-table">
                            <tbody>
                                <?php if (empty($arquivos)) : ?>
                                    <tr>
                                        <td colspan="3" class="text-center text-muted p-4">Nenhum documento encontrado.</td>
                                    </tr>
                                    <?php else : foreach ($arquivos as $arquivo) : ?>
                                        <tr>
                                            <td><input type="checkbox" class="pdf-checkbox" name="arquivos_selecionados[]" value="<?= htmlspecialchars($arquivo['arquivo_relativo']) ?>" data-tamanho="<?= $arquivo['tamanho'] ?>"></td>
                                            <td><div class="contabilidade-file-name"><i class="fas fa-file-pdf text-danger"></i> <?= htmlspecialchars($arquivo['nome']) ?></div></td>
                                            <td class="text-center">
                                                <a href="<?= htmlspecialchars($arquivo['url']) ?>" class="btn btn-sm btn-info contabilidade-icon-btn" target="_blank" title="Visualizar"><i class="fas fa-eye"></i></a>
                                                <a href="<?= htmlspecialchars($arquivo['url']) ?>" class="btn btn-sm btn-primary contabilidade-icon-btn" download title="Baixar"><i class="fas fa-download"></i></a>
                                            </td>
                                        </tr>
                                <?php endforeach;
                                endif; ?>
                            </tbody>
                        </table>
                        </div>
                    </form>
                <?php else : // ## NOVO BLOCO PARA EXIBIR O EXTRATO ## 
                ?>
                    <div class="card-header d-flex justify-content-between align-items-center contabilidade-section-header">
                        <h5 class="m-0">Lançamentos Encontrados</h5>
                        <?php if (!empty($extrato_data)) : ?>
                            <div>
                                <a href="?tipo=extrato&mes=<?= $mesFiltro ?>&ano=<?= $anoFiltro ?>&action=download_excel" class="btn btn-success btn-sm contabilidade-btn mr-2">
                                    <i class="fas fa-file-excel"></i> Baixar Excel
                                </a>
                            </div>
                        <?php endif; ?>
                    </div>
                    <div class="table-responsive contabilidade-table-area contabilidade-extrato-area">
                        <table class="table table-hover table-sm table-bordered mb-0 contabilidade-table contabilidade-extrato-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Tipo Mov</th>
                                    <th>Tipo Doc</th>
                                    <th>Descrição</th>
                                    <th>Entrada (Cliente)</th>
                                    <th>Saída (Favorecido)</th>
                                    <th>Obs.</th>
                                    <th>Grupo</th>
                                    <th>Subgrupo</th>
                                    <th>Classificação</th>
                                    <th>Empresa</Unid>
                                    <th class="text-right contabilidade-value-col">Valor (R$)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($extrato_data)) : ?>
                                    <tr>
                                        <td colspan="8" class="text-center text-muted p-4">Nenhum lançamento encontrado para o período.</td>
                                    </tr>
                                    <?php else : foreach ($extrato_data as $index => $linha) : ?>
                                        <tr class="<?= $index >= 50 ? 'd-none contabilidade-extra-row' : '' ?>">
                                            <td><?= date('d/m/Y', strtotime($linha['data'])) ?></td>
                                            <!-- <td class="text-center font-weight-bold <?= $linha['tipo_movimento'] == 'Entrada' ? 'bg-success text-white' : 'text-danger' ?>"><?= htmlspecialchars($linha['tipo_movimento'] ?? '') ?></td> -->
                                            <td class="text-center font-weight-bold <?= $linha['tipo_movimento'] == 'Entrada' ? 'text-success fs-1' : 'text-danger' ?>"><?= htmlspecialchars($linha['tipo_movimento'] ?? '') ?></td>
                                            <td><?= htmlspecialchars($linha['tipo_documento'] ?? '') ?></td>
                                            <td><?= htmlspecialchars($linha['descricao'] ?? '') ?></td>
                                            <td><?= htmlspecialchars($linha['entrada_entidade'] ?? '') ?></td>
                                            <td><?= htmlspecialchars($linha['saida_entidade'] ?? '') ?></td>
                                            <td><?= htmlspecialchars($linha['obs'] ?? '') ?></td>
                                            <td><?= htmlspecialchars($linha['grupo'] ?? '') ?></td>
                                            <td><?= htmlspecialchars($linha['subgrupo'] ?? '') ?></td>
                                            <td><?= htmlspecialchars($linha['classificacao'] ?? '') ?></td>
                                            <td><?= htmlspecialchars($linha['empresa'] ?? '') ?></td>
                                            <td class="text-right font-weight-bold <?= $linha['tipo_movimento'] == 'Entrada' ? 'text-success' : 'text-danger' ?>">
                                                <?= number_format($linha['valor'], 2, ',', '.') ?>
                                            </td>
                                        </tr>
                                <?php endforeach;
                                endif; ?>
                            </tbody>
                        </table>
                    </div>
                    <div id="contabilidadeLoadStatus" class="contabilidade-load-status"></div>
                <?php endif; ?>
            </div>
        </div>
    </div>


    <div class="modal fade contabilidade-modal" id="confirmacaoModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="confirmacaoModalLabel">Confirmar Ação</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                </div>
                <div class="modal-body" id="confirmacaoModalBody">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-primary btn-sm" id="btnConfirmarAcao">Confirmar</button>
                </div>
            </div>
        </div>
    </div>


    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

    <script>
        $(document).ready(function() {
            // Função para formatar bytes em KB, MB, GB...
            function formatBytes(bytes, decimals = 2) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const dm = decimals < 0 ? 0 : decimals;
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
            }

            $('#selecionar-todos-pdfs').on('click', function() {
                $('.pdf-checkbox').prop('checked', $(this).is(':checked'));
            });

            // ... (lógica dos checkboxes individuais, se houver)

            let acaoParaConfirmar = '';

            // Lógica do botão de Download ZIP
            $('#btnDownloadZip').on('click', function() {
                const selecionados = $('.pdf-checkbox:checked');
                if (selecionados.length === 0) {
                    alert('Por favor, selecione pelo menos um arquivo para baixar.');
                    return;
                }

                // Calcula o tamanho total
                let tamanhoTotal = 0;
                selecionados.each(function() {
                    tamanhoTotal += $(this).data('tamanho');
                });

                acaoParaConfirmar = 'download_zip';
                $('#confirmacaoModalLabel').text('Confirmar Download');
                $('#confirmacaoModalBody').html(`
                <p>Deseja criar um arquivo .zip com os <strong>${selecionados.length}</strong> arquivos selecionados?</p>
                <p class="text-muted">Tamanho total estimado: <strong>${formatBytes(tamanhoTotal)}</strong></p>
            `);
                $('#btnConfirmarAcao').removeClass('btn-danger').addClass('btn-primary').text('Confirmar e Baixar');
                $('#confirmacaoModal').modal('show');
            });

            // Lógica do botão de Excluir
            $('#btnExcluir').on('click', function() {
                const selecionados = $('.pdf-checkbox:checked');
                if (selecionados.length === 0) {
                    alert('Por favor, selecione pelo menos um arquivo para excluir.');
                    return;
                }

                acaoParaConfirmar = 'excluir_selecionados';
                $('#confirmacaoModalLabel').text('Confirmar Exclusão');
                $('#confirmacaoModalBody').html(`
                <p class="text-danger"><strong>ATENÇÃO:</strong> Deseja realmente excluir permanentemente os <strong>${selecionados.length}</strong> arquivos selecionados?</p>
                <p>Esta ação não pode ser desfeita.</p>
            `);
                $('#btnConfirmarAcao').removeClass('btn-primary').addClass('btn-danger').text('Sim, Excluir');
                $('#confirmacaoModal').modal('show');
            });

            // Lógica do botão de confirmação GERAL dentro do modal
            $('#btnConfirmarAcao').on('click', function() {
                if (acaoParaConfirmar) {
                    $('#acao').val(acaoParaConfirmar);
                    $('#formAcoes').submit();
                }
            });
        });
    </script>
    <script>
        $(document).ready(function() {
            function toggleFilters() {
                const selectedType = $('#tipo').val();
                if (selectedType === 'extrato') {
                    $('#filtros_arquivos').hide();
                    $('#filtros_extrato').show();
                } else {
                    $('#filtros_arquivos').show();
                    $('#filtros_extrato').hide();
                }
            }
            // Executa na carga da página
            toggleFilters();
            // Executa quando o select é alterado
            $('#tipo').on('change', function() {
                toggleFilters();
            });
        });
    </script>
</body>

</html>