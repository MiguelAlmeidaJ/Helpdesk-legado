<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m8_00 == 0) {
    header("Location: ../home.php");
}

// Definindo dos status dos atendimentos
// 0 == agendado
// 1 == aguardando execução
// 2 == em execução
// 3 == em espera
// 4 == finalizado
// 5 == concluído

function loadTecnicos($pdo)
{
    // Consulta para obter todos os tecnicos e analistas ativos
    $stmtTodos = $pdo->prepare("SELECT user_id, user_nome, user_funcao, user_sts FROM usuarios WHERE user_sts = 1 AND usuarios.user_funcao IN (5, 6, 10, 12, 14)
");
    $stmtTodos->execute();

    $todosTecnicos = $stmtTodos->fetchAll(PDO::FETCH_ASSOC);


    // Agrupar tecnicos por setor
    // $ti = [];
    // $devops = [];

    // foreach ($todosTecnicos as $tecnico) {
    //     if (in_array($tecnico['user_funcao'], [5, 6])) {
    //         $ti[] = $tecnico;
    //     } elseif (in_array($tecnico['user_funcao'], [10, 12, 14])) {
    //         $devops[] = $tecnico;
    //     }
    // }


    // Consulta para obter tecnicos e analistas com tarefas em execução (status = 2) e suas tarefas
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


    // Extraindo os tecnicos ocupados para ordena-los pelo nome
    $tecnicosOrdenar = [];
    foreach ($ocupadosAgrupados as $user_id => $dados) {
        $tecnicosOrdenar[] = [
            'user_id' => $user_id,
            'user_nome' => $dados['user_nome'],
            'user_funcao' => $dados['user_funcao'],
            'id' => $dados['id']
        ];
    }

    // Ordenar os tecnicos ocupados pelo nome
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

    // Filtrar tecnicos livres (não ocupados)
    $tecnicosLivres = [];
    foreach ($todosTecnicos as $tecnico) {
        if (!isset($ocupadosAgrupados[$tecnico['user_id']]) && $tecnico['user_id'] !== 1) {
            $tecnicosLivres[] = $tecnico;
        }
    }

    //ALTERAÇÃO PARA HABILITAR OU DESABILITAR TECNICO DISPONIVEL

    // Aplicar filtro de seleção dos tecnicos disponíveis
    if (isset($_SESSION['tecnicos_selecionados'])) {
        $tecnicosSelecionados = $_SESSION['tecnicos_selecionados'];
        $tecnicosLivres = array_filter($tecnicosLivres, function ($tecnico) use ($tecnicosSelecionados) {
            return in_array($tecnico['user_id'], $tecnicosSelecionados);
        });
    }

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
        COALESCE(usuarios.user_nome, 'Sem Tecnico') AS user_nome,
        COALESCE(usuarios.user_funcao, 'N/A') AS user_funcao,
        atendimentos.id AS tarefa_id,
        atendimentos.tipo AS tipo_atendimento,
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
    COALESCE(usuarios.user_nome, 'Sem Tecnico') AS user_nome,
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

    // Filtrar tecnicos e contar tarefas agendadas
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

    // Ordenar tecnicos pelo nome
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
        ORDER BY espera_start DESC LIMIT 1) AS ultima_causa
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

// Salvar a seleção dos tecnicos disponíveis na sessão
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $_SESSION['tecnicos_selecionados'] = isset($_POST['tecnicos']) ? $_POST['tecnicos'] : [];
    header("Location: " . $_SERVER['PHP_SELF']);
    exit;
}

//ALTERAÇÃO PARA HABILITAR OU DESABILITAR TECNICO DISPONIVEL


// Obtém os dados dos tecnicos
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
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/help.css">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="../css/bootstrap-select.min.css">
    <link rel="stylesheet" href="../css/timeline.css">
    <link rel="stylesheet" href="../css/bootstrap-datetimepicker.min.css">
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">

    <title>Allterus</title>

    <style>
        .card {
            font-family: "Helvetica Neue", Arial, sans-serif !important;
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
            margin: 10px;
            margin-left: 10px;
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

        .id-item {
            margin-right: 10px;
        }

        .card {
            margin: 5px;
            margin-left: 5px;
            margin-right: 5px;
            border: 1px solid #ccc;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        .card-header {
            background-color: #f8f9fa;
            padding: 10px;
            font-size: 1.25em;
            border-bottom: 1px solid #ccc;
        }



        .card-header .atendimentos {
            float: right;
            font-size: 0.9em;
            /* Ajuste conforme necessário */
            padding-left: 10px;
        }

        .card-body {
            padding: 10px;
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


        .dropdown-menu.dropdown-visualizar {
            position: absolute;
            top: 100%;
            /* Logo abaixo do botão */
            right: 0;
            /* Alinha à direita do botão */
            width: 200px;
            /* Define largura */
            padding: 10px;
            /* Espaçamento interno */
            background-color: #fff;
            /* Fundo branco */
            border: 1px solid #ccc;
            /* Borda leve */
            border-radius: 5px;
            /* Bordas arredondadas */
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            /* Adiciona sombra */
            z-index: 1000;
            /* Garante que esteja acima de outros elementos */
        }


        body {
            zoom: 0.9;
            width: 100%;
            overflow-x: hidden;
        }


        .atendimento-container {
            position: relative;
            display: inline-block;
            padding-right: 5px;
        }

        .alerta-espera {
            position: absolute;
            top: -10px;
            right: -8px;
            background-color: #dc3545;
            color: white;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            font-size: 10px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
        }

        /* Adiciona um espaçamento vertical (entre as linhas dos tecnicos) */
        .atd-list ul li {
            margin-bottom: 9px;
            /* Aumenta o espaço abaixo de cada linha de técnico */
            line-height: 1.6;
            /* Melhora a legibilidade do texto na linha */
        }

        /* Adiciona um espaçamento horizontal (entre os números de atendimento) */
        .atendimento-container {
            margin-right: 10px;
            /* Aumenta o espaço à direita de cada número de chamado */
            margin-bottom: 5px;
            /* Adiciona um pequeno espaço vertical para quebra de linha */
        }

        /* 3. (Opcional) Adiciona um espaçamento maior entre os grupos (Nivel3, Cliente, etc) */
        /* .atd-list>div[style*="border-bottom"] {
            margin-bottom: 15px;
            padding-bottom: 15px;
        } */
    </style>

</head>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid">
        <div class="row">
            <div class="col-md-12" style="padding-right: 0px; padding-left: 0px">
                <div class="card" style="overflow-x: hidden; overflow-y: hidden; min-height: 555px">
                    <div class="card-header py-1">
                        <i class="fas fa-users"></i> Disponibilidade Técnica
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




                            <button type="button" class="btn btn-secondary btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="width: 200px">
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

                                    <!-- Lista de tecnicos -->
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

                    <div class="card-body col-md-12" style="margin-top: -10px;">
                        <div class="row">
                            <div class="col-md-3" style="padding-left: 5px; padding-right: 0px">

                                <!-- card tecnicos livres -->
                                <div class="card" style="overflow-x: hidden; overflow-y: hidden; min-height: 250px">
                                    <div class="card-header py-1">
                                        <i class="fa fa-thumbs-up" style="padding-right: 7px;"></i> Tecnicos livres: <?php echo $numTecnicosLivres; ?>
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
                                        <div style="color:black;">
                                            <?php
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
                                                        echo '<form action="atd.php" method="POST" id="form-atendimento-' . $tarefaId . '" style="display: inline;">
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
                                </div>
                                <!-- Card AGENDADOS -->
                                <div class="card mt-3" style="overflow-x: hidden; overflow-y: hidden; min-height: 80px">
                                    <div class="card-header py-1">
                                        <i class="fas fa-calendar-alt" style="padding-right: 7px;"></i> Atendimentos Agendados: <?php echo $numAtendimentosAgendados; ?>
                                    </div>
                                    <div class="card-body atd-list">
                                        <div style="color:black;">
                                            <?php
                                            // Iterar pelos tecnicos
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
                                                    echo '<form action="atd.php" method="POST" id="form-atendimento-agendado-' . $tarefaId . '" style="display: inline;">
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
                                        <i class="fas fa-thumbs-down" style="padding-right: 7px;"></i> Tecnicos Ocupados: <?php echo $numTecnicosOcupados; ?>
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

                                                    echo '<form action="atd.php" method="POST" id="form-atendimento-ocupado' . $tarefaId . '" style="display: inline;">
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
                            <div class="col-md-3" style="padding-left: 0px; padding-right: 0px; display: flex; flex-direction: column;">
                                <div class="card" style="flex-grow: 1; overflow-x: hidden; overflow-y: hidden;">
                                    <div class="card-header py-1">
                                        <i class="fas fa-pause-circle" style="padding-right: 7px; color: orange;"></i> Atendimentos Em Espera: <?php echo $numAtendimentosEspera; ?>
                                    </div>
                                    <div class="card-body atd-list">
                                        <div style="color:black;">
                                            <?php
                                            $totalNiveis = count($dadosTecnicos['esperaAgrupada']);
                                            $currentNivel = 0;

                                            foreach ($dadosTecnicos['esperaAgrupada'] as $nivel => $atendimentos) :
                                                $currentNivel++;
                                                $numChamados = count($atendimentos);
                                                $borderStyle = ($currentNivel < $totalNiveis) ? 'border-bottom: 1px solid #ddd;' : '';
                                            ?>
                                                <div style="padding: 5px 0; <?php echo $borderStyle; ?>">
                                                    <strong><?php echo htmlspecialchars($nivel ?: 'Sem Motivo'); ?> (<?php echo $numChamados; ?>):</strong><br>

                                                    <?php
                                                    // 1. Agrupar atendimentos por técnico e CRIAR UM MAPA DE DADOS para acesso rápido
                                                    $tecnicos = [];
                                                    $dadosTarefas = []; // Array auxiliar para não precisar fazer loop dentro de loop

                                                    foreach ($atendimentos as $atendimento) {
                                                        // Correção de segurança: Se não tiver nome, usa "Sem Tecnico"
                                                        $nomeTecnico = !empty($atendimento['user_nome']) ? $atendimento['user_nome'] : 'Sem Tecnico';
                                                        $idTarefa = $atendimento['tarefa_id'];

                                                        if ($idTarefa) {
                                                            $tecnicos[$nomeTecnico][] = $idTarefa;

                                                            // Salva os dados num array indexado pelo ID para acesso instantâneo depois
                                                            $dadosTarefas[$idTarefa] = [
                                                                'tooltip' => $atendimento['tooltip_texto'] ?? "Desconhecido",
                                                                'qtde_espera' => $atendimento['qtde_espera'] ?? 0
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
                                                                        <form action="atd.php" method="POST" id="form-atendimento-espera-<?php echo htmlspecialchars($tarefaId); ?>" style="display: inline;">
                                                                            <input type="hidden" name="atd" value="<?php echo htmlspecialchars($tarefaId); ?>">
                                                                            <a href="#" onclick="document.getElementById('form-atendimento-espera-<?php echo htmlspecialchars($tarefaId); ?>').submit();" style="font-size: 1em; color: black; padding: 3px;" data-bs-toggle="tooltip" data-bs-placement="top" data-html="true" title="<?php echo $dados['tooltip']; ?>" class="custom-tooltip">
                                                                                <?php echo htmlspecialchars($tarefaId); ?>
                                                                            </a>
                                                                        </form>

                                                                        <?php if ($dados['qtde_espera'] > 1) : ?>
                                                                            <span class="alerta-espera"><?php echo $dados['qtde_espera']; ?></span>
                                                                        <?php endif; ?>
                                                                    </span>
                                                                <?php endforeach; ?>
                                                            </li>
                                                        <?php endforeach; ?>
                                                    </ul>
                                                </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <!-- Card CONCLUÍDOS HOJE -->
                            <div class="col-md-3" style="padding-left: 0px; padding-right: 0px; display: flex; flex-direction: column;">
                                <div class="card" style="flex-grow: 1; overflow-x: hidden; overflow-y: hidden;">
                                    <div class="card-header py-1">
                                        <i class="fas fa-check-circle" style="padding-right: 7px; color: green;"></i> Atendimentos Concluidos Hoje: <?php echo $numFinalizadosHoje; ?>
                                    </div>
                                    <div class="card-body atd-list">
                                        <div style="color:black;">
                                            <?php
                                            // var_dump($dadosTecnicos['concluidosAgrupados']);
                                            foreach ($dadosTecnicos['concluidosAgrupados'] as $user_id => $tecnico) {
                                                echo '<div class="tecnico-item tecnico-concluido">';
                                                echo '<li style="margin-left: 1px; padding-left: 0px;">';
                                                echo '<span style="font-weight: bold;">' . htmlspecialchars($tecnico['user_nome']) . ' (' . count($tecnico['tarefas']) . ')</span>';
                                                echo '<div class="ids-list" style="color:black;">';

                                                foreach ($tecnico['tarefas'] as $tarefa) {
                                                    $tarefaId = $tarefa['tarefa_id'];
                                                    $tipoTexto = isset($tarefa['tipo']) ? htmlspecialchars($tarefa['tipo']) : "Desconhecido";


                                                    // Exibir cada tarefa com tooltip
                                                    echo '<form action="atd.php" method="POST" id="form-atendimento-' . $tarefaId . '" style="display: inline;">
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
        // Controlar a seleção/desmarcação de todos os tecnicos com o checkbox "Selecionar Todos"
        document.addEventListener("DOMContentLoaded", function() {
            const selectAllCheckbox = document.getElementById('select-all-checkbox');
            const tecnicoCheckboxes = document.querySelectorAll('.tecnico-checkbox');

            selectAllCheckbox.addEventListener('change', function() {
                tecnicoCheckboxes.forEach(checkbox => {
                    checkbox.checked = selectAllCheckbox.checked;
                });
            });
        });
    </script>


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



    <script>
        setTimeout(function() {
            window.location.href = '../atd/disponibilidadeTec.php';
        }, 60000, ); // 1000 milissegundos = 1 segundo
    </script>


</body>

</html>