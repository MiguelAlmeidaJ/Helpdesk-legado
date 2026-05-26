<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m8_00 == 0) {
    header("Location: ../home.php");
    exit;
}

// Captura dos filtros de técnico e data
$tecnico_id = isset($_POST['f_tec']) ? $_POST['f_tec'] : 'all';
$data_filtro = isset($_POST['f_data']) ? $_POST['f_data'] : date('Y-m-d');

// Função para buscar interaçães do técnico e data selecionados
function loadInteracoesTecnico($pdo, $tecnico_id, $data_filtro) {
    if ($tecnico_id == 'all') {
        return [];
    }

    $stmt = $pdo->prepare("
        SELECT 
            interatividade.*, 
            usuarios.user_nome AS inter_user_nome,
            atendimentos.id AS atendimento_id,
            atendimentos.tecnico
        FROM interatividade
        INNER JOIN usuarios ON usuarios.user_id = interatividade.inter_user
        INNER JOIN atendimentos ON atendimentos.id = interatividade.inter_atd
        WHERE atendimentos.tecnico = ? 
          AND interatividade.inter_user = ?
          AND DATE(interatividade.inter_data) = ?
        ORDER BY interatividade.inter_data ASC
    ");
    $stmt->execute([$tecnico_id, $tecnico_id, $data_filtro]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}


// Conexão com o banco de dados
$pdo = ConnectionN3();
if (!$pdo) {
    exit("Erro ao conectar ao banco de dados.");
}

// Carrega as interaçães do técnico e data selecionados
$interacoes_tecnico = loadInteracoesTecnico($pdo, $tecnico_id, $data_filtro);
?>

<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=0.9, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="../css/timeline.css">

    <title>Timeline do Tecnico</title>
    <style>
        body {
            zoom: 0.9; /* Escala o conteúdo sem alterar o contexto de layout */
            width: 100%; /* Mantém o layout responsivo */
            overflow-x: hidden; /* Garante que não haja rolagem horizontal */
        }

        .header-select {
            display: flex;
            gap: 10px;
        }
    </style>
</head>
<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid mt-2">
        <div class="card">
            <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-user"></i> Timeline de Interaçães do Tecnico</h5>
                <form method="POST" class="header-select col-md-5" style="margin-right: 50px;">
                    <select name="f_tec" id="f_tec" class="form-control form-control-sm" required>
                        <option value="all" <?php echo ($tecnico_id == 'all') ? 'selected' : ''; ?>>Selecione um Tecnico</option>
                        <?php
                        $stmt = $pdo->prepare("SELECT user_id, user_nome FROM usuarios WHERE user_sts = 1 AND user_funcao IN (2, 3, 4, 5, 6, 7) AND user_id != '1, 3' ORDER BY user_nome ASC");
                        $stmt->execute();
                        while ($tecnico = $stmt->fetch(PDO::FETCH_ASSOC)) {
                            $selected = ($tecnico['user_id'] == $tecnico_id) ? 'selected' : '';
                            echo "<option value=\"{$tecnico['user_id']}\" $selected>{$tecnico['user_nome']}</option>";
                        }
                        ?>
                    </select>
                    <input type="date" name="f_data" id="f_data" class="form-control form-control-sm" value="<?php echo $data_filtro; ?>" required>
                    <button type="submit" class="btn btn-primary btn-sm col-md-2">Filtrar</button>
                </form>
            </div>

            <div class="card-body">
                <div class="timeline position-relative">
                    <?php if (!empty($interacoes_tecnico)): ?>
                        <?php foreach ($interacoes_tecnico as $interacao): ?>
                            <?php
                            $inter_tipo = $interacao['inter_tipo'];
                            $inter_data = $interacao['inter_data'];
                            $inter_desc = $interacao['inter_desc'];
                            $inter_user = $interacao['inter_user_nome'];
                            $atendimento_id = $interacao['atendimento_id'];
                            $tecnico = $interacao['tecnico'];

                            // Define cores de acordo com o tipo da interatividade
                            // 0 == agendado
                            // 1 == aguardando execução
                            // 2 == em execução
                            // 3 == em espera
                            // 4 == finalizado
                            // 5 == concluído

                            $colors = [
                                1 => "b-primary", //registrou primary
                                2 => "b-success", //iniciou success
                                3 => "b-paused",
                                4 => "b-paused",
                                5 => "b-warning", //espera warning
                                6 => "b-success", //retomou success
                                7 => "b-paused",
                                8 => "b-danger", //finalizou danger
                                9 => "b-paused",
                                10 => "b-danger", // finalizado danger
                                // 11 => "b-danger",
                            ];
                            $tl_dot_color = $colors[$inter_tipo] ?? "b-primary";
                            ?>
                            <div class="tl-item d-flex">
                                <div class="tl-line"></div>
                                <div class="tl-dot <?php echo $tl_dot_color; ?>"></div>
                                <div class="tl-content">
                                    <div class="tl-date">
                                        <!-- <i class="far fa-clock"></i> <?php echo date('d/m/y H:i', strtotime($inter_data)); ?> -->
                                        <i class="far fa-clock"></i> <span style= "font-size: 18px; font-weight: bold";><?php echo date('H:i', strtotime($inter_data)); ?></span>
                                        <!-- <br> -->
                                        <!-- <i class="fas fa-hashtag"></i> Atendimento #<?php echo str_pad($atendimento_id, 5, '0', STR_PAD_LEFT); ?> -->
                                        <span style= "font-size: 14px;margin-left: 15px";>Atendimento #<?php echo str_pad($atendimento_id, 5, '0', STR_PAD_LEFT); ?> </span>
                                    </div>
                                    <div style="margin-left: 80px;">
                                         <strong><?php echo htmlspecialchars($inter_user); ?></strong>: 
                                        <?php echo $inter_desc; ?>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <p>Nenhuma interação encontrada para o técnico e data selecionados.</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.bundle.min.js"></script>
</body>
</html>
