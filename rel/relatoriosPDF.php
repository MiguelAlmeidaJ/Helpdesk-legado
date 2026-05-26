<?php
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
    $arquivosPdf = glob($relatoriosDir . '*.pdf');
}


// Lógica para Açães em Massa (Download ou Exclusão)
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

    // --- LÓGICA PARA EXCLUSÃO EM MASSA (AJUSTADA) ---
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
    <title>Gerar Relatérios PDF</title>
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <style>
        body {
            zoom: 0.9;
            width: 100%;
            font-size: 0.9rem;
        }

        .card-body {
            padding-top: 5px;
            padding-left: 10px;
            padding-right: 10px;
            overflow-y: auto;
            height: calc(100vh - 80px);
            overflow-x: hidden;
        }

        .card-lista {
            overflow-y: auto;
            height: calc(100vh - 200px);
            /* padding: 10px; */
        }

        .card .dropdown-menu {
            padding-top: 300px;
            max-height: 200px;
            overflow-y: auto;
            position: relative;
            margin-left: 0 !important;
            margin-right: 0 !important;
            width: 100%;
            z-index: 1000;
        }

        .card-header .btn {
            padding-top: 3px;
            padding-bottom: 3px;
            margin: 0px;
        }

        .cliente-checkbox,
        .pdf-checkbox,
        #selecionar-todos,
        #selecionar-todos-pdfs {
            margin-left: 5px;
            width: 1.1rem;
            /* Aumenta a largura */
            height: 1.1rem;
            /* Aumenta a altura */
            cursor: pointer;
            /* Muda o cursor para uma "mãozinha" ao passar o mouse */
            vertical-align: middle;
            /* Alinha o checkbox verticalmente com o texto */
        }

        .pdf-checkbox,
        #selecionar-todos-pdfs {
            margin-left : 20px;

        }

        .form-check-label {
            margin-left: 30px;
        }

    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid pt-2">
        <div class="card">
            <div class="card-header py-2">
                <div class="row">
                    <div class="col-md-6 mt-2 mb-0 ml-2 row">
                        <h4 class="m-0 font-weight-bold">Gerador de Relatérios</h4>
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
                                <div id="clientes-dropdown-label" class="form-control form-control-sm mr-2 dropdown-toggle dropdown-toggle-split" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="cursor: pointer;">
                                    Selecione o(s) cliente(s)
                                </div>
                                <div id="clientes-dropdown-menu" class="dropdown-menu p-2" style="width: 100%; max-height: 350px; overflow-y: auto;">
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
                            <button type="submit" class="btn btn-success btn-block">
                                <i class="fas fa-cogs"></i> Gerar Relatério
                            </button>
                        </div>
                    </div>
                </form>
                <div id="statusGeracao" class="mt-3" style="display:none;"></div>


                <div class="card card-lista mt-1">
                    <form action="" method="POST" id="formAcoesRelatorios" onsubmit="return confirm('Você confirma esta ação para os relatórios selecionados?');">


                        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                            <h5 class="m-0 text-center">Relatérios Gerados</h5>
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

                        <table class="table table-hover table-sm">
                            <thead>
                                <tr>
                                    <th style="width: 1px;"><input type="checkbox" id="selecionar-todos-pdfs"></th>
                                    <th class = "text-left" style="width: 200px;">Nome do Arquivo</th>
                                    <th class="text-center" style="width: 20px;">Download Individual</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($arquivosPdf)) : ?>
                                    <tr>
                                        <td colspan="3" class="text-center text-muted p-4">Nenhum relatório gerado ainda.</td>
                                    </tr>
                                <?php else : ?>
                                    <?php foreach ($arquivosPdf as $arquivo) : $nomeBase = basename($arquivo); ?>
                                        <tr>
                                            <td>
                                                <input type="checkbox" class="pdf-checkbox " name="arquivos_selecionados[]" value="<?= htmlspecialchars($nomeBase) ?>">
                                            </td>
                                            <td class ="nomeArquivo"><i class="fas fa-file-pdf text-danger"></i> <?= htmlspecialchars($nomeBase) ?></td>
                                            <td class="text-center">
                                                <a href="relatorios/<?= urlencode($nomeBase) ?>" class="btn btn-sm btn-primary" download>
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

                // --- INÍCIO DA ALTERAÇÃO ---

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

                statusDiv.show().html('<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> Gerando relatório, por favor aguarde...</div>');

                $.ajax({
                    url: 'auxPDF.php',
                    type: 'POST',
                    data: postData, // Use o objeto que criamos em vez do formData
                    success: function(response) {
                        statusDiv.html('<div class="alert alert-success">Relatério gerado com sucesso! A página será atualizada.</div>');
                        // console.log("Resposta do script:", response);
                        setTimeout(function() {
                            location.reload();
                        }, 3000);
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        statusDiv.html('<div class="alert alert-danger"><strong>Erro ao gerar o relatório.</strong></div>');
                        console.error("Erro AJAX:", textStatus, errorThrown);
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
        });
    </script>
</body>

</html>