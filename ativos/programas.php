<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../ativos/ativos_conect.php");




// Verifica e sanitiza os parâmetros recebidos
$page_voltar = isset($_GET['page']) ? htmlspecialchars($_GET['page']) : '';
$limit_voltar = isset($_GET['limit']) ? htmlspecialchars($_GET['limit']) : '';
$ord_voltar = isset($_GET['ord']) ? htmlspecialchars($_GET['ord']) : '';
$empresa_voltar = isset($_GET['empresa']) ? htmlspecialchars($_GET['empresa']) : '';
$nome_computador_voltar = isset($_GET['nome_computador']) ? htmlspecialchars($_GET['nome_computador']) : '';
$endereco_mac_voltar = isset($_GET['endereco_mac']) ? htmlspecialchars($_GET['endereco_mac']) : '';

// Monta a URL de retorno, removendo parâmetros vazios
$url_voltar = "ativos.php?" . http_build_query(array_filter([
    'page' => $page_voltar,
    'limit' => $limit_voltar,
    'ord' => $ord_voltar,
    'empresa' => $empresa_voltar,
    'nome_computador' => $nome_computador_voltar,
    'endereco_mac' => $endereco_mac_voltar,
]));

// Logs para verificar o comportamento
// echo "<script>console.log('URL de retorno: {$url_voltar}');</script>";
// echo "<script>console.log('Parâmetro page: {$page_voltar}');</script>";
// echo "<script>console.log('Parâmetro limit: {$limit_voltar}');</script>";
// echo "<script>console.log('Parâmetro ord: {$ord_voltar}');</script>";
// echo "<script>console.log('Parâmetro empresa: {$empresa_voltar}');</script>";
// echo "<script>console.log('Parâmetro nome_computador: {$nome_computador_voltar}');</script>";
// echo "<script>console.log('Parâmetro endereco_mac: {$endereco_mac_voltar}');</script>";




// Conexão com o banco de dados plugins_app
$pdoProgramas = ConnectionPluginsApp();
if (!$pdoProgramas) {
    exit("Erro ao conectar ao banco de dados plugins_app.");
}

// Verifica se o formulário foi enviado
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id'])) {
    echo "<script>console.log('Formulário enviado com sucesso!');</script>";
}

// Sanitiza e valida os dados recebidos do formulário
$id = filter_input(INPUT_POST, 'id', FILTER_SANITIZE_NUMBER_INT);
$id_ativo = filter_input(INPUT_POST, 'id_ativo', FILTER_SANITIZE_NUMBER_INT);
$programa = filter_input(INPUT_POST, 'nome_programa', FILTER_SANITIZE_FULL_SPECIAL_CHARS);


if (isset($_GET['id'])) {
    // Consulta os programas do ativo pelo id no banco de dados
    $id_ativo = filter_input(INPUT_GET, 'id', FILTER_SANITIZE_NUMBER_INT);
    $stmt = $pdoProgramas->prepare("SELECT * FROM programas_instalados WHERE id_ativo = :id_ativo");
    if (!$stmt) {
        exit("Erro na consulta do ativo: " . $pdoProgramas->errorInfo()[2]);
    }
    $stmt->bindParam(':id_ativo', $id_ativo, PDO::PARAM_INT);
    $stmt->execute();
    $programas = $stmt->fetch(PDO::FETCH_ASSOC);
}

// Insere os dados do ativo no formulário
if ($programas) {
    $id = $programas['id'];
    $id_ativo = $programas['id_ativo'];
    $programa = $programas['nome_programa'];
    $versao = $programas['versao_programa'];
} else {
    $id = $id_ativo = $programa = null; // Valores padrão
}

$pdoAtivos = ConnectionPluginsApp();
// Consultar o campo hora_da_coleta na tabela ativos
$stmtColeta = $pdoAtivos->prepare("SELECT hora_da_coleta FROM ativos WHERE id = :id_ativo");
$stmtColeta->bindParam(':id_ativo', $id_ativo, PDO::PARAM_INT);
$stmtColeta->execute();
$hora_da_coleta = $stmtColeta->fetchColumn();
?>

<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <title>Programas Instalados</title>
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

        .programa-item {
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

    // Consultar programas instalados com base no id_ativo
    $stmt = $pdo->prepare("SELECT * FROM programas_instalados WHERE id_ativo = :id_ativo ORDER BY nome_programa ASC");
    $stmt->bindParam(':id_ativo', $id_ativo, PDO::PARAM_INT);
    $stmt->execute();
    $programas = $stmt->fetchAll(PDO::FETCH_ASSOC);


    ?>

    <div class="container-fluid">
        <div class="row">
            <div class="col-md-12 mt-1" style="padding-left: 50px; padding-right: 50px;">
                <div class="card" style="overflow-x: hidden; overflow-y: auto; min-height: 630px; max-height: 630px;">
                    <div class="card-header py-2 d-flex justify-content-between align-items-center">
                        <strong>Programas Instalados</strong>
                        <?php if ($hora_da_coleta): ?>
                            <span class="coleta-info">(Atualizado: <?php echo htmlspecialchars($hora_da_coleta); ?>)</span>
                        <?php endif; ?>
                        <div class="d-flex" style="gap: 10px; align-items: flex-end;">
                            <div style="flex-direction: column; width: 200px;">
                                <label for="programa" class="mb-1">Programa:</label>
                                <input id="searchProgram" type="text" class="form-control" placeholder="Buscar programa..." aria-label="Buscar programa">
                            </div>
                            <div class="input-group-append">
                                <button class="btn btn-outline-secondary" type="button" onclick="filterPrograms()">
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
    <div id="programList">
        <?php if (empty($programas)): ?>
            <div class="row border-bottom py-1 programa-item">
                <div class="col-md-12 program-name">Nenhum programa encontrado para este ativo.</div>
            </div>
        <?php else: ?>
            <div class="row font-weight-bold border-bottom py-1">
                <div class="col-md-7">Nome</div>
                <div class="col-md-5">Versão</div>
            </div>
            <?php foreach ($programas as $programa): ?>
    <div class="row border-bottom py-1 programa-item">
        <div class="col-md-7 program-name"><?php echo htmlspecialchars($programa['nome_programa']); ?></div>
        <div class="col-md-5"><?php echo htmlspecialchars($programa['versao_programa'] ?? 'Não identificado'); ?></div>
    </div>
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
    const urlVoltar = 'ativos.php?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}&ord=${encodeURIComponent(ord)}&empresa=${encodeURIComponent(empresa)}&nome_computador=${encodeURIComponent(nomeComputador)}&endereco_mac=${encodeURIComponent(enderecoMac)}';

    // Redirecione para a URL gerada
    window.location.href = urlVoltar;
}

        function filterPrograms() {
            const searchValue = document.getElementById('searchProgram').value.toLowerCase();
            const programItems = document.querySelectorAll('#programList .programa-item');

            programItems.forEach(item => {
                const programName = item.querySelector('.program-name').textContent.toLowerCase();
                if (programName.includes(searchValue)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        function clearSearch() {
            document.getElementById('searchProgram').value = '';
            const programItems = document.querySelectorAll('#programList .programa-item');

            programItems.forEach(item => {
                item.style.display = '';
            });
        }

        document.getElementById('searchProgram').addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                filterPrograms();
            }
        });

        document.getElementById('searchProgram').addEventListener('input', function () {
            if (this.value === '') {
                clearSearch();
            }
        });
    </script>
</body>

</html>
