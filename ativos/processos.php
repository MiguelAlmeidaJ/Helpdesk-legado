<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../ativos/ativos_conect.php");

// Verifica se os parâmetros recebidos por get e atribui valores a variáveis
$page_voltar = isset($_GET['page']) ? htmlspecialchars($_GET['page']) : '';
$limit_voltar = isset($_GET['limit']) ? htmlspecialchars($_GET['limit']) : '';
$ord_voltar = isset($_GET['ord']) ? htmlspecialchars($_GET['ord']) : '';
$empresa_voltar = isset($_GET['empresa']) ? htmlspecialchars($_GET['empresa']) : '';
$nome_computador_voltar = isset($_GET['nome_computador']) ? htmlspecialchars($_GET['nome_computador']) : '';
$endereco_mac_voltar = isset($_GET['endereco_mac']) ? htmlspecialchars($_GET['endereco_mac']) : '';


// Monta a URL para o botão "Voltar", ignorando parâmetros vazios
$url_voltar = "ativos.php?" . http_build_query(array_filter([
    'page' => $page_voltar,
    'limit' => $limit_voltar,
    'ord' => $ord_voltar,
    'empresa' => $empresa_voltar,
    'nome_computador' => $nome_computador_voltar,
    'endereco_mac' => $endereco_mac_voltar,
]));

// Conexão com o banco de dados plugins_app
$pdoProcessos = ConnectionPluginsApp();
if (!$pdoProcessos) {
    exit("Erro ao conectar ao banco de dados plugins_app.");
}

// Verifica se o formulário foi enviado
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id'])) {
    echo "<script>console.log('Formulário enviado com sucesso!');</script>";
}

// Sanitiza e valida os dados recebidos do formulário
$id = filter_input(INPUT_POST, 'id', FILTER_SANITIZE_NUMBER_INT);
$id_ativo = filter_input(INPUT_POST, 'id_ativo', FILTER_SANITIZE_NUMBER_INT);
$processo = filter_input(INPUT_POST, 'nome_processo', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$data_coleta = filter_input(INPUT_POST, 'data_coleta', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

if (isset($_GET['id'])) {
    // Consulta os processos do ativo pelo id no banco de dados
    $id_ativo = filter_input(INPUT_GET, 'id', FILTER_SANITIZE_NUMBER_INT);
    $stmt = $pdoProcessos->prepare("SELECT * FROM processos_ativos WHERE id_ativo = :id_ativo");
    if (!$stmt) {
        exit("Erro na consulta do ativo: " . $pdoProcessos->errorInfo()[2]);
    }
    $stmt->bindParam(':id_ativo', $id_ativo, PDO::PARAM_INT);
    $stmt->execute();
    $processos = $stmt->fetch(PDO::FETCH_ASSOC);
}

// Insere os dados do ativo no formulário
if ($processos) {
    $id = $processos['id'];
    $id_ativo = $processos['id_ativo'];
    $processo = $processos['nome_processo'];
    $data_coleta = $processos['data_coleta'];
} else {
    $id = $id_ativo = $processo = $data_coleta = null; // Valores padrão
}

// Formatando a data
// $atualizado = $data_coleta ? date('d/m/Y H:i:s', strtotime($data_coleta)) : 'Não disponível';

$pdoAtivos = ConnectionPluginsApp();
// Consultar o campo hora_da_coleta na tabela ativos
$stmtColeta = $pdoAtivos->prepare("SELECT hora_da_coleta FROM ativos WHERE id = :id_ativo");
$stmtColeta->bindParam(':id_ativo', $id_ativo, PDO::PARAM_INT);
$stmtColeta->execute();
$hora_da_coleta = $stmtColeta->fetchColumn();

// echo isset($id_ativo) ? "<script>console.log('$id_ativo')</script>" : '';
// echo isset($processo) ? "<script>console.log('$processo')</script>" : '';
// echo isset($data_coleta) ? "<script>console.log('$data_coleta')</script>" : '';
// echo "<script>console.log('$page_voltar')</script>";
// echo "<script>console.log('$limit_voltar')</script>";
// echo "<script>console.log('$ord_voltar')</script>";
// echo "<script>console.log('$empresa_voltar')</script>";
// echo "<script>console.log('$nome_computador_voltar')</script>";
// echo "<script>console.log('$endereco_mac_voltar')</script>";

?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <title>Processas Instalados</title>
    <style>
        body {
            zoom: 0.9;
            width: 100%;
            overflow-x: hidden;
        }

        .btn-voltar {
            display: block;
            margin: 20px auto 0;
            width: 200px;
            text-align: center;
        }

        .processo-item {
            font-size: 0.8rem !important;
            line-height: 1.2 !important;
            padding: 5px 0 !important;
        }

        
        .coleta-info {
            font-weight: normal;
            font-size: 0.9rem;
        }
    </style>
</head>

<body>
    <?php
    include("../all/sidebar.php");

    // Verificar se foi passado o id_ativo
    $id_ativo = filter_input(INPUT_GET, 'id', FILTER_SANITIZE_NUMBER_INT);

    if (!$id_ativo) {
        echo "<p>ID do ativo não foi fornecido.</p>";
        exit;
    }

    // Conectar ao banco de dados
    $pdo = ConnectionPluginsApp();

    if (!$pdo) {
        echo "<p>Erro ao conectar ao banco de dados.</p>";
        exit;
    }

    // Consultar processos instalados com base no id_ativo
    $stmt = $pdo->prepare("SELECT nome_processo FROM processos_ativos WHERE id_ativo = :id_ativo ORDER BY nome_processo ASC");
    $stmt->bindParam(':id_ativo', $id_ativo, PDO::PARAM_INT);
    $stmt->execute();
    $processos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // if (!$processos) {
    //     echo "<p>Nenhum processo encontrado para este ativo.</p>";
    //     exit;
    // }

    
    ?>

<div class="container-fluid">
        <div class="row">
            <div class="col-md-12 mt-1" style="padding-left: 100px; padding-right: 100px;">
                <div class="card" style="overflow-x: hidden; overflow-y: auto; min-height: 630px; max-height: 630px;">
                    <div class="card-header py-2 d-flex justify-content-between align-items-center">
                        <strong>Processos </strong>
                        <?php if ($hora_da_coleta): ?>
                            <span class="coleta-info">(Atualizado: <?php echo htmlspecialchars($hora_da_coleta); ?>)</span>
                        <?php endif; ?>
                        <div class="input-group" style="width: 400px;">
                            <input id="searchProcess" type="text" class="form-control" placeholder="Buscar processo..." aria-label="Buscar processo">
                            <div class="input-group-append">
                                <button class="btn btn-outline-secondary ml-2" type="button" onclick="filterProcesss()">
                                    <i class="fas fa-search"></i>
                                </button>
                                <button class="btn btn-outline-danger ml-2" type="button" onclick="clearSearch()">
                                    <i class="fas fa-times"></i> Limpar
                                </button>
                                <a href="<?php echo htmlspecialchars($url_voltar); ?>" class="btn btn-outline-primary ml-2">
                                    <i class="fas fa-arrow-left"></i> Voltar
                                </a>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div id="processList" class="row">
                            <?php if (empty($processos)): ?>
                                <div class="col-12 text-center">
                                    Nenhum processo encontrado para este ativo.
                                </div>
                            <?php else: ?>
                                <?php foreach ($processos as $index => $processo): ?>
                                    <?php
                                    $nome = !empty($processo['nome_processo']) 
                                        ? $processo['nome_processo'] 
                                        : "Nenhum processo encontrado para este ativo.";
                                    ?>
                                    <div class="col-md-4 border-bottom py-1 processo-item">
                                        <div class="process-name"><?php echo htmlspecialchars($nome); ?></div>
                                    </div>
                                    <?php if (($index + 1) % 3 == 0): ?>
                                        <!-- Adiciona um row após cada 3 itens -->
                                        <div class="w-100"></div>
                                    <?php endif; ?>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
    <script>

function voltarPagina() {
    // Pegue os parâmetros passados para a página atual
    const params = new URLSearchParams(window.location.search);

    // Recupere as variáveis (se existirem) ou defina valores padrão
    const page = params.get('page') || '';
    const limit = params.get('limit') || '';
    const ord = params.get('ord') || '';
    const empresa = params.get('empresa') || '';
    const nomeComputador = params.get('nome_computador') || '';
    const enderecoMac = params.get('endereco_mac') || '';

    // Construa a URL para a página anterior
    const urlVoltar = 'ativos_prog.php?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}&ord=${encodeURIComponent(ord)}&empresa=${encodeURIComponent(empresa)}&nome_computador=${encodeURIComponent(nomeComputador)}&endereco_mac=${encodeURIComponent(enderecoMac)}';

    // Redirecione para a URL gerada
    window.location.href = urlVoltar;
}



    function filterProcesss() {
        const searchValue = document.getElementById('searchProcess').value.toLowerCase();
        const processItems = document.querySelectorAll('#processList .processo-item');

        processItems.forEach(item => {
            const processName = item.querySelector('.process-name').textContent.toLowerCase();
            if (processName.includes(searchValue)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    function clearSearch() {
        document.getElementById('searchProcess').value = '';
        const processItems = document.querySelectorAll('#processList .processo-item');

        processItems.forEach(item => {
            item.style.display = ''; // Restaura a exibição de todos os itens
        });
    }

    // Adiciona evento de teclado ao campo de busca
    document.getElementById('searchProcess').addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Evita o comportamento padrão do Enter (submeter formulário, por exemplo)
            filterProcesss(); // Executa a busca
        }
    });

    document.getElementById('searchProcess').addEventListener('input', function () {
        if (this.value === '') {
            clearSearch();
        }
    });
</script>

</body>

</html>
