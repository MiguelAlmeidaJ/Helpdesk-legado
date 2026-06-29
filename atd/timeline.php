<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if (!isset($m8_00) || (int)$m8_00 === 0) {
    header("Location: ../home.php");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $params = [];
    if (isset($_POST['f_tec'])) {
        $params['f_tec'] = $_POST['f_tec'];
    }
    if (isset($_POST['f_data'])) {
        $params['f_data'] = $_POST['f_data'];
    }

    $redirect = $_SERVER['PHP_SELF'] . (!empty($params) ? '?' . http_build_query($params) : '');
    header('Location: ' . $redirect);
    exit;
}

function timeline_h($value)
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function timeline_sanitize_date($value)
{
    $value = trim((string)$value);
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? $value : date('Y-m-d');
}

function timeline_tipo_meta($tipo)
{
    $map = [
        1 => ['class' => 'event-primary', 'icon' => 'fa-plus-circle', 'label' => 'Registrou'],
        2 => ['class' => 'event-success', 'icon' => 'fa-play-circle', 'label' => 'Iniciou'],
        3 => ['class' => 'event-muted', 'icon' => 'fa-reply', 'label' => 'Devolveu'],
        4 => ['class' => 'event-muted', 'icon' => 'fa-user-tag', 'label' => 'Direcionou'],
        5 => ['class' => 'event-warning', 'icon' => 'fa-pause-circle', 'label' => 'Espera'],
        6 => ['class' => 'event-success', 'icon' => 'fa-redo-alt', 'label' => 'Retomou'],
        7 => ['class' => 'event-muted', 'icon' => 'fa-comment-dots', 'label' => 'Interacao'],
        8 => ['class' => 'event-danger', 'icon' => 'fa-check-circle', 'label' => 'Finalizou'],
        9 => ['class' => 'event-muted', 'icon' => 'fa-edit', 'label' => 'Editou'],
        10 => ['class' => 'event-danger', 'icon' => 'fa-clipboard-check', 'label' => 'Concluiu'],
    ];

    return $map[(int)$tipo] ?? ['class' => 'event-primary', 'icon' => 'fa-circle', 'label' => 'Interacao'];
}

function timeline_load_tecnicos($pdo)
{
    $stmt = $pdo->prepare("
        SELECT user_id, user_nome
        FROM usuarios
        WHERE user_sts = 1
          AND user_funcao IN (2, 3, 4, 5, 6, 7)
          AND user_id NOT IN (1, 3)
        ORDER BY user_nome ASC
    ");
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function timeline_load_interacoes($pdo, $tecnicoId, $dataFiltro)
{
    if ($tecnicoId === 'all') {
        return [];
    }

    $inicio = $dataFiltro . ' 00:00:00';
    $fim = date('Y-m-d H:i:s', strtotime($dataFiltro . ' +1 day'));

    $stmt = $pdo->prepare("
        SELECT
            interatividade.*,
            usuarios.user_nome AS inter_user_nome,
            atendimentos.id AS atendimento_id,
            atendimentos.tecnico,
            clientes.clt_nomef AS cliente_nome
        FROM interatividade
        INNER JOIN usuarios ON usuarios.user_id = interatividade.inter_user
        INNER JOIN atendimentos ON atendimentos.id = interatividade.inter_atd
        LEFT JOIN clientes ON clientes.clt_id = atendimentos.cliente
        WHERE atendimentos.tecnico = :tecnico_atd
          AND interatividade.inter_user = :tecnico_inter
          AND interatividade.inter_data >= :inicio
          AND interatividade.inter_data < :fim
        ORDER BY interatividade.inter_data ASC, interatividade.inter_id ASC
    ");
    $stmt->execute([
        ':tecnico_atd' => (int)$tecnicoId,
        ':tecnico_inter' => (int)$tecnicoId,
        ':inicio' => $inicio,
        ':fim' => $fim,
    ]);

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

$tecnico_id = $_GET['f_tec'] ?? 'all';
$tecnico_id = $tecnico_id === 'all' ? 'all' : (int)$tecnico_id;
$data_filtro = timeline_sanitize_date($_GET['f_data'] ?? date('Y-m-d'));

$pdo = ConnectionN3();
if (!$pdo) {
    exit("Erro ao conectar ao banco de dados.");
}

$tecnicos = timeline_load_tecnicos($pdo);
$interacoes_tecnico = timeline_load_interacoes($pdo, $tecnico_id, $data_filtro);

$tecnico_nome = 'Selecione um tecnico';
foreach ($tecnicos as $tecnico) {
    if ((int)$tecnico['user_id'] === (int)$tecnico_id) {
        $tecnico_nome = $tecnico['user_nome'];
        break;
    }
}

$atendimentos_unicos = [];
foreach ($interacoes_tecnico as $interacao) {
    $atendimentos_unicos[(int)$interacao['atendimento_id']] = true;
}

$primeira_interacao = !empty($interacoes_tecnico) ? reset($interacoes_tecnico)['inter_data'] : null;
$ultima_interacao = !empty($interacoes_tecnico) ? end($interacoes_tecnico)['inter_data'] : null;
?>
<!doctype html>
<html lang="pt-BR">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <title>Timeline do Tecnico</title>
    <style>
        html {
            height: 100%;
            background: #f6f8fb;
            overflow: hidden;
        }

        body {
            height: 100vh;
            width: 100%;
            margin: 0;
            overflow: hidden;
            background: #f6f8fb;
            color: #0f172a;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            font-size: 90%;
        }

        body,
        button,
        input,
        select {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .container-fluid {
            max-width: 100vw;
            padding: 0;
            overflow: hidden;
        }

        .container-fluid>.row {
            margin: 0;
        }

        .container-fluid>.row>[class*="col-"] {
            padding: 0;
        }

        .timeline-shell {
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .timeline-top {
            flex: 0 0 auto;
            background: #fff;
            border-bottom: 1px solid #d9e0ea;
            box-shadow: 0 2px 8px rgba(15, 23, 42, .05);
        }

        .page-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 14px 10px;
        }

        .page-title {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
        }

        .page-title i {
            width: 30px;
            height: 30px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #0b7285;
            background: #eef9fc;
            border: 1px solid #d4eef4;
            border-radius: 6px;
        }

        .page-title h1 {
            margin: 0;
            color: #0f172a;
            font-size: 1.08rem;
            font-weight: 700;
        }

        .page-title span {
            display: block;
            margin-top: 2px;
            color: #64748b;
            font-size: .78rem;
        }

        .summary-bar {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
            gap: 16px;
            padding: 10px 12px 14px;
            background: #fff;
            border-bottom: 1px solid #e9ecef;
        }

        .summary-card {
            min-height: 78px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            background: #fff;
            box-shadow: 0 3px 8px rgba(15, 23, 42, .08);
            text-align: center;
        }

        .summary-card strong {
            color: #111827;
            font-size: 1.08rem;
            font-weight: 700;
            line-height: 1.1;
        }

        .summary-card span {
            margin-top: 4px;
            color: #5f6b7a;
            font-size: .7rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .summary-primary {
            border-color: #0d6efd;
        }

        .summary-success {
            border-color: #15b33a;
        }

        .summary-warning {
            border-color: #fd7e14;
        }

        .filters-toolbar {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            padding: 12px 14px 10px;
            background: #fff;
            border-bottom: 1px solid #d9e0ea;
            box-shadow: 0 2px 8px rgba(15, 23, 42, .05);
        }

        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1 1 0;
            min-width: 0;
        }

        .filter-group.filter-date {
            flex: 0 0 180px;
        }

        .filter-group label {
            margin: 0;
            color: #172033;
            font-size: .86rem;
            font-weight: 500;
            line-height: 1.15;
        }

        .form-control-sm {
            height: 34px;
            min-height: 34px;
            border: 1px solid #d3dbe7;
            border-radius: 4px;
            color: #172033;
            font-size: .86rem;
            box-shadow: none;
        }

        .form-control-sm:focus {
            border-color: #74a7e8;
            box-shadow: 0 0 0 2px rgba(13, 110, 253, .12);
        }

        .btn-action {
            height: 34px;
            min-width: 64px;
            border-radius: 4px;
            font-size: .86rem;
            font-weight: 500;
            white-space: nowrap;
        }

        .timeline-scroll {
            flex: 1 1 auto;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 10px 14px 12px;
        }

        .timeline-panel {
            width: calc(100vw - 64px);
            max-width: 1760px;
            margin: 0 auto;
            border: 1px solid #dbe4ef;
            border-radius: 8px;
            background: #fff;
            box-shadow: 0 3px 8px rgba(15, 23, 42, .06);
        }

        .timeline-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 8px 12px;
            border-bottom: 1px solid #e7edf5;
            color: #172033;
            font-weight: 700;
        }

        .timeline-panel-header small {
            color: #64748b;
            font-weight: 600;
        }

        .timeline-list {
            position: relative;
            padding: 8px 12px 12px;
        }

        .timeline-item {
            --event-color: #448bff;
            position: relative;
            display: grid;
            grid-template-columns: 84px 32px minmax(0, 1fr);
            gap: 10px;
            padding: 6px 0;
        }

        .time-block {
            padding-top: 7px;
            color: #0f172a;
            text-align: right;
        }

        .time-block strong {
            display: block;
            font-size: 1rem;
            line-height: 1;
        }

        .time-block span {
            display: block;
            margin-top: 3px;
            color: #64748b;
            font-size: .72rem;
            font-weight: 600;
        }

        .event-rail {
            position: relative;
            min-height: 100%;
        }

        .event-rail::before {
            content: "";
            position: absolute;
            top: 0;
            bottom: 0;
            left: calc(50% - 1px);
            width: 2px;
            transform: none;
            background: var(--event-color);
            opacity: .72;
        }

        .timeline-item:first-child .event-rail::before {
            top: 18px;
        }

        .timeline-item:last-child .event-rail::before {
            bottom: calc(100% - 18px);
        }

        .event-dot {
            position: absolute;
            top: 10px;
            left: calc(50% - 7px);
            transform: none;
            z-index: 3;
            box-sizing: border-box;
            width: 14px;
            height: 14px;
            display: block;
            margin: 0;
            border: 3px solid var(--event-color);
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 0 0 3px #fff;
        }

        .event-card {
            border: 1px solid #e0e7f0;
            border-radius: 6px;
            background: #fff;
            padding: 8px 10px;
            box-shadow: 0 2px 6px rgba(15, 23, 42, .045);
        }

        .event-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 6px;
        }

        .event-title {
            display: flex;
            align-items: center;
            gap: 7px;
            min-width: 0;
            color: #172033;
            font-weight: 700;
        }

        .event-title i {
            color: var(--event-color);
        }

        .event-ticket {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            border: 1px solid #d3dbe7;
            border-radius: 4px;
            padding: 3px 6px;
            color: #172033;
            background: #f8fafc;
            font-size: .76rem;
            font-weight: 700;
            text-decoration: none;
            white-space: nowrap;
        }

        .event-ticket:hover {
            color: #172033;
            text-decoration: none;
            border-color: #94b8d4;
            background: #fff;
        }

        .event-client {
            color: #64748b;
            font-size: .78rem;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .event-desc {
            color: #263244;
            font-size: .86rem;
            line-height: 1.45;
            word-break: break-word;
        }

        .event-primary {
            --event-color: #448bff;
        }

        .event-primary .event-rail::before {
            background: #448bff !important;
        }

        .event-primary .event-dot {
            border-color: #448bff !important;
        }

        .event-primary .event-title i {
            color: #448bff !important;
        }

        .event-success {
            --event-color: #22bb33;
        }

        .event-success .event-rail::before {
            background: #22bb33 !important;
        }

        .event-success .event-dot {
            border-color: #22bb33 !important;
        }

        .event-success .event-title i {
            color: #22bb33 !important;
        }

        .event-warning {
            --event-color: #f4c414;
        }

        .event-warning .event-rail::before {
            background: #f4c414 !important;
        }

        .event-warning .event-dot {
            border-color: #f4c414 !important;
        }

        .event-warning .event-title i {
            color: #f4c414 !important;
        }

        .event-danger {
            --event-color: #f54394;
        }

        .event-danger .event-rail::before {
            background: #f54394 !important;
        }

        .event-danger .event-dot {
            border-color: #f54394 !important;
        }

        .event-danger .event-title i {
            color: #f54394 !important;
        }

        .event-muted {
            --event-color: #8ca3bd;
        }

        .event-muted .event-rail::before {
            background: #8ca3bd !important;
        }

        .event-muted .event-dot {
            border-color: #8ca3bd !important;
        }

        .event-muted .event-title i {
            color: #8ca3bd !important;
        }

        .empty-state {
            padding: 42px 20px;
            text-align: center;
            color: #64748b;
        }

        .empty-state i {
            display: block;
            margin-bottom: 10px;
            color: #9fb0c4;
            font-size: 2rem;
        }

        @media (max-width: 900px) {
            html,
            body {
                height: auto;
                overflow: auto;
            }

            .timeline-shell {
                min-height: 100vh;
                height: auto;
            }

            .filters-toolbar {
                flex-wrap: wrap;
            }

            .filter-group,
            .filter-group.filter-date {
                flex: 1 1 220px;
            }

            .timeline-scroll {
                overflow: visible;
                padding: 10px 8px 12px;
            }

            .timeline-panel {
                width: calc(100vw - 16px);
            }
        }

        @media (max-width: 640px) {
            .summary-bar {
                grid-template-columns: 1fr;
            }

            .page-title-row,
            .filters-toolbar {
                align-items: stretch;
                flex-direction: column;
            }

            .filters-toolbar .btn,
            .filter-group,
            .filter-group.filter-date {
                width: 100%;
            }

            .timeline-item {
                grid-template-columns: 28px minmax(0, 1fr);
            }

            .time-block {
                grid-column: 2;
                text-align: left;
                padding-top: 0;
            }

            .event-rail {
                grid-row: 1 / span 2;
            }
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid">
        <div class="row">
            <div class="col-12">
                <main class="timeline-shell">
                    <section class="timeline-top">
                        <div class="page-title-row">
                            <div class="page-title">
                                <i class="fas fa-stream"></i>
                                <div>
                                    <h1>Timeline do Tecnico</h1>
                                    <span><?php echo timeline_h($tecnico_nome); ?> em <?php echo date('d/m/Y', strtotime($data_filtro)); ?></span>
                                </div>
                            </div>
                        </div>

                        <div class="summary-bar">
                            <div class="summary-card summary-primary">
                                <strong><?php echo count($interacoes_tecnico); ?></strong>
                                <span>Interacoes</span>
                            </div>
                            <div class="summary-card summary-success">
                                <strong><?php echo count($atendimentos_unicos); ?></strong>
                                <span>Atendimentos</span>
                            </div>
                            <div class="summary-card summary-warning">
                                <strong><?php echo $primeira_interacao ? date('H:i', strtotime($primeira_interacao)) : '--'; ?></strong>
                                <span>Primeira interacao</span>
                            </div>
                            <div class="summary-card">
                                <strong><?php echo $ultima_interacao ? date('H:i', strtotime($ultima_interacao)) : '--'; ?></strong>
                                <span>Ultima interacao</span>
                            </div>
                        </div>

                        <form method="GET" class="filters-toolbar">
                            <div class="filter-group">
                                <label for="f_tec">Tecnico</label>
                                <select name="f_tec" id="f_tec" class="form-control form-control-sm" required>
                                    <option value="all" <?php echo ($tecnico_id === 'all') ? 'selected' : ''; ?>>Selecione um Tecnico</option>
                                    <?php foreach ($tecnicos as $tecnico) : ?>
                                        <?php $selected = ((int)$tecnico['user_id'] === (int)$tecnico_id) ? 'selected' : ''; ?>
                                        <option value="<?php echo (int)$tecnico['user_id']; ?>" <?php echo $selected; ?>>
                                            <?php echo timeline_h($tecnico['user_nome']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="filter-group filter-date">
                                <label for="f_data">Data</label>
                                <input type="date" name="f_data" id="f_data" class="form-control form-control-sm" value="<?php echo timeline_h($data_filtro); ?>" required>
                            </div>
                            <button type="submit" class="btn btn-info btn-sm btn-action">Filtrar</button>
                            <a href="timeline.php?f_tec=<?php echo urlencode((string)$tecnico_id); ?>&f_data=<?php echo date('Y-m-d'); ?>" class="btn btn-outline-info btn-sm btn-action">Hoje</a>
                        </form>
                    </section>

                    <section class="timeline-scroll">
                        <div class="timeline-panel">
                            <div class="timeline-panel-header">
                                <span><i class="fas fa-clock"></i> Interacoes do dia</span>
                                <small><?php echo count($interacoes_tecnico); ?> registro(s)</small>
                            </div>

                            <?php if (!empty($interacoes_tecnico)) : ?>
                                <div class="timeline-list">
                                    <?php foreach ($interacoes_tecnico as $interacao) : ?>
                                        <?php
                                        $meta = timeline_tipo_meta($interacao['inter_tipo']);
                                        $atendimentoId = (int)$interacao['atendimento_id'];
                                        $clienteNome = $interacao['cliente_nome'] ?: 'Sem cliente';
                                        ?>
                                        <div class="timeline-item <?php echo timeline_h($meta['class']); ?>">
                                            <div class="time-block">
                                                <strong><?php echo date('H:i', strtotime($interacao['inter_data'])); ?></strong>
                                                <span><?php echo date('d/m', strtotime($interacao['inter_data'])); ?></span>
                                            </div>
                                            <div class="event-rail"><span class="event-dot"></span></div>
                                            <article class="event-card">
                                                <div class="event-card-header">
                                                    <div class="event-title">
                                                        <i class="fas <?php echo timeline_h($meta['icon']); ?>"></i>
                                                        <span><?php echo timeline_h($meta['label']); ?></span>
                                                    </div>
                                                    <a class="event-ticket" href="atd_detalhe.php?atd=<?php echo urlencode((string)$atendimentoId); ?>" target="_blank" rel="noopener">
                                                        <i class="fas fa-hashtag"></i><?php echo str_pad((string)$atendimentoId, 5, '0', STR_PAD_LEFT); ?>
                                                    </a>
                                                </div>
                                                <div class="event-client"><?php echo timeline_h($clienteNome); ?></div>
                                                <div class="event-desc">
                                                    <strong><?php echo timeline_h($interacao['inter_user_nome']); ?>:</strong>
                                                    <?php echo $interacao['inter_desc']; ?>
                                                </div>
                                            </article>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            <?php else : ?>
                                <div class="empty-state">
                                    <i class="far fa-calendar-check"></i>
                                    <?php if ($tecnico_id === 'all') : ?>
                                        Selecione um tecnico para visualizar a timeline.
                                    <?php else : ?>
                                        Nenhuma interacao encontrada para o tecnico e data selecionados.
                                    <?php endif; ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    </div>

    <script src="../js/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.bundle.min.js"></script>
</body>

</html>
