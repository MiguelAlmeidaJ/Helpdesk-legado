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

// aprovacao interna 2
$sqlaprovacaoInterna = "
        SELECT
            t.id AS tarefa_id,
            t.rel_id AS empresa_id,
            cfv.value AS total_artes,
            c.company AS nome_empresa,
            ta.staffid,
            CONCAT(s.firstname, ' ', s.lastname) AS nome_tecnico,
            tg.tag_id,
            tg2.name AS nome_tag
        FROM tbltasks t
        LEFT JOIN tbltask_assigned ta ON ta.taskid = t.id
        LEFT JOIN tblclients c ON c.userid = t.rel_id
        LEFT JOIN tblstaff s ON s.staffid = ta.staffid
        LEFT JOIN tblcustomfieldsvalues cfv ON t.id = cfv.relid AND cfv.fieldid = 8
        LEFT JOIN tbltaggables tg ON tg.rel_id = t.id AND tg.rel_type = 'task' AND tg.tag_order = 1
        LEFT JOIN tbltags tg2 ON tg2.id = tg.tag_id
        WHERE t.status = 2
        GROUP BY t.id, ta.staffid
    ";

$stmt = $pdoMkt->prepare($sqlaprovacaoInterna);
$stmt->execute();
$aprovacaoInterna = $stmt->fetchAll(PDO::FETCH_ASSOC);

// aprovacao cliente 53
$sqlAprovacaoCliente = "
SELECT
    t.id AS tarefa_id,
    t.rel_id AS empresa_id,
    cfv.value AS total_artes,
    c.company AS nome_empresa,
    ta.staffid,
    CONCAT(s.firstname, ' ', s.lastname) AS nome_tecnico,
    tg.tag_id,
    tg2.name AS nome_tag
FROM tbltasks t
LEFT JOIN tbltask_assigned ta ON ta.taskid = t.id
LEFT JOIN tblclients c ON c.userid = t.rel_id
LEFT JOIN tblstaff s ON s.staffid = ta.staffid
LEFT JOIN tbltaggables tg ON tg.rel_id = t.id AND tg.rel_type = 'task' AND tg.tag_order = 1
LEFT JOIN tblcustomfieldsvalues cfv ON t.id = cfv.relid AND cfv.fieldid = 8
LEFT JOIN tbltags tg2 ON tg2.id = tg.tag_id
WHERE t.status = 53
GROUP BY t.id, ta.staffid
";

$stmt = $pdoMkt->prepare($sqlAprovacaoCliente);
$stmt->execute();
$aprovacaoCliente = $stmt->fetchAll(PDO::FETCH_ASSOC);

//em_progresso 4
$sqlEm_progresso = "
SELECT
    t.id AS tarefa_id,
    t.rel_id AS empresa_id,
    cfv.value AS total_artes,
    c.company AS nome_empresa,
    ta.staffid,
    CONCAT(s.firstname, ' ', s.lastname) AS nome_tecnico,
    tg.tag_id,
    tg2.name AS nome_tag
FROM tbltasks t
LEFT JOIN tbltask_assigned ta ON ta.taskid = t.id
LEFT JOIN tblclients c ON c.userid = t.rel_id
LEFT JOIN tblstaff s ON s.staffid = ta.staffid
LEFT JOIN tbltaggables tg ON tg.rel_id = t.id AND tg.rel_type = 'task' AND tg.tag_order = 1
LEFT JOIN tblcustomfieldsvalues cfv ON t.id = cfv.relid AND cfv.fieldid = 8
LEFT JOIN tbltags tg2 ON tg2.id = tg.tag_id
WHERE t.status = 4
GROUP BY t.id, ta.staffid
";

$stmt = $pdoMkt->prepare($sqlEm_progresso);
$stmt->execute();
$emProgresso = $stmt->fetchAll(PDO::FETCH_ASSOC);

//standby 54
$sqlStandby = "
SELECT
    t.id AS tarefa_id,
    t.rel_id AS empresa_id,
    cfv.value AS total_artes,
    c.company AS nome_empresa,
    ta.staffid,
    CONCAT(s.firstname, ' ', s.lastname) AS nome_tecnico,
    tg.tag_id,
    tg2.name AS nome_tag
FROM tbltasks t
LEFT JOIN tbltask_assigned ta ON ta.taskid = t.id
LEFT JOIN tblclients c ON c.userid = t.rel_id
LEFT JOIN tblstaff s ON s.staffid = ta.staffid
LEFT JOIN tbltaggables tg ON tg.rel_id = t.id AND tg.rel_type = 'task' AND tg.tag_order = 1
LEFT JOIN tblcustomfieldsvalues cfv ON t.id = cfv.relid AND cfv.fieldid = 8
LEFT JOIN tbltags tg2 ON tg2.id = tg.tag_id
WHERE t.status = 54
GROUP BY t.id, ta.staffid
";

$stmt = $pdoMkt->prepare($sqlStandby);
$stmt->execute();
$standby = $stmt->fetchAll(PDO::FETCH_ASSOC);

//não iniciado 1
$sqlNaoIniciado = "
SELECT
    t.id AS tarefa_id,
    t.rel_id AS empresa_id,
    cfv.value AS total_artes,
    c.company AS nome_empresa,
    ta.staffid,
    CONCAT(s.firstname, ' ', s.lastname) AS nome_tecnico,
    tg.tag_id,
    tg2.name AS nome_tag
FROM tbltasks t
LEFT JOIN tbltask_assigned ta ON ta.taskid = t.id
LEFT JOIN tblclients c ON c.userid = t.rel_id
LEFT JOIN tblstaff s ON s.staffid = ta.staffid
LEFT JOIN tbltaggables tg ON tg.rel_id = t.id AND tg.rel_type = 'task' AND tg.tag_order = 1
LEFT JOIN tblcustomfieldsvalues cfv ON t.id = cfv.relid AND cfv.fieldid = 8
LEFT JOIN tbltags tg2 ON tg2.id = tg.tag_id
WHERE t.status = 1
GROUP BY t.id, ta.staffid
";

$stmt = $pdoMkt->prepare($sqlNaoIniciado);
$stmt->execute();
$naoIniciados = $stmt->fetchAll(PDO::FETCH_ASSOC);

//Completa hoje
$sqlFinalizadas = "
SELECT
    t.id AS tarefa_id,
    t.rel_id AS empresa_id,
    c.company AS nome_empresa,
    cfv.value AS total_artes,
    ta.staffid,
    CONCAT(s.firstname, ' ', s.lastname) AS nome_tecnico,
    tg.tag_id,
    tg2.name AS nome_tag
FROM tbltasks t
LEFT JOIN tbltask_assigned ta ON ta.taskid = t.id
LEFT JOIN tblclients c ON c.userid = t.rel_id
LEFT JOIN tblstaff s ON s.staffid = ta.staffid
LEFT JOIN tbltaggables tg ON tg.rel_id = t.id AND tg.rel_type = 'task' AND tg.tag_order = 1
LEFT JOIN tblcustomfieldsvalues cfv ON t.id = cfv.relid AND cfv.fieldid = 8
LEFT JOIN tbltags tg2 ON tg2.id = tg.tag_id
WHERE t.status = 5 AND DATE(t.datefinished) = CURDATE()
GROUP BY t.id, ta.staffid
    ";

// $stmt = $pdoMkt->query($sqlFinalizadas);
// $stmt->execute();
// $finalizadas = $stmt->fetchAll(PDO::FETCH_ASSOC);
$stmt = $pdoMkt->prepare($sqlFinalizadas);
$stmt->execute();
$finalizadas = $stmt->fetchAll(PDO::FETCH_ASSOC);

//enviar time designer 50
$sqlEnviarTimeDesigner = "
SELECT
    t.id AS tarefa_id,
    t.rel_id AS empresa_id,
    c.company AS nome_empresa,
    cfv.value AS total_artes,
    MAX(ta.staffid) AS staffid,
    MAX(CONCAT(s.firstname, ' ', s.lastname)) AS nome_tecnico,
    tg.tag_id,
    tg2.name AS nome_tag
FROM tbltasks t
LEFT JOIN tbltask_assigned ta ON ta.taskid = t.id
LEFT JOIN tblclients c ON c.userid = t.rel_id
LEFT JOIN tblstaff s ON s.staffid = ta.staffid
LEFT JOIN tbltaggables tg ON tg.rel_id = t.id AND tg.rel_type = 'task' AND tg.tag_order = 1
LEFT JOIN tblcustomfieldsvalues cfv ON t.id = cfv.relid AND cfv.fieldid = 8
LEFT JOIN tbltags tg2 ON tg2.id = tg.tag_id
WHERE t.status = 50
GROUP BY t.id

";

$stmt = $pdoMkt->prepare($sqlEnviarTimeDesigner);
$stmt->execute();
$enviarTimeDesigner = $stmt->fetchAll(PDO::FETCH_ASSOC);




//uploads hoje
$sqlUploads = "
    SELECT
        COUNT(*) AS total_artes,
        COUNT(DISTINCT CASE WHEN cfv.fieldid = 8 THEN cfv.relid END) AS artes_feitas,
        u.rel_id AS tarefa_id,
        t.rel_id AS empresa_id,
        c.company AS nome_empresa,
        ta.staffid,
        CONCAT(s.firstname, ' ', s.lastname) AS nome_tecnico,
        tg.tag_id,
        tg2.name AS nome_tag
    FROM tblfiles u
    LEFT JOIN tbltasks t ON t.id = u.rel_id
    LEFT JOIN tbltask_assigned ta ON ta.taskid = t.id
    LEFT JOIN tblclients c ON c.userid = t.rel_id
    LEFT JOIN tblstaff s ON s.staffid = ta.staffid
    LEFT JOIN tbltaggables tg ON tg.rel_id = t.id AND tg.rel_type = 'task' AND tg.tag_order = 1
    LEFT JOIN tbltags tg2 ON tg2.id = tg.tag_id
    LEFT JOIN tblcustomfieldsvalues cfv ON cfv.relid = u.rel_id AND cfv.fieldid = 8
    WHERE DATE(u.dateadded) = CURDATE()
    GROUP BY u.rel_id, ta.staffid
";


$stmt = $pdoMkt->query($sqlUploads);
$stmt->execute();
$uploadsHoje = $stmt->fetchAll(PDO::FETCH_ASSOC);

//tecnicos livre
$sqlTecnicosLivres = "
        SELECT
            s.staffid,
            CONCAT(s.firstname, ' ', s.lastname) AS nome_tecnico
        FROM tblstaff s
        WHERE s.active = 1 AND s.role = 2 AND s.staffid NOT IN (
            SELECT ta.staffid
            FROM tbltask_assigned ta
            INNER JOIN tbltasks t ON t.id = ta.taskid
            WHERE t.status = 4
        )
    ";

$stmt = $pdoMkt->query($sqlTecnicosLivres);
$stmt->execute();
$tecnicosLivres = $stmt->fetchAll(PDO::FETCH_ASSOC);

//FILTROS POR PERIODIS
// Semana atual (segunda a domingo)
$inicioSemanaAtual = date('Y-m-d', strtotime('monday this week'));
$fimSemanaAtual    = date('Y-m-d', strtotime('sunday this week'));

// Semana passada (segunda a domingo)
$inicioSemanaPassada = date('Y-m-d', strtotime('monday last week'));
$fimSemanaPassada    = date('Y-m-d', strtotime('sunday last week'));

// Soma semana atual + passada
$inicioDuasSemanas = $inicioSemanaPassada;
$fimDuasSemanas    = $fimSemanaAtual;

// Màs atual
$inicioMesAtual = date('Y-m-01');
$fimMesAtual    = date('Y-m-t');

// Màs passado
$inicioMesPassado = date('Y-m-01', strtotime('first day of last month'));
$fimMesPassado    = date('Y-m-t', strtotime('last day of last month'));

// Consulta SQL para contar o total de uploads por período (semana atual e semana passada)
$sqlUploadsPeriodo = "
SELECT
    t.id AS tarefa_id,
    t.rel_id AS empresa_id,
    c.company AS nome_empresa,
    COALESCE(ta.staffid, f.staffid) AS staffid,
    COALESCE(
        CONCAT(s.firstname, ' ', s.lastname),
        (SELECT CONCAT(s2.firstname, ' ', s2.lastname) FROM tblstaff s2 WHERE s2.staffid = f.staffid)
    ) AS nome_tecnico,
    tg.tag_id,
    tg2.name AS nome_tag,
    COUNT(DISTINCT f.rel_id) AS total_interacoes,
    COUNT(CASE WHEN cfv.fieldid = 8 THEN cfv.relid END) AS artes_feitas,
    GROUP_CONCAT(DISTINCT CASE WHEN cfv.fieldid = 8 THEN cfv.relid END) AS tarefas_feitas
FROM tblfiles f
LEFT JOIN tbltasks t ON t.id = f.rel_id
LEFT JOIN tbltask_assigned ta ON ta.taskid = t.id
LEFT JOIN tblclients c ON c.userid = t.rel_id
LEFT JOIN tblstaff s ON s.staffid = ta.staffid
LEFT JOIN tbltaggables tg ON tg.rel_id = t.id AND tg.rel_type = 'task' AND tg.tag_order = 1
LEFT JOIN tbltags tg2 ON tg2.id = tg.tag_id
LEFT JOIN tblcustomfieldsvalues cfv ON f.rel_id = cfv.relid AND cfv.fieldid = 8
WHERE DATE(f.dateadded) BETWEEN :dataInicio AND :dataFim
AND cfv.fieldid = 8
GROUP BY t.id, COALESCE(ta.staffid, f.staffid)
ORDER BY artes_feitas DESC;
";

// Preparando o array para os dados dos uploads por período
$dadosUploadsSemanaAtual = [];
$dadosUploadsSemanaPassada = [];
$dadosUploadsDuasSemanas = [];
$dadosUploadsMesAtual = [];
$dadosUploadsMesPassado = [];

// Buscar uploads para a semana atual
$stmt = $pdoMkt->prepare($sqlUploadsPeriodo);
$stmt->bindParam(':dataInicio', $inicioSemanaAtual);
$stmt->bindParam(':dataFim', $fimSemanaAtual);
$stmt->execute();
$uploadsSemanaAtual = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Buscar uploads para a semana passada
$stmt = $pdoMkt->prepare($sqlUploadsPeriodo);
$stmt->bindParam(':dataInicio', $inicioSemanaPassada);
$stmt->bindParam(':dataFim', $fimSemanaPassada);
$stmt->execute();
$uploadsSemanaPassada = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Buscar uploads soma semana atual e passada
$stmt = $pdoMkt->prepare($sqlUploadsPeriodo);
$stmt->bindParam(':dataInicio', $inicioSemanaPassada);
$stmt->bindParam(':dataFim', $fimSemanaAtual);
$stmt->execute();
$uploadsDuasSemanas = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Buscar uploads para o mês atual
$stmt = $pdoMkt->prepare($sqlUploadsPeriodo);
$stmt->bindParam(':dataInicio', $inicioMesAtual);
$stmt->bindParam(':dataFim', $fimMesAtual);
$stmt->execute();
$uploadsMesAtual = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Buscar uploads para o mês passado
$stmt = $pdoMkt->prepare($sqlUploadsPeriodo);
$stmt->bindParam(':dataInicio', $inicioMesPassado);
$stmt->bindParam(':dataFim', $fimMesPassado);
$stmt->execute();
$uploadsMesPassado = $stmt->fetchAll(PDO::FETCH_ASSOC);

//////////////////// UPLOADS SEMANA ATUAL  //////////////////////
$agrupadouploadsSemanaAtual = [];

foreach ($uploadsSemanaAtual as $item) {
    $staffid = $item['staffid'];

    // Inicializa o técnico caso não tenha sido adicionado ainda
    if (!isset($agrupadouploadsSemanaAtual[$staffid])) {
        $agrupadouploadsSemanaAtual[$staffid] = [
            'staffid' => $staffid,
            'nome_tecnico' => $item['nome_tecnico'],
            'artes_feitas' => 0,
            'tarefas' => [],
        ];
    }

    // Acumula o número de artes feitas
    $agrupadouploadsSemanaAtual[$staffid]['artes_feitas'] += (int)$item['artes_feitas'];

    // Adiciona as tarefas feitas ao array de tarefas, sem duplicação
    if (!empty($item['tarefas_feitas'])) {
        $tarefas = explode(',', $item['tarefas_feitas']);
        $agrupadouploadsSemanaAtual[$staffid]['tarefas'] = array_unique(array_merge(
            $agrupadouploadsSemanaAtual[$staffid]['tarefas'],
            $tarefas
        ));
    }
}

// Criação do array final com as tarefas formatadas
$dadosuploadsSemanaAtual = array_map(function ($dados) {
    $dados['tooltip'] = implode(', ', $dados['tarefas']);
    unset($dados['tarefas']); // Opcional
    return $dados;
}, $agrupadouploadsSemanaAtual);

// Ordenação por artes_feitas em ordem decrescente
usort($dadosuploadsSemanaAtual, function ($a, $b) {
    return $b['artes_feitas'] <=> $a['artes_feitas'];
});

//////////////////// UPLOADS SEMANA PASSADA  //////////////////////
$agrupadouploadsSemanaPassada = [];

foreach ($uploadsSemanaPassada as $item) {
    $staffid = $item['staffid'];

    // Inicializa o técnico caso não tenha sido adicionado ainda
    if (!isset($agrupadouploadsSemanaPassada[$staffid])) {
        $agrupadouploadsSemanaPassada[$staffid] = [
            'staffid' => $staffid,
            'nome_tecnico' => $item['nome_tecnico'],
            'artes_feitas' => 0,
            'tarefas' => [],
        ];
    }

    // Acumula o número de artes feitas
    $agrupadouploadsSemanaPassada[$staffid]['artes_feitas'] += (int)$item['artes_feitas'];

    // Adiciona as tarefas feitas ao array de tarefas, sem duplicação
    if (!empty($item['tarefas_feitas'])) {
        $tarefas = explode(',', $item['tarefas_feitas']);
        $agrupadouploadsSemanaPassada[$staffid]['tarefas'] = array_unique(array_merge(
            $agrupadouploadsSemanaPassada[$staffid]['tarefas'],
            $tarefas
        ));
    }
}

// Criação do array final com as tarefas formatadas
$dadosuploadsSemanaPassada = array_map(function ($dados) {
    $dados['tooltip'] = implode(', ', $dados['tarefas']);
    unset($dados['tarefas']); // Opcional
    return $dados;
}, $agrupadouploadsSemanaPassada);

// Ordenação por artes_feitas em ordem decrescente
usort($dadosuploadsSemanaPassada, function ($a, $b) {
    return $b['artes_feitas'] <=> $a['artes_feitas'];
});


//////////////////// UPLOADS DUAS SEMANAS  //////////////////////
$agrupadouploadsDuasSemanas = [];

foreach ($uploadsDuasSemanas as $item) {
    $staffid = $item['staffid'];

    // Inicializa o técnico caso não tenha sido adicionado ainda
    if (!isset($agrupadouploadsDuasSemanas[$staffid])) {
        $agrupadouploadsDuasSemanas[$staffid] = [
            'staffid' => $staffid,
            'nome_tecnico' => $item['nome_tecnico'],
            'artes_feitas' => 0,
            'tarefas' => [],
        ];
    }

    // Acumula o número de artes feitas
    $agrupadouploadsDuasSemanas[$staffid]['artes_feitas'] += (int)$item['artes_feitas'];

    // Adiciona as tarefas feitas ao array de tarefas, sem duplicação
    if (!empty($item['tarefas_feitas'])) {
        $tarefas = explode(',', $item['tarefas_feitas']);
        $agrupadouploadsDuasSemanas[$staffid]['tarefas'] = array_unique(array_merge(
            $agrupadouploadsDuasSemanas[$staffid]['tarefas'],
            $tarefas
        ));
    }
}

// Criação do array final com as tarefas formatadas
$dadosuploadsDuasSemanas = array_map(function ($dados) {
    $dados['tooltip'] = implode(', ', $dados['tarefas']);
    unset($dados['tarefas']); // Opcional
    return $dados;
}, $agrupadouploadsDuasSemanas);

// Ordenação por artes_feitas em ordem decrescente
usort($dadosuploadsDuasSemanas, function ($a, $b) {
    return $b['artes_feitas'] <=> $a['artes_feitas'];
});


//////////////////// UPLOADS MES ATUAL  //////////////////////
$agrupadouploadsMesAtual = [];

foreach ($uploadsMesAtual as $item) {
    $staffid = $item['staffid'];

    // Inicializa o técnico caso não tenha sido adicionado ainda
    if (!isset($agrupadouploadsMesAtual[$staffid])) {
        $agrupadouploadsMesAtual[$staffid] = [
            'staffid' => $staffid,
            'nome_tecnico' => $item['nome_tecnico'],
            'artes_feitas' => 0,
            'tarefas' => [],
        ];
    }

    // Acumula o número de artes feitas
    $agrupadouploadsMesAtual[$staffid]['artes_feitas'] += (int)$item['artes_feitas'];

    // Adiciona as tarefas feitas ao array de tarefas, sem duplicação
    if (!empty($item['tarefas_feitas'])) {
        $tarefas = explode(',', $item['tarefas_feitas']);
        $agrupadouploadsMesAtual[$staffid]['tarefas'] = array_unique(array_merge(
            $agrupadouploadsMesAtual[$staffid]['tarefas'],
            $tarefas
        ));
    }
}

// Criação do array final com as tarefas formatadas
$dadosuploadsMesAtual = array_map(function ($dados) {
    $dados['tooltip'] = implode(', ', $dados['tarefas']);
    unset($dados['tarefas']); // Opcional
    return $dados;
}, $agrupadouploadsMesAtual);

// Ordenação por artes_feitas em ordem decrescente
usort($dadosuploadsMesAtual, function ($a, $b) {
    return $b['artes_feitas'] <=> $a['artes_feitas'];
});


//////////////////// UPLOADS MES PASSADO  //////////////////////
$agrupadouploadsMesPassado = [];

foreach ($uploadsMesPassado as $item) {
    $staffid = $item['staffid'];

    // Inicializa o técnico caso não tenha sido adicionado ainda
    if (!isset($agrupadouploadsMesPassado[$staffid])) {
        $agrupadouploadsMesPassado[$staffid] = [
            'staffid' => $staffid,
            'nome_tecnico' => $item['nome_tecnico'],
            'artes_feitas' => 0,
            'tarefas' => [],
        ];
    }

    // Acumula o número de artes feitas
    $agrupadouploadsMesPassado[$staffid]['artes_feitas'] += (int)$item['artes_feitas'];

    // Adiciona as tarefas feitas ao array de tarefas, sem duplicação
    if (!empty($item['tarefas_feitas'])) {
        $tarefas = explode(',', $item['tarefas_feitas']);
        $agrupadouploadsMesPassado[$staffid]['tarefas'] = array_unique(array_merge(
            $agrupadouploadsMesPassado[$staffid]['tarefas'],
            $tarefas
        ));
    }
}

// Criação do array final com as tarefas formatadas
$dadosuploadsMesPassado = array_map(function ($dados) {
    $dados['tooltip'] = implode(', ', $dados['tarefas']);
    unset($dados['tarefas']); // Opcional
    return $dados;
}, $agrupadouploadsMesPassado);

// Ordenação por artes_feitas em ordem decrescente
usort($dadosuploadsMesPassado, function ($a, $b) {
    return $b['artes_feitas'] <=> $a['artes_feitas'];
});


foreach ($uploadsDuasSemanas as $item) {
    $dadosUploadsDuasSemanas[] = [
        'nome_tecnico' => $item['nome_tecnico'],
        'total_artes' => $item['tarefas_feitas'],
        'artes_feitas' => $item['artes_feitas'],
        'nome_empresa' => $item['nome_empresa'],
    ];
}

foreach ($uploadsMesAtual as $item) {
    $dadosUploadsMesAtual[] = [
        'nome_tecnico' => $item['nome_tecnico'],
        'total_artes' => $item['tarefas_feitas'],
        'artes_feitas' => $item['artes_feitas'],
        'nome_empresa' => $item['nome_empresa'],
    ];
}

foreach ($uploadsMesPassado as $item) {
    $dadosUploadsMesPassado[] = [
        'nome_tecnico' => $item['nome_tecnico'],
        'total_artes' => $item['tarefas_feitas'],
        'artes_feitas' => $item['artes_feitas'],
        'nome_empresa' => $item['nome_empresa'],
    ];
}

// Organizando os dados para enviar ao front-end
$dadosTecnicos = [
    'aprovacaoInterna' => $aprovacaoInterna,
    'aprovacaoCliente' => $aprovacaoCliente,
    'emProgresso' => $emProgresso,
    'standby' => $standby,
    'enviarTimeDesigner' => $enviarTimeDesigner,
    'naoIniciados' => $naoIniciados,
    'finalizadas' => $finalizadas,
    'uploadsHoje' => $uploadsHoje,
    'tecnicosLivres' => $tecnicosLivres,
    'uploadsSemanaAtual' => $dadosUploadsSemanaAtual,
    'uploadsSemanaPassada' => $dadosUploadsSemanaPassada,
    'uploadsDuasSemanas' => $uploadsDuasSemanas,
    'uploadsMesAtual' => $uploadsMesAtual,
    'uploadsMesPassado' => $uploadsMesPassado
];


//nao iniciados agrupados
$naoIniciadosAgrupados = [];
foreach ($naoIniciados as $item) {
    $cliente = $item['nome_empresa'];

    if (!isset($naoIniciadosAgrupados[$cliente])) {
        $clientesAgrupados[$cliente] = [];
    }

    $naoIniciadosAgrupados[$cliente][] = [
        'tarefa_id' => $item['tarefa_id'],
        'user_nome' => $item['nome_tecnico'],
        'nome_tag'  => $item['nome_tag'] ?? 'Sem tag',
        'total_artes' => $item['total_artes']
    ];
}


//finalizados agrupados
$finalizadosAgrupados = [];
foreach ($finalizadas as $item) {
    $cliente = $item['nome_empresa'];

    if (!isset($finalizadosAgrupados[$cliente])) {
        $clientesAgrupados[$cliente] = [];
    }

    $finalizadosAgrupados[$cliente][] = [
        'tarefa_id' => $item['tarefa_id'],
        'user_nome' => $item['nome_tecnico'],
        'nome_tag'  => $item['nome_tag'] ?? 'Sem tag',
        'total_artes' => $item['total_artes']
    ];
}

//uploads agrupados
$uploadsAgrupados = [];
foreach ($uploadsHoje as $item) {
    $tecnicoId = $item['staffid'];
    if (!isset($uploadsAgrupados[$tecnicoId])) {
        $uploadsAgrupados[$tecnicoId] = [
            'user_nome' => $item['nome_tecnico'],
            'total_artes' => $item['total_artes'],
            'id' => []
        ];
    }
    $uploadsAgrupados[$tecnicoId]['id'][] = $item;
}

// standby agrupados
$standbyAgrupados = [];
foreach ($standby as $item) {
    $tecnicoId = $item['staffid'];
    if (!isset($standbyAgrupados[$tecnicoId])) {
        $standbyAgrupados[$tecnicoId] = [
            'user_nome' => $item['nome_tecnico'],
            'total_artes' => $item['total_artes'],
            'id' => []
        ];
    }
    $standbyAgrupados[$tecnicoId]['id'][] = $item;
}

//ocupados agrupados
$ocupadosAgrupados = [];
foreach ($emProgresso as $item) {
    $tecnicoId = $item['staffid'];
    if (!isset($ocupadosAgrupados[$tecnicoId])) {
        $ocupadosAgrupados[$tecnicoId] = [
            'user_nome' => $item['nome_tecnico'],
            'total_artes' => $item['total_artes'],
            'id' => []
        ];
    }
    $ocupadosAgrupados[$tecnicoId]['id'][] = $item;
}


//tecnicos livres
$tecnicosLivresAgrupados = [];
foreach ($tecnicosLivres as $item) {
    $tecnicoId = $item['staffid'];
    if (!isset($tecnicosLivresAgrupados[$tecnicoId])) {
        $tecnicosLivresAgrupados[$tecnicoId] = [
            'user_nome' => $item['nome_tecnico'],
            'id' => []
        ];
    }
    $tecnicosLivresAgrupados[$tecnicoId]['id'][] = $item;
}

//aprovacao interna agrupados
$enviarTimeDesignerAgrupados = [];
foreach ($enviarTimeDesigner as $item) {
    $cliente = $item['nome_empresa'];

    if (!isset($enviarTimeDesignerAgrupados[$cliente])) {
        $clientesAgrupados[$cliente] = [];
    }

    $enviarTimeDesignerAgrupados[$cliente][] = [
        'tarefa_id' => $item['tarefa_id'],
        'user_nome' => $item['nome_tecnico'],
        'nome_tag'  => $item['nome_tag'] ?? 'Sem tag',
        'total_artes' => $item['total_artes']
    ];
}



//aprovacao interna agrupados
$aprovacaoInternaAgrupados = [];
foreach ($aprovacaoInterna as $item) {
    $cliente = $item['nome_empresa'];

    if (!isset($aprovacaoInternaAgrupados[$cliente])) {
        $clientesAgrupados[$cliente] = [];
    }

    $aprovacaoInternaAgrupados[$cliente][] = [
        'tarefa_id' => $item['tarefa_id'],
        'user_nome' => $item['nome_tecnico'],
        'nome_tag'  => $item['nome_tag'] ?? 'Sem tag',
        'total_artes' => $item['total_artes']
    ];
}


//aprovacao cliente agrupados
$aprovacaoClienteAgrupados = [];
foreach ($aprovacaoCliente as $item) {
    $cliente = $item['nome_empresa'];

    if (!isset($aprovacaoClienteAgrupados[$cliente])) {
        $clientesAgrupados[$cliente] = [];
    }

    $aprovacaoClienteAgrupados[$cliente][] = [
        'tarefa_id' => $item['tarefa_id'],
        'user_nome' => $item['nome_tecnico'],
        'nome_tag'  => $item['nome_tag'] ?? 'Sem tag',
        'total_artes' => $item['total_artes']
    ];
}


// Cria o array para armazenar as contagens
$contagem = [];

foreach ($dadosTecnicos as $campo => $valores) {
    $contagem[$campo] = count($valores);
}

// echo json_encode(count($dadosTecnicos['uploadsHoje']));

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
            zoom: 0.9;
            width: 100%;
            overflow-x: hidden;
        }



        .tooltip.custom-tooltip {
            background-color: #f8f9fa !important;
            /* Fundo claro */
            color: #212529 !important;
            /* Texto escuro */
            border: 1px solid #ccc !important;
            font-size: 14px !important;
            box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.15) !important;
            padding: 8px;
            /* Espaço interno */
            border-radius: 5px;
            /* Bordas arredondadas */
        }

        .tooltip.bs-tooltip-top .arrow::before {
            border-top-color: #f8f9fa !important;
            /* Ajusta a seta superior */
        }

        .tooltip.bs-tooltip-bottom .arrow::before {
            border-bottom-color: #f8f9fa !important;
            /* Ajusta a seta inferior */
        }


        .container {
            /* margin: 10px; */
            /* margin-left: 10px; */
            align-items: flex-start;
        }

        .atd-list {
            font-size: 13px;
        }


        .tecnico-list {
            border: 1px solid #ccc;
            padding: 10px;
            font-size: 13px;
        }

        .tecnico-list h5 {
            font-size: 1em;
            margin-top: 0;
        }

        .tecnico-item {
            margin: 2px 0;
            padding: 2px 0;
            border-bottom: 1px solid #ccc;
        }

        .tecnico-item:last-child {
            border-bottom: none;
        }

        .tecnico-item span {
            font-weight: bold;
            margin-right: 2px;
        }

        .tecnico-livre {
            color: green;
        }

        .tecnico-ocupado {
            color: red;
        }

        /* .ids-list {
            display: flex;
            flex-wrap: wrap;
            padding-left: 10px;
        } */

        .id-item {
            margin-right: 10px;
        }

        .card-body {
            padding: 10px;
            /*cor de fundo */
            background-color: #EEEEEE;
        }

        .card-body-int {
            padding: 10px;
        }

        .card {
            margin-top: 5px;
            border: 1px solid #ccc;
            border-radius: 5px;
            background-color: white;

        }

        .card {
            font-family: "Helvetica Neue", Arial, sans-serif !important;
        }

        .card-secondary {
            margin-top: 10px;
            margin-right: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            box-shadow: 0px 6px 30px rgba(0, 0, 0, 0.7);
            background-color: white;
        }


        .card-header {
            background-color: #f8f9fa;
            padding: 10px;
            font-size: 1.25em;
            border-bottom: 1px solid #ccc;
            height: 45px;
        }






        .btn-group {
            position: relative;
            /* Define o grupo de botões como referência */
        }

        .btn {
            position: relative;
            color: white;
            border: none;
            border-radius: 5px;
            text-decoration: none;
            display: inline-block;
            cursor: pointer;
            transition: background-color 0.3s;
            font-size: 14px;
            margin-right: 50px;
        }

        .btn:hover {
            background-color: #b3b3b3;
        }
    </style>

</head>

<body style="margin: 0; overflow: hidden;">
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid" style="height: 100vh; width: 100%;">
        <div class="card-main" style="padding: 0; height: 100%; width: 100%;">
            <div class="card" style="height: 100%; overflow: hidden;">
                <div class="card-header py-1" style="position: sticky; top: 0; z-index: 10; background-color: white;">
                    <i class="fas fa-users"></i> Disponibilidade Técnica MKT
                </div>
                <div class="card-body pt-0 pb-10" style="height: 100%; width: 100%; overflow: auto; ">
                    <div class="d-flex flex-nowrap gap-2" style="overflow-x: auto; width: 100%; height: 100%;">
                        <div class="d-flex flex-nowrap gap-3" style="height: 100%;">

                            <!-- card LIVRES -->
                            <div style="width: 300px; flex-shrink: 0;">
                                <div class="card-secondary">
                                    <div class="card-header ">
                                        <i class="fas fa-thumbs-up" style="padding-right: 7px;"></i>
                                        Tecnicos Livres: <?= count($dadosTecnicos['tecnicosLivres']) ?>
                                    </div>
                                    <div class="card-body-int atd-list" style="overflow: auto;">
                                        <div style="color:black;">
                                            <?php
                                            if (!empty($dadosTecnicos['tecnicosLivres'])) {
                                                $livres = [];
                                                foreach ($dadosTecnicos['tecnicosLivres'] as $item) {
                                                    $livres[] = $item['nome_tecnico'];
                                                }
                                                $livres = array_unique($livres);

                                                foreach ($livres as $tecnico) {
                                                    echo '<li class="tecnico-item tecnico-livre" style="margin-left: 1px; padding-left: 0px;color:green;"><span>' . $tecnico . '</span></li>';
                                                }
                                            } else {
                                                echo '<li class="tecnico-item tecnico-livre" style="margin-left: 1px; padding-left: 0px;color:green;">Nenhum Tecnico Livre</li>';
                                            }
                                            ?>
                                        </div>
                                    </div>
                                </div>

                                <!--Card Standby-->
                                <div class="card-secondary mt-3" style="min-height: 125px;">
                                    <div class="card-header">
                                        <i class="fas fa-pause-circle" style="padding-right: 7px; color: red;"></i> Em Standby: <?= count($standby) ?>
                                    </div>
                                    <div class="card-body-int atd-list text-black">
                                        <?php foreach ($standby as $tarefa) : ?>
                                            <?php
                                            $tarefaId = $tarefa['tarefa_id'];
                                            $tooltip = htmlspecialchars("{$tarefa['nome_empresa']}<br>Tag: {$tarefa['nome_tag']}<br>Artes: {$tarefa['total_artes']}");
                                            ?>
                                            <form action="mkt_atd.php" method="POST" style="display:inline;" id="form-atendimento-standby<?= $tarefaId ?>">
                                                <input type="hidden" name="mkt_atd" value="<?= $tarefaId ?>">
                                                <a href="#" onclick="document.getElementById('form-atendimento-standby<?= $tarefaId ?>').submit();" class="tecnico-item tecnico-standby" data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?= $tooltip ?>" style="color:black;">
                                                    <?= $tarefaId ?>
                                                </a>
                                            </form>
                                        <?php endforeach; ?>
                                    </div>
                                </div>

                                <!--Card uploads hoje-->
                                <div class="card-secondary mt-3" style="min-height: 125px;">
                                    <div class="card-header">
                                        <i class="fas fa-upload" style="padding-right: 7px; color: blue;"></i> Uploads hoje: <?= count($uploadsHoje) ?>
                                    </div>
                                    <div class="card-body-int atd-list text-black">
                                        <div style="color:black;">
                                            <?php foreach ($uploadsHoje as $tarefa) : ?>
                                                <?php
                                                $tarefaId = $tarefa['tarefa_id'];
                                                $nomeEmpresa = htmlspecialchars($tarefa['nome_empresa'] ?? 'Sem empresa');
                                                $nomeTag = htmlspecialchars($tarefa['nome_tag'] ?? 'Sem tag');
                                                $totalArtes = htmlspecialchars($tarefa['total_artes'] ?? '0');

                                                $tooltip = "$nomeEmpresa<br>Tag: $nomeTag<br>Artes: $totalArtes";
                                                ?>
                                                <form action="mkt_atd.php" method="POST" id="form-atendimento-uploads<?= $tarefaId ?>" style="display: inline;">
                                                    <input type="hidden" name="mkt_atd" value="<?= htmlspecialchars($tarefaId) ?>">
                                                    <a href="#" onclick="document.getElementById('form-atendimento-uploads<?= $tarefaId ?>').submit();" class="tecnico-item tecnico-standby" data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?= $tooltip ?>" style="margin-left: 1px; padding-left: 0px; color:black;">
                                                        <?= htmlspecialchars($tarefaId) ?>
                                                    </a>
                                                </form>

                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style="width: 300px; flex-shrink: 0;">

                                <!-- card OCUPADOS -->
                                <div style="width: 300px; flex-shrink: 0;">
                                    <div class="card-secondary" style="min-height: 250px;">
                                        <div class="card-header">
                                            <i class="fas fa-laptop-code me-2 " style="padding-right: 7px; color: red;"></i>
                                            Tecnicos Ocupados: <?= count($ocupadosAgrupados) ?>
                                        </div>
                                        <div class="card-body-int atd-list" style="overflow: auto; color:black;">
                                            <?php foreach ($ocupadosAgrupados as $tecnico) : ?>
                                                <div class="tecnico-item tecnico-ocupado">
                                                    <li style="margin-left: 1px; padding-left: 0px;">
                                                        <span style="font-weight: bold;">
                                                            <?= htmlspecialchars($tecnico['user_nome']) ?> (<?= count($tecnico['id']) ?>)
                                                        </span>
                                                        <div class="ids-list" style="color:black;">
                                                            <?php foreach ($tecnico['id'] as $tarefa) : ?>
                                                                <?php
                                                                $tarefaId = $tarefa['tarefa_id'];
                                                                $tooltip =  htmlspecialchars($tarefa['nome_empresa'])
                                                                    . "<br>" . ($tarefa['nome_tag'] ? htmlspecialchars($tarefa['nome_tag']) : "Sem tag")
                                                                    . "<br>Artes: " . $tarefa['total_artes'];
                                                                ?>
                                                                <form action="mkt_atd.php" method="POST" id="form-atendimento-ocupado<?= $tarefaId ?>" style="display: inline;">
                                                                    <input type="hidden" name="mkt_atd" value="<?= htmlspecialchars($tarefaId) ?>">
                                                                    <a href="#" onclick="document.getElementById('form-atendimento-ocupado<?= $tarefaId ?>').submit();" style="font-size: 1em; color: black; padding: 3px;" data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?= $tooltip ?>" class="custom-tooltip">
                                                                        <?= htmlspecialchars($tarefaId) ?>
                                                                    </a>
                                                                </form>
                                                            <?php endforeach; ?>
                                                        </div>
                                                    </li>
                                                </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>




                                <!-- FINALIZADOS -->
                                <div style="width: 300px; flex-shrink: 0;">
                                    <div class="card-secondary" style="min-height: 250px;">
                                        <div class="card-header">
                                            <i class="fas fa-check-circle" style="color:green;padding-right: 7px;"></i>
                                            Finalizadas: <?= count($dadosTecnicos['finalizadas']) ?>
                                        </div>
                                        <div class="card-body-int atd-list text-black">
                                            <div style="color:black;">
                                                <?php foreach ($finalizadosAgrupados as $clienteNome => $tarefas) : ?>
                                                    <div class="cliente-item">
                                                        <li style="margin-left: 1px; padding-left: 0px;">
                                                            <span style="font-weight: bold;">
                                                                <?= htmlspecialchars($clienteNome) ?>
                                                            </span>
                                                        </li>
                                                        <div class="ids-list" style="margin-left: 10px;">
                                                            <?php foreach ($tarefas as $tarefa) : ?>
                                                                <?php
                                                                $tarefaId = $tarefa['tarefa_id'];
                                                                $tooltip = htmlspecialchars($tarefa['user_nome'])
                                                                    . '<br>' . htmlspecialchars($tarefa['nome_tag'])
                                                                    . "<br> Artes: " . $tarefa['total_artes'];
                                                                ?>
                                                                <form action="mkt_atd.php" method="POST" id="form-atendimento-naoIniciados<?= $tarefaId ?>" style="display: inline;">
                                                                    <input type="hidden" name="mkt_atd" value="<?= htmlspecialchars($tarefaId) ?>">
                                                                    <a href="#" onclick="document.getElementById('form-atendimento-naoIniciados<?= $tarefaId ?>').submit();" style="font-size: 0.95em; color: black; padding: 2px; margin-right: 4px;" data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?= $tooltip ?>" class="custom-tooltip">
                                                                        <?= $tarefaId ?>
                                                                    </a>
                                                                </form>
                                                            <?php endforeach; ?>
                                                        </div>
                                                    </div>
                                                <?php endforeach; ?>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- CARD APROVAÇÃO INTERNA -->
                            <div style="width: 300px; flex-shrink: 0;">
                                <div class="card-secondary" style="min-height: 250px;">
                                    <div class="card-header">
                                        <i class="fas fa-user-clock me-2 text-primary"></i> Aprovação Interna: <?= count($dadosTecnicos['aprovacaoInterna']) ?>
                                    </div>
                                    <div class="card-body-int atd-list text-black">
                                        <?php foreach ($aprovacaoInternaAgrupados as $clienteNome => $tarefas) : ?>
                                            <div class="cliente-item">
                                                <li style="margin-left: 1px; padding-left: 0px;">
                                                    <span style="font-weight: bold;">
                                                        <?= htmlspecialchars($clienteNome) ?>
                                                        (<?= count($tarefas) ?>)
                                                    </span>

                                                </li>
                                                <div class="ids-list" style="margin-left: 10px;">
                                                    <?php foreach ($tarefas as $tarefa) : ?>
                                                        <?php
                                                        $tarefaId = $tarefa['tarefa_id'];
                                                        $tooltip = htmlspecialchars($tarefa['user_nome'])
                                                            . '<br>' . htmlspecialchars($tarefa['nome_tag'])
                                                            . "<br> Artes: " . $tarefa['total_artes'];
                                                        ?>
                                                        <form action="mkt_atd.php" method="POST" id="form-atendimento-aprovacaoInterna<?= $tarefaId ?>" style="display: inline;">
                                                            <input type="hidden" name="mkt_atd" value="<?= htmlspecialchars($tarefaId) ?>">
                                                            <a href="#" onclick="document.getElementById('form-atendimento-aprovacaoInterna<?= $tarefaId ?>').submit();" style="font-size: 0.95em; color: black; padding: 2px; margin-right: 4px;" data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?= $tooltip ?>" class="custom-tooltip">
                                                                <?= $tarefaId ?>
                                                            </a>
                                                        </form>
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>

                            <!-- CARD APROVAÇÃO CLIENTE -->
                            <div style="width: 300px; flex-shrink: 0;">
                                <div class="card-secondary" style="min-height: 250px;">
                                    <div class="card-header">
                                        <i class="fas fa-user-tie" style="padding-right: 7px;"></i>
                                        Aprovação Cliente: <?= count($dadosTecnicos['aprovacaoCliente']) ?>
                                    </div>
                                    <div class="card-body-int atd-list text-black">
                                        <div style="color:black;">
                                            <?php foreach ($aprovacaoClienteAgrupados as $clienteNome => $tarefas) : ?>
                                                <div class="cliente-item">
                                                    <li style="margin-left: 1px; padding-left: 0px;">
                                                        <span style="font-weight: bold;">
                                                            <?= htmlspecialchars($clienteNome) ?>
                                                            (<?= count($tarefas) ?>)
                                                        </span>
                                                    </li>
                                                    <div class="ids-list" style="margin-left: 10px;">
                                                        <?php foreach ($tarefas as $tarefa) : ?>
                                                            <?php
                                                            $tarefaId = $tarefa['tarefa_id'];
                                                            $tooltip = htmlspecialchars($tarefa['user_nome'])
                                                                . '<br>' . htmlspecialchars($tarefa['nome_tag'])
                                                                . "<br> Artes: " . $tarefa['total_artes'];
                                                            ?>
                                                            <form action="mkt_atd.php" method="POST" id="form-atendimento-aprovacaoCliente<?= $tarefaId ?>" style="display: inline;">
                                                                <input type="hidden" name="mkt_atd" value="<?= htmlspecialchars($tarefaId) ?>">
                                                                <a href="#" onclick="document.getElementById('form-atendimento-aprovacaoCliente<?= $tarefaId ?>').submit();" style="font-size: 0.95em; color: black; padding: 2px; margin-right: 4px;" data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?= $tooltip ?>" class="custom-tooltip">
                                                                    <?= $tarefaId ?>
                                                                </a>
                                                            </form>
                                                        <?php endforeach; ?>
                                                    </div>
                                                </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- CARD NAO INICIADOS -->
                            <div style="width: 300px; flex-shrink: 0;">
                                <div class="card-secondary" style="min-height: 250px;">
                                    <div class="card-header">
                                        <i class="fas fa-hourglass-start" style="padding-right: 7px;"></i>
                                        Não Iniciadas: <?= count($dadosTecnicos['naoIniciados']) ?>
                                    </div>
                                    <div class="card-body-int atd-list text-black">
                                        <div style="color:black;">
                                            <?php foreach ($naoIniciadosAgrupados as $clienteNome => $tarefas) : ?>
                                                <div class="cliente-item">
                                                    <li style="margin-left: 1px; padding-left: 0px;">
                                                        <span style="font-weight: bold;">
                                                            <?= htmlspecialchars($clienteNome) ?>
                                                        </span>
                                                    </li>
                                                    <div class="ids-list" style="margin-left: 10px;">
                                                        <?php foreach ($tarefas as $tarefa) : ?>
                                                            <?php
                                                            $tarefaId = $tarefa['tarefa_id'];
                                                            $tooltip = htmlspecialchars($tarefa['user_nome'])
                                                                . '<br>' . htmlspecialchars($tarefa['nome_tag'])
                                                                . "<br> Artes: " . $tarefa['total_artes'];
                                                            ?>
                                                            <form action="mkt_atd.php" method="POST" id="form-atendimento-naoIniciados<?= $tarefaId ?>" style="display: inline;">
                                                                <input type="hidden" name="mkt_atd" value="<?= htmlspecialchars($tarefaId) ?>">
                                                                <a href="#" onclick="document.getElementById('form-atendimento-naoIniciados<?= $tarefaId ?>').submit();" style="font-size: 0.95em; color: black; padding: 2px; margin-right: 4px;" data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?= $tooltip ?>" class="custom-tooltip">
                                                                    <?= $tarefaId ?>
                                                                </a>
                                                            </form>
                                                        <?php endforeach; ?>
                                                    </div>
                                                </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>
                            </div>



                            <!--Card Enviar Time Designer -->
                            <div style="width: 300px; flex-shrink: 0;">
                                <div class="card-secondary" style="min-height: 250px;">
                                    <div class="card-header">
                                        <i class="fas fa-paper-plane me-2 text-success"></i> Enviar Time Designer: <?= count($dadosTecnicos['enviarTimeDesigner']) ?>
                                    </div>
                                    <div class="card-body-int atd-list text-black">
                                        <?php foreach ($enviarTimeDesignerAgrupados as $clienteNome => $tarefas) : ?>
                                            <div class="cliente-item">
                                                <li style="margin-left: 1px; padding-left: 0px;">
                                                    <span style="font-weight: bold;">
                                                        <?= htmlspecialchars($clienteNome) ?>
                                                        (<?= count($tarefas) ?>)
                                                    </span>

                                                </li>
                                                <div class="ids-list" style="margin-left: 10px;">
                                                    <?php foreach ($tarefas as $tarefa) : ?>
                                                        <?php
                                                        $tarefaId = $tarefa['tarefa_id'];
                                                        $tooltip = htmlspecialchars($tarefa['user_nome'])
                                                            . '<br>' . htmlspecialchars($tarefa['nome_tag'])
                                                            . "<br> Artes: " . $tarefa['total_artes'];
                                                        ?>
                                                        <form action="mkt_atd.php" method="POST" id="form-atendimento-enviarTimeDesigner<?= $tarefaId ?>" style="display: inline;">
                                                            <input type="hidden" name="mkt_atd" value="<?= htmlspecialchars($tarefaId) ?>">
                                                            <a href="#" onclick="document.getElementById('form-atendimento-enviarTimeDesigner<?= $tarefaId ?>').submit();" style="font-size: 0.95em; color: black; padding: 2px; margin-right: 4px;" data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?= $tooltip ?>" class="custom-tooltip">
                                                                <?= $tarefaId ?>
                                                            </a>
                                                        </form>
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>

                            <?php
                            $valoresArtes = array_column($dadosuploadsSemanaAtual, 'artes_feitas');
                            $maxArtesSemanaAtual = !empty($valoresArtes) ? max($valoresArtes) : 0;
                            ?>


                            <!-- Card Semana Atual -->
                            <div style="width: 300px; flex-shrink: 0;">
                                <div class="card-secondary" style="min-height: 250px;">
                                    <div class="card-header">
                                        <i class="fas fa-calendar-week me-2" style="padding-right: 7px; color: green;"></i>
                                        Artes - Semana Atual
                                    </div>
                                    <div class="card-body-int atd-list" style="overflow: auto; color:black;">
                                        Período: <?= date('d/m/Y', strtotime($inicioSemanaAtual)) ?> a <?= date('d/m/Y', strtotime($fimSemanaAtual)) ?>
                                        <div class="pt-3"></div>
                                        <?php foreach ($dadosuploadsSemanaAtual as $tecnico) :
                                            $percentual = $maxArtesSemanaAtual > 0 ? ($tecnico['artes_feitas'] / $maxArtesSemanaAtual) * 100 : 0;
                                        ?>
                                            <div class="tecnico-item" style="margin-bottom: 10px;">
                                                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                                    <span><?= htmlspecialchars($tecnico['nome_tecnico'] ?: 'Sem técnico') ?></span>
                                                    <span data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?= $tecnico['tooltip'] ?>" style="margin-right: 10px; cursor: pointer; font-size: 1.5em; color: black; padding: 1px;">
                                                        <?= $tecnico['artes_feitas'] ?>
                                                    </span>
                                                </div>
                                                <div style="background-color: #e0e0e0; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 2px;">
                                                    <div style="height: 100%; width: <?= $percentual ?>%; background-color: #28a745; transition: width 0.5s;"></div>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>

                            <?php
                            $valoresArtesSemanaPassada = array_column($dadosuploadsSemanaPassada, 'artes_feitas');
                            $maxArtesSemanaPassada = !empty($valoresArtesSemanaPassada) ? max($valoresArtesSemanaPassada) : 0;
                            ?>

                            <!-- Card Semana Passada -->
                            <div style="width: 300px; flex-shrink: 0;">
                                <div class="card-secondary" style="min-height: 250px;">
                                    <div class="card-header">
                                        <i class="fas fa-calendar-week me-2" style="padding-right: 7px; color: green;"></i>
                                        Artes - Semana Passada
                                    </div>
                                    <div class="card-body-int atd-list" style="overflow: auto; color:black;">
                                        Período: <?= date('d/m/Y', strtotime($inicioSemanaPassada)) ?> a <?= date('d/m/Y', strtotime($fimSemanaPassada)) ?>
                                        <div class="pt-3"></div>
                                        <?php foreach ($dadosuploadsSemanaPassada as $tecnico) :
                                            $percentual = $maxArtesSemanaPassada > 0 ? ($tecnico['artes_feitas'] / $maxArtesSemanaPassada) * 100 : 0;
                                        ?>
                                            <div class="tecnico-item" style="margin-bottom: 10px;">
                                                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                                    <span><?= htmlspecialchars($tecnico['nome_tecnico'] ?: 'Sem técnico') ?></span>
                                                    <span data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?= $tecnico['tooltip'] ?>" style="margin-right: 10px; cursor: pointer; font-size: 1.5em; color: black; padding: 1px;">
                                                        <?= $tecnico['artes_feitas'] ?>
                                                    </span>
                                                </div>
                                                <div style="background-color: #e0e0e0; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 2px;">
                                                    <div style="height: 100%; width: <?= $percentual ?>%; background-color: #28a745; transition: width 0.5s;"></div>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>

                            <?php
                            $valoresArtesDuasSemanas = array_column($dadosuploadsDuasSemanas, 'artes_feitas');
                            $maxArtesDuasSemanas = !empty($valoresArtesDuasSemanas) ? max($valoresArtesDuasSemanas) : 0;
                            ?>


                            <!-- Card Soma Semana Atual + Semana Passada -->
                            <div style="width: 300px; flex-shrink: 0;">
                                <div class="card-secondary" style="min-height: 250px;">
                                    <div class="card-header">
                                        <i class="fas fa-calendar-week me-2" style="padding-right: 7px; color: green;"></i>
                                        Artes - Quinzena
                                    </div>
                                    <div class="card-body-int atd-list" style="overflow: auto; color:black;">
                                        Período: <?= date('d/m/Y', strtotime($inicioSemanaPassada)) ?> a <?= date('d/m/Y', strtotime($fimSemanaAtual)) ?>
                                        <div class="pt-3"></div>
                                        <?php foreach ($dadosuploadsDuasSemanas as $tecnico) :
                                            $percentual = $maxArtesDuasSemanas > 0 ? ($tecnico['artes_feitas'] / $maxArtesDuasSemanas) * 100 : 0;
                                        ?>
                                            <div class="tecnico-item" style="margin-bottom: 10px;">
                                                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                                    <span><?= htmlspecialchars($tecnico['nome_tecnico'] ?: 'Sem técnico') ?></span>
                                                    <span data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?= $tecnico['tooltip'] ?>" style="margin-right: 10px; cursor: pointer; font-size: 1.5em; color: black; padding: 1px;">
                                                        <?= $tecnico['artes_feitas'] ?>
                                                    </span>
                                                </div>
                                                <div style="background-color: #e0e0e0; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 2px;">
                                                    <div style="height: 100%; width: <?= $percentual ?>%; background-color: #28a745; transition: width 0.5s;"></div>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>

                            <?php
                            $valoresArtesMesAtual = array_column($dadosuploadsMesAtual, 'artes_feitas');
                            $maxArtesMesAtual = !empty($valoresArtesMesAtual) ? max($valoresArtesMesAtual) : 0;
                            ?>


                            <!-- Card Mes Atual -->
                            <div style="width: 300px; flex-shrink: 0;">
                                <div class="card-secondary" style="min-height: 250px;">
                                    <div class="card-header">
                                        <i class="fas fa-calendar-alt me-2" style="padding-right: 7px; color: green;"></i>
                                        Artes - Màs Atual
                                    </div>
                                    <div class="card-body-int atd-list" style="overflow: auto; color:black;">
                                        Período: <?= date('d/m/Y', strtotime($inicioMesAtual)) ?> a <?= date('d/m/Y', strtotime($fimMesAtual)) ?>
                                        <div class="pt-3"></div>
                                        <?php foreach ($dadosuploadsMesAtual as $tecnico) :
                                            $percentual = $maxArtesMesAtual > 0 ? ($tecnico['artes_feitas'] / $maxArtesMesAtual) * 100 : 0;
                                        ?>
                                            <div class="tecnico-item" style="margin-bottom: 10px;">
                                                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                                    <span><?= htmlspecialchars($tecnico['nome_tecnico'] ?: 'Sem técnico') ?></span>
                                                    <span data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?= $tecnico['tooltip'] ?>" style="margin-right: 10px; cursor: pointer; font-size: 1.5em; color: black; padding: 1px;">
                                                        <?= $tecnico['artes_feitas'] ?>
                                                    </span>
                                                </div>
                                                <div style="background-color: #e0e0e0; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 2px;">
                                                    <div style="height: 100%; width: <?= $percentual ?>%; background-color: #28a745; transition: width 0.5s;"></div>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>

                            <?php
                            $valoresArtesMesPassado = array_column($dadosuploadsMesPassado, 'artes_feitas');
                            $maxArtesMesPassado = !empty($valoresArtesMesPassado) ? max($valoresArtesMesPassado) : 0;
                            ?>


                            <!-- Card Mes Passado -->
                            <div style="width: 300px; flex-shrink: 0;">
                                <div class="card-secondary" style="min-height: 250px;">
                                    <div class="card-header">
                                        <i class="fas fa-calendar-alt me-2" style="padding-right: 7px; color: green;"></i>
                                        Artes - Mes Passado
                                    </div>
                                    <div class="card-body-int atd-list" style="overflow: auto; color:black;">
                                        Período: <?= date('d/m/Y', strtotime($inicioMesPassado)) ?> a <?= date('d/m/Y', strtotime($fimMesPassado)) ?>
                                        <div class="pt-3"></div>
                                        <?php foreach ($dadosuploadsMesPassado as $tecnico) :
                                            $percentual = $maxArtesMesPassado > 0 ? ($tecnico['artes_feitas'] / $maxArtesMesPassado) * 100 : 0;
                                        ?>
                                            <div class="tecnico-item" style="margin-bottom: 10px;">
                                                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                                    <span><?= htmlspecialchars($tecnico['nome_tecnico'] ?: 'Sem técnico') ?></span>
                                                    <span data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?= $tecnico['tooltip'] ?>" style="margin-right: 10px; cursor: pointer; font-size: 1.5em; color: black; padding: 1px;">
                                                        <?= $tecnico['artes_feitas'] ?>
                                                    </span>
                                                </div>
                                                <div style="background-color: #e0e0e0; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 2px;">
                                                    <div style="height: 100%; width: <?= $percentual ?>%; background-color: #28a745; transition: width 0.5s;"></div>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                tooltipTriggerList.map(function(tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl, {
                        customClass: 'custom-tooltip', // Classe customizada
                        boundary: 'window' // Limita ao viewport
                    });
                });
            });
        </script>
</body>

</html>