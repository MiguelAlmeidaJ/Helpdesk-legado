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



setlocale(LC_TIME, 'pt_BR.UTF-8', 'pt_BR.utf8', 'portuguese');
date_default_timezone_set('America/Sao_Paulo');

$ultimoDia = date('t', strtotime($data_base));

$veiculos = $pdo->query("SELECT id, veiculo, placa FROM veiculos WHERE ativo = 1 ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);

$user_funcao = $_SESSION['allterusN3func'] ?? null;
$Admin = [1, 2, 3, 9, 10, 18];
$whereRelatorio = ['MONTH(a.data) = ?', 'YEAR(a.data) = ?'];
if (!in_array($user_funcao, $Admin)) {
    array_unshift($whereRelatorio, 'a.visibilidade = 0');
}
$whereRelatorioSql = 'WHERE ' . implode(' AND ', $whereRelatorio);

$stmt = $pdo->prepare("
    SELECT a.*, u.user_nome AS usuario_nome, m.user_nome AS motorista_nome, c.clt_nomef AS nome_empresa
    FROM agenda_veiculos a
    JOIN usuarios u ON a.usuario_id = u.user_id
    LEFT JOIN usuarios m ON a.motorista = m.user_id
    LEFT JOIN clientes c ON a.empresa = c.clt_id
    $whereRelatorioSql
");
$stmt->execute([$mes, $ano]);
$agendamentosRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);

$agendamentos = [];
foreach ($agendamentosRaw as $ag) {
    $agendamentos[$ag['data']][$ag['veiculo_id']][] = $ag;
}

$fontSize = $_GET['fontsize'] ?? 12;
$padding = $_GET['padding'] ?? 0;
$largura = $_GET['largura'] ?? 80;


?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <title>Relatório Agenda</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css">
    <style>
        body {
            font-size: <?= $fontSize ?>px;
            margin: 10px;
        }

        .container {
            width: 900px;
            min-width: 800px;
            max-width: 1200%;
            overflow-x: auto;
        }

        table {
            border-collapse: collapse;
            table-layout: fixed;
            width: 100%;
        }

        th,
        td {
            border: 1px solid #ccc;
            padding: <?= $padding ?>px;
            vertical-align: top;
            overflow: hidden;
        }

        th {
            background-color: #f3f3f3;
            text-align: center;
        }

        th.col-data,
        td.col-data {
            width: 50px;
            min-width: 50px;
            max-width: 50px;
            background: #f3f3f3;
            text-align: center;
            white-space: nowrap;
        }

        th.col-veiculo,
        td.col-veiculo {
            width: 80px;
            min-width: 80px;
            max-width: 80px;
            vertical-align: top;
            overflow: hidden;
            word-wrap: break-word;
            word-break: break-word;
            white-space: normal;
        }


        .bg-light {
            background-color: #f1f1f1 !important;
        }

        .text-muted {
            color: #666 !important;
        }

        .agendamento {
            font-size: <?= $fontSize - 1 ?>px;
            line-height: 1;
            margin-left: 10px;
            margin-bottom: 2px;
            border-bottom: 1px dashed #ccc;
            word-wrap: break-word;
            word-break: break-word;
            white-space: normal;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .agendamento:last-child {
            border-bottom: none;
        }

        .agendamento strong,
        .agendamento small {
            display: inline;
        }

        .print-btn {
            margin: 15px 0;
        }

        @media print {

            th,
            td {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>

</head>

<body>
    <div class="container">
        <h5 class="mt-2">Agenda de Veículos - <?= sprintf('%02d/%d', $mes, $ano) ?></h5>
        <div class="table-responsive">
            <table class="table table-sm table-bordered">
                <thead>
                    <tr>
                        <th class="col-data">Data</th>
                        <?php foreach ($veiculos as $v) : ?>
                            <th class="col-veiculo"><?= htmlspecialchars($v['veiculo']) ?><br><small><?= htmlspecialchars($v['placa']) ?></small></th>
                        <?php endforeach; ?>
                    </tr>
                </thead>
                <tbody>
                    <?php for ($i = 0; $i < $dias_do_mes; $i++) :
                        $data = date('Y-m-d', strtotime("$data_base +$i days"));
                        $dataObj = new DateTime($data);
                        $dataFormatada = $dataObj->format('d/m');

                        $nomeDia = nomeDiaSemanaPtBr($dataObj);

                        $diaSemana = $dataObj->format('w');
                        $estiloFds = ($diaSemana == 0 || $diaSemana == 6) ? 'background-color:#a1a1a1; padding: 0px;' : 'background-color: #E9ECEF; padding: 0px;';
                    ?>
                        <tr>
                            <td class="col-data " style="<?= $estiloFds ?>">
                                <span style="font-size: 13px; font-weight: bold; color: #000;line-height: 1;">
                                    <?= $dataFormatada ?>
                                </span><br>
                                <span style="font-size: 9px; color: #666;line-height: 1;">
                                    <?= $nomeDia ?>
                                </span>
                            </td>
                            <?php foreach ($veiculos as $v) : ?>
                                <td class="col-veiculo">
                                    <?php
                                    $agds = $agendamentos[$data][$v['id']] ?? [];
                                    foreach ($agds as $ag) :
                                        $hora = htmlspecialchars($ag['horario']);
                                        $empresa = htmlspecialchars($ag['nome_empresa'] ?? 'Empresa');
                                        $cidade = htmlspecialchars($ag['cidade']);
                                    ?>
                                        <div class="agendamento">
                                            <strong><?= $hora ?></strong><br>
                                            <div style="margin-top: 3px;">
                                                <?= $empresa ?> - <small><?= $cidade ?></small>
                                            </div>
                                        </div>

                                    <?php endforeach; ?>
                                </td>
                            <?php endforeach; ?>
                        </tr>
                    <?php endfor; ?>
                </tbody>

            </table>
        </div>
    </div>
    <script>
        window.onload = function() {
            window.print();
        };
    </script>
    <!-- <script>
        window.onafterprint = function() {
            window.close();
        };
    </script> -->

</body>

</html>
