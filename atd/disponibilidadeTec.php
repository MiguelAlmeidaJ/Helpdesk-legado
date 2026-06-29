<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if (!isset($m8_00) || (int)$m8_00 === 0) {
    header("Location: ../home.php");
    exit;
}

function disp_h($value)
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function disp_roles_tecnicos()
{
    return [5, 6, 10, 12, 14];
}

function disp_tipo_nome($tipo)
{
    $mapa = [
        0 => 'Nao informado',
        1 => 'Falha',
        2 => 'Relacionamento',
        3 => 'Requisicao de Servicos',
        4 => 'Requisicao de Informacao',
        6 => 'Melhoria',
    ];

    return $mapa[(int)$tipo] ?? 'Desconhecido';
}

function disp_prioridade_nome($prioridade)
{
    $mapa = [
        1 => 'Baixa',
        2 => 'Media',
        3 => 'Alta',
        4 => 'Urgente',
    ];

    return $mapa[(int)$prioridade] ?? 'NA';
}

function disp_setor_nome($funcao)
{
    $funcao = (int)$funcao;
    return ($funcao >= 9 && $funcao <= 14) ? 'DevOps' : 'TI';
}

function disp_format_atd($id)
{
    return '#' . str_pad((string)(int)$id, 5, '0', STR_PAD_LEFT);
}

function disp_format_data($data)
{
    if (empty($data)) {
        return '';
    }

    $ts = strtotime($data);
    return $ts ? date('d/m/y H:i', $ts) : '';
}

function disp_minutes_since($data)
{
    if (empty($data)) {
        return null;
    }

    $ts = strtotime($data);
    if (!$ts) {
        return null;
    }

    return max(0, (int)floor((time() - $ts) / 60));
}

function disp_tempo_curto($minutes)
{
    if ($minutes === null) {
        return '';
    }

    $minutes = (int)$minutes;
    if ($minutes < 60) {
        return $minutes . 'min';
    }

    $hours = (int)floor($minutes / 60);
    $rest = $minutes % 60;
    if ($hours < 24) {
        return $hours . 'h' . ($rest > 0 ? ' ' . $rest . 'min' : '');
    }

    $days = (int)floor($hours / 24);
    $dayHours = $hours % 24;
    return $days . 'd' . ($dayHours > 0 ? ' ' . $dayHours . 'h' : '');
}

function disp_normalize_filters()
{
    $setor = $_GET['setor'] ?? 'todos';
    if (!in_array($setor, ['todos', 'ti', 'devops'], true)) {
        $setor = 'todos';
    }

    $foco = $_GET['foco'] ?? 'todos';
    if (!in_array($foco, ['todos', 'livres', 'execucao', 'espera', 'sobrecarga'], true)) {
        $foco = 'todos';
    }

    return [
        'setor' => $setor,
        'foco' => $foco,
        'busca' => trim((string)($_GET['busca'] ?? '')),
    ];
}

function disp_ids_placeholders($values, $prefix)
{
    $params = [];
    $placeholders = [];

    foreach (array_values(array_unique(array_map('intval', $values))) as $index => $value) {
        $name = ':' . $prefix . $index;
        $placeholders[] = $name;
        $params[$name] = $value;
    }

    return [
        'sql' => implode(', ', $placeholders),
        'params' => $params,
    ];
}

function disp_bind_params($stmt, $params)
{
    foreach ($params as $name => $value) {
        $stmt->bindValue($name, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
}

function disp_fetch_tecnicos($pdo)
{
    $roles = disp_ids_placeholders(disp_roles_tecnicos(), 'role');
    $stmt = $pdo->prepare("
        SELECT user_id, user_nome, user_funcao
        FROM usuarios
        WHERE user_sts = 1
          AND user_id > 1
          AND user_funcao IN (" . $roles['sql'] . ")
        ORDER BY user_nome ASC
    ");
    disp_bind_params($stmt, $roles['params']);
    $stmt->execute();

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function disp_fetch_atendimentos($pdo)
{
    $roles = disp_ids_placeholders(disp_roles_tecnicos(), 'role_atd');
    $sql = "
        SELECT
            atendimentos.id,
            atendimentos.status,
            atendimentos.tipo,
            atendimentos.abertura,
            atendimentos.fechamento,
            atendimentos.tecnico,
            atendimentos.nivel,
            atendimentos.prioridade,
            clientes.clt_nomef AS cliente_nome,
            usuarios.user_nome AS tecnico_nome,
            usuarios.user_funcao,
            0 AS qtde_espera,
            NULL AS espera_causa,
            NULL AS espera_start,
            NULL AS espera_prev
        FROM atendimentos
        LEFT JOIN clientes ON clientes.clt_id = atendimentos.cliente
        LEFT JOIN usuarios ON usuarios.user_id = atendimentos.tecnico
        WHERE (
            atendimentos.status IN (0, 1, 2, 3)
            OR (
                atendimentos.status IN (4, 5)
                AND atendimentos.fechamento >= CURDATE()
                AND atendimentos.fechamento < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
            )
        )
        AND (
            atendimentos.tecnico IS NULL
            OR atendimentos.tecnico = 0
            OR usuarios.user_id IS NULL
            OR (
                usuarios.user_sts = 1
                AND usuarios.user_funcao IN (" . $roles['sql'] . ")
            )
        )
        ORDER BY atendimentos.status ASC, atendimentos.abertura ASC, atendimentos.id ASC
    ";

    $stmt = $pdo->prepare($sql);
    disp_bind_params($stmt, $roles['params']);
    $stmt->execute();

    return disp_hydrate_espera($pdo, $stmt->fetchAll(PDO::FETCH_ASSOC));
}

function disp_hydrate_espera($pdo, $rows)
{
    if (empty($rows)) {
        return $rows;
    }

    $ids = [];
    foreach ($rows as $row) {
        if ((int)$row['status'] === 3) {
            $ids[] = (int)$row['id'];
        }
    }

    if (empty($ids)) {
        return $rows;
    }

    $in = disp_ids_placeholders($ids, 'espera_atd');
    $stmt = $pdo->prepare("
        SELECT
            espera_info.espera_atd,
            espera_info.qtde_espera,
            espera.espera_causa,
            espera.espera_start,
            espera.espera_prev
        FROM (
            SELECT espera_atd, COUNT(*) AS qtde_espera, MAX(espera_id) AS espera_id
            FROM espera
            WHERE espera_atd IN (" . $in['sql'] . ")
            GROUP BY espera_atd
        ) espera_info
        INNER JOIN espera ON espera.espera_id = espera_info.espera_id
    ");
    disp_bind_params($stmt, $in['params']);
    $stmt->execute();

    $esperaPorAtendimento = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $esperaPorAtendimento[(int)$row['espera_atd']] = $row;
    }

    foreach ($rows as $index => $row) {
        $id = (int)$row['id'];
        if (!isset($esperaPorAtendimento[$id])) {
            continue;
        }

        $rows[$index]['qtde_espera'] = (int)$esperaPorAtendimento[$id]['qtde_espera'];
        $rows[$index]['espera_causa'] = $esperaPorAtendimento[$id]['espera_causa'];
        $rows[$index]['espera_start'] = $esperaPorAtendimento[$id]['espera_start'];
        $rows[$index]['espera_prev'] = $esperaPorAtendimento[$id]['espera_prev'];
    }

    return $rows;
}

function disp_ticket_from_row($row)
{
    $openedMinutes = disp_minutes_since($row['abertura']);
    $waitMinutes = disp_minutes_since($row['espera_start']);

    return [
        'id' => (int)$row['id'],
        'status' => (int)$row['status'],
        'tipo' => (int)$row['tipo'],
        'tipo_nome' => disp_tipo_nome($row['tipo']),
        'cliente' => $row['cliente_nome'] ?: 'Sem cliente',
        'abertura' => $row['abertura'],
        'fechamento' => $row['fechamento'],
        'tecnico' => (int)$row['tecnico'],
        'nivel' => (int)$row['nivel'],
        'prioridade' => (int)$row['prioridade'],
        'prioridade_nome' => disp_prioridade_nome($row['prioridade']),
        'qtde_espera' => (int)$row['qtde_espera'],
        'espera_causa' => $row['espera_causa'] ?: 'Sem motivo',
        'espera_start' => $row['espera_start'],
        'espera_prev' => $row['espera_prev'],
        'tempo_aberto_min' => $openedMinutes,
        'tempo_espera_min' => $waitMinutes,
    ];
}

function disp_empty_tecnico($row)
{
    return [
        'id' => (int)$row['user_id'],
        'nome' => $row['user_nome'],
        'funcao' => (int)$row['user_funcao'],
        'setor' => disp_setor_nome($row['user_funcao']),
        'execucao' => [],
        'fila' => [],
        'espera' => [],
        'agendados' => [],
        'concluidos_hoje' => [],
    ];
}

function disp_build_dashboard($pdo, $filters)
{
    $tecnicos = disp_fetch_tecnicos($pdo);
    $allIds = array_map(function ($tecnico) {
        return (int)$tecnico['user_id'];
    }, $tecnicos);

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'salvar_visualizacao') {
        $_SESSION['tecnicos_selecionados'] = isset($_POST['tecnicos'])
            ? array_values(array_intersect(array_map('intval', $_POST['tecnicos']), $allIds))
            : [];

        $query = $_GET ? '?' . http_build_query($_GET) : '';
        header('Location: ' . $_SERVER['PHP_SELF'] . $query);
        exit;
    }

    if (!isset($_SESSION['tecnicos_selecionados']) || !is_array($_SESSION['tecnicos_selecionados'])) {
        $_SESSION['tecnicos_selecionados'] = $allIds;
    }

    $selectedIds = array_values(array_intersect(array_map('intval', $_SESSION['tecnicos_selecionados']), $allIds));
    $selectedMap = array_fill_keys($selectedIds, true);

    $byId = [];
    foreach ($tecnicos as $tecnico) {
        $id = (int)$tecnico['user_id'];
        if (!isset($selectedMap[$id])) {
            continue;
        }

        $setor = strtolower(disp_setor_nome($tecnico['user_funcao']));
        if ($filters['setor'] === 'ti' && $setor !== 'ti') {
            continue;
        }
        if ($filters['setor'] === 'devops' && $setor !== 'devops') {
            continue;
        }
        if ($filters['busca'] !== '' && stripos($tecnico['user_nome'], $filters['busca']) === false) {
            continue;
        }

        $byId[$id] = disp_empty_tecnico($tecnico);
    }

    $filaSemTecnico = [];
    $agendadosSemTecnico = [];
    $esperaPorCausa = [];

    foreach (disp_fetch_atendimentos($pdo) as $row) {
        $ticket = disp_ticket_from_row($row);
        $status = (int)$row['status'];
        $tecnicoId = (int)$row['tecnico'];
        $hasVisibleTech = isset($byId[$tecnicoId]);

        if ($status === 1) {
            if ($hasVisibleTech) {
                $byId[$tecnicoId]['fila'][] = $ticket;
            } elseif ($tecnicoId <= 0 || $filters['setor'] === 'todos') {
                $filaSemTecnico[] = $ticket;
            }
            continue;
        }

        if ($status === 0) {
            if ($hasVisibleTech) {
                $byId[$tecnicoId]['agendados'][] = $ticket;
            } elseif ($tecnicoId <= 0 || $filters['setor'] === 'todos') {
                $agendadosSemTecnico[] = $ticket;
            }
            continue;
        }

        if (!$hasVisibleTech) {
            continue;
        }

        if ($status === 2) {
            $byId[$tecnicoId]['execucao'][] = $ticket;
        } elseif ($status === 3) {
            $byId[$tecnicoId]['espera'][] = $ticket;
            $causa = $ticket['espera_causa'];
            if (!isset($esperaPorCausa[$causa])) {
                $esperaPorCausa[$causa] = [];
            }
            $esperaPorCausa[$causa][] = [
                'tecnico' => $byId[$tecnicoId]['nome'],
                'ticket' => $ticket,
            ];
        } elseif ($status === 4 || $status === 5) {
            $byId[$tecnicoId]['concluidos_hoje'][] = $ticket;
        }
    }

    $tecnicosVisiveis = array_values($byId);
    usort($tecnicosVisiveis, function ($a, $b) {
        return strcasecmp($a['nome'], $b['nome']);
    });

    $tecnicosFiltrados = [];
    foreach ($tecnicosVisiveis as $tecnico) {
        $exec = count($tecnico['execucao']);
        $espera = count($tecnico['espera']);
        $fila = count($tecnico['fila']);
        $sobrecarga = $exec > 1 || ($exec + $fila) >= 3;

        if ($filters['foco'] === 'livres' && ($exec > 0 || $espera > 0)) {
            continue;
        }
        if ($filters['foco'] === 'execucao' && $exec === 0) {
            continue;
        }
        if ($filters['foco'] === 'espera' && $espera === 0) {
            continue;
        }
        if ($filters['foco'] === 'sobrecarga' && !$sobrecarga) {
            continue;
        }

        $tecnicosFiltrados[] = $tecnico;
    }

    $summary = [
        'tecnicos' => count($tecnicosVisiveis),
        'livres' => 0,
        'ocupados' => 0,
        'sobrecarga' => 0,
        'execucao_atd' => 0,
        'fila' => count($filaSemTecnico),
        'espera' => 0,
        'agendados' => count($agendadosSemTecnico),
        'concluidos_hoje' => 0,
    ];

    $sobrecarga = [];
    foreach ($tecnicosVisiveis as $tecnico) {
        $exec = count($tecnico['execucao']);
        $espera = count($tecnico['espera']);
        $fila = count($tecnico['fila']);
        $isOverloaded = $exec > 1 || ($exec + $fila) >= 3;

        $summary['execucao_atd'] += $exec;
        $summary['fila'] += $fila;
        $summary['espera'] += $espera;
        $summary['agendados'] += count($tecnico['agendados']);
        $summary['concluidos_hoje'] += count($tecnico['concluidos_hoje']);

        if ($exec > 0) {
            $summary['ocupados']++;
        } elseif ($espera === 0) {
            $summary['livres']++;
        }

        if ($isOverloaded) {
            $summary['sobrecarga']++;
            $sobrecarga[] = $tecnico;
        }
    }

    uksort($esperaPorCausa, 'strcasecmp');

    return [
        'tecnicosTodos' => $tecnicos,
        'selectedIds' => $selectedIds,
        'tecnicos' => $tecnicosFiltrados,
        'summary' => $summary,
        'filaSemTecnico' => $filaSemTecnico,
        'agendadosSemTecnico' => $agendadosSemTecnico,
        'esperaPorCausa' => $esperaPorCausa,
        'sobrecarga' => $sobrecarga,
        'filters' => $filters,
        'updatedAt' => date('H:i:s'),
    ];
}

function disp_ticket_class($ticket)
{
    if ((int)$ticket['status'] === 3) {
        return 'ticket-wait';
    }
    if ((int)$ticket['status'] === 2) {
        return 'ticket-run';
    }
    if ((int)$ticket['status'] === 0) {
        return 'ticket-scheduled';
    }
    if ((int)$ticket['prioridade'] >= 3) {
        return 'ticket-hot';
    }
    return 'ticket-default';
}

function disp_render_ticket($ticket)
{
    $title = $ticket['cliente'] . "\n"
        . $ticket['tipo_nome'] . ' - Prioridade ' . $ticket['prioridade_nome'] . "\n"
        . 'Abertura: ' . disp_format_data($ticket['abertura']);

    if ((int)$ticket['status'] === 3) {
        $title .= "\nEm espera: " . $ticket['espera_causa'];
        if (!empty($ticket['espera_prev'])) {
            $title .= "\nPrevisao: " . disp_format_data($ticket['espera_prev']);
        }
    }

    $meta = '';
    if ((int)$ticket['status'] === 3 && $ticket['tempo_espera_min'] !== null) {
        $meta = disp_tempo_curto($ticket['tempo_espera_min']);
    } elseif ($ticket['tempo_aberto_min'] !== null && (int)$ticket['status'] !== 0) {
        $meta = disp_tempo_curto($ticket['tempo_aberto_min']);
    } elseif ((int)$ticket['status'] === 0) {
        $meta = disp_format_data($ticket['abertura']);
    }

    ob_start();
?>
    <a class="ticket-chip <?php echo disp_ticket_class($ticket); ?>" href="atd_detalhe.php?atd=<?php echo urlencode((string)$ticket['id']); ?>" target="_blank" rel="noopener" title="<?php echo disp_h($title); ?>">
        <span class="ticket-id"><?php echo disp_h(disp_format_atd($ticket['id'])); ?></span>
        <span class="ticket-client"><?php echo disp_h($ticket['cliente']); ?></span>
        <?php if ($meta !== '') : ?>
            <span class="ticket-time"><?php echo disp_h($meta); ?></span>
        <?php endif; ?>
    </a>
<?php
    return ob_get_clean();
}

function disp_render_ticket_list($tickets, $limit = 8)
{
    if (empty($tickets)) {
        return '<span class="empty-inline">Nada no momento</span>';
    }

    $html = '';
    $count = 0;
    foreach ($tickets as $ticket) {
        if ($count >= $limit) {
            break;
        }
        $html .= disp_render_ticket($ticket);
        $count++;
    }

    $remaining = count($tickets) - $count;
    if ($remaining > 0) {
        $html .= '<span class="more-chip">+' . (int)$remaining . '</span>';
    }

    return $html;
}

function disp_tecnico_state($tecnico)
{
    $exec = count($tecnico['execucao']);
    $espera = count($tecnico['espera']);
    $fila = count($tecnico['fila']);

    if ($exec > 1 || ($exec + $fila) >= 3) {
        return ['label' => 'Sobrecarga', 'class' => 'state-danger'];
    }
    if ($exec > 0) {
        return ['label' => 'Em atendimento', 'class' => 'state-run'];
    }
    if ($espera > 0) {
        return ['label' => 'Em espera', 'class' => 'state-wait'];
    }
    return ['label' => 'Livre', 'class' => 'state-free'];
}

$pdo = ConnectionN3();
if (!$pdo) {
    exit("Erro ao conectar ao banco de dados.");
}

$filters = disp_normalize_filters();
$dashboard = disp_build_dashboard($pdo, $filters);
$summary = $dashboard['summary'];
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
    <title>Allterus</title>
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

        .availability-shell {
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: #f6f8fb;
        }

        .availability-top {
            flex: 0 0 auto;
            border-bottom: 1px solid #d9e0ea;
            background: #fff;
            box-shadow: 0 2px 8px rgba(15, 23, 42, .05);
        }

        .page-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 14px 8px;
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
            font-size: 1.08rem;
            font-weight: 700;
            color: #0f172a;
        }

        .page-title span {
            display: block;
            margin-top: 2px;
            font-size: .78rem;
            color: #64748b;
        }

        .summary-bar {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));
            gap: 16px;
            padding: 10px 12px 14px;
            background: #fff;
            border-bottom: 1px solid #e9ecef;
        }

        .summary-card {
            border: 1px solid #e1e9f2;
            border-radius: 8px;
            min-height: 78px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: #fff;
            color: #172033;
            box-shadow: 0 3px 8px rgba(15, 23, 42, .08);
            text-decoration: none;
            transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
        }

        .summary-card:hover {
            text-decoration: none;
            color: #172033;
            box-shadow: 0 6px 14px rgba(15, 23, 42, .12);
            transform: translateY(-1px);
        }

        .summary-card strong {
            font-size: 1.18rem;
            line-height: 1;
            font-weight: 700;
        }

        .summary-card span {
            margin-top: 4px;
            font-size: .72rem;
            text-transform: uppercase;
            color: #5f6b7a;
            font-weight: 600;
            text-align: center;
        }

        .summary-free {
            border-color: #15b33a;
        }

        .summary-run {
            border-color: #0d6efd;
        }

        .summary-wait {
            border-color: #fd7e14;
        }

        .summary-danger {
            border-color: #dc3545;
        }

        .filters-row {
            display: flex;
            align-items: end;
            gap: 8px;
            padding: 12px 14px 10px;
            flex-wrap: nowrap;
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

        .filter-group label {
            margin: 0;
            color: #172033;
            font-size: .86rem;
            font-weight: 500;
            line-height: 1.15;
            white-space: nowrap;
        }

        .filter-control {
            height: 34px;
            min-height: 34px;
            border: 1px solid #d3dbe7;
            border-radius: 4px;
            padding: 0 10px;
            width: 100%;
            min-width: 0;
            color: #172033;
            background: #fff;
            font-size: .86rem;
            box-shadow: none;
        }

        .filter-control:focus {
            outline: none;
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

        .filter-actions {
            flex: 0 0 auto;
            display: flex;
            align-items: flex-end;
            gap: 8px;
        }

        .content-scroll {
            flex: 1 1 auto;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 10px 12px 12px;
        }

        .attention-grid {
            display: grid;
            grid-template-columns: 1.2fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
        }

        .panel {
            border: 1px solid #dbe4ef;
            border-radius: 8px;
            background: #fff;
            box-shadow: 0 3px 8px rgba(15, 23, 42, .06);
            overflow: hidden;
        }

        .panel-header {
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 9px 12px;
            border-bottom: 1px solid #e7edf5;
            background: #fff;
            color: #172033;
            font-weight: 700;
        }

        .panel-header small {
            color: #64748b;
            font-weight: 600;
        }

        .panel-body {
            padding: 10px 12px;
        }

        .tech-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(260px, 1fr));
            gap: 12px;
        }

        .tech-card {
            border: 1px solid #dbe4ef;
            border-radius: 8px;
            background: #fff;
            min-height: 190px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 3px 8px rgba(15, 23, 42, .055);
        }

        .tech-card-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 8px;
            padding: 11px 12px 8px;
            border-bottom: 1px solid #e7edf5;
        }

        .tech-name {
            min-width: 0;
        }

        .tech-name strong {
            display: block;
            color: #0f172a;
            font-size: .96rem;
            line-height: 1.25;
        }

        .tech-name span {
            display: block;
            margin-top: 3px;
            color: #64748b;
            font-size: .75rem;
            font-weight: 600;
        }

        .state-pill {
            white-space: nowrap;
            border-radius: 999px;
            padding: 4px 8px;
            font-size: .72rem;
            font-weight: 700;
            border: 1px solid transparent;
        }

        .state-free {
            color: #087f3e;
            background: #e9fbef;
            border-color: #abe9c0;
        }

        .state-run {
            color: #084f9d;
            background: #edf6ff;
            border-color: #afd5ff;
        }

        .state-wait {
            color: #9a5200;
            background: #fff7e8;
            border-color: #ffd391;
        }

        .state-danger {
            color: #a11616;
            background: #fff0f0;
            border-color: #ffb1b1;
        }

        .tech-metrics {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            padding: 9px 12px;
        }

        .metric {
            border: 1px solid #e7edf5;
            border-radius: 4px;
            padding: 6px 4px;
            text-align: center;
            background: #fff;
        }

        .metric strong {
            display: block;
            font-size: .95rem;
            color: #0f172a;
            line-height: 1;
        }

        .metric span {
            display: block;
            margin-top: 4px;
            font-size: .66rem;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
        }

        .tech-sections {
            padding: 0 12px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .ticket-section-title {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #334155;
            font-weight: 700;
            font-size: .76rem;
            margin-bottom: 5px;
        }

        .ticket-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            min-height: 24px;
        }

        .ticket-chip,
        .more-chip {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            max-width: 100%;
            min-height: 24px;
            border-radius: 4px;
            padding: 3px 6px;
            font-size: .74rem;
            color: #142033;
            border: 1px solid #d5dfeb;
            background: #f8fafc;
            text-decoration: none;
        }

        .ticket-chip:hover {
            text-decoration: none;
            color: #142033;
            border-color: #94b8d4;
            background: #fff;
        }

        .ticket-id {
            font-weight: 800;
        }

        .ticket-client {
            max-width: 130px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .ticket-time {
            color: #475569;
            font-weight: 700;
        }

        .ticket-run {
            border-color: #b8d9ff;
            background: #f0f7ff;
        }

        .ticket-wait {
            border-color: #ffd08a;
            background: #fff8eb;
        }

        .ticket-scheduled {
            border-color: #c8b8ff;
            background: #f5f1ff;
        }

        .ticket-hot {
            border-color: #ffb0b0;
            background: #fff2f2;
        }

        .empty-inline {
            color: #94a3b8;
            font-size: .78rem;
            font-weight: 600;
        }

        .more-chip {
            color: #475569;
            font-weight: 700;
        }

        .cause-row,
        .overload-row {
            padding: 7px 0;
            border-bottom: 1px solid #eef2f7;
        }

        .cause-row:last-child,
        .overload-row:last-child {
            border-bottom: 0;
        }

        .cause-title,
        .overload-title {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 6px;
            color: #172033;
            font-weight: 700;
            font-size: .82rem;
        }

        .soft-count {
            color: #64748b;
            font-size: .76rem;
            font-weight: 700;
        }

        .visibility-menu {
            width: 260px;
            max-height: 360px;
            overflow-y: auto;
            padding: 10px;
            border: 1px solid #d9e3ef;
            border-radius: 6px !important;
            box-shadow: 0 10px 24px rgba(15, 23, 42, .14);
        }

        .visibility-menu .form-check {
            margin-bottom: 6px;
        }

        .visibility-menu label {
            color: #263244;
            font-size: .82rem;
        }

        .empty-state {
            padding: 30px;
            text-align: center;
            color: #64748b;
            background: #fff;
            border: 1px solid #dbe4ef;
            border-radius: 8px;
        }

        @media (max-width: 1500px) {
            .tech-grid {
                grid-template-columns: repeat(3, minmax(260px, 1fr));
            }
        }

        @media (max-width: 1250px) {
            .filters-row {
                flex-wrap: wrap;
            }

            .filter-group {
                flex: 1 1 220px;
            }
        }

        @media (max-width: 1100px) {
            html,
            body {
                overflow: auto;
                height: auto;
            }

            .availability-shell {
                height: auto;
                min-height: 100vh;
            }

            .content-scroll {
                overflow: visible;
            }

            .attention-grid {
                grid-template-columns: 1fr;
            }

            .tech-grid {
                grid-template-columns: repeat(2, minmax(260px, 1fr));
            }
        }

        @media (max-width: 720px) {
            .summary-bar,
            .tech-grid {
                grid-template-columns: 1fr;
            }

            .page-title-row,
            .filters-row {
                align-items: stretch;
                flex-direction: column;
            }

            .filter-control,
            .filters-row .btn,
            .filters-row .dropdown,
            .filter-actions {
                width: 100%;
            }

            .filter-actions {
                flex-wrap: wrap;
            }
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid">
        <div class="row">
            <div class="col-12">
                <main class="availability-shell">
                    <section class="availability-top">
                        <div class="page-title-row">
                            <div class="page-title">
                                <i class="fas fa-users-cog"></i>
                                <div>
                                    <h1>Disponibilidade Tecnica</h1>
                                    <span>Atualizado as <?php echo disp_h($dashboard['updatedAt']); ?> · abre atendimentos em nova aba</span>
                                </div>
                            </div>
                        </div>

                        <div class="summary-bar">
                            <a class="summary-card summary-free" href="?<?php echo disp_h(http_build_query(array_merge($filters, ['foco' => 'livres']))); ?>">
                                <strong><?php echo (int)$summary['livres']; ?></strong>
                                <span>Livres agora</span>
                            </a>
                            <a class="summary-card summary-run" href="?<?php echo disp_h(http_build_query(array_merge($filters, ['foco' => 'execucao']))); ?>">
                                <strong><?php echo (int)$summary['ocupados']; ?></strong>
                                <span>Tecnicos ocupados</span>
                            </a>
                            <div class="summary-card summary-run">
                                <strong><?php echo (int)$summary['execucao_atd']; ?></strong>
                                <span>Atendimentos em execucao</span>
                            </div>
                            <div class="summary-card">
                                <strong><?php echo (int)$summary['fila']; ?></strong>
                                <span>Fila aguardando</span>
                            </div>
                            <a class="summary-card summary-wait" href="?<?php echo disp_h(http_build_query(array_merge($filters, ['foco' => 'espera']))); ?>">
                                <strong><?php echo (int)$summary['espera']; ?></strong>
                                <span>Em espera</span>
                            </a>
                            <a class="summary-card summary-danger" href="?<?php echo disp_h(http_build_query(array_merge($filters, ['foco' => 'sobrecarga']))); ?>">
                                <strong><?php echo (int)$summary['sobrecarga']; ?></strong>
                                <span>Sobrecarga</span>
                            </a>
                            <div class="summary-card">
                                <strong><?php echo (int)$summary['concluidos_hoje']; ?></strong>
                                <span>Concluidos hoje</span>
                            </div>
                        </div>

                        <div class="filters-row">
                            <form method="GET" action="" style="display: contents;">
                            <div class="filter-group">
                                <label for="setor">Setor</label>
                                <select class="filter-control" id="setor" name="setor">
                                    <option value="todos" <?php echo $filters['setor'] === 'todos' ? 'selected' : ''; ?>>Todos</option>
                                    <option value="ti" <?php echo $filters['setor'] === 'ti' ? 'selected' : ''; ?>>TI</option>
                                    <option value="devops" <?php echo $filters['setor'] === 'devops' ? 'selected' : ''; ?>>DevOps</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label for="foco">Foco</label>
                                <select class="filter-control" id="foco" name="foco">
                                    <option value="todos" <?php echo $filters['foco'] === 'todos' ? 'selected' : ''; ?>>Todos</option>
                                    <option value="livres" <?php echo $filters['foco'] === 'livres' ? 'selected' : ''; ?>>Livres</option>
                                    <option value="execucao" <?php echo $filters['foco'] === 'execucao' ? 'selected' : ''; ?>>Em atendimento</option>
                                    <option value="espera" <?php echo $filters['foco'] === 'espera' ? 'selected' : ''; ?>>Em espera</option>
                                    <option value="sobrecarga" <?php echo $filters['foco'] === 'sobrecarga' ? 'selected' : ''; ?>>Sobrecarga</option>
                                </select>
                            </div>
                            <div class="filter-group" style="flex: 1.6 1 0;">
                                <label for="busca">Tecnico</label>
                                <input class="filter-control" style="width: 100%;" type="text" id="busca" name="busca" value="<?php echo disp_h($filters['busca']); ?>" placeholder="Busque pelo nome">
                            </div>
                                <div class="filter-actions">
                                    <button class="btn btn-info btn-sm btn-action" type="submit">Filtrar</button>
                                    <a class="btn btn-outline-info btn-sm btn-action" href="disponibilidadeTec.php">Limpar</a>
                                </div>
                            </form>
                            <div class="filter-actions">
                                <div class="dropdown">
                                    <button class="btn btn-outline-info btn-sm btn-action dropdown-toggle" type="button" id="visibilityMenu" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                        <i class="fas fa-eye"></i> Tecnicos
                                    </button>
                                    <div class="dropdown-menu dropdown-menu-right visibility-menu" aria-labelledby="visibilityMenu">
                                        <form method="POST" action="<?php echo disp_h($_SERVER['REQUEST_URI']); ?>">
                                            <input type="hidden" name="action" value="salvar_visualizacao">
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="selectAllTechs">
                                                <label class="form-check-label" for="selectAllTechs">Selecionar todos</label>
                                            </div>
                                            <hr class="my-2">
                                            <?php foreach ($dashboard['tecnicosTodos'] as $tecnico) : ?>
                                                <?php $checked = in_array((int)$tecnico['user_id'], $dashboard['selectedIds'], true); ?>
                                                <div class="form-check">
                                                    <input class="form-check-input tecnico-checkbox" type="checkbox" name="tecnicos[]" id="tec_<?php echo (int)$tecnico['user_id']; ?>" value="<?php echo (int)$tecnico['user_id']; ?>" <?php echo $checked ? 'checked' : ''; ?>>
                                                    <label class="form-check-label" for="tec_<?php echo (int)$tecnico['user_id']; ?>">
                                                        <?php echo disp_h($tecnico['user_nome']); ?>
                                                    </label>
                                                </div>
                                            <?php endforeach; ?>
                                            <button type="submit" class="btn btn-info btn-sm btn-block mt-2">Salvar visualizacao</button>
                                        </form>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-outline-info btn-sm btn-action" onclick="window.location.reload();">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>
                    </section>

                    <section class="content-scroll">
                        <div class="attention-grid">
                            <div class="panel">
                                <div class="panel-header">
                                    <span><i class="fas fa-bell text-danger"></i> Fila sem tecnico</span>
                                    <small><?php echo count($dashboard['filaSemTecnico']); ?> aguardando</small>
                                </div>
                                <div class="panel-body ticket-list">
                                    <?php echo disp_render_ticket_list($dashboard['filaSemTecnico'], 14); ?>
                                </div>
                            </div>

                            <div class="panel">
                                <div class="panel-header">
                                    <span><i class="fas fa-exclamation-triangle text-danger"></i> Sobrecarga</span>
                                    <small><?php echo count($dashboard['sobrecarga']); ?> tecnico(s)</small>
                                </div>
                                <div class="panel-body">
                                    <?php if (empty($dashboard['sobrecarga'])) : ?>
                                        <span class="empty-inline">Nenhum tecnico sobrecarregado</span>
                                    <?php else : ?>
                                        <?php foreach (array_slice($dashboard['sobrecarga'], 0, 5) as $tecnico) : ?>
                                            <div class="overload-row">
                                                <div class="overload-title">
                                                    <span><?php echo disp_h($tecnico['nome']); ?></span>
                                                    <span class="soft-count"><?php echo count($tecnico['execucao']); ?> exec · <?php echo count($tecnico['fila']); ?> fila</span>
                                                </div>
                                                <div class="ticket-list">
                                                    <?php echo disp_render_ticket_list(array_merge($tecnico['execucao'], $tecnico['fila']), 6); ?>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </div>
                            </div>

                            <div class="panel">
                                <div class="panel-header">
                                    <span><i class="fas fa-pause-circle text-warning"></i> Espera por motivo</span>
                                    <small><?php echo count($dashboard['esperaPorCausa']); ?> motivo(s)</small>
                                </div>
                                <div class="panel-body">
                                    <?php if (empty($dashboard['esperaPorCausa'])) : ?>
                                        <span class="empty-inline">Nada em espera agora</span>
                                    <?php else : ?>
                                        <?php foreach (array_slice($dashboard['esperaPorCausa'], 0, 4, true) as $causa => $items) : ?>
                                            <div class="cause-row">
                                                <div class="cause-title">
                                                    <span><?php echo disp_h($causa); ?></span>
                                                    <span class="soft-count"><?php echo count($items); ?></span>
                                                </div>
                                                <div class="ticket-list">
                                                    <?php
                                                    $tickets = array_map(function ($item) {
                                                        return $item['ticket'];
                                                    }, $items);
                                                    echo disp_render_ticket_list($tickets, 6);
                                                    ?>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>

                        <?php if (!empty($dashboard['agendadosSemTecnico'])) : ?>
                            <div class="panel mb-3">
                                <div class="panel-header">
                                    <span><i class="fas fa-calendar-alt"></i> Agendados sem tecnico</span>
                                    <small><?php echo count($dashboard['agendadosSemTecnico']); ?> atendimento(s)</small>
                                </div>
                                <div class="panel-body ticket-list">
                                    <?php echo disp_render_ticket_list($dashboard['agendadosSemTecnico'], 18); ?>
                                </div>
                            </div>
                        <?php endif; ?>

                        <?php if (empty($dashboard['tecnicos'])) : ?>
                            <div class="empty-state">
                                Nenhum tecnico encontrado para os filtros atuais.
                            </div>
                        <?php else : ?>
                            <div class="tech-grid">
                                <?php foreach ($dashboard['tecnicos'] as $tecnico) : ?>
                                    <?php $state = disp_tecnico_state($tecnico); ?>
                                    <article class="tech-card">
                                        <div class="tech-card-header">
                                            <div class="tech-name">
                                                <strong><?php echo disp_h($tecnico['nome']); ?></strong>
                                                <span><?php echo disp_h($tecnico['setor']); ?></span>
                                            </div>
                                            <span class="state-pill <?php echo disp_h($state['class']); ?>"><?php echo disp_h($state['label']); ?></span>
                                        </div>

                                        <div class="tech-metrics">
                                            <div class="metric">
                                                <strong><?php echo count($tecnico['execucao']); ?></strong>
                                                <span>Exec</span>
                                            </div>
                                            <div class="metric">
                                                <strong><?php echo count($tecnico['fila']); ?></strong>
                                                <span>Fila</span>
                                            </div>
                                            <div class="metric">
                                                <strong><?php echo count($tecnico['espera']); ?></strong>
                                                <span>Espera</span>
                                            </div>
                                            <div class="metric">
                                                <strong><?php echo count($tecnico['concluidos_hoje']); ?></strong>
                                                <span>Hoje</span>
                                            </div>
                                        </div>

                                        <div class="tech-sections">
                                            <?php if (!empty($tecnico['execucao'])) : ?>
                                                <div>
                                                    <div class="ticket-section-title"><i class="fas fa-keyboard"></i> Em atendimento</div>
                                                    <div class="ticket-list"><?php echo disp_render_ticket_list($tecnico['execucao'], 5); ?></div>
                                                </div>
                                            <?php endif; ?>

                                            <?php if (!empty($tecnico['fila'])) : ?>
                                                <div>
                                                    <div class="ticket-section-title"><i class="fas fa-list"></i> Fila atribuida</div>
                                                    <div class="ticket-list"><?php echo disp_render_ticket_list($tecnico['fila'], 5); ?></div>
                                                </div>
                                            <?php endif; ?>

                                            <?php if (!empty($tecnico['espera'])) : ?>
                                                <div>
                                                    <div class="ticket-section-title"><i class="fas fa-pause-circle"></i> Em espera</div>
                                                    <div class="ticket-list"><?php echo disp_render_ticket_list($tecnico['espera'], 5); ?></div>
                                                </div>
                                            <?php endif; ?>

                                            <?php if (!empty($tecnico['agendados'])) : ?>
                                                <div>
                                                    <div class="ticket-section-title"><i class="fas fa-calendar-alt"></i> Agendados</div>
                                                    <div class="ticket-list"><?php echo disp_render_ticket_list($tecnico['agendados'], 4); ?></div>
                                                </div>
                                            <?php endif; ?>

                                            <?php if (empty($tecnico['execucao']) && empty($tecnico['fila']) && empty($tecnico['espera']) && empty($tecnico['agendados'])) : ?>
                                                <span class="empty-inline">Sem atendimento ativo ou atribuido</span>
                                            <?php endif; ?>
                                        </div>
                                    </article>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </section>
                </main>
            </div>
        </div>
    </div>

    <script src="../js/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.bundle.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var selectAll = document.getElementById('selectAllTechs');
            var checks = Array.prototype.slice.call(document.querySelectorAll('.tecnico-checkbox'));

            function syncSelectAll() {
                if (!selectAll) return;
                selectAll.checked = checks.length > 0 && checks.every(function(check) {
                    return check.checked;
                });
            }

            if (selectAll) {
                selectAll.addEventListener('change', function() {
                    checks.forEach(function(check) {
                        check.checked = selectAll.checked;
                    });
                });
            }

            checks.forEach(function(check) {
                check.addEventListener('change', syncSelectAll);
            });
            syncSelectAll();

            setTimeout(function() {
                window.location.reload();
            }, 60000);
        });
    </script>
</body>

</html>
