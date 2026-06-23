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

// Verificação de sessão
if (!isset($_SESSION['allterusN3Id'])) {
    header("Location: ../index.php");
    exit;
}

$id_allterus = (int)$_SESSION['allterusN3Id'];
$pdo = ConnectionN3rd();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

$usuario = $pdo->query("SELECT * FROM user WHERE id_allterus = $id_allterus")->fetch(PDO::FETCH_ASSOC);
if (!$usuario || $usuario['type'] < 0) {
    header("Location: ../index.php");
    exit;
}
$permissao = $usuario['type'];

// --- PROCESSAMENTO DO FORMULÁRIO (POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id_pagador = $usuario['id']; // ID do gestor que está pagando
    $action = $_POST['action'] ?? '';
    $remarks = $_POST['remarks'] ?? [];
    $pix = $_POST['pix'] ?? [];
    $pix_type = $_POST['pix_type'] ?? [];

    // === BLOCO PARA PAGAR SELECIONADAS (INDIVIDUAL OU EM GRUPO) ===
    if ($action === 'pay_selected' && isset($_POST['approvement_ids']) && is_array($_POST['approvement_ids'])) {
        foreach ($_POST['approvement_ids'] as $balance_id) {
            $balance_id = (int)$balance_id;
            $obs = !empty($remarks[$balance_id]) ? $remarks[$balance_id] : 'Pagamento Efetuado';
            $pixVal = $pix[$balance_id] ?? null;
            $pixTypeVal = $pix_type[$balance_id] ?? null;

            // Atualiza o status da despesa para "Paga"
            $stmt = $pdo->prepare("UPDATE running_balance SET status = 4, date_updated = NOW() WHERE id = :id");
            $stmt->execute([':id' => $balance_id]);

            // Busca o approvement.id correspondente para registrar o pagamento
            $stmt = $pdo->prepare("SELECT id FROM approvement WHERE balance_id = :balance_id LIMIT 1");
            $stmt->execute([':balance_id' => $balance_id]);
            $ap = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($ap) {
                $approvement_id = (int)$ap['id'];
                $stmt = $pdo->prepare("INSERT INTO payment (approvement_id, user_id, date, remarks, pix, pix_type)
                                       VALUES (:approvement_id, :user_id, NOW(), :remarks, :pix, :pix_type)");
                $stmt->execute([
                    ':approvement_id' => $approvement_id,
                    ':user_id' => $user_id_pagador,
                    ':remarks' => $obs,
                    ':pix' => $pixVal,
                    ':pix_type' => $pixTypeVal
                ]);
            }
        }
        header("Location: pagarRD.php");
        exit;
    }

    // === BLOCO PARA PAGAMENTO OU RECUSA INDIVIDUAL ===
    if (($action === 'pay' || $action === 'reject') && isset($_POST['approvement_id'])) {
        $balance_id = (int)$_POST['approvement_id'];
        $obs = !empty($remarks[$balance_id]) ? $remarks[$balance_id] : (($action === 'pay') ? 'Pagamento Efetuado' : 'Pagamento Recusado');
        $pixVal = $pix[$balance_id] ?? null;
        $pixTypeVal = $pix_type[$balance_id] ?? null;
        $status = ($action === 'pay') ? 4 : 3; // 4 para Paga, 3 para Rejeitada

        $stmt = $pdo->prepare("UPDATE running_balance SET status = :status, date_updated = NOW() WHERE id = :id");
        $stmt->execute([':status' => $status, ':id' => $balance_id]);

        if ($action === 'pay') {
            $stmt = $pdo->prepare("SELECT id FROM approvement WHERE balance_id = :balance_id LIMIT 1");
            $stmt->execute([':balance_id' => $balance_id]);
            $ap = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($ap) {
                $approvement_id = (int)$ap['id'];
                $stmt = $pdo->prepare("INSERT INTO payment (approvement_id, user_id, date, remarks, pix, pix_type)
                                       VALUES (:approvement_id, :user_id, NOW(), :remarks, :pix, :pix_type)");
                $stmt->execute([
                    ':approvement_id' => $approvement_id,
                    ':user_id' => $user_id_pagador,
                    ':remarks' => $obs,
                    ':pix' => $pixVal,
                    ':pix_type' => $pixTypeVal
                ]);
            }
        }

        header("Location: pagarRD.php");
        exit;
    }
}

// --- CONSULTA E AGRUPAMENTO DOS DADOS ---

// 1. Consulta SQL Otimizada para Agrupamento
$stmt = $pdo->prepare("
    SELECT 
        r.id, r.remarks, r.amount, r.date_created, 
        u.id AS user_id, u.firstname, u.lastname, 
        c.categories AS categoria_nome, 
        r.pix, r.pix_type, tk.name_type AS tipo_pix_nome, 
        r.category_id, r.cliente, r.status, 
        a.remarks AS aprovacao_remarks 
    FROM running_balance r 
    JOIN approvement a ON a.balance_id = r.id 
    JOIN user u ON u.id = r.user_id 
    JOIN category c ON c.id = r.category_id 
    LEFT JOIN type_keys tk ON tk.id = r.pix_type 
    WHERE r.status = 2 AND r.aj = 1 
    ORDER BY u.id, r.date_created ASC
");
$stmt->execute();
$pendentes = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 2. Lógica para Agrupar os Resultados por Usuário
$despesasAgrupadas = [];
foreach ($pendentes as $p) {
    $userId = $p['user_id'];
    if (!isset($despesasAgrupadas[$userId])) {
        // Se for a primeira despesa deste usuário, criamos a estrutura base
        $despesasAgrupadas[$userId] = [
            'nome_usuario' => htmlspecialchars($p['firstname'] . ' ' . $p['lastname']),
            'pix' => htmlspecialchars($p['pix']),
            'tipo_pix_nome' => htmlspecialchars($p['tipo_pix_nome']),
            'pix_type_id' => htmlspecialchars($p['pix_type']),
            'total' => 0,
            'ids_despesas' => [],
            'despesas' => []
        ];
    }
    // Adiciona a despesa atual ao grupo
    $despesasAgrupadas[$userId]['despesas'][] = $p;
    // Soma o valor ao total do grupo
    $despesasAgrupadas[$userId]['total'] += $p['amount'];
    // Guarda o ID da despesa
    $despesasAgrupadas[$userId]['ids_despesas'][] = $p['id'];
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
    <title>RD - Pagamento de Despesas</title>
    <style>
        body {
            zoom: 0.9;
        }

        .card-body {
            max-height: 85vh;
            padding: 0;
            font-size: 0.85rem;
            color: #333;
            overflow-y: auto;
        }

        .table {
            font-size: 0.85rem !important;
            table-layout: fixed;
            width: 100%;
        }

        td,
        th {
            word-wrap: break-word;
            vertical-align: middle !important;
        }

        .table-primary,
        .table-primary>th,
        .table-primary>td {
            background-color: #cfe2ff !important;
        }

        .collapse-row.collapse.show {
            display: table-row;
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid px-3 mt-2">
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <form method="post" id="formMain">
                        <div class="card-header py-2">
                            <div class="row align-items-center">
                                <div class="col-sm-6 d-flex align-items-center">
                                    <h4 class="font-weight-bold m-0">Pagamento de Despesas</h4>
                                    <a href="gestaoRD.php" class="ml-4"><i class="fas fa-home" style="font-size: 25px;" data-toggle="tooltip" title="Home RD"></i></a>
                                </div>
                                <div class="col-sm-6 text-right">
                                    <button type="button" id="btnPagarSelecionadas" class="btn btn-success btn-sm">
                                        <i class="fas fa-check"></i> Pagar Selecionadas
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="card-body">
                            <?php if (empty($despesasAgrupadas)) : ?>
                                <div class="alert alert-info m-3">Nenhuma despesa aprovada pendente de pagamento.</div>
                            <?php else : ?>
                                <table class="table table-sm table-bordered table-hover">
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

                                    <?php foreach ($despesasAgrupadas as $userId => $grupo) : ?>
                                        <tbody>
                                            <tr class="table-secondary ">
                                                <td class="text-center">
                                                    <input type="checkbox" class="check-group" data-group-id="<?= $userId ?>">
                                                </td>
                                                <td colspan="5" class="text-right" style="font-size: 1rem;">
                                                    <i class="fas fa-layer-group mr-2"></i><?= $grupo['nome_usuario'] ?>
                                                </td>

                                                <td class="text-center font-weight-bold" style="font-size: 1rem;">
                                                    Total: R$ <?= number_format($grupo['total'], 2, ',', '.') ?>
                                                </td>

                                                <td colspan="2" class="text-center">
                                                    <i class="fab fa-pix mr-2"></i>PIX: <?= $grupo['pix'] ?> (<?= $grupo['tipo_pix_nome'] ?>)
                                                </td>

                                                <td class="text-center">
                                                    <button type="button" class="btn btn-sm btn-info w-100" data-toggle="collapse" data-target=".details-<?= $userId ?>">
                                                        <i class="fas fa-eye"></i> Ver Detalhes
                                                    </button>
                                                </td>
                                            </tr>

                                            <?php foreach ($grupo['despesas'] as $p) : ?>
                                                <tr class="collapse details-<?= $userId ?>">
                                                    <td class="text-center">
                                                        <input type="checkbox" name="approvement_ids[]" value="<?= $p['id'] ?>" class="check-item check-item-<?= $userId ?>">
                                                    </td>
                                                    <td class="text-center"><?= $p['id'] ?></td>
                                                    <td><?= date('d/m/Y H:i', strtotime($p['date_created'])) ?></td>
                                                    <td><?= htmlspecialchars($p['categoria_nome']) ?></td>
                                                    <td><?= htmlspecialchars($p['cliente']) ?></td>
                                                    <td><?= htmlspecialchars($p['firstname'] . ' ' . $p['lastname']) ?></td>
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
                                        </tbody>
                                    <?php endforeach; ?>
                                </table>
                            <?php endif; ?>
                        </div>
                        <input type="hidden" name="approvement_id" id="approvement_id" value="">
                        <input type="hidden" name="action" id="form_action" value="">
                    </form>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="pagarModal" tabindex="-1" role="dialog">
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
    <div class="modal fade" id="recusarPagamentoModal" tabindex="-1" role="dialog">
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
    <div class="modal fade" id="pagarSelecionadasModal" tabindex="-1" role="dialog">
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

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

    <script>
        $(document).ready(function() {
            let approvementIdToActOn;

            // --- SCRIPTS DE SELEÇÃO (CHECKBOX) ---

            // Checkbox "Selecionar Todos" no cabeçalho
            $("#checkAll").on("change", function() {
                // Seleciona tanto os de grupo quanto os de item
                $('.check-group, .check-item').prop('checked', this.checked);
            });

            // Checkbox de Grupo (na linha azul)
            $('.check-group').on('change', function() {
                const groupId = $(this).data('group-id');
                // Marca ou desmarca todos os checkboxes de item daquele grupo
                $(`.check-item-${groupId}`).prop('checked', this.checked);
            });

            // --- SCRIPTS DOS MODAIS E AÇÕES ---

            $('#pagarModal').on('show.bs.modal', function(event) {
                approvementIdToActOn = $(event.relatedTarget).data('id');
            });

            $('#btnConfirmarPagamento').on('click', function() {
                $('#approvement_id').val(approvementIdToActOn);
                $('#form_action').val('pay');
                $('#formMain').submit();
            });

            $('#recusarPagamentoModal').on('show.bs.modal', function(event) {
                approvementIdToActOn = $(event.relatedTarget).data('id');
            });

            $('#btnConfirmarRecusaPagamento').on('click', function() {
                $('#approvement_id').val(approvementIdToActOn);
                $('#form_action').val('reject');
                $('#formMain').submit();
            });

            $('#btnPagarSelecionadas').on('click', function() {
                if ($('input[name="approvement_ids[]"]:checked').length === 0) {
                    alert('Por favor, selecione pelo menos uma despesa para pagar.');
                    return;
                }
                $('#pagarSelecionadasModal').modal('show');
            });

            $('#btnConfirmarPagamentoSelecionadas').on('click', function() {
                $('#form_action').val('pay_selected');
                $('#formMain').submit();
            });

            // Inicializador de tooltips para Bootstrap
            $('[data-toggle="tooltip"]').tooltip();
        });
    </script>
</body>

</html>