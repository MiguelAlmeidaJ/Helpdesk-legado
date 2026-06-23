<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m9_00 == 0 || !isset($_SESSION['allterusN3Id'])) {
    header("Location: ../home.php");
    exit;
}

$pdo = ConnectionN3();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

$id_usuario_sessao = (int)$_SESSION['allterusN3Id'];

$sqlBuscaUsuario = "SELECT user_id AS id_interno, user_nome, pix_type, chavepix AS pix FROM usuarios WHERE user_id = :id_usuario";
$sqlBuscaDespesas = "SELECT r.id, u.user_nome, r.remarks, r.clt_id, r.cliente as cliente_nome ,
                         r.amount, r.user_id, r.category_id, cat.nome AS categoria_nome, 
                         r.date_created, r.status, 
                         r.pix, r.pix_type, r.anexos 
                         FROM running_balance r
                         LEFT JOIN usuarios u ON u.user_id = r.user_id
                         LEFT JOIN categorias_subgrupo cat ON cat.id = category_id
                         WHERE R.user_id = :id_interno AND date_created BETWEEN :data_inicio AND :data_fim AND aj = 1 ORDER BY date_created DESC";
$sqlBuscaCategorias = "SELECT id, nome AS nome_categoria FROM categorias_subgrupo WHERE aplicavel IN ('Ambos', 'RD') ORDER BY nome";
$sqlBuscaClientes = "SELECT clt_id as id, clt_nomef as nome FROM clientes ORDER BY clt_nomef";
$sqlBuscaTiposChave = "SELECT id, name_type FROM type_keys ORDER BY id";

$usuarioStmt = $pdo->prepare($sqlBuscaUsuario);
$usuarioStmt->execute([':id_usuario' => $id_usuario_sessao]);
$usuario = $usuarioStmt->fetch(PDO::FETCH_ASSOC);

if (!$usuario) {
    echo "Erro: Usuário com ID {$id_usuario_sessao} não encontrado no sistema.";
    exit;
}
$idInternoUsuario = $usuario['id_interno'];



$dataInicio = $_GET['data_inicio'] ?? date('Y-m-01');
$dataFim = $_GET['data_fim'] ?? date('Y-m-t');

$rds = $pdo->prepare($sqlBuscaDespesas);
$rds->execute([
    ':id_interno' => $idInternoUsuario,
    ':data_inicio' => $dataInicio,
    ':data_fim' => $dataFim . ' 23:59:59'
]);
$despesas = $rds->fetchAll(PDO::FETCH_ASSOC);

$categorias = $pdo->query($sqlBuscaCategorias)->fetchAll(PDO::FETCH_ASSOC);
$clientes = $pdo->query($sqlBuscaClientes)->fetchAll(PDO::FETCH_ASSOC);
$tiposChave = $pdo->query($sqlBuscaTiposChave)->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8" />
    <title>Gerenciar Despesas</title>
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

        .esconde-secao {
            display: none;
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid mt-2">
        <div class="card">
            <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h4 class="m-0">Minhas Despesas</h4>
                <div class="col-md-8 text-right">
                    <form method="GET" class="form-inline justify-content-end">
                        <label class="mr-2 small">De:</label>
                        <input type="date" name="data_inicio" class="form-control form-control-sm mr-2" value="<?= htmlspecialchars($dataInicio) ?>">
                        <label class="mr-2 small">Até:</label>
                        <input type="date" name="data_fim" class="form-control form-control-sm mr-2" value="<?= htmlspecialchars($dataFim) ?>">
                        <button type="submit" class="btn btn-sm btn-primary mr-2">Filtrar</button>
                        <a href="rd.php" class="btn btn-sm btn-secondary">Limpar</a>
                    </form>
                </div>
                <button type="button" class="btn btn-success btn-sm" data-toggle="modal" data-target="#modaladd">
                    <i class="fas fa-plus"></i> Nova Despesa
                </button>
            </div>
            <div class="card-body">
                <?php if (isset($_SESSION['alert_message'])) {
                    $alert = $_SESSION['alert_message'];
                    echo "<div class='alert alert-{$alert['type']}'>{$alert['text']}</div>";
                    unset($_SESSION['alert_message']);
                } ?>
                <?php if (empty($despesas)) : ?>
                    <div class="alert alert-info">Nenhuma despesa encontrada para o período selecionado.</div>
                <?php else : ?>
                    <div class="table-responsive">
                        <table class="table table-bordered table-striped" width="100%">
                            <thead class="thead-light">
                                <tr>
                                    <th>ID</th>
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
                                function exibirDescricaoEAnexos($remarks, $anexos_json)
                                {
                                    if (!empty($remarks)) {
                                        echo nl2br(htmlspecialchars($remarks));
                                    }
                                    if (!empty($anexos_json)) {
                                        $anexos = json_decode($anexos_json, true);
                                        if (is_array($anexos) && !empty($anexos)) {
                                            if (!empty($remarks)) {
                                                echo '<br><br>';
                                            }
                                            foreach ($anexos as $anexo) {
                                                $url = htmlspecialchars($anexo['url']);
                                                $nome = htmlspecialchars($anexo['nome']);
                                                echo "<div><a href='{$url}' target='_blank' class='text-info'><i class='fas fa-paperclip'></i> -- Anexo: {$nome} --</a></div>";
                                            }
                                        }
                                    }
                                }

                                foreach ($despesas as $rd) :
                                ?>
                                    <tr>
                                        <td><?= $rd['id'] ?></td>
                                        <td><?= htmlspecialchars($rd['cliente_nome']) ?></td>
                                        <td><?= htmlspecialchars($rd['categoria_nome']) ?></td>
                                        <td><?php exibirDescricaoEAnexos($rd['remarks'], $rd['anexos']); ?></td>
                                        <td>R$ <?= number_format($rd['amount'], 2, ',', '.') ?></td>
                                        <td><?= date('d/m/Y', strtotime($rd['date_created'])) ?></td>
                                        <td>
                                            <?php
                                            // Este switch funciona para ambos os sistemas pois a coluna 'status' foi mantida
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
                                                <button type="button" class="btn btn-warning btn-sm edit-btn" data-toggle="modal" data-target="#editModal"
                                                    data-id="<?= $rd['id'] ?>"
                                                    data-valor="<?= $rd['amount'] ?>"
                                                    data-nome ="<?= htmlspecialchars($rd['user_nome']) ?>"
                                                    data-categoria="<?= $rd['category_id'] ?? '' ?>"
                                                    data-cliente_id="<?= $rd['clt_id'] ?? '' ?>"
                                                    data-observacoes="<?= htmlspecialchars($rd['remarks']) ?>"
                                                    data-pix_type="<?= $rd['pix_type'] ?? '' ?>"
                                                    data-pix="<?= htmlspecialchars($rd['pix'] ?? '') ?>"
                                                    data-anexos="<?= htmlspecialchars($rd['anexos'] ?? '[]') ?>">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-danger btn-sm btn-excluir" data-id="<?= (int)$rd['id'] ?>">
                                                    <i class="fas fa-trash-alt"></i>
                                                </button>
                                            <?php else : ?>
                                                <span class="text-muted"><i class="fas fa-lock"></i></span>
                                            <?php endif; ?>
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
            <form class="modal-content" action="addDespesa.php" method="POST">
                <div class="modal-header">
                    <h5 class="modal-title">Adicionar Despesa</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="hidden" name="user_id" value="<?= $idInternoUsuario ?>">
                    <input type="hidden" class="user_nome_for_upload" value="<?= $usuario['user_nome'] ?>">
                    <div class="form-row">
                        <div class="form-group col-md-4"><label for="amount">Valor:</label><input type="number" step="0.01" class="form-control" id="amount" name="amount" required></div>
                        <div class="form-group col-md-8">
                            <label for="category_id">Categoria:</label>
                            <select class="form-control" id="category_id" name="category_id" required>
                                <option value="">Selecione...</option>
                                <?php foreach ($categorias as $categoria) : ?>
                                    <option value="<?= htmlspecialchars($categoria['id']) ?>"><?= htmlspecialchars($categoria['nome_categoria']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-md-4">
                            <label for="pix_type">Tipo de Chave Pix</label>
                            <select class="form-control" id="pix_type" name="pix_type" required>
                                <option value="">Selecione...</option>
                                <?php foreach ($tiposChave as $tipo) :
                                    $selected = ($usuario['pix_type'] ?? '') == $tipo['id'] ? 'selected' : '';
                                ?>
                                    <option value="<?= htmlspecialchars($tipo['id']) ?>" <?= $selected ?>><?= htmlspecialchars($tipo['name_type']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group col-md-8">
                            <label for="pix">Nº Chave Pix</label>
                            <input type="hidden" name="chavepix_default" value="<?= $usuario['pix'] ?? ''; ?>">

                            <input type="text" class="form-control" id="pix" name="pix" placeholder="<?= $usuario['pix'] ?? ''; ?>">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="cliente_id">Cliente</label>
                        <select class="form-control" id="cliente_id" name="cliente_id" required>
                            <option value="">Selecione...</option>
                            <?php foreach ($clientes as $cliente) : ?>
                                <option value="<?= htmlspecialchars($cliente['id']) ?>">
                                    <?= htmlspecialchars($cliente['nome']) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="remarks">Observações</label>
                        <textarea class="form-control" id="remarks" name="remarks" rows="2"></textarea>
                    </div>
                    <hr>
                    <div class="form-group">
                        <label for="pdfFileInput_add">Anexar Comprovante(s) (PDF)</label>
                        <input type="file" id="pdfFileInput_add" class="form-control-file auto-upload esconde-secao" accept="application/pdf" multiple
                            data-status-div="uploadStatus_add" data-remarks-id="remarks" data-anexos-input="anexos_json_add">
                        <div id="uploadStatus_add" class="mt-2 small upload-status"></div>
                    </div>
                    <input type="hidden" name="anexos_json" id="anexos_json_add">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary esconde-secao">Adicionar</button>
                </div>
            </form>
        </div>
    </div>

    <div class="modal fade" id="editModal" tabindex="-1">
        <div class="modal-dialog" role="document">
            <form class="modal-content" action="editarRD.php" method="POST">
                <div class="modal-header">
                    <h5 class="modal-title">Editar Despesa</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="hidden" name="id" id="edit_id">
                    <input type="hidden" name="user_id" value="<?= $idInternoUsuario ?>">
                    <input type="hidden" class="user_nome_for_upload" value="<?= $usuario['user_nome'] ?>">

                    <div class="form-row">
                        <div class="form-group col-md-4"><label for="edit_amount">Valor:</label><input type="number" step="0.01" class="form-control" id="edit_amount" name="amount" required></div>
                        <div class="form-group col-md-8">
                            <label for="edit_category_id">Categoria:</label>
                            <select class="form-control" id="edit_category_id" name="category_id" required>
                                <option value="">Selecione...</option>
                                <?php foreach ($categorias as $categoria) : ?>
                                    <option value="<?= htmlspecialchars($categoria['id']) ?>"><?= htmlspecialchars($categoria['nome_categoria']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group col-md-4">
                            <label for="edit_pix_type">Tipo de Chave Pix</label>
                            <select class="form-control" id="edit_pix_type" name="pix_type" required>
                                <option value="">Selecione...</option>
                                <?php foreach ($tiposChave as $tipo) : ?>
                                    <option value="<?= htmlspecialchars($tipo['id']) ?>"><?= htmlspecialchars($tipo['name_type']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group col-md-8">
                            <label for="edit_pix">Nº Chave Pix</label>
                            <input type="text" class="form-control" id="edit_pix" name="pix">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="edit_cliente">Cliente</label>
                        <select class="form-control" id="edit_cliente" name="cliente_id" required>
                            <option value="">Selecione...</option>
                            <?php foreach ($clientes as $cliente) : ?>
                                <option value="<?= htmlspecialchars($cliente['id']) ?>"><?= htmlspecialchars($cliente['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="edit_remarks">Observações</label>
                        <textarea class="form-control" id="edit_remarks" name="remarks" rows="2"></textarea>
                    </div>
                    <hr>

                    <div class="form-group">
                        <label>Anexos Existentes</label>
                        <div id="listaAnexos_edit">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="pdfFileInput_edit">Adicionar Novos Comprovantes (PDF)</label>
                        <input type="file" id="pdfFileInput_edit" class="form-control-file auto-upload" accept="application/pdf" multiple
                            data-status-div="uploadStatus_edit" data-remarks-id="edit_remarks" data-anexos-input="anexos_novos_json_edit">
                        <div id="uploadStatus_edit" class="mt-2 small upload-status"></div>
                    </div>

                    <input type="hidden" name="anexos_novos_json" id="anexos_novos_json_edit">
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
                <form action="excluirRD.php" method="POST">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirmar Exclusão</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Tem certeza que deseja excluir esta despesa?</p>
                        <p class="text-danger small">Esta ação não pode ser desfeita.</p>
                        <input type="hidden" name="id" id="excluir_id">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-danger">Excluir</button>
                    </div>
                </form>
            </div>
        </div>
    </div>


    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

    <script>
        $(document).ready(function() {
            let anexosAtuais = {};

            $('.alert').delay(4000).fadeOut(500, function() {
                $(this).remove();
            });

            // Script modal de EXCLUSÃO
            $('.btn-excluir').on('click', function() {
                const id = $(this).data('id');
                $('#excluir_id').val(id);
                $('#excluirModal').modal('show');
            });

            // Script modal de EDIÇÃO (lógica completa)
            $('#editModal').on('show.bs.modal', function(event) {
                var button = $(event.relatedTarget);
                $('#edit_id').val(button.data('id'));
                $('#edit_amount').val(button.data('valor'));
                $('#edit_category_id').val(button.data('categoria'));
                $('#edit_cliente').val(button.data('cliente_id'));
                $('#edit_remarks').val(button.data('observacoes'));
                $('#edit_pix_type').val(button.data('pix_type'));
                $('#edit_pix').val(button.data('pix'));

                // console.log("Dados:", button.data('cliente_id'));

                const listaAnexosDiv = $('#listaAnexos_edit');
                listaAnexosDiv.html('');

                const anexos = button.data('anexos');
                if (anexos && Array.isArray(anexos) && anexos.length > 0) {
                    anexos.forEach((anexo, index) => {
                        const anexoId = `anexo_existente_${anexo.nome.replace(/[^a-zA-Z0-9]/g, "")}_${index}`;
                        const anexoHtml = `
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" name="anexos_existentes[]" value='${JSON.stringify(anexo)}' id="${anexoId}" checked>
                                <label class="form-check-label" for="${anexoId}">
                                    <a href="${anexo.url}" target="_blank">${anexo.nome}</a>
                                </label>
                            </div>
                        `;
                        listaAnexosDiv.append(anexoHtml);
                    });
                } else {
                    listaAnexosDiv.html('<p class="text-muted small">Nenhum anexo existente.</p>');
                }
            });

            function checkAddModalFields() {
                const modal = $('#modaladd');
                const valor = modal.find('input[name="amount"]').val();
                const categoria = modal.find('select[name="category_id"]').val();
                const cliente = modal.find('select[name="cliente_id"]').val();
                const attachmentSection = modal.find('.esconde-secao');

                if (parseFloat(valor) > 0 && categoria && cliente) {
                    attachmentSection.show(); // Mostra a seção
                } else {
                    attachmentSection.hide(); // Esconde a seção
                }
            }

            // Monitora mudanças APENAS nos campos do modal de adicionar
            $('#modaladd').on('input change', 'input[name="amount"], select[name="category_id"], select[name="cliente_id"]', function() {
                checkAddModalFields();
            });

            // Garante que a seção comece escondida ao abrir o modal
            $('#modaladd').on('show.bs.modal', function() {
                $(this).find('.esconde-secao').hide();
            });

            // Script de UPLOAD AUTOMÁTICO (CORRIGIDO)
            $('.auto-upload').on('change', function(event) {
                const input = event.target;
                const statusDiv = $('#' + $(input).data('status-div'));
                const anexosInputId = $(input).data('anexos-input');

                // ## CORREÇÃO 1: Definir a variável 'form' ##
                const form = $(input).closest('form');
                const userNameInput = form.find('.user_nome_for_upload');
                const categorySelect = form.find('select[name="category_id"]');

                const files = input.files;
                if (files.length === 0) return;

                Array.from(files).forEach((file, index) => {
                    handleFileUpload(file, index, statusDiv, anexosInputId, categorySelect, userNameInput); // Passa userNameInput
                });
            });

            // ## CORREÇÃO 2: Adicionar 'userNameInput' como parâmetro ##
            function handleFileUpload(file, index, statusDiv, anexosInputId, categorySelect, userNameInput) {
                const fileStatusId = 'file-status-' + Date.now() + '-' + index;
                if (file.type !== 'application/pdf') {
                    statusDiv.append(`<div class="text-danger"><i class="fas fa-times-circle"></i> ${file.name} (não é PDF)</div>`);
                    return;
                }
                statusDiv.append(`<div id="${fileStatusId}"><i class="fas fa-spinner fa-spin"></i> Enviando ${file.name}...</div>`);

                const categoryId = categorySelect.val();
                const userName = userNameInput.val(); // Agora esta variável é recebida corretamente

                var formData = new FormData();
                formData.append('pdfFile', file);
                formData.append('category_id', categoryId);
                formData.append('user_nome', userName);

                $.ajax({
                    url: 'recebe_upload.php',
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

            // Limpeza dos modais (sem alteração)
            $('#modaladd, #editModal').on('show.bs.modal', function(event) {
                const modalId = $(this).attr('id');
                const anexosInputId = (modalId === 'modaladd') ? 'anexos_json_add' : 'anexos_novos_json_edit';
                anexosAtuais[anexosInputId] = [];
                $('#' + anexosInputId).val('');
                $(this).find('.upload-status').html('');
                $(this).find('.auto-upload').val('');
                if (modalId === 'modaladd') {
                    $('#listaAnexos_add').html('');
                }
            });
        });
    </script>
</body>

</html>