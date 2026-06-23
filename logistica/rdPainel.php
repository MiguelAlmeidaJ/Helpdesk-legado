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
    <link rel="stylesheet" href="css/rd_painel_modern.css">
    <link rel="icon" href="../img/favicon.ico">
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid rd-page">
        <section class="rd-header">
            <div class="rd-title-wrap">
                <h1 class="rd-title"><i class="fas fa-receipt"></i> Minhas Despesas</h1>
                <span class="rd-subtitle"><?php echo htmlspecialchars($usuario['user_nome']); ?></span>
            </div>
            <a href="rd.php" class="btn rd-action-btn"><i class="fas fa-wallet"></i> Gerenciar minhas despesas</a>

        </section>

        <div class="row rd-metrics-row">
            <div class="col-md-4 mb-4">
                <div class="card rd-metric-card rd-metric-warning">
                    <div class="card-body">
                        <div class="rd-metric-content">
                            <div class="rd-metric-label">Aguardando Aprovação</div>
                            <div class="rd-metric-value">R$ <?= number_format($totalAguardando, 2, ',', '.') ?></div>
                        </div>
                        <span class="rd-metric-icon"><i class="far fa-clock"></i></span>
                    </div>
                </div>
            </div>
            <div class=" col-md-4 mb-4">
                <div class="card rd-metric-card rd-metric-info">
                    <div class="card-body">
                        <div class="rd-metric-content">
                            <div class="rd-metric-label">Aprovado (A Receber)</div>
                            <div class="rd-metric-value">R$ <?= number_format($totalAReceber, 2, ',', '.') ?></div>
                        </div>
                        <span class="rd-metric-icon"><i class="fas fa-hand-holding-usd"></i></span>
                    </div>
                </div>
            </div>
            <div class=" col-md-4 mb-4">
                <div class="card rd-metric-card rd-metric-success">
                    <div class="card-body">
                        <div class="rd-metric-content">
                            <div class="rd-metric-label">Recebido (no período)</div>
                            <div class="rd-metric-value">R$ <?= number_format($totalRecebido, 2, ',', '.') ?></div>
                        </div>
                        <span class="rd-metric-icon"><i class="fas fa-check-circle"></i></span>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-12 mb-4">
                <div class="card rd-panel-card">
                    <div class="card-header"><i class="fas fa-list-ul"></i> Últimas Despesas Recebidas</div>
                    <div class="card-body rd-table-container">
                        <table class="table table-sm table-hover rd-table">
                            <thead>
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
                                        <td colspan="4" class="text-center rd-empty-state">Nenhum dado no período.</td>
                                    </tr>
                                <?php else : ?>
                                    <?php foreach ($ultimasDespesas as $item) : ?>
                                        <tr>
                                            <td><?= htmlspecialchars($item['cliente']) ?></td>
                                            <td><?= date('d/m/Y', strtotime($item['date_created'])) ?></td>
                                            <td><?= htmlspecialchars($item['categories']) ?></td>
                                            <td class="text-right rd-value">R$ <?= number_format($item['amount'], 2, ',', '.') ?></td>
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
