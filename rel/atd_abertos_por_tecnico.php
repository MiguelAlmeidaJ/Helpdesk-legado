<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
//include_once("../all/token.php");
$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");

//verifico se existe alguma requisição POST chamada action
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

if ($action == "alterar_senha") {
    include_once("../all/update_senha.php");
}

header("Refresh:60");
?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/help.css">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="css/relatorios_modern.css">
    <title>Atendimentos Abertos por Técnico</title>
</head>
<body>
<?php include_once("../all/sidebar.php"); ?>
<!-- parte acima direcionada ao cabeçalho (incluir e ajustar para necessário)-->

<div class="container-fluid rel-page">
    <div class="card rel-main-card">
        <div class="card-header rel-toolbar">
            <div class="rel-title">
                <span class="rel-title-icon"><i class="fas fa-list-ul"></i></span>
                <div>
                    <h4>Atendimentos Abertos por Técnico</h4>
                    <small>Resumo operacional por técnico/analista, atualizado automaticamente a cada 60 segundos.</small>
                </div>
            </div>
            <a href="../home.php" class="btn btn-outline-secondary btn-sm rel-pill-btn" title="Voltar para home"><i class="fas fa-home"></i></a>
        </div>

        <div class="card-body rel-card-body">
            <div class="rel-table-wrap">
                <table class="table table-hover rel-table rel-kpi-table">
                        <thead>
                        <tr>
                            <th>Técnico/Analista</th>
                            <th class="text-center">Aberto</th>
                            <th class="text-center">Em espera</th>
                            <th class="text-center">Vencidos</th>
                            <th class="text-center">Tempo aberto (d:h:m)</th>
                        </tr>
                        </thead>
                        <tbody>
                        <?php
                        // Buscando lista de usuários
                        $filterEmpresas = "";

                        if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                            $filterEmpresas .= " AND atendimentos.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
                        }

                        $pdo = ConnectionN3();
                        $show_atd = $pdo->prepare("SELECT usuarios.user_nome, usuarios.user_id FROM usuarios WHERE usuarios.user_sts = '1' AND usuarios.user_funcao IN (5, 6) ORDER BY usuarios.user_nome ASC");
                        $show_atd->execute();
                        while ($row = $show_atd->fetch(PDO::FETCH_ASSOC)) {
                            $user_name = $row["user_nome"];
                            $user_id = $row["user_id"];

                            // Inicializando contadores de chamados
                            $atd_ab = 0;
                            $atd_ep = 0;
                            $atd_venc = 0;
                            $tempo_acumulado = 0;

                            // Contar chamados em aberto para usuário
                            $cont_atd = $pdo->prepare("SELECT COUNT(atendimentos.id) AS atendimentos_abertos FROM atendimentos WHERE atendimentos.tecnico = :user_id AND atendimentos.`status` IN (1, 2) " . $filterEmpresas);
                            $cont_atd->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                            $cont_atd->execute();
                            $row2 = $cont_atd->fetch(PDO::FETCH_ASSOC);
                            $atd_ab = $row2["atendimentos_abertos"];

                            // Contar chamados em espera para usuário
                            $cont_atd = $pdo->prepare("SELECT COUNT(atendimentos.id) AS atendimentos_espera FROM atendimentos WHERE atendimentos.tecnico = :user_id AND atendimentos.`status` = '3' " . $filterEmpresas);
                            $cont_atd->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                            $cont_atd->execute();
                            $row2 = $cont_atd->fetch(PDO::FETCH_ASSOC);
                            $atd_ep = $row2["atendimentos_espera"];

                            // Buscar cada atendimento aberto do usuário para contar chamados vencidos e calcular tempo acumulado
                            $show_atd_user = $pdo->prepare("SELECT atendimentos.id, atendimentos.nivel, atendimentos.abertura FROM atendimentos WHERE atendimentos.tecnico = :user_id AND atendimentos.`status` IN (1, 2)" . $filterEmpresas);
                            $show_atd_user->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                            $show_atd_user->execute();
                            while ($row_user = $show_atd_user->fetch(PDO::FETCH_ASSOC)) {
                                // ID do atendimento para buscar as esperas que ele teve
                                $atd_id = $row_user["id"];
                                // Nível para determinar o prazo de fechamento
                                $atd_nivel = $row_user["nivel"];
                                $sla = 0;
                                switch ($atd_nivel) {
                                    case 1:
                                        $sla = 1;
                                        break;
                                    case 2:
                                        $sla = 2;
                                        break;
                                    case 3:
                                        $sla = 3;
                                        break;
                                    case 4:
                                        $sla = 4;
                                        break;
                                    case 5:
                                        $sla = 5;
                                        break;
                                }

                                // Data hora em que o atendimento foi aberto
                                $atd_hora_abertura = $row_user["abertura"];

                                // TIME TO CLOSE
                                // Calcula hora limite para o fechamento do atendimento: Abertura + SLA
                                $time_limit_to_close = date("Y-m-d H:i:s", strtotime($atd_hora_abertura . " +$sla hours"));
                                // Hora atual
                                $time_now = date("Y-m-d H:i:s");
                                $start_date = new DateTime($time_now);

                                // Total de tempo em que o atendimento ficou pausado (em espera)
                                $show_espera = $pdo->prepare("SELECT SUM(TIMESTAMPDIFF(SECOND, espera_start, espera_end)) AS segundos FROM espera WHERE espera.espera_atd = :atd_id");
                                $show_espera->bindParam(':atd_id', $atd_id, PDO::PARAM_INT);
                                $show_espera->execute();
                                $exibe_espera = $show_espera->fetch(PDO::FETCH_ASSOC);
                                $espera_tempo_total = $exibe_espera["segundos"];
                                if ($espera_tempo_total == "") {
                                    $espera_tempo_total = 0;
                                }

                                // Soma o tempo total de espera ao prazo para o fechamento do atendimento
                                $end_date0 = date("Y-m-d H:i:s", strtotime($time_limit_to_close . " +$espera_tempo_total SECOND"));
                                $end_date = new DateTime($end_date0);

                                // Calcular se o atendimento está atrasado
                                if ($start_date > $end_date) {
                                    $atd_venc++;
                                }

                                // Calcular tempo acumulado de atendimentos para o técnico
                                $atendimento_abertura = new DateTime($atd_hora_abertura);
                                $interval = $atendimento_abertura->diff($start_date);
                                $tempo_acumulado += $interval->days * 24 * 60 + $interval->h * 60 + $interval->i;
                            }

                            // Converter tempo acumulado em dias, horas e minutos
                            $dias = floor($tempo_acumulado / (24 * 60));
                            $horas = floor(($tempo_acumulado - ($dias * 24 * 60)) / 60);
                            $minutos = $tempo_acumulado % 60;

                            ?>
                            <tr>
                                <td><div class="rel-user-name"><?php echo htmlspecialchars($user_name); ?></div></td>
                                <td class="text-center"><span class="rel-count rel-count-open"><?php echo $atd_ab; ?></span></td>
                                <td class="text-center"><span class="rel-count rel-count-wait"><?php echo $atd_ep; ?></span></td>
                                <td class="text-center"><span class="rel-count <?php echo $atd_venc > 0 ? 'rel-count-danger' : 'rel-count-neutral'; ?>"><?php echo $atd_venc; ?></span></td>
                                <td class="text-center"><span class="rel-time-badge"><?php echo sprintf('%d:%02d:%02d', $dias, $horas, $minutos); ?></span></td>
                            </tr>
                            <?php
                        }
                        ?>
                        </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- MODAL DE AJUDA PARA A GESTÃO DE UM ATENDIMENTO -->
<div class="modal fade rel-modal" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-primary"></i> Ajuda com relatórios</h6>
                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
            </div>
            <div class="modal-body">
                <p><strong>Relatório de atendimentos abertos por técnico:</strong></p>
                <p>Em desenvolvimento...</p>
            </div>
        </div>
    </div>
</div>

<?php include_once("../all/update_pass.php"); ?>
<script src="../js/jquery-3.6.0.min.js"></script>
<script src="../js/bootstrap.bundle.min.js"></script>

<?php if (isset($mensagem)) { ?>
    <div class="rel-floating-alert">
        <div class="alert <?php echo $mensagem_cor; ?> alert-dismissible fade show" role="alert">
            <?php echo $mensagem; ?>
            <button type="button" class="close" data-dismiss="alert" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    </div>
<?php } ?>
<?php if (isset($mensagem)) { ?>
    <script>
        window.setTimeout(function () {
            $(".alert").alert('close');
        }, 5000);
    </script>
<?php } ?>
    <script src="js/relatorios_modern.js"></script>
</body>
</html>
