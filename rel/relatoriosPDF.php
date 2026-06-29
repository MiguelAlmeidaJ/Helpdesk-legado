<?php
date_default_timezone_set('America/Sao_Paulo');
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// Apenas gestores podem ver esta página
if ($m8_00 == 0) { // Usando a permissão do código original
    header("Location: ../home.php");
    exit;
}
if (!isset($_SESSION['allterusN3Id'])) {
    header("Location: ../index.php");
    exit;
}

$pdo = ConnectionN3();
if (!$pdo) {
    exit("Erro ao conectar ao banco de dados.");
}

$dataInicio = $_GET['data_inicio'] ?? date('Y-m-01');
$dataFim = $_GET['data_fim'] ?? date('Y-m-t');

// Lógica para listar os relatórios PDF existentes
$relatoriosDir = __DIR__ . '/relatorios/';
$arquivosPdf = [];
if (is_dir($relatoriosDir)) {
    foreach (glob($relatoriosDir . '*.pdf') ?: [] as $arquivoPdf) {
        $arquivosPdf[] = [
            'path' => $arquivoPdf,
            'nome' => basename($arquivoPdf),
            'modificado' => filemtime($arquivoPdf) ?: 0,
            'tamanho' => filesize($arquivoPdf) ?: 0,
        ];
    }

    usort($arquivosPdf, function ($a, $b) {
        if ($a['modificado'] === $b['modificado']) {
            return strnatcasecmp($a['nome'], $b['nome']);
        }
        return $b['modificado'] <=> $a['modificado'];
    });
}

function formatarTamanhoPdf(int $bytes): string
{
    if ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 1, ',', '.') . ' MB';
    }

    return number_format(max($bytes, 0) / 1024, 0, ',', '.') . ' KB';
}

function formatarDataArquivoPdf(int $timestamp): string
{
    if ($timestamp <= 0) {
        return '-';
    }

    return (new DateTime('@' . $timestamp))
        ->setTimezone(new DateTimeZone('America/Sao_Paulo'))
        ->format('d/m/Y H:i');
}


// Lógica para Ações em Massa (Download ou Exclusão)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['acao'])) {

    // --- LÓGICA PARA DOWNLOAD EM MASSA ---
    if ($_POST['acao'] === 'download_selecionados') {
        if (!empty($_POST['arquivos_selecionados']) && is_array($_POST['arquivos_selecionados'])) {
            $arquivosParaDownload = $_POST['arquivos_selecionados'];

            $zip = new ZipArchive();
            $nome_zip = $relatoriosDir . 'Relatorios_' . date('Y-m-d_H-i-s') . '.zip';

            if ($zip->open($nome_zip, ZipArchive::CREATE) === TRUE) {
                foreach ($arquivosParaDownload as $arquivo) {
                    $nomeBase = basename($arquivo);
                    $caminhoCompleto = $relatoriosDir . $nomeBase;
                    if (file_exists($caminhoCompleto)) {
                        $zip->addFile($caminhoCompleto, $nomeBase);
                    }
                }
                $zip->close();

                // Força o download do arquivo .zip
                header('Content-Type: application/zip');
                header('Content-Disposition: attachment; filename="' . basename($nome_zip) . '"');
                header('Content-Length: ' . filesize($nome_zip));
                header('Connection: close');
                readfile($nome_zip);

                // Apaga o arquivo .zip temporário do servidor
                unlink($nome_zip);
                exit; // Termina o script para não renderizar o resto da página
            }
        }
    }

    // --- LOGICA PARA EXCLUSAO EM MASSA (AJUSTADA) ---
    elseif ($_POST['acao'] === 'excluir_selecionados') {
        if (!empty($_POST['arquivos_selecionados']) && is_array($_POST['arquivos_selecionados'])) {
            $arquivosParaExcluir = $_POST['arquivos_selecionados'];

            foreach ($arquivosParaExcluir as $arquivo) {
                $nomeBase = basename($arquivo);
                $caminhoCompleto = $relatoriosDir . $nomeBase;
                if (file_exists($caminhoCompleto)) {
                    unlink($caminhoCompleto);
                }
            }
        }
        // Redireciona para a mesma página para atualizar a lista
        header("Location: " . $_SERVER['PHP_SELF']);
        exit;
    }
}

// Carregar opçães para o dropdown de clientes
$stmtTodosClientes = $pdo->prepare("SELECT clt_id, clt_nomef FROM clientes where clt_sts = '1' ORDER BY clt_nomef ASC");
$stmtTodosClientes->execute();
$todosClientes = $stmtTodosClientes->fetchAll(PDO::FETCH_ASSOC);

?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Gerar Relatórios PDF</title>
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="css/relatorios_modern.css">
</head>

<body class="rel-legacy-body">
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid pt-2 rel-page rel-legacy-page">
        <div class="card">
            <div class="card-header py-2">
                <div class="row">
                    <div class="col-md-6 mt-2 mb-0 ml-2 row">
                        <h4 class="m-0 font-weight-bold">Gerador de Relatórios</h4>
                    </div>
                </div>
            </div>

            <!-- <div class="card shadow-sm"> -->
            <div class="card-body">
                <form id="formGerarRelatorio">
                    <div class="row align-items-end">
                        <div class="form-group col-md-4">
                            <label>Clientes</label>
                            <div class="dropdown">
                                <div id="clientes-dropdown-label" class="form-control form-control-sm mr-2 dropdown-toggle dropdown-toggle-split rel-clickable" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    Selecione o(s) cliente(s)
                                </div>
                                <div id="clientes-dropdown-menu" class="dropdown-menu p-2 rel-dropdown-scroll">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="selecionar-todos">
                                        <label class="form-check-label" for="selecionar-todos">Todos</label>
                                    </div>
                                    <?php foreach ($todosClientes as $cliente) : ?>
                                        <div class="form-check">
                                            <input class="form-check-input cliente-checkbox" type="checkbox" name="clientes[]" value="<?= $cliente['clt_id'] ?>" id="cliente_<?= $cliente['clt_id'] ?>" data-nomef="<?= htmlspecialchars($cliente['clt_nomef']) ?>"> <label class="form-check-label" for="cliente_<?= $cliente['clt_id'] ?>">
                                                <?= htmlspecialchars($cliente['clt_nomef']) ?>
                                            </label>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                        <div class="form-group col-md-3">
                            <label for="data_inicio">Data de Início</label>
                            <input type="date" id="data_inicio" name="data_inicio" class="form-control form-control-sm mr-2" value="<?= htmlspecialchars($_GET['data_inicio'] ?? $dataInicio) ?>">
                        </div>
                        <div class="form-group col-md-3">
                            <label for="data_fim">Data Final</label>
                            <input type="date" id="data_fim" name="data_fim" class="form-control form-control-sm mr-2" value="<?= htmlspecialchars($_GET['data_fim'] ?? $dataFim) ?>">
                        </div>
                        <div class="form-group col-md-2">
                            <button type="submit" class="btn btn-success rel-pill-btn btn-block">
                                <i class="fas fa-cogs"></i> Gerar Relatório
                            </button>
                        </div>
                    </div>
                </form>
                <div id="statusGeracao" class="mt-3 d-none"></div>


                <div class="card card-lista mt-1">
                    <form action="" method="POST" id="formAcoesRelatorios" onsubmit="return confirm('Você confirma esta ação para os relatórios selecionados?');">


                        <div class="card-header d-flex justify-content-between align-items-center rel-section-header">
                            <h5 class="m-0 text-center">Relatórios Gerados <small class="text-muted font-weight-normal">(mais recentes primeiro)</small></h5>
                            <div class="d-flex align-items-end ">
                                <?php if (!empty($arquivosPdf)) : ?>
                                    <button type="submit" name="acao" value="download_selecionados" class="btn btn-primary mr-3">
                                        <i class="fas fa-file-archive"></i> Download Selecionados (.zip)
                                    </button>
                                    <button type="submit" name="acao" value="excluir_selecionados" class="btn btn-danger ">
                                        <i class="fas fa-trash-alt"></i> Excluir Selecionados
                                    </button>
                                <?php endif; ?>
                            </div>
                        </div>

                        <table class="table table-hover table-sm rel-table">
                            <thead>
                                <tr>
                                    <th class="rel-check-col"><input type="checkbox" id="selecionar-todos-pdfs"></th>
                                    <th class="text-left rel-file-col">Arquivo</th>
                                    <th class="text-center">Gerado em</th>
                                    <th class="text-center">Tamanho</th>
                                    <th class="text-center rel-action-col">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($arquivosPdf)) : ?>
                                    <tr>
                                        <td colspan="5" class="text-center text-muted p-4">Nenhum relatório gerado ainda.</td>
                                    </tr>
                                <?php else : ?>
                                    <?php foreach ($arquivosPdf as $arquivo) : $nomeBase = $arquivo['nome']; ?>
                                        <tr>
                                            <td>
                                                <input type="checkbox" class="pdf-checkbox" name="arquivos_selecionados[]" value="<?= htmlspecialchars($nomeBase) ?>">
                                            </td>
                                            <td class="nomeArquivo">
                                                <i class="fas fa-file-pdf text-danger"></i>
                                                <span><?= htmlspecialchars($nomeBase) ?></span>
                                            </td>
                                            <td class="text-center text-muted"><?= formatarDataArquivoPdf((int)$arquivo['modificado']) ?></td>
                                            <td class="text-center text-muted"><?= formatarTamanhoPdf((int)$arquivo['tamanho']) ?></td>
                                            <td class="text-center">
                                                <button type="button" class="btn btn-sm btn-outline-secondary btn-visualizar-pdf mr-1" data-pdf-url="relatorios/<?= urlencode($nomeBase) ?>" data-pdf-nome="<?= htmlspecialchars($nomeBase) ?>" title="Visualizar PDF">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <a href="relatorios/<?= urlencode($nomeBase) ?>" class="btn btn-sm btn-primary" download title="Baixar PDF">
                                                    <i class="fas fa-download text-left"></i>
                                                </a>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>


                    </form>
                </div>
            </div>
        </div>
    </div>

    <div class="rel-pdf-preview-modal" id="modalVisualizarPdf" aria-hidden="true">
        <div class="rel-pdf-preview-backdrop" data-pdf-preview-close></div>
        <div class="rel-pdf-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="modalVisualizarPdfLabel">
            <div class="rel-pdf-preview-header">
                <div>
                    <span class="rel-pdf-preview-kicker">Pré-visualização</span>
                    <h5 id="modalVisualizarPdfLabel">Visualizar PDF</h5>
                </div>
                <button type="button" class="rel-pdf-preview-close" data-pdf-preview-close aria-label="Fechar visualização">
                    &times;
                </button>
            </div>
            <div class="rel-pdf-preview-body">
                <iframe id="iframeVisualizarPdf" title="Visualização do PDF"></iframe>
            </div>
            <div class="rel-pdf-preview-footer">
                <a id="linkDownloadPreviewPdf" href="#" class="btn btn-primary" download>
                    <i class="fas fa-download"></i> Baixar PDF
                </a>
                <button type="button" class="btn btn-outline-secondary" data-pdf-preview-close>Fechar</button>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
    <script>
        $(document).ready(function() {
            // Lógica para o checkbox "TODOS"
            $('#selecionar-todos').on('click', function() {
                $('.cliente-checkbox').prop('checked', $(this).is(':checked'));
            });

            // Lógica para desmarcar "TODOS" se um cliente for desmarcado individualmente
            $('.cliente-checkbox').on('click', function() {
                if (!$(this).is(':checked')) {
                    // Se qualquer checkbox de cliente for desmarcado, desmarca o "TODOS"
                    $('#selecionar-todos').prop('checked', false);
                } else {
                    // Se todos os checkboxes de cliente estiverem marcados, marca o "TODOS" também
                    if ($('.cliente-checkbox:checked').length === $('.cliente-checkbox').length) {
                        $('#selecionar-todos').prop('checked', true);
                    }
                }
            });


            $('#formGerarRelatorio').on('submit', function(e) {
                e.preventDefault();

                if ($('.cliente-checkbox:checked').length === 0) {
                    alert('Por favor, selecione ao menos um cliente.');
                    return;
                }

                var statusDiv = $('#statusGeracao');

                // --- INICIO DA ALTERACAO ---

                // 1. Crie um array para guardar os clientes selecionados (ID e Nome)
                var clientesSelecionados = [];
                $('.cliente-checkbox:checked').each(function() {
                    clientesSelecionados.push({
                        id: $(this).val(),
                        nome: $(this).data('nomef') // Pega o nome do data-attribute
                    });
                });

                // 2. Monte o objeto de dados completo para enviar via AJAX
                var postData = {
                    clientes: clientesSelecionados,
                    data_inicio: $('#data_inicio').val(),
                    data_fim: $('#data_fim').val()
                };

                // console.log("Dados enviados:", postData);

                statusDiv.show().html('<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> Gerando relatorio, aguarde...</div>');

                $.ajax({
                    url: 'auxPDF.php',
                    type: 'POST',
                    data: postData,
                    dataType: 'json',
                    success: function(response) {
                        var detalhes = '';
                        if (response.errors && response.errors.length) {
                            detalhes = '<br><small>' + response.errors.join('<br>') + '</small>';
                        }

                        if (response.success) {
                            statusDiv.html('<div class="alert alert-success">' + response.message + ' A pagina sera atualizada.</div>');
                            setTimeout(function() {
                                location.reload();
                            }, 1800);
                            return;
                        }

                        statusDiv.html('<div class="alert alert-warning"><strong>' + (response.message || 'Relatorio gerado parcialmente.') + '</strong>' + detalhes + '</div>');
                        if (response.files && response.files.length) {
                            setTimeout(function() {
                                location.reload();
                            }, 3000);
                        }
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        var mensagem = 'Erro ao gerar o relatorio.';
                        if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
                            mensagem = jqXHR.responseJSON.message;
                            if (jqXHR.responseJSON.errors && jqXHR.responseJSON.errors.length) {
                                mensagem += '<br><small>' + jqXHR.responseJSON.errors.join('<br>') + '</small>';
                            }
                        } else if (jqXHR.responseText) {
                            mensagem += '<br><small>' + jqXHR.responseText.substring(0, 800) + '</small>';
                        }
                        statusDiv.html('<div class="alert alert-danger"><strong>' + mensagem + '</strong></div>');
                        console.error("Erro AJAX:", textStatus, errorThrown, jqXHR.responseText);
                    }
                });
            });
        });
    </script>

    <script>
        $(document).ready(function() {
            // ... (seu código ajax para gerar relatórios continua aqui) ...

            // Lógica para o checkbox "Selecionar Todos" da tabela de PDFs
            $('#selecionar-todos-pdfs').on('click', function() {
                // Marca ou desmarca todos os checkboxes de PDF com base no estado do "selecionar-todos"
                $('.pdf-checkbox').prop('checked', $(this).is(':checked'));
            });

            // Lógica para desmarcar "Selecionar Todos" se um PDF for desmarcado individualmente
            $('.pdf-checkbox').on('click', function() {
                if (!$(this).is(':checked')) {
                    $('#selecionar-todos-pdfs').prop('checked', false);
                } else {
                    // Se todos os checkboxes de PDF estiverem marcados, marca o "Selecionar Todos" também
                    if ($('.pdf-checkbox:checked').length === $('.pdf-checkbox').length) {
                        $('#selecionar-todos-pdfs').prop('checked', true);
                    }
                }
            });

            function abrirPreviewPdf(pdfUrl, pdfNome) {
                $('#modalVisualizarPdfLabel').text(pdfNome || 'Visualizar PDF');
                $('#iframeVisualizarPdf').attr('src', pdfUrl + '#toolbar=1&navpanes=0');
                $('#linkDownloadPreviewPdf').attr('href', pdfUrl);
                $('#modalVisualizarPdf').addClass('is-open').attr('aria-hidden', 'false');
                $('body').addClass('rel-pdf-preview-open');
            }

            function fecharPreviewPdf() {
                $('#modalVisualizarPdf').removeClass('is-open').attr('aria-hidden', 'true');
                $('body').removeClass('rel-pdf-preview-open');
                $('#iframeVisualizarPdf').attr('src', 'about:blank');
                $('#linkDownloadPreviewPdf').attr('href', '#');
            }

            $('.btn-visualizar-pdf').on('click', function() {
                abrirPreviewPdf($(this).data('pdf-url'), $(this).data('pdf-nome'));
            });

            $('[data-pdf-preview-close]').on('click', function() {
                fecharPreviewPdf();
            });

            $(document).on('keydown', function(event) {
                if (event.key === 'Escape' && $('#modalVisualizarPdf').hasClass('is-open')) {
                    fecharPreviewPdf();
                }
            });
        });
    </script>
    <script src="js/relatorios_modern.js"></script>
</body>

</html>