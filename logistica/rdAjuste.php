<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// TODO: Altere esta permissão para a da Gerência (ex: $m9_02 ou $m9_03)
if ($m9_00 == 0 || !isset($_SESSION['allterusN3Id'])) {
    header("Location: ../home.php");
    exit;
}



$pdo = ConnectionN3();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

$id_usuario_sessao = (int)$_SESSION['allterusN3Id'];
$action = $_POST['action'] ?? $_GET['action'] ?? '';

// ===================================================================
// INÍCIO DO PROCESSAMENTO DE AÇÕES (ADD/EDIT/DELETE)
// ===================================================================

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    var_dump($_POST);
    exit;

    try {
        // --- ADICIONAR DESPESA DE AJUSTE ---
        if ($action === 'add_ajuste') {



            $user_id = (int)$_POST['user_id'];
            $date_created = $_POST['date_created']; // Data vinda do modal
            $aj = (int)$_POST['aj']; // Deve ser 0
            $amount = str_replace(',', '.', $_POST['amount']);
            $category_id = (int)$_POST['category_id'];
            $cliente_id = (int)$_POST['cliente_id'];
            $remarks = strip_tags($_POST['remarks'] ?? '', '<a>'); // Limpa o HTML
            $pix = $_POST['pix'] ?? null;
            $pix_type = $_POST['pix_type'] ?? null;

            // Busca o nome do cliente baseado no ID
            $stmtCli = $pdo->prepare("SELECT clt_nomef FROM clientes WHERE clt_id = ?");
            $stmtCli->execute([$cliente_id]);
            $cliente_nome = $stmtCli->fetchColumn();

            $sql = "INSERT INTO running_balance 
                        (user_id, date_created, date_updated, aj, amount, category_id, clt_id, cliente, remarks, pix, pix_type, status, input_flag) 
                    VALUES 
                        (:user_id, :date_created, :date_updated, :aj, :amount, :category_id, :clt_id, :cliente_nome, :remarks, :pix, :pix_type, 1, 1)";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':user_id' => $user_id,
                ':date_created' => $date_created,
                ':date_updated' => $date_created, // Data de update é a mesma da criação
                ':aj' => $aj, // Salva como 0
                ':amount' => $amount,
                ':category_id' => $category_id,
                ':clt_id' => $cliente_id,
                ':cliente_nome' => $cliente_nome,
                ':remarks' => $remarks,
                ':pix' => $pix,
                ':pix_type' => $pix_type,
            ]);

            $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Despesa de ajuste lançada com sucesso!'];
        }

        // --- EDITAR DESPESA DE AJUSTE ---
        if ($action === 'edit_ajuste') {
            $id = (int)$_POST['id'];
            $user_id = (int)$_POST['user_id'];
            $date_created = $_POST['date_created'];
            $amount = str_replace(',', '.', $_POST['amount']);
            $category_id = (int)$_POST['category_id'];
            $cliente_id = (int)$_POST['cliente_id'];
            $remarks = strip_tags($_POST['remarks'] ?? '', '<a>');
            $pix = $_POST['pix'] ?? null;
            $pix_type = $_POST['pix_type'] ?? null;

            $stmtCli = $pdo->prepare("SELECT clt_nomef FROM clientes WHERE clt_id = ?");
            $stmtCli->execute([$cliente_id]);
            $cliente_nome = $stmtCli->fetchColumn();

            $sql = "UPDATE running_balance SET
                        user_id = :user_id,
                        date_created = :date_created,
                        date_updated = NOW(),
                        amount = :amount,
                        category_id = :category_id,
                        clt_id = :clt_id,
                        cliente = :cliente_nome,
                        remarks = :remarks,
                        pix = :pix,
                        pix_type = :pix_type
                    WHERE id = :id AND aj = 0";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':id' => $id,
                ':user_id' => $user_id,
                ':date_created' => $date_created,
                ':amount' => $amount,
                ':category_id' => $category_id,
                ':clt_id' => $cliente_id,
                ':cliente_nome' => $cliente_nome,
                ':remarks' => $remarks,
                ':pix' => $pix,
                ':pix_type' => $pix_type
            ]);

            $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Ajuste atualizado com sucesso!'];
        }

        // --- EXCLUIR DESPESA DE AJUSTE ---
        if ($action === 'delete_ajuste') {
            $id = (int)$_POST['id'];
            // Apenas permite excluir se o status for 1 (Aguardando Aprovação)
            $sql = "DELETE FROM running_balance WHERE id = :id AND aj = 0 AND status = 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() > 0) {
                $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Ajuste excluído com sucesso!'];
            } else {
                $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao excluir ajuste. Pode já ter sido aprovado.'];
            }
        }
    } catch (Exception $e) {
        $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro na operação: ' . $e->getMessage()];
    }

    header("Location: RDajuste.php");
    exit;
}

// ===================================================================
// FIM DO PROCESSAMENTO DE AÇÕES
// =NORMALMENTE (GET)
// ===================================================================

// Busca TODOS os tecnicos/usuários para preencher o dropdown
$sqlBuscaTodosUsuarios = "SELECT user_id, user_nome FROM usuarios ORDER BY user_nome ASC";
$listaDeTecnicos = $pdo->query($sqlBuscaTodosUsuarios)->fetchAll(PDO::FETCH_ASSOC);

// Filtros de data
$dataInicio = $_GET['data_inicio'] ?? date('Y-m-01');
$dataFim = $_GET['data_fim'] ?? date('Y-m-t');

// Query principal agora busca por aj = 0 (Ajustes da Gerência)
$sqlBuscaDespesas = "SELECT r.id, u.user_nome, r.remarks, r.clt_id, r.cliente as cliente_nome ,
                     r.amount, r.user_id, r.category_id, cat.nome AS categoria_nome, 
                     r.date_created, r.status, 
                     r.pix, r.pix_type, r.anexos 
                     FROM running_balance r
                     LEFT JOIN usuarios u ON u.user_id = r.user_id
                     LEFT JOIN categorias_subgrupo cat ON cat.id = category_id
                     WHERE r.aj = 0 AND r.date_created BETWEEN :data_inicio AND :data_fim 
                     ORDER BY r.date_created DESC";

$rds = $pdo->prepare($sqlBuscaDespesas);
$rds->execute([
    ':data_inicio' => $dataInicio,
    ':data_fim' => $dataFim . ' 23:59:59'
]);
$despesas = $rds->fetchAll(PDO::FETCH_ASSOC);

// Buscas de apoio para os modais
$categorias = $pdo->query("SELECT id, nome AS nome_categoria FROM categorias_subgrupo WHERE aplicavel IN ('Ambos', 'RD') ORDER BY nome")->fetchAll(PDO::FETCH_ASSOC);
$clientes = $pdo->query("SELECT clt_id as id, clt_nomef as nome FROM clientes ORDER BY clt_nomef")->fetchAll(PDO::FETCH_ASSOC);
$tiposChave = $pdo->query("SELECT id, name_type FROM type_keys ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8" />
    <title>Ajuste de Despesas (Gerência)</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="../img/favicon.ico" />
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
    <style>
        body {
            zoom: 0.9;
            overflow-x: hidden;
            width: 100%;
            background-color: #f4f6f9;
            font-size: 0.9rem;
        }

        .card-body {
            overflow-y: auto;
            height: 84vh;
            width: 100%;
            color: #333;
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid mt-2">
        <div class="card">
            <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h4 class="m-0">Lançar/Ajustar Despesas de Tecnicos</h4>
                <div class="col-md-8 text-right">
                    <form method="GET" action="RDajustar.php" class="form-inline justify-content-end">
                        <label class="mr-2 small">De:</label>
                        <input type="date" name="data_inicio" class="form-control form-control-sm mr-2" value="<?= htmlspecialchars($dataInicio) ?>">
                        <label class="mr-2 small">Até:</label>
                        <input type="date" name="data_fim" class="form-control form-control-sm mr-2" value="<?= htmlspecialchars($dataFim) ?>">
                        <button type="submit" class="btn btn-sm btn-primary mr-2">Filtrar</button>
                        <a href="RDajustar.php" class="btn btn-sm btn-secondary">Limpar</a>
                    </form>
                </div>
                <button type="button" class="btn btn-success btn-sm" data-toggle="modal" data-target="#modaladd">
                    <i class="fas fa-plus"></i> Lançar Despesa
                </button>
            </div>
            <div class="card-body">
                <?php if (isset($_SESSION['alert_message'])) {
                    $alert = $_SESSION['alert_message'];
                    echo "<div class='alert alert-{$alert['type']} alert-dismissible fade show' role='alert'>
                            {$alert['text']}
                            <button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>
                          </div>";
                    unset($_SESSION['alert_message']);
                } ?>
                <?php if (empty($despesas)) : ?>
                    <div class="alert alert-info">Nenhuma despesa (ajuste) encontrada para o período.</div>
                <?php else : ?>
                    <div class="table-responsive">
                        <table class="table table-bordered table-striped" width="100%">
                            <thead class="thead-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Tecnico</th>
                                    <th>Cliente</th>
                                    <th>Categoria</th>
                                    <th>Descrição</th>
                                    <th style="width: 150px">Valor</th>
                                    <th>Data</th>
                                    <th>Status</th>
                                    <th style="width: 140px">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                function exibirDescricao($remarks)
                                {
                                    if (!empty($remarks)) {
                                        echo nl2br(htmlspecialchars($remarks));
                                    }
                                }

                                foreach ($despesas as $rd) :
                                ?>
                                    <tr>
                                        <td><?= $rd['id'] ?></td>
                                        <td><?= htmlspecialchars($rd['user_nome']) ?></td>
                                        <td><?= htmlspecialchars($rd['cliente_nome']) ?></td>
                                        <td><?= htmlspecialchars($rd['categoria_nome']) ?></td>
                                        <td><?php exibirDescricao($rd['remarks']); ?></td>
                                        <td>R$ <?= number_format($rd['amount'], 2, ',', '.') ?></td>
                                        <td><?= date('d/m/Y', strtotime($rd['date_created'])) ?></td>
                                        <td>
                                            <?php
                                            switch ($rd['status']) {
                                                case 1:
                                                    echo "Aguardando Aprovação ?";
                                                    break;
                                                case 2:
                                                    echo "Aprovado p/ Pagamento ?";
                                                    break;
                                                case 3:
                                                    echo "Pagamento Negado ?";
                                                    break;
                                                case 4:
                                                    echo "Pagamento Concluído ??";
                                                    break;
                                                default:
                                                    echo "Indefinido";
                                            }
                                            ?>
                                        </td>
                                        <td class="text-center">
                                            <?php if ($rd['status'] == 1) : ?>
                                                <button type="button" class="btn btn-warning btn-sm edit-btn" data-toggle="modal" data-target="#editModal" data-id="<?= $rd['id'] ?>" data-user_id="<?= $rd['user_id'] ?>" data-date_created="<?= date('Y-m-d', strtotime($rd['date_created'])) ?>" data-valor="<?= $rd['amount'] ?>" data-categoria="<?= $rd['category_id'] ?? '' ?>" data-cliente_id="<?= $rd['clt_id'] ?? '' ?>" data-observacoes="<?= htmlspecialchars($rd['remarks']) ?>" data-pix_type="<?= $rd['pix_type'] ?? '' ?>" data-pix="<?= htmlspecialchars($rd['pix'] ?? '') ?>">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-danger btn-sm btn-excluir" data-toggle="modal" data-target="#excluirModal" data-id="<?= (int)$rd['id'] ?>">
                                                    <i class="fas fa-trash-alt"></i>
                                                </button>
                                            <?php else : ?>
                                                <span class="text-muted"><i class="fas fa-lock" title="Não editável"></i></span>
                                            <?php endif; ?>
                                            <button type="button" class="btn btn-info btn-sm duplicar-btn" data-toggle="modal" data-target="#duplicarModal" data-user_id="<?= $rd['user_id'] ?>" data-valor="<?= $rd['amount'] ?>" data-categoria="<?= $rd['category_id'] ?? '' ?>" data-pix_type="<?= $rd['pix_type'] ?? '' ?>" data-pix="<?= $rd['pix'] ?? '' ?>" data-cliente_id="<?= $rd['clt_id'] ?? '' ?>" data-observacoes="<?= $rd['remarks'] ?>" title="Duplicar RD">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <div class="modal fade" id="modaladd" tabindex="-1">
        <div class="modal-dialog" role="document">
            <form class="modal-content" action="RDajustar.php" method="POST">
                <input type="hidden" name="action" value="add_ajuste">
                <input type="hidden" name="aj" value="0">
                <div class="modal-header">
                    <h5 class="modal-title">Lançar Despesa (Ajuste)</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group col-md-8">
                            <label class="small mb-1" for="add_user_id">Tecnico:</label>
                            <select class="form-control form-control-sm" id="add_user_id" name="user_id" required>
                                <option value="">Selecione um técnico...</option>
                                <?php foreach ($listaDeTecnicos as $tecnico) : ?>
                                    <option value="<?= $tecnico['user_id'] ?>"><?= htmlspecialchars($tecnico['user_nome']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group col-md-4">
                            <label class="small mb-1" for="add_date_created">Data da Despesa:</label>
                            <input type="date" class="form-control form-control-sm" id="add_date_created" name="date_created" value="<?= date('Y-m-d') ?>" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-md-4"><label class="small mb-1" for="amount">Valor:</label><input type="number" step="0.01" class="form-control form-control-sm" id="amount" name="amount" required></div>
                        <div class="form-group col-md-8">
                            <label class="small mb-1" for="category_id">Categoria:</label>
                            <select class="form-control form-control-sm" id="category_id" name="category_id" required>
                                <option value="">Selecione...</option>
                                <?php foreach ($categorias as $categoria) : ?>
                                    <option value="<?= htmlspecialchars($categoria['id']) ?>"><?= htmlspecialchars($categoria['nome_categoria']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-md-4">
                            <label class="small mb-1" for="pix_type">Tipo de Chave Pix</label>
                            <select class="form-control form-control-sm" id="pix_type" name="pix_type" required>
                                <option value="">Selecione...</option>
                                <?php foreach ($tiposChave as $tipo) : ?>
                                    <option value="<?= htmlspecialchars($tipo['id']) ?>"><?= htmlspecialchars($tipo['name_type']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group col-md-8">
                            <label class="small mb-1" for="pix">Nº Chave Pix</label>
                            <input type="text" class="form-control form-control-sm" id="pix" name="pix" placeholder="Chave PIX do técnico">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="small mb-1" for="cliente_id">Cliente</label>
                        <select class="form-control form-control-sm" id="cliente_id" name="cliente_id" required>
                            <option value="">Selecione...</option>
                            <?php foreach ($clientes as $cliente) : ?>
                                <option value="<?= htmlspecialchars($cliente['id']) ?>"><?= htmlspecialchars($cliente['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="small mb-1" for="remarks">Observações</label>
                        <textarea class="form-control form-control-sm" id="remarks" name="remarks" rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Adicionar</button>
                </div>
            </form>
        </div>
    </div>

    <div class="modal fade" id="editModal" tabindex="-1">
        <div class="modal-dialog" role="document">
            <form class="modal-content" action="RDajustar.php" method="POST">
                <input type="hidden" name="action" value="edit_ajuste">
                <input type="hidden" name="aj" value="0">
                <input type="hidden" name="id" id="edit_id">
                <div class="modal-header">
                    <h5 class="modal-title">Editar Despesa (Ajuste)</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group col-md-8">
                            <label class="small mb-1" for="edit_user_id">Tecnico:</label>
                            <select class="form-control form-control-sm" id="edit_user_id" name="user_id" required>
                                <option value="">Selecione um técnico...</option>
                                <?php foreach ($listaDeTecnicos as $tecnico) : ?>
                                    <option value="<?= $tecnico['user_id'] ?>"><?= htmlspecialchars($tecnico['user_nome']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group col-md-4">
                            <label class="small mb-1" for="edit_date_created">Data da Despesa:</label>
                            <input type="date" class="form-control form-control-sm" id="edit_date_created" name="date_created" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-md-4"><label class="small mb-1" for="edit_amount">Valor:</label><input type="number" step="0.01" class="form-control form-control-sm" id="edit_amount" name="amount" required></div>
                        <div class="form-group col-md-8">
                            <label class="small mb-1" for="edit_category_id">Categoria:</label>
                            <select class="form-control form-control-sm" id="edit_category_id" name="category_id" required>
                                <option value="">Selecione...</option>
                                <?php foreach ($categorias as $categoria) : ?>
                                    <option value="<?= htmlspecialchars($categoria['id']) ?>"><?= htmlspecialchars($categoria['nome_categoria']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-md-4">
                            <label class="small mb-1" for="edit_pix_type">Tipo de Chave Pix</label>
                            <select class="form-control form-control-sm" id="edit_pix_type" name="pix_type" required>
                                <option value="">Selecione...</option>
                                <?php foreach ($tiposChave as $tipo) : ?>
                                    <option value="<?= htmlspecialchars($tipo['id']) ?>"><?= htmlspecialchars($tipo['name_type']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group col-md-8">
                            <label class="small mb-1" for="edit_pix">Nº Chave Pix</label>
                            <input type="text" class="form-control form-control-sm" id="edit_pix" name="pix">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="small mb-1" for="edit_cliente_id">Cliente</label>
                        <select class="form-control form-control-sm" id="edit_cliente_id" name="cliente_id" required>
                            <option value="">Selecione...</option>
                            <?php foreach ($clientes as $cliente) : ?>
                                <option value="<?= htmlspecialchars($cliente['id']) ?>"><?= htmlspecialchars($cliente['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="small mb-1" for="edit_remarks">Observações</label>
                        <textarea class="form-control form-control-sm" id="edit_remarks" name="remarks" rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                </div>
            </form>
        </div>
    </div>

    <div class="modal fade" id="excluirModal" tabindex="-1">
        <div class="modal-dialog modal-sm">
            <div class="modal-content">
                <form action="RDajustar.php" method="POST">
                    <input type="hidden" name="action" value="delete_ajuste">
                    <input type="hidden" name="id" id="delete_id">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirmar Exclusão</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Tem certeza que deseja excluir esta despesa?</p>
                        <p class="text-danger small">Esta ação não pode ser desfeita.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-danger">Excluir</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="duplicarModal" tabindex="-1">
        <div class="modal-dialog" role="document">
            <form class="modal-content" action="RDajustar.php" method="POST">
                <input type="hidden" name="action" value="add_ajuste">
                <input type="hidden" name="aj" value="0">
                <div class="modal-header">
                    <h5 class="modal-title text-primary"><i class="fas fa-copy"></i> Duplicar Despesa (Ajuste)</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group col-md-8">
                            <label class="small mb-1" for="duplicar_user_id">Tecnico:</label>
                            <select class="form-control form-control-sm" id="duplicar_user_id" name="user_id" required>
                                <option value="">Selecione um técnico...</option>
                                <?php foreach ($listaDeTecnicos as $tecnico) : ?>
                                    <option value="<?= $tecnico['user_id'] ?>"><?= htmlspecialchars($tecnico['user_nome']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group col-md-4">
                            <label class="small mb-1" for="duplicar_date_created">Data da Despesa:</label>
                            <input type="date" class="form-control form-control-sm" id="duplicar_date_created" name="date_created" value="<?= date('Y-m-d') ?>" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-md-4"><label class="small mb-1" for="duplicar_amount">Valor:</label><input type="number" step="0.01" class="form-control form-control-sm" id="duplicar_amount" name="amount" required></div>
                        <div class="form-group col-md-8">
                            <label class="small mb-1" for="duplicar_category_id">Categoria:</label>
                            <select class="form-control form-control-sm" id="duplicar_category_id" name="category_id" required>
                                <option value="">Selecione...</option>
                                <?php foreach ($categorias as $categoria) : ?>
                                    <option value="<?= htmlspecialchars($categoria['id']) ?>"><?= htmlspecialchars($categoria['nome_categoria']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-md-4">
                            <label class="small mb-1" for="duplicar_pix_type">Tipo de Chave Pix</label>
                            <select class="form-control form-control-sm" id="duplicar_pix_type" name="pix_type" required>
                                <option value="">Selecione...</option>
                                <?php foreach ($tiposChave as $tipo) : ?>
                                    <option value="<?= htmlspecialchars($tipo['id']) ?>"><?= htmlspecialchars($tipo['name_type']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group col-md-8">
                            <label class="small mb-1" for="duplicar_pix">Nº Chave Pix</label>
                            <input type="text" class="form-control form-control-sm" id="duplicar_pix" name="pix">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="small mb-1" for="duplicar_cliente_id">Cliente</label>
                        <select class="form-control form-control-sm" id="duplicar_cliente_id" name="cliente_id" required>
                            <option value="">Selecione...</option>
                            <?php foreach ($clientes as $cliente) : ?>
                                <option value="<?= htmlspecialchars($cliente['id']) ?>"><?= htmlspecialchars($cliente['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="small mb-1" for="duplicar_remarks">Observações</label>
                        <textarea class="form-control form-control-sm" id="duplicar_remarks" name="remarks" rows="2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Criar Nova Despesa</button>
                </div>
            </form>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

    <script>
        $(document).ready(function() {

            // --- Feedback de Alertas ---
            $('.alert').delay(4000).fadeOut(500, function() {
                $(this).remove();
            });

            // --- Preenchimento dos Modais ---
            $('.btn-excluir').on('click', function() {
                const id = $(this).data('id');
                $('#delete_id').val(id);
                $('#excluirModal').modal('show');
            });

            $('.duplicar-btn').on('click', function() {
                const button = $(this);
                $('#duplicar_user_id').val(button.data('user_id'));
                $('#duplicar_amount').val(button.data('valor'));
                $('#duplicar_category_id').val(button.data('categoria'));
                $('#duplicar_pix_type').val(button.data('pix_type'));
                $('#duplicar_pix').val(button.data('pix'));
                $('#duplicar_cliente_id').val(button.data('cliente_id'));
                $('#duplicar_remarks').val(button.data('observacoes'));
            });

            $('#editModal').on('show.bs.modal', function(event) {
                const button = $(event.relatedTarget);
                $('#edit_id').val(button.data('id'));
                $('#edit_user_id').val(button.data('user_id'));
                $('#edit_date_created').val(button.data('date_created'));
                $('#edit_amount').val(button.data('valor'));
                $('#edit_category_id').val(button.data('categoria'));
                $('#edit_cliente_id').val(button.data('cliente_id')); // Corrigido para 'edit_cliente_id'
                $('#edit_remarks').val(button.data('observacoes'));
                $('#edit_pix_type').val(button.data('pix_type'));
                $('#edit_pix').val(button.data('pix'));
            });
        });
    </script>
</body>

</html>