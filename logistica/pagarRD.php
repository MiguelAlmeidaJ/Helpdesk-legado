<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// Verificação de permissões
if ($m9_02 < 3) {
    header("Location: ../home.php");
    exit;
}

$pdo = ConnectionN3();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

$user_id = (int)$_SESSION['allterusN3Id'];

// Conecta ao banco de dados usando a nova função
$pdo = ConnectionN3();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

// Busca os dados do usuário logado na tabela 'usuarios'
$stmt_usuario = $pdo->prepare("SELECT * FROM usuarios WHERE user_id = :user_id");
$stmt_usuario->execute([':user_id' => $user_id]);
$usuario = $stmt_usuario->fetch(PDO::FETCH_ASSOC);

// if (!$usuario) {
//     // Se não encontrar o usuário, encerra a sessão e redireciona para o login
//     session_destroy();
//     header("Location: ../home.php");
//     exit;
// }

// A variável $user_id será usada para registrar quem aprovou a despesa
$user_id = $usuario['user_id'];

function responderPagamento($ajax, $payload, $redirect = 'pagarRD.php')
{
    if ($ajax) {
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }

    header("Location: {$redirect}");
    exit;
}

// --- PROCESSAMENTO DO FORMULÁRIO (POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $isAjax = strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'xmlhttprequest' || ($_POST['ajax'] ?? '') === '1';
    $user_id_pagador = $user_id; // ID do gestor que est? pagando
    $action = $_POST['action'] ?? '';
    $remarks = $_POST['remarks'] ?? [];
    $pix = $_POST['pix'] ?? [];
    $pix_type = $_POST['pix_type'] ?? [];

    // === BLOCO PARA PAGAR SELECIONADAS (INDIVIDUAL OU EM GRUPO) ===
    // === BLOCO PARA PAGAR SELECIONADAS (CORRIGIDO) ===
    if ($action === 'pay_selected' && isset($_POST['approvement_ids']) && is_array($_POST['approvement_ids'])) {
        $idsPagos = [];

        // 1. Pegue o ARRAY de observações e guarde em uma variável com nome claro.
        $todas_as_observacoes = $_POST['remarks'] ?? [];

        // 2. Prepare a query UMA VEZ, fora do loop.
        $stmt = $pdo->prepare("UPDATE running_balance SET status = 4, date_updated = NOW(), pagador_id = :user_id, remark_pagador = :remarks WHERE id = :id");

        // 3. Percorra cada ID para pagamento.
        foreach ($_POST['approvement_ids'] as $balance_id) {
            $balance_id = (int)$balance_id;

            // 4. Crie uma variável NOVA para a observação DESTA LINHA ESPECÍFICA.
            //    Ela busca no ARRAY original ($todas_as_observacoes).
            $observacao_desta_linha = !empty($todas_as_observacoes[$balance_id]) ? $todas_as_observacoes[$balance_id] : 'Pagamento Efetuado';

            // Os campos de PIX continuam não sendo usados. Se precisar, adicione-os ao UPDATE.
            $pixVal = $pix[$balance_id] ?? null;
            $pixTypeVal = $pix_type[$balance_id] ?? null;

            // 5. Execute a query passando a variável correta e individual.
            $stmt->execute([
                ':id' => $balance_id,
                ':user_id' => $user_id_pagador, // Garanta que est? usando o ID de quem pagou
                ':remarks' => $observacao_desta_linha
            ]);
        }

        responderPagamento($isAjax, ['ok' => true, 'ids' => $idsPagos, 'message' => 'Pagamento registrado.']);
    }


    // === BLOCO PARA PAGAMENTO OU RECUSA INDIVIDUAL ===
    if (($action === 'pay' || $action === 'reject') && isset($_POST['approvement_id'])) {
        $balance_id = (int)$_POST['approvement_id'];
        $remarks = !empty($remarks[$balance_id]) ? $remarks[$balance_id] : (($action === 'pay') ? 'Pagamento Efetuado' : 'Pagamento Recusado');
        $pixVal = $pix[$balance_id] ?? null;
        $pixTypeVal = $pix_type[$balance_id] ?? null;
        $status = ($action === 'pay') ? 4 : 3; // 4 para Paga, 3 para Rejeitada

        $stmt = $pdo->prepare("UPDATE running_balance SET status = :status, date_updated = NOW(), pagador_id = :user_id, remark_pagador = :remarks WHERE id = :id");

        $stmt->execute([':id' => $balance_id, ':user_id' => $user_id, ':status' => $status, ':remarks' => $remarks]);

        responderPagamento($isAjax, ['ok' => true, 'ids' => [$balance_id], 'message' => ($action === 'pay' ? 'Pagamento registrado.' : 'Pagamento recusado.')]);
    }
}

// --- CONSULTA E AGRUPAMENTO DOS DADOS ---

// Função para formatar a chave PIX conforme o tipo
function formatarChavePix($chave, $tipo)
{
    if (in_array($tipo, [1, 2, 4])) {
        // Remove tudo que não for número
        return preg_replace('/\D/', '', $chave);
    }
    // Para e-mail, chave aleatória etc, mantém como está
    return $chave;
}

// 1. Consulta SQL Otimizada para Agrupamento
$stmt = $pdo->prepare("
    SELECT 
        r.id, r.remarks, r.amount, r.date_created, 
        u.user_id, u.user_nome,
        cs.nome AS categoria_nome,
        r.pix, r.pix_type, tk.name_type AS tipo_pix_nome, 
        r.category_id, r.cliente, r.status, 
        r.remark_aprov AS aprovacao_remarks 
    FROM running_balance r 
    JOIN usuarios u ON u.user_id = r.user_id 
    LEFT JOIN categorias_subgrupo cs ON cs.id = r.category_id
    LEFT JOIN type_keys tk ON tk.id = r.pix_type 
    WHERE r.status = 2 AND r.aj = 1 
    ORDER BY u.user_id, r.date_created ASC
");
$stmt->execute();
$pendentes = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 2. Lógica para agrupar os resultados por usuário
$despesasAgrupadas = [];
foreach ($pendentes as $p) {
    $userId = $p['user_id'];
    $pixFormatado = formatarChavePix($p['pix'], $p['pix_type']);

    // Criar uma chave única para agrupamento por usuário + chave PIX
    $chaveAgrupamento = $userId . '_' . $pixFormatado;

    if (!isset($despesasAgrupadas[$chaveAgrupamento])) {
        $despesasAgrupadas[$chaveAgrupamento] = [
            'nome_usuario' => htmlspecialchars($p['user_nome']),
            'pix' => htmlspecialchars($pixFormatado),
            'tipo_pix_nome' => htmlspecialchars($p['tipo_pix_nome']),
            'pix_type_id' => htmlspecialchars($p['pix_type']),
            'total' => 0,
            'ids_despesas' => [],
            'descricoes' => [],
            'despesas' => []
        ];
    }

    $despesasAgrupadas[$chaveAgrupamento]['despesas'][] = $p;
    $despesasAgrupadas[$chaveAgrupamento]['total'] += $p['amount'];
    $despesasAgrupadas[$chaveAgrupamento]['ids_despesas'][] = $p['id'];
    if (!empty($p['remarks'])) {
        $despesasAgrupadas[$chaveAgrupamento]['descricoes'][] = '#' . $p['id'] . ' - ' . $p['remarks'];
    }
}

?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="../css/bootstrap-select.min.css">
    <link rel="stylesheet" href="css/pagar_rd_modern.css">
    <title>RD - Pagamento de Despesas</title>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid px-3 mt-2 pagar-rd-page">
        <div class="row">
            <div class="col-12">
                <div class="card pagar-rd-main-card">
                    <form method="post" id="formMain">
                        <div class="card-header py-2 pagar-rd-toolbar">
                            <div class="row align-items-center">
                                <div class="col-sm-6 d-flex align-items-center">
                                    <h4 class="font-weight-bold m-0 pagar-rd-title">Pagamento de Despesas</h4>
                                    <a href="gestaoRD.php" class="ml-4 pagar-rd-home-link"><i class="fas fa-home" style="font-size: 25px;" data-toggle="tooltip" title="Home RD"></i></a>
                                </div>
                                <div class="col-sm-6 text-right">
                                    <button type="button" id="btnPagarSelecionadas" class="btn btn-success btn-sm pagar-rd-action-btn">
                                        <i class="fas fa-check"></i> Pagar Selecionadas
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="card-body pagar-rd-table-body">
                            <?php if (empty($despesasAgrupadas)) : ?>
                                <div class="alert alert-info m-3 pagar-rd-empty">Nenhuma despesa aprovada pendente de pagamento.</div>
                            <?php else : ?>
                                <table class="table table-sm table-bordered table-hover pagar-rd-table">
                                    <thead class="thead-light">
                                        <tr class="text-center">
                                            <th style="width: 5%;"><input type="checkbox" id="checkAll"></th>
                                            <th style="width: 5%;">ID</th>
                                            <th>Data</th>
                                            <th>Categoria</th>
                                            <th>Cliente</th>
                                            <th>Usuário</th>
                                            <th style="width: 10%;">Valor</th>
                                            <th style="width: 15%;">Descrição Usuário</th>
                                            <th style="width: 15%;">Obs Aprovador</th>
                                            <th style="width: 20%;">Ações / Obs Pagamento</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        <?php foreach ($despesasAgrupadas as $chaveAgrupamento => $grupo) : ?>
                                            <?php
                                            $safeId = preg_replace('/[^a-zA-Z0-9_-]/', '_', $chaveAgrupamento);
                                            $descricoesGrupo = array_slice($grupo['descricoes'], 0, 3);
                                            $descricaoResumo = !empty($descricoesGrupo) ? implode(' | ', $descricoesGrupo) : 'Sem descrição informada.';
                                            $descricaoExtra = count($grupo['descricoes']) > 3 ? ' +' . (count($grupo['descricoes']) - 3) . ' descrição(ões)' : '';
                                            ?>


                                            <tr class="table-secondary pagar-rd-group-row" data-group-id="<?= $safeId ?>">
                                                <td class="text-center">
                                                    <input type="checkbox" class="check-group" data-group-id="<?= $safeId ?>">
                                                </td>
                                                <td colspan="5" class="text-left pagar-rd-group-desc" style="font-size: 1rem;">
                                                    <div class="font-weight-bold"><i class="fas fa-layer-group mr-2"></i><?= $grupo['nome_usuario'] ?></div>
                                                    <div class="small text-muted"><i class="fas fa-align-left mr-1"></i><?= htmlspecialchars($descricaoResumo . $descricaoExtra) ?></div>
                                                </td>

                                                <td class="text-center font-weight-bold" style="font-size: 1rem;">
                                                    Total: R$ <?= number_format($grupo['total'], 2, ',', '.') ?>
                                                </td>

                                                <td colspan="2" class="text-center">
                                                    <i class="fab fa-pix mr-2"></i>PIX: <?= $grupo['pix'] ?> (<?= $grupo['tipo_pix_nome'] ?>)
                                                </td>

                                                <td class="text-center">
                                                    <button type="button" class="btn btn-sm btn-dark" data-toggle="modal" data-target="#qrCodeModal" data-nome="<?= htmlspecialchars($grupo['nome_usuario'], ENT_QUOTES) ?>" data-valor="<?= number_format($grupo['total'], 2, '.', '') ?>" data-chave="<?= htmlspecialchars($grupo['pix'], ENT_QUOTES) ?>" data-descricao="<?= htmlspecialchars($descricaoResumo . $descricaoExtra, ENT_QUOTES) ?>" data-ids="<?= htmlspecialchars(implode(',', $grupo['ids_despesas']), ENT_QUOTES) ?>" title="Pagar com QR Code">
                                                        <i class="fas fa-qrcode"></i> Pagar PIX
                                                    </button>
                                                    <button type="button" class="btn btn-sm btn-info mt-1" data-toggle="collapse" data-target=".details-<?= $safeId ?>">
                                                        <i class="fas fa-eye"></i> Ver Detalhes
                                                    </button>
                                                </td>
                                            </tr>

                                            <?php foreach ($grupo['despesas'] as $p) : ?>
                                                <tr class="collapse details-<?= $safeId ?> pagar-rd-detail-row" data-group-id="<?= $safeId ?>" data-rd-id="<?= $p['id'] ?>">
                                                    <td class="text-center">
                                                        <input type="checkbox" name="approvement_ids[]" value="<?= $p['id'] ?>" class="check-item check-item-<?= $safeId ?>">
                                                    </td>
                                                    <td class="text-center"><?= $p['id'] ?></td>
                                                    <td><?= date('d/m/Y H:i', strtotime($p['date_created'])) ?></td>
                                                    <td><?= htmlspecialchars($p['categoria_nome']) ?></td>
                                                    <td><?= htmlspecialchars($p['cliente']) ?></td>
                                                    <td><?= htmlspecialchars($p['user_nome']) ?></td>
                                                    <td>R$ <?= number_format($p['amount'], 2, ',', '.') ?></td>
                                                    <td><?= htmlspecialchars($p['remarks']) ?></td>
                                                    <td><?= htmlspecialchars($p['aprovacao_remarks']) ?></td>
                                                    <td>
                                                        <textarea name="remarks[<?= $p['id'] ?>]" class="form-control form-control-sm mb-2" placeholder="Obs. de Pagamento"></textarea>
                                                        <input type="hidden" name="pix[<?= $p['id'] ?>]" value="<?= $grupo['pix'] ?>">
                                                        <input type="hidden" name="pix_type[<?= $p['id'] ?>]" value="<?= $grupo['pix_type_id'] ?>">
                                                        <div class="d-flex justify-content-between mt-2">
                                                            <button type="button" class="btn btn-success btn-sm w-50 mr-1" data-toggle="modal" data-target="#pagarModal" data-id="<?= $p['id'] ?>">
                                                                <i class="fas fa-money-bill-wave"></i> Pagar
                                                            </button>
                                                            <button type="button" class="btn btn-danger btn-sm w-50" data-toggle="modal" data-target="#recusarPagamentoModal" data-id="<?= $p['id'] ?>">
                                                                <i class="fas fa-times"></i> Recusar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            <?php endforeach; ?>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                                <div id="pagarRdPagination" class="pagar-rd-pagination"></div>
                            <?php endif; ?>
                        </div>
                        <input type="hidden" name="approvement_id" id="approvement_id" value="">
                        <input type="hidden" name="action" id="form_action" value="">
                    </form>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade pagar-rd-modal" id="pagarModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-dialog-centered modal-sm" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Confirmar Pagamento</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Deseja realmente registrar o pagamento?</p>
                </div>
                <div class="modal-footer"><button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Cancelar</button><button type="button" class="btn btn-success btn-sm" id="btnConfirmarPagamento">Sim, Pagar</button></div>
            </div>
        </div>
    </div>

    <div class="modal fade pagar-rd-modal" id="recusarPagamentoModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-dialog-centered modal-sm" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Confirmar Recusa</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Deseja realmente recusar o pagamento?</p>
                    <p class="text-danger small">A despesa retornará ao status de rejeitada.</p>
                </div>
                <div class="modal-footer"><button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Cancelar</button><button type="button" class="btn btn-danger btn-sm" id="btnConfirmarRecusaPagamento">Sim, Recusar</button></div>
            </div>
        </div>
    </div>

    <div class="modal fade pagar-rd-modal" id="pagarSelecionadasModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-dialog-centered modal-sm" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Pagar Selecionadas</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Deseja registrar o pagamento para todas as despesas selecionadas?</p>
                </div>
                <div class="modal-footer"><button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Cancelar</button><button type="button" class="btn btn-success btn-sm" id="btnConfirmarPagamentoSelecionadas">Pagar Selecionadas</button></div>
            </div>
        </div>
    </div>

    <div class="modal fade pagar-rd-modal" id="qrCodeModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Pagar com PIX QR Code</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body text-center">
                    <p>Escaneie o código abaixo com o app do seu banco.</p>

                    <h4 id="qr-nome-beneficiario" class="mt-3"></h4>
                    <h5>Valor: <strong id="qr-valor-pagamento" class="text-success"></strong></h5>

                    <div class="pagar-rd-qr-description text-left">
                        <span><i class="fas fa-align-left"></i> Descrição da RD</span>
                        <p id="qr-descricao-rd"></p>
                    </div>

                    <img id="qrCodeImage" src="" alt="QR Code PIX" class="img-fluid">

                    <button type="button" class="btn btn-success pagar-rd-qr-paid-btn" id="btnConfirmarPagamentoQr">
                        <i class="fas fa-check-circle"></i> Compensar como pago
                    </button>

                    <p class="mt-3 small text-muted">Após o pagamento, use o botão abaixo para compensar as RDs como pagas sem recarregar a página.
                    </p>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

    <script>
        $(document).ready(function() {
            let approvementIdToActOn;
            let qrPaymentIds = [];
            let currentPage = 1;
            const pageSize = 8;

            function getVisibleGroups() {
                return $('.pagar-rd-group-row');
            }

            function updateEmptyState() {
                if ($('.pagar-rd-group-row').length === 0 && $('.pagar-rd-empty').length === 0) {
                    $('.pagar-rd-table').replaceWith('<div class="alert alert-info m-3 pagar-rd-empty">Nenhuma despesa aprovada pendente de pagamento.</div>');
                    $('#pagarRdPagination').remove();
                }
            }

            function applyPagination() {
                const groups = getVisibleGroups();
                const totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
                if (currentPage > totalPages) currentPage = totalPages;

                groups.each(function(index) {
                    const groupId = $(this).data('group-id');
                    const showGroup = index >= (currentPage - 1) * pageSize && index < currentPage * pageSize;
                    $(this).toggle(showGroup);
                    if (!showGroup) {
                        $('.pagar-rd-detail-row[data-group-id="' + groupId + '"]').hide();
                    } else {
                        $('.pagar-rd-detail-row[data-group-id="' + groupId + '"]').each(function() {
                            $(this).toggle($(this).hasClass('show'));
                        });
                    }
                });

                renderPagination(totalPages);
            }

            function renderPagination(totalPages) {
                const pagination = $('#pagarRdPagination');
                if (!pagination.length) return;
                if (totalPages <= 1) {
                    pagination.empty();
                    return;
                }

                let html = '<nav aria-label="Paginação de RDs"><ul class="pagination pagination-sm justify-content-center mb-0">';
                html += '<li class="page-item ' + (currentPage === 1 ? 'disabled' : '') + '"><button type="button" class="page-link" data-page="' + (currentPage - 1) + '">Anterior</button></li>';
                for (let page = 1; page <= totalPages; page++) {
                    html += '<li class="page-item ' + (page === currentPage ? 'active' : '') + '"><button type="button" class="page-link" data-page="' + page + '">' + page + '</button></li>';
                }
                html += '<li class="page-item ' + (currentPage === totalPages ? 'disabled' : '') + '"><button type="button" class="page-link" data-page="' + (currentPage + 1) + '">Pr?xima</button></li>';
                html += '</ul></nav>';
                pagination.html(html);
            }

            $('#pagarRdPagination').on('click', '.page-link', function() {
                const page = parseInt($(this).data('page'), 10);
                if (!page || $(this).closest('.page-item').hasClass('disabled')) return;
                currentPage = page;
                applyPagination();
            });

            function removePaidRows(ids) {
                ids.forEach(function(id) {
                    const row = $('.pagar-rd-detail-row[data-rd-id="' + id + '"]');
                    const groupId = row.data('group-id');
                    row.remove();

                    if (groupId && $('.pagar-rd-detail-row[data-group-id="' + groupId + '"]').length === 0) {
                        $('.pagar-rd-group-row[data-group-id="' + groupId + '"]').remove();
                    }
                });
                $('.modal').modal('hide');
                updateEmptyState();
                applyPagination();
            }

            function submitPaymentAjax(action, id) {
                const form = $('#formMain')[0];
                const formData = new FormData(form);
                formData.set('action', action);
                formData.set('ajax', '1');
                if (id) {
                    formData.set('approvement_id', id);
                }

                return $.ajax({
                    url: 'pagarRD.php',
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    dataType: 'json'
                }).done(function(response) {
                    if (!response || !response.ok) {
                        alert((response && response.message) || 'N?o foi poss?vel processar o pagamento.');
                        return;
                    }
                    removePaidRows((response.ids || []).map(String));
                }).fail(function() {
                    alert('Erro de comunicação ao processar pagamento.');
                });
            }

            $('#checkAll').on('change', function() {
                $('.check-group, .check-item').prop('checked', this.checked);
            });

            $('.check-group').on('change', function() {
                const groupId = $(this).data('group-id');
                $('.check-item-' + groupId).prop('checked', this.checked);
            });

            $('#pagarModal').on('show.bs.modal', function(event) {
                approvementIdToActOn = $(event.relatedTarget).data('id');
            });

            $('#btnConfirmarPagamento').on('click', function() {
                submitPaymentAjax('pay', approvementIdToActOn);
            });

            $('#recusarPagamentoModal').on('show.bs.modal', function(event) {
                approvementIdToActOn = $(event.relatedTarget).data('id');
            });

            $('#btnConfirmarRecusaPagamento').on('click', function() {
                submitPaymentAjax('reject', approvementIdToActOn);
            });

            $('#btnPagarSelecionadas').on('click', function() {
                if ($('input[name="approvement_ids[]"]:checked').length === 0) {
                    alert('Por favor, selecione pelo menos uma despesa para pagar.');
                    return;
                }
                $('#pagarSelecionadasModal').modal('show');
            });

            $('#btnConfirmarPagamentoSelecionadas').on('click', function() {
                submitPaymentAjax('pay_selected');
            });

            $('[data-toggle="tooltip"]').tooltip();

            $('#qrCodeModal').on('show.bs.modal', function(event) {
                const button = $(event.relatedTarget);
                const nome = button.data('nome');
                const valor = button.data('valor');
                const chave = button.data('chave');
                const descricao = button.data('descricao') || 'Sem descrição informada.';
                const ids = String(button.data('ids') || '');
                const cidade = button.data('cidade') || 'NIVEL3 TI';
                qrPaymentIds = ids.split(',').filter(Boolean);

                const modal = $(this);
                modal.find('#qr-nome-beneficiario').text('Beneficiário: ' + nome);
                modal.find('#qr-valor-pagamento').text('R$ ' + parseFloat(valor).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                }));
                modal.find('#qr-descricao-rd').text(descricao);

                const qrUrl = 'gerar_qrcodepix.php?chave=' + encodeURIComponent(chave) +
                    '&valor=' + valor +
                    '&nome=' + encodeURIComponent(nome) +
                    '&cidade=' + encodeURIComponent(cidade);

                modal.find('#qrCodeImage').attr('src', qrUrl);
            });

            $('#btnConfirmarPagamentoQr').on('click', function() {
                if (qrPaymentIds.length === 0) {
                    alert('Nenhuma despesa encontrada para compensar.');
                    return;
                }

                $('input[name="approvement_ids[]"]').prop('checked', false);
                qrPaymentIds.forEach(function(id) {
                    $('input[name="approvement_ids[]"][value="' + id + '"]').prop('checked', true);
                });
                submitPaymentAjax('pay_selected');
            });

            applyPagination();
        });
    </script>
</body>

</html>

