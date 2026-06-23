<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

$pdo = ConnectionN3();

// Verifica se foi selecionado um técnico
$selected_tecnico = filter_input(INPUT_GET, 'tecnico', FILTER_SANITIZE_NUMBER_INT);

// Verifica e ajusta as datas de início e fim
$data_inicio = filter_input(INPUT_GET, 'data_inicio', FILTER_SANITIZE_STRING);
$data_fim = filter_input(INPUT_GET, 'data_fim', FILTER_SANITIZE_STRING);

// Ajusta o formato de exibição e converte para formato SQL
if (!$data_inicio) {
    $data_inicio = date('Y-m-d');
} else {
    $data_inicio = date('Y-m-d', strtotime(str_replace('-', '/', $data_inicio)));
}

if (!$data_fim) {
    $data_fim = date('Y-m-d');
} else {
    $data_fim = date('Y-m-d', strtotime(str_replace('-', '/', $data_fim)));
}

// Consulta para buscar os tecnicos ativos
$tecnicos = $pdo->prepare("SELECT user_id, user_nome FROM usuarios WHERE user_sts ='1' AND usuarios.user_funcao IN (5, 6) ORDER BY user_nome ASC");
$tecnicos->execute();

// Consulta SQL para buscar os atendimentos
$query = "
    SELECT atendimentos.id, atendimentos.nivel, atendimentos.abertura, atendimentos.status, usuarios.user_nome
    FROM atendimentos 
    LEFT JOIN usuarios ON atendimentos.tecnico = usuarios.user_id
    WHERE 1 ";

if ($selected_tecnico) {
    $query .= " AND atendimentos.tecnico = :tecnico ";
}
$query .= " AND DATE(atendimentos.abertura) BETWEEN :data_inicio AND :data_fim 
            ORDER BY usuarios.user_nome ASC, atendimentos.abertura ASC";

$stmt = $pdo->prepare($query);

if ($selected_tecnico) {
    $stmt->bindParam(':tecnico', $selected_tecnico, PDO::PARAM_INT);
}
$stmt->bindParam(':data_inicio', $data_inicio, PDO::PARAM_STR);
$stmt->bindParam(':data_fim', $data_fim, PDO::PARAM_STR);
$stmt->execute();

// Contar o número de atendimentos encontrados
$num_atendimentos = $stmt->rowCount();
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Atendimentos por Técnico</title>
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="css/relatorios_modern.css">
</head>
<body class="rel-legacy-body">
<?php include_once("../all/sidebar.php"); ?>


<div class="container-fluid rel-page rel-legacy-page">
    <h2 class="text-center">Relatório de Atendimentos por Técnico</h2>
    <div class="row">
        <div class="col-md-4">
            <form method="GET" action="<?php echo $_SERVER['PHP_SELF']; ?>">
                <div class="form-group">
                    <label for="tecnico">Selecione o Técnico:</label>
                    <select class="form-control" id="tecnico" name="tecnico">
                        <option value="">Todos os Técnicos</option>
                        <?php while ($row = $tecnicos->fetch(PDO::FETCH_ASSOC)) { ?>
                            <option value="<?php echo $row['user_id']; ?>"
                                <?php if ($row['user_id'] == $selected_tecnico) echo 'selected'; ?>>
                                <?php echo $row['user_nome']; ?>
                            </option>
                        <?php } ?>
                    </select>
                </div>
                <div class="form-group">
                    <label for="data_inicio">Data Início:</label>
                    <input type="date" class="form-control" id="data_inicio" name="data_inicio"
                           value="<?php echo $data_inicio; ?>">
                </div>
                <div class="form-group">
                    <label for="data_fim">Data Fim:</label>
                    <input type="date" class="form-control" id="data_fim" name="data_fim"
                           value="<?php echo $data_fim; ?>">
                </div>
                <button type="submit" class="btn btn-primary rel-pill-btn">Filtrar</button>
            </form>
            <br>
            <a href="../atd/home.php" class="btn btn-primary rel-pill-btn">Voltar para Home</a>
        </div>
        <div class="col-md-8">
            <div class="card">
                <div class="card-header h4 text-center py-2 rel-section-header">
                    <i class="fas fa-stopwatch"></i> Tempo de Atendimento por Técnico
                </div>
                <div class="card-body">
                    <div class="table-responsive rel-table-wrap">
                    <h4 class="text-left text-red">Total de Atendimentos: <?php echo $num_atendimentos; ?></h4>
                        <table class="table table-hover rel-table">
                            <thead>
                            <tr>
                                <th class="text-center">ID do Atendimento</th>
                                <th class="text-center">Nível</th>
                                <th class="text-center">Abertura</th>
                                <th class="text-center">Status</th>
                                <th class="text-center">Tempo de Atendimento</th>
                            </tr>
                            </thead>
                            <tbody>
                            <?php while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                                $atd_id = $row['id'];
                                $atd_nivel = $row['nivel'];
                                $atd_abertura = $row['abertura'];
                                $atd_status = $row['status'];
                                $user_nome = $row['user_nome'];

                                // Definindo $sla conforme o $atd_nivel
                                if ($atd_nivel == 1) {
                                    $sla = 1;
                                } elseif ($atd_nivel == 2) {
                                    $sla = 2;
                                } elseif ($atd_nivel == 3) {
                                    $sla = 3;
                                } else {
                                    $sla = 0; // Caso não seja definido um nível válido, pode tratar aqui conforme sua lógica
                                }

                                // Calculando tempo de atendimento apenas se houver abertura definida
                                if ($atd_abertura != '-') {
                                    // Cálculo do tempo de atendimento
                                    $time_limit_to_close = date("Y-m-d H:i:s", strtotime($atd_abertura . " +$sla hours"));
                                    $time_now = date("Y-m-d H:i:s");
                                    $tempo_atendimento = strtotime($time_now) - strtotime($atd_abertura);

                                    // Formatação do tempo de atendimento
                                    $dias = floor($tempo_atendimento / (3600 * 24));
                                    $horas = floor(($tempo_atendimento % (3600 * 24)) / 3600);
                                    $minutos = floor(($tempo_atendimento % 3600) / 60);
                                    $segundos = $tempo_atendimento % 60;

                                    $tempo_formatado = sprintf("%d dias, %02d:%02d:%02d", $dias, $horas, $minutos, $segundos);
                                } else {
                                    $tempo_formatado = '-';
                                }
                                ?>
                                <tr>
                                    <td class="text-center"><?php echo $atd_id; ?></td>
                                    <td class="text-center"><?php echo $atd_nivel; ?></td>
                                    <td class="text-center"><?php echo $atd_abertura; ?></td>
                                    <td class="text-center"><?php echo $atd_status; ?></td>
                                    <td class="text-center"><?php echo $tempo_formatado; ?></td>
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
