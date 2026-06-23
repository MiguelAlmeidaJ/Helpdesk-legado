<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m7_00 == 0) {
    header("Location: ../home.php");
    exit;
}

$pdoMkt = ConnectionMkt();
if (!$pdoMkt) exit("Erro ao conectar ao banco de dados.");

$staff_filter = $_POST['staffid'] ?? '';
//se nao houver data de inicio ou fim, será considerada a data atual
$data_inicio = !empty($_POST['data_inicio']) ? $_POST['data_inicio'] . ' 00:00:00' : date('Y-m-d') . ' 00:00:00';
$data_fim = !empty($_POST['data_fim']) ? $_POST['data_fim'] . ' 23:59:59' : date('Y-m-d') . ' 23:59:59';



$where = "WHERE f.rel_type = 'task'";

// Parâmetros
$params = [];

// Se o staffid não for fornecido, adiciona o filtro de tecnicos ativos
// Ajuste no filtro de staff: considera quem anexou OU a quem a tarefa foi atribuída
if (empty($staff_filter)) {
    $where .= " AND COALESCE(ta.staffid, f.staffid) IN (SELECT staffid FROM tblstaff WHERE active = 1 AND staffid != 23)";
} else {
    $where .= " AND COALESCE(ta.staffid, f.staffid) = :staffid";
    $params[':staffid'] = $staff_filter;
}

// Filtro por data
$where .= " AND DATE(f.dateadded) BETWEEN :inicio AND :fim";
$params[':inicio'] = $data_inicio;
$params[':fim'] = $data_fim;


// Consulta 1: InterAções

$sqlInteracoes = "
SELECT 
    COALESCE(ta.staffid, f.staffid) AS staffid,
    GROUP_CONCAT(DISTINCT f.rel_id) AS tarefas_interagidas,
    COUNT(DISTINCT f.rel_id) AS total_interacoes,
    COUNT(CASE WHEN cfv.fieldid = 8 THEN cfv.relid END) AS artes_feitas,
    GROUP_CONCAT(DISTINCT CASE WHEN cfv.fieldid = 8 THEN cfv.relid END) AS tarefas_feitas
FROM tblfiles f
LEFT JOIN tbltasks t ON t.id = f.rel_id
LEFT JOIN tbltask_assigned ta ON ta.taskid = t.id
LEFT JOIN tblcustomfieldsvalues cfv ON f.rel_id = cfv.relid AND cfv.fieldid = 8
$where
GROUP BY COALESCE(ta.staffid, f.staffid)
";
$stmt = $pdoMkt->prepare($sqlInteracoes);
$stmt->execute($params);
$dadosInteracoes = $stmt->fetchAll(PDO::FETCH_ASSOC);


$dados = [];
foreach ($dadosInteracoes as $linha) {
    $dados[$linha['staffid']] = [
        'tarefas_interagidas' => $linha['tarefas_interagidas'],
        'total_interacoes' => $linha['total_interacoes'],
        'artes_feitas' => $linha['artes_feitas'],
        'tarefas_feitas' => $linha['tarefas_feitas']
    ];
}

$totalArtesFeitas = 0;
foreach ($dados as $dado) {
    $totalArtesFeitas += $dado['artes_feitas'];
}



// Tecnicos
$sqlTecnicos = "SELECT staffid, firstname, lastname FROM tblstaff WHERE active = 1 AND staffid != 23 ORDER BY firstname ASC";
$stmt = $pdoMkt->query($sqlTecnicos);
$todosTecnicos = $stmt->fetchAll(PDO::FETCH_ASSOC);

$tecnicos = [];
foreach ($todosTecnicos as $tecnico) {
    $tecnicos[$tecnico['staffid']] = $tecnico['firstname'] . ' ' . $tecnico['lastname'];
}

//incluir o nome do tecnico na array de dados
foreach ($dados as $staffid => $dado) {
    if (isset($tecnicos[$staffid])) {
        $dado['nome_tecnico'] = $tecnicos[$staffid];
        $dados[$staffid] = $dado;
    } else {
        // Se o staffer não estiver na lista de tecnicos, remove o staffer da lista
        unset($dados[$staffid]);
    }
}

// Ordenar os dados por artes_feitas (do maior para o menor)
usort($dados, function ($a, $b) {
    return ($b['artes_feitas'] ?? 0) <=> ($a['artes_feitas'] ?? 0);
});

// Calcular o máximo de artes feitas para a barra proporcional
$maxArtesFeitas = max(array_column($dados, 'artes_feitas') ?: [1]); // evita erro com array vazio


?>

<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=0.9, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/help.css">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="../css/bootstrap-select.min.css">
    <link rel="stylesheet" href="../css/timeline.css">
    <link rel="stylesheet" href="../css/bootstrap-datetimepicker.min.css">
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">

    <style>
        body {
            zoom: 1;
            width: 100%;
            overflow-x: hidden;
        }

        .btn-group {
            position: relative;
            /* Define o grupo de botões como referência */
        }


        .barra-container {
            background: #eee;
            border-radius: 6px;
            overflow: hidden;
            height: 25px;
            width: 80%;
        }

        .barra {
            height: 100%;
            background-color: green;
            text-align: right;
            padding-right: 6px;
            color: #fff;
            font-weight: bold;
            font-size: 18px;
            line-height: 20px;
        }

        .porcentagem {
            font-weight: bold;
            font-size: 14px;
        }
    </style>
</head>

<body style="margin: 0; overflow: hidden;">
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid">
        <div class="row" style="height: 100vh;">
            <div class="col-12 mt-2" style="padding-left: 1px; padding-right: 1px; height: 100%;">
                <div class="card pt-0 pb-10" style="height: 100%; width: 100%; display: flex; flex-direction: column;">
                    <!-- Header fixo -->
                    <div class="card-header py-1" style="flex: 0 0 auto;">
                        <form action="#" method="POST" id="formFiltro">
                            <div class="form-row align-items-center">

                                <div class="col-2 col-form-label-sm ml-5 pl-5">
                                    <label class="my-0">Tecnico:</label>
                                    <select class="form-control form-control-sm" name="staffid" id="staffid">
                                        <option value="">Todos</option>
                                        <?php foreach ($todosTecnicos as $tecnico) : ?>
                                            <option value="<?= $tecnico['staffid'] ?>" <?= (isset($_POST['staffid']) && $_POST['staffid'] == $tecnico['staffid']) ? 'selected' : '' ?>>
                                                <?= $tecnico['firstname'] . ' ' . $tecnico['lastname'] ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>

                                <div class="col-2 col-form-label-sm">
                                    <label class="my-0">Data Início:</label>
                                    <input id="data_inicio" class="form-control form-control-sm" type="date" name="data_inicio" value="<?= isset($_POST['data_inicio']) && $_POST['data_inicio'] != '' ? $_POST['data_inicio'] : date('Y-m-d') ?>">
                                </div>

                                <div class="col-2 col-form-label-sm">
                                    <label class="my-0">Data Fim:</label>
                                    <input id="data_fim" class="form-control form-control-sm" type="date" name="data_fim" value="<?= isset($_POST['data_fim']) && $_POST['data_fim'] != '' ? $_POST['data_fim'] : date('Y-m-d') ?>">
                                </div>

                                <button type="submit" name="filtrar" class="btn btn-sm btn-info my-1 mr-3 ml-3 mt-4">Filtrar</button>
                                <button type="button" class="btn btn-sm btn-outline-info my-1 mt-4" onclick="limparFiltros()">Limpar</button>

                                <div class="col-auto pt-3 mt-1">
                                    <button class="btn btn-sm btn-outline-info">Total de Artes: <?= $totalArtesFeitas ?></button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div class="card-body" style="overflow-y: auto; flex: 1 1 auto;">
                        <?php
                        if (empty($dados)) {
                            echo '<div class="mb-3 ml-5 pl-5">';
                            echo "<p>Nenhum demanda encontrada para o período informado.</p>";
                            echo '</div>';
                        } else {
                            foreach ($dados as $staffid => $dado) {
                                if ($dado['artes_feitas'] > 0) {
                                    $porcentagem = ($dado['artes_feitas'] / $totalArtesFeitas) * 100;
                                    $porcentagem = number_format($porcentagem, 2);
                                    $barra = '<div class="barra-container"><div class="barra" style="width: ' . $porcentagem . '%">' . $dado['artes_feitas'] . '</div></div>';

                                    echo '<div class="mb-3 ml-5 pl-5">';
                                    echo '  <div class="d-flex justify-content-between align-items-center">';
                                    echo '      <div class="nome-tecnico font-weight-bold">' . $dado['nome_tecnico'] . '</div>';
                                    echo '  </div>';
                                    echo '  <div class="d-flex align-items-left">';
                                    echo '  <div style="margin-right: 5px; flex: 1">' . $barra . '</div>';
                                    echo '  <div class="porcentagem" style="text-align:left;">' . $porcentagem . '%</div>';
                                    echo '  </div>';
                                    echo '</div>';
                                }
                            }
                        }
                        ?>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

    <script>
        function limparFiltros() {
            const inicio = document.getElementById('data_inicio');
            const fim = document.getElementById('data_fim');
            const dataAtual = new Date();
            const ano = dataAtual.getFullYear();
            const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
            const dia = String(dataAtual.getDate()).padStart(2, '0');
            const dataFormatada = `${ano}-${mes}-${dia}`;

            if (inicio) inicio.value = dataFormatada;
            if (fim) fim.value = dataFormatada;

            document.getElementById('formFiltro').submit();
        }
    </script>
</body>

</html>