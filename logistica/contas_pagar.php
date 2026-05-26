<?php
// ARQUIVO ATUALIZADO NOVO FINANCEIRO

session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// if ($m9_03 < 1) { header("Location: ../home.php"); exit; }

$pdo = ConnectionN3();
$mensagem = '';

$action = $_POST['action'] ?? $_GET['action'] ?? '';





// --- ADICIONAR CONTA A PAGAR ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add_conta_pagar') {

    if (empty($_POST['descricao']) || empty($_POST['fornecedor']) || empty($_POST['valor']) || empty($_POST['data_vencimento']) || empty($_POST['unidade_negocio']) || empty($_POST['id_grupo']) || empty($_POST['id_subgrupo']) || empty($_POST['id_classificacao'] || empty($_POST['id_tipo_documento']))) {
        $_SESSION['mensagem_erro'] = 'Erro: Campos obrigatórios (Descrição, Valor, Vencimento, Grupo, Subgrupo, Classificação) não foram preenchidos.';
        header("Location: contas_pagar.php");
        exit;
    }

    $pdo->beginTransaction();
    try {
        $descricao = $_POST['descricao'];
        $valor = str_replace(',', '.', $_POST['valor']);
        $dataVencimento = $_POST['data_vencimento'];
        $fornecedor = $_POST['fornecedor'];
        $unidadeNegocio = $_POST['unidade_negocio'];
        $id_grupo = $_POST['id_grupo'];
        $id_subgrupo = $_POST['id_subgrupo'];
        $id_classificacao = $_POST['id_classificacao'];
        $id_tipo_documento = empty($_POST['id_tipo_documento']) ? null : $_POST['id_tipo_documento'];
        $id_usuario_logado = $_SESSION['allterusN3Id'];
        $salvar_recorrencia = isset($_POST['salvar_recorrencia']) && $_POST['salvar_recorrencia'] == '1';


        $sql = "INSERT INTO contas_pagar (descricao, fornecedor, valor, data_vencimento, unidade_negocio, id_grupo, id_subgrupo, id_classificacao, id_tipo_documento, id_usuario, status)
                VALUES (:descricao, :fornecedor, :valor, :data_vencimento, :unidade_negocio, :id_grupo, :id_subgrupo, :id_classificacao, :id_tipo_documento, :id_usuario, 'Pendente')";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':descricao' => $descricao,
            ':fornecedor' => $fornecedor,
            ':valor' => $valor,
            ':data_vencimento' => $dataVencimento,
            ':unidade_negocio' => $unidadeNegocio,
            ':id_grupo' => $id_grupo,
            ':id_subgrupo' => $id_subgrupo,
            ':id_classificacao' => $id_classificacao,
            ':id_tipo_documento' => $id_tipo_documento,
            ':id_usuario' => $id_usuario_logado
        ]);

        $lastId = $pdo->lastInsertId();

        if ($salvar_recorrencia) {

            $paramsRecorrencia = [
                ':id_conta_origem' => $lastId,
                ':tipo' => 'Pagar',
                ':id_cliente' => null,
                ':fornecedor_padrao' => $fornecedor,
                ':descricao_padrao' => $descricao,
                ':valor_padrao' => $valor,
                ':dia_vencimento' => date('d', strtotime($dataVencimento)),
                ':id_usuario' => $id_usuario_logado,
                ':ativo' => 1,
                ':unidade_negocio_padrao' => $unidadeNegocio,
                ':id_grupo_padrao' => $id_grupo,
                ':id_subgrupo_padrao' => $id_subgrupo,
                ':id_classificacao_padrao' => $id_classificacao,
                ':id_tipo_documento' => $id_tipo_documento,
                ':percentual_ti_padrao' => null,
                ':percentual_devops_padrao' => null,
                ':percentual_marketing_padrao' => null
            ];

            $insertRecSql = "INSERT INTO recorrencias (
                id_conta_origem, tipo, id_cliente, fornecedor_padrao, descricao_padrao, valor_padrao, dia_vencimento, id_usuario, ativo,
                unidade_negocio_padrao, id_grupo_padrao, id_subgrupo_padrao, id_classificacao_padrao, id_tipo_documento,
                percentual_ti_padrao, percentual_devops_padrao, percentual_marketing_padrao
            ) VALUES (
                :id_conta_origem, :tipo, :id_cliente, :fornecedor_padrao, :descricao_padrao, :valor_padrao, :dia_vencimento, :id_usuario, :ativo,
                :unidade_negocio_padrao, :id_grupo_padrao, :id_subgrupo_padrao, :id_classificacao_padrao, :id_tipo_documento,
                :percentual_ti_padrao, :percentual_devops_padrao, :percentual_marketing_padrao
            )";



            $pdo->prepare($insertRecSql)->execute($paramsRecorrencia);
        }


        $pdo->commit();
        $_SESSION['mensagem_sucesso'] = 'Despesa lançada com sucesso!';
    } catch (Exception $e) {
        $pdo->rollBack();
        $_SESSION['mensagem_erro'] = 'Erro ao lançar despesa: ' . $e->getMessage();
    }
    header("Location: contas_pagar.php");
    exit;
}


// --- EDITAR CONTA A PAGAR ---
if ($action === 'edit_conta_pagar' && $_SERVER['REQUEST_METHOD'] === 'POST') {

    if (empty($_POST['descricao']) || empty($_POST['fornecedor']) || empty($_POST['valor']) || empty($_POST['data_vencimento']) || empty($_POST['unidade_negocio']) || empty($_POST['id_grupo']) || empty($_POST['id_subgrupo']) || empty($_POST['id_classificacao'] || empty($_POST['id_tipo_documento']))) {
        $_SESSION['mensagem_erro'] = 'Erro: Campos obrigatórios (Descrição, Valor, Vencimento, Grupo, Subgrupo, Classificação) não foram preenchidos.';
        header("Location: contas_pagar.php");
        exit;
    }


    $pdo->beginTransaction();
    try {
        $id_conta_pagar = $_POST['id'];
        $descricao = $_POST['descricao'];
        $valor = str_replace(',', '.', $_POST['valor']);
        $dataVencimento = $_POST['data_vencimento'];
        $fornecedor = $_POST['fornecedor'];
        $unidadeNegocio = $_POST['unidade_negocio'];
        $id_grupo = $_POST['id_grupo'];
        $id_subgrupo = $_POST['id_subgrupo'];
        $id_classificacao = $_POST['id_classificacao'];
        $id_tipo_documento = empty($_POST['id_tipo_documento']) ? null : $_POST['id_tipo_documento'];
        $id_usuario_logado = $_SESSION['allterusN3Id'];
        $salvar_recorrencia = isset($_POST['editar_recorrencia']);

        $sql = "UPDATE contas_pagar SET descricao=?, fornecedor=?, valor=?, data_vencimento=?, unidade_negocio=?, id_grupo=?, id_subgrupo=?, id_classificacao=?, id_tipo_documento=?, id_usuario=? WHERE id=?";
        $pdo->prepare($sql)->execute([
            $descricao, $fornecedor, $valor, $dataVencimento, $unidadeNegocio, $id_grupo, $id_subgrupo,
            $id_classificacao, $id_tipo_documento, $id_usuario_logado, $id_conta_pagar
        ]);

        $stmtRec = $pdo->prepare("SELECT id FROM recorrencias WHERE id_conta_origem = ? AND tipo = 'Pagar'");
        $stmtRec->execute([$id_conta_pagar]);
        $recorrenciaExistente = $stmtRec->fetch(PDO::FETCH_ASSOC);

        $paramsRecorrencia = [
            ':fornecedor_padrao' => $fornecedor,
            ':descricao_padrao' => $descricao,
            ':valor_padrao' => $valor,
            ':dia_vencimento' => date('d', strtotime($dataVencimento)),
            ':unidade_negocio_padrao' => $unidadeNegocio,
            ':id_grupo_padrao' => $id_grupo,
            ':id_subgrupo_padrao' => $id_subgrupo,
            ':id_classificacao_padrao' => $id_classificacao,
            ':id_tipo_documento' => $id_tipo_documento,
            ':id_usuario' => $id_usuario_logado,
            ':ativo' => 1
        ];

        if ($salvar_recorrencia) {
            if ($recorrenciaExistente) {
                // Se marcou e Já EXISTE, ATUALIZA
                $updateRecSql = "UPDATE recorrencias SET 
                    fornecedor_padrao = :fornecedor_padrao, descricao_padrao = :descricao_padrao, valor_padrao = :valor_padrao, dia_vencimento = :dia_vencimento,
                    unidade_negocio_padrao = :unidade_negocio_padrao, id_grupo_padrao = :id_grupo_padrao, id_subgrupo_padrao = :id_subgrupo_padrao,
                    id_classificacao_padrao = :id_classificacao_padrao, id_tipo_documento = :id_tipo_documento, id_usuario = :id_usuario, ativo = :ativo
                WHERE id = :id";

                $paramsRecorrencia[':id'] = $recorrenciaExistente['id'];
                $pdo->prepare($updateRecSql)->execute($paramsRecorrencia);
            } else {
                // Se marcou e NºO EXISTE, CRIA
                $paramsRecorrencia[':tipo'] = 'Pagar';
                $paramsRecorrencia[':id_contas_pagar_origem'] = $id_conta_pagar;
                $paramsRecorrencia[':id_cliente'] = null;

                $insertRecSql = "INSERT INTO recorrencias (
                    id_conta_origem, tipo, id_cliente, fornecedor_padrao, descricao_padrao, valor_padrao, dia_vencimento, id_usuario, ativo, 
                    unidade_negocio_padrao, id_grupo_padrao, id_subgrupo_padrao, id_classificacao_padrao, id_tipo_documento
                ) VALUES (
                    :id_contas_pagar_origem, :tipo, :id_cliente, :fornecedor_padrao, :descricao_padrao, :valor_padrao, :dia_vencimento, :id_usuario, :ativo, 
                    :unidade_negocio_padrao, :id_grupo_padrao, :id_subgrupo_padrao, :id_classificacao_padrao, :id_tipo_documento
                )";
                $pdo->prepare($insertRecSql)->execute($paramsRecorrencia);
            }
        } else {
            if ($recorrenciaExistente) {
                // Se DESMARCOU e EXISTE, APAGA
                $pdo->prepare("DELETE FROM recorrencias WHERE id = ?")->execute([$recorrenciaExistente['id']]);
            }
        }

        $pdo->commit();
        $_SESSION['mensagem_sucesso'] = 'Despesa atualizada com sucesso!';
    } catch (Exception $e) {
        $pdo->rollBack();
        $_SESSION['mensagem_erro'] = 'Erro ao atualizar despesa: ' . $e->getMessage();
    }
    header("Location: contas_pagar.php");
    exit;
}
// --- DAR BAIXA (PAGAR) ---
if ($action === 'dar_baixa_pagar' && $_SERVER['REQUEST_METHOD'] === 'POST') {

    // var_dump($_POST);
    // exit;
    $idConta = filter_input(INPUT_POST, 'id_conta', FILTER_VALIDATE_INT);
    $dataPagamento = $_POST['data_pagamento'];
    $id_agBancaria = $_POST['id_agBancaria'];
    $observacaoBaixa = $_POST['observacao_baixa'];

    if ($idConta && $dataPagamento) {
        $obs_formatada = "BAIXA: " . $observacaoBaixa;
        $sql = "UPDATE contas_pagar SET status_id = 6, data_pagamento = :data_pagamento, id_agBancaria = :id_agBancaria, observacao = CONCAT_WS('\n\n', observacao, :observacao_baixa) WHERE id = :id_conta";
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute([':data_pagamento' => $dataPagamento, ':id_agBancaria' => $id_agBancaria, ':observacao_baixa' => $obs_formatada, ':id_conta' => $idConta])) {
            $_SESSION['mensagem_sucesso'] = 'Baixa realizada com sucesso!';
        } else {
            $_SESSION['mensagem_erro'] = 'Erro ao dar baixa na conta.';
        }
    } else {
        $_SESSION['mensagem_erro'] = 'Dados inválidos para dar baixa.';
    }
    header("Location: contas_pagar.php");
    exit;
}

// --- EXCLUIR CONTA ---
if ($action === 'excluir_conta' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    if ($id) {
        $sql = "DELETE FROM contas_pagar WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        $_SESSION['mensagem_sucesso'] = 'Despesa excluída com sucesso!';
    } else {
        $_SESSION['mensagem_erro'] = 'Erro ao tentar excluir a despesa.';
    }
    header("Location: contas_pagar.php");
    exit;
}

// --- salvar anexos ---
if ($action === 'salvar_anexos') {

    // Pega os dados do POST
    $contaId = filter_input(INPUT_POST, 'conta_id', FILTER_VALIDATE_INT);
    $anexosJson = $_POST['anexos_json'] ?? '[]';

    // Valida se o ID da conta foi recebido
    if (!$contaId) {
        $_SESSION['mensagem_erro'] = 'Erro: ID da conta não encontrado.';
        header("Location: contas_pagar.php");
        exit;
    }

    // Valida o JSON
    json_decode($anexosJson);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $anexosJson = '[]';
    }

    try {
        // O nome da tabela e o ID são fixos, não precisam de variáveis
        $sql = "UPDATE `contas_pagar` SET anexos = :anexos WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':anexos' => $anexosJson, ':id' => $contaId]);
        $_SESSION['mensagem_sucesso'] = 'Anexos atualizados com sucesso!';
    } catch (PDOException $e) {
        $_SESSION['mensagem_erro'] = 'Erro ao salvar anexos: ' . $e->getMessage();
    }

    // O redirecionamento é sempre para a mesma página
    header("Location: contas_pagar.php");
    exit;
}

$params = [];
$whereConditions = [];



//data inicial e final sendo primeiro e ultimo dia do mes atual
$data_inicial_base = date('Y-m-01');
$data_final_base = date('Y-m-t');

// Filtros (vindos via GET do formulário)
$filtro_status = $_GET['filtro_status'] ?? 'todos';
$filtro_texto = $_GET['filtro_texto'] ?? '';
$filtro_data_inicio = $_GET['filtro_data_inicio'] ?? $data_inicial_base;
$filtro_data_fim = $_GET['filtro_data_fim'] ?? $data_final_base;
$filtro_unid_negocio = $_GET['filtro_unid_negocio'] ?? 'todos';



if ($filtro_unid_negocio !== 'todos') {
    $whereConditions[] = "cp.unidade_negocio = :unid_negocio";
    $params[':unid_negocio'] = $filtro_unid_negocio;
}

// // Lógica do filtro de status
// if ($filtro_status === 'pendente') {
//     $whereConditions[] = "cp.status = 'Pendente'";
// } elseif ($filtro_status === 'pago') {
//     $whereConditions[] = "cp.status = 'Pago'";
// } elseif ($filtro_status === 'vencido') {
//     $whereConditions[] = "cp.status = 'Pendente' AND cp.data_vencimento < CURDATE()";
// }

// Lógica do filtro de status (CORRIGIDA)
if ($filtro_status !== 'todos') {
    $whereConditions[] = "cp.status_id = :status_id";
    $params[':status_id'] = (int)$filtro_status;
}

// Lógica do filtro de texto (busca em várias colunas)
if (!empty($filtro_texto)) {
    $whereConditions[] = "(cp.descricao LIKE :texto OR cp.fornecedor LIKE :texto OR sg.nome LIKE :texto)";
    $params[':texto'] = '%' . $filtro_texto . '%';
}

// Lógica do filtro de data
if (!empty($filtro_data_inicio)) {
    $whereConditions[] = "cp.data_vencimento >= :data_inicio";
    $params[':data_inicio'] = $filtro_data_inicio;
}
if (!empty($filtro_data_fim)) {
    $whereConditions[] = "cp.data_vencimento <= :data_fim";
    $params[':data_fim'] = $filtro_data_fim;
}

// Lógica de Ordenação
$orderBy = $_GET['orderBy'] ?? 'data_vencimento';
$orderDir = $_GET['orderDir'] ?? 'ASC';
$colunasPermitidas = ['descricao', 'valor', 'fornecedor', 'data_vencimento', 'data_pagamento', 'unidade_negocio',  'grupo_nome', 'subgrupo_nome', 'status'];
if (!in_array($orderBy, $colunasPermitidas)) {
    $orderBy = 'data_vencimento'; // Padrão seguro
}
$orderDir = strtoupper($orderDir) === 'DESC' ? 'DESC' : 'ASC'; // Garante que seja ASC ou DESC



if (isset($_SESSION['mensagem_sucesso'])) {
    $mensagem = '<div class="alert alert-success">' . $_SESSION['mensagem_sucesso'] . '</div>';
    unset($_SESSION['mensagem_sucesso']);
}
if (isset($_SESSION['mensagem_erro'])) {
    $mensagem = '<div class="alert alert-danger">' . $_SESSION['mensagem_erro'] . '</div>';
    unset($_SESSION['mensagem_erro']);
}

$grupos = $pdo->query("SELECT * FROM categorias_grupo WHERE status = 1 ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$subgrupos = $pdo->query("SELECT * FROM categorias_subgrupo WHERE status = 1 ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$classificacoes = $pdo->query("SELECT * FROM categorias_classificacao WHERE status = 1 ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$documentos = $pdo->query("SELECT * FROM categorias_tipo_documento WHERE status = 1 ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$unidades_negocio = $pdo->query("SELECT id, nome_unid FROM unidade_negocio WHERE sts_unid = 1 ORDER BY nome_unid ASC")->fetchAll(PDO::FETCH_ASSOC);
$agenciasBancarias = $pdo->query("SELECT * FROM agenciasbancarias  ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
$unidadesNegocio = $pdo->query("SELECT * FROM unidade_negocio WHERE sts_unid = 1")->fetchAll(PDO::FETCH_ASSOC);
$statusContas = $pdo->query("SELECT id, nome FROM status_contas WHERE id IN (1, 4, 6) ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

// Consulta principal com filtros e ordenação
$sql = "
    SELECT 
        cp.*, 
        cp.id AS despesa_id, 
        g.nome AS grupo_nome, 
        sg.nome AS subgrupo_nome, 
        cl.nome AS classificacao_nome, 
        td.nome AS documento_nome, 
        cp.unidade_negocio, 
        un.nome_unid,
        s.id AS status_id,    
        s.nome AS nome_status
    FROM contas_pagar AS cp
    LEFT JOIN unidade_negocio AS un ON cp.unidade_negocio = un.id
    LEFT JOIN categorias_grupo AS g ON cp.id_grupo = g.id
    LEFT JOIN categorias_subgrupo AS sg ON cp.id_subgrupo = sg.id
    LEFT JOIN categorias_classificacao AS cl ON cp.id_classificacao = cl.id
    LEFT JOIN categorias_tipo_documento AS td ON cp.id_tipo_documento = td.id
    LEFT JOIN status_contas AS s ON cp.status_id = s.id
";
if (!empty($whereConditions)) {
    $sql .= " WHERE " . implode(' AND ', $whereConditions);
}

$sql .= " ORDER BY $orderBy $orderDir";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$contas_a_pagar = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Função auxiliar para criar links de ordenação
function sortLink($label, $column, $currentOrderBy, $currentOrderDir)
{
    $newOrderDir = ($currentOrderBy === $column && $currentOrderDir === 'ASC') ? 'DESC' : 'ASC';
    $icon = '';
    if ($currentOrderBy === $column) {
        $icon = $currentOrderDir === 'ASC' ? ' <i class="fas fa-sort-up"></i>' : ' <i class="fas fa-sort-down"></i>';
    }
    // Mantém os filtros atuais na URL
    $queryString = http_build_query(array_merge($_GET, ['orderBy' => $column, 'orderDir' => $newOrderDir]));
    return "<a href=\"?{$queryString}\">{$label}{$icon}</a>";
}



$sqlResumoPagar = "
    SELECT 
        SUM(cp.valor) AS total_a_pagar,
        SUM(CASE WHEN cp.status_id = 6 THEN cp.valor ELSE 0 END) AS total_pago,
        SUM(CASE WHEN cp.status_id = 1 THEN cp.valor ELSE 0 END) AS total_pendente,
        SUM(CASE WHEN cp.status_id = 1 AND cp.data_vencimento < CURDATE() THEN cp.valor ELSE 0 END) AS total_vencido,
        COUNT(CASE WHEN cp.status = 1 AND cp.data_vencimento < CURDATE() THEN 1 ELSE NULL END) AS total_faturas_vencidas,
        COUNT(cp.id) AS total_faturas
    FROM contas_pagar AS cp
    LEFT JOIN unidade_negocio AS un ON cp.unidade_negocio = un.id
    LEFT JOIN categorias_grupo AS g ON cp.id_grupo = g.id
    LEFT JOIN categorias_subgrupo AS sg ON cp.id_subgrupo = sg.id
";
// Reutiliza EXATAMENTE os mesmos filtros da consulta principal
if (!empty($whereConditions)) {
    $sqlResumoPagar .= " WHERE " . implode(' AND ', $whereConditions);
}
$stmtResumo = $pdo->prepare($sqlResumoPagar);
$stmtResumo->execute($params);
$resumoFiltro = $stmtResumo->fetch(PDO::FETCH_ASSOC);

// Calcular valores do resumo
$totalAPagarFiltrado = $resumoFiltro['total_a_pagar'] ?? 0;
$totalPagoFiltrado = $resumoFiltro['total_pago'] ?? 0;
$totalPendenteFiltrado = $resumoFiltro['total_pendente'] ?? 0;
$totalVencidoFiltrado = $resumoFiltro['total_vencido'] ?? 0;
$totalFaturasFiltradas = $resumoFiltro['total_faturas'] ?? 0;
$totalFaturasVencidas = $resumoFiltro['total_faturas_vencidas'] ?? 0;

// --- Preparar dados para o modal ---

// Recria a lista de filtros ativos (como no seu exemplo)
$filtrosAtivosHTML = [];
if (!empty($filtro_data_inicio)) $filtrosAtivosHTML[] = "Venc. De: <strong>" . date('d/m/Y', strtotime($filtro_data_inicio)) . "</strong>";
if (!empty($filtro_data_fim)) $filtrosAtivosHTML[] = "Venc. Até: <strong>" . date('d/m/Y', strtotime($filtro_data_fim)) . "</strong>";
if ($filtro_status !== 'todos') $filtrosAtivosHTML[] = "Status: <strong>" . ucfirst($filtro_status) . "</strong>";
if ($filtro_unid_negocio !== 'todos') {
    // Busca o nome da unidade para exibir no filtro
    $unidNomeStmt = $pdo->prepare("SELECT nome_unid FROM unidade_negocio WHERE id = ?");
    $unidNomeStmt->execute([$filtro_unid_negocio]);
    $nomeUnidadeFiltrada = $unidNomeStmt->fetchColumn();
    $filtrosAtivosHTML[] = "Unidade: <strong>" . htmlspecialchars($nomeUnidadeFiltrada) . "</strong>";
}
if (!empty($filtro_texto)) $filtrosAtivosHTML[] = "Busca: <strong>" . htmlspecialchars($filtro_texto) . "</strong>";


// Ordena a lista principal por data para o modal
$contas_modal_detalhe = $contas_a_pagar;
usort($contas_modal_detalhe, function ($a, $b) {
    return strtotime($a['data_vencimento']) <=> strtotime($b['data_vencimento']);
});

$contasMesAtual = [];
$contasVencidasArr = [];
$dataAtual = new DateTime('first day of this month'); // Primeiro dia do mês atual
$dataAtual->setTime(0, 0, 0);

foreach ($contas_modal_detalhe as $item) {
    if ($item['status_id'] == 6) continue; // Só queremos o que está pendente/a pagar

    $dataVenc = new DateTime($item['data_vencimento']);
    $dataVenc->setTime(0, 0, 0);

    if ($dataVenc < $dataAtual) {
        $contasVencidasArr[] = $item; // Venceu em meses anteriores
    } else {
        $contasMesAtual[] = $item; // Vence neste mês ou no futuro
    }
}

$contagem_contasMesAtual = count($contasMesAtual);

// Função para renderizar as tabelas do modal
function renderTabelaContasPagar($contas)
{
    if (empty($contas)) {
        echo '<tr><td colspan="4" class="text-center text-muted py-3">Nenhum registro encontrado.</td></tr>';
        return;
    }
    foreach ($contas as $item) {
        $saldo = $item['valor'];
        $dataVenc = $item['data_vencimento'];
        $isVencido = strtotime($dataVenc) < time();
?>
        <tr>
            <td><?= htmlspecialchars($item['fornecedor']) ?></td>
            <td class="text-center">
                <?php if ($isVencido) : ?>
                    <span class="badge badge-danger">Vencido</span>
                <?php else : ?>
                    <span class="badge badge-warning">A Vencer</span>
                <?php endif; ?>
            </td>
            <td class="text-right"><?= date('d/m/Y', strtotime($dataVenc)) ?></td>
            <td class="text-right text-danger font-weight-bold">
                <?= number_format($saldo, 2, ',', '.') ?>
            </td>
        </tr>
<?php
    }
}
?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <title>Contas a Pagar</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.10.25/css/dataTables.bootstrap4.min.css" />

    <style>
        body {
            zoom: 0.9;
            overflow: hidden;
        }

        .card-principal {
            height: calc(100vh - 70px);
            overflow-y: auto;
        }

        .table td,
        .table th {
            padding: 0.3rem 0.6rem;
            font-size: 0.9rem;
            vertical-align: middle;
        }

        .table-vencido {
            background-color: #ffe5e5 !important;
        }

        .table-pago {
            background-color: #e5ffe7 !important;
        }

        thead a {
            color: white;
            text-decoration: none;
        }

        thead a:hover {
            color: #ddd;
        }

        .form-check-input {
            width: 20px;
            height: 20px;
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid pt-2"> <?= $mensagem ?>
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center py-2">
                <div class="col-md-6 mt-1 mb-0 row">
                    <h5 class="m-0 font-weight-bold">Gestão de Contas a Pagar</h5>
                    <a href="gestaoRD.php" class="ml-4"><i class="fas fa-home" style="font-size: 25px;" data-toggle="tooltip" title="Home RD"></i></a>
                </div>
                <div class="d-flex align-items-center">
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-toggle="modal" data-target="#modalResumoFiltro" title="Ver Resumo do Filtro">
                        <i class="fas fa-chart-pie"> </i> Resumo
                    </button>
                    <button class="btn btn-outline-secondary btn-sm ml-2" type="button" data-toggle="collapse" data-target="#filtroCollapse">
                        <i class="fas fa-filter"></i> Filtrar
                    </button>
                    <button type="button" class="btn btn-warning btn-sm ml-2" data-toggle="modal" data-target="#modalAddContaPagar">
                        <i class="fas fa-plus"></i> Nova Despesa
                    </button>
                </div>
            </div>

            <div class="card-body py-2 card-principal">
                <?php
                $isFiltroAtivo = !empty($filtro_status) && $filtro_status !== 'todos' || !empty($filtro_texto) || !empty($filtro_data_inicio) || !empty($filtro_data_fim);
                $collapseShowClass = $isFiltroAtivo ? 'show' : '';
                ?>
                <div class="collapse <?= $collapseShowClass ?>" id="filtroCollapse">
                    <div class="card card-body mb-2 py-2">
                        <form method="GET" class="mb-0">
                            <div class="row">
                                <div class="col-md-2"><label class="small mb-1">Unidade de Negócio</label><select name="filtro_unid_negocio" class="form-control form-control-sm">
                                        <option value="todos" <?= $filtro_unid_negocio == 'todos' ? 'selected' : '' ?>>Todos</option>
                                        <?php foreach ($unidades_negocio as $item) : ?>
                                            <option value="<?= $item['id'] ?>" <?= $filtro_unid_negocio == $item['id'] ? 'selected' : '' ?>><?= $item['nome_unid'] ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="small mb-1">Status</label>
                                    <div class="input-group input-group-sm">
                                        <div class="input-group-prepend"><span class="input-group-text"><i class="fas fa-flag"></i></span></div>

                                        <select name="filtro_status" class="form-control form-control-sm">
                                            <option value="todos" <?= $filtro_status == 'todos' ? 'selected' : '' ?>>Todos</option>

                                            <?php foreach ($statusContas as $status) : ?>
                                                <option value="<?= $status['id'] ?>" <?= $filtro_status == $status['id'] ? 'selected' : '' ?>>
                                                    <?= htmlspecialchars($status['nome']) ?>
                                                </option>
                                            <?php endforeach; ?>

                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <label class="small mb-1">Descrição, Fornecedor ou Subgrupo</label>
                                    <div class="input-group input-group-sm">
                                        <div class="input-group-prepend"><span class="input-group-text"><i class="fas fa-search"></i></span></div>
                                        <input type="text" name="filtro_texto" class="form-control form-control-sm" value="<?= htmlspecialchars($filtro_texto) ?>" placeholder="Buscar...">
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <label class="small mb-1">Vencimento De</label>
                                    <div class="input-group input-group-sm">
                                        <div class="input-group-prepend"><span class="input-group-text"><i class="fas fa-calendar-alt"></i></span></div>
                                        <input type="date" name="filtro_data_inicio" class="form-control form-control-sm" value="<?= htmlspecialchars($filtro_data_inicio) ?>">
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <label class="small mb-1">Vencimento Até</label>
                                    <div class="input-group input-group-sm">
                                        <div class="input-group-prepend"><span class="input-group-text"><i class="fas fa-calendar-alt"></i></span></div>
                                        <input type="date" name="filtro_data_fim" class="form-control form-control-sm" value="<?= htmlspecialchars($filtro_data_fim) ?>">
                                    </div>
                                </div>
                                <div class="col-md-1 align-self-end ">
                                    <div class="btn-group w-100">
                                        <button type="submit" class="btn btn-secondary btn-sm mr-2" title="Filtrar"><i class="fas fa-filter"></i> </button>
                                        <a href="contas_pagar.php" class="btn btn-outline-secondary btn-sm" title="Limpar Filtros"><i class="fas fa-eraser"></i> </a>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table table-sm table-bordered table-striped table-hover">
                        <thead class="thead-dark ">
                            <tr>
                                <th><?= sortLink('Descrição', 'descricao', $orderBy, $orderDir) ?></th>
                                <th class="text-right" style="width: 100px;"><?= sortLink('Valor', 'valor', $orderBy, $orderDir) ?></th>
                                <th><?= sortLink('Fornecedor', 'fornecedor', $orderBy, $orderDir) ?></th>
                                <th><?= sortLink('Dt. Venc.', 'data_vencimento', $orderBy, $orderDir) ?></th>
                                <th><?= sortLink('Dt. Pag.', 'data_pagamento', $orderBy, $orderDir) ?></th>
                                <th><?= sortLink('Unid.Negocio', 'unidade_negocio', $orderBy, $orderDir) ?></th>
                                <th><?= sortLink('Grupo', 'grupo_nome', $orderBy, $orderDir) ?></th>
                                <th><?= sortLink('Subgrupo', 'subgrupo_nome', $orderBy, $orderDir) ?></th>
                                <th class="text-center">Anexos</th>
                                <th class="text-center"><?= sortLink('Status', 'status', $orderBy, $orderDir) ?></th>
                                <th class="text-center" style="width: 160px;">Açães</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($contas_a_pagar)) : ?>
                                <tr>
                                    <td colspan="11" class="text-center">Nenhum lançamento encontrado.</td>
                                </tr>
                            <?php else : ?>
                                <?php foreach ($contas_a_pagar as $item) :

                                    // Pega o ID do status (ex: 1, 4, 6)
                                    $status_id = $item['status_id'];

                                    // Define a classe da linha (cor de fundo)
                                    $row_class = '';
                                    if ($status_id == 6) { // Pago
                                        $row_class = 'table-pago'; // Classe CSS para linha paga (verde claro)
                                    } elseif ($status_id == 4) { // Vencido
                                        $row_class = 'table-danger'; // Classe do Bootstrap para linha vencida (vermelho claro)
                                    }
                                ?>
                                    <tr class="<?= $row_class ?>">
                                        <td><?= htmlspecialchars($item['descricao']) ?></td>
                                        <td>R$ <?= number_format($item['valor'], 2, ',', '.') ?></td>
                                        <td><?= htmlspecialchars($item['fornecedor'] ?? '') ?></td>
                                        <td><?= date('d/m/Y', strtotime($item['data_vencimento'])) ?></td>
                                        <td>
                                            <?php if (!empty($item['data_pagamento'])) : ?>
                                                <?= date('d/m/Y', strtotime($item['data_pagamento'])) ?>
                                            <?php else : ?>
                                                Aguardando
                                            <?php endif; ?>
                                        </td>
                                        <td><?= htmlspecialchars($item['nome_unid'] ?? '') ?></td>
                                        <td><?= htmlspecialchars($item['grupo_nome']) ?></td>
                                        <td><?= htmlspecialchars($item['subgrupo_nome']) ?></td>
                                        <td class="text-center">
                                            <?php
                                            if (!empty($item['anexos'])) {
                                                $anexos = json_decode($item['anexos'], true);
                                                if (is_array($anexos) && !empty($anexos)) {
                                                    // Loop para cada anexo no JSON
                                                    foreach ($anexos as $anexo) {
                                                        if (isset($anexo['url']) && isset($anexo['nome'])) {
                                                            echo '<a href="' . htmlspecialchars($anexo['url']) . '" target="_blank" title="' . htmlspecialchars($anexo['nome']) . '" class="mr-1">';
                                                            echo '  <i class="fas fa-paperclip text-info"></i>';
                                                            echo '</a>';
                                                        }
                                                    }
                                                }
                                            }
                                            ?>
                                        </td>
                                        <td class="text-center">
                                            <?php

                                            $status_id = $item['status_id'];
                                            $status_nome = $item['nome_status'];

                                            // 4. Decide o novo status da conta
                                            // $hoje = date('Y-m-d');
                                            // $mesVencimento = (int)date('m', strtotime($data_vencimento));
                                            // $anoVencimento = (int)date('Y', strtotime($data_vencimento));
                                            // $mesAtual = (int)date('m');
                                            // $anoAtual = (int)date('Y');

                                            // 2. Define a classe (cor) do badge com base no ID
                                            $badge_class = '';
                                            switch ($status_id) {
                                                case 6: // Pago
                                                    $badge_class = 'badge-success';
                                                    break;
                                                case 4: // Vencido
                                                    $badge_class = 'badge-danger';
                                                    break;
                                                case 1: // A vencer
                                                    $badge_class = 'badge-warning';
                                                    break;
                                                default: // Qualquer outro status
                                                    $badge_class = 'badge-secondary';
                                                    break;
                                            }

                                            // 3. Exibe o HTML final, usando a classe (cor) e o nome (texto) dinâmicos
                                            echo '<span class="badge ' . $badge_class . '">' . htmlspecialchars($status_nome ?? 'N/A') . '</span>';
                                            ?>
                                        </td>
                                        <td class="text-center">
                                            <?php if ($item['status_id'] !== '6') : ?>
                                                <button type="button" class="btn btn-sm btn-success btn-dar-baixa" data-toggle="modal" data-target="#modalDarBaixa" data-id="<?= $item['despesa_id'] ?>" data-descricao="<?= htmlspecialchars($item['descricao']) ?>" data-valor="<?= number_format($item['valor'], 2, ',', '.') ?>" title="Registrar Pagamento"><i class="fas fa-check"></i></button>
                                            <?php endif; ?>
                                            <button type="button" class="btn btn-sm btn-warning btn-edit-conta" data-toggle="modal" data-target="#modalEditContaPagar" data-id="<?= $item['despesa_id'] ?>" data-descricao="<?= htmlspecialchars($item['descricao']) ?>" data-valor="<?= $item['valor'] ?>" data-vencimento="<?= $item['data_vencimento'] ?>" data-fornecedor="<?= htmlspecialchars($item['fornecedor']) ?>" data-unidade_negocio="<?= htmlspecialchars($item['unidade_negocio']) ?>" data-id_grupo="<?= $item['id_grupo'] ?>" data-id_subgrupo="<?= $item['id_subgrupo'] ?>" data-id_classificacao="<?= $item['id_classificacao'] ?>" data-id_tipo_documento="<?= $item['id_tipo_documento'] ?>" title="Editar Lançamento"><i class="fas fa-edit"></i></button>
                                            <button type="button" class="btn btn-sm btn-danger btn-excluir" data-toggle="modal" data-target="#modalExcluirConta" data-id="<?= $item['despesa_id'] ?>" title="Excluir">
                                                <i class="fas fa-trash-alt"></i>
                                            </button>
                                            <button type="button" class="btn btn-info btn-sm btn-anexar-comprovante" data-toggle="modal" data-target="#modalAnexarComprovante" data-conta-id="<?= $item['id'] ?>" data-tipo-conta="pagar" data-anexos="<?= htmlspecialchars($item['anexos'] ?? '[]') ?>" title="Anexar Comprovantes">
                                                <i class="fas fa-paperclip"></i>
                                            </button>
                                        </td>

                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Dar Resumo -->
    <div class="modal fade" id="modalResumoFiltro" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Resumo do Filtro Atual (Contas a Pagar)</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">

                    <div class="card p-2 mb-3 bg-light" style="font-size: 0.85rem;">
                        <span class="text-muted">
                            <strong>Filtros Ativos:</strong>
                            <?php
                            if (empty($filtrosAtivosHTML)) {
                                echo 'Nenhum filtro aplicado.';
                            } else {
                                echo implode(' <span class="mx-2 text-black-50">|</span> ', $filtrosAtivosHTML);
                            }
                            ?>
                        </span>
                    </div>

                    <div class="row">

                        <div class="col-md-4">
                            <h6 class="text-center text-muted mb-3">Resumo Financeiro (A Pagar)</h6>

                            <div class="card shadow-sm mb-3">
                                <div class="card-body text-center">
                                    <h6 class="card-title text-muted">TOTAL A PAGAR</h6>
                                    <h3 class="font-weight-bold text-primary mb-0">
                                        R$ <?= number_format($totalAPagarFiltrado, 2, ',', '.') ?>
                                    </h3>
                                </div>
                            </div>

                            <div class="card shadow-sm mb-3">
                                <div class="card-body text-center">
                                    <h6 class="card-title text-muted">TOTAL PAGO</h6>
                                    <h3 class="font-weight-bold text-success mb-0">
                                        R$ <?= number_format($totalPagoFiltrado, 2, ',', '.') ?>
                                    </h3>
                                </div>
                            </div>

                            <div class="card shadow-sm mb-3">
                                <div class="card-body text-center">
                                    <h6 class="card-title text-muted">SALDO PENDENTE</h6>
                                    <h3 class="font-weight-bold text-warning mb-0">
                                        R$ <?= number_format($totalPendenteFiltrado, 2, ',', '.') ?>
                                    </h3>
                                </div>
                            </div>

                            <div class="card shadow-sm mb-3">
                                <div class="card-body text-center">
                                    <h6 class="card-title text-muted">TOTAL VENCIDO (pendente)</h6>
                                    <h3 class="font-weight-bold text-danger mb-0">
                                        R$ <?= number_format($totalVencidoFiltrado, 2, ',', '.') ?>
                                    </h3>
                                    <small class="text-muted"><?= $contagem_contasMesAtual ?> fatura(s)</small>
                                </div>
                            </div>

                            <p class="text-center text-muted mt-2">
                                Total de <strong><?= $totalFaturasFiltradas ?></strong> fatura(s) encontradas.
                            </p>
                        </div>

                        <div class="col-md-8">
                            <h6 class="text-center text-muted mb-3">Detalhamento do Saldo Pendente de Pagamento</h6>

                            <div class="card shadow-sm mb-4">
                                <div class="card-header bg-primary text-white py-2 text-left">
                                    <strong> Contas a Vencer (Màs Atual e Futuro)</strong>
                                </div>
                                <div class="card-body p-0" style="max-height: 310px; overflow-y: auto;">
                                    <table class="table table-sm table-striped table-hover mb-0" id="tabelaContasPagar">
                                        <thead style="position: sticky; top: 0; background-color: #f8f9fa;">
                                            <tr>
                                                <th>Fornecedor/Descrição</th>
                                                <th class="text-center">Status</th>
                                                <th class="text-right">Vencimento</th>
                                                <th class="text-right">Valor (R$)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php renderTabelaContasPagar($contasMesAtual); ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="card shadow-sm border-dark">
                                <div class="card-header bg-dark text-white py-2 text-left">
                                    <strong>?? Vencidas (Meses Anteriores)</strong>
                                </div>
                                <div class="card-body p-0" style="max-height: 220px; overflow-y: auto;">
                                    <table class="table table-sm table-striped table-hover mb-0" id="tabelaContasVencidas">
                                        <thead style="position: sticky; top: 0; background-color: #f8f9fa;">
                                            <tr>
                                                <th>Fornecedor/Descrição</th>
                                                <th class="text-center">Status</th>
                                                <th class="text-right">Vencimento</th>
                                                <th class="text-right">Valor (R$)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php renderTabelaContasPagar($contasVencidasArr); ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal add anexo -->
    <div class="modal fade" id="modalAnexarComprovante" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <form id="formAnexarComprovante" method="POST">
                    <input type="hidden" name="action" value="salvar_anexos">
                    <input type="hidden" name="conta_id" id="anexo_conta_id">
                    <input type="hidden" name="anexos_json" id="anexos_json_anexo">
                    <input type="hidden" name="tipo_conta" id="anexo_tipo_conta">

                    <div class="modal-header">
                        <h5 class="modal-title">Anexos</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <h6>Anexos Existentes</h6>
                        <div id="listaAnexosExistentes" class="mb-3">
                            <p class="text-muted small">Nenhum anexo existente.</p>
                        </div>
                        <h6>Adicionar Novos Comprovantes (PDF)</h6>
                        <div class="form-group">
                            <input type="file" id="pdfFileInput_anexo" class="form-control-file auto-upload-financeiro" accept="application/pdf" multiple data-status-div="uploadStatus_anexo" data-anexos-input="anexos_json_anexo" data-conta-id-input="anexo_conta_id" data-tipo-conta-input="anexo_tipo_conta">
                            <div id="uploadStatus_anexo" class="mt-2 small upload-status"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- MODAL ADD CONTA PAGAR -->
    <div class="modal fade" id="modalAddContaPagar" tabindex="-1">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="action" value="add_conta_pagar">
                    <div class="modal-header">
                        <h5 class="modal-title">Nova Conta a Pagar</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-row">
                            <div class="form-group col-md-12 mb-2">
                                <label class="small mb-1">Descrição:</label>
                                <input type="text" name="descricao" class="form-control form-control-sm" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group col-md-6">
                                <label class="small mb-1">Fornecedor / Favorecido:</label>
                                <input type="text" name="fornecedor" class="form-control form-control-sm">
                            </div>
                            <div class="form-group col-md-3">
                                <label class="small mb-1">Valor (R$):</label>
                                <input type="number" step="0.01" name="valor" class="form-control form-control-sm" required>
                            </div>
                            <div class="form-group col-md-3">
                                <label class="small mb-1">Data de Vencimento:</label>
                                <input type="date" name="data_vencimento" class="form-control form-control-sm" required>
                            </div>

                        </div>
                        <hr>
                        <h6><strong>Classificação da Despesa</strong></h6>

                        <div class="form-row">
                            <!-- Unidade de Negocio -->
                            <div class="form-group col-md-3">
                                <label class="small mb-1">Unidade de Negócio:</label>
                                <select name="unidade_negocio" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <?php foreach ($unidadesNegocio as $unidadeNegocio) : ?>
                                        <option value="<?= $unidadeNegocio['id'] ?>">
                                            <?= htmlspecialchars($unidadeNegocio['nome_unid']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <!-- Grupo -->
                            <div class="form-group col-md-3">
                                <label class="small mb-1">Grupo:</label>
                                <select name="id_grupo" id="select_grupo" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option><?php foreach ($grupos as $grupo) : ?><option value="<?= $grupo['id'] ?>"><?= htmlspecialchars($grupo['nome']) ?></option><?php endforeach; ?>
                                </select>
                            </div>

                            <!-- Subgrupo -->
                            <div class="form-group col-md-2">
                                <label class="small mb-1">Subgrupo:</label>
                                <select name="id_subgrupo" id="select_subgrupo" class="form-control form-control-sm" required>
                                    <option value="">Selecione um grupo</option>
                                </select>
                            </div>

                            <!-- Classificação -->
                            <div class="form-group col-md-2"> <label class="small mb-1">Classificação:</label><select name="id_classificacao" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option><?php foreach ($classificacoes as $item) : ?><option value="<?= $item['id'] ?>"><?= htmlspecialchars($item['nome']) ?></option><?php endforeach; ?>
                                </select>
                            </div>
                            <!-- Tipo de Documento -->
                            <div class="form-group col-md-2">
                                <label class="small mb-1">Tipo de Documento:</label>
                                <select name="id_tipo_documento" class="form-control form-control-sm">
                                    <option value="">Nenhum</option><?php foreach ($documentos as $item) : ?><option value="<?= $item['id'] ?>"><?= htmlspecialchars($item['nome']) ?></option><?php endforeach; ?>
                                </select>
                            </div>
                        </div>

                        <hr>
                        <div class="form-group form-check mr-2 ml-2 text-right">
                            <input type="checkbox" class="form-check-input" name="salvar_recorrencia" id="salvar_recorrencia" value="1">
                            <label class="form-check-label ml-2" for="salvar_recorrencia"><b>Registrar como Despesa Recorrente</b></label>
                        </div>
                    </div>
                    <div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button><button type="submit" class="btn btn-primary">Lançar Despesa</button></div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal Editar Conta a Pagar -->
    <div class="modal fade" id="modalEditContaPagar" tabindex="-1">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="action" value="edit_conta_pagar"><input type="hidden" name="id" id="edit_id_conta">
                    <div class="modal-header">
                        <h5 class="modal-title">Editar Conta a Pagar</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-row">
                            <div class="form-group col-md-12">
                                <label class="small mb-1">Descrição:</label>
                                <input type="text" name="descricao" id="edit_descricao" class="form-control form-control-sm" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group col-md-6">
                                <label class="small mb-1">Fornecedor / Favorecido:</label>
                                <input type="text" name="fornecedor" id="edit_fornecedor" class="form-control form-control-sm">
                            </div>
                            <div class="form-group col-md-3">
                                <label class="small mb-1">Valor (R$):</label>
                                <input type="number" step="0.01" name="valor" id="edit_valor" class="form-control form-control-sm" required>
                            </div>
                            <div class="form-group col-md-3">
                                <label class="small mb-1">Data de Vencimento:</label>
                                <input type="date" name="data_vencimento" id="edit_data_vencimento" class="form-control form-control-sm" required>
                            </div>
                        </div>
                        <hr>
                        <h6><strong> Classificação da Despesa</strong></h6>
                        <div class="form-row">
                            <div class="form-group col-md-3">
                                <label class="small mb-1">Unidade de Negócio:</label>
                                <select name="unidade_negocio" id="edit_unidade_negocio" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <?php foreach ($unidadesNegocio as $unidadeNegocio) : ?>
                                        <option value="<?= $unidadeNegocio['id'] ?>">
                                            <?= htmlspecialchars($unidadeNegocio['nome_unid']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-3">
                                <label class="small mb-1">Grupo:</label>
                                <select name="id_grupo" id="edit_id_grupo" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <?php foreach ($grupos as $grupo) : ?>
                                        <option value="<?= $grupo['id'] ?>">
                                            <?= htmlspecialchars($grupo['nome']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-2">
                                <label class="small mb-1">Subgrupo:</label>
                                <select name="id_subgrupo" id="edit_id_subgrupo" class="form-control form-control-sm" required>
                                    <option value="">Selecione um grupo</option>
                                </select>
                            </div>

                            <div class="form-group col-md-2"><label class="small mb-1">Classificação:</label><select name="id_classificacao" id="edit_id_classificacao" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option><?php foreach ($classificacoes as $item) : ?><option value="<?= $item['id'] ?>"><?= htmlspecialchars($item['nome']) ?></option><?php endforeach; ?>
                                </select></div>
                            <div class="form-group col-md-2"><label class="small mb-1">Tipo de Documento:</label><select name="id_tipo_documento" id="edit_id_tipo_documento" class="form-control form-control-sm">
                                    <option value="">Nenhum</option><?php foreach ($documentos as $item) : ?><option value="<?= $item['id'] ?>"><?= htmlspecialchars($item['nome']) ?></option><?php endforeach; ?>
                                </select></div>
                        </div>

                        <hr>

                        <div class="form-group form-check mr-2 ml-2 text-right">
                            <input type="checkbox" class="form-check-input" name="editar_recorrencia" id="editar_recorrencia" value="1"><label class="form-check-label ml-2" for="editar_recorrencia"><b>Editar para Despesa Recorrente</b></label>
                        </div>
                    </div>
                    <div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-primary">Salvar Alterações</button></div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal Dar Baixa -->
    <div class="modal fade" id="modalDarBaixa" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="action" value="dar_baixa_pagar"><input type="hidden" name="id_conta" id="baixa_id_conta">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirmar Pagamento</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <label>Confirmar pagamento para: </label><br>
                        <h5><strong><span id="baixa_descricao"></span> - R$ <span id="baixa_valor"></span></strong></h5>
                        <hr>
                        <div class="form-row">
                            <div class="form-group col-md-6">
                                <label class="small mb-1" for="data_pagamento">Data do Pagamento</label>
                                <input type="date" name="data_pagamento" class="form-control form-control-sm" value="<?= date('Y-m-d') ?>" required>
                            </div>

                            <div class="form-group col-md-6">
                                <label class="small mb-1">Agência / Banco</label>
                                <select name="id_agBancaria" id="baixa_id_agBancaria" class="form-control form-control-sm">
                                    <option value="">Selecione</option>
                                    <?php
                                    foreach ($agenciasBancarias as $agencia) {
                                        echo '<option value="' . $agencia['id'] . '">' . $agencia['ag_nome'] . '</option>';
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>
                        <div class="form-group"><label for="observacao_baixa">Observações (Opcional)</label><textarea name="observacao_baixa" class="form-control" rows="3" placeholder="Ex: Pago via PIX..."></textarea></div>
                    </div>
                    <div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-success">Confirmar Pagamento</button></div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal Excluir Conta -->
    <div class="modal fade" id="modalExcluirConta" tabindex="-1">
        <div class="modal-dialog modal-sm">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="action" value="excluir_conta">
                    <input type="hidden" name="id" id="excluir_id_conta">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirmar Exclusão</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-danger">Excluir</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal Excluir Anexo -->
    <div class="modal fade" id="modalConfirmarExclusaoAnexo" tabindex="-1">
        <div class="modal-dialog modal-sm">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Confirmar Remoção</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Tem certeza que deseja remover este anexo da lista?</p>
                    <p class="text-muted small">A exclusáo só será salva permanentemente quando você clicar em "Salvar Alterações".</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="btn-cancelar-excluir-anexo" data-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-danger" id="btn-confirmar-excluir-anexo">Sim, Remover</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.10.25/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.10.25/js/dataTables.bootstrap4.min.js"></script>
    <!-- <script>
        $(document).ready(function() {
            const subgrupos = <?= json_encode($subgrupos, JSON_NUMERIC_CHECK) ?>;

            function popularSubgrupos(grupoId, selectSubgrupo, subgrupoSelecionadoId = null) {
                const subgruposFiltrados = subgrupos.filter(sg => sg.id_grupo === grupoId);
                $(selectSubgrupo).empty().append('<option value="">Selecione...</option>');
                subgruposFiltrados.forEach(sg => {
                    const selected = sg.id === subgrupoSelecionadoId ? ' selected' : '';
                    $(selectSubgrupo).append(`<option value="${sg.id}"${selected}>${sg.nome}</option>`);
                });
            }
            $('#select_grupo').on('change', function() {
                popularSubgrupos(parseInt($(this).val(), 10), '#select_subgrupo');
            });
            $('#edit_id_grupo').on('change', function() {
                popularSubgrupos(parseInt($(this).val(), 10), '#edit_id_subgrupo');
            });

            $('.btn-dar-baixa').on('click', function() {
                $('#baixa_id_conta').val($(this).data('id'));
                $('#baixa_descricao').text($(this).data('descricao'));
                $('#baixa_valor').text($(this).data('valor'));
                $('#baixa_id_agBancaria').val($(this).data('id_agBancaria'));
            });

            $('.btn-excluir').on('click', function() {
                const id = $(this).data('id');
                $('#excluir_id_conta').val(id);
            });

            $('.btn-edit-conta').on('click', function() {
                const id_grupo = parseInt($(this).data('id_grupo'), 10);
                const id_subgrupo = parseInt($(this).data('id_subgrupo'), 10);
                $('#edit_id_conta').val($(this).data('id'));
                $('#edit_descricao').val($(this).data('descricao'));
                $('#edit_valor').val($(this).data('valor'));
                $('#edit_data_vencimento').val($(this).data('vencimento'));
                $('#edit_fornecedor').val($(this).data('fornecedor'));
                $('#edit_id_classificacao').val($(this).data('id_classificacao'));
                $('#edit_id_tipo_documento').val($(this).data('id_tipo_documento'));
                $('#edit_id_grupo').val(id_grupo);
                $('#edit_unidade_negocio').val($(this).data('unidade_negocio'));
                popularSubgrupos(id_grupo, '#edit_id_subgrupo', id_subgrupo);
            });

            let itemParaExcluir = null;
            let anexosAtuais = {}; 
            // --- LÓGICA PARA O MODAL DE ANEXOS ---
            $('#modalAnexarComprovante').on('show.bs.modal', function(event) {
                const button = $(event.relatedTarget);
                const contaId = button.data('conta-id');
                const tipoConta = button.data('tipo-conta');
                let anexosExistentes = button.data('anexos');
                const listaDiv = $('#listaAnexosExistentes');
                const anexosInputId = 'anexos_json_anexo';

                $('#anexo_conta_id').val(contaId);
                $('#anexo_tipo_conta').val(tipoConta);

                // Limpa e reinicia
                listaDiv.html('');
                $('#uploadStatus_anexo').html('');
                $('#pdfFileInput_anexo').val('');
                anexosAtuais[anexosInputId] = [];

                if (typeof anexosExistentes === 'string') {
                    try {
                        anexosExistentes = JSON.parse(anexosExistentes);
                    } catch (e) {
                        anexosExistentes = [];
                    }
                }
                if (!Array.isArray(anexosExistentes)) {
                    anexosExistentes = [];
                }

                anexosAtuais[anexosInputId] = [...anexosExistentes];
                $('#' + anexosInputId).val(JSON.stringify(anexosAtuais[anexosInputId]));

                if (anexosExistentes.length > 0) {
                    anexosExistentes.forEach((anexo, index) => {
                        const anexoHtml = `
                    <div class="d-flex justify-content-between align-items-center mb-1 border-bottom pb-1 anexo-item" data-index="${index}">
                        <span><a href="${anexo.url}" target="_blank"><i class="fas fa-file-pdf text-danger"></i> ${anexo.nome}</a></span>
                        <button type="button" class="btn btn-sm btn-outline-danger btn-remover-anexo" data-anexo-input-id="${anexosInputId}"><i class="fas fa-trash-alt"></i></button>
                    </div>`;
                        listaDiv.append(anexoHtml);
                    });
                } else {
                    listaDiv.html('<p class="text-muted small">Nenhum anexo existente.</p>');
                }
            });

            // --- LÓGICA PARA REMOVER ANEXO (AGORA ABRE O MODAL) ---
            $('body').on('click', '.btn-remover-anexo', function() {
                const itemDiv = $(this).closest('.anexo-item');
                const index = itemDiv.data('index');
                const anexosInputId = $(this).data('anexo-input-id');

                // 1. Salva as informações do item a ser excluído
                itemParaExcluir = {
                    itemDiv: itemDiv,
                    index: index,
                    anexosInputId: anexosInputId
                };

                //esconde o modal
                $('#modalAnexarComprovante').modal('hide');

                // 2. Abre o modal de confirmação
                $('#modalConfirmarExclusaoAnexo').modal('show');
            });

            $('#modalConfirmarExclusaoAnexo .btn-secondary[data-dismiss="modal"]').on('click', function() {
                itemParaExcluir = null;

                $('#modalConfirmarExclusaoAnexo').one('hidden.bs.modal', function() {
                    $('#modalAnexarComprovante').modal('show');
                });
            });

            // --- NOVA LÓGICA: AÇÃO DO BOTÃO DE CONFIRMAÇÃO DO MODAL ---
            $('#btn-confirmar-excluir-anexo').on('click', function() {
                // 1. Verifica se temos um item para excluir
                if (itemParaExcluir) {
                    const {
                        itemDiv,
                        index,
                        anexosInputId
                    } = itemParaExcluir;

                    // 2. Executa a lógica de exclusáo original
                    if (anexosAtuais[anexosInputId] && anexosAtuais[anexosInputId][index] !== undefined) {

                        anexosAtuais[anexosInputId].splice(index, 1); // Remove do array
                        $('#' + anexosInputId).val(JSON.stringify(anexosAtuais[anexosInputId])); // Atualiza o input hidden

                        // Remove o item da lista visual com um efeito
                        itemDiv.fadeOut(300, function() {
                            $(this).remove();

                            if ($('#listaAnexosExistentes .anexo-item').length === 0) {
                                $('#listaAnexosExistentes').html('<p class="text-muted small">Nenhum anexo existente.</p>');
                            }
                        });
                    }
                }

                // 3. Limpa a variável e fecha o modal
                itemParaExcluir = null;
                $('#modalConfirmarExclusaoAnexo').modal('hide');
                $('#modalAnexarComprovante').modal('show');
            });

            // --- LÓGICA DE UPLOAD PARA FINANCEIRO ---
            $('.auto-upload-financeiro').on('change', function(event) {
                const input = event.target;
                const statusDiv = $('#' + $(input).data('status-div'));
                const anexosInputId = $(input).data('anexos-input');

                // Pega os IDs diretamente dos data-attributes do input file
                const contaId = $('#' + $(input).data('conta-id-input')).val();
                const tipoConta = $('#' + $(input).data('tipo-conta-input')).val();

                const files = input.files;
                if (files.length === 0) return;

                Array.from(files).forEach((file, index) => {
                    handleFileUploadFinanceiro(file, index, statusDiv, anexosInputId, contaId, tipoConta);
                });
            });

            function handleFileUploadFinanceiro(file, index, statusDiv, anexosInputId, contaId, tipoConta) {
                const fileStatusId = 'file-status-' + Date.now() + '-' + index;
                if (file.type !== 'application/pdf') {
                    statusDiv.append(`<div class="text-danger"><i class="fas fa-times-circle"></i> ${file.name} (não é PDF)</div>`);
                    return;
                }
                statusDiv.append(`<div id="${fileStatusId}"><i class="fas fa-spinner fa-spin"></i> Enviando ${file.name}...</div>`);

                var formData = new FormData();
                formData.append('pdfFile', file);
                formData.append('conta_id', contaId);
                formData.append('tipo_conta', tipoConta);

                $.ajax({
                    url: 'recebe_upload_financeiro.php', // USA O NOVO SCRIPT PHP
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    success: function(response) {
                        const statusElement = $('#' + fileStatusId);
                        if (response.success) {
                            statusElement.html(`<i class="fas fa-check-circle text-success"></i> ${response.fileName} (Novo)`);

                            if (!anexosAtuais[anexosInputId]) {
                                anexosAtuais[anexosInputId] = [];
                            }

                            anexosAtuais[anexosInputId].push({
                                nome: response.fileName,
                                url: response.url
                            });
                            $('#' + anexosInputId).val(JSON.stringify(anexosAtuais[anexosInputId]));
                        } else {
                            statusElement.html(`<i class="fas fa-times-circle text-danger"></i> Erro: ${response.message}`);
                        }
                    },
                    error: function() {
                        $('#' + fileStatusId).html(`<i class="fas fa-exclamation-triangle text-danger"></i> Erro de comunicação.`);
                    }
                });
            }

            // Limpa o modal de anexos ao fechar
            $('#modalAnexarComprovante').on('hidden.bs.modal', function() {
                const anexosInputId = 'anexos_json_anexo';
                anexosAtuais[anexosInputId] = [];
                $('#' + anexosInputId).val('');
                $(this).find('.upload-status').html('');
                $(this).find('.auto-upload-financeiro').val('');
                $('#listaAnexosExistentes').html('<p class="text-muted small">Nenhum anexo existente.</p>');
            });

        });
    </script> -->

    <script>
        $(document).ready(function() {
            const subgrupos = <?= json_encode($subgrupos, JSON_NUMERIC_CHECK) ?>;

            let anexosAtuais = {};
            let itemParaExcluir = null;
            let reabrirmodalanexos = false;

            function popularSubgrupos(grupoId, selectSubgrupo, subgrupoSelecionadoId = null) {
                const subgruposFiltrados = subgrupos.filter(sg => sg.id_grupo === grupoId);
                $(selectSubgrupo).empty().append('<option value="">Selecione...</option>');
                subgruposFiltrados.forEach(sg => {
                    const selected = sg.id === subgrupoSelecionadoId ? ' selected' : '';
                    $(selectSubgrupo).append(`<option value="${sg.id}"${selected}>${sg.nome}</option>`);
                });
            }

            $('#select_grupo').on('change', function() {
                popularSubgrupos(parseInt($(this).val(), 10), '#select_subgrupo');
            });

            $('#edit_id_grupo').on('change', function() {
                popularSubgrupos(parseInt($(this).val(), 10), '#edit_id_subgrupo');
            });

            $('.btn-dar-baixa').on('click', function() {
                $('#baixa_id_conta').val($(this).data('id'));
                $('#baixa_descricao').text($(this).data('descricao'));
                $('#baixa_valor').text($(this).data('valor'));
                $('#baixa_id_agBancaria').val($(this).data('id_agBancaria'));
            });

            $('.btn-excluir').on('click', function() {
                $('#excluir_id_conta').val($(this).data('id'));
            });

            $('.btn-edit-conta').on('click', function() {
                const id_grupo = parseInt($(this).data('id_grupo'), 10);
                const id_subgrupo = parseInt($(this).data('id_subgrupo'), 10);
                $('#edit_id_conta').val($(this).data('id'));
                $('#edit_descricao').val($(this).data('descricao'));
                $('#edit_valor').val($(this).data('valor'));
                $('#edit_data_vencimento').val($(this).data('vencimento'));
                $('#edit_fornecedor').val($(this).data('fornecedor'));
                $('#edit_id_classificacao').val($(this).data('id_classificacao'));
                $('#edit_id_tipo_documento').val($(this).data('id_tipo_documento'));
                $('#edit_id_grupo').val(id_grupo);
                $('#edit_unidade_negocio').val($(this).data('unidade_negocio'));
                popularSubgrupos(id_grupo, '#edit_id_subgrupo', id_subgrupo);
            });

            $('#modalAnexarComprovante').on('show.bs.modal', function(event) {
                if (reabrirmodalanexos) {
                    reabrirmodalanexos = false;
                    return;
                }

                const button = $(event.relatedTarget);
                if (!button || button.length === 0) return;

                const contaId = button.data('conta-id');
                const tipoConta = button.data('tipo-conta');
                let anexosExistentes = button.data('anexos');
                const listaDiv = $('#listaAnexosExistentes');
                const anexosInputId = 'anexos_json_anexo';

                $('#anexo_conta_id').val(contaId);
                $('#anexo_tipo_conta').val(tipoConta);

                listaDiv.html('');
                $('#uploadStatus_anexo').html('');
                $('#pdfFileInput_anexo').val('');
                anexosAtuais[anexosInputId] = [];

                if (typeof anexosExistentes === 'string') {
                    try {
                        anexosExistentes = JSON.parse(anexosExistentes);
                    } catch (e) {
                        anexosExistentes = [];
                    }
                }
                if (!Array.isArray(anexosExistentes)) {
                    anexosExistentes = [];
                }

                anexosAtuais[anexosInputId] = [...anexosExistentes];
                $('#' + anexosInputId).val(JSON.stringify(anexosAtuais[anexosInputId]));

                if (anexosExistentes.length > 0) {
                    anexosExistentes.forEach((anexo, index) => {
                        const anexoHtml = `
                    <div class="d-flex justify-content-between align-items-center mb-1 border-bottom pb-1 anexo-item" data-index="${index}">
                        <span><a href="${anexo.url}" target="_blank"><i class="fas fa-file-pdf text-danger"></i> ${anexo.nome}</a></span>
                        <button type="button" class="btn btn-sm btn-outline-danger btn-remover-anexo" data-anexo-input-id="${anexosInputId}"><i class="fas fa-times"></i></button>
                    </div>`;
                        listaDiv.append(anexoHtml);
                    });
                } else {
                    listaDiv.html('<p class="text-muted small">Nenhum anexo existente.</p>');
                }
            });

            $('body').on('click', '.btn-remover-anexo', function() {
                const itemDiv = $(this).closest('.anexo-item');
                const index = itemDiv.data('index');
                const anexosInputId = $(this).data('anexo-input-id');

                itemParaExcluir = {
                    itemDiv,
                    index,
                    anexosInputId
                };

                reabrirmodalanexos = true; // ## CORREÇÃO: Ativa a flag ANTES de fechar

                $('#modalAnexarComprovante').one('hidden.bs.modal', function() {
                    $('#modalConfirmarExclusaoAnexo').modal('show');
                });
                $('#modalAnexarComprovante').modal('hide');
            });

            $('#btn-confirmar-excluir-anexo').on('click', function() {
                if (itemParaExcluir) {
                    const {
                        itemDiv,
                        index,
                        anexosInputId
                    } = itemParaExcluir;
                    if (anexosAtuais[anexosInputId] && anexosAtuais[anexosInputId][index] !== undefined) {
                        anexosAtuais[anexosInputId].splice(index, 1);
                        $('#' + anexosInputId).val(JSON.stringify(anexosAtuais[anexosInputId]));
                        itemDiv.remove();

                        if ($('#listaAnexosExistentes .anexo-item').length === 0) {
                            $('#listaAnexosExistentes').html('<p class="text-muted small">Nenhum anexo existente.</p>');
                        }
                    }
                }
                $('#modalConfirmarExclusaoAnexo').modal('hide');
            });

            $('#modalConfirmarExclusaoAnexo').on('hidden.bs.modal', function() {
                itemParaExcluir = null;
                reabrirmodalanexos = true;
                $('#modalAnexarComprovante').modal('show');
            });

            $('.auto-upload-financeiro').on('change', function(event) {
                const input = event.target;
                const statusDiv = $('#' + $(input).data('status-div'));
                const anexosInputId = $(input).data('anexos-input');
                const contaId = $('#anexo_conta_id').val();
                const tipoConta = $('#anexo_tipo_conta').val();
                const files = input.files;

                if (files.length === 0) return;

                Array.from(files).forEach((file, index) => {
                    handleFileUploadFinanceiro(file, index, statusDiv, anexosInputId, contaId, tipoConta);
                });
            });

            function handleFileUploadFinanceiro(file, index, statusDiv, anexosInputId, contaId, tipoConta) {
                const fileStatusId = 'file-status-' + Date.now() + '-' + index;
                if (file.type !== 'application/pdf') {
                    statusDiv.append(`<div class="text-danger"><i class="fas fa-times-circle"></i> ${file.name} (não é PDF)</div>`);
                    return;
                }
                statusDiv.append(`<div id="${fileStatusId}"><i class="fas fa-spinner fa-spin"></i> Enviando ${file.name}...</div>`);

                var formData = new FormData();
                formData.append('pdfFile', file);
                formData.append('conta_id', contaId);
                formData.append('tipo_conta', tipoConta);

                $.ajax({
                    url: 'recebe_upload_financeiro.php',
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    success: function(response) {
                        const statusElement = $('#' + fileStatusId);
                        if (response.success) {
                            statusElement.html(`<i class="fas fa-check-circle text-success"></i> ${response.fileName} (Novo)`);

                            if (!anexosAtuais[anexosInputId]) {
                                anexosAtuais[anexosInputId] = [];
                            }

                            anexosAtuais[anexosInputId].push({
                                nome: response.fileName,
                                url: response.url
                            });
                            $('#' + anexosInputId).val(JSON.stringify(anexosAtuais[anexosInputId]));
                        } else {
                            statusElement.html(`<i class="fas fa-times-circle text-danger"></i> Erro: ${response.message}`);
                        }
                    },
                    error: function() {
                        $('#' + fileStatusId).html(`<i class="fas fa-exclamation-triangle text-danger"></i> Erro de comunicação.`);
                    }
                });
            }

            $('#modalAnexarComprovante').on('hidden.bs.modal', function() {
                if (reabrirmodalanexos) {
                    return;
                }
                const anexosInputId = 'anexos_json_anexo';
                anexosAtuais[anexosInputId] = [];
                $('#' + anexosInputId).val('');
                $(this).find('.upload-status').html('');
                $(this).find('.auto-upload-financeiro').val('');
                $('#listaAnexosExistentes').html('<p class="text-muted small">Nenhum anexo existente.</p>');
            });


            jQuery.fn.dataTable.ext.type.order['date-br-pre'] = function(d) {
                if (!d) return 0;
                // Divide a data "10/11/2025" em [10, 11, 2025]
                var parts = d.split('/');
                if (parts.length < 3) return 0;
                // Retorna "20251110" (YYYYMMDD), que é um número que o DataTables sabe ordenar
                return parts[2] + parts[1] + parts[0];
            };

            // Plugin para "ensinar" o DataTables a ordenar moeda (ex: "R$ 14.835,32")
            jQuery.fn.dataTable.ext.type.order['num-fmt-pre'] = function(d) {
                if (typeof d !== 'string') return 0;
                // Remove "R$", tira os pontos "." e troca a vírgula "," por um ponto decimal "."
                var num = d.replace(/R\$\s*/, '').replace(/\./g, '').replace(/,/, '.');
                // Converte o texto "14835.32" para um número
                return parseFloat(num) || 0;
            };



            // tabelas do modal
            var dataTableOptions = {
                "language": {
                    "url": "https://cdn.datatables.net/plug-ins/1.10.25/i18n/Portuguese-Brasil.json"
                },
                "paging": false,
                "searching": false,
                "info": false,
                "order": [
                    [3, "desc"]
                ],
                "columnDefs": [
                    // Colunas 1 (Status):
                    {
                        "orderable": false,
                        "targets": 1
                    },

                    // Coluna 2 (Vencimento):
                    {
                        "type": "date-br",
                        "targets": 2
                    },

                    // Coluna 3 (Saldo):
                    {
                        "type": "num-fmt",
                        "targets": 3
                    }
                ]
            };

            $('#tabelaContasPagar').DataTable(dataTableOptions);
            $('#tabelaContasVencidas').DataTable(dataTableOptions);

        });
    </script>

    <script>
        window.setTimeout(function() {
            $(".alert").fadeOut(500, function() {
                $(this).remove();
            });
        }, 3000);
    </script>
</body>

</html>