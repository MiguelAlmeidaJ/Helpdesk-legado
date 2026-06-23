<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/email_smtp.php");

if ($m9_02 < 2) {
    header("Location: ../home.php");
    exit;
}

// if (!isset($_SESSION['allterusN3Id'])) {
//     header("Location: ../index.php");
//     exit;
// }

$id_allterus = (int)$_SESSION['allterusN3Id'];

$pdo = ConnectionN3rd();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

$usuario = $pdo->query("SELECT * FROM user WHERE id_allterus = $id_allterus")->fetch(PDO::FETCH_ASSOC);

// if (!$usuario || $usuario['type'] < 0) {
//     header("Location: ../index.php");
//     exit;
// }

$id_n3rd = $usuario['id'];
if ($usuario['id'] == 30) {
    $user_id = 22;
}

$permissao = $usuario['type'];

function sendApprovalEmail($pdo, $balanceIds, $userId)
{
    // Monta o conteúdo do email com as despesas aprovadas
    $content = "";
    $placeholders = implode(',', array_fill(0, count($balanceIds), '?'));
    $stmt = $pdo->prepare("
        SELECT r.id, r.remarks, r.amount, u.firstname, u.lastname, c.categories, r.pix, r.pix_type, tk.name_type 
        FROM running_balance r
        JOIN user u ON u.id = r.user_id
        JOIN category c ON c.id = r.category_id
        LEFT JOIN type_keys tk ON tk.id = r.pix_type
        WHERE r.id IN ($placeholders)
    ");
    $stmt->execute($balanceIds);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as $row) {
        $content .= "<p>
            Prestador de Serviços: <strong>" . htmlspecialchars($row['firstname'] . ' ' . $row['lastname']) . "</strong><br>
            Valor: <strong>R$ " . number_format($row['amount'], 2, ',', '.') . "</strong><br>
            Categoria: <strong>" . htmlspecialchars($row['categories']) . "</strong><br>
            Chave PIX: <strong>" . htmlspecialchars($row['pix']) . "</strong><br>
            Tipo de Chave PIX: <strong>" . htmlspecialchars($row['name_type']) . "</strong><br>
            Observação: <strong>" . htmlspecialchars($row['remarks'] ?: '-') . "</strong><br>
        </p>";
    }

    $to = "clerio.junior@gmail.com,osvaldo.carvalho@nivel3ti.com.br, cleristom.silva@nivel3ti.com.br";
    $subject = "Gestão de RDs: Despesas Aprovadas - Aguardando Pagamento";
    $headers = "From: allterus@nivel3ti.com.br\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";

    n3_send_mail($to, $subject, $content, $headers);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = $usuario['id'];
    $action = $_POST['action'] ?? '';

    $remarks = $_POST['remarks'] ?? [];
    $pix = $_POST['pix'] ?? [];
    $pix_type = $_POST['pix_type'] ?? [];

    if ($action === 'approve_selected' && isset($_POST['balance_ids']) && is_array($_POST['balance_ids'])) {
        foreach ($_POST['balance_ids'] as $balance_id) {
            $balance_id = (int)$balance_id;
            $obs = !empty($remarks[$balance_id]) ? $remarks[$balance_id] : 'Aprovado';
            $pixVal = $pix[$balance_id] ?? null;
            $pixTypeVal = $pix_type[$balance_id] ?? null;

            $stmt = $pdo->prepare("UPDATE running_balance SET status = 2, date_updated = NOW() WHERE id = :id");
            $stmt->execute([':id' => $balance_id]);

            $stmt = $pdo->prepare("INSERT INTO approvement (balance_id, user_id, date, approved, remarks, pix, pix_type)
                                      VALUES (:balance_id, :user_id, NOW(), 1, :remarks, :pix, :pix_type)");
            $stmt->execute([
                ':balance_id' => $balance_id,
                ':user_id' => $user_id,
                ':remarks' => $obs,
                ':pix' => $pixVal,
                ':pix_type' => $pixTypeVal
            ]);
        }

        // Envia o email com as despesas aprovadas
        sendApprovalEmail($pdo, $_POST['balance_ids'], $user_id);

        header("Location: aprovarRD.php");
        exit;
    }

    if (($action === 'approve' || $action === 'reject') && isset($_POST['balance_id'])) {
        $balance_id = (int)$_POST['balance_id'];
        $obs = !empty($remarks[$balance_id]) ? $remarks[$balance_id] : (($action === 'approve') ? 'Aprovado' : 'Recusado');
        $pixVal = $pix[$balance_id] ?? null;
        $pixTypeVal = $pix_type[$balance_id] ?? null;

        $status = ($action === 'approve') ? 2 : 3;

        $stmt = $pdo->prepare("UPDATE running_balance SET status = :status, date_updated = NOW() WHERE id = :id");
        $stmt->execute([':status' => $status, ':id' => $balance_id]);

        if ($action === 'approve') {
            $stmt = $pdo->prepare("INSERT INTO approvement (balance_id, user_id, date, approved, remarks, pix, pix_type)
                                      VALUES (:balance_id, :user_id, NOW(), :approved, :remarks, :pix, :pix_type)");
            $stmt->execute([
                ':balance_id' => $balance_id,
                ':user_id' => $user_id,
                ':approved' => 1,
                ':remarks' => $obs,
                ':pix' => $pixVal,
                ':pix_type' => $pixTypeVal
            ]);

            // Enviar email da aprovação individual
            sendApprovalEmail($pdo, [$balance_id], $user_id);
        }

        header("Location: aprovarRD.php");
        exit;
    }
}

// if ($_SERVER['REQUEST_METHOD'] === 'POST') {
//     $user_id = $usuario['id'];
//     $action = $_POST['action'] ?? '';

//     $remarks = $_POST['remarks'] ?? [];
//     $pix = $_POST['pix'] ?? [];
//     $pix_type = $_POST['pix_type'] ?? [];

//     if ($action === 'approve_selected' && isset($_POST['balance_ids']) && is_array($_POST['balance_ids'])) {
//         foreach ($_POST['balance_ids'] as $balance_id) {
//             $balance_id = (int)$balance_id;
//             $obs = !empty($remarks[$balance_id]) ? $remarks[$balance_id] : 'Aprovado';
//             $pixVal = $pix[$balance_id] ?? null;
//             $pixTypeVal = $pix_type[$balance_id] ?? null;

//             $stmt = $pdo->prepare("UPDATE running_balance SET status = 2, date_updated = NOW() WHERE id = :id");
//             $stmt->execute([':id' => $balance_id]);

//             $stmt = $pdo->prepare("INSERT INTO approvement (balance_id, user_id, date, approved, remarks, pix, pix_type)
//                                       VALUES (:balance_id, :user_id, NOW(), 1, :remarks, :pix, :pix_type)");
//             $stmt->execute([
//                 ':balance_id' => $balance_id,
//                 ':user_id' => $user_id,
//                 ':remarks' => $obs,
//                 ':pix' => $pixVal,
//                 ':pix_type' => $pixTypeVal
//             ]);
//         }
//         header("Location: aprovarRD.php");
//         exit;
//     }

//     if (($action === 'approve' || $action === 'reject') && isset($_POST['balance_id'])) {
//         $balance_id = (int)$_POST['balance_id'];
//         $obs = !empty($remarks[$balance_id]) ? $remarks[$balance_id] : (($action === 'approve') ? 'Aprovado' : 'Recusado');
//         $pixVal = $pix[$balance_id] ?? null;
//         $pixTypeVal = $pix_type[$balance_id] ?? null;

//         $status = ($action === 'approve') ? 2 : 3;

//         $stmt = $pdo->prepare("UPDATE running_balance SET status = :status, date_updated = NOW() WHERE id = :id");
//         $stmt->execute([':status' => $status, ':id' => $balance_id]);

//         if ($action === 'approve') {
//             $stmt = $pdo->prepare("INSERT INTO approvement (balance_id, user_id, date, approved, remarks, pix, pix_type)
//                                       VALUES (:balance_id, :user_id, NOW(), :approved, :remarks, :pix, :pix_type)");
//             $stmt->execute([
//                 ':balance_id' => $balance_id,
//                 ':user_id' => $user_id,
//                 ':approved' => 1,
//                 ':remarks' => $obs,
//                 ':pix' => $pixVal,
//                 ':pix_type' => $pixTypeVal
//             ]);
//         }
//         header("Location: aprovarRD.php");
//         exit;
//     }
// }

// Consulta despesas pendentes para exibir
$stmt = $pdo->prepare("
    SELECT 
        r.id, r.remarks, r.amount, r.date_created, 
        u.firstname, u.lastname, 
        c.categories AS categoria_nome, 
        r.pix, r.pix_type, 
        tk.name_type AS tipo_pix_nome, 
        r.category_id, r.cliente
    FROM running_balance r
    JOIN user u ON u.id = r.user_id
    JOIN category c ON c.id = r.category_id
    LEFT JOIN type_keys tk ON tk.id = r.pix_type
    WHERE r.status = 1 AND r.aj = 1
    ORDER BY r.date_created ASC
");
$stmt->execute();
$pendentes = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="../css/bootstrap-select.min.css">
    <link rel="stylesheet" href="../css/progress_bar.css">
    <link rel="stylesheet" href="../css/blink.css">
    <link rel="stylesheet" href="../css/help.css">
    <link rel="stylesheet" href="../css/switch.css">
    <title>Aprovação de Despesas</title>
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
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid mt-2">
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <form method="post" id="formMain">
                        <div class="card-header py-2">
                            <div class="row align-items-center">
                                <div class="col-sm-6 d-flex align-items-center">
                                    <h4 class="font-weight-bold m-0">Aprovação de Despesas</h4>
                                    <a href="gestaoRD.php" class="ml-4"><i class="fas fa-home" style="font-size: 25px;" data-toggle="tooltip" title="Home RD"></i></a>
                                </div>
                                <div class="col-sm-6 text-right">
                                    <button type="button" id="btnAprovarSelecionadas" class="btn btn-success btn-sm">
                                        <i class="fas fa-check"></i> Aprovar Selecionadas
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <?php if (count($pendentes) === 0) : ?>
                                <div class="alert alert-info m-3">Nenhuma despesa pendente.</div>
                            <?php else : ?>
                                <div class="table-responsive">
                                    <table class="table table-sm table-bordered table-hover ">
                                        <thead class="thead-light">
                                            <tr class="text-center">
                                                <th style="width: 5%;"><input type="checkbox" id="checkAll"></th>
                                                <th style="width: 5%;">ID</th>
                                                <th>Data</th>
                                                <th>Categoria</th>
                                                <th>Cliente</th>
                                                <th>Usuário</th>
                                                <th style="width: 10%;">Valor</th>
                                                <th style="width: 20%; word-break: break-word; white-space: normal;">Descrição</th>
                                                <th style="width: 20%;">Açães</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($pendentes as $p) : ?>
                                                <tr>
                                                    <td class="text-center">
                                                        <input type="checkbox" name="balance_ids[]" value="<?= $p['id'] ?>">
                                                    </td>
                                                    <td class="text-center"><?= $p['id'] ?></td>
                                                    <td><?= date('d/m/Y H:i', strtotime($p['date_created'])) ?></td>
                                                    <td><?= htmlspecialchars($p['categoria_nome']) ?></td>
                                                    <td><?= htmlspecialchars($p['cliente']) ?></td>
                                                    <td><?= htmlspecialchars($p['firstname'] . ' ' . $p['lastname']) ?></td>
                                                    <td>R$ <?= number_format($p['amount'], 2, ',', '.') ?></td>
                                                    <td><?= htmlspecialchars($p['remarks']) ?></td>
                                                    <td>
                                                        <textarea name="remarks[<?= $p['id'] ?>]" class="form-control form-control-sm mb-2" placeholder="Observações de Aprovação"></textarea>
                                                        <div class="col-7">
                                                            <input type="hidden" name="pix[<?= $p['id'] ?>]" value="<?= htmlspecialchars($p['pix']) ?>">
                                                            <strong class="small">PIX:</strong>
                                                            <span class="small"><?= htmlspecialchars($p['pix']) ?></span>
                                                        </div>
                                                        <div class="col-5">
                                                            <input type="hidden" name="pix_type[<?= $p['id'] ?>]" value="<?= htmlspecialchars($p['pix_type']) ?>">
                                                            <strong class="small">Tipo:</strong>
                                                            <span class="small"><?= htmlspecialchars($p['tipo_pix_nome']) ?></span>
                                                        </div>
                                                        <div class="d-flex justify-content-between mt-2">
                                                            <button type="button" class="btn btn-success btn-sm w-50 mr-1" data-toggle="modal" data-target="#aprovarModal" data-id="<?= $p['id'] ?>">
                                                                <i class="fas fa-check"></i> Aprovar
                                                            </button>
                                                            <button type="button" class="btn btn-danger btn-sm w-50" data-toggle="modal" data-target="#recusarModal" data-id="<?= $p['id'] ?>">
                                                                <i class="fas fa-times"></i> Recusar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            <?php endforeach ?>
                                        </tbody>
                                    </table>
                                </div>
                            <?php endif ?>
                        </div>

                        <input type="hidden" name="balance_id" id="balance_id" value="">
                        <input type="hidden" name="action" id="form_action" value="">
                    </form>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="aprovarModal" tabindex="-1" role="dialog" aria-labelledby="aprovarModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="aprovarModalLabel">Confirmar Aprovação</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Deseja realmente aprovar esta despesa?</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-success btn-sm" id="btnConfirmarAprovacao">Aprovar</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="recusarModal" tabindex="-1" role="dialog" aria-labelledby="recusarModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="recusarModalLabel">Confirmar Recusa</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Deseja realmente recusar esta despesa?</p>
                    <p class="text-danger small">Esta ação não poderá ser desfeita.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-danger btn-sm" id="btnConfirmarRecusa">Recusar</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="aprovarSelecionadasModal" tabindex="-1" role="dialog" aria-labelledby="aprovarSelecionadasModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="aprovarSelecionadasModalLabel">Aprovar Selecionadas</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Deseja realmente aprovar todas as despesas selecionadas?</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-success btn-sm" id="btnConfirmarAprovacaoSelecionadas">Aprovar</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

    <script>
        $(document).ready(function() {
            let balanceIdToActOn;

            $("#checkAll").on("change", function() {
                $('input[name="balance_ids[]"]').prop('checked', this.checked);
            });

            // Evento 'show.bs.modal' do BS5 foi trocado para 'show.modal' do BS4
            $('#aprovarModal').on('show.bs.modal', function(event) {
                const button = $(event.relatedTarget);
                balanceIdToActOn = button.data('id');
            });

            $('#btnConfirmarAprovacao').on('click', function() {
                $('#balance_id').val(balanceIdToActOn);
                $('#form_action').val('approve');
                $('#formMain').submit();
            });

            $('#recusarModal').on('show.bs.modal', function(event) {
                const button = $(event.relatedTarget);
                balanceIdToActOn = button.data('id');
            });


            $('#btnConfirmarRecusa').on('click', function() {
                $('#balance_id').val(balanceIdToActOn);
                $('#form_action').val('reject');
                $('#formMain').submit();
            });

            $('#btnAprovarSelecionadas').on('click', function() {
                if ($('input[name="balance_ids[]"]:checked').length === 0) {
                    alert('Por favor, selecione pelo menos uma despesa para aprovar.');
                    return;
                }
                // Chamada de modal com jQuery para Bootstrap 4
                $('#aprovarSelecionadasModal').modal('show');
            });

            $('#btnConfirmarAprovacaoSelecionadas').on('click', function() {
                $('#form_action').val('approve_selected');
                $('#formMain').submit();
            });

            // Inicializador de tooltips para Bootstrap 4
            $('[data-toggle="tooltip"]').tooltip();
        });
    </script>
</body>

</html>