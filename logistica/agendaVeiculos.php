<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m9_01 == 0) {
    header("Location: ../home.php");
    exit;
}



setlocale(LC_TIME, 'pt_BR.UTF-8', 'pt_BR.utf8', 'portuguese');
date_default_timezone_set('America/Sao_Paulo');

function nomeMesPtBr($mes)
{
    if (class_exists('IntlDateFormatter')) {
        $fmt = new IntlDateFormatter('pt_BR', IntlDateFormatter::LONG, IntlDateFormatter::NONE, 'America/Sao_Paulo', IntlDateFormatter::GREGORIAN, 'MMMM');
        $nomeMes = $fmt->format(mktime(0, 0, 0, (int)$mes, 1));

        if ($nomeMes !== false) {
            return ucfirst($nomeMes);
        }
    }

    $meses = [
        1 => 'Janeiro',
        2 => 'Fevereiro',
        3 => 'Março',
        4 => 'Abril',
        5 => 'Maio',
        6 => 'Junho',
        7 => 'Julho',
        8 => 'Agosto',
        9 => 'Setembro',
        10 => 'Outubro',
        11 => 'Novembro',
        12 => 'Dezembro',
    ];

    return $meses[(int)$mes] ?? '';
}

function nomeDiaSemanaPtBr(DateTime $data)
{
    if (class_exists('IntlDateFormatter')) {
        $fmt = new IntlDateFormatter('pt_BR', IntlDateFormatter::FULL, IntlDateFormatter::NONE, 'America/Sao_Paulo');
        $nomeDia = $fmt->format($data);

        if ($nomeDia !== false) {
            return ucfirst(explode(',', $nomeDia)[0]);
        }
    }

    $dias = [
        0 => 'Domingo',
        1 => 'Segunda-feira',
        2 => 'Terça-feira',
        3 => 'Quarta-feira',
        4 => 'Quinta-feira',
        5 => 'Sexta-feira',
        6 => 'Sábado',
    ];

    return $dias[(int)$data->format('w')] ?? '';
}


$pdo = ConnectionN3();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

$mes = isset($_GET['mes']) ? (int)$_GET['mes'] : date('n');
$ano = isset($_GET['ano']) ? (int)$_GET['ano'] : date('Y');

$mes = max(1, min(12, $mes));
$ano = max(2000, min(2100, $ano));

$data_base = sprintf('%04d-%02d-01', $ano, $mes);
$dias_do_mes = cal_days_in_month(CAL_GREGORIAN, $mes, $ano);

$usuarioLogadoId = $_SESSION['allterusN3Id'];

function setMensagem($mensagem, $tipo = 'success', $url = null)
{
    switch ($tipo) {
        case 'success':
            $cor = 'alert-success';
            break;
        case 'error':
        case 'danger':
            $cor = 'alert-danger';
            break;
        case 'info':
            $cor = 'alert-info';
            break;
        case 'warn':
        case 'warning':
            $cor = 'alert-warning';
            break;
        default:
            $cor = 'alert-secondary';
    }

    $urlDestino = $url ?? $_SERVER['REQUEST_URI']; // redireciona para a página atual por padrão

    echo "<script>
        sessionStorage.setItem('mensagem', " . json_encode($mensagem) . ");
        sessionStorage.setItem('mensagem_cor', '$cor');
        window.location.href = " . json_encode($urlDestino) . ";
    </script>";
    exit;
}

// function setMensagem($mensagem, $tipo = 'success')
// {
//     $cor = match ($tipo) {
//         'success' => 'alert-success',
//         'error', 'danger' => 'alert-danger',
//         'info'    => 'alert-info',
//         'warn', 'warning' => 'alert-warning',
//         default   => 'alert-secondary',
//     };

//     echo "<script>
//         sessionStorage.setItem('mensagem', " . json_encode($mensagem) . ");
//         sessionStorage.setItem('mensagem_cor', '$cor');
//         window.history.back();
//     </script>";
//     exit;
// }



// Adicionar ou editar veículo
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['nomeVeiculo'], $_POST['placaVeiculo'], $_POST['statusVeiculo'], $_POST['acao'])) {

    $acao = $_POST['acao'];
    $veiculoId = isset($_POST['veiculoId']) ? (int) $_POST['veiculoId'] : 0;
    $nomeVeiculo = strtoupper(trim($_POST['nomeVeiculo']));
    $placaVeiculo = strtoupper(trim($_POST['placaVeiculo']));
    $statusVeiculo = (int) $_POST['statusVeiculo'];

    if ($acao === 'editar' && $veiculoId > 0) {
        // Editar veículo existente
        $stmt = $pdo->prepare("UPDATE veiculos SET veiculo = ?, placa = ?, ativo = ? WHERE id = ?");
        $stmt->execute([$nomeVeiculo, $placaVeiculo, $statusVeiculo, $veiculoId]);
    } elseif ($acao === 'adicionar') {
        // Adicionar novo veículo
        $stmt = $pdo->prepare("INSERT INTO veiculos (veiculo, placa, ativo) VALUES (?, ?, ?)");
        $stmt->execute([$nomeVeiculo, $placaVeiculo, $statusVeiculo]);
    }

    header("Location: agendaVeiculos.php?mes=$mes&ano=$ano");
    exit;
}



// Exclusão de veículo
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['excluirveiculoId'])) {
    $veiculoId = $_POST['excluirveiculoId'];
    $stmt = $pdo->prepare("DELETE FROM veiculos WHERE id = ?");
    $stmt->execute([$veiculoId]);
    echo json_encode(['status' => 'success']);
    exit;
}

// Retornar veículos
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] == 'listVeiculos') {
    $stmt = $pdo->prepare("SELECT id, veiculo, placa, ativo FROM veiculos");
    $stmt->execute();
    $veiculos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($veiculos);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['excluir_agendamento'])) {
        // Recebe o ID do agendamento
        $idAgendamento = $_POST['agendamento_id'];

        // Exclui o agendamento do banco de dados
        $stmt = $pdo->prepare("DELETE FROM agenda_veiculos WHERE id = :id");
        $stmt->bindParam(':id', $idAgendamento, PDO::PARAM_INT);

        if ($stmt->execute()) {
            echo json_encode(['status' => 'success']);
        } else {
            echo json_encode(['status' => 'error']);
        }

        exit; // Encerra o script após enviar a resposta JSON
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['novoAgendamento'])) {

    // echo "<script>console.log('Dados recebidos: " . json_encode($_POST) . "');</script>";
    // exit;

    $veiculoId = $_POST['veiculoId'];
    $dataAgendamento = $_POST['dataAgendamento'];
    $empresa = strtoupper($_POST['empresa']);
    $cidade = mb_strtoupper($_POST['cidade']);
    $horario = $_POST['horario'];
    $motorista = ucwords($_POST['motorista']);
    $observacoes = $_POST['observacoes'];
    $usuarioId = $_SESSION['allterusN3Id'];
    $kmInicial = $_POST['kmInicial'];
    $kmFinal = $_POST['kmFinal'];
    $visibilidade = $_POST['visibilidade'];
    $color = !empty($_POST['color']) ? $_POST['color'] : "1";

    // Novo agendamento
    $check = $pdo->prepare("SELECT id FROM agenda_veiculos WHERE veiculo_id = ? AND data = ? AND horario = ?");
    $check->execute([$veiculoId, $dataAgendamento, $horario]);

    if ($check->rowCount() > 0) {
        echo "Já existe um agendamento para este veículo nesta data e horário.";
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO agenda_veiculos
                           (veiculo_id, data, empresa, cidade, horario, motorista, observacoes, usuario_id, kmInicial, kmFinal, visibilidade, color)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$veiculoId, $dataAgendamento, $empresa, $cidade, $horario, $motorista, $observacoes, $usuarioId, $kmInicial, $kmFinal, $visibilidade, $color]);

    header("Location: agendaVeiculos.php?mes=$mes&ano=$ano");
    exit;
}


if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['editAgendamento'])) {

    $idAgendamento = $_POST['idAgendamento'] ?? null;
    $veiculoId = $_POST['veiculoId'];
    $dataAgendamento = $_POST['dataAgendamento'];
    $empresa = strtoupper($_POST['empresa']);
    $cidade = mb_strtoupper($_POST['cidade']);
    $horario = $_POST['horario'];
    $motorista = ucwords($_POST['motorista']);
    $observacoes = $_POST['observacoes'];
    $usuarioId = $_SESSION['allterusN3Id'];
    $kmInicial = $_POST['kmInicial'];
    $kmFinal = $_POST['kmFinal'];
    $visibilidade = $_POST['visibilidade'];
    $color = $_POST['colorEditar'];
    $arquivado = isset($_POST['arquivar']) ? 1 : 0;

    if ($idAgendamento) {
        // Verifica se está arquivado
        $checkArq = $pdo->prepare("SELECT arquivado FROM agenda_veiculos WHERE id = ?");
        $checkArq->execute([$idAgendamento]);
        $rowArq = $checkArq->fetch(PDO::FETCH_ASSOC);

        if ($rowArq && $rowArq['arquivado'] == 1) {
            setMensagem("Este agendamento está arquivado e não pode mais ser editado.", "warning");
            exit;
        }

        // Verifica conflito de horário
        $check = $pdo->prepare("SELECT id FROM agenda_veiculos WHERE veiculo_id = ? AND data = ? AND horario = ? AND id != ?");
        $check->execute([$veiculoId, $dataAgendamento, $horario, $idAgendamento]);

        if ($check->rowCount() > 0) {
            setMensagem("Já existe um agendamento para este veículo nesta data e horário.", "danger");
        } elseif ($arquivado == 1 && (empty($kmInicial) || empty($kmFinal))) {
            setMensagem("Não ? possível arquivar: preencha o KM Inicial e o KM Final.", "warning");
        } elseif ($arquivado == 1 && $kmFinal < $kmInicial) {
            setMensagem("O KM Final deve ser maior que o KM Inicial.", "warning");
        } else {
            // Faz o update final
            // Busca dados atuais para salvar no histórico
            $stmt_antigo = $pdo->prepare("SELECT data, horario, veiculo_id FROM agenda_veiculos WHERE id = ?");
            $stmt_antigo->execute([$idAgendamento]);
            $dados_antigos = $stmt_antigo->fetch(PDO::FETCH_ASSOC);

            // Faz o update final, salvando o estado anterior
            $stmt = $pdo->prepare("UPDATE agenda_veiculos
            SET 
                veiculo_id=?, data=?, empresa=?, cidade=?, horario=?, motorista=?, 
                observacoes=?, kmInicial=?, kmFinal=?, visibilidade=?, color=?, arquivado=?,
                data_anterior=?, horario_anterior=?, veiculo_id_anterior=?, ultima_alteracao = NOW(), modificado_por_id = ?
            WHERE id=?");
            $stmt->execute([
                $veiculoId,
                $dataAgendamento,
                $empresa,
                $cidade,
                $horario,
                $motorista,
                $observacoes,
                $kmInicial,
                $kmFinal,
                $visibilidade,
                $color,
                $arquivado,
                $dados_antigos['data'],
                $dados_antigos['horario'],
                $dados_antigos['veiculo_id'],
                $usuarioLogadoId,
                $idAgendamento
            ]);

            // Redireciona somente após sucesso
            header("Location: agendaVeiculos.php?mes=$mes&ano=$ano");
            exit;
        }
    }
}

// Desfazer a MINHA última alteração
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['desfazer_minha_ultima_alteracao'])) {

    // 1. Encontra o ID do último agendamento modificado PELO USUÁRIO LOGADO
    $stmt_ultimo = $pdo->prepare("
        SELECT id, data_anterior, horario_anterior, veiculo_id_anterior 
        FROM agenda_veiculos 
        WHERE modificado_por_id = ?
        ORDER BY ultima_alteracao DESC 
        LIMIT 1
    ");
    $stmt_ultimo->execute([$usuarioLogadoId]);
    $ultimo_alterado = $stmt_ultimo->fetch(PDO::FETCH_ASSOC);

    if ($ultimo_alterado) {
        $idAgendamento = $ultimo_alterado['id'];

        // 2. Restaura os dados e limpa o histórico
        $stmt_restore = $pdo->prepare("
            UPDATE agenda_veiculos 
            SET 
                data = ?, 
                horario = ?, 
                veiculo_id = ?,
                data_anterior = NULL,
                horario_anterior = NULL,
                veiculo_id_anterior = NULL,
                ultima_alteracao = NULL,
                modificado_por_id = NULL
            WHERE id = ?
        ");
        $stmt_restore->execute([
            $ultimo_alterado['data_anterior'],
            $ultimo_alterado['horario_anterior'],
            $ultimo_alterado['veiculo_id_anterior'],
            $idAgendamento
        ]);

        echo json_encode(['status' => 'success', 'message' => 'Sua última alteração foi desfeita!']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Nenhuma alteração sua foi encontrada para desfazer.']);
    }
    exit;
}




//alterar agendamento no modo arrastar
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['arrastar'])) {
    $id = $_POST['id'] ?? null;
    $nova_data = $_POST['nova_data'] ?? null;
    $novo_veiculo = $_POST['novo_veiculo'] ?? null;

    if ($id && $nova_data && $novo_veiculo) {
        // 1. Busca os dados atuais antes de alterar
        $stmt_antigo = $pdo->prepare("SELECT data, horario, veiculo_id FROM agenda_veiculos WHERE id = ?");
        $stmt_antigo->execute([$id]);
        $dados_antigos = $stmt_antigo->fetch(PDO::FETCH_ASSOC);

        if ($dados_antigos) {
            // 2. Prepara e executa o UPDATE, salvando os dados anteriores
            $stmt = $pdo->prepare("
                UPDATE agenda_veiculos 
                SET 
                    data = ?, 
                    veiculo_id = ?, 
                    data_anterior = ?, 
                    horario_anterior = ?, 
                    veiculo_id_anterior = ?,
                    ultima_alteracao = NOW(),
                    modificado_por_id = ?
                WHERE id = ?
            ");
            $success = $stmt->execute([
                $nova_data, $novo_veiculo,
                $dados_antigos['data'], $dados_antigos['horario'], $dados_antigos['veiculo_id'], $usuarioLogadoId, $id
            ]);
            echo json_encode(['success' => $success]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Agendamento não encontrado.']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Dados incompletos.']);
    }
    exit;
}


// Buscar dados de um agendamento (AJAX copiar)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['buscar_agendamento'])) {
    $id = $_POST['agendamento_id'] ?? null;

    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM agenda_veiculos WHERE id = ?");
        $stmt->execute([$id]);
        $dados = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($dados) {
            echo json_encode(['success' => true, 'dados' => $dados]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Agendamento não encontrado']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'ID inválido']);
    }
    exit;
}


// Colar agendamento copiado (AJAX colar)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['duplicar'])) {
    $dados_json = $_POST['agendamento_copiado'] ?? null;
    $veiculoId = $_POST['veiculo_id'] ?? null;
    $dataAlvo = $_POST['data_alvo'] ?? null;

    if ($dados_json && $veiculoId && $dataAlvo) {
        $dados = json_decode($dados_json, true);

        if (is_array($dados)) {
            $stmt = $pdo->prepare("
                INSERT INTO agenda_veiculos (
                    empresa, cidade, motorista, observacoes,
                    horario, usuario_id, visibilidade, color,
                    veiculo_id, data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $success = $stmt->execute([
                $dados['empresa'] ?? null,
                $dados['cidade'] ?? '',
                $dados['motorista'] ?? '',
                $dados['observacoes'] ?? '',
                $dados['horario'] ?? '',
                $dados['usuario_id'] ?? null,
                $dados['visibilidade'] ?? 0,
                $dados['color'] ?? '#000000',
                $veiculoId,
                $dataAlvo
            ]);

            echo json_encode(['success' => $success]);
        } else {
            echo json_encode(['success' => false, 'error' => 'JSON inválido']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Dados incompletos']);
    }
    exit;
}


$veiculos = $pdo->query("SELECT id, veiculo, placa FROM veiculos WHERE ativo = 1 ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);

$user_funcao = $_SESSION['allterusN3func'] ?? null;
$Admin = [1, 2, 3, 9, 10, 18]; // IDs de função considerados gestores

$filtroVisibilidade = in_array($user_funcao, $Admin)
    ? ''
    : 'WHERE a.visibilidade = 0';

$agendamentosRaw = $pdo->query("
    SELECT
    a.*,
    u.user_nome AS usuario_nome,
    m.user_nome AS motorista_nome,
    c.clt_nomef AS nome_empresa
FROM agenda_veiculos a
JOIN usuarios u ON a.usuario_id = u.user_id
LEFT JOIN usuarios m ON a.motorista = m.user_id
LEFT JOIN clientes c ON a.empresa = c.clt_id
$filtroVisibilidade

")->fetchAll(PDO::FETCH_ASSOC);

$agendamentos = [];

foreach ($agendamentosRaw as $ag) {
    $data = $ag['data'];
    $dataFormatada = date('d/m/Y', strtotime($data));
    $veiculo_id = $ag['veiculo_id'];
    $agendamentos[$data][$veiculo_id][] = $ag;
}

//criar um mapa de cores exadecimais para utilizar
$cores = [
    '1'  => '#87CEEB', // Verde Pastel (fixo)
    '2'  => '#e7f5e5', // Azul Céu
    '3'  => '#00FF00', // Verde
    '4'  => '#008000', // Verde Escuro
    '5'  => '#FFFF00', // Amarelo
    '6'  => '#FFD700', // Dourado
    '7'  => '#FFA500', // Laranja
    '8'  => '#FF0000', // Vermelho
    '9'  => '#800000', // Marrom Escuro
    '10'  => '#FFC0CB', // Rosa Claro
    '11' => '#800080', // Roxo / Púrpura
    '12' => '#4B0082', // Índigo
    '13' => '#000080', // Azul Escuro
    '14' => '#00FFFF', // Ciano / Azul Claro
    '15' => '#008080', // Verde Água / Teal
    '16' => '#C0C0C0', // Cinza Claro / Prata
    '17' => '#808080', // Cinza Médio
    '18' => '#000000', // Preto
];



?>

<?php
$checkUndo = $pdo->prepare("SELECT 1 FROM agenda_veiculos WHERE modificado_por_id = ? LIMIT 1");
$checkUndo->execute([$_SESSION['allterusN3Id']]); // Usando a session diretamente aqui
$podeDesfazer = $checkUndo->fetchColumn();
?>

<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">

    <link rel="stylesheet" href="css/agenda_modern.css">
    <title>Agenda de Veículos</title>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid agenda-page agenda-page-wrap">
        <div class="card agenda-shell-card">
            <div class="card-header agenda-toolbar">
                <div class="agenda-toolbar-main">
                    <h5 class="agenda-title"><i class="fas fa-car"></i> Agenda de Veículos</h5>
                    <form method="GET" class="form-inline agenda-filter-form" id="filtroAgenda">
                        <select name="mes" class="form-control form-control-sm mr-2" onchange="document.getElementById('filtroAgenda').submit()">
                            <?php
                            for ($m = 1; $m <= 12; $m++) :
                                $nomeMes = nomeMesPtBr($m);
                            ?>
                                <option value="<?= $m ?>" <?= $m == $mes ? 'selected' : '' ?>><?= $nomeMes ?></option>
                            <?php endfor; ?>
                        </select>
                        <select name="ano" class="form-control form-control-sm mr-2" onchange="document.getElementById('filtroAgenda').submit()">
                            <?php for ($a = date('Y') - 5; $a <= date('Y') + 5; $a++) : ?>
                                <option value="<?= $a ?>" <?= $a == $ano ? 'selected' : '' ?>><?= $a ?></option>
                            <?php endfor; ?>
                        </select>
                    </form>
                </div>

                <?php if ($m9_01 > 1) : ?>
                    <div class="agenda-actions">
                        <button type="button" id="btnDesfazerGlobal" class="btn btn-sm btn-info agenda-action-btn" <?= !$podeDesfazer ? 'disabled' : '' ?> title="Desfaz a sua última movimentação de dia, horário ou veículo">
                            <i class="fas fa-undo"></i> Desfazer Minha Alteração
                        </button>
                        <a href="relatorioAgenda.php?mes=<?= $mes ?>&ano=<?= $ano ?>" target="_blank" class="btn btn-sm btn-primary agenda-action-btn">
                            <i class="fas fa-print"></i> Imprimir
                        </a>

                        <button type="button" class="btn btn-sm btn-secondary btn-veiculos agenda-action-btn" data-toggle="modal" data-target="#modalListarVeiculos">
                            <i class="fas fa-car-side"></i> Veículos
                        </button>
                    </div>
                <?php endif; ?>

            </div>


            <div class="card-body p-0">
                <div class="table-responsive agenda-table-wrap">
                    <table class="table agenda-table table-bordered table-striped table-sm">
                        <thead class="agenda-thead">
                            <tr>
                                <th class="agenda-date-header">Data</th>
                                <?php foreach ($veiculos as $v) : ?>
                                    <th class="agenda-vehicle-header" data-veiculo-id="<?= $v['id'] ?>">
                                        <?= htmlspecialchars($v['veiculo']) ?>
                                    </th>
                                <?php endforeach; ?>
                            </tr>
                        </thead>
                        <tbody>
                            <?php for ($i = 0; $i < $dias_do_mes; $i++) :
                                $data = date('Y-m-d', strtotime("$data_base +$i days"));
                                $dataObj = new DateTime($data);
                                $dataFormatada = $dataObj->format('d/m');

                                $nomeDia = nomeDiaSemanaPtBr($dataObj);

                                $diaSemana = $dataObj->format('w'); // 0 = Domingo, 6 = Sábado
                                $classeFds = ($diaSemana == 0 || $diaSemana == 6) ? 'is-weekend' : 'is-weekday';
                            ?>
                                <tr>
                                    <td class="agenda-date-cell <?= $classeFds ?>">
                                        <?php
                                        $dataObj = new DateTime($data);
                                        $dataFormatada = $dataObj->format('d/m');
                                        $nomeDia = nomeDiaSemanaPtBr($dataObj);
                                        ?>
                                        <span class="agenda-date-number">
                                            <?= $dataFormatada ?>
                                        </span><br>
                                        <span class="agenda-date-name">
                                            <?= $nomeDia ?>
                                        </span>
                                    </td>

                                    <?php foreach ($veiculos as $v) :
                                        // Obter todos os agendamentos para o veículo na data
                                        $agendamentosPorDiaEVeiculo = $agendamentos[$data][$v['id']] ?? []; ?>
                                        <?php
                                        // Pega a primeira cor encontrada nos agendamentos do dia para esse veículo
                                        $corIndex = !empty($agendamentosPorDiaEVeiculo) && isset($agendamentosPorDiaEVeiculo[0]['color'])
                                            ? $agendamentosPorDiaEVeiculo[0]['color']
                                            : null;
                                        $corHex = $corIndex && isset($cores[$corIndex]) ? $cores[$corIndex] : ''; // branco se não tiver cor
                                        ?>
                                        <td class="veiculo-cell" style="background-color: <?= $corHex ?>;" data-veiculo="<?= $v['id'] ?>" data-data="<?= $data ?>">




                                            <?php
                                            if (!empty($agendamentosPorDiaEVeiculo)) {
                                                // Exibe todos os agendamentos para esse veículo no dia
                                                usort($agendamentosPorDiaEVeiculo, function ($a, $b) {
                                                    return strcmp($a['horario'], $b['horario']);
                                                });

                                                foreach ($agendamentosPorDiaEVeiculo as $ag) {
                                                    $permissao = $m9_01 > 1 ? 'true' : 'false';
                                                    echo "<div class='agendamento-box mb-2 p-2 border rounded'"
                                                        . " data-agendamento-id='" . $ag['id'] . "'"
                                                        . " data-veiculo='" . $v['id'] . "'"
                                                        . " data-arquivado='" . $ag['arquivado'] . "'"
                                                        . " data-kmInicial='" . $ag['kmInicial'] . "'"
                                                        . " data-kmFinal='" . $ag['kmFinal'] . "'"
                                                        . " data-permissao='" . $permissao . "'"
                                                        . " data-data='" . $data . "'>";
                                                    echo "<div><strong>" . htmlspecialchars($ag['nome_empresa']) . " - " . htmlspecialchars($ag['cidade']) . "</strong></div>";
                                                    echo "<div><strong>Horário:</strong> " . htmlspecialchars($ag['horario']) . "</div>";
                                                    echo "<div><strong>Condutor:</strong> " . htmlspecialchars($ag['motorista_nome']) . "</div>";

                                                    if (!empty($ag['observacoes'])) {
                                                        echo "<div><strong>OBS:</strong> " . nl2br(htmlspecialchars($ag['observacoes'])) . "</div>";
                                                    }

                                                    echo "<div class='text-muted'><small>Por: " . htmlspecialchars($ag['usuario_nome']) . "</small></div>";

                                                    // se kminicial e tbm kmfinal estiverem vazios exibe a mensagem abaixo
                                                    if (empty($ag['kmInicial']) && empty($ag['kmFinal'])) {
                                                        echo "<div class='text-muted'><small><i class='fas fa-exclamation-triangle'></i> Falta Lançar Km</small></div>";
                                                    }

                                                    if ($ag['arquivado'] == 1) {
                                                        // exibe km rodado sendo o kmfinal - kminicial
                                                        $km_rodado = $ag['kmFinal'] - $ag['kmInicial'];
                                                        echo "<div class='text-muted'><small>Km Rodado: " . $km_rodado . "</small></div>";

                                                        echo "<div class='text-muted'><i class='fas fa-lock'></i><small> Agendamento Arquivado</small></div>";
                                                    }

                                                    // Exibe a última alteração e o botão de desfazer, se houver
                                                    // if (!empty($ag['ultima_alteracao'])) {
                                                    //     $dataAlteracao = new DateTime($ag['ultima_alteracao']);
                                                    //     echo "<div class='text-info'><small><strong>Alterado em:</strong> " . $dataAlteracao->format('d/m/Y H:i') . "</small></div>";

                                                    //                                             if ($m9_01 > 1 && $ag['arquivado'] == 0) {
                                                    //                                                 echo "<button class='btn btn-sm btn-outline-info mt-1 btn-desfazer' data-agendamento-id='" . $ag['id'] . "' title='Desfazer última alteração'>
                                                    //     <i class='fas fa-undo'></i> Desfazer
                                                    //   </button>";
                                                    //                                             }
                                                    //                                         }

                                                    // Apenas exibe botão de edição se usuário tiver permissão e se o agendamento nao estiver arquivado
                                                    if ($m9_01 > 1 && $ag['arquivado'] == 0) {
                                                        echo "
                                                        <button class='btn btn-sm btn-outline-success mt-1 copy-btn'
                                                            data-agendamento='" . $ag['id'] . "'
                                                            title='Copiar'>
                                                            <i class='far fa-copy'></i><span>Copiar</span>
                                                        </button>

                                                        <button class='btn btn-sm btn-outline-success mt-1 edit-btn'
                                                            data-veiculo='" . $v['id'] . "'
                                                            data-data='" . $data . "'
                                                            data-agendamentos='" . htmlspecialchars(json_encode($agendamentosPorDiaEVeiculo), ENT_QUOTES, 'UTF-8') . "'
                                                            title='Editar'>
                                                            <i class='fas fa-pencil-alt'></i><span>Editar</span>
                                                        </button>
                                                        ";
                                                    }

                                                    echo "</div>"; // fecha .agendamento-box
                                                }
                                            } else {
                                                // Caso não haja agendamentos, exibe botão de novo agendamento se tiver permissão
                                                if ($m9_01 > 1) {
                                                    echo "
                                                        <button class='btn btn-sm btn-outline-success colar-btn d-none'
                                                                data-veiculo='" . $v['id'] . "'
                                                                data-data='" . $data . "'
                                                                title='Colar'>
                                                            <i class='fas fa-paste'></i>
                                                        </button>
                                                    
                                                    <button class='edit-btn' data-toggle='modal' data-target='#modalNovoAgendamento'
                                                    data-veiculo='" . $v['id'] . "' data-data='" . $data . "'
                                                    title='Adicionar Agendamento'>
                                                    <i class='fas fa-plus'></i><span>Novo</span>
                                                </button>";
                                                }
                                            }
                                            ?>


                                        </td>
                                    <?php endforeach; ?>
                                    <td></td>
                                </tr>
                            <?php endfor; ?>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>

    <!-- Modal Escolha -->
    <div class="modal fade agenda-modal agenda-modal-choice" id="modalEscolha" tabindex="-1">
        <div class="modal-dialog agenda-modal-md">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="far fa-calendar-check"></i> Agendamentos existentes</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="hidden" name="idAgendamento">
                    <div id="lista-agendamentos"></div>
                    <hr>
                    <div class="form-group row">
                        <div class="col">
                            <button class="btn btn-success btn-block" id="btnNovoAgendamentoMesmoDia">
                                <i class="fas fa-plus"></i> Adicionar novo agendamento
                            </button>
                        </div>
                        <div class="col">
                            <button type="button" class="btn btn-secondary btn-block" data-dismiss="modal">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal adicionar Veículo -->
    <div class="modal fade agenda-modal agenda-modal-vehicle" id="modalAddVeiculo" tabindex="-1" role="dialog">
        <div class="modal-dialog agenda-modal-sm" role="document">
            <form method="POST">
                <input type="hidden" name="acao" value="adicionar">
                <input type="hidden" name="veiculoId" id="veiculoId" value="0">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="modalTitle"><i class="fas fa-car-side"></i> Adicionar Veículo</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <label>Nome do Veículo</label>
                        <input type="text" class="form-control" name="nomeVeiculo" id="nomeVeiculo" required>
                        <br>
                        <label>Placa do Veículo</label>
                        <input type="text" class="form-control" name="placaVeiculo" id="placaVeiculo" required>
                        <label class="mt-2">Status</label>
                        <select class="form-control" name="statusVeiculo" id="statusVeiculo" required>
                            <option value="1">Ativo</option>
                            <option value="0">Inativo</option>
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> Salvar</button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal Editar Veículo -->
    <div class="modal fade agenda-modal agenda-modal-vehicle" id="modalEditVeiculo" tabindex="-1" role="dialog">
        <div class="modal-dialog agenda-modal-sm" role="document">
            <form method="POST">
                <input type="hidden" name="acao" value="editar">
                <input type="hidden" id="editVeiculoId" name="veiculoId">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="fas fa-edit"></i> Editar Veículo</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <label>Nome do Veículo</label>
                        <input type="text" class="form-control" name="nomeVeiculo" id="editNomeVeiculo" required>
                        <br>
                        <label>Placa do Veículo</label>
                        <input type="text" class="form-control" name="placaVeiculo" id="editPlacaVeiculo" required>
                        <label class="mt-2">Status</label>
                        <select class="form-control" name="statusVeiculo" id="editStatusVeiculo" required>
                            <option value="1">Ativo</option>
                            <option value="0">Inativo</option>
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salvar</button>
                        <button type="button" class="btn btn-secondary" data-dismiss="modal"><i class="fas fa-times"></i> Cancelar</button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal Listar Veículos -->
    <div class="modal fade agenda-modal agenda-modal-vehicle-list" id="modalListarVeiculos" tabindex="-1" role="dialog">
        <div class="modal-dialog agenda-modal-md" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="fas fa-car"></i> Lista de Veículos</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="listaVeiculos"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-success" data-toggle="modal" data-target="#modalAddVeiculo" id="btnAdicionarVeiculo"><i class="fas fa-plus"></i> Adicionar Novo Veículo</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Novo Agendamento -->
    <div class="modal fade agenda-modal agenda-modal-schedule" id="modalNovoAgendamento" tabindex="-1">
        <div class="modal-dialog modalEditarAgendamento agenda-modal-lg" role="document">
            <form method="POST">
                <input type="hidden" name="novoAgendamento" value="1">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="far fa-calendar-plus"></i> Novo Agendamento</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">

                        <div class="form-row mt-2">
                            <div class="col-md-6">
                                <label>Veículo:</label>
                                <select class="form-control" id="novoVeiculoId" name="veiculoId" required>
                                    <option value="">Selecione um veículo</option>
                                    <?php foreach ($veiculos as $v) : ?>
                                        <option value="<?= $v['id'] ?>"><?= htmlspecialchars($v['veiculo']) ?> - <?= htmlspecialchars($v['placa']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>

                            <div class="col-md-3">
                                <label for="novoData">Data:</label>
                                <input type="date" class="form-control" name="dataAgendamento" id="novoData" required>
                            </div>

                            <div class="col-md-3">
                                <label for="novoHorario">Horário:</label>
                                <select class="form-control" name="horario" id="novoHorario" required>
                                    <?php for ($h = 0; $h < 24; $h++) : ?>
                                        <?php for ($m = 0; $m < 60; $m += 15) :
                                            $hora = sprintf("%02d:%02d", $h, $m); ?>
                                            <option value="<?= $hora ?>"><?= $hora ?></option>
                                        <?php endfor; ?>
                                    <?php endfor; ?>
                                </select>
                            </div>
                        </div>

                        <div class="form-row mt-2">
                            <div class="col-md-6">
                                <label class="mt-2"> Cliente:</label>
                                <select class="form-control" name="empresa" id="novoEmpresa" required>
                                    <option value="" selected disabled hidden>Selecione uma empresa</option>
                                    <?php
                                    $empresa = $_SESSION['f_clt'] ?? null;
                                    $pdo = ConnectionN3();
                                    $filterEmpresas = "";

                                    if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                                        $filterEmpresas = " AND clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
                                    }

                                    $sql = "SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1' $filterEmpresas ORDER BY clientes.clt_nomef ASC";
                                    $show_clt = $pdo->prepare($sql);
                                    $show_clt->execute();

                                    while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                                        $clt_id = $exibe["clt_id"];
                                        $clt_nome = $exibe["clt_nomef"];
                                        $selected = ($empresa == $clt_id) ? "selected" : "";
                                        echo "<option value=\"$clt_id\" $selected>$clt_nome</option>";
                                    }
                                    ?>
                                </select>
                            </div>

                            <div class="col-md-6">
                                <label class="mt-2"> Destino:</label>
                                <input type="text" class="form-control" name="cidade" id="novoCidade" required>
                            </div>
                        </div>

                        <div class="form-row mt-2">
                            <div class="col-md-6">
                                <label class="mt-2"> Condutor:</label>
                                <?php
                                $stmtTodos = $pdo->prepare("SELECT user_id, user_nome FROM usuarios WHERE user_sts = 1  AND tipo_usuario = 1 ORDER BY user_nome ASC");
                                $stmtTodos->execute();
                                $todosTecnicos = $stmtTodos->fetchAll(PDO::FETCH_ASSOC);
                                ?>

                                <select class="form-control" name="motorista" id="motorista" required>
                                    <option value="" disabled hidden <?= empty($ag['motorista']) ? 'selected' : '' ?>>Selecione um motorista</option>
                                    <?php foreach ($todosTecnicos as $tec) : ?>
                                        <option value="<?= $tec['user_id'] ?>" <?= ($ag['motorista'] == $tec['user_id']) ? 'selected' : '' ?>>
                                            <?= htmlspecialchars($tec['user_nome']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>

                            </div>

                            <div class="col-md-3">
                                <label class="mt-2"> Km Inicial:</label>
                                <input type="text" class="form-control" name="kmInicial" id="novokmInicial">
                            </div>

                            <div class="col-md-3">
                                <label class="mt-2"> Km Final:</label>
                                <input type="text" class="form-control" name="kmFinal" id="novokmFinal">
                            </div>
                        </div>


                        <div class="form-row mt-2">
                            <div class="col-md-6">
                                <label class="mt-2">Observações</label>
                                <textarea class="form-control" name="observacoes" id="novoObservacoes" rows="1"></textarea>
                            </div>

                            <div class="col-md-3">
                                <label class="mt-2"> Visibilidade:</label>
                                <select class="form-control" name="visibilidade" id="novoVisibilidade" required>
                                    <option value="0" selected>Todos os usuários</option>
                                    <option value="1">Apenas administradores</option>
                                </select>
                            </div>

                            <div class="col-md-3">
                                <label class="mt-2"> Cor:</label>
                                <input type="hidden" name="color" id="modalColor" required>

                                <div id="colorPickerNovo" class="d-flex flex-wrap" style="gap: 8px; margin-top: 0px;">
                                    <?php foreach ($cores as $key => $hex) : ?>
                                        <div class="color-square" data-color="<?= $key ?>" title="Cor <?= $key ?>" style="width: 15px; height: 15px; background-color: <?= $hex ?>; cursor: pointer; border: 2px solid transparent; border-radius: 4px;">
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>

                    </div>
                    <div class="modal-footer d-flex justify-content-end">
                        <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> Salvar</button>
                        <button type="button" class="btn btn-secondary" data-dismiss="modal"><i class="fas fa-times"></i> Cancelar</button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal Confirmação -->
    <div class="modal fade agenda-modal agenda-modal-confirm" id="modalConfirmacao" tabindex="-1" role="dialog">
        <div class="modal-dialog agenda-modal-sm" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="confirmacaoTitulo"><i class="fas fa-exclamation-triangle"></i> Confirmar Ação</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="confirmacaoMensagem"></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal"><i class="fas fa-times"></i> Cancelar</button>
                    <button type="button" id="btnConfirmarAcao" class="btn btn-primary"><i class="fas fa-check"></i> Confirmar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Editar Agendamento -->
    <div class="modal fade agenda-modal agenda-modal-schedule" id="modalEditar" tabindex="-1" role="dialog">
        <div class="modal-dialog modalEditarAgendamento agenda-modal-lg" role="document">
            <form method="POST">
                <input type="hidden" name="editAgendamento" value="1">
                <input type="hidden" name="idAgendamento" id="modalIdAgendamento">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="fas fa-calendar-alt"></i> Editar Agendamento</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">

                        <div class="form-row mt-2">
                            <div class="col-md-6">
                                <label>Veículo:</label>
                                <select class="form-control" id="veiculoId" name="veiculoId" required>
                                    <option value="">Selecione um veículo</option>
                                    <?php foreach ($veiculos as $v) : ?>
                                        <option value="<?= $v['id'] ?>"><?= htmlspecialchars($v['veiculo']) ?> - <?= htmlspecialchars($v['placa']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>

                            <div class="col-md-3">
                                <label for="modalData">Data:</label>
                                <input type="date" class="form-control" name="dataAgendamento" id="modalData" required value="<?= isset($ag['data']) ? htmlspecialchars($ag['data']) : '' ?>">
                            </div>

                            <div class="col-md-3">
                                <label for="modalHorario">Horário:</label>
                                <select class="form-control" name="horario" id="modalHorario" required>
                                    <?php for ($h = 0; $h < 24; $h++) : ?>
                                        <?php for ($m = 0; $m < 60; $m += 15) :
                                            $hora = sprintf("%02d:%02d", $h, $m); ?>
                                            <option value="<?= $hora ?>" <?= ($ag['horario'] == $hora) ? 'selected' : '' ?>><?= $hora ?></option>
                                        <?php endfor; ?>
                                    <?php endfor; ?>
                                </select>
                            </div>
                        </div>

                        <div class="form-row mt-2">
                            <div class="col-md-6">
                                <label class="mt-2"> Cliente:</label>
                                <select class="form-control" name="empresa" id="modalEmpresa" required>
                                    <option value="" selected disabled hidden>Selecione uma empresa</option>
                                    <?php
                                    $empresa = $_SESSION['f_clt'] ?? null;
                                    $pdo = ConnectionN3();
                                    $filterEmpresas = "";

                                    if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                                        $filterEmpresas = " AND clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
                                    }

                                    $sql = "SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1' $filterEmpresas ORDER BY clientes.clt_nomef ASC";
                                    $show_clt = $pdo->prepare($sql);
                                    $show_clt->execute();

                                    while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                                        $clt_id = $exibe["clt_id"];
                                        $clt_nome = $exibe["clt_nomef"];
                                        $selected = ($empresa == $clt_id) ? "selected" : "";
                                        echo "<option value=\"$clt_id\" $selected>$clt_nome</option>";
                                    }
                                    ?>
                                </select>
                            </div>

                            <div class="col-md-6">
                                <label class="mt-2"> Destino:</label>
                                <input type="text" class="form-control" name="cidade" id="modalCidade" required>
                            </div>
                        </div>

                        <div class="form-row mt-2">
                            <div class="col-md-6">
                                <label class="mt-2"> Condutor:</label>
                                <?php
                                $stmtTodos = $pdo->prepare("SELECT user_id, user_nome FROM usuarios WHERE user_sts = 1 ORDER BY user_nome ASC");
                                $stmtTodos->execute();
                                $todosTecnicos = $stmtTodos->fetchAll(PDO::FETCH_ASSOC);
                                ?>

                                <select class="form-control" name="motorista" id="motorista" required>
                                    <option value="" disabled hidden <?= empty($ag['motorista']) ? 'selected' : '' ?>>Selecione um motorista</option>
                                    <?php foreach ($todosTecnicos as $tec) : ?>
                                        <option value="<?= $tec['user_id'] ?>" <?= ($ag['motorista'] == $tec['user_id']) ? 'selected' : '' ?>>
                                            <?= htmlspecialchars($tec['user_nome']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>

                            <div class="col-md-3">
                                <label class="mt-2"> Km Inicial:</label>
                                <input type="text" class="form-control" name="kmInicial" id="modalkmInicial">
                            </div>

                            <div class="col-md-3">
                                <label class="mt-2"> km Final:</label>
                                <input type="text" class="form-control" name="kmFinal" id="modalkmFinal">
                            </div>
                        </div>



                        <div class="form-row mt-2">
                            <div class="col-md-6">
                                <label class="mt-2">Observações</label>
                                <textarea class="form-control" name="observacoes" id="modalObservacoes" rows="1"></textarea>
                            </div>

                            <div class="col-md-3">
                                <label class="mt-2"> Visibilidade:</label>
                                <select class="form-control" name="visibilidade" id="modalVisibilidade" required>
                                    <option value="0" selected>Todos os usuários</option>
                                    <option value="1">Apenas administradores</option>
                                </select>
                            </div>

                            <div class="col-md-3">
                                <label class="mt-2"> Cor:</label>
                                <input type="hidden" name="colorEditar" id="modalColorEditar" required>

                                <div id="colorPickerEditar" class="d-flex flex-wrap" style="gap: 8px; margin-top: 0px;">
                                    <?php foreach ($cores as $key => $hex) : ?>
                                        <div class="color-square" data-color="<?= $key ?>" title="Cor <?= $key ?>" style="width: 15px; height: 15px; background-color: <?= $hex ?>; cursor: pointer; border: 2px solid transparent; border-radius: 4px;">
                                        </div>
                                    <?php endforeach; ?>
                                </div>

                                <!-- <div id="selectedColor" style="margin-top: 8px; font-weight: 600;">Nenhuma cor selecionada</div> -->
                            </div>

                        </div>
                    </div>

                    <div class="modal-footer d-flex justify-content-between">
                        <?php if ($m9_01 > 1) { ?>
                            <button type="button" id="btnExcluirAg" class="btn btn-danger"><i class="fas fa-trash-alt"></i> Excluir</button>

                            <!-- Checkbox para arquivar -->
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="arquivar" name="arquivar" value="1">
                                <label class="form-check-label" for="arquivar">Arquivar</label>
                            </div>

                            <div>
                                <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> Salvar</button>
                                <button type="button" class="btn btn-secondary" data-dismiss="modal"><i class="fas fa-times"></i> Cancelar</button>
                            </div>
                        <?php } ?>
                    </div>
            </form>
        </div>
    </div>

    <div id="agendaFeedbackOverlay" class="agenda-feedback-overlay d-none">
        <div class="agenda-feedback-card" role="dialog" aria-modal="true" aria-labelledby="agendaFeedbackTitle">
            <div class="agenda-feedback-header">
                <h5 id="agendaFeedbackTitle"><i class="far fa-copy"></i> Agenda</h5>
                <button type="button" class="agenda-feedback-close" id="agendaFeedbackClose">&times;</button>
            </div>
            <div class="agenda-feedback-body" id="agendaFeedbackMessage"></div>
            <div class="agenda-feedback-footer">
                <button type="button" class="btn btn-secondary d-none" id="agendaFeedbackCancel"><i class="fas fa-times"></i> Cancelar</button>
                <button type="button" class="btn btn-primary" id="agendaFeedbackOk"><i class="fas fa-check"></i> OK</button>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>


    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Carregar lista de veículos
            $('#modalListarVeiculos').on('show.bs.modal', function() {
                $.ajax({
                    url: '',
                    method: 'GET',
                    data: {
                        action: 'listVeiculos'
                    },
                    success: function(response) {
                        const veiculos = JSON.parse(response);
                        let listaHtml = '<ul class="list-group">';
                        veiculos.forEach(function(veiculo) {
                            const classeItem = veiculo.ativo == 1 ? '' : 'list-group-item-info';
                            const statusText = veiculo.ativo == 1 ?
                                'Ativo' :
                                '<span class="text-danger font-weight-bold text-uppercase">Inativo</span>';

                            listaHtml += `
                            <li class="list-group-item ${classeItem}">
                                ${veiculo.veiculo} - ${veiculo.placa} - ${statusText}
                                <button class="btn btn-warning btn-sm float-right ml-2"
                                    data-toggle="modal" data-target="#modalEditVeiculo"
                                    data-veiculoid="${veiculo.id}"
                                    data-nomeveiculo="${veiculo.veiculo}"
                                    data-placaveiculo="${veiculo.placa}"
                                    data-statusveiculo="${veiculo.ativo}">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn btn-danger btn-sm float-right" onclick="excluirVeiculo(${veiculo.id})"><i class="fas fa-trash-alt"></i> Excluir</button>
                            </li>`;
                        });
                        listaHtml += '</ul>';
                        $('#listaVeiculos').html(listaHtml);
                    }
                });
            });


            // Abrir modal de edição com dados preenchidos
            $('#modalEditVeiculo').on('show.bs.modal', function(event) {
                const button = $(event.relatedTarget);
                $('#editVeiculoId').val(button.data('veiculoid'));
                $('#editNomeVeiculo').val(button.data('nomeveiculo'));
                $('#editPlacaVeiculo').val(button.data('placaveiculo'));
                $('#editStatusVeiculo').val(button.data('statusveiculo'));
                $('#modalListarVeiculos').modal('hide');

            });

            // Resetar modal de adi��o ao abrir
            $('#modalAddVeiculo').on('show.bs.modal', function() {
                $(this).find('form')[0].reset();
            });


            // Fun��o para excluir um veículo
            window.excluirVeiculo = function(veiculoId) {
                confirmarModalAgenda('Excluir veículo', 'Você tem certeza que deseja excluir este veículo?', function() {
                    $.post('', {
                        excluirveiculoId: veiculoId
                    }, function(response) {
                        if (response.status === 'success') {
                            location.reload();
                        } else {
                            mostrarModalAgenda('Erro ao excluir', 'Não foi possível excluir o veículo.', 'danger');
                        }
                    }, 'json').fail(function() {
                        mostrarModalAgenda('Erro de comunicação', 'Erro na comunicação com o servidor.', 'danger');
                    });
                });
            };

            // Bot�o de Adicionar
            $('#btnAdicionarVeiculo').on('click', function() {
                $('#veiculoId').val(0);
                $('#acao').val('adicionar');
                $('#nomeVeiculo').val('');
                $('#placaVeiculo').val('');
                $('#statusVeiculo').val(1);
                $('#modalTitle').text('Adicionar Veículo');
                $('#modalListarVeiculos').modal('hide');
            });
        });
    </script>

    <script>
        document.addEventListener("DOMContentLoaded", function() {
            const msg = sessionStorage.getItem("mensagem");
            const cor = sessionStorage.getItem("mensagem_cor");

            if (msg && cor) {
                const container = document.createElement("div");
                container.className = `alert ${cor} alert-dismissible fade show alert-fixed mt-3`;
                container.innerHTML = `
            ${msg}
            <button type="button" class="close" data-dismiss="alert">&times;</button>
        `;

                // Tenta inserir no #main-content (ou outro container que você usa)
                const target = document.querySelector("#main-content");
                if (target) target.prepend(container);
                else document.body.prepend(container); // fallback

                sessionStorage.removeItem("mensagem");
                sessionStorage.removeItem("mensagem_cor");

                // Remove automaticamente após 2 segundos
                setTimeout(() => container.remove(), 5000);
            }
        });
    </script>

    <script>
        // Verifica se o usuário tem permissão e se o agendamento nao está arquivado

        // const comPermissao = <?= ($m9_01 > 1 ? 'true' : 'false') ?> ;

        // if (comPermissao) {


        // Ativa draggable nos agendamentos (divs com data-agendamento-id)
        document.addEventListener('DOMContentLoaded', () => {
            // --- LÓGICA DO MODAL DE CONFIRMA��O ---
            let acaoPendente = null;

            $('#btnConfirmarAcao').on('click', function() {
                if (acaoPendente) {
                    if (acaoPendente.tipo === 'arrastar') {
                        enviarArrastar(acaoPendente.dados);
                    } else if (acaoPendente.tipo === 'editar') {
                        acaoPendente.form.submit();
                    }
                }
                $('#modalConfirmacao').modal('hide');
                acaoPendente = null;
            });

            // --- LÓGICA DE EDI��O (MODAL) ---
            $('#modalEditar form').on('submit', function(e) {
                e.preventDefault(); // Impede o envio direto do formulário
                $(modalEditar).modal('hide');

                const nomeEmpresa = $(this).find('#modalEmpresa option:selected').text();
                $('#confirmacaoTitulo').text('Confirmar Edição');
                $('#confirmacaoMensagem').text(`Você confirma as alterações no agendamento para ${nomeEmpresa}?`);

                acaoPendente = {
                    tipo: 'editar',
                    form: this
                };
                $('#modalConfirmacao').modal('show');
            });

            // --- LÓGICA DE ARRASTAR E SOLTAR (DRAG & DROP) ---
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            document.querySelectorAll('.agendamento-box').forEach(el => {
                const permissao = el.getAttribute('data-permissao') === 'true';
                const arquivado = el.getAttribute('data-arquivado') === '1';

                if (!isTouchDevice && permissao && !arquivado) {
                    el.setAttribute('draggable', 'true');
                    el.addEventListener('dragstart', e => {
                        e.dataTransfer.setData('text/plain', el.getAttribute('data-agendamento-id'));
                        e.dataTransfer.effectAllowed = 'move';
                    });
                }
            });

            document.querySelectorAll('.veiculo-cell').forEach(cell => {
                cell.addEventListener('dragover', e => e.preventDefault());

                cell.addEventListener('drop', e => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain');
                    const novaData = cell.getAttribute('data-data');
                    const novoVeiculoId = cell.getAttribute('data-veiculo');

                    if (!id || !novaData || !novoVeiculoId) return;

                    // Prepara a mensagem de confirma��o
                    const agendamentoBox = document.querySelector(`.agendamento-box[data-agendamento-id='${id}']`);
                    const nomeEmpresa = agendamentoBox.querySelector('strong').textContent;
                    const nomeVeiculo = document.querySelector(`th[data-veiculo-id='${novoVeiculoId}']`).textContent.trim();
                    const dataFormatada = new Date(novaData + 'T00:00:00').toLocaleDateString('pt-BR');

                    $('#confirmacaoTitulo').text('Confirmar Movimenta��o');
                    $('#confirmacaoMensagem').html(`Deseja mover o agendamento de <strong>${nomeEmpresa}</strong> para o veículo <strong>${nomeVeiculo}</strong> no dia <strong>${dataFormatada}</strong>?`);

                    acaoPendente = {
                        tipo: 'arrastar',
                        dados: {
                            id,
                            nova_data: novaData,
                            novo_veiculo: novoVeiculoId
                        }
                    };
                    $('#modalConfirmacao').modal('show');
                });
            });

            // Fun��o que envia os dados do "arrastar" para o PHP
            async function enviarArrastar(dados) {
                const formData = new FormData();
                formData.append('arrastar', '1');
                formData.append('id', dados.id);
                formData.append('nova_data', dados.nova_data);
                formData.append('novo_veiculo', dados.novo_veiculo);

                try {
                    const response = await fetch(window.location.href, {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();
                    if (result.success) {
                        sessionStorage.setItem('mensagem', 'Agendamento movido com sucesso!');
                        sessionStorage.setItem('mensagem_cor', 'alert-success');
                        location.reload();
                    } else {
                        mostrarAlerta('Erro ao mover agendamento: ' + (result.error || 'Erro desconhecido'), 'danger');
                    }
                } catch (err) {
                    console.error('Erro na requisição:', err);
                    alert('Erro na comunicação com o servidor.');
                }
            }

            // Adiciona um data-attribute nos cabeçalhos da tabela para pegar o nome do veículo
            document.querySelectorAll('th[style*="width: 300px"]').forEach(th => {
                const veiculoNome = th.textContent.trim();
                const veiculoId = Array.from(document.querySelectorAll('.veiculo-cell')).find(cell => {
                    return cell.querySelector(`th[data-veiculo-id='${cell.dataset.veiculo}']`)?.textContent.trim() === veiculoNome;
                })?.dataset.veiculo;

                // Esta parte pode ser melhorada se o ID do veículo j� estiver no TH
                // Vamos adicionar um no passo seguinte.
            });
        });
    </script>

    <script>
        document.addEventListener("DOMContentLoaded", function() {
            document.querySelectorAll(".edit-btn").forEach(button => {
                button.addEventListener("click", function() {
                    const agendamentosRaw = this.getAttribute("data-agendamentos");
                    const veiculoId = this.getAttribute("data-veiculo");
                    const data = this.getAttribute("data-data");

                    let agendamentos = [];
                    try {
                        if (agendamentosRaw) {
                            agendamentos = JSON.parse(agendamentosRaw);
                        }
                    } catch (e) {}

                    if (agendamentos.length > 0) {
                        // Se j� houver agendamentos: abre modal de escolha
                        abrirModalEscolha(veiculoId, data, agendamentos);
                    } else {
                        // Sem agendamentos: abre modal de novo
                        abrirModalNovoAgendamento(veiculoId, data);
                    }
                });
            });



            function abrirModalNovoAgendamento(veiculoId, data) {
                const modal = document.getElementById("modalNovoAgendamento");

                const veiculoSelect = modal.querySelector("#novoVeiculoId");
                const dataInput = modal.querySelector("#novoData");

                if (!veiculoSelect || !dataInput) {
                    console.error("[ERRO] Campos do modal não encontrados");
                    return;
                }

                veiculoSelect.value = veiculoId;
                dataInput.value = data;

                // console.log("[DEBUG] Veiculo:", veiculoId, "Data:", data);

                $('#modalNovoAgendamento').modal('show');
            }


            function abrirModalEscolha(veiculoId, data, agendamentos) {
                const container = document.getElementById("lista-agendamentos");
                container.innerHTML = ""; // Limpar conteúdo anterior

                if (agendamentos.length > 0) {
                    // Para cada agendamento, criar um botão na lista
                    agendamentos.forEach(ag => {
                        const btn = document.createElement("button");
                        btn.className = "btn btn-outline-secondary btn-block mb-2";
                        btn.innerHTML = `<strong>${ag.nome_empresa}</strong> - ${ag.cidade}<br>${ag.horario} - ${ag.motorista}`;

                        btn.onclick = function() {
                            preencherModalEdicao(ag);
                            $('#modalEscolha').modal('hide');
                            $('#modalEditar').modal('show');
                        };
                        container.appendChild(btn); // Adicionar o botão � lista
                    });
                } else {
                    // Caso não haja agendamentos, exibe uma mensagem alternativa
                    const msg = document.createElement("p");
                    msg.textContent = "Nenhum agendamento encontrado para este dia.";
                    container.appendChild(msg);
                }

                // Configurar o botão para novo agendamento no mesmo dia
                document.getElementById("btnNovoAgendamentoMesmoDia").onclick = function() {
                    abrirModalNovoAgendamento(veiculoId, data);
                    $('#modalEscolha').modal('hide');
                };

                $('#modalEscolha').modal('show'); // Exibir o modal
            }


            function preencherModalEdicao(ag) {
                // console.log("Agendamento recebido:", ag);
                document.querySelector("#modalEditar input[name='idAgendamento']").value = ag.id;
                document.querySelector("#modalEditar select[name='veiculoId']").value = ag.veiculo_id;
                document.querySelector("#modalEditar input[name='dataAgendamento']").value = ag.data;
                document.querySelector("#modalEditar select[name='empresa']").value = ag.empresa;
                document.querySelector("#modalEditar input[name='cidade']").value = ag.cidade;
                document.querySelector("#modalEditar select[name='horario']").value = ag.horario;
                document.querySelector("#modalEditar select[name='motorista']").value = ag.motorista;
                document.querySelector("#modalEditar textarea[name='observacoes']").value = ag.observacoes;
                document.querySelector("#modalEditar input[name='colorEditar']").value = ag.color;
                document.querySelector("#modalEditar input[name='kmInicial']").value = ag.kmInicial;
                document.querySelector("#modalEditar input[name='kmFinal']").value = ag.kmFinal;
                document.querySelector("#modalEditar select[name='visibilidade']").value = ag.visibilidade;
            }
        });
    </script>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Para cada célula da agenda
            document.querySelectorAll('.veiculo-cell').forEach(function(cell) {
                cell.addEventListener('dblclick', function() {
                    const editButton = cell.querySelector('.edit-btn');
                    if (editButton) {
                        editButton.click();
                    }
                });
            });
        });
    </script>

    <script>
        // Modal de escolha de cor
        document.addEventListener('DOMContentLoaded', () => {
            const colorBoxes = document.querySelectorAll('.color-square');
            const inputColor = document.getElementById('modalColorEditar');
            const selectedColorText = document.getElementById('selectedColor');

            function marcarCorSelecionada(colorId) {
                colorBoxes.forEach(box => {
                    const currentId = box.getAttribute('data-color');
                    box.style.borderColor = (currentId === colorId) ? '#000' : 'transparent';
                });

                const boxSelecionada = document.querySelector(`.color-square[data-color="${colorId}"]`);
                // if (boxSelecionada) {
                //     selectedColorText.textContent = `Cor selecionada: ${colorId}`;
                //     selectedColorText.style.color = boxSelecionada.style.backgroundColor;
                // } else {
                //     selectedColorText.textContent = "Nenhuma cor selecionada";
                //     selectedColorText.style.color = '#000';
                // }
            }

            // Inicializa visualmente a cor atual (caso tenha vindo do PHP)
            if (inputColor.value) {
                marcarCorSelecionada(inputColor.value);
            }

            colorBoxes.forEach(box => {
                box.addEventListener('click', () => {
                    //console.log('Antes:', inputColor.value); // valor atual

                    const colorId = box.getAttribute('data-color');
                    inputColor.value = colorId;

                    //console.log('Depois:', inputColor.value); // novo valor

                    marcarCorSelecionada(colorId);
                });
            });

        });
    </script>

    <script>
        // Excluir agendamento
        $('#btnExcluirAg').on('click', function(e) {
            e.preventDefault();

            const agendamentoId = $('#modalIdAgendamento').val();

            confirmarModalAgenda('Excluir agendamento', 'Tem certeza que deseja excluir este agendamento?', function() {
                $.ajax({
                    url: '',
                    type: 'POST',
                    data: {
                        excluir_agendamento: true,
                        agendamento_id: agendamentoId
                    },
                    success: function(response) {
                        const result = JSON.parse(response);

                        if (result.status === 'success') {
                            sessionStorage.setItem('mensagem', '<i class="fas fa-check"></i> Agendamento exclu?do com sucesso!');
                            sessionStorage.setItem('mensagem_cor', 'alert-success');
                            location.reload();
                        } else {
                            sessionStorage.setItem('mensagem', '<i class="fas fa-exclamation-triangle"></i> Falha ao excluir agendamento!');
                            sessionStorage.setItem('mensagem_cor', 'alert-danger');
                            location.reload();
                        }
                    },
                    error: function() {
                        mostrarModalAgenda('Erro de comunicação', 'Erro na comunicação com o servidor.', 'danger');
                    }
                });
            });
        });
    </script>

    <script>
        document.addEventListener("DOMContentLoaded", function() {
            const msg = sessionStorage.getItem('mensagemSucesso');
            if (msg) {
                mostrarModalAgenda('Aviso', msg, 'info');
                sessionStorage.removeItem('mensagemSucesso'); // limpa após exibir
            }
        });
    </script>

    <script>
        document.addEventListener("DOMContentLoaded", function() {
            const colorSquares = document.querySelectorAll('#colorPickerNovo .color-square');
            const colorInput = document.getElementById('modalColor');

            colorSquares.forEach(square => {
                square.addEventListener('click', function() {
                    // Remove destaque anterior
                    colorSquares.forEach(sq => sq.style.borderColor = 'transparent');

                    // Adiciona destaque na cor clicada
                    this.style.borderColor = '#000';

                    // Salva valor da cor no input hidden
                    colorInput.value = this.getAttribute('data-color');
                });
            });
        });
    </script>

    <script>
        let agendamentoCopiado = null;

        function fecharModalAgenda() {
            const overlay = document.getElementById('agendaFeedbackOverlay');
            if (overlay) {
                overlay.classList.add('d-none');
            }
        }

        function prepararModalAgenda(titulo, mensagem, tipo = 'info') {
            const overlay = document.getElementById('agendaFeedbackOverlay');
            const card = overlay ? overlay.querySelector('.agenda-feedback-card') : null;
            const title = document.getElementById('agendaFeedbackTitle');
            const message = document.getElementById('agendaFeedbackMessage');
            const cancel = document.getElementById('agendaFeedbackCancel');
            const ok = document.getElementById('agendaFeedbackOk');
            const close = document.getElementById('agendaFeedbackClose');
            const icones = {
                success: 'fas fa-check',
                danger: 'fas fa-exclamation-triangle',
                warning: 'fas fa-exclamation-circle',
                info: 'far fa-copy'
            };

            if (!overlay || !card || !title || !message || !cancel || !ok || !close) {
                return null;
            }

            card.className = 'agenda-feedback-card agenda-feedback-' + tipo;
            title.innerHTML = '<i class="' + (icones[tipo] || icones.info) + '"></i> ' + titulo;
            message.innerHTML = mensagem;
            cancel.classList.add('d-none');
            cancel.onclick = fecharModalAgenda;
            close.onclick = fecharModalAgenda;
            ok.onclick = fecharModalAgenda;
            ok.innerHTML = '<i class="fas fa-check"></i> OK';
            overlay.classList.remove('d-none');

            return { overlay, card, title, message, cancel, ok, close };
        }

        function mostrarModalAgenda(titulo, mensagem, tipo = 'info') {
            prepararModalAgenda(titulo, mensagem, tipo);
        }

        function confirmarModalAgenda(titulo, mensagem, onConfirm) {
            const modal = prepararModalAgenda(titulo, mensagem, 'warning');
            if (!modal) {
                if (typeof onConfirm === 'function') onConfirm();
                return;
            }
            modal.title.innerHTML = '<i class="fas fa-question-circle"></i> ' + titulo;
            modal.cancel.classList.remove('d-none');
            modal.ok.innerHTML = '<i class="fas fa-check"></i> Confirmar';
            modal.ok.onclick = function() {
                fecharModalAgenda();
                if (typeof onConfirm === 'function') {
                    onConfirm();
                }
            };
        }

        function mostrarBotoesColar() {
            document.querySelectorAll('.veiculo-cell').forEach(cell => {
                const btn = cell.querySelector('.colar-btn');
                if (btn) btn.classList.remove('d-none');
            });
        }

        function esconderBotoesColar() {
            document.querySelectorAll('.colar-btn').forEach(colar => {
                colar.classList.add('d-none');
            });
        }

        // Evento ao clicar no botão de copiar
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const agendamentoId = this.getAttribute('data-agendamento');

                $.ajax({
                    url: '', // mesmo arquivo PHP
                    type: 'POST',
                    data: {
                        buscar_agendamento: true,
                        agendamento_id: agendamentoId
                    },
                    success: function(response) {
                        try {
                            const result = JSON.parse(response);

                            if (result.success && result.dados) {
                                agendamentoCopiado = result.dados;
                                alert('Agendamento copiado! Clique em outro dia para colar.');
                                mostrarBotoesColar();
                            } else {
                                alert('Erro ao copiar: ' + (result.error || 'Desconhecido'));
                            }
                        } catch (e) {
                            console.error("Erro no JSON:", e, response);
                            alert('Resposta inv?lida do servidor.');
                        }
                    },
                    error: function() {
                        alert('Erro ao buscar dados do agendamento.');
                    }
                });
            });
        });

        // Evento ao clicar no botão colar
        document.querySelectorAll('.colar-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (!agendamentoCopiado) {
                    alert('Nenhum agendamento copiado!');
                    return;
                }

                const veiculoId = this.getAttribute('data-veiculo');
                const dataAlvo = this.getAttribute('data-data');

                const partes = dataAlvo.split('-'); // ['yyyy', 'mm', 'dd']
                const ano = parseInt(partes[0], 10);
                const mes = parseInt(partes[1], 10) - 1; // mês começa em 0 no JS
                const dia = parseInt(partes[2], 10);

                const dataObj = new Date(ano, mes, dia); // agora é local
                const diaStr = String(dataObj.getDate()).padStart(2, '0');
                const mesStr = String(dataObj.getMonth() + 1).padStart(2, '0');
                const anoStr = dataObj.getFullYear();

                const dataFormatada = `${diaStr}/${mesStr}/${anoStr}`;

                if (!confirm(`Deseja colar o agendamento em ${dataFormatada}?`)) return;
                    $.ajax({
                    url: '', // mesmo arquivo
                    type: 'POST',
                    data: {
                        duplicar: true,
                        agendamento_copiado: JSON.stringify(agendamentoCopiado),
                        veiculo_id: veiculoId,
                        data_alvo: dataAlvo
                    },
                    success: function(response) {
                        try {
                            const result = JSON.parse(response);

                            if (result.success) {
                                sessionStorage.setItem('mensagem', '<i class="fas fa-check"></i> Agendamento duplicado com sucesso!');
                                sessionStorage.setItem('mensagem_cor', 'alert-success');
                                location.reload();
                            } else {
                                alert('Erro ao colar: ' + (result.error || 'Desconhecido'));
                            }
                        } catch (e) {
                            console.error(response);
                            alert('Erro ao processar resposta.');
                        }
                    },
                    error: function() {
                        alert('Erro na comunicação com o servidor.');
                    }
                    });
            });
        });
    </script>

    <script>
        // Ocultar botões de colar ao apertar ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                agendamentoCopiado = null;
                esconderBotoesColar();
            }
        });

        // Ocultar botões ao clicar fora
        document.addEventListener('click', function(e) {
            const isColarBtn = e.target.closest('.colar-btn');
            const isVeiculoCell = e.target.closest('.veiculo-cell');
            const isCopyBtn = e.target.closest('.copy-btn');
            const isAgendaFeedback = e.target.closest('#agendaFeedbackOverlay');

            if (!isColarBtn && !isVeiculoCell && !isCopyBtn && !isAgendaFeedback) {
                agendamentoCopiado = null;
                esconderBotoesColar();
            }
        });
    </script>

    <script>
        function mostrarAlerta(mensagem, tipo = 'success') {
            const cores = {
                success: 'alert-success',
                danger: 'alert-danger',
                warning: 'alert-warning',
                info: 'alert-info',
            };
            const corClasse = cores[tipo] || 'alert-secondary';

            const container = document.createElement('div');
            container.className = `alert ${corClasse} alert-dismissible fade show alert-fixed mt-3`;
            container.innerHTML = `
        ${mensagem}
        <button type="button" class="close" data-dismiss="alert">&times;</button>
    `;

            const target = document.querySelector('#main-content') || document.body;
            target.prepend(container);

            setTimeout(() => container.remove(), 3000);
        }
    </script>

    <script>
        $('#btnDesfazerGlobal').on('click', function() {
            confirmarModalAgenda('Desfazer alteração', 'Tem certeza que deseja desfazer a SUA última alteração na agenda?', function() {
                $.ajax({
                    url: '',
                    type: 'POST',
                    data: {
                        desfazer_minha_ultima_alteracao: true
                    },
                    success: function(response) {
                        const result = JSON.parse(response);
                        if (result.status === 'success') {
                            sessionStorage.setItem('mensagem', '<i class="fas fa-check"></i> ' + result.message);
                            sessionStorage.setItem('mensagem_cor', 'alert-success');
                        } else {
                            sessionStorage.setItem('mensagem', '<i class="fas fa-exclamation-triangle"></i> ' + result.message);
                            sessionStorage.setItem('mensagem_cor', 'alert-danger');
                        }
                        location.reload();
                    },
                    error: function() {
                        mostrarModalAgenda('Erro de comunicação', 'Erro na comunicação com o servidor.', 'danger');
                    }
                });
            });
        });
    </script>

</body>

</html>
