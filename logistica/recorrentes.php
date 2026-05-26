<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// if ($m9_XX < 1) { header("Location: ../home.php"); exit; } // Ajuste o código da permissão

$pdo = ConnectionN3();
$mensagem = '';
$action = $_POST['action'] ?? $_GET['action'] ?? '';
$id_usuario_logado = $_SESSION['allterusN3Id'];


// AÇÃO PARA ADICIONAR NOVA RECORRÊNCIA
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'add_recorrencia') {

    // Validação 1: Campos essenciais
    if (empty($_POST['tipo']) || empty($_POST['descricao_padrao']) || !isset($_POST['valor_padrao']) || empty($_POST['unidade_negocio_padrao']) || empty($_POST['dia_vencimento']) || empty($_POST['id_grupo_padrao']) || empty($_POST['id_subgrupo_padrao']) || empty($_POST['id_classificacao_padrao'])) {
        $_SESSION['mensagem_erro'] = 'Erro: Todos os campos marcados com * são obrigatórios.';
        header("Location: recorrentes.php");
        exit;
    }

    // Validação 2: Soma dos percentuais (APENAS se for 'Receber')
    if ($_POST['tipo'] === 'Receber') {
        $soma_percentual =
            (int)($_POST['percentual_ti_padrao'] ?? 0) +
            (int)($_POST['percentual_devops_padrao'] ?? 0) +
            (int)($_POST['percentual_marketing_padrao'] ?? 0);

        if ($soma_percentual !== 100) {
            $_SESSION['mensagem_erro'] = 'Erro: A soma dos percentuais para contas a receber deve ser exatamente 100%.';
            header("Location: recorrentes.php");
            exit;
        }
    }

    try {
        $params = [
            ':tipo' => $_POST['tipo'],
            ':descricao_padrao' => $_POST['descricao_padrao'],
            ':valor_padrao' => $_POST['valor_padrao'],
            ':unidade_negocio_padrao' => $_POST['unidade_negocio_padrao'],
            ':dia_vencimento' => $_POST['dia_vencimento'],
            ':id_grupo_padrao' => $_POST['id_grupo_padrao'],
            ':id_subgrupo_padrao' => $_POST['id_subgrupo_padrao'],
            ':id_classificacao_padrao' => $_POST['id_classificacao_padrao'],
            ':id_tipo_documento' => empty($_POST['id_tipo_documento']) ? null : $_POST['id_tipo_documento'],
            ':id_usuario' => $id_usuario_logado,
            ':ativo' => isset($_POST['ativo']) ? 1 : 0,
            // Campos específicos do tipo
            ':id_cliente' => ($_POST['tipo'] === 'Receber' && !empty($_POST['id_cliente'])) ? $_POST['id_cliente'] : null,
            ':fornecedor_padrao' => ($_POST['tipo'] === 'Pagar') ? ($_POST['fornecedor_padrao'] ?? null) : null,
            ':percentual_ti_padrao' => ($_POST['tipo'] === 'Receber') ? (int)($_POST['percentual_ti_padrao'] ?? 0) : 0,
            ':percentual_devops_padrao' => ($_POST['tipo'] === 'Receber') ? (int)($_POST['percentual_devops_padrao'] ?? 0) : 0,
            ':percentual_marketing_padrao' => ($_POST['tipo'] === 'Receber') ? (int)($_POST['percentual_marketing_padrao'] ?? 0) : 0
        ];

        $sql = "INSERT INTO recorrencias (tipo, descricao_padrao, valor_padrao, unidade_negocio_padrao, dia_vencimento, id_grupo_padrao, id_subgrupo_padrao, id_classificacao_padrao, id_tipo_documento, id_usuario, ativo, id_cliente, fornecedor_padrao, percentual_ti_padrao, percentual_devops_padrao, percentual_marketing_padrao) VALUES (:tipo, :descricao_padrao, :valor_padrao, :unidade_negocio_padrao, :dia_vencimento, :id_grupo_padrao, :id_subgrupo_padrao, :id_classificacao_padrao, :id_tipo_documento, :id_usuario, :ativo, :id_cliente, :fornecedor_padrao, :percentual_ti_padrao, :percentual_devops_padrao, :percentual_marketing_padrao)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $_SESSION['mensagem_sucesso'] = 'Recorrência cadastrada com sucesso!';
        
    } catch (Exception $e) {
        $_SESSION['mensagem_erro'] = 'Erro ao cadastrar recorrência: ' . $e->getMessage();
    }
    
    header("Location: recorrentes.php");
    exit;
}



// AÇÃO PARA EDITAR RECORRÊNCIA EXISTENTE
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'edit_recorrencia') {

    // Validação 1: Campos essenciais
    if (empty($_POST['id']) || empty($_POST['tipo']) || empty($_POST['descricao_padrao']) || !isset($_POST['valor_padrao']) || empty($_POST['unidade_negocio_padrao']) || empty($_POST['dia_vencimento']) || empty($_POST['id_grupo_padrao']) || empty($_POST['id_subgrupo_padrao']) || empty($_POST['id_classificacao_padrao'])) {
        $_SESSION['mensagem_erro'] = 'Erro: Todos os campos marcados com * são obrigatórios.';
        header("Location: recorrentes.php");
        exit;
    }

    // Validação 2: Soma dos percentuais (APENAS se for 'Receber')
    if ($_POST['tipo'] === 'Receber') {
        $soma_percentual =
            (int)($_POST['percentual_ti_padrao'] ?? 0) +
            (int)($_POST['percentual_devops_padrao'] ?? 0) +
            (int)($_POST['percentual_marketing_padrao'] ?? 0);

        if ($soma_percentual !== 100) {
            $_SESSION['mensagem_erro'] = 'Erro: A soma dos percentuais para contas a receber deve ser exatamente 100%.';
            header("Location: recorrentes.php");
            exit;
        }
    }

    try {
        $params = [
            ':id' => $_POST['id'],
            ':tipo' => $_POST['tipo'],
            ':descricao_padrao' => $_POST['descricao_padrao'],
            ':valor_padrao' => $_POST['valor_padrao'],
            ':unidade_negocio_padrao' => $_POST['unidade_negocio_padrao'],
            ':dia_vencimento' => $_POST['dia_vencimento'],
            ':id_grupo_padrao' => $_POST['id_grupo_padrao'],
            ':id_subgrupo_padrao' => $_POST['id_subgrupo_padrao'],
            ':id_classificacao_padrao' => $_POST['id_classificacao_padrao'],
            ':id_tipo_documento' => empty($_POST['id_tipo_documento']) ? null : $_POST['id_tipo_documento'],
            ':id_usuario' => $id_usuario_logado,
            ':ativo' => isset($_POST['ativo']) ? 1 : 0,
            // Campos específicos do tipo
            ':id_cliente' => ($_POST['tipo'] === 'Receber' && !empty($_POST['id_cliente'])) ? $_POST['id_cliente'] : null,
            ':fornecedor_padrao' => ($_POST['tipo'] === 'Pagar') ? ($_POST['fornecedor_padrao'] ?? null) : null,
            ':percentual_ti_padrao' => ($_POST['tipo'] === 'Receber') ? (int)($_POST['percentual_ti_padrao'] ?? 0) : 0,
            ':percentual_devops_padrao' => ($_POST['tipo'] === 'Receber') ? (int)($_POST['percentual_devops_padrao'] ?? 0) : 0,
            ':percentual_marketing_padrao' => ($_POST['tipo'] === 'Receber') ? (int)($_POST['percentual_marketing_padrao'] ?? 0) : 0
        ];

        $sql = "UPDATE recorrencias SET tipo = :tipo, descricao_padrao = :descricao_padrao, valor_padrao = :valor_padrao, unidade_negocio_padrao = :unidade_negocio_padrao, dia_vencimento = :dia_vencimento, id_grupo_padrao = :id_grupo_padrao, id_subgrupo_padrao = :id_subgrupo_padrao, id_classificacao_padrao = :id_classificacao_padrao, id_tipo_documento = :id_tipo_documento, id_usuario = :id_usuario, ativo = :ativo, id_cliente = :id_cliente, fornecedor_padrao = :fornecedor_padrao, percentual_ti_padrao = :percentual_ti_padrao, percentual_devops_padrao = :percentual_devops_padrao, percentual_marketing_padrao = :percentual_marketing_padrao WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $_SESSION['mensagem_sucesso'] = 'Recorrência atualizada com sucesso!';
        
    } catch (Exception $e) {
        $_SESSION['mensagem_erro'] = 'Erro ao atualizar recorrência: ' . $e->getMessage();
    }

    header("Location: recorrentes.php");
    exit;
}


// ATIVAR/INATIVAR RECORRÊNCIA
if ($action === 'toggle_status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    if ($id) {
        $stmt = $pdo->prepare("UPDATE recorrencias SET ativo = NOT ativo WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $_SESSION['mensagem_sucesso'] = 'Status da recorrência alterado com sucesso!';
    } else {
        $_SESSION['mensagem_erro'] = 'ID inválido para alterar status.';
    }
    header("Location: recorrentes.php");
    exit;
}

// EXCLUIR RECORRÊNCIA
if ($action === 'excluir_recorrencia' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    if ($id) {
        $stmt = $pdo->prepare("DELETE FROM recorrencias WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $_SESSION['mensagem_sucesso'] = 'Recorrência excluída com sucesso!';
    } else {
        $_SESSION['mensagem_erro'] = 'Erro ao tentar excluir a recorrência.';
    }
    header("Location: recorrentes.php");
    exit;
}

// --- BUSCA DE DADOS PARA EXIBIÇÃO ---

// Filtros
$params = [];
$whereConditions = [];
$filtro_ativo = $_GET['filtro_ativo'] ?? 'todos';
$filtro_tipo = $_GET['filtro_tipo'] ?? 'todos';
$filtro_unid_negocio = $_GET['filtro_unid_negocio'] ?? 'todos';
$filtro_texto = $_GET['filtro_texto'] ?? '';
$filtro_vencimento = $_GET['filtro_vencimento'] ?? 'todos';




if ($filtro_unid_negocio !== 'todos') {
    $whereConditions[] = "r.unidade_negocio_padrao = :unid_negocio";
    $params[':unid_negocio'] = $filtro_unid_negocio;
}

if ($filtro_ativo === '1') $whereConditions[] = "r.ativo = 1";
if ($filtro_ativo === '0') $whereConditions[] = "r.ativo = 0";
if ($filtro_tipo !== 'todos') {
    $whereConditions[] = "r.tipo = :tipo";
    $params[':tipo'] = $filtro_tipo;
}
if (!empty($filtro_texto)) {
    $whereConditions[] = "(r.descricao_padrao LIKE :texto OR r.fornecedor_padrao LIKE :texto OR c.clt_nomef LIKE :texto)";
    $params[':texto'] = '%' . $filtro_texto . '%';
}


if ($filtro_vencimento === 'hoje') {
    $whereConditions[] = "r.dia_vencimento = :dia_vencimento";
    $params[':dia_vencimento'] = date('d');
} elseif ($filtro_vencimento === 'amanha') {
    $amanha = new DateTime('tomorrow');
    $whereConditions[] = "r.dia_vencimento = :dia_vencimento";
    $params[':dia_vencimento'] = $amanha->format('d');
} elseif ($filtro_vencimento === 'semana') {
    $hoje = new DateTimeImmutable();
    $fimDaSemana = new DateTimeImmutable('sunday this week');
    if ($hoje->format('w') != 0) {
        $fimDaSemana = new DateTimeImmutable('next sunday');
    }
    $periodo = new DatePeriod($hoje, new DateInterval('P1D'), $fimDaSemana->modify('+1 day'));

    $diasDaSemana = [];
    foreach ($periodo as $dia) {
        $diasDaSemana[] = $dia->format('d');
    }

    if (!empty($diasDaSemana)) {
        $inParams = [];
        $i = 0;
        foreach ($diasDaSemana as $dia) {
            $key = ":dia{$i}";
            $inParams[] = $key;
            $params[$key] = $dia;
            $i++;
        }
        $whereConditions[] = "r.dia_vencimento IN (" . implode(',', $inParams) . ")";
    }
} elseif (is_numeric($filtro_vencimento) && $filtro_vencimento >= 1 && $filtro_vencimento <= 31) {
    // Esta é a nova condição que trata a seleção de um dia específico!
    $whereConditions[] = "r.dia_vencimento = :dia_vencimento";
    $params[':dia_vencimento'] = $filtro_vencimento;
}

// Ordenação
$orderBy = $_GET['orderBy'] ?? 'descricao_padrao';
$orderDir = $_GET['orderDir'] ?? 'ASC';
$colunasPermitidas = ['descricao_padrao', 'unidade_negocio_padrao', 'grupo_nome', 'subgrupo_nome', 'classificacao_nome',  'tipo', 'valor_padrao', 'dia_vencimento', 'identificador', 'ativo'];
if (!in_array($orderBy, $colunasPermitidas)) $orderBy = 'descricao_padrao';
$orderDir = strtoupper($orderDir) === 'DESC' ? 'DESC' : 'ASC';

// Consulta principal
$sql = "
    SELECT r.*,
           un.nome_unid,
           g.nome AS grupo_nome,
           sg.nome AS subgrupo_nome,
           cl.nome AS classificacao_nome,
           c.clt_nomef AS cliente_nome,
           IF(r.tipo = 'Pagar', r.fornecedor_padrao, c.clt_nomef) as identificador
    FROM recorrencias AS r
    LEFT JOIN unidade_negocio AS un ON un.id = r.unidade_negocio_padrao
    LEFT JOIN categorias_grupo AS g ON r.id_grupo_padrao = g.id
    LEFT JOIN categorias_subgrupo AS sg ON r.id_subgrupo_padrao = sg.id
    LEFT JOIN categorias_classificacao AS cl ON r.id_classificacao_padrao = cl.id
    LEFT JOIN clientes AS c ON r.id_cliente = c.clt_id
";
if (!empty($whereConditions)) $sql .= " WHERE " . implode(' AND ', $whereConditions);
$sql .= " ORDER BY $orderBy $orderDir";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$recorrencias = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Carregar dados para os modais
$clientes = $pdo->query("SELECT clt_id, clt_nomef FROM clientes ORDER BY clt_nomef ASC")->fetchAll(PDO::FETCH_ASSOC);
$grupos = $pdo->query("SELECT id, nome FROM categorias_grupo WHERE status = 1 ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$subgrupos = $pdo->query("SELECT id, nome, id_grupo FROM categorias_subgrupo WHERE status = 1 ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$classificacoes = $pdo->query("SELECT id, nome FROM categorias_classificacao WHERE status = 1 ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$documentos = $pdo->query("SELECT id, nome FROM categorias_tipo_documento WHERE status = 1 ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$unidades_negocio = $pdo->query("SELECT id, nome_unid FROM unidade_negocio WHERE sts_unid = 1 ORDER BY nome_unid ASC")->fetchAll(PDO::FETCH_ASSOC);


// Mensagens de sucesso/erro
if (isset($_SESSION['mensagem_sucesso'])) {
    $mensagem = '<div class="alert alert-success">' . $_SESSION['mensagem_sucesso'] . '</div>';
    unset($_SESSION['mensagem_sucesso']);
}
if (isset($_SESSION['mensagem_erro'])) {
    $mensagem = '<div class="alert alert-danger">' . $_SESSION['mensagem_erro'] . '</div>';
    unset($_SESSION['mensagem_erro']);
}

// Função para links de ordenação
function sortLink($label, $column, $currentOrderBy, $currentOrderDir)
{
    $newOrderDir = ($currentOrderBy === $column && $currentOrderDir === 'ASC') ? 'DESC' : 'ASC';
    $icon = ($currentOrderBy === $column) ? ($currentOrderDir === 'ASC' ? ' <i class="fas fa-sort-up"></i>' : ' <i class="fas fa-sort-down"></i>') : '';
    $queryString = http_build_query(array_merge($_GET, ['orderBy' => $column, 'orderDir' => $newOrderDir]));
    return "<a href=\"?{$queryString}\">{$label}{$icon}</a>";
}
?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <title>Gestão de Recorrências</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
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

        thead a {
            color: white;
            text-decoration: none;
        }

        thead a:hover {
            color: #ddd;
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid pt-2"> <?= $mensagem ?>
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center py-2">
                <h5 class="m-0 font-weight-bold">Gestão de Lançamentos Recorrentes</h5>
                <div class="d-flex align-items-center">
                    <button class="btn btn-outline-secondary btn-sm" type="button" data-toggle="collapse" data-target="#filtroCollapse"><i class="fas fa-filter"></i> Filtrar</button>
                    <button type="button" class="btn btn-warning btn-sm ml-2" data-toggle="modal" data-target="#modalAdicionarRecorrencia">
                        <i class="fas fa-plus"></i> Nova Recorrência
                    </button>
                </div>
            </div>

            <div class="card-body py-2 card-principal">
                <div class="collapse <?= !empty($_GET) ? 'show' : '' ?>" id="filtroCollapse">
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

                                <div class="col-md-2"><label class="small mb-1">Tipo</label><select name="filtro_tipo" class="form-control form-control-sm">
                                        <option value="todos" <?= $filtro_tipo == 'todos' ? 'selected' : '' ?>>Todos</option>
                                        <option value="Pagar" <?= $filtro_tipo == 'Pagar' ? 'selected' : '' ?>>A Pagar</option>
                                        <option value="Receber" <?= $filtro_tipo == 'Receber' ? 'selected' : '' ?>>A Receber</option>
                                    </select>
                                </div>

                                <div class="col-md-2">
                                    <label class="small mb-1">Vencimento</label>
                                    <select name="filtro_vencimento" class="form-control form-control-sm">
                                        <optgroup label="Filtros Rápidos">
                                            <option value="todos" <?= ($filtro_vencimento ?? 'todos') == 'todos' ? 'selected' : '' ?>>Todos</option>
                                            <option value="hoje" <?= ($filtro_vencimento ?? '') == 'hoje' ? 'selected' : '' ?>>Vence Hoje</option>
                                            <option value="amanha" <?= ($filtro_vencimento ?? '') == 'amanha' ? 'selected' : '' ?>>Vence Amanhã</option>
                                            <option value="semana" <?= ($filtro_vencimento ?? '') == 'semana' ? 'selected' : '' ?>>Vence Nesta Semana</option>
                                        </optgroup>
                                        <optgroup label="Dia Específico">
                                            <?php for ($i = 1; $i <= 31; $i++) : ?>
                                                <option value="<?= $i ?>" <?= ($filtro_vencimento ?? '') == $i ? 'selected' : '' ?>>
                                                    Dia <?= str_pad($i, 2, '0', STR_PAD_LEFT) ?>
                                                </option>
                                            <?php endfor; ?>
                                        </optgroup>
                                    </select>
                                </div>

                                <div class="col-md-2"><label class="small mb-1">Status</label><select name="filtro_ativo" class="form-control form-control-sm">
                                        <option value="todos" <?= $filtro_ativo == 'todos' ? 'selected' : '' ?>>Todos</option>
                                        <option value="1" <?= $filtro_ativo == '1' ? 'selected' : '' ?>>Ativos</option>
                                        <option value="0" <?= $filtro_ativo == '0' ? 'selected' : '' ?>>Inativos</option>
                                    </select>
                                </div>

                                <div class="col-md-3">
                                    <label class="small mb-1">Descrição, Fornecedor ou Cliente</label>
                                    <input type="text" name="filtro_texto" class="form-control form-control-sm" value="<?= htmlspecialchars($filtro_texto) ?>" placeholder="Buscar...">
                                </div>
                                <div class="col-md-1 align-self-end">
                                    <div class="btn-group w-100">
                                        <button type="submit" class="btn btn-secondary btn-sm mr-2" title="Filtrar"><i class="fas fa-filter"></i> </button>
                                        <a href="recorrentes.php" class="btn btn-outline-secondary btn-sm" title="Limpar Filtros"><i class="fas fa-eraser"></i></a>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table table-sm table-bordered table-striped table-hover">
                        <thead class="thead-dark">
                            <tr>
                                <th><?= sortLink('Cliente/Fornecedor', 'identificador', $orderBy, $orderDir) ?></th>
                                <th><?= sortLink('Descrição', 'descricao_padrao', $orderBy, $orderDir) ?></th>
                                <th><?= sortLink('Tipo', 'tipo', $orderBy, $orderDir) ?></th>
                                <th><?= sortLink('Valor Padrão', 'valor_padrao', $orderBy, $orderDir) ?></th>
                                <th><?= sortLink('Dia Venc.', 'dia_vencimento', $orderBy, $orderDir) ?></th>
                                <th><?= sortLink('Unidade de Negocio', 'unidade_negocio_padrao', $orderBy, $orderDir) ?></th>
                                <th class="text-center"><?= sortLink('Status', 'ativo', $orderBy, $orderDir) ?></th>
                                <th class="text-center">Açães</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($recorrencias)): ?>
                                <tr>
                                    <td colspan="8" class="text-center">Nenhuma recorrência encontrada.</td>
                                </tr>
                                <?php else: foreach ($recorrencias as $item): ?>
                                    <tr>
                                        <td><?= $item['identificador'] ?></td>
                                        <td><?= $item['descricao_padrao'] ?></td>
                                        <td><span class="badge badge-<?= $item['tipo'] == 'Pagar' ? 'danger' : 'success' ?>"><?= $item['tipo'] ?></span></td>
                                        <td>R$ <?= number_format($item['valor_padrao'], 2, ',', '.') ?></td>
                                        <td class="text-center"><?= str_pad($item['dia_vencimento'], 2, '0', STR_PAD_LEFT) ?></td>
                                        <td><?= htmlspecialchars($item['nome_unid']) ?></td>
                                        <td class="text-center">
                                            <span class="badge badge-<?= $item['ativo'] ? 'success' : 'secondary' ?>"><?= $item['ativo'] ? 'Ativo' : 'Inativo' ?></span>
                                        </td>
                                        <td class="text-center">
                                            <form method="POST" style="display: inline;">
                                                <input type="hidden" name="action" value="toggle_status">
                                                <input type="hidden" name="id" value="<?= $item['id'] ?>">
                                                <?php if ($item['ativo'] == 1): ?>
                                                    <button type="submit" class="btn btn-secondary btn-sm" title="Desativar">
                                                        <i class="fas fa-power-off"></i>
                                                    </button>
                                                <?php else: ?>
                                                    <button type="submit" class="btn btn-success btn-sm" title="Ativar">
                                                        <i class="fas fa-check-circle"></i>
                                                    </button>
                                                <?php endif; ?>
                                            </form>
                                            <button type="button" class="btn btn-sm btn-warning btn-edit" data-json='<?= json_encode($item) ?>' title="Editar Recorrência"><i class="fas fa-edit"></i></button>
                                            <button type="button" class="btn btn-sm btn-danger btn-excluir" data-id="<?= $item['id'] ?>" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                                        </td>
                                    </tr>
                            <?php endforeach;
                            endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Adicionar Recorrencia -->
    <div class="modal fade" id="modalAdicionarRecorrencia" tabindex="-1">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="action" value="add_recorrencia">
                    <div class="modal-header">
                        <h5 class="modal-title">Nova Recorrência</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-row">
                            <div class="form-group col-md-3">
                                <label class="small mb-1" for="add_tipo">Tipo: </label>
                                <select name="tipo" id="add_tipo" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <option value="Pagar">A Pagar</option>
                                    <option value="Receber">A Receber</option>
                                </select>
                            </div>
                            <div class="form-group col-md-3">
                                <label class="small mb-1" for="add_valor_padrao">Valor Padrão (R$): </label>
                                <input type="number" step="1" name="valor_padrao" id="add_valor_padrao" class="form-control form-control-sm" required>
                            </div>
                            <div class="form-group col-md-2">
                                <label class="small mb-1" for="add_dia_vencimento">Dia do Vencimento: </label>
                                <input type="number" min="1" max="31" name="dia_vencimento" id="add_dia_vencimento" class="form-control form-control-sm" required>
                            </div>
                            <div class="form-group col-md-4 campo-pagar d-none">
                                <label class="small mb-1" for="add_fornecedor_padrao">Fornecedor / Favorecido:</label>
                                <input type="text" name="fornecedor_padrao" id="add_fornecedor_padrao" class="form-control form-control-sm">
                            </div>
                            <div class="form-group col-md-4 campo-receber-group d-none">
                                <label class="small mb-1" for="add_id_cliente">Cliente:</label>
                                <select name="id_cliente" id="add_id_cliente" class="form-control form-control-sm">
                                    <option value="">Nenhum</option>
                                    <?php foreach ($clientes as $c): ?>
                                        <option value="<?= $c['clt_id'] ?>"><?= htmlspecialchars($c['clt_nomef']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>

                        </div>
                        <div class="form-row">
                            <div class="form-group col-md-12">
                                <label class="small mb-1" for="add_descricao_padrao">Descrição Padrão: </label>
                                <input type="text" name="descricao_padrao" id="add_descricao_padrao" class="form-control form-control-sm" required>
                            </div>

                        </div>
                        <hr>
                        <h6>Classificação Padrão</h6>
                        <div class="form-row">
                            <div class="form-group col-md-3">
                                <label class="small mb-1" for="add_unidade_negocio_padrao">Unidade de Negócio: </label>
                                <select name="unidade_negocio_padrao" id="add_unidade_negocio_padrao" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <?php foreach ($unidades_negocio as $item): ?>
                                        <option value="<?= $item['id'] ?>"><?= htmlspecialchars($item['nome_unid']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-3">
                                <label class="small mb-1" for="add_id_grupo_padrao">Grupo:</label>
                                <select name="id_grupo_padrao" id="add_id_grupo_padrao" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <?php foreach ($grupos as $g): ?>
                                        <option value="<?= $g['id'] ?>"><?= htmlspecialchars($g['nome']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-2">
                                <label class="small mb-1" for="add_id_subgrupo_padrao">Subgrupo:</label>
                                <select name="id_subgrupo_padrao" id="add_id_subgrupo_padrao" class="form-control form-control-sm" required>
                                    <option value="">Selecione um grupo</option>
                                </select>
                            </div>
                            <div class="form-group col-md-2">
                                <label class="small mb-1" for="add_id_classificacao_padrao">Classificação:</label>
                                <select name="id_classificacao_padrao" id="add_id_classificacao_padrao" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <?php foreach ($classificacoes as $cl): ?>
                                        <option value="<?= $cl['id'] ?>"><?= htmlspecialchars($cl['nome']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-2">
                                <label class="small mb-1" for="add_id_tipo_documento">Tipo de Documento:</label>
                                <select name="id_tipo_documento" id="add_id_tipo_documento" class="form-control form-control-sm">
                                    <option value="">Nenhum</option>
                                    <?php foreach ($documentos as $doc): ?>
                                        <option value="<?= $doc['id'] ?>"><?= htmlspecialchars($doc['nome']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <div class="form-row campo-receber-row d-none">
                            <div class="col-12">
                                <hr>
                                <h6>Divisão de Percentuais (Receitas)</h6>
                            </div>
                            <div class="form-group col-md-2"><label class="small mb-1" for="add_percentual_ti_padrao">% TI</label><input type="number" step="1" name="percentual_ti_padrao" id="add_percentual_ti_padrao" class="form-control form-control-sm" value="0"></div>
                            <div class="form-group col-md-2"><label class="small mb-1" for="add_percentual_devops_padrao">% DevOps</label><input type="number" step="1" name="percentual_devops_padrao" id="add_percentual_devops_padrao" class="form-control form-control-sm" value="0"></div>
                            <div class="form-group col-md-2"><label class="small mb-1" for="add_percentual_marketing_padrao">% Marketing</label><input type="number" step="1" name="percentual_marketing_padrao" id="add_percentual_marketing_padrao" class="form-control form-control-sm" value="0"></div>
                            <div class="form-group col-md-3"><label class="small mb-1">Total</label>
                                <div class="form-control-plaintext font-weight-bold" id="add_percentual_total">0%</div>
                            </div>
                            <hr>
                        </div>
                        <div class="form-group form-check text-right"><input type="checkbox" class="form-check-input" name="ativo" id="add_ativo" value="1" checked><label class="form-check-label" for="add_ativo"><b>Recorrência Ativa</b></label></div>
                    </div>
                    <div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-primary">Salvar</button></div>
                </form>
            </div>
        </div>
    </div>



    <!-- Modal Editar Recorrencia -->
    <div class="modal fade" id="modalEditarRecorrencia" tabindex="-1">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="action" value="edit_recorrencia">
                    <input type="hidden" name="id" id="edit_recorrencia_id">
                    <div class="modal-header">
                        <h5 class="modal-title">Editar Recorrência</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-row">
                            <div class="form-group col-md-3">
                                <label class="small mb-1" for="edit_tipo">Tipo: </label>
                                <select name="tipo" id="edit_tipo" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <option value="Pagar">A Pagar</option>
                                    <option value="Receber">A Receber</option>
                                </select>
                            </div>

                            <div class="form-group col-md-3">
                                <label class="small mb-1" for="edit_valor_padrao">Valor Padrão (R$): </label>
                                <input type="number" step="1" name="valor_padrao" id="edit_valor_padrao" class="form-control form-control-sm" required>
                            </div>
                            <div class="form-group col-md-2">
                                <label class="small mb-1" for="edit_dia_vencimento">Dia do Vencimento:</label>
                                <input type="number" min="1" max="31" name="dia_vencimento" id="edit_dia_vencimento" class="form-control form-control-sm" required>
                            </div>
                            <div class="form-group col-md-4 campo-pagar d-none">
                                <label class="small mb-1" for="edit_fornecedor_padrao">Fornecedor / Favorecido:</label>
                                <input type="text" name="fornecedor_padrao" id="edit_fornecedor_padrao" class="form-control form-control-sm">
                            </div>
                            <div class="form-group col-md-4 campo-receber-group d-none">
                                <label class="small mb-1" for="edit_id_cliente">Cliente Padrão:</label>
                                <select name="id_cliente" id="edit_id_cliente" class="form-control form-control-sm">
                                    <option value="">Nenhum</option>
                                    <?php foreach ($clientes as $c): ?>
                                        <option value="<?= $c['clt_id'] ?>"><?= htmlspecialchars($c['clt_nomef']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group col-md-12">
                                <label class="small mb-1" for="edit_descricao_padrao">Descrição: </label>
                                <input type="text" name="descricao_padrao" id="edit_descricao_padrao" class="form-control form-control-sm" required>
                            </div>
                        </div>
                        <hr>
                        <h6>Classificação Padrão</h6>
                        <div class="form-row">
                            <div class="form-group col-md-3">
                                <label class="small mb-1" for="edit_unidade_negocio_padrao">Unidade de Negócio: </label>
                                <select name="unidade_negocio_padrao" id="edit_unidade_negocio_padrao" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <?php foreach ($unidades_negocio as $item): ?>
                                        <option value="<?= $item['id'] ?>"><?= htmlspecialchars($item['nome_unid']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-3">
                                <label class="small mb-1" for="edit_id_grupo_padrao">Grupo: </label>
                                <select name="id_grupo_padrao" id="edit_id_grupo_padrao" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <?php foreach ($grupos as $g): ?>
                                        <option value="<?= $g['id'] ?>"><?= htmlspecialchars($g['nome']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-2">
                                <label class="small mb-1" for="edit_id_subgrupo_padrao">Subgrupo: </label>
                                <select name="id_subgrupo_padrao" id="edit_id_subgrupo_padrao" class="form-control form-control-sm" required>
                                    <option value="">Selecione um grupo</option>
                                </select>
                            </div>
                            <div class="form-group col-md-2">
                                <label class="small mb-1" for="edit_id_classificacao_padrao">Classificação: </label>
                                <select name="id_classificacao_padrao" id="edit_id_classificacao_padrao" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <?php foreach ($classificacoes as $cl): ?>
                                        <option value="<?= $cl['id'] ?>"><?= htmlspecialchars($cl['nome']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-2">
                                <label class="small mb-1" for="edit_id_tipo_documento">Tipo de Documento:</label>
                                <select name="id_tipo_documento" id="edit_id_tipo_documento" class="form-control form-control-sm">
                                    <option value="">Nenhum</option>
                                    <?php foreach ($documentos as $doc): ?>
                                        <option value="<?= $doc['id'] ?>"><?= htmlspecialchars($doc['nome']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <div class="form-row campo-receber-row d-none">
                            <div class="col-12">
                                <hr>
                                <h6>Divisão de Percentuais (Receitas)</h6>
                            </div>
                            <div class="form-group col-md-2"><label class="small mb-1" for="edit_percentual_ti_padrao">% TI</label><input type="number" step="1" name="percentual_ti_padrao" id="edit_percentual_ti_padrao" class="form-control form-control-sm" value="0"></div>
                            <div class="form-group col-md-2"><label class="small mb-1" for="edit_percentual_devops_padrao">% DevOps</label><input type="number" step="1" name="percentual_devops_padrao" id="edit_percentual_devops_padrao" class="form-control form-control-sm" value="0"></div>
                            <div class="form-group col-md-2"><label class="small mb-1" for="edit_percentual_marketing_padrao">% Marketing</label><input type="number" step="1" name="percentual_marketing_padrao" id="edit_percentual_marketing_padrao" class="form-control form-control-sm" value="0"></div>
                            <div class="form-group col-md-2">
                                <label class="small mb-1">Total</label>
                                <div class="form-control-plaintext font-weight-bold" id="edit_percentual_total">0%</div>
                            </div>
                            <hr>
                        </div>
                        <div class="form-group form-check text-right mb-0">
                            <input type="checkbox" class="form-check-input" name="ativo" id="edit_ativo" value="1" checked>
                            <label class="form-check-label" for="edit_ativo"><b>Recorrência Ativa</b></label>
                        </div>
                    </div>
                    <div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-primary">Salvar Alterações</button></div>
                </form>
            </div>
        </div>
    </div>


    <!-- Modal Excluir -->
    <div class="modal fade" id="modalExcluir" tabindex="-1">
        <div class="modal-dialog modal-sm">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="action" value="excluir_recorrencia">
                    <input type="hidden" name="id" id="excluir_id">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirmar Exclusão</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Tem certeza que deseja excluir esta recorrência? Esta ação não pode ser desfeita.</p>
                    </div>
                    <div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-danger">Excluir</button></div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

    <script>
        $(document).ready(function() {
            const subgrupos = <?= json_encode($subgrupos, JSON_NUMERIC_CHECK) ?>;

            // Função para popular subgrupos (pode ser usada por ambos os modais)
            function popularSubgrupos(grupoId, selectSubgrupo, subgrupoSelecionadoId = null) {
                const subsFiltrados = subgrupos.filter(sg => sg.id_grupo === grupoId);
                $(selectSubgrupo).empty().append('<option value="">Selecione...</option>');
                subsFiltrados.forEach(sg => {
                    const selected = sg.id === subgrupoSelecionadoId ? ' selected' : '';
                    $(selectSubgrupo).append(`<option value="${sg.id}"${selected}>${sg.nome}</option>`);
                });
            }

            // Lógica para mostrar/esconder campos baseados no TIPO (versão corrigida e robusta)
            function toggleTipoFields(selectElement) {
                const $select = $(selectElement); // O <select> que disparou o evento
                const tipo = $select.val();

                // Encontra o modal pai mais préximo do select que foi alterado. Esta é a mágica.
                const $modal = $select.closest('.modal');

                // Busca os campos de classe específica APENAS DENTRO do modal correto
                const $camposPagar = $modal.find('.campo-pagar');
                const $camposReceber = $modal.find('.campo-receber-group, .campo-receber-row');

                if (tipo === 'Pagar') {
                    $camposPagar.removeClass('d-none');
                    $camposReceber.addClass('d-none');
                } else if (tipo === 'Receber') {
                    $camposPagar.addClass('d-none');
                    $camposReceber.removeClass('d-none');
                } else {
                    $camposPagar.addClass('d-none');
                    $camposReceber.addClass('d-none');
                }
            }

            // Evento de 'change' para os selects de TIPO de ambos os modais
            $('#add_tipo, #edit_tipo').on('change', function() {
                toggleTipoFields(this); // 'this' é o próprio <select>
            });

            // Evento de 'change' para os selects de GRUPO de ambos os modais
            $('#add_id_grupo_padrao, #edit_id_grupo_padrao').on('change', function() {
                const grupoId = parseInt($(this).val(), 10);
                // Determina qual select de subgrupo deve ser populado
                const subgrupoSelector = $(this).attr('id') === 'add_id_grupo_padrao' ? '#add_id_subgrupo_padrao' : '#edit_id_subgrupo_padrao';
                popularSubgrupos(grupoId, subgrupoSelector);
            });

            // Eventos para o modal ADICIONAR
            $('#modalAdicionarRecorrencia').on('show.bs.modal', function() {
                // Limpa o formulário ao abrir
                $(this).find('form').trigger('reset');
                $('#add_ativo').prop('checked', true);
                toggleTipoFields('add');
            });
            $('#add_id_grupo_padrao').on('change', function() {
                popularSubgrupos(parseInt($(this).val(), 10), '#add_id_subgrupo_padrao');
            });
            $('#add_tipo').on('change', function() {
                toggleTipoFields('add');
            });


            // Eventos para o modal EDITAR
            $('.btn-edit').on('click', function() {
                const data = $(this).data('json');

                // Popula os campos do modal de edição
                $('#edit_recorrencia_id').val(data.id);
                $('#edit_tipo').val(data.tipo);
                $('#edit_descricao_padrao').val(data.descricao_padrao);
                $('#edit_valor_padrao').val(data.valor_padrao);
                $('#edit_unidade_negocio_padrao').val(data.unidade_negocio_padrao);
                $('#edit_dia_vencimento').val(data.dia_vencimento);
                $('#edit_fornecedor_padrao').val(data.fornecedor_padrao);
                $('#edit_id_cliente').val(data.id_cliente);
                $('#edit_id_grupo_padrao').val(data.id_grupo_padrao);
                $('#edit_id_classificacao_padrao').val(data.id_classificacao_padrao);
                $('#edit_id_tipo_documento').val(data.id_tipo_documento);
                $('#edit_percentual_ti_padrao').val(data.percentual_ti_padrao);
                $('#edit_percentual_devops_padrao').val(data.percentual_devops_padrao);
                $('#edit_percentual_marketing_padrao').val(data.percentual_marketing_padrao);
                $('#edit_ativo').prop('checked', data.ativo == 1);

                // Dispara as funçães para ajustar a visibilidade e os subgrupos
                toggleTipoFields('edit');
                popularSubgrupos(parseInt(data.id_grupo_padrao, 10), '#edit_id_subgrupo_padrao', parseInt(data.id_subgrupo_padrao, 10));

                toggleTipoFields($('#edit_tipo'));


                // Abre o modal de edição
                $('#modalEditarRecorrencia').modal('show');
            });
            $('#edit_id_grupo_padrao').on('change', function() {
                popularSubgrupos(parseInt($(this).val(), 10), '#edit_id_subgrupo_padrao');
            });
            $('#edit_tipo').on('change', function() {
                toggleTipoFields('edit');
            });


            // Prepara o modal de exclusáo (sem alteração)
            $('.btn-excluir').on('click', function() {
                $('#excluir_id').val($(this).data('id'));
                $('#modalExcluir').modal('show');
            });

            // Função para calcular e exibir a soma dos percentuais
            function atualizarSomaPercentuais(context) {
                const $context = $(context);

                const ti = parseInt($context.find('input[name="percentual_ti_padrao"]').val()) || 0;
                const devops = parseInt($context.find('input[name="percentual_devops_padrao"]').val()) || 0;
                const marketing = parseInt($context.find('input[name="percentual_marketing_padrao"]').val()) || 0;

                const total = ti + devops + marketing;

                // Encontra o novo display de total (div ou p)
                const $displayTotal = $context.find('.form-control-plaintext');
                $displayTotal.text(`${total}%`);

                // Muda a cor do texto para vermelho se passar de 100%
                if (total !== 100) {
                    $displayTotal.removeClass('text-success').addClass('text-danger');
                } else {
                    $displayTotal.removeClass('text-danger').addClass('text-success');
                }
            }

            // Gatilho para atualizar a soma em tempo real
            $('input[name^="percentual_"]').on('input', function() {
                const $form = $(this).closest('form');
                atualizarSomaPercentuais($form);
            });

            // Garante que a soma seja calculada ao mostrar/esconder os campos
            $('#add_tipo, #edit_tipo').on('change', function() {
                toggleTipoFields(this);
                const $form = $(this).closest('form');
                atualizarSomaPercentuais($form);
            });

            // Validação final ANTES de enviar o formulário
            $('#modalAdicionarRecorrencia form, #modalEditarRecorrencia form').on('submit', function(event) {
                const $form = $(this);
                const tipo = $form.find('select[name="tipo"]').val();

                if (tipo === 'Receber') {
                    const ti = parseInt($form.find('input[name="percentual_ti_padrao"]').val()) || 0;
                    const devops = parseInt($form.find('input[name="percentual_devops_padrao"]').val()) || 0;
                    const marketing = parseInt($form.find('input[name="percentual_marketing_padrao"]').val()) || 0;
                    const total = ti + devops + marketing;

                    if (total > 100) {
                        event.preventDefault(); // Impede o envio
                        alert(`Erro: A soma dos percentuais dever ser igual é 100%.\nTotal atual: ${total}%`);
                    }
                }
            });

            // Timeout para mensagens
            window.setTimeout(function() {
                $(".alert").fadeOut(500, function() {
                    $(this).remove();
                });
            }, 4000);
        });
    </script>
</body>

</html>