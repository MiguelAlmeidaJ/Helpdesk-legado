<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m8_00 == 0) {
    header("Location: ../home.php");
    exit;
}

setlocale(LC_TIME, 'pt_BR.UTF-8', 'pt_BR.utf8', 'portuguese');
date_default_timezone_set('America/Sao_Paulo');


$pdo = ConnectionN3();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

$mes = isset($_GET['mes']) ? (int)$_GET['mes'] : date('n');
$ano = isset($_GET['ano']) ? (int)$_GET['ano'] : date('Y');

$data_base = date("$ano-$mes-01");
$dias_do_mes = cal_days_in_month(CAL_GREGORIAN, $mes, $ano);

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

    header("Location: agenda.php?mes=$mes&ano=$ano");
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



if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['editAgendamento'])) {
    $idAgendamento = $_POST['idAgendamento'] ?? null; // null = novo agendamento
    $veiculoId = $_POST['veiculoId'];
    $dataAgendamento = $_POST['dataAgendamento'];
    $empresa = strtoupper($_POST['empresa']);
    $cidade = strtoupper($_POST['cidade']);
    $horario = $_POST['horario'];
    $usuarios = ucwords($_POST['usuarios']);
    $observacoes = $_POST['observacoes'];
    $usuarioId = $_SESSION['allterusN3Id'];

    if ($idAgendamento) {
        // Atualização de agendamento existente
        // Verifica se está tentando mudar para um horário já ocupado por outro agendamento
        $check = $pdo->prepare("SELECT id FROM agenda_veiculos WHERE veiculo_id = ? AND data = ? AND horario = ? AND id != ?");
        $check->execute([$veiculoId, $dataAgendamento, $horario, $idAgendamento]);

        if ($check->rowCount() > 0) {
            echo "Já existe um agendamento para este veículo nesta data e horário.";
            exit;
        }

        $stmt = $pdo->prepare("UPDATE agenda_veiculos 
                               SET empresa=?, cidade=?, horario=?, usuarios=?, observacoes=? 
                               WHERE id=?");
        $stmt->execute([$empresa, $cidade, $horario, $usuarios, $observacoes, $idAgendamento]);
    } else {
        // Novo agendamento
        $check = $pdo->prepare("SELECT id FROM agenda_veiculos WHERE veiculo_id = ? AND data = ? AND horario = ?");
        $check->execute([$veiculoId, $dataAgendamento, $horario]);

        if ($check->rowCount() > 0) {
            echo "Já existe um agendamento para este veículo nesta data e horário.";
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO agenda_veiculos 
                               (veiculo_id, data, empresa, cidade, horario, usuarios, observacoes, usuario_id) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$veiculoId, $dataAgendamento, $empresa, $cidade, $horario, $usuarios, $observacoes, $usuarioId]);
    }

    header("Location: agenda.php?mes=$mes&ano=$ano");
    exit;
}



$veiculos = $pdo->query("SELECT id, veiculo FROM veiculos WHERE ativo = 1 ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);

$agendamentosRaw = $pdo->query("SELECT a.*, u.user_nome AS usuario_nome FROM agenda_veiculos a JOIN usuarios u ON a.usuario_id = u.user_id")->fetchAll(PDO::FETCH_ASSOC);

$agendamentos = [];

foreach ($agendamentosRaw as $ag) {
    $data = $ag['data'];
    $veiculo_id = $ag['veiculo_id'];
    $agendamentos[$data][$veiculo_id][] = $ag;
}

?>

<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=0.9, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <title>Agenda de Veículos</title>
    <style>
        body {
            zoom: 0.9;
            width: 100%;
            overflow-x: hidden;
        }

        .header-select {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .card-body {
            overflow-y: auto;
            max-height: 91vh;
            /* ou ajuste conforme sua necessidade */
            padding: 0;
            font-size: 0.85rem;
            color: #333;
            /* Cor de texto mais suave */
        }



        .table-responsive {
            overflow-x: auto;
            white-space: nowrap;
        }

        .veiculo-cell {
            position: relative;
            width: 200px;
            min-width: 200px;
            max-width: 200px;
            vertical-align: top;
        }

        .agendado {
            background-color: #e7f5e5;
            /* Verde claro pastel */
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
            border: 1px solid #d1e7d1;
        }

        .agendamento-box {
            background-color: #f8f9fa;
            border: 1px solid #e0e0e0;
            padding: 12px;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            word-wrap: break-word;
            overflow-wrap: break-word;
            white-space: normal;
            padding: 10px;
            border-radius: 6px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .edit-btn {
            position: absolute;
            top: 2px;
            right: 10px;
            background: none;
            border: none;
            padding: 0;
            font-size: 13px;
            color: #333;
            cursor: pointer;
        }

        .delete-btn {
            position: absolute;
            top: 2px;
            right: 40px;
            background: none;
            border: none;
            padding: 0;
            font-size: 13px;
            color: #333;
            cursor: pointer;
        }

        /* Remover a borda preta ao clicar */
        .delete-btn:focus {
            outline: none;
            border: none;
        }

        /* Alterar a cor do botão ao passar o mouse */
        .delete-btn:hover {
            background-color: transparent;
            color: red;
            border-color: #ccc;
            font-size: 20px;
        }

        /* Melhorando a aparência das bordas e cabeçalhos */
        .table thead th {
            background-color: #28a745;
            /* Verde mais forte para destacar o cabeçalho */
            color: white;
            font-weight: bold;
            text-align: center;
        }

        /* Cores mais suaves para as células */
        .table td {
            vertical-align: top;
            text-align: center;
            padding: 10px 5px;
            /* Mais espaçamento entre as células */
        }


        th:first-child,
        td:first-child {
            position: sticky;
            left: 0;
            background-color: #fff;
            z-index: 2;
        }


        .table th,
        .table td {
            vertical-align: top;
        }

        /* Alinhamento da data na célula */
        td.bg-light.font-weight-bold {
            background-color: #f0f0f0;
            font-weight: bold;
            color: #212529;
            text-align: left;
        }

        /* Remover a borda preta ao clicar */
        .edit-btn:focus {
            outline: none;
            border: none;
        }

        /* Alterar a cor do botão ao passar o mouse */
        .edit-btn:hover {
            background-color: transparent;
            color: rgb(7, 182, 48);
            border-color: #ccc;
            font-size: 20px;
        }

        /* Alterar a cor do botão quando está pressionado */
        .edit-btn:active {
            background-color: #e6e6e6;
            /* cor de fundo quando clicado */
            color: #333;
            /* cor do texto quando clicado */
        }

        .btn-veiculos:hover {
            background-color: #28a745;
            color: #fff;
            border-color: #ccc;
        }

        .modal {
            z-index: 1050 !important;
            /* Garante que o modal fique visível acima de outros elementos */
        }

        .modal.show {
            display: block !important;
            /* Força o modal a ser exibido */
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid mt-2">
        <div class="card">
            <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-user"></i> Agenda de Veículos</h5>
                <div class="header-select">
                    <form method="GET" class="form-inline" id="filtroAgenda">
                        <select name="mes" class="form-control form-control-sm mr-2" onchange="document.getElementById('filtroAgenda').submit()">
                            <?php
                            $fmt = new IntlDateFormatter('pt_BR', IntlDateFormatter::LONG, IntlDateFormatter::NONE, 'America/Sao_Paulo', IntlDateFormatter::GREGORIAN, 'MMMM');
                            for ($m = 1; $m <= 12; $m++) :
                                $data = mktime(0, 0, 0, $m, 1);
                                $nomeMes = $fmt->format($data);
                            ?>
                                <option value="<?= $m ?>" <?= $m == $mes ? 'selected' : '' ?>><?= ucfirst($nomeMes) ?></option>
                            <?php endfor; ?>
                        </select>
                        <select name="ano" class="form-control form-control-sm mr-2" onchange="document.getElementById('filtroAgenda').submit()">
                            <?php for ($a = date('Y') - 5; $a <= date('Y') + 5; $a++) : ?>
                                <option value="<?= $a ?>" <?= $a == $ano ? 'selected' : '' ?>><?= $a ?></option>
                            <?php endfor; ?>
                        </select>
                    </form>


                </div>
            </div>

            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-bordered table-striped table-sm">
                        <thead class="thead-light">
                            <tr>
                                <th style="width: 100px; text-align: center">Data</th>
                                <?php foreach ($veiculos as $v) : ?>
                                    <th style="width: 200px; text-align: center"><?= htmlspecialchars($v['veiculo']) ?></th>
                                <?php endforeach; ?>
                                <th style="width: 80px; text-align: center">
                                    <button type="button" class="btn btn-sm btn-secondary btn-veiculos" data-toggle="modal" data-target="#modalListarVeiculos">
                                        Veículos
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php for ($i = 0; $i < $dias_do_mes; $i++) :
                                $data = date('Y-m-d', strtotime("$data_base +$i days")); ?>
                                <tr>
                                    <td class="bg-light font-weight-bold" style="padding-left: 10px">
                                        <?php
                                        $formatter = new IntlDateFormatter('pt_BR', IntlDateFormatter::NONE, IntlDateFormatter::FULL);
                                        $formatter->setPattern('dd/MM (EEEE)');
                                        echo $formatter->format(new DateTime($data));
                                        ?>
                                    </td>
                                    <?php foreach ($veiculos as $v) :
                                        // Obter todos os agendamentos para o veículo na data
                                        $agendamentosPorDiaEVeiculo = $agendamentos[$data][$v['id']] ?? []; ?>
                                        <td class="veiculo-cell <?= !empty($agendamentosPorDiaEVeiculo) ? 'agendado' : '' ?>">
                                            <?php
                                            if (!empty($agendamentosPorDiaEVeiculo)) {
                                                // Exibe todos os agendamentos para esse veículo no dia
                                                foreach ($agendamentosPorDiaEVeiculo as $ag) {
                                                    echo "<div class='agendamento-box mb-2 p-2 border rounded'>";
                                                    echo "<div><strong>" . htmlspecialchars($ag['empresa']) . " - " . htmlspecialchars($ag['cidade']) . "</strong></div>";
                                                    echo "<div><strong>Horário:</strong> " . htmlspecialchars($ag['horario']) . "</div>";
                                                    echo "<div><strong>Para:</strong> " . htmlspecialchars($ag['usuarios']) . "</div>";
                                                    if (!empty($ag['observacoes'])) {
                                                        echo "<div><strong>OBS:</strong> " . nl2br(htmlspecialchars($ag['observacoes'])) . "</div>";
                                                    }
                                                    echo "<div class='text-muted'><small>Por: " . htmlspecialchars($ag['usuario_nome']) . "</small></div>";

                                                    echo "<button class='btn btn-sm btn-outline-primary mt-1 edit-btn'
                                                            data-veiculo='" . $v['id'] . "'
                                                            data-data='" . $data . "'
                                                            data-agendamentos='" . htmlspecialchars(json_encode($agendamentosPorDiaEVeiculo), ENT_QUOTES, 'UTF-8') . "'>
                                                            <i class='fas fa-pencil-alt';></i>
                                                        </button>";
                                                    echo "</div>";
                                                }
                                            } else {
                                                // Caso não haja agendamentos, exibe o botão de adicionar novo agendamento
                                                echo "<button class='edit-btn' data-toggle='modal' data-target='#modalNovoAgendamento'
                                        data-veiculo='" . $v['id'] . "' data-data='" . $data . "'>
                                        <i class='fas fa-plus'></i>
                                    </button>";
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
    <div class="modal fade" id="modalEscolha" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Agendamentos existentes </h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="hidden" name="idAgendamento">
                    <div id="lista-agendamentos"></div>
                    <hr>
                    <div class="form-group row">
                        <div class="col">
                            <button class="btn btn-success btn-block" id="btnNovoAgendamentoMesmoDia">
                                Adicionar novo agendamento para esta data
                            </button>
                        </div>
                        <div class="col">
                            <button type="button" class="btn btn-secondary btn-block" data-dismiss="modal">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Novo Agendamento -->
    <div class="modal fade" id="modalNovoAgendamento" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="editAgendamento" value="1">
                    <input type="hidden" name="veiculoId">
                    <input type="hidden" name="dataAgendamento">
                    <!-- campos empresa, cidade, horário, etc -->
                    <div class="modal-header">
                        <h5 class="modal-title">Novo Agendamento</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <label>Empresa</label>
                        <input type="text" class="form-control" name="empresa" required>
                        <label>Destino</label>
                        <input type="text" class="form-control" name="cidade" required>
                        <label>Horário</label>
                        <select class="form-control" name="horario" id="modalHorario" required>
                            <?php for ($h = 0; $h < 24; $h++) : ?>
                                <?php for ($m = 0; $m < 60; $m += 15) :
                                    $hora = sprintf("%02d:%02d", $h, $m); ?>
                                    <option value="<?= $hora ?>"><?= $hora ?></option>
                                <?php endfor; ?>
                            <?php endfor; ?>
                        </select>
                        <label>Usuários</label>
                        <input type="text" class="form-control" name="usuarios" required>
                        <label>Observação~es</label>
                        <textarea class="form-control" name="observacoes"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-success">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal adicionar Veículo -->
    <div class="modal fade" id="modalAddVeiculo" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <form method="POST">
                <input type="hidden" name="acao" value="adicionar">
                <input type="hidden" name="veiculoId" id="veiculoId" value="0">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="modalTitle">Adicionar Veículo</h5>
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
                        <button type="submit" class="btn btn-success">Salvar</button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal Editar Veículo -->
    <div class="modal fade" id="modalEditVeiculo" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <form method="POST">
                <input type="hidden" name="acao" value="editar">
                <input type="hidden" id="editVeiculoId" name="veiculoId">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Editar Veículo</h5>
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
                        <button type="submit" class="btn btn-primary">Salvar</button>
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal Listar Veículos -->
    <div class="modal fade" id="modalListarVeiculos" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Lista de Veículos</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="listaVeiculos"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-success" data-toggle="modal" data-target="#modalAddVeiculo" id="btnAdicionarVeiculo">Adicionar Novo Veículo</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Editar Agendamento -->
    <div class="modal fade" id="modalEditar" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <form method="POST">
                <input type="hidden" name="editAgendamento" value="1">
                <input type="hidden" name="idAgendamento" id="modalIdAgendamento">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Editar Agendamento</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="veiculoId" name="veiculoId">
                        <input type="hidden" id="dataAgendamento" name="dataAgendamento">
                        <label>Empresa</label>
                        <input type="text" class="form-control" name="empresa" id="modalEmpresa" required>
                        <label class="mt-2">Destino</label>
                        <input type="text" class="form-control" name="cidade" id="modalCidade" required>
                        <label class="mt-2">Horário</label>
                        <select class="form-control" name="horario" id="modalHorario" required>
                            <?php for ($h = 0; $h < 24; $h++) : ?>
                                <?php for ($m = 0; $m < 60; $m += 15) :
                                    $hora = sprintf("%02d:%02d", $h, $m); ?>
                                    <option value="<?= $hora ?>"><?= $hora ?></option>
                                <?php endfor; ?>
                            <?php endfor; ?>
                        </select>
                        <label class="mt-2">Usuarios</label>
                        <input type="text" class="form-control" name="usuarios" id="modalUsuarios" required>
                        <label class="mt-2">Observações</label>
                        <textarea class="form-control" name="observacoes" id="modalObservacoes"></textarea>
                    </div>
                    <div class="modal-footer d-flex justify-content-between">
                        <button type="button" id="btnExcluirAg" class="btn btn-danger">Excluir</button>
                        <div>
                            <button type="submit" class="btn btn-success">Salvar</button>
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                        </div>
                    </div>
            </form>
        </div>
    </div>
    </div>

    <!-- Modal Exclusão de Agendamento -->
    <div class="modal fade" id="modalExcluirAgendamento" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Excluir Agendamento</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <label>Tem certeza que deseja excluir o agendamento?</label>
                    <hr>
                    <div class="form-group row mt-2">
                        <div class="col">
                            <button type="button" class="btn btn-danger btn-block" id="confirmarExclusaoBtn">
                                Confirmar Exclusão
                            </button>
                        </div>
                        <div class="col">
                            <button type="button" class="btn btn-secondary btn-block" data-dismiss="modal">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>


    <!-- <button id="btnAbrirModal" class="btn btn-primary">Abrir Modal de Exclusão</button> -->

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
                        console.log('Veículos recebidos:', veiculos);
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
                                    Editar
                                </button>
                                <button class="btn btn-danger btn-sm float-right" onclick="excluirVeiculo(${veiculo.id})">Excluir</button>
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

            // Resetar modal de adição ao abrir
            $('#modalAddVeiculo').on('show.bs.modal', function() {
                $(this).find('form')[0].reset();
            });


            // Função para excluir um veículo
            window.excluirVeiculo = function(veiculoId) {
                if (confirm('Você tem certeza que deseja excluir este veículo?')) {
                    $.post('', {
                        excluirveiculoId: veiculoId
                    }, function(response) {
                        if (response.status === 'success') {
                            location.reload(); // Recarregar a página para atualizar a lista
                        }
                    }, 'json');
                }
            };

            // Botão de Adicionar
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
                        // Se já houver agendamentos: abre modal de escolha
                        abrirModalEscolha(veiculoId, data, agendamentos);
                    } else {
                        // Sem agendamentos: abre modal de novo
                        abrirModalNovoAgendamento(veiculoId, data);
                    }
                });
            });

            function abrirModalNovoAgendamento(veiculoId, data) {
                document.querySelector("#modalNovoAgendamento input[name='veiculoId']").value = veiculoId;
                document.querySelector("#modalNovoAgendamento input[name='dataAgendamento']").value = data;
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
                        btn.innerHTML = `<strong>${ag.empresa}</strong> - ${ag.cidade}<br>${ag.horario} - ${ag.usuarios}`;

                        btn.onclick = function() {
                            preencherModalEdicao(ag);
                            $('#modalEscolha').modal('hide');
                            $('#modalEditar').modal('show');
                        };
                        container.appendChild(btn); // Adicionar o botão à lista
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
                document.querySelector("#modalEditar input[name='idAgendamento']").value = ag.id;
                document.querySelector("#modalEditar input[name='veiculoId']").value = ag.veiculo_id;
                document.querySelector("#modalEditar input[name='dataAgendamento']").value = ag.data;
                document.querySelector("#modalEditar input[name='empresa']").value = ag.empresa;
                document.querySelector("#modalEditar input[name='cidade']").value = ag.cidade;
                document.querySelector("#modalEditar select[name='horario']").value = ag.horario;
                document.querySelector("#modalEditar input[name='usuarios']").value = ag.usuarios;
                document.querySelector("#modalEditar textarea[name='observacoes']").value = ag.observacoes;
            }
        });
    </script>
    
    <script>
        $(document).ready(function() {
            // Quando clicar no botão "Excluir" dentro do modalEditar
            $('#btnExcluirAg').on('click', function(e) {
                e.preventDefault(); // Impede a ação padrão
                console.log("[btnExcluirAg] Clique detectado");

                // Marcar para abrir o modal de confirmação
                abrirConfirmacao = true;

                // Pegar dados do agendamento
                const agendamentoId = $('#modalIdAgendamento').val();
                const veiculoId = $('#veiculoId').val();
                const data = $('#dataAgendamento').val();

                console.log(`[btnExcluirAg] Dados coletados: ID=${agendamentoId}, Veículo=${veiculoId}, Data=${data}`);

                // Armazenar os dados no botão de confirmação
                const confirmarBtn = document.getElementById("confirmarExclusaoBtn");
                confirmarBtn.setAttribute("data-agendamento-id", agendamentoId);
                confirmarBtn.setAttribute("data-veiculo-id", veiculoId);
                confirmarBtn.setAttribute("data-data", data);

                console.log("[btnExcluirAg] Dados armazenados no botão de confirmação");

                // Fecha o modal de edição
                $('#modalEditar').modal('hide');
                console.log("[btnExcluirAg] modalEditar ocultado");
            });

            // Quando o modalEditar terminar de fechar
            $('#modalEditar').on('hidden.bs.modal', function() {
                console.log("[modalEditar] Evento hidden.bs.modal disparado");

                if (abrirConfirmacao) {
                    console.log("[modalEditar] abrirConfirmacao é true, exibindo modalExcluirAgendamento");

                    $('#modalExcluirAgendamento').modal('show');
                    abrirConfirmacao = false;
                } else {
                    console.log("[modalEditar] abrirConfirmacao é false, não exibindo modalExcluirAgendamento");
                }
            });
        });
    </script>

    <script>
        $(document).ready(function() {
            $('#confirmarExclusaoBtn').on('click', function() {
                const agendamentoId = $(this).data('agendamento-id');
                const veiculoId = $(this).data('veiculo-id');
                const data = $(this).data('data');

                // Enviar requisição AJAX para excluir o agendamento
                $.ajax({
                    url: '', // URL do seu script PHP (mesmo arquivo ou outra URL)
                    type: 'POST',
                    data: {
                        excluir_agendamento: true,
                        agendamento_id: agendamentoId
                    },
                    success: function(response) {
                        const result = JSON.parse(response);

                        if (result.status === 'success') {
                            // Se a exclusáo for bem-sucedida, fecha o modal de exclusáo e exibe uma mensagem
                            $('#modalExcluirAgendamento').modal('hide');
                            alert('Agendamento excluído com sucesso!');
                            // Aqui você pode atualizar a tabela ou realizar outras açães conforme necessário

                            // Recarregar a tela
                            location.reload();
                        } else {
                            // Caso haja erro na exclusáo
                            alert('Erro ao excluir o agendamento. Tente novamente!');
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
        $('#btnAbrirModalExcluir').on('click', function() {
            $('#modalExcluirAgendamento').modal('show');
        });
    </script>

</body>

</html>