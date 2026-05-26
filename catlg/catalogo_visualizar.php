<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m8_04 == 0) {
    header("Location: ../index.php");
}




$pdo = ConnectionN3();

if (!isset($_GET['id'])) {
    die("Catálogo não encontrado.");
}

$id = intval($_GET['id']);

$stmt = $pdo->prepare("
    SELECT 
        catalogos.cliente_id, 
        catalogos.titulo, 
        catalogos.conteudo, 
        clientes.clt_nomef,
        clientes.clt_cnpj, 
        clientes.clt_end, 
        clientes.clt_city, 
        clientes.clt_uf
    FROM catalogos 
    LEFT JOIN clientes ON catalogos.cliente_id = clientes.clt_id 
    WHERE catalogos.id = ?
");


$stmt->execute([$id]);
$resultado = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$resultado) {
    die("Catálogo não encontrado.");
}
?>

<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/help.css">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="../css/bootstrap-select.min.css">
    <link rel="stylesheet" href="../css/timeline.css">
    <link rel="stylesheet" href="../css/bootstrap-datetimepicker.min.css">
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">


    <title>Allterus</title>
    <script src="../js/tinymce/tinymce.min.js"></script>

</head>
<style>
    body {
        zoom: 0.9;
    }
    .card-body {
        overflow: hidden;
        word-wrap: break-word;
        padding: 10px;
    }

    .card-body table {
        max-width: 100% !important;
        margin: 0 auto !important;
        border-collapse: collapse;
        table-layout: auto;
    }

    .card-body td,
    .card-body th {
        padding: 10px;
        border: 1px solid #ccc;
        text-align: left;
        word-break: break-word;
    }

    .card-body img {
        max-width: 100% !important;
        height: auto;
        display: block;
        margin: 0 auto;
    }

    @media print {


        /* Mantém a estrutura das colunas na impressão */
        .row {
            display: flex !important;
            flex-wrap: nowrap !important;
            justify-content: space-between !important;
        }

        .col-md-8,
        .col-md-4 {
            flex: 1 !important;
            max-width: 50% !important;
        }

        /* Remove sombras e margens extras na impressão */
        .card {
            box-shadow: none !important;
            border: 1px solid #000 !important;
        }

        /* Diminui a margem entre os elementos */
        .mb-1 {
            margin-bottom: 2px !important;
        }

        /* Reduz o espaçamento entre linhas */
        h6,
        h5 {
            font-size: 12px !important;
            /* Ajusta tamanho das fontes */
            margin-bottom: 2px !important;
            /* Reduz o espaçamento entre linhas */
        }
    }
</style>

<body>
    <div class="container mt-1">
        <div class="card p-2 shadow-sm"> <!-- Reduzi `p-3` para `p-2` -->
            <div class="row d-flex align-items-center justify-content-between">
                <!-- Cliente -->
                <div class="col-md-8 d-flex align-items-center">
                    <h6 class="mb-0 text-muted mr-2">Cliente:</h6> <!-- `mb-1` para `mb-0` -->
                    <h5 class="font-weight-bold text-dark mb-0"><?php echo $resultado['clt_nomef']; ?></h5>
                </div>
                <!-- CNPJ -->
                <div class="col-md-4 text-left">
                    <h6 class="mb-0">CNPJ:
                        <span class="small" style="font-size: 0.75rem;">
                            <?php echo !empty($resultado['clt_cnpj']) ? preg_replace("/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/", "$1.$2.$3/$4-$5", $resultado['clt_cnpj']) : 'Não informado'; ?>
                        </span>
                    </h6>
                </div>
            </div>

            <!-- Título + Endereço na mesma linha -->
            <div class="row d-flex align-items-center justify-content-between mt-1"> <!-- `mt-2` para `mt-1` -->
                <div class="col-md-8 d-flex align-items-center">
                    <h6 class="mb-0 text-muted mr-2">Título:</h6>
                    <h6 class="font-weight-bold text-dark mb-0"><?php echo $resultado['titulo']; ?></h6>
                </div>
                <div class="col-md-4 text-left">
                    <h6 class="mb-0">End.:
                        <span class="small" style="font-size: 0.75rem;">
                            <?php echo !empty($resultado['clt_end']) ? "{$resultado['clt_end']}, {$resultado['clt_city']} - {$resultado['clt_uf']}" : 'Não informado'; ?>
                        </span>
                    </h6>
                </div>
            </div>
        </div>
    </div>




    <!-- Conteúdo do Catálogo -->
    <div class="container mt-0">

        <div class="card mt-0 p-4 shadow-sm">
            <?php echo $resultado['conteudo']; ?>
        </div>

        <!-- indicação do Fim do Conteúdo -->
        <div class="pt-5"></div>
        <div>
            <h6 class="mb-2 text-center text-muted"><strong>Fim do Conteúdo</strong></h6>
        </div>
        <div class="pt-5"></div>


    </div>

    <!-- Scripts Bootstrap e jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
</body>

</html>