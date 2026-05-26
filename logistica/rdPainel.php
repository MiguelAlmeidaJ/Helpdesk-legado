<?php
//ARQUIVO ATUALIZADO NOVO FINANCEIRO

session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// var_dump($_SESSION);
// exit;

if ($m9_00 == 0) {
    header("Location: ../home.php");
    exit;
}
if (!isset($_SESSION['allterusN3Id'])) {
    header("Location: ../index.php");
    exit;
}



$pdo = connectionN3();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

$id_allterus = $_SESSION['allterusN3Id'];
$usuarioStmt = $pdo->prepare("SELECT * FROM usuarios WHERE user_id = :id");
$usuarioStmt->execute([':id' => $id_allterus]);
$usuario = $usuarioStmt->fetch(PDO::FETCH_ASSOC);

// var_dump($usuario);
// exit;

if (!$usuario['user_id']) {
    header("Location: ../home.php");
    exit;
}

// $id_n3rd = $usuario['id'];
// $permissao = $usuario['type'];


// Filtro por datas
$dataInicio = $_GET['data_inicio'] ?? date('Y-m-01');
$dataFim = $_GET['data_fim'] ?? date('Y-m-t');

// Parâmetros para as queries
$params = [
    ':user_id' => $id_allterus,
    ':dataInicio' => $dataInicio,
    ':dataFim' => $dataFim . ' 23:59:59'
];


// Totais para os cards de resumo do colaborador
$stmtAguardando = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance WHERE status = 1 AND user_id = :user_id");
$stmtAguardando->execute([':user_id' => $id_allterus]);
$totalAguardando = $stmtAguardando->fetchColumn();

$stmtAReceber = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance WHERE status = 2 AND user_id = :user_id");
$stmtAReceber->execute([':user_id' => $id_allterus]);
$totalAReceber = $stmtAReceber->fetchColumn();

$stmtRecebido = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM running_balance WHERE status = 4 AND user_id = :user_id AND date_created BETWEEN :dataInicio AND :dataFim");
$stmtRecebido->execute($params);
$totalRecebido = $stmtRecebido->fetchColumn();

// Tabela de despesas do usuário no período
$rds = $pdo->prepare("SELECT * FROM running_balance WHERE user_id = :user_id AND date_created BETWEEN :dataInicio AND :dataFim AND aj = 1 ORDER BY date_created DESC");
$rds->execute($params);
$despesas = $rds->fetchAll(PDO::FETCH_ASSOC);

$stmt = $pdo->prepare("
    SELECT r.id, r.remarks, r.amount, r.cliente, r.date_created, u.user_nome, c.categories
    FROM running_balance r
    JOIN usuarios u ON u.user_id = r.user_id
    JOIN category c ON c.id = r.category_id
    WHERE r.status = 4 AND r.aj = 1 AND r.user_id = :user_id AND r.date_created BETWEEN :dataInicio AND :dataFim
    ORDER BY r.date_created DESC 
    LIMIT 10
");
// Neste caso, a chamada com $params estaria correta
$stmt->execute($params);
$ultimasDespesas = $stmt->fetchAll(PDO::FETCH_ASSOC);

?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Dashboard de Despesas</title>
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="icon" href="../img/favicon.ico">
    <style>
        body {
            zoom: 0.9;
            width: 100%;
            background-color: #f4f6f9;
            font-size: 0.9rem;
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
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid pt-3">
        <section class="d-flex justify-content-between align-items-center mb-3">
            <h1 class="h4 text-dark">Minhas Despesas - <?php echo $usuario['user_nome']; ?></h1>
            <a href="rd.php" class="btn btn-primary"><i class="fas fa-home"></i> Gerenciar minhas despesas</a>

        </section>

        <div class="row">
            <div class="col-md-4 mb-4">
                <div class="card border-left-warning shadow h-100 py-2 card-metric">
                    <div class="card-body">
                        <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Aguardando Aprovação</div>
                        <div class="h5 mb-0 font-weight-bold text-gray-800">R$ <?= number_format($totalAguardando, 2, ',', '.') ?></div>
                    </div>
                </div>
                </a>
            </div>
            <div class=" col-md-4 mb-4">
                <div class="card border-left-info shadow h-100 py-2 card-metric">
                    <div class="card-body">
                        <div class="text-xs font-weight-bold text-info text-uppercase mb-1">Aprovado (A Receber)</div>
                        <div class="h5 mb-0 font-weight-bold text-gray-800">R$ <?= number_format($totalAReceber, 2, ',', '.') ?></div>
                    </div>
                </div>
                </a>
            </div>
            <div class=" col-md-4 mb-4">
                <div class="card border-left-success shadow h-100 py-2 card-metric">
                    <div class="card-body">
                        <div class="text-xs font-weight-bold text-success text-uppercase mb-1">Recebido (no período)</div>
                        <div class="h5 mb-0 font-weight-bold text-gray-800">R$ <?= number_format($totalRecebido, 2, ',', '.') ?></div>
                    </div>
                </div>
                </a>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-12 mb-4">
                <div class="card shadow">
                    <div class="card-header bg-dark text-white">UÚltimas Despesas Recebidas</div>
                    <div class="card-body summary-table-container">
                        <table class="table table-sm table-hover mb-0">
                            <thead class="thead-light">
                                <tr>
                                    <th>Empresa</th>
                                    <th>Data</th>
                                    <th>Categoria</th>
                                    <th class="text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($ultimasDespesas)) : ?>
                                    <tr>
                                        <td colspan="4" class="text-center text-muted">Nenhum dado no período.</td>
                                    </tr>
                                <?php else : ?>
                                    <?php foreach ($ultimasDespesas as $item) : ?>
                                        <tr>
                                            <td><?= htmlspecialchars($item['cliente']) ?></td>
                                            <td><?= date('d/m/Y', strtotime($item['date_created'])) ?></td>
                                            <td><?= htmlspecialchars($item['categories']) ?></td>
                                            <td class="text-right font-weight-bold">R$ <?= number_format($item['amount'], 2, ',', '.') ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>


    </div>

    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
    <script>
        $(function() {
            $('[data-toggle="tooltip"]').tooltip()
        })
    </script>
</body>

</html>