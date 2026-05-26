<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../ativos/ativos_conect.php");

$pdoProgramas = ConnectionPluginsApp();
if (!$pdoProgramas) {
    exit("Erro ao conectar ao banco de dados plugins_app.");
}

$programa = '';
$empresa = '';
$resultados = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $programa = filter_input(INPUT_POST, 'programa', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $empresa = filter_input(INPUT_POST, 'empresa', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

    $query = "SELECT a.id AS id_ativo, a.empresa, a.nome_computador, p.nome_programa, p.versao_programa
              FROM ativos a
              JOIN programas_instalados p ON a.id = p.id_ativo
              WHERE p.nome_programa LIKE :programa";

    if (!empty($empresa)) {
        $query .= " AND a.empresa LIKE :empresa";
    }

    $stmt = $pdoProgramas->prepare($query);
    $stmt->bindValue(':programa', "%$programa%", PDO::PARAM_STR);

    if (!empty($empresa)) {
        $stmt->bindValue(':empresa', "%$empresa%", PDO::PARAM_STR);
    }

    $stmt->execute();
    $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);
}


?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <title>Buscar Programa Instalados nos Ativos</title>
    <style>
        body {
            zoom: 0.9;
            width: 100%;
        }

        .btn-voltar {
            display: block;
            margin: 20px auto 0;
            width: 200px;
            text-align: center;
        }

        .programa-item {
            font-size: 0.8rem !important;
            line-height: 1.2 !important;
            padding: 5px 0 !important;
        }

        .input-group {
            width: 400px;
        }

        .input-group input {
            font-size: 0.9rem;
        }

        .table-container {
            max-height: 85vh;
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
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid">
        <div class="row">
            <div class="col-md-12 mt-1" style="padding-left: 20px; padding-right: 20px;">
                <div class="card" style="min-height: 630px; max-height: 630px;">
                    <div class="card-header py-2 d-flex align-items-center">

                        <strong class="mr-auto">Buscar Programas Instalados nos Ativos</strong>
                        <form method="POST" id="searchForm" class="d-flex" style="gap: 10px; align-items: flex-end;">
                            <div style="flex-direction: column; width: 200px;">
                                <label for="empresa" class="mb-0">Empresa:</label>
                                <input id="empresa" name="empresa" type="text" class="form-control mb-0 empresa" value="<?php echo htmlspecialchars($empresa); ?>">
                            </div>
                            <div style="flex-direction: column; width: 200px;">
                                <label for="programa" class="mb-0">Programa:</label>
                                <input id="programa" name="programa" type="text" class="form-control mb-0 programa" value="<?php echo htmlspecialchars($programa); ?>" required>
                            </div>
                            <div class="input-group-append">
                                <button type="submit" class="btn btn-outline-secondary">
                                    <i class="fas fa-search"></i>
                                </button>
                                <button type="button" class="btn btn-outline-danger ml-2" onclick="clearSearch()">
                                    <i class="fas fa-times"></i> Limpar
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-success ml-2" style='margin-right: 1px' onclick="exportarRelatorio()">
                                    <i class="fas fa-file-export"></i> Exportar
                                </button>
                            </div>
                        </form>

                    </div>
                    <div class="table-container">
                        <div class="card-body">
                            <div id="resultList">
                                <?php if ($resultados) : ?>
                                    <div class="row font-weight-bold border-bottom py-1">
                                        <div class="col-md-2">ID Ativo</div>
                                        <div class="col-md-3">Empresa</div>
                                        <div class="col-md-3">Computador</div>
                                        <div class="col-md-4">Versão</div>
                                    </div>
                                    <?php foreach ($resultados as $resultado) : ?>
                                        <div class="row border-bottom py-1 programa-item">
                                            <div class="col-md-2"><?php echo htmlspecialchars($resultado['id_ativo']); ?></div>
                                            <div class="col-md-3"><?php echo htmlspecialchars($resultado['empresa']); ?></div>
                                            <div class="col-md-3"><?php echo htmlspecialchars($resultado['nome_computador']); ?></div>
                                            <div class="col-md-4"><?php echo htmlspecialchars($resultado['versao_programa']); ?></div>
                                        </div>
                                    <?php endforeach; ?>
                                <?php else : ?>
                                    <p>Nenhum registro disponível.</p>
                                <?php endif; ?>
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
        function exportarRelatorio() {
            // Captura os valores diretamente dos campos de entrada no formulário
            var empresa = document.getElementById('empresa').value.trim();
            var nomePrograma = document.getElementById('programa').value.trim();

            // Verifica se os valores estão preenchidos
            if (!empresa) {
                empresa = '';
            }
            if (!nomePrograma) {
                console.error("O campo 'programa' está vazio.");
                return;
            }

            // Monta a URL com os parâmetros necessários
            var url = 'gerar_relatorio.php?' +
                'source=ativos_programas' + // Identifica que é uma nova busca
                '&empresa=' + encodeURIComponent(empresa) +
                '&nome_programa=' + encodeURIComponent(nomePrograma) +
                '&formato=excel';

            // Exibe a URL gerada no console para depuração
            // console.log("URL para o relatório:", url);

            // Redireciona para gerar o relatório
            window.location.href = url;
        }


        // Submeter o formulário ao pressionar Enter
        document.getElementById('programa').addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                document.getElementById('searchForm').submit();
            }
        });

        // document.getElementById('empresa').addEventListener('keypress', function(event) {
        //     if (event.key === 'Enter') {
        //         event.preventDefault();
        //         document.getElementById('searchForm').submit();
        //     }
        // });

        function clearSearch() {
            document.getElementById('programa').value = '';
            document.getElementById('empresa').value = '';
            //abre a pagina com os filtros limpos
            window.location.href = 'ativos_programas.php';
        }
    </script>
</body>

</html>