<?php
session_start();
include_once("../../all/seguranca.php");
include_once("../../all/conect.php");
include_once("../../all/permissoes.php");

if ($m8_00 == 0) {
    header("Location: ../../home.php");
}

// Definição dos status dos atendimentos
// 0 == agendado
// 1 == aguardando execução
// 2 == em execução
// 3 == em espera
// 4 == finalizado
// 5 == concluído

function disponibilidadeFiltroTexto($valor)
{
    $valor = (string)$valor;
    if (function_exists('mb_strtolower')) {
        return mb_strtolower($valor, 'UTF-8');
    }
    return strtolower($valor);
}

function usuariosOnlineIds()
{
    $ids = [];
    if (!empty($_SESSION['allterusN3Id'])) {
        $ids[(int)$_SESSION['allterusN3Id']] = true;
    }

    $onlineWindowSeconds = 10 * 60;
    $sessionPaths = array_unique(array_filter([
        dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'sessions',
        session_save_path(),
    ]));

    foreach ($sessionPaths as $sessionPath) {
        if (!is_dir($sessionPath)) {
            continue;
        }

        foreach (glob($sessionPath . DIRECTORY_SEPARATOR . 'sess_*') ?: [] as $sessionFile) {
            if (!is_file($sessionFile) || (time() - filemtime($sessionFile)) > $onlineWindowSeconds) {
                continue;
            }

            $conteudo = @file_get_contents($sessionFile);
            if ($conteudo && preg_match('/allterusN3Id\|(?:i:(\d+);|s:\d+:"(\d+)";)/', $conteudo, $match)) {
                $ids[(int)($match[1] ?: $match[2])] = true;
            }
        }
    }

    return array_keys($ids);
}

function loadTecnicos($pdo)
{
    // Consulta para obter todos os técnicos e analistas ativos
    $stmtTodos = $pdo->prepare("SELECT user_id, user_nome, user_funcao, user_sts FROM usuarios WHERE user_sts = 1 AND usuarios.user_funcao IN (5, 6, 10, 12, 14)
");
    $stmtTodos->execute();

    $todosTecnicos = $stmtTodos->fetchAll(PDO::FETCH_ASSOC);
    $usuariosOnline = usuariosOnlineIds();
    $usuariosOnlineMap = array_fill_keys($usuariosOnline, true);


    // Agrupar técnicos por setor
    // $ti = [];
    // $devops = [];

    // foreach ($todosTecnicos as $tecnico) {
    //     if (in_array($tecnico['user_funcao'], [5, 6])) {
    //         $ti[] = $tecnico;
    //     } elseif (in_array($tecnico['user_funcao'], [10, 12, 14])) {
    //         $devops[] = $tecnico;
    //     }
    // }


    // Consulta para obter técnicos e analistas com tarefas em execução (status = 2) e suas tarefas
    $stmtOcupados = $pdo->prepare("
    SELECT
        usuarios.user_id,
        usuarios.user_nome,
        usuarios.user_funcao,
        atendimentos.id AS tarefa_id,
        atendimentos.tipo AS tipo_atendimento,
        clientes.clt_nomef AS nome_cliente
    FROM usuarios
    INNER JOIN atendimentos ON usuarios.user_id = atendimentos.tecnico
    INNER JOIN clientes ON atendimentos.cliente = clientes.clt_id
    WHERE atendimentos.status = 2
    AND usuarios.user_sts = 1
    AND usuarios.user_funcao IN (5, 6, 10, 12, 14)
");
    $stmtOcupados->execute();
    $tecnicosOcupados = $stmtOcupados->fetchAll(PDO::FETCH_ASSOC);


    // Agrupar tarefas por técnico
    $ocupadosAgrupados = [];
    $mapaTipos = [
        1 => "Falha",
        2 => "Relacionamento",
        3 => "Requisição de Serviços",
        4 => "Requisição de informação",
        6 => "Melhoria",
        0 => "Não informado"
    ];

    foreach ($tecnicosOcupados as $tecnico) {
        if ($tecnico['user_funcao'] == 7) {
            $tecnico['user_nome'] = 'Aguardando Atendimento';
        }
        if (!isset($ocupadosAgrupados[$tecnico['user_id']])) {
            $ocupadosAgrupados[$tecnico['user_id']]['user_nome'] = $tecnico['user_nome'];
            $ocupadosAgrupados[$tecnico['user_id']]['user_funcao'] = $tecnico['user_funcao'];
            $ocupadosAgrupados[$tecnico['user_id']]['id'] = [];
        }
        $tipoTexto = isset($mapaTipos[$tecnico['tipo_atendimento']]) ? $mapaTipos[$tecnico['tipo_atendimento']] : "Desconhecido";

        // Define o texto do tooltip com o nome da empresa e o tipo de atendimento
        $tooltipTexto = $tecnico['nome_cliente'] . '<br>' . $tipoTexto;

        $ocupadosAgrupados[$tecnico['user_id']]['id'][] = [
            'tarefa_id' => $tecnico['tarefa_id'],
            'tooltip_texto' => $tooltipTexto
        ];
    }


    // Extraindo os técnicos ocupados para ordená-los pelo nome
    $tecnicosOrdenar = [];
    foreach ($ocupadosAgrupados as $user_id => $dados) {
        $tecnicosOrdenar[] = [
            'user_id' => $user_id,
            'user_nome' => $dados['user_nome'],
            'user_funcao' => $dados['user_funcao'],
            'id' => $dados['id']
        ];
    }

    // Ordenar os técnicos ocupados pelo nome
    usort($tecnicosOrdenar, function ($a, $b) {
        return strcmp($a['user_nome'], $b['user_nome']);
    });

    // Recriar o array $ocupadosAgrupados ordenado
    $ocupadosAgrupados = [];
    // foreach ($tecnicosOrdenar as $tecnico) {
    //     $ocupadosAgrupados[$tecnico['user_id']] = [
    //         'user_nome' => $tecnico['user_nome'],
    //         'id' => $tecnico['id']
    //     ];
    // }
    foreach ($tecnicosOrdenar as $tecnico) {
        // Verifica se a função está entre 9 e 14
        $nome = $tecnico['user_nome'];
        if ($tecnico['user_funcao'] >= 9 && $tecnico['user_funcao'] <= 14) {
            $nome .= ' - DevOps';
        }

        $ocupadosAgrupados[$tecnico['user_id']] = [
            'user_nome' => $nome,
            'user_funcao' => $tecnico['user_funcao'],
            'id' => $tecnico['id']
        ];
    }

    // Filtrar técnicos livres (não ocupados)
    $tecnicosLivres = [];
    foreach ($todosTecnicos as $tecnico) {
        if (!isset($ocupadosAgrupados[$tecnico['user_id']]) && $tecnico['user_id'] !== 1 && isset($usuariosOnlineMap[(int)$tecnico['user_id']])) {
            $tecnicosLivres[] = $tecnico;
        }
    }

    //ALTERAÇÃO PARA HABILITAR OU DESABILITAR TECNICO DISPONIVEL

    //ALTERAÇÃO PARA HABILITAR OU DESABILITAR TECNICO DISPONIVEL

    ////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////////////////


    // CONSULTA ATENDIMENTOS EM EXECUÇÃO
    $stmtAtendimentosExecucao = $pdo->prepare("
        SELECT COUNT(atendimentos.id) AS total_execucao
        FROM usuarios
        INNER JOIN atendimentos ON usuarios.user_id = atendimentos.tecnico
        WHERE atendimentos.status = 2
        AND usuarios.user_sts = 1
        AND usuarios.user_funcao IN (5, 6, 10, 12, 14)
    ");
    $stmtAtendimentosExecucao->execute();
    $execucao = $stmtAtendimentosExecucao->fetch(PDO::FETCH_ASSOC);
    $numAtendimentosExecucao = $execucao['total_execucao'];

    ////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////////////////


    // CONSULTA ATENDIMENTOS AGUARDANDO

    // Consulta unificada para buscar atendimentos aguardando (com ou sem técnico)
    $stmtAguardandoAtendimento = $pdo->prepare("
    SELECT
        COALESCE(usuarios.user_id, 0) AS user_id,
        COALESCE(usuarios.user_nome, 'Sem Técnico') AS user_nome,
        COALESCE(usuarios.user_funcao, 'N/A') AS user_funcao,
        atendimentos.id AS tarefa_id,
        atendimentos.tipo AS tipo_atendimento,
        atendimentos.desc_abertura AS desc_abertura,
        clientes.clt_nomef AS nome_cliente
    FROM atendimentos
    LEFT JOIN usuarios ON usuarios.user_id = atendimentos.tecnico AND usuarios.user_sts = 1
    LEFT JOIN clientes ON clientes.clt_id = atendimentos.cliente
    WHERE atendimentos.status = 1
");
    $stmtAguardandoAtendimento->execute();
    $tarefaAguardando = $stmtAguardandoAtendimento->fetchAll(PDO::FETCH_ASSOC);


    // Define o mapa de tipos
    $mapaTipos = [
        1 => "Falha",
        2 => "Relacionamento",
        3 => "Requisição de Serviços",
        4 => "Requisição de informação",
        6 => "Melhoria",
        0 => "Não informado"
    ];

    // Substituir o valor numérico de tipo_atendimento pelo nome correspondente
    foreach ($tarefaAguardando as &$tarefa) {
        //imprime a tarefa_id dos atendimentos
        $tipoTexto = $mapaTipos[$tarefa['tipo_atendimento']] ?? "Desconhecido";
        $tarefa['tipo_atendimento_nome'] = $tipoTexto;

        // Define a string do tooltip com quebra de linha
        $tarefa['tooltip_texto'] = $tarefa['nome_cliente'] . '<br>' . $tipoTexto;
    }
    unset($tarefa); // Evitar referências não desejadas

    // Ordenar o array pelo 'tarefa_id'
    usort($tarefaAguardando, function ($a, $b) {
        return $a['tarefa_id'] <=> $b['tarefa_id'];
    });

    // Filtrar e contar tarefas aguardando atendimento
    $aguardandoAtendimento = [];
    $numAguardandoAtendimento = 0;

    foreach ($tarefaAguardando as $tarefa) {
        if (!isset($aguardandoAtendimento[$tarefa['user_id']])) {
            $aguardandoAtendimento[$tarefa['user_id']] = [];
        }
        $aguardandoAtendimento[$tarefa['user_id']][] = $tarefa['tarefa_id']; // Adiciona apenas o ID da tarefa
        $numAguardandoAtendimento++;
    }


    ////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////////////////

    // Consulta atendimentos agendados (status = 0)
    $stmtAtendimentosAgendados = $pdo->prepare("
        SELECT
    usuarios.user_id,
    COALESCE(usuarios.user_nome, 'Sem Técnico') AS user_nome,
    COALESCE(usuarios.user_funcao, 'N/A') AS user_funcao,
    atendimentos.id AS tarefa_id,
    atendimentos.tipo AS tipo_atendimento,
    clientes.clt_nomef AS nome_cliente
FROM atendimentos
LEFT JOIN usuarios ON usuarios.user_id = atendimentos.tecnico
INNER JOIN clientes ON clientes.clt_id = atendimentos.cliente
WHERE atendimentos.status = 0
    ");
    $stmtAtendimentosAgendados->execute();
    $agendados = $stmtAtendimentosAgendados->fetchAll(PDO::FETCH_ASSOC);

    // AND usuarios.user_sts = 1

    echo '<script> console.log(' . json_encode($agendados) . '); </script>';

    // Filtrar técnicos e contar tarefas agendadas
    // Agrupar tarefas por técnico e adicionar tipo de atendimento
    $atendimentosAgendados = [];
    foreach ($agendados as $tarefa) {
        $userId = $tarefa['user_id'];
        //imprime a tarefa_id dos atendimentos
        $tipoTexto = $mapaTipos[$tarefa['tipo_atendimento']] ?? "Desconhecido";
        $tarefa['tipo_atendimento_nome'] = $tipoTexto;

        // Define a string do tooltip com quebra de linha
        $tarefa['tooltip_texto'] = $tarefa['nome_cliente'] . '<br>' . $tipoTexto;

        if (!isset($atendimentosAgendados[$userId])) {
            $atendimentosAgendados[$userId] = [
                'user_nome' => $tarefa['user_nome'],
                'tarefas' => []
            ];
        }
        $atendimentosAgendados[$userId]['tarefas'][] = [
            'tarefa_id' => $tarefa['tarefa_id'],
            'tipo_atendimento' => $tarefa['tipo_atendimento'],
            'tooltip_texto' => $tarefa['tooltip_texto']

        ];
    }


    ///////////////////////////////////////////////////////////////////////////////////////////


    ///////////////////////////////////////////////////////////////////////////////////////////

    // CONSULTA ATENDIMENTOS FINALIZADOS OU CONCLUÍDOS (status = 4 ou 5)

    // Consulta atendimentos finalizados ou concluídos (status = 4 ou 5) na data atual (hoje)
    $stmtFinalizadosHoje = $pdo->prepare("
    SELECT usuarios.user_id,
           usuarios.user_nome,
           atendimentos.id AS tarefa_id,
           atendimentos.tipo AS tipo_atendimento,
           clientes.clt_nomef AS nome_cliente
    FROM usuarios
    INNER JOIN atendimentos ON usuarios.user_id = atendimentos.tecnico
    INNER JOIN clientes ON clientes.clt_id = atendimentos.cliente
    WHERE (atendimentos.status = 4 OR atendimentos.status = 5)
    AND usuarios.user_sts = 1
    AND usuarios.user_funcao IN (5, 6, 10, 12, 14)
    AND DATE(atendimentos.fechamento) = CURDATE()
");
    $stmtFinalizadosHoje->execute();
    $finalizadosConcluidos = $stmtFinalizadosHoje->fetchAll(PDO::FETCH_ASSOC);

    // Define o mapa de tipos
    $mapaTipos = [
        1 => "Falha",
        2 => "Relacionamento",
        3 => "Requisição de Serviços",
        4 => "Requisição de Informação",
        6 => "Melhoria",
        0 => "Não informado"
    ];
    // Agrupar tarefas por técnico e adicionar tipo de atendimento
    $concluidosAgrupados = [];
    foreach ($finalizadosConcluidos as $tarefa) {
        $userId = $tarefa['user_id'];
        $tipoTexto = $mapaTipos[$tarefa['tipo_atendimento']] ?? "Desconhecido";
        $tarefa['tipo_atendimento_nome'] = $tipoTexto;

        // Define a string do tooltip com quebra de linha
        $tarefa['tooltip_texto'] = $tarefa['nome_cliente'] . '<br>' . $tipoTexto;
        echo '<script>console.log(' . json_encode($tarefa) . ');</script>';


        if (!isset($concluidosAgrupados[$userId])) {
            $concluidosAgrupados[$userId] = [
                'user_nome' => $tarefa['user_nome'],
                'tarefas' => []
            ];
        }
        $concluidosAgrupados[$userId]['tarefas'][] = [
            'tarefa_id' => $tarefa['tarefa_id'],
            'tipo_atendimento' => $tarefa['tipo_atendimento'],
            'tooltip_texto' => $tarefa['tooltip_texto']
        ];
    }

    // Ordenar técnicos pelo nome
    usort($concluidosAgrupados, function ($a, $b) {
        return strcasecmp($a['user_nome'], $b['user_nome']);
    });

    // Contar o total de tarefas finalizadas hoje
    $numFinalizadosHoje = 0;
    foreach ($concluidosAgrupados as $tecnico) {
        $numFinalizadosHoje += count($tecnico['tarefas']);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////////////////////////////////////

    /// CONSULTA ATENDIMENTOS EM ESPERA (status = 3)
    $stmtAtendimentosEspera = $pdo->prepare("SELECT
        usuarios.user_id,
        usuarios.user_nome,
        usuarios.user_funcao,
        atendimentos.id AS tarefa_id,
        atendimentos.tipo AS tipo_atendimento,
        clientes.clt_nomef AS nome_cliente,
        IFNULL(espera_counts.qtde_espera, 0) AS qtde_espera,
        (SELECT espera_causa FROM espera
        WHERE espera_atd = atendimentos.id
        ORDER BY espera_start DESC LIMIT 1) AS ultima_causa,
        (SELECT espera_desc FROM espera
        WHERE espera_atd = atendimentos.id
        ORDER BY espera_start DESC LIMIT 1) AS ultima_desc
            FROM
                usuarios
            INNER JOIN
                atendimentos ON usuarios.user_id = atendimentos.tecnico
            INNER JOIN
                clientes ON atendimentos.cliente = clientes.clt_id

            LEFT JOIN
                (SELECT espera_atd, COUNT(*) as qtde_espera FROM espera GROUP BY espera_atd) AS espera_counts
                ON atendimentos.id = espera_counts.espera_atd

            WHERE
                atendimentos.status = 3
                AND usuarios.user_sts = 1
        ");
    $stmtAtendimentosEspera->execute();
    $emEspera = $stmtAtendimentosEspera->fetchAll(PDO::FETCH_ASSOC);

    // Define o mapa de tipos
    $mapaTipos = [
        1 => "Falha",
        2 => "Relacionamento",
        3 => "Requisição de Serviços",
        4 => "Requisição de Informação",
        6 => "Melhoria",
        0 => "Não informado"
    ];

    // Adiciona o nome do tipo de atendimento a cada tarefa
    foreach ($emEspera as &$tarefa) {
        //imprime a tarefa_id dos atendimentos
        $tipoTexto = $mapaTipos[$tarefa['tipo_atendimento']] ?? "Desconhecido";
        $tarefa['tipo_atendimento_nome'] = $tipoTexto;

        // Define a string do tooltip com quebra de linha
        $tarefa['tooltip_texto'] = $tarefa['nome_cliente'] . '<br>' . $tipoTexto;
    }

    // Filtrar e contar tarefas em espera
    $atendimentosEspera = [];
    foreach ($emEspera as $tecnico) {
        if (!isset($atendimentosEspera[$tecnico['user_id']])) {
            $atendimentosEspera[$tecnico['user_id']] = [];
        }
        $atendimentosEspera[$tecnico['user_id']][] = $tecnico;
    }

    // Agrupar tarefas em espera por causa
    $esperaAgrupada = [];
    foreach ($emEspera as $tarefa) {
        $tarefaId = $tarefa['tarefa_id'];


        // Verificar na tabela de espera a causa da espera, pegando a última registrada pela coluna espera_start
        //         $stmtCausa = $pdo->prepare("
        //     SELECT espera_causa
        //     FROM espera
        //     WHERE espera_atd = :tarefa_id
        //     ORDER BY ultimo_registro DESC
        //     LIMIT 1
        // ");
        //         $stmtCausa->bindParam(':tarefa_id', $tarefaId);
        //         $stmtCausa->execute();
        //         $causa = $stmtCausa->fetchColumn();

        $causa = $tarefa['ultima_causa'];

        // Agrupar pela causa se encontrada
        if ($causa) {
            if (!isset($esperaAgrupada[$causa])) {
                $esperaAgrupada[$causa] = [];
            }
            $esperaAgrupada[$causa][] = $tarefa;
        }
    }

    // cria a contagem de todos os atendimento e conta quantas vezes o atendimento foi para espera



    $dadosTecnicos = [
        'todosTecnicos' => $todosTecnicos,
        'tecnicosLivres' => $tecnicosLivres,
        'ocupadosAgrupados' => $ocupadosAgrupados,
        'aguardandoAtendimento' => $aguardandoAtendimento,
        'numAtendimentosExecucao' => $numAtendimentosExecucao,
        'atendimentosAgendados' => $atendimentosAgendados,
        'numFinalizadosHoje' => $numFinalizadosHoje,
        'finalizadosConcluidos' => $finalizadosConcluidos,
        'atendimentosEspera' => $atendimentosEspera,
        'numAtendimentosEspera' => $emEspera,
        'tarefaAguardando' => $tarefaAguardando,
        'numAguardandoAtendimento' => $numAguardandoAtendimento,
        'concluidosAgrupados' => $concluidosAgrupados,
        'esperaAgrupada' => $esperaAgrupada
    ];

    return $dadosTecnicos;
}

// Conexão com o banco de dados
$pdo = ConnectionN3();
if (!$pdo) {
    exit("Erro ao conectar ao banco de dados.");
}

//ALTERAÇÃO PARA HABILITAR OU DESABILITAR TECNICO DISPONIVEL

// Salvar a seleção dos técnicos disponíveis na sessão
//ALTERAÇÃO PARA HABILITAR OU DESABILITAR TECNICO DISPONIVEL


// Obtém os dados dos técnicos
$dadosTecnicos = loadTecnicos($pdo);

$numTecnicos = count($dadosTecnicos['todosTecnicos']);
$numTecnicosLivres = count($dadosTecnicos['tecnicosLivres']);
$numTecnicosOcupados = count($dadosTecnicos['ocupadosAgrupados']);
$numAtendimentosEspera = count($dadosTecnicos['numAtendimentosEspera']);
$numFinalizadosHoje = $dadosTecnicos['numFinalizadosHoje'];
$numAtendimentosAgendados = count($dadosTecnicos['atendimentosAgendados']);
$numAguardandoAtendimento = $dadosTecnicos['numAguardandoAtendimento'];
$numAtendimentosExecucao = $dadosTecnicos['numAtendimentosExecucao'];

// Gerar string com IDs das tarefas aguardando atendimento
$tarefasAguardandoStr = "";
foreach ($dadosTecnicos['tarefaAguardando'] as $tarefas) {
    $tarefasAguardandoStr .= implode(", ", $tarefas) . ", ";
}
$tarefasAguardandoStr = rtrim($tarefasAguardandoStr, ", ");

// Gerar string com IDs das tarefas em espera
$atendimentosEsperaStr = "";
foreach ($dadosTecnicos['atendimentosEspera'] as $tarefas) {
    foreach ($tarefas as $tarefa) {
        if (is_array($tarefa)) {
            // Caso $tarefa seja um array, extraia o ID da tarefa (ou outro campo necessário)
            if (isset($tarefa['tarefa_id'])) {
                $atendimentosEsperaStr .= $tarefa['tarefa_id'] . ", ";
            }
        } else {
            // Caso $tarefa já seja uma string ou número
            $atendimentosEsperaStr .= $tarefa . ", ";
        }
    }
}
// Remover a vírgula e espaço extras no final da string
$atendimentosEsperaStr = rtrim($atendimentosEsperaStr, ", ");


// // Gerar string com IDs das tarefas agendadas
// $atendimentosAgendadosStr = "";
// foreach ($dadosTecnicos['atendimentosAgendados'] as $tarefas) {
//     $atendimentosAgendadosStr .= implode(", ", $tarefas) . ", ";
// }
// $atendimentosAgendadosStr = rtrim($atendimentosAgendadosStr, ", ");

// echo "<script> console.log('concluidosAgrupados:', " . json_encode($dadosTecnicos['concluidosAgrupados']) . "); </script>";
// echo "<script> console.log('finalizadosConcluidos:', " . json_encode($dadosTecnicos['finalizadosConcluidos']) . "); </script>";

?>

<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=0.9, shrink-to-fit=no">
    <title>Allterus</title>

    <link rel="icon" href="../../img/favicon.ico">
    <link rel="stylesheet" href="../../css/help.css">
    <link rel="stylesheet" href="../../css/bootstrap.min.css">
    <link rel="stylesheet" href="../../fontawesome/css/all.css">
    <link rel="stylesheet" href="../../css/bootstrap-select.min.css">
    <link rel="stylesheet" href="../../css/timeline.css">
    <link rel="stylesheet" href="../../css/bootstrap-datetimepicker.min.css">
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="disponibilidadeTec.css">
</head>

<body>
    <?php include("../../all/sidebar.php"); ?>

    <div class="container-fluid">
        <div class="row">
            <div class="col-md-12" style="padding-right: 0px; padding-left: 0px">
                <div class="card disponibilidade-shell" style="overflow-x: hidden; overflow-y: hidden; min-height: 555px">
                    <div class="card-header py-1 disponibilidade-header">
                        <div class="disponibilidade-title">
                            <span class="disponibilidade-title-icon"><i class="fas fa-users"></i></span>
                            <div>
                                <strong>Disponibilidade Técnica</strong>
                                <small>Visão operacional dos atendimentos em tempo real</small>
                            </div>
                        </div>
                        <div class="btn-group float-right">
                            <!-- <button type="button" class="btn btn-success btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="width: 200px">
                                Setor
                            </button> -->
                            <!-- <div class="dropdown-menu dropdown-setor">
                                <form method="POST" action="">
                                    <strong class="dropdown-header">TI</strong>
                                    <?php foreach ($dadosTecnicos['ti'] as $tecnico) : ?>
                                        <div class="form-check">
                                            <input class="form-check-input tecnico-checkbox" type="checkbox" name="tecnicos[]" value="<?= $tecnico['user_id']; ?>" <?= (isset($_SESSION['tecnicos_selecionados']) && in_array($tecnico['user_id'], $_SESSION['tecnicos_selecionados'])) ? 'checked' : ''; ?>>
                                            <label class="form-check-label"><?= $tecnico['user_nome']; ?></label>
                                        </div>
                                    <?php endforeach; ?>

                                    <hr>
                                    <strong class="dropdown-header">DevOps</strong>
                                    <?php foreach ($dadosTecnicos['devops'] as $tecnico) : ?>
                                        <div class="form-check">
                                            <input class="form-check-input tecnico-checkbox" type="checkbox" name="tecnicos[]" value="<?= $tecnico['user_id']; ?>" <?= (isset($_SESSION['tecnicos_selecionados']) && in_array($tecnico['user_id'], $_SESSION['tecnicos_selecionados'])) ? 'checked' : ''; ?>>
                                            <label class="form-check-label"><?= $tecnico['user_nome']; ?></label>
                                        </div>
                                    <?php endforeach; ?>

                                    <button type="submit" class="btn btn-primary btn-sm mt-2">Salvar</button>
                                </form>
                            </div> -->




                            <button type="button" class="btn btn-secondary btn-sm dropdown-toggle btn-visualizar" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="width: 200px">
                                Visualizar
                            </button>
                            <div class="dropdown-menu dropdown-visualizar">
                                <form method="POST" action="">
                                    <!-- Checkbox "Selecionar Todos" -->
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="select-all-checkbox">
                                        <label class="form-check-label" for="select-all-checkbox">
                                            Selecionar Todos
                                        </label>
                                    </div>

                                    <!-- Lista de técnicos -->
                                    <?php foreach ($dadosTecnicos['todosTecnicos'] as $tecnico) : ?>
                                        <div class="form-check">
                                            <input class="form-check-input tecnico-checkbox" type="checkbox" name="tecnicos[]" value="<?php echo $tecnico['user_id']; ?>" <?php echo (isset($_SESSION['tecnicos_selecionados']) && in_array($tecnico['user_id'], $_SESSION['tecnicos_selecionados'])) ? 'checked' : ''; ?>>
                                            <label class="form-check-label">
                                                <?php echo $tecnico['user_nome']; ?>
                                            </label>
                                        </div>
                                    <?php endforeach; ?>

                                    <button type="submit" class="btn btn-primary btn-sm mt-2">Salvar</button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div class="card-body col-md-12 disponibilidade-body" style="margin-top: -10px;">
                        <div class="summary-grid">
                            <div class="summary-card summary-card-livre">
                                <span class="summary-icon"><i class="fa fa-thumbs-up"></i></span>
                                <div>
                                    <small>Técnicos online livres</small>
                                    <strong><?php echo $numTecnicosLivres; ?></strong>
                                    <span>Equipe disponível agora</span>
                                </div>
                            </div>
                            <div class="summary-card summary-card-ocupado">
                                <span class="summary-icon"><i class="fas fa-thumbs-down"></i></span>
                                <div>
                                    <small>Técnicos ocupados</small>
                                    <strong><?php echo $numTecnicosOcupados; ?></strong>
                                    <span>Em atendimento</span>
                                </div>
                            </div>
                            <div class="summary-card summary-card-espera">
                                <span class="summary-icon"><i class="fas fa-pause-circle"></i></span>
                                <div>
                                    <small>Em espera</small>
                                    <strong><?php echo $numAtendimentosEspera; ?></strong>
                                    <span>Aguardando retorno</span>
                                </div>
                            </div>
                            <div class="summary-card summary-card-fila">
                                <span class="summary-icon"><i class="fas fa-bell"></i></span>
                                <div>
                                    <small>Na fila</small>
                                    <strong><?php echo $numAguardandoAtendimento; ?></strong>
                                    <span>Aguardando distribuição</span>
                                </div>
                            </div>
                            <div class="summary-card summary-card-concluido">
                                <span class="summary-icon"><i class="fas fa-check-circle"></i></span>
                                <div>
                                    <small>Concluídos hoje</small>
                                    <strong><?php echo $numFinalizadosHoje; ?></strong>
                                    <span>Finalizados no dia</span>
                                </div>
                            </div>
                        </div>

                        <div class="availability-tabs">
                            <button type="button" class="availability-tab" data-tab-target="tecnicos">
                                <i class="fas fa-users"></i> Técnicos
                            </button>
                            <button type="button" class="availability-tab is-active" data-tab-target="atendimentos">
                                <i class="fas fa-list"></i> Atendimentos
                            </button>
                        </div>

                        <div class="attendance-filters" id="attendanceFilters" style="display: none;">
                            <button type="button" class="attendance-filter is-active" data-atd-filter="espera">Em espera</button>
                            <button type="button" class="attendance-filter" data-atd-filter="concluidos">Concluídos</button>
                            <button type="button" class="attendance-filter" data-atd-filter="execucao">Em execução</button>
                            <button type="button" class="attendance-filter" data-atd-filter="fila">Na fila</button>
                            <button type="button" class="attendance-filter" data-atd-filter="agendados">Agendados</button>
                            <label class="attendance-tech-filter" id="esperaTecnicoFilterWrap">
                                <i class="fas fa-user"></i>
                                <select id="esperaTecnicoFilter">
                                    <option value="">Todos os tecnicos</option>
                                    <?php
                                    $tecnicosEmEsperaFiltro = [];
                                    foreach ($dadosTecnicos['esperaAgrupada'] as $atendimentosFiltro) {
                                        foreach ($atendimentosFiltro as $atendimentoFiltro) {
                                            $nomeFiltro = !empty($atendimentoFiltro['user_nome']) ? $atendimentoFiltro['user_nome'] : 'Sem Tecnico';
                                            $tecnicosEmEsperaFiltro[$nomeFiltro] = true;
                                        }
                                    }
                                    ksort($tecnicosEmEsperaFiltro);
                                    foreach (array_keys($tecnicosEmEsperaFiltro) as $nomeFiltro) :
                                    ?>
                                        <option value="<?php echo htmlspecialchars(disponibilidadeFiltroTexto($nomeFiltro)); ?>"><?php echo htmlspecialchars($nomeFiltro); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </label>
                            <button type="button" class="attendance-report" id="btnRelatorioEspera">
                                <i class="fas fa-file-alt"></i> Criar relatorio em espera
                            </button>
                        </div>

                        <div class="row tech-columns" id="availabilityGrid">
                            <div class="col-md-3" style="padding-left: 5px; padding-right: 0px">

                                <!-- card técnicos livres -->
                                <div class="card" style="overflow-x: hidden; overflow-y: hidden; min-height: 250px">
                                    <div class="card-header py-1">
                                        <i class="fa fa-thumbs-up" style="padding-right: 7px;"></i> Técnicos online livres: <?php echo $numTecnicosLivres; ?>
                                    </div>
                                    <div class="card-body atd-list">
                                        <div style="color:black;">
                                            <ul id="tecnicosLivres">
                                                <?php foreach ($dadosTecnicos['tecnicosLivres'] as $tecnico) : ?>
                                                    <?php
                                                    $nome = $tecnico['user_nome'];
                                                    if ($tecnico['user_funcao'] >= 9 && $tecnico['user_funcao'] <= 14) {
                                                        $nome .= ' - DevOps';
                                                    }
                                                    ?>
                                                    <li class="tecnico-item tecnico-livre">
                                                        <span><?php echo $nome; ?></span>
                                                    </li>
                                                <?php endforeach; ?>
                                            </ul>
                                        </div>
                                    </div>

                                </div>


                                <!--Card FILA-->
                                <div class="card mt-3" style="overflow-x: hidden; overflow-y: hidden;min-height: 125px">
                                    <div class="card-header py-1">
                                        <i class="fas fa-bell" style="padding-right: 7px; color: red;"></i> Atendimentos na fila: <?php echo $numAguardandoAtendimento; ?>
                                    </div>
                                    <div class="card-body atd-list">
                                        <div class="fila-list" style="color:black;">
                                            <?php
                                            foreach ($dadosTecnicos['tarefaAguardando'] as $tarefaFila) {
                                                $tarefaIdFila = trim((string)($tarefaFila['tarefa_id'] ?? ''));
                                                if ($tarefaIdFila === '') {
                                                    continue;
                                                }

                                                $clienteFila = htmlspecialchars($tarefaFila['nome_cliente'] ?? 'Cliente nao informado');
                                                $descricaoFila = trim((string)($tarefaFila['desc_abertura'] ?? ''));
                                                $descricaoFila = htmlspecialchars($descricaoFila !== '' ? $descricaoFila : 'Sem descricao de abertura.');
                                                $tooltipFila = htmlspecialchars($tarefaFila['tooltip_texto'] ?? 'Desconhecido');

                                                echo '<div class="fila-item">
                                                    <div class="fila-item-head">
                                                        <span class="fila-cliente">' . $clienteFila . '</span>
                                                        <form action="../atd.php" method="POST" id="form-atendimento-fila-card-' . htmlspecialchars($tarefaIdFila) . '" style="display: inline;">
                                                            <input type="hidden" name="atd" value="' . htmlspecialchars($tarefaIdFila) . '">
                                                            <a href="#"
                                                                onclick="document.getElementById(\'form-atendimento-fila-card-' . htmlspecialchars($tarefaIdFila) . '\').submit();"
                                                                data-bs-toggle="tooltip"
                                                                data-bs-placement="top"
                                                                data-html="true"
                                                                title="' . $tooltipFila . '"
                                                                class="custom-tooltip atendimento-chip">
                                                                ' . htmlspecialchars($tarefaIdFila) . '
                                                            </a>
                                                        </form>
                                                    </div>
                                                    <div class="fila-desc">' . $descricaoFila . '</div>
                                                </div>';
                                            }

                                            foreach ($dadosTecnicos['aguardandoAtendimento'] as $tarefas) {
                                                foreach ($tarefas as $tarefaId) {
                                                    $tarefaId = trim($tarefaId);
                                                    if (!empty($tarefaId)) {
                                                        $tipoTexto = "Desconhecido"; // Valor padrão
                                                        foreach ($dadosTecnicos['tarefaAguardando'] as $tarefa) {
                                                            if ($tarefa['tarefa_id'] == $tarefaId) {
                                                                $tipoTexto = isset($tarefa['tipo']) ? htmlspecialchars($tarefa['tipo']) : "Desconhecido";
                                                                break;
                                                            }
                                                        }
                                                        echo '<form action="../atd.php" method="POST" id="form-atendimento-' . $tarefaId . '" style="display: inline;">
                                                            <input type="hidden" name="atd" value="' . htmlspecialchars($tarefaId) . '">
                                                                <a href="#"
                                                                    onclick="document.getElementById(\'form-atendimento-' . htmlspecialchars($tarefaId) . '\').submit();"
                                                                    style="font-size: 1em; color: black; padding: 3px;"
                                                                    data-bs-toggle="tooltip"
                                                                    data-bs-placement="top"
                                                                    data-html="true"
                                                                    title="' . $tarefa['tooltip_texto'] . '"
                                                            class="custom-tooltip">
                                                            ' . htmlspecialchars($tarefaId) . '
                                                            </a>
                                                        </form>';
                                                    }
                                                }
                                            }
                                            ?>
                                        </div>
                                    </div>
                                </div>

                                <!-- Card EM EXECUÇÃO -->
                                <div class="card mt-3" style="overflow-x: hidden; overflow-y: hidden">
                                    <div class="card-header py-1">
                                        <i class="fas fa-keyboard" style="padding-right: 7px;"></i> Atendimentos Em Execução: <?php echo $numAtendimentosExecucao; ?>
                                    </div>
                                    <div class="card-body atd-list">
                                        <div style="color:black;">
                                            <?php
                                            foreach ($dadosTecnicos['ocupadosAgrupados'] as $tecnico) {
                                                echo '<div class="tecnico-item tecnico-execucao">';
                                                echo '<li style="margin-left: 1px; padding-left: 0px;">';
                                                echo '<span style="font-weight: bold;">' . htmlspecialchars($tecnico['user_nome']) . ' (' . count($tecnico['id']) . ')</span>';
                                                echo '<div class="ids-list" style="color:black;">';

                                                foreach ($tecnico['id'] as $tarefa) {
                                                    $tarefaId = $tarefa['tarefa_id'];
                                                    echo '<form action="../atd.php" method="POST" id="form-atendimento-execucao-' . $tarefaId . '" style="display: inline;">
                                                            <input type="hidden" name="atd" value="' . htmlspecialchars($tarefaId) . '">
                                                            <a href="#"
                                                            onclick="document.getElementById(\'form-atendimento-execucao-' . htmlspecialchars($tarefaId) . '\').submit();"
                                                            style="font-size: 1em; color: black; padding: 3px;"
                                                            data-bs-toggle="tooltip"
                                                            data-bs-placement="top"
                                                            data-html="true"
                                                            title="' . $tarefa['tooltip_texto'] . '"
                                                            class="custom-tooltip">
                                                            ' . htmlspecialchars($tarefaId) . '
                                                            </a>
                                                        </form>';
                                                }

                                                echo '</div>';
                                                echo '</li>';
                                                echo '</div>';
                                            }
                                            ?>
                                        </div>
                                    </div>
                                </div>
                                <!-- Card AGENDADOS -->
                                <div class="card mt-3" style="overflow-x: hidden; overflow-y: hidden; min-height: 80px">
                                    <div class="card-header py-1">
                                        <i class="fas fa-calendar-alt" style="padding-right: 7px;"></i> Atendimentos Agendados: <?php echo $numAtendimentosAgendados; ?>
                                    </div>
                                    <div class="card-body atd-list">
                                        <div style="color:black;">
                                            <?php
                                            // Iterar pelos técnicos
                                            foreach ($dadosTecnicos['atendimentosAgendados'] as $tecnico) {
                                                echo '<div class="tecnico-item tecnico-agendado">';
                                                echo '<li style="margin-left: 1px; padding-left: 0px;">';
                                                echo '<span style="font-weight: bold;">' . htmlspecialchars($tecnico['user_nome']) . ' (' . count($tecnico['tarefas']) . ')</span>';
                                                echo '<div class="ids-list" style="color:black;">';

                                                // Iterar pelas tarefas do técnico
                                                foreach ($tecnico['tarefas'] as $tarefa) {
                                                    $tarefaId = $tarefa['tarefa_id'];
                                                    $tipoTexto = isset($tarefa['tipo']) ? htmlspecialchars($tarefa['tipo']) : "Desconhecido";

                                                    // Formatar cada tarefa como link
                                                    echo '<form action="../atd.php" method="POST" id="form-atendimento-agendado-' . $tarefaId . '" style="display: inline;">
                                                            <input type="hidden" name="atd" value="' . htmlspecialchars($tarefaId) . '">
                                                    <a href="#"
                                                    onclick="document.getElementById(\'form-atendimento-agendado-' . $tarefaId . '\').submit();"
                                                    style="font-size: 1em; color: black; padding: 3px;"
                                                    data-bs-toggle="tooltip"
                                                    data-bs-placement="top"
data-html="true"
                                                            title="' . $tarefa['tooltip_texto'] . '"
                                                            class="custom-tooltip">
                                                            ' . htmlspecialchars($tarefaId) . '
                                                            </a>
                                                        </form>';
                                                }

                                                echo '</div>'; // Fechar div .ids-list
                                                echo '</li>';
                                                echo '</div>'; // Fechar div .tecnico-item
                                            }
                                            ?>
                                        </div>
                                    </div>
                                </div>

                            </div>




                            <!-- card OCUPADOS -->
                            <div class="col-md-3" style="padding-left: 0px; padding-right: 0px; display: flex; flex-direction: column;">
                                <div class="card" style="flex-grow: 1; overflow-x: hidden; overflow-y: hidden;">
                                    <div class="card-header py-1">
                                        <i class="fas fa-thumbs-down" style="padding-right: 7px;"></i> Técnicos Ocupados: <?php echo $numTecnicosOcupados; ?>
                                    </div>
                                    <div class="card-body atd-list">

                                        <div style="color:black;">
                                            <?php
                                            foreach ($dadosTecnicos['ocupadosAgrupados'] as $tecnico) {
                                                echo '<div class="tecnico-item tecnico-ocupado" >';
                                                echo '<li style="margin-left: 1px; padding-left: 0px;">';
                                                echo '<span style="font-weight: bold;">' . htmlspecialchars($tecnico['user_nome']) . ' (' . count($tecnico['id']) . ')</span>';
                                                echo '<div class="ids-list" style="color:black;">';


                                                foreach ($tecnico['id'] as $tarefa) {
                                                    $tarefaId = $tarefa['tarefa_id'];
                                                    $tipoTexto = isset($tarefa['tipo']) ? htmlspecialchars($tarefa['tipo']) : "Desconhecido";

                                                    echo '<form action="../atd.php" method="POST" id="form-atendimento-ocupado' . $tarefaId . '" style="display: inline;">
                                                            <input type="hidden" name="atd" value="' . htmlspecialchars($tarefaId) . '">
                                                            <a href="#"
                                                            onclick="document.getElementById(\'form-atendimento-ocupado' . htmlspecialchars($tarefaId) . '\').submit();"
                                                            style="font-size: 1em; color: black; padding: 3px;"
                                                            data-bs-toggle="tooltip"
                                                            data-bs-placement="top"
                                                            data-html="true"
                                                            title="' . $tarefa['tooltip_texto'] . '"
                                                            class="custom-tooltip">
                                                            ' . htmlspecialchars($tarefaId) . '
                                                            </a>
                                                        </form>';
                                                }
                                                echo '</div>';
                                                echo '</div>';
                                            }
                                            ?>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- quarto card EM ESPERA -->
                            <div class="col-md-6">
                                <div class="card" style="flex-grow: 1; overflow-x: hidden; overflow-y: hidden;">
                                    <div class="card-header py-1">
                                        <i class="fas fa-pause-circle" style="padding-right: 7px; color: orange;"></i> Atendimentos Em Espera: <?php echo $numAtendimentosEspera; ?>
                                    </div>
                                    <div class="card-body atd-list">
                                        <?php
                                        $totalNiveis = count($dadosTecnicos['esperaAgrupada']);
                                        $currentNivel = 0;

                                        foreach ($dadosTecnicos['esperaAgrupada'] as $nivel => $atendimentos) :
                                            $currentNivel++;
                                            $numChamados = count($atendimentos);
                                            $borderStyle = ($currentNivel < $totalNiveis) ? 'border-bottom: 1px solid #ddd;' : '';
                                        ?>
                                            <details class="espera-group espera-accordion" style="padding: 5px 0; <?php echo $borderStyle; ?>" open>
                                                <summary class="espera-group-title">
                                                    <strong><?php echo htmlspecialchars($nivel ?: 'Sem Motivo'); ?></strong>
                                                    <span><?php echo $numChamados; ?> atendimento<?php echo $numChamados == 1 ? '' : 's'; ?></span>
                                                </summary>

                                                <div class="espera-list">
                                                    <?php
                                                    $atendimentosPorTecnico = [];
                                                    foreach ($atendimentos as $atendimento) {
                                                        $nomeTecnico = !empty($atendimento['user_nome']) ? $atendimento['user_nome'] : 'Sem Tecnico';
                                                        if (!isset($atendimentosPorTecnico[$nomeTecnico])) {
                                                            $atendimentosPorTecnico[$nomeTecnico] = [];
                                                        }
                                                        $atendimentosPorTecnico[$nomeTecnico][] = $atendimento;
                                                    }
                                                    ?>

                                                    <?php foreach ($atendimentosPorTecnico as $nomeTecnico => $atendimentosTecnico) : ?>
                                                            <?php $nomeTecnicoFiltro = htmlspecialchars(disponibilidadeFiltroTexto($nomeTecnico)); ?>
                                                            <?php if (count($atendimentosTecnico) > 1) : ?>
                                                                <details class="espera-tech-accordion" data-tecnico="<?php echo $nomeTecnicoFiltro; ?>" open>
                                                                <summary class="espera-tech-title">
                                                                    <span><?php echo htmlspecialchars($nomeTecnico); ?></span>
                                                                    <span><?php echo count($atendimentosTecnico); ?> chamados</span>
                                                                </summary>
                                                                <div class="espera-tech-list">
                                                                    <?php foreach ($atendimentosTecnico as $atendimento) : ?>
                                                                        <?php
                                                                        $tarefaId = $atendimento['tarefa_id'];
                                                                        $descricaoEspera = trim((string)($atendimento['ultima_desc'] ?? ''));
                                                                        $descricaoEspera = $descricaoEspera !== '' ? $descricaoEspera : 'Sem descricao informada.';
                                                                        $qtdeEspera = (int)($atendimento['qtde_espera'] ?? 0);
                                                                        $tooltipEspera = $atendimento['tooltip_texto'] ?? 'Desconhecido';
                                                                        ?>
                                                                            <div class="espera-row espera-row-compact" data-tecnico="<?php echo $nomeTecnicoFiltro; ?>">
                                                                            <div class="espera-atendimento">
                                                                                <form action="../atd.php" method="POST" id="form-atendimento-espera-row-<?php echo htmlspecialchars($tarefaId); ?>" style="display: inline;">
                                                                                    <input type="hidden" name="atd" value="<?php echo htmlspecialchars($tarefaId); ?>">
                                                                                    <a href="#" onclick="document.getElementById('form-atendimento-espera-row-<?php echo htmlspecialchars($tarefaId); ?>').submit();" data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?php echo htmlspecialchars($tooltipEspera); ?>" class="custom-tooltip atendimento-chip">
                                                                                        <?php echo htmlspecialchars($tarefaId); ?>
                                                                                    </a>
                                                                                </form>
                                                                            </div>
                                                                            <span class="espera-count"><?php echo $qtdeEspera; ?>x em espera</span>
                                                                            <div class="espera-desc"><?php echo htmlspecialchars($descricaoEspera); ?></div>
                                                                        </div>
                                                                    <?php endforeach; ?>
                                                                </div>
                                                            </details>
                                                        <?php else : ?>
                                                            <?php
                                                            $atendimento = $atendimentosTecnico[0];
                                                            $tarefaId = $atendimento['tarefa_id'];
                                                            $descricaoEspera = trim((string)($atendimento['ultima_desc'] ?? ''));
                                                            $descricaoEspera = $descricaoEspera !== '' ? $descricaoEspera : 'Sem descricao informada.';
                                                            $qtdeEspera = (int)($atendimento['qtde_espera'] ?? 0);
                                                            $tooltipEspera = $atendimento['tooltip_texto'] ?? 'Desconhecido';
                                                            ?>
                                                                <div class="espera-row" data-tecnico="<?php echo $nomeTecnicoFiltro; ?>">
                                                                <div class="espera-tecnico"><?php echo htmlspecialchars($nomeTecnico); ?></div>
                                                                <div class="espera-atendimento">
                                                                    <form action="../atd.php" method="POST" id="form-atendimento-espera-row-<?php echo htmlspecialchars($tarefaId); ?>" style="display: inline;">
                                                                        <input type="hidden" name="atd" value="<?php echo htmlspecialchars($tarefaId); ?>">
                                                                        <a href="#" onclick="document.getElementById('form-atendimento-espera-row-<?php echo htmlspecialchars($tarefaId); ?>').submit();" data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?php echo htmlspecialchars($tooltipEspera); ?>" class="custom-tooltip atendimento-chip">
                                                                            <?php echo htmlspecialchars($tarefaId); ?>
                                                                        </a>
                                                                    </form>
                                                                </div>
                                                                <span class="espera-count"><?php echo $qtdeEspera; ?>x em espera</span>
                                                                <div class="espera-desc"><?php echo htmlspecialchars($descricaoEspera); ?></div>
                                                            </div>
                                                        <?php endif; ?>
                                                    <?php endforeach; ?>
                                                </div>

                                                <?php
                                                // 1. Agrupar atendimentos por técnico e CRIAR UM MAPA DE DADOS para acesso rápido
                                                $tecnicos = [];
                                                $dadosTarefas = []; // Array auxiliar para não precisar fazer loop dentro de loop

                                                foreach ($atendimentos as $atendimento) {
                                                    // Correção de segurança: Se não tiver nome, usa "Sem Técnico"
                                                    $nomeTecnico = !empty($atendimento['user_nome']) ? $atendimento['user_nome'] : 'Sem Técnico';
                                                    $idTarefa = $atendimento['tarefa_id'];

                                                    if ($idTarefa) {
                                                        $tecnicos[$nomeTecnico][] = $idTarefa;

                                                        // Salva os dados num array indexado pelo ID para acesso instantâneo depois
                                                        $dadosTarefas[$idTarefa] = [
                                                            'tooltip' => $atendimento['tooltip_texto'] ?? "Desconhecido",
                                                            'qtde_espera' => $atendimento['qtde_espera'] ?? 0,
                                                            'descricao' => trim((string)($atendimento['ultima_desc'] ?? ''))
                                                        ];
                                                    }
                                                }
                                                ?>

                                                <ul style="margin: 0; padding-left: 15px;">
                                                    <?php foreach ($tecnicos as $tecnico => $tarefa_ids) : ?>
                                                        <li style="margin-left: 1px; padding-left: 0px;">
                                                            <strong><?php echo htmlspecialchars($tecnico); ?>:</strong>

                                                            <?php foreach ($tarefa_ids as $tarefaId) :
                                                                // Busca direta sem precisar de loop (performance muito melhor)
                                                                $dados = $dadosTarefas[$tarefaId];
                                                            ?>
                                                                <span class="atendimento-container">
                                                                    <form action="../atd.php" method="POST" id="form-atendimento-espera-<?php echo htmlspecialchars($tarefaId); ?>" style="display: inline;">
                                                                        <input type="hidden" name="atd" value="<?php echo htmlspecialchars($tarefaId); ?>">
                                                                        <a href="#" onclick="document.getElementById('form-atendimento-espera-<?php echo htmlspecialchars($tarefaId); ?>').submit();" style="font-size: 1em; color: black; padding: 3px;" data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?php echo $dados['tooltip']; ?>" class="custom-tooltip">
                                                                            <?php echo htmlspecialchars($tarefaId); ?>
                                                                        </a>
                                                                    </form>

                                                                    <?php if ($dados['qtde_espera'] > 1) : ?>
                                                                        <span class="alerta-espera"><?php echo $dados['qtde_espera']; ?></span>
                                                                    <?php endif; ?>
                                                                </span>
                                                                <span class="espera-desc"><?php echo htmlspecialchars($dados['descricao'] !== '' ? $dados['descricao'] : 'Sem descrição informada.'); ?></span>
                                                            <?php endforeach; ?>
                                                        </li>
                                                    <?php endforeach; ?>
                                                </ul>
                                            </details>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>


                            <!-- Card CONCLUÍDOS HOJE -->
                            <div class="col-md-3" style="padding-left: 0px; padding-right: 0px; display: flex; flex-direction: column;">
                                <div class="card" style="flex-grow: 1; overflow-x: hidden; overflow-y: hidden;">
                                    <div class="card-header py-1">
                                        <i class="fas fa-check-circle" style="padding-right: 7px; color: green;"></i> Atendimentos Concluídos Hoje: <?php echo $numFinalizadosHoje; ?>
                                    </div>
                                    <div class="card-body atd-list">
                                        <div style="color:black;">
                                            <?php
                                            // var_dump($dadosTecnicos['concluidosAgrupados']);
                                            if (empty($dadosTecnicos['concluidosAgrupados'])) {
                                                echo '<div class="empty-panel">Nenhum atendimento concluído hoje.</div>';
                                            }
                                            foreach ($dadosTecnicos['concluidosAgrupados'] as $user_id => $tecnico) {
                                                echo '<div class="tecnico-item tecnico-concluido">';
                                                echo '<li style="margin-left: 1px; padding-left: 0px;">';
                                                echo '<span style="font-weight: bold;">' . htmlspecialchars($tecnico['user_nome']) . ' (' . count($tecnico['tarefas']) . ')</span>';
                                                echo '<div class="ids-list" style="color:black;">';

                                                foreach ($tecnico['tarefas'] as $tarefa) {
                                                    $tarefaId = $tarefa['tarefa_id'];
                                                    $tipoTexto = isset($tarefa['tipo']) ? htmlspecialchars($tarefa['tipo']) : "Desconhecido";


                                                    // Exibir cada tarefa com tooltip
                                                    echo '<form action="../atd.php" method="POST" id="form-atendimento-' . $tarefaId . '" style="display: inline;">
                                                    <input type="hidden" name="atd" value="' . htmlspecialchars($tarefaId) . '">
                                                    <a href="#"
                                                        onclick="document.getElementById(\'form-atendimento-' . $tarefaId . '\').submit();"
                                                            style="font-size: 1em; color: black; padding: 3px;"
                                                            data-bs-toggle="tooltip"
                                                            data-bs-placement="top"
                                                            data-html="true"
                                                            title="' . $tarefa['tooltip_texto'] . '"
                                                            class="custom-tooltip">
                                                            ' . htmlspecialchars($tarefaId) . '
                                                            </a>
                                                        </form>';
                                                }
                                                echo '</div>';
                                                echo '</div>';
                                            }
                                            ?>
                                        </div>
                                    </div>
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
        // Controlar a seleção/desmarcação de todos os técnicos com o checkbox "Selecionar Todos"
        document.addEventListener("DOMContentLoaded", function() {
            var selectAllCheckbox = document.getElementById('select-all-checkbox');
            var tecnicoCheckboxes = document.querySelectorAll('.tecnico-checkbox');
            if (!selectAllCheckbox) {
                return;
            }

            selectAllCheckbox.addEventListener('change', function() {
                Array.prototype.forEach.call(tecnicoCheckboxes, function(checkbox) {
                    checkbox.checked = selectAllCheckbox.checked;
                });
            });
        });
    </script>


    <script>
        document.addEventListener("DOMContentLoaded", function() {
            var tabs = Array.prototype.slice.call(document.querySelectorAll('.availability-tab'));
            var filters = Array.prototype.slice.call(document.querySelectorAll('.attendance-filter'));
            var filterBar = document.getElementById('attendanceFilters');
            var reportButton = document.getElementById('btnRelatorioEspera');
            var esperaTecnicoFilter = document.getElementById('esperaTecnicoFilter');
            var esperaTecnicoFilterWrap = document.getElementById('esperaTecnicoFilterWrap');
            var grid = document.getElementById('availabilityGrid');
            var columns = Array.prototype.slice.call(document.querySelectorAll('#availabilityGrid > [class*="col-"]'));
            var cards = Array.prototype.slice.call(document.querySelectorAll('#availabilityGrid > [class*="col-"] > .card'));

            function cardType(card) {
                var header = card.querySelector('.card-header');
                var text = header ? header.textContent.toLowerCase() : '';
                if (text.indexOf('livres') !== -1) return 'tecnicos';
                if (text.indexOf('ocupados') !== -1) return 'tecnicos';
                if (text.indexOf('fila') !== -1) return 'fila';
                if (text.indexOf('execu') !== -1) return 'execucao';
                if (text.indexOf('agendados') !== -1) return 'agendados';
                if (text.indexOf('espera') !== -1) return 'espera';
                if (text.indexOf('conclu') !== -1) return 'concluidos';
                return 'atendimentos';
            }

            function activeFilter() {
                var active = document.querySelector('.attendance-filter.is-active');
                return active ? active.getAttribute('data-atd-filter') : 'todos';
            }

            function syncColumns() {
                columns.forEach(function(column) {
                    var visibleCards = Array.prototype.slice.call(column.querySelectorAll('.card')).filter(function(card) {
                        return !card.classList.contains('is-hidden');
                    });
                    column.classList.toggle('is-hidden', visibleCards.length === 0);
                });
            }

            function applyEsperaTecnicoFilter() {
                var selectedTech = esperaTecnicoFilter ? esperaTecnicoFilter.value : '';
                var esperaCard = cards.filter(function(card) {
                    return cardType(card) === 'espera';
                })[0];

                if (!esperaCard) {
                    return;
                }

                Array.prototype.forEach.call(esperaCard.querySelectorAll('.espera-row, .espera-tech-accordion'), function(item) {
                    var itemTech = item.getAttribute('data-tecnico') || '';
                    var shouldHide = selectedTech !== '' && itemTech !== selectedTech;
                    item.classList.toggle('espera-filter-hidden', shouldHide);
                });

                Array.prototype.forEach.call(esperaCard.querySelectorAll('.espera-group'), function(group) {
                    var visibleRows = group.querySelectorAll('.espera-row:not(.espera-filter-hidden)');
                    group.classList.toggle('espera-filter-hidden', selectedTech !== '' && visibleRows.length === 0);
                });
            }

            function showTab(tabName) {
                var currentFilter = activeFilter();
                if (grid) {
                    grid.setAttribute('data-active-tab', tabName);
                    grid.setAttribute('data-active-filter', tabName === 'atendimentos' ? currentFilter : '');
                }

                if (filterBar) {
                    filterBar.style.display = tabName === 'atendimentos' ? '' : 'none';
                }

                if (esperaTecnicoFilterWrap) {
                    esperaTecnicoFilterWrap.classList.toggle('is-hidden', tabName !== 'atendimentos' || currentFilter !== 'espera');
                }

                cards.forEach(function(card) {
                    var type = cardType(card);
                    var isTech = type === 'tecnicos';
                    var matchesFilter = currentFilter === 'todos' || type === currentFilter;
                    var show = tabName === 'tecnicos' ? isTech : !isTech && matchesFilter;
                    card.classList.toggle('is-hidden', !show);
                });

                applyEsperaTecnicoFilter();
                syncColumns();
            }

            tabs.forEach(function(tab) {
                tab.addEventListener('click', function() {
                    tabs.forEach(function(item) {
                        item.classList.remove('is-active');
                    });
                    tab.classList.add('is-active');
                    showTab(tab.getAttribute('data-tab-target'));
                });
            });

            filters.forEach(function(filter) {
                filter.addEventListener('click', function() {
                    filters.forEach(function(item) {
                        item.classList.remove('is-active');
                    });
                    filter.classList.add('is-active');
                    showTab('atendimentos');
                });
            });

            if (reportButton) {
                reportButton.addEventListener('click', function() {
                    filters.forEach(function(item) {
                        item.classList.toggle('is-active', item.getAttribute('data-atd-filter') === 'espera');
                    });
                    showTab('atendimentos');
                    window.location.href = 'relatorio_espera_pdf.php';
                });
            }

            if (esperaTecnicoFilter) {
                esperaTecnicoFilter.addEventListener('change', applyEsperaTecnicoFilter);
            }

            showTab('atendimentos');
        });
    </script>


    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function(tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl, {
                    customClass: 'custom-tooltip', // Classe customizada
                    boundary: 'window' // Limita ao viewport
                });
            });
        });
    </script>



    <script>
        setTimeout(function() {
            window.location.href = 'index.php';
        }, 60000, ); // 1000 milissegundos = 1 segundo
    </script>


</body>

</html>
