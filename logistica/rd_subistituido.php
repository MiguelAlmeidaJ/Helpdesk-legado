<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m9_00 == 0) {
    header("Location: ../home.php");
    exit;
}


if (!isset($_SESSION['allterusN3Id'])) {
    header("Location: ../index.php");
    exit;
}

// var_dump($_SESSION);


$pdo = ConnectionN3rd();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

// Usuário e tipo
$id_allterus = (int)$_SESSION['allterusN3Id'];
$usuarioStmt = $pdo->prepare("SELECT * FROM user WHERE id_allterus = :id");
$usuarioStmt->execute([':id' => $id_allterus]);
$usuario = $usuarioStmt->fetch(PDO::FETCH_ASSOC);

// var_dump($usuario);
// exit;

if (!$usuario['id']) {
    header("Location: ../index.php");
    exit;
}

$user_id_filter = $_GET['user_id'] ?? null;

// Filtro por datas
$dataInicio = $_GET['data_inicio'] ?? null;
$dataFim = $_GET['data_fim'] ?? null;

//no carregamento inicial carregar o mes atual
if (!$dataInicio && !$dataFim) {
    $dataInicio = date('Y-m-01');
    $dataFim = date('Y-m-t');
}


$params = [
    ':dataInicio' => $dataInicio,
    ':dataFim' => $dataFim . ' 23:59:59'
];


$id_n3rd = $usuario['id'];
$permissao = $usuario['type'];




// Permissão 0 - Carrega as despesas lançadas pelo usuário
$rds = $pdo->prepare(
    "SELECT * FROM running_balance 
    WHERE user_id = :id_n3rd 
    AND date_created BETWEEN :dataInicio AND :dataFim
    AND aj = 1 
    ORDER BY date_created DESC"
);
$rds->execute([
    ':id_n3rd' => $id_n3rd,
    ':dataInicio' => $dataInicio,
    ':dataFim' => $dataFim . ' 23:59:59'
]);
$despesas = $rds->fetchAll(PDO::FETCH_ASSOC);

?>

<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8" />
    <title>Gerenciar Despesas</title>
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
</head>
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

    .border-left-warning {
        border-left: .25rem solid #ffc107 !important;
    }

    .border-left-success {
        border-left: .25rem solid #28a745 !important;
    }

    .text-xs {
        font-size: .7rem;
    }

    .animated-hourglass {
        animation: spin 5s linear infinite;
        display: inline-block;
    }
</style>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid mt-2">


        <div class="card">
            <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h4 class="m-0">Minhas Despesas</h4>
                <a href="rdPainel.php" class="ml-4"><i class="fas fa-home" style="font-size: 25px;" data-toggle="tooltip" title="Home RD"></i></a>
                <div class="col-md-8 text-right">
                    <form method="GET" class="form-inline justify-content-end">
                        <label class="mr-2 small">De:</label>
                        <input type="date" name="data_inicio" class="form-control form-control-sm mr-2" value="<?= htmlspecialchars($_GET['data_inicio'] ?? $dataInicio) ?>">
                        <label class="mr-2 small">Até:</label>
                        <input type="date" name="data_fim" class="form-control form-control-sm mr-2" value="<?= htmlspecialchars($_GET['data_fim'] ?? $dataFim) ?>">
                        <button type="submit" class="btn btn-sm btn-primary mr-2">Filtrar</button>
                        <a href="rd.php" class="btn btn-sm btn-secondary">Limpar</a>
                    </form>
                </div>
                <button type="button" class="btn btn-success btn-sm" data-toggle="modal" data-target="#modaladd">
                    <i class="fas fa-plus"></i> Nova Despesa
                </button>
            </div>
            <div class="card-body">
                <?php
                if (isset($_SESSION['alert_message'])) {
                    $alert = $_SESSION['alert_message'];
                    echo "<div class='alert alert-{$alert['type']} auto-fade-alert'>{$alert['text']}</div>";
                    unset($_SESSION['alert_message']);
                }
                ?>

                <?php if (empty($despesas)) : ?>
                    <div class="alert alert-info">Você ainda não lançou nenhuma despesa.</div>
                <?php else : ?>
                    <div class="table-responsive">
                        <table class="table table-bordered table-striped" id="dataTable" width="100%" cellspacing="0">
                            <thead class="thead-light">
                                <tr>
                                    <th class="text-center">ID</th>
                                    <th class="text-center" style="width: 140px">Cliente</th>
                                    <th class="text-center">Descrição</th>
                                    <th class="text-center" style="width: 120px">Valor</th>
                                    <th class="text-center">Data</th>
                                    <th class="text-center" style="width: 220px">Status</th>
                                    <th class="text-center" style="width: 140px">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($despesas as $rd) : ?>
                                    <tr>
                                        <td class="text-right"><?= $rd['id'] ?></td>
                                        <td class="text-left"><?= $rd['cliente'] ?></td>
                                        <td class="text-left"><?= $rd['remarks'] ?></td>
                                        <td class="text-right">R$ <?= number_format($rd['amount'], 2, ',', '.') ?></td>
                                        <td class="text-center"><?= date('d/m/Y', strtotime($rd['date_created'])) ?></td>
                                        <td class="text-center">
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
                                                <button type="button" class="btn btn-warning btn-sm edit-btn" data-toggle="modal" data-target="#editModal" data-id="<?= $rd['id'] ?>" data-valor="<?= $rd['amount'] ?>" data-categoria="<?= $rd['category_id'] ?? '' ?>" data-pix_type="<?= $rd['pix_type'] ?? '' ?>" data-pix="<?= $rd['pix'] ?? '' ?>" data-cliente="<?= $rd['cliente'] ?>" data-observacoes="<?= $rd['remarks'] ?>" title="Editar">
                                                    <i class="fas fa-edit"></i>
                                                </button>

                                                <button class="btn btn-danger btn-sm btn-excluir" title="Excluir" data-id="<?= (int)$rd['id'] ?>">
                                                    <i class="fas fa-trash-alt"></i>
                                                </button>

                                            <?php else : ?>
                                                <span class="text-muted"><i class="fas fa-lock" title="Não editável"></i></span>
                                            <?php endif; ?>
                                            <button type="button" class="btn btn-info btn-sm duplicar-btn" data-toggle="modal" data-target="#duplicarModal" data-id="<?= $rd['id'] ?>" data-valor="<?= $rd['amount'] ?>" data-categoria="<?= $rd['category_id'] ?? '' ?>" data-pix_type="<?= $rd['pix_type'] ?? '' ?>" data-pix="<?= $rd['pix'] ?? '' ?>" data-cliente="<?= $rd['cliente'] ?>" data-observacoes="<?= $rd['remarks'] ?>" title="Duplicar RD">
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




    <!-- MODAL PARA ADICIONAR DESPESA -->
    <div class="modal fade" id="modaladd" tabindex="-1" role="dialog" aria-labelledby="addModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <form class="modal-content" action="addDespesa.php" method="POST" enctype="multipart/form-data">
                <div class="modal-header">
                    <h5 class="modal-title text-primary" id="addModalLabel"><i class="fas fa-plus text-primary"></i> Adicionar Despesa</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>

                <div class="modal-body">

                    <!-- id oculto para enviar o user_id -->
                    <input type="hidden" name="user_id" value="<?= $id_n3rd ?>">


                    <div class="form-row">
                        <div class="form-group col-md-4">
                            <label for="amount">Valor:</label>
                            <input type="number" step="0.01" class="form-control" id="amount" name="amount" placeholder="0.00" value="0.00" required>
                        </div>
                        <div class="form-group col-md-8">
                            <label for="category_id">Categoria:</label>
                            <select class="form-control" id="category_id" name="category_id" required>
                                <option value="">Selecione...</option>
                                <?php
                                $categorias = $pdo->query("SELECT id, categories FROM category ORDER BY categories");
                                foreach ($categorias as $categoria) {
                                    $id = htmlspecialchars($categoria['id']);
                                    $nome = htmlspecialchars($categoria['categories']);
                                    echo "<option value='$id'>$nome</option>";
                                }
                                ?>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group col-md-4">
                            <label for="pix_type">Tipo de Chave Pix</label>
                            <select class="form-control" id="pix_type" name="pix_type" required>
                                <option value="">Selecione...</option>
                                <?php
                                $stmt = $pdo->query("SELECT id, name_type FROM type_keys ORDER BY id");
                                foreach ($stmt as $row) {
                                    $selected = ($usuario['pix_type'] ?? '') == $row['id'] ? 'selected' : '';
                                    echo "<option value='{$row['id']}' $selected>" . htmlspecialchars($row['name_type']) . "</option>";
                                }
                                ?>
                            </select>
                        </div>

                        <div class="form-group col-md-8">
                            <label for="pix">Nº Chave Pix</label>
                            <input type="text" class="form-control" id="pix" name="pix" placeholder="<?php echo htmlspecialchars($usuario['chavepix'] ?? ''); ?>">
                            <input type="hidden" name="chavepix_default" value="<?php echo htmlspecialchars($usuario['pix'] ?? ''); ?>">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="cliente_nome">Cliente</label>
                        <select class="form-control" id="cliente_nome" name="cliente_nome" required>
                            <option value="">Selecione...</option>
                            <?php
                            $clientes = $pdo->query("SELECT id, nome FROM clientes ORDER BY nome");
                            foreach ($clientes as $cliente) {
                                $idCliente = htmlspecialchars($cliente['id']);
                                $nomeCliente = htmlspecialchars($cliente['nome']);
                                echo "<option value=\"$nomeCliente\">$nomeCliente</option>";
                            }
                            ?>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="remarks">Observações</label>
                        <textarea class="form-control" id="remarks" name="remarks" rows="2" placeholder="Descreva detalhes da despesa"></textarea>
                    </div>

                    <hr>
                    <div class="form-group">
                        <label>Anexar Comprovante (PDF)</label>
                        <div class="input-group">
                            <input type="file" id="pdfFileInput_add" class="form-control-file" accept="application/pdf">
                            <div class="input-group-append">
                                <button type="button" class="btn btn-sm btn-info" id="btnUpload_add">Anexar</button>
                            </div>
                        </div>
                        <div id="uploadStatus_add" class="mt-2 small"></div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Adicionar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal para editar despesa -->
    <div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="editModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <form class="modal-content" action="editarRD.php" method="POST" enctype="multipart/form-data">
                <div class="modal-header">
                    <h5 class="modal-title text-primary" id="editModalLabel"><i class="fas fa-edit text-primary"></i> Editar Despesa</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>

                <div class="modal-body">

                    <input type="hidden" name="id" id="edit_id">
                    <input type="hidden" name="user_id" value="<?= htmlspecialchars($id_n3rd) ?>">

                    <div class="form-row">
                        <div class="form-group col-md-4">
                            <label for="edit_amount">Valor:</label>
                            <input type="number" step="0.01" class="form-control" id="edit_amount" name="amount" required>
                        </div>
                        <div class="form-group col-md-8">
                            <label for="edit_category_id">Categoria:</label>
                            <select class="form-control" id="edit_category_id" name="category_id" required>
                                <option value="">Selecione...</option>
                                <?php
                                // Reutiliza a mesma query do modal de adicionar para popular as categorias
                                $categorias = $pdo->query("SELECT id, categories FROM category ORDER BY categories");
                                foreach ($categorias as $categoria) {
                                    $id = htmlspecialchars($categoria['id']);
                                    $nome = htmlspecialchars($categoria['categories']);
                                    echo "<option value='$id'>$nome</option>";
                                }
                                ?>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group col-md-4">
                            <label for="edit_pix_type">Tipo de Chave Pix</label>
                            <select class="form-control" id="edit_pix_type" name="pix_type" required>
                                <option value="">Selecione...</option>
                                <?php
                                // Reutiliza a mesma query do modal de adicionar
                                $stmt = $pdo->query("SELECT id, name_type FROM type_keys ORDER BY id");
                                foreach ($stmt as $row) {
                                    echo "<option value='" . htmlspecialchars($row['id']) . "'>" . htmlspecialchars($row['name_type']) . "</option>";
                                }
                                ?>
                            </select>
                        </div>
                        <div class="form-group col-md-8">
                            <label for="edit_chavepix">Nº Chave Pix</label>
                            <input type="text" class="form-control" id="edit_chavepix" name="pix">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="edit_cliente_nome">Cliente</label>
                        <select class="form-control" id="edit_cliente_nome" name="cliente_nome" required>
                            <option value="">Selecione...</option>
                            <?php
                            // Reutiliza a mesma query do modal de adicionar para popular os clientes
                            $clientes = $pdo->query("SELECT id, nome FROM clientes ORDER BY nome");
                            foreach ($clientes as $cliente) {
                                $nomeCliente = htmlspecialchars($cliente['nome']);
                                echo "<option value=\"$nomeCliente\">$nomeCliente</option>";
                            }
                            ?>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="edit_remarks">Observações</label>
                        <textarea class="form-control" id="edit_remarks" name="remarks" rows="2" placeholder="Descreva detalhes da despesa"></textarea>
                    </div>

                    <hr>
                    <div class="form-group">
                        <label>Anexar Novo Comprovante (PDF)</label>
                        <div class="input-group">
                            <input type="file" id="pdfFileInput_edit" class="form-control-file" accept="application/pdf">
                            <div class="input-group-append">
                                <button type="button" class="btn btn-sm btn-info" id="btnUpload_edit">Anexar</button>
                            </div>
                        </div>
                        <div id="uploadStatus_edit" class="mt-2 small"></div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal para duplicar despesa -->
    <div class="modal fade" id="duplicarModal" tabindex="-1" role="dialog" aria-labelledby="duplicarModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <form class="modal-content" action="addDespesa.php" method="POST" enctype="multipart/form-data">
                <div class="modal-header">
                    <h5 class="modal-title text-primary" id="duplicarModalLabel"><i class="fas fa-edit text-primary"></i> Duplicar Despesa</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>

                <div class="modal-body">

                    <input type="hidden" name="id" id="duplicar_id">
                    <input type="hidden" name="user_id" value="<?= htmlspecialchars($id_n3rd) ?>">

                    <div class="form-row">
                        <div class="form-group col-md-4">
                            <label for="duplicar_amount">Valor:</label>
                            <input type="number" step="0.01" class="form-control" id="duplicar_amount" name="amount" required>
                        </div>
                        <div class="form-group col-md-8">
                            <label for="duplicar_category_id">Categoria:</label>
                            <select class="form-control" id="duplicar_category_id" name="category_id" required>
                                <option value="">Selecione...</option>
                                <?php
                                // Reutiliza a mesma query do modal de adicionar para popular as categorias
                                $categorias = $pdo->query("SELECT id, categories FROM category ORDER BY categories");
                                foreach ($categorias as $categoria) {
                                    $id = htmlspecialchars($categoria['id']);
                                    $nome = htmlspecialchars($categoria['categories']);
                                    echo "<option value='$id'>$nome</option>";
                                }
                                ?>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group col-md-4">
                            <label for="duplicar_pix_type">Tipo de Chave Pix</label>
                            <select class="form-control" id="duplicar_pix_type" name="pix_type" required>
                                <option value="">Selecione...</option>
                                <?php
                                // Reutiliza a mesma query do modal de adicionar
                                $stmt = $pdo->query("SELECT id, name_type FROM type_keys ORDER BY id");
                                foreach ($stmt as $row) {
                                    echo "<option value='" . htmlspecialchars($row['id']) . "'>" . htmlspecialchars($row['name_type']) . "</option>";
                                }
                                ?>
                            </select>
                        </div>
                        <div class="form-group col-md-8">
                            <label for="duplicar_chavepix">Nº Chave Pix</label>
                            <input type="text" class="form-control" id="duplicar_chavepix" name="pix">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="duplicar_cliente_nome">Cliente</label>
                        <select class="form-control" id="duplicar_cliente_nome" name="cliente_nome" required>
                            <option value="">Selecione...</option>
                            <?php
                            // Reutiliza a mesma query do modal de adicionar para popular os clientes
                            $clientes = $pdo->query("SELECT id, nome FROM clientes ORDER BY nome");
                            foreach ($clientes as $cliente) {
                                $nomeCliente = htmlspecialchars($cliente['nome']);
                                echo "<option value=\"$nomeCliente\">$nomeCliente</option>";
                            }
                            ?>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="duplicar_remarks">Observações</label>
                        <textarea class="form-control" id="duplicar_remarks" name="remarks" rows="2" placeholder="Descreva detalhes da despesa"></textarea>
                    </div>

                    <div class="form-group">
                        <label for="duplicar_comprovante">Substituir Anexo (PDF)</label>
                        <input type="file" class="form-control-file" id="duplicar_comprovante" name="comprovante" accept="application/pdf">
                        <small id="comprovante_atual" class="form-text text-muted">
                        </small>
                    </div>

                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                </div>
            </form>
        </div>
    </div>

    <!-- MODAL DE EXCLUSÃO -->
    <div class="modal fade" id="excluirModal" tabindex="-1" aria-labelledby="excluirModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <form class="modal-content" action="excluirRD.php" method="POST" enctype="multipart/form-data">
                <input type="hidden" name="id" id="excluir_id">
                <div class="modal-header">
                    <h5 class="modal-title" id="excluirModalLabel">Confirmar Exclusão</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Deseja realmente excluir esta RD?</p>
                    <p class="text-danger small">Esta ação é irreversível.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-danger btn-sm">Excluir</button>
                </div>
            </form>
        </div>
    </div>


    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

    <script>
        $('.auto-fade-alert').delay(3000).fadeOut(500, function() {
            $(this).remove();
        });
    </script>

    <script>
        // Script para preencher os modais de Edição e Duplicação
        $(document).ready(function() {

            // Ação para o botão EDITAR
            $('.edit-btn').on('click', function() {
                // Pega os dados do botão clicado
                const id = $(this).data('id');
                const cliente = $(this).data('cliente');
                const valor = $(this).data('valor');
                const categoria = $(this).data('categoria');
                const pix_type = $(this).data('pix_type');
                const pix = $(this).data('pix');
                const observacoes = $(this).data('observacoes');

                // Preenche os campos do modal de edição com esses dados
                $('#edit_id').val(id);
                $('#edit_amount').val(valor);
                $('#edit_category_id').val(categoria);
                $('#edit_pix_type').val(pix_type);
                $('#edit_chavepix').val(pix);
                $('#edit_cliente_nome').val(cliente);
                $('#edit_remarks').val(observacoes);
            });

            // Ação para o botão DUPLICAR
            $('.duplicar-btn').on('click', function() {
                // Pega os dados do botão clicado
                const id = $(this).data('id');
                const cliente = $(this).data('cliente');
                const valor = $(this).data('valor');
                const categoria = $(this).data('categoria');
                const pix_type = $(this).data('pix_type');
                const pix = $(this).data('pix');
                const observacoes = $(this).data('observacoes');

                // Preenche os campos do modal de duplicar com esses dados
                $('#duplicar_id').val(id);
                $('#duplicar_amount').val(valor);
                $('#duplicar_category_id').val(categoria);
                $('#duplicar_pix_type').val(pix_type);
                $('#duplicar_chavepix').val(pix);
                $('#duplicar_cliente_nome').val(cliente);
                $('#duplicar_remarks').val(observacoes);
            });

        });
    </script>

    <script>
        // Script para o modal de EXCLUSÃO
        function abrirModalExclusao(id) {
            // Coloca o ID no campo escondido do formulário de exclusáo
            $('#excluir_id').val(id);
            // Abre o modal de exclusáo usando o jQuery
            $('#excluirModal').modal('show');
        }
    </script>

    <script>
        // Script para o modal de EXCLUSÃO (usando jQuery)
        $(document).ready(function() {

            // Quando um botão com a classe 'btn-excluir' for clicado
            $('.btn-excluir').on('click', function() {
                // 1. Pega o ID do atributo data-id do botão clicado
                const id = $(this).data('id');

                // 2. Coloca o ID no campo escondido do formulário de exclusáo
                $('#excluir_id').val(id);

                // 3. Abre o modal de exclusáo usando jQuery
                $('#excluirModal').modal('show');
            });

        });
    </script>

    <script>
        // Script para a funcionalidade de UPLOAD de anexos
        $(document).ready(function() {

            // Função genérica para lidar com o upload
            function handleUpload(inputId, statusId, remarksId) {
                var inputFile = document.getElementById(inputId);
                var statusDiv = $('#' + statusId);

                if (inputFile.files.length === 0) {
                    statusDiv.html('<span class="text-danger">Nenhum arquivo selecionado.</span>');
                    return;
                }

                var file = inputFile.files[0];
                if (file.type !== 'application/pdf') {
                    statusDiv.html('<span class="text-danger">Por favor, selecione um arquivo PDF.</span>');
                    return;
                }

                var formData = new FormData();
                formData.append('pdfFile', file);
                statusDiv.html('<span class="text-info">Enviando...</span>');

                $.ajax({
                    url: 'recebe_upload.php',
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    success: function(response) {
                        if (response.success) {
                            statusDiv.html('<span class="text-success">Anexo adicionado!</span>');
                            var link = response.url;
                            var currentRemarks = $('#' + remarksId).val();
                            var newRemarks = (currentRemarks ? currentRemarks + '\\n' : '') + 'Comprovante: ' + link;
                            $('#' + remarksId).val(newRemarks);
                        } else {
                            statusDiv.html('<span class="text-danger">Erro: ' + response.message + '</span>');
                        }
                    },
                    error: function() {
                        statusDiv.html('<span class="text-danger">Erro de comunicação com o servidor.</span>');
                    }
                });
            }

            // Vincular a função aos botões de upload
            $('#btnUpload_add').on('click', function() {
                handleUpload('pdfFileInput_add', 'uploadStatus_add', 'remarks');
            });

            $('#btnUpload_edit').on('click', function() {
                handleUpload('pdfFileInput_edit', 'uploadStatus_edit', 'edit_remarks');
            });

            // Limpa o status do upload anterior ao abrir o modal de edição
            $('#editModal').on('show.bs.modal', function() {
                $('#uploadStatus_edit').html('');
            });

        });
    </script>

</body>

</html>