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

// --- PROCESSAMENTO DO FORMULÁRIO (POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id_pagador = $user_id; // ID do gestor que está pagando
    $action = $_POST['action'] ?? '';
    $remarks = $_POST['remarks'] ?? [];
    $pix = $_POST['pix'] ?? [];
    $pix_type = $_POST['pix_type'] ?? [];

    // === BLOCO PARA PAGAR SELECIONADAS (INDIVIDUAL OU EM GRUPO) ===
    // === BLOCO PARA PAGAR SELECIONADAS (CORRIGIDO) ===
    if ($action === 'pay_selected' && isset($_POST['approvement_ids']) && is_array($_POST['approvement_ids'])) {

        // 1. Pegue o ARRAY de observaçães e guarde em uma variável com nome claro.
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
                ':user_id' => $user_id_pagador, // Garanta que está usando o ID de quem pagou
                ':remarks' => $observacao_desta_linha
            ]);
        }

        // Se chegou aqui, tudo correu bem.
        header("Location: pagarRD.php");
        exit;
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

        header("Location: pagarRD.php");
        exit;
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
    // Para e-mail, chave aleatória etc, mantêm como está
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

// 2. Lógica para Agrupar os Resultados por Usuário
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
            'despesas' => []
        ];
    }

    $despesasAgrupadas[$chaveAgrupamento]['despesas'][] = $p;
    $despesasAgrupadas[$chaveAgrupamento]['total'] += $p['amount'];
    $despesasAgrupadas[$chaveAgrupamento]['ids_despesas'][] = $p['id'];
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
                                            <th style="width: 20%;">Açães / Obs Pagamento</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        <?php foreach ($despesasAgrupadas as $chaveAgrupamento => $grupo) : ?>
                                            <?php
                                            $safeId = preg_replace('/[^a-zA-Z0-9_-]/', '_', $chaveAgrupamento);
                                            ?>


                                            <tr class="table-secondary ">
                                                <td class="text-center">
                                                    <input type="checkbox" class="check-group" data-group-id="<?= $safeId ?>">
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
                                                    <button type="button" class="btn btn-sm btn-dark" data-toggle="modal" data-target="#qrCodeModal" data-nome="<?= $grupo['nome_usuario'] ?>" data-valor="<?= $grupo['total'] ?>" data-chave="<?= $grupo['pix'] ?>" title="Pagar com QR Code">
                                                        <i class="fas fa-qrcode"></i> Pagar PIX
                                                    </button>
                                                    <button type="button" class="btn btn-sm btn-info mt-1" data-toggle="collapse" data-target=".details-<?= $safeId ?>">
                                                        <i class="fas fa-eye"></i> Ver Detalhes
                                                    </button>
                                                </td>
                                            </tr>

                                            <?php foreach ($grupo['despesas'] as $p) : ?>
                                                <tr class="collapse details-<?= $safeId ?>">
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

    <div class="modal fade" id="qrCodeModal" tabindex="-1" role="dialog">
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

                    <img id="qrCodeImage" src="" alt="QR Code PIX" class="img-fluid">

                    <p class="mt-3 small text-muted">Após o pagamento, as despesas serão marcadas como pagas na préxima atualização da página.
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


            // Dentro de $(document).ready(function() { ... });

            $('#qrCodeModal').on('show.bs.modal', function(event) {
                var button = $(event.relatedTarget); // Botão que acionou o modal

                // Extrai as informações dos atributos data-*
                var nome = button.data('nome');
                var valor = button.data('valor');
                var chave = button.data('chave');
                var cidade = button.data('cidade') || 'NIVEL3 TI';

                var modal = $(this);

                // Atualiza o conteúdo do modal
                modal.find('#qr-nome-beneficiario').text('Beneficiário: ' + nome);
                modal.find('#qr-valor-pagamento').text('R$ ' + parseFloat(valor).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                }));

                // Monta a URL para o script gerador e atualiza a imagem
                // Usamos encodeURIComponent para garantir que caracteres especiais na chave ou nome não quebrem a URL
                var qrUrl = 'gerar_qrcodepix.php?chave=' + encodeURIComponent(chave) +
                    '&valor=' + valor +
                    '&nome=' + encodeURIComponent(nome) +
                    '&cidade=' + encodeURIComponent(cidade);

                modal.find('#qrCodeImage').attr('src', qrUrl);

            });
        });
    </script>
</body>

</html>