<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

$pdo = ConnectionN3();

$selected_tecnico = filter_input(INPUT_GET, 'tecnico', FILTER_VALIDATE_INT) ?: 0;
$f_area = filter_input(INPUT_GET, 'f_area', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?: 'ti';
if (!in_array($f_area, ['ti', 'devops'], true)) {
    $f_area = 'ti';
}

$data_inicio = filter_input(INPUT_GET, 'data_inicio', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?: date('Y-m-d');
$data_fim = filter_input(INPUT_GET, 'data_fim', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?: date('Y-m-d');
$data_inicio = date('Y-m-d', strtotime(str_replace('-', '/', $data_inicio)));
$data_fim = date('Y-m-d', strtotime(str_replace('-', '/', $data_fim)));

$areaLabel = $f_area === 'devops' ? 'Suporte DevOps' : 'Suporte T.I';
$tabela = $f_area === 'devops' ? 'tarefas' : 'atendimentos';
$campoNivel = $f_area === 'devops' ? 'tipo' : 'nivel';

$tecnicos = $pdo->prepare("SELECT user_id, user_nome FROM usuarios WHERE user_sts = '1' AND usuarios.user_funcao IN (5, 6) ORDER BY user_nome ASC");
$tecnicos->execute();

$query = "
    SELECT {$tabela}.id, {$tabela}.{$campoNivel} AS nivel, {$tabela}.abertura, {$tabela}.status, usuarios.user_nome
    FROM {$tabela}
    LEFT JOIN usuarios ON {$tabela}.tecnico = usuarios.user_id
    WHERE DATE({$tabela}.abertura) BETWEEN :data_inicio AND :data_fim";

if ($selected_tecnico > 0) {
    $query .= " AND {$tabela}.tecnico = :tecnico";
}

$query .= " ORDER BY usuarios.user_nome ASC, {$tabela}.abertura ASC";

$stmt = $pdo->prepare($query);
$stmt->bindValue(':data_inicio', $data_inicio, PDO::PARAM_STR);
$stmt->bindValue(':data_fim', $data_fim, PDO::PARAM_STR);
if ($selected_tecnico > 0) {
    $stmt->bindValue(':tecnico', $selected_tecnico, PDO::PARAM_INT);
}
$stmt->execute();
$num_atendimentos = $stmt->rowCount();

function formatarTempoAtendimento($abertura) {
    if (!$abertura || $abertura === '-') {
        return '-';
    }

    $tempoAtendimento = time() - strtotime($abertura);
    if ($tempoAtendimento < 0) {
        $tempoAtendimento = 0;
    }

    $dias = floor($tempoAtendimento / 86400);
    $horas = floor(($tempoAtendimento % 86400) / 3600);
    $minutos = floor(($tempoAtendimento % 3600) / 60);
    $segundos = $tempoAtendimento % 60;

    return sprintf("%d dias, %02d:%02d:%02d", $dias, $horas, $minutos, $segundos);
}
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de tempo por técnico</title>
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="css/relatorios_modern.css">
</head>
<body class="rel-legacy-body">
<?php include_once("../all/sidebar.php"); ?>

<div class="container-fluid rel-page rel-legacy-page rel-analitico-full-page">
    <div class="row">
        <div class="col-md-12 mt-2">
            <div class="card">
                <div class="card-header my-0 py-2 h6 rel-filter-header">
                    <button class="btn" type="button">
                        <i class="fas fa-stopwatch"></i> Relatório de tempo por técnico
                    </button>
                </div>
                <div class="card-body py-0">
                    <form method="GET" action="rel_tempo_atd.php" class="rel-modern-filter rel-analitico-filter">
                        <div class="rel-filter-grid">
                            <div class="rel-filter-field">
                                <label for="f_area"><i class="fas fa-sitemap"></i> Área</label>
                                <select class="form-control form-control-sm" id="f_area" name="f_area">
                                    <option value="ti" <?php if ($f_area === 'ti') { echo 'selected'; } ?>>Suporte T.I</option>
                                    <option value="devops" <?php if ($f_area === 'devops') { echo 'selected'; } ?>>Suporte DevOps</option>
                                </select>
                            </div>

                            <div class="rel-filter-field">
                                <label for="tecnico"><i class="fas fa-user-tie"></i> Técnico</label>
                                <select class="form-control form-control-sm" id="tecnico" name="tecnico">
                                    <option value="0">Todos os técnicos</option>
                                    <?php while ($row = $tecnicos->fetch(PDO::FETCH_ASSOC)) { ?>
                                        <option value="<?php echo $row['user_id']; ?>" <?php if ((int)$row['user_id'] === $selected_tecnico) { echo 'selected'; } ?>>
                                            <?php echo $row['user_nome']; ?>
                                        </option>
                                    <?php } ?>
                                </select>
                            </div>

                            <div class="rel-filter-field">
                                <label for="data_inicio"><i class="far fa-calendar-alt"></i> Data início</label>
                                <input type="date" class="form-control form-control-sm" id="data_inicio" name="data_inicio" value="<?php echo $data_inicio; ?>">
                            </div>

                            <div class="rel-filter-field">
                                <label for="data_fim"><i class="far fa-calendar-check"></i> Data fim</label>
                                <input type="date" class="form-control form-control-sm" id="data_fim" name="data_fim" value="<?php echo $data_fim; ?>">
                            </div>

                            <div class="rel-filter-actions">
                                <button type="submit" class="btn btn-info rel-pill-btn"><i class="fas fa-filter"></i> Filtrar</button>
                                <a href="rel_tempo_atd.php" class="btn btn-outline-secondary rel-clear-btn"><i class="fas fa-eraser"></i> Limpar</a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <div class="row mt-2 mb-0 rel-analitico-result-row">
        <div class="col-md-12 rel-analitico-result-col">
            <div class="card bg-default rel-analitico-result-card">
                <div class="card-header h6 py-2 rel-section-header">
                    <i class="fas fa-stopwatch"></i> Tempo de atendimento por técnico - <?php echo $areaLabel; ?>
                </div>
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2 rel-result-summary">
                        <h4 class="text-left text-red mb-0">Total de registros: <?php echo $num_atendimentos; ?></h4>
                        <a href="../atd/home.php" class="btn btn-outline-secondary rel-clear-btn"><i class="fas fa-arrow-left"></i> Voltar para Home</a>
                    </div>

                    <div class="table-responsive rel-table-wrap">
                        <table class="table table-hover rel-table">
                            <thead>
                            <tr>
                                <th class="text-center">ID</th>
                                <th class="text-center"><?php echo $f_area === 'devops' ? 'Tipo' : 'Nível'; ?></th>
                                <th class="text-center">Técnico</th>
                                <th class="text-center">Abertura</th>
                                <th class="text-center">Status</th>
                                <th class="text-center">Tempo de atendimento</th>
                            </tr>
                            </thead>
                            <tbody>
                            <?php if ($num_atendimentos > 0) { ?>
                                <?php while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) { ?>
                                    <tr>
                                        <td class="text-center"><?php echo $row['id']; ?></td>
                                        <td class="text-center"><?php echo $row['nivel']; ?></td>
                                        <td class="text-center"><?php echo $row['user_nome']; ?></td>
                                        <td class="text-center"><?php echo $row['abertura']; ?></td>
                                        <td class="text-center"><?php echo $row['status']; ?></td>
                                        <td class="text-center"><?php echo formatarTempoAtendimento($row['abertura']); ?></td>
                                    </tr>
                                <?php } ?>
                            <?php } else { ?>
                                <tr>
                                    <td colspan="6" class="text-center">Não há informações para exibir com os filtros selecionados.</td>
                                </tr>
                            <?php } ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="../js/jquery-3.6.0.min.js"></script>
<script src="../js/bootstrap.bundle.min.js"></script>
<script src="js/relatorios_modern.js"></script>
</body>
</html>
