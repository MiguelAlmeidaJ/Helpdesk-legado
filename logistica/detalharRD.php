<?php
// ARQUIVO ATUALIZADO NOVO FINANCEIRO

session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m9_02 < 2) {
    header("Location: ../home.php");
    exit;
}


$pdo = connectionN3();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

// Usuário logado
$user_id = (int)$_SESSION['allterusN3Id'];
$usuarioStmt = $pdo->prepare("SELECT * FROM usuarios WHERE user_id = :user_id");
$usuarioStmt->execute([':user_id' => $user_id]);
$usuario = $usuarioStmt->fetch(PDO::FETCH_ASSOC);


// Captura dos filtros
$dataInicio = $_GET['date_start'] ?? $_GET['data_inicio'] ?? date('Y-m-01');
$dataFim = $_GET['date_end'] ?? $_GET['data_fim'] ?? date('Y-m-t');
$user_id_filter = $_GET['user_id'] ?? null;
// MUDANÇA: Captura do filtro de cliente pelo nome
$cliente_nome_filter = $_GET['cliente_nome'] ?? null;
// Captura do filtro de categoria (checkboxes)
$category_id_filter = $_GET['category_id'] ?? [];
if (!is_array($category_id_filter)) {
    $category_id_filter = [$category_id_filter];
}
$category_id_filter = array_values(array_filter(array_map('intval', $category_id_filter)));


// Lógica de construção da query SQL
$params = [
    ':dataInicio' => $dataInicio,
    ':dataFim' => $dataFim
];
$filtroSQL = "";

// if ($usuario['type'] == 0) {
// OSVALDO/CLERIO/CLERISTOM
if ($usuario['user_id'] != 3 && $usuario['user_id'] != 4 && $usuario['user_id'] != 96) {
    $filtroSQL .= " AND r.user_id = :user_id_logado ";
    $params[':user_id_logado'] = $usuario['user_id'];
} else {
    if (!empty($user_id_filter)) {

        $filtroSQL .= " AND r.user_id = :user_id_filter ";
        $params[':user_id_filter'] = $user_id_filter;
    }
    // MUDANÇA: Lógica de filtro corrigida para a coluna r.cliente
    if (!empty($cliente_nome_filter)) {
        $filtroSQL .= " AND r.cliente = :cliente_nome_filter ";
        $params[':cliente_nome_filter'] = $cliente_nome_filter;
    }
}

// Filtro de categoria (aplica para todos)
if (!empty($category_id_filter)) {
    $placeholders = [];
    foreach ($category_id_filter as $idx => $catId) {
        $placeholder = ":category_id_$idx";
        $placeholders[] = $placeholder;
        $params[$placeholder] = $catId;
    }
    $filtroSQL .= " AND r.category_id IN (" . implode(',', $placeholders) . ") ";
}

$queryString = $_SERVER['QUERY_STRING'];

// Consulta SQL principal
$sql = "
    SELECT
        r.id, r.date_created, r.date_updated, r.remarks, r.amount, r.cliente,
        u.user_nome,
        cs.nome AS categories
    FROM running_balance r
    JOIN usuarios u ON u.user_id = r.user_id
    LEFT JOIN categorias_subgrupo cs ON cs.id = r.category_id 
    WHERE r.status = 4 AND r.aj = 1
    AND DATE(r.date_created) BETWEEN :dataInicio AND :dataFim
    $filtroSQL
    ORDER BY r.date_created ASC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);


$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

$total = array_sum(array_column($results, 'amount'));

// Queries para popular os dropdowns de filtro
$users = $pdo->query("SELECT user_id, user_nome FROM usuarios WHERE user_sts = 1 ORDER BY user_nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$clientes = $pdo->query("SELECT clt_id, clt_nomef AS nome FROM clientes GROUP BY nome ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$categorias_filtro = $pdo->query("SELECT MIN(id) AS id, nome FROM categorias_subgrupo WHERE aplicavel = 'RD' GROUP BY nome ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$category_label = empty($category_id_filter) ? 'Selecione' : count($category_id_filter) . ' selecionada(s)';

?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css" />
    <link rel="stylesheet" href="../fontawesome/css/all.css" />
    <link rel="stylesheet" href="https://cdn.datatables.net/1.10.25/css/dataTables.bootstrap4.min.css" />
    <link rel="stylesheet" href="https://cdn.datatables.net/buttons/1.7.1/css/buttons.bootstrap4.min.css" />
    <title>Relatório de Pagamentos</title>
    <link rel="stylesheet" href="css/detalhar_rd_modern.css" />
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid mt-2 detalhar-rd-page">
        <div class="row">
            <div class="col-12">
                <div class="card detalhar-rd-main-card">
            <div class="card-header py-2 no-print detalhar-rd-toolbar">
                <div class="d-flex align-items-center">
                    <h4 class="m-0 font-weight-bold detalhar-rd-title">Relatório de Pagamentos</h4>
                    <a href="gestaoRD.php" class="ml-4 detalhar-rd-home-link"><i class="fas fa-home" data-toggle="tooltip" title="Home RD"></i></a>
                </div>

            </div>
            <div class="card-body detalhar-rd-body">
                <form method="GET" id="filter-form" class="detalhar-rd-filter-card no-print">
                    <div class="row align-items-end">
                        <div class="col-md-2">
                            <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-2">
                                    <label class="small mb-1">De:</label>
                                    <input type="date" name="date_start" class="form-control form-control-sm" value="<?= htmlspecialchars($dataInicio) ?>" />
                                </div>
                            </div>

                            <div class="col-md-6">
                                <div class="form-group mb-2">
                                    <label class="small mb-1">Até:</label>
                                    <input type="date" name="date_end" class="form-control form-control-sm" value="<?= htmlspecialchars($dataFim) ?>" />
                                </div>
                            </div>
                            </div>
                        </div>

                        <div class="col-md-2">
                            <div class="form-group mb-2">
                                <label class="small mb-1">Cliente:</label>
                                <select name="cliente_nome" class="form-control form-control-sm">
                                    <option value="">Todos</option>
                                    <?php foreach ($clientes as $cliente) :
                                        $nomeCliente = htmlspecialchars($cliente['nome']);
                                        $selected = ($cliente_nome_filter == $nomeCliente) ? 'selected' : '';
                                        echo "<option value=\"$nomeCliente\" $selected>$nomeCliente</option>";
                                    endforeach; ?>
                                </select>
                            </div>
                        </div>

                        <div class="col-md-2">
                            <div class="form-group mb-2">
                                <label class="small mb-1">Colaborador:</label>
                                <select name="user_id" class="form-control form-control-sm dropdown">
                                    <option value="">Todos</option>
                                    <?php foreach ($users as $user) : ?>
                                        <option value="<?= $user['user_id'] ?>" <?= ($user_id_filter == $user['user_id']) ? 'selected' : '' ?>>
                                            <?= htmlspecialchars($user['user_nome']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>

                        <!-- <div class="col-md-2">
                            <div class="form-group mb-2">
                                <label class="small mb-1">Categoria:</label>
                                <div class="dropdown no-print">
                                    <div class="form-control form-control-sm d-flex align-items-center justify-content-between" role="button" id="categoryDropdown" style="cursor: pointer;">
                                        <span class="text-truncate"><?= htmlspecialchars($category_label) ?></span>
                                        <i class="fas fa-caret-down ml-1 small text-muted"></i>
                                    </div>
                                    <div class="dropdown-menu shadow-sm detalhar-rd-category-menu" aria-labelledby="categoryDropdown">
                                        <div class="form-check border-bottom mb-2 pb-1">
                                            <input class="form-check-input" type="checkbox" id="cat_select_all">
                                            <label class="form-check-label " for="cat_select_all">Selecionar todas</label>
                                        </div>
                                        <?php foreach ($categorias_filtro as $categoria) :
                                            $categoriaId = (int)$categoria['id'];
                                            $categoriaNome = htmlspecialchars($categoria['nome']);
                                            $checked = in_array($categoriaId, $category_id_filter, true) ? 'checked' : '';
                                        ?>
                                            <div class="form-check py-1">
                                                <input class="form-check-input" type="checkbox" name="category_id[]" value="<?= $categoriaId ?>" id="cat_<?= $categoriaId ?>" <?= $checked ?>>
                                                <label class="form-check-label small" for="cat_<?= $categoriaId ?>"><?= $categoriaNome ?></label>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>
                        </div> -->

                        <div class="col-md-2">
                            <div class="form-group mb-2">
                                <label class="small mb-1">Categoria:</label>
                                <div class="dropdown no-print">
                                    <div class="form-control-sm" role="button" id="categoryDropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                        <span class="text-truncate"><?= htmlspecialchars($category_label) ?></span>
                                    </div>

                                    <div class="dropdown-menu shadow-sm detalhar-rd-category-menu" aria-labelledby="categoryDropdown">
                                        <div class="form-check border-bottom mb-2 pb-1">
                                            <input class="form-check-input" type="checkbox" id="cat_select_all">
                                            <label class="form-check-label" for="cat_select_all">Selecionar todas</label>
                                        </div>
                                        <?php foreach ($categorias_filtro as $categoria) :
                                            $categoriaId = (int)$categoria['id'];
                                            $categoriaNome = htmlspecialchars($categoria['nome']);
                                            $checked = in_array($categoriaId, $category_id_filter, true) ? 'checked' : '';
                                        ?>
                                            <div class="form-check py-1">
                                                <input class="form-check-input" type="checkbox" name="category_id[]" value="<?= $categoriaId ?>" id="cat_<?= $categoriaId ?>" <?= $checked ?>>
                                                <label class="form-check-label small" for="cat_<?= $categoriaId ?>"><?= $categoriaNome ?></label>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-4">
                            <div class="form-group detalhar-rd-actions mb-2">
                                <button type="submit" class="btn btn-primary btn-sm no-print detalhar-rd-btn"><i class="fa fa-filter"></i> Filtrar</button>
                                <a href="detalharRD.php" class="btn btn-secondary btn-sm no-print detalhar-rd-btn">Limpar</a>
                                <div id="botoes-datatable" class="detalhar-rd-export-actions"></div>
                                <a href="gerarPDF.php?<?= $_SERVER['QUERY_STRING'] ?>" target="_blank" class="btn btn-danger btn-sm no-print detalhar-rd-btn">
                                    <i class="fas fa-file-pdf"></i> Gerar PDF
                                </a>
                            </div>
                        </div>

                    </div>
                </form>
            </div>


            <div id="printable" class="detalhar-rd-report">
                <div class="text-center detalhar-rd-report-title">
                    <h5>
                        <b>Relatório de Pagamentos</b> - Período de <b><?= date("d/m/Y", strtotime($dataInicio)) ?></b> a <b><?= date("d/m/Y", strtotime($dataFim)) ?></b>
                    </h5>
                </div>

                <?php
                if (isset($_SESSION['alert_message'])) {
                    $alert = $_SESSION['alert_message'];
                    echo "<div class='alert alert-{$alert['type']} auto-fade-alert'>{$alert['text']}</div>";
                    unset($_SESSION['alert_message']);
                }
                ?>

                <div class="tabela table-responsive p-2 detalhar-rd-table-wrap">
                    <table class="table table-bordered table-hover" id="dataTable" width="100%" cellspacing="0">
                        <thead class="thead-light">
                            <tr>
                                <th style="width: 10px;">#</th>
                                <th style="width: 20px;">ID</th>
                                <th style="width: 60px;">Data</th>
                                <th style="width: 100px;">Nome</th>
                                <th style="width: 80px;">Categoria</th>
                                <th style="width: 120px;">Cliente</th>
                                <th style="width: 150px;">Observações</th>
                                <th class="text-right" style="width: 150px;">Valor</th>

                            </tr>
                        </thead>
                        <tbody>
                            <?php if (count($results) === 0) : ?>
                                <tr>
                                    <td colspan="8" class="text-center detalhar-rd-empty">Nenhum resultado encontrado.</td>
                                </tr>
                                <?php else : $i = 1;
                                foreach ($results as $row) : ?>

                                    <tr class="linha-clicavel" data-id="<?= $row['id'] ?>">

                                        <td class="text-center"><?= $i++ ?></td>
                                        <td class="text-center"><?= $row['id'] ?></td>
                                        <td><?= date("d/m/Y", strtotime($row['date_updated'])) ?></td>
                                        <td><?= htmlspecialchars($row['user_nome']) ?></td>
                                        <td><?= htmlspecialchars($row['categories']) ?></td>
                                        <td><?= htmlspecialchars($row['cliente']) ?></td>
                                        <td><?= $row['remarks'] ?></td>
                                        <td class="text-right" data-order="<?= $row['amount'] ?>">
                                            R$ <?= number_format($row['amount'], 2, ',', '.') ?>
                                        </td>
                                    </tr>
                            <?php endforeach;
                            endif; ?>
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="7" class="text-right">Total Geral</th>
                                <th class="text-right">R$ <?= number_format($total, 2, ',', '.') ?></th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
                </div>
            </div>
        </div>
    </div>
    </div>

    <!-- Modal para editar despesa -->
    <div class="modal fade detalhar-rd-modal" id="editModal" tabindex="-1" role="dialog" aria-labelledby="editModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <form class="modal-content" action="editarRDAdm.php" method="POST" enctype="multipart/form-data">
                <div class="modal-header">
                    <h5 class="modal-title text-primary" id="editModalLabel"><i class="fas fa-edit text-primary"></i> Edição de Despesa pela Gestão</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>

                <div class="modal-body mb-0">

                    <input type="hidden" name="id" id="edit_id">
                    <input type="hidden" name="user_id" value="<?= htmlspecialchars($user_id) ?>">
                    <input type="hidden" name="return_url" value="<?= htmlspecialchars($queryString) ?>">

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
                                $categorias = $pdo->query("SELECT id, nome FROM categorias_subgrupo where aplicavel = 'RD' ORDER BY nome");
                                foreach ($categorias as $categoria) {
                                    $id = htmlspecialchars($categoria['id']);
                                    $nome = htmlspecialchars($categoria['nome']);
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
                        <select class="form-control" id="edit_cliente_id" name="clt_id" required>
                            <option value="">Selecione...</option>
                            <?php
                            foreach ($clientes as $cliente) {
                                $clienteId = htmlspecialchars($cliente['clt_id']);
                                $nomeCliente = htmlspecialchars($cliente['nome']);
                                echo "<option value=\"$clienteId\">$nomeCliente</option>";
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
                                <button type="button" class="btn btn-sm btn-info mt-2 " id="btnUpload_edit">Anexar</button>
                            </div>
                        </div>
                        <div id="uploadStatus_edit" class="small"></div>
                    </div>
                </div>

                <div class="modal-footer mt-0">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                </div>
            </form>
        </div>
    </div>



    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.10.25/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.10.25/js/dataTables.bootstrap4.min.js"></script>

    <script src="https://cdn.datatables.net/buttons/1.7.1/js/dataTables.buttons.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/1.7.1/js/buttons.bootstrap4.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/1.7.1/js/buttons.html5.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/1.7.1/js/buttons.print.min.js"></script>

    <script>
        $(document).ready(function() {
            var table = $('#dataTable').DataTable({
                language: {
                    url: "https://cdn.datatables.net/plug-ins/1.10.25/i18n/Portuguese-Brasil.json"
                },
                order: [
                    [1, 'asc']
                ],
                paging: true,
                pageLength: 10,
                lengthChange: false,
                searching: false,
                pagingType: 'simple_numbers',
                dom: 'rt<"detalhar-rd-pagination-row row align-items-center"<"col-sm-6"i><"col-sm-6"p>>'
            });

            new $.fn.dataTable.Buttons(table, {
                buttons: [{
                    extend: 'print',
                    text: '<i class="fa fa-print"></i> Imprimir',
                    className: 'btn btn-secondary btn-sm detalhar-rd-btn',
                    title: 'Relatório de Pagamentos',
                    exportOptions: {
                        columns: ':visible'
                    }
                }, {
                    extend: 'excelHtml5',
                    text: '<i class="fa fa-file-excel"></i> Exportar',
                    className: 'btn btn-success btn-sm detalhar-rd-btn',
                    title: 'Relatorio_Pagamentos'
                }]
            });

            table.buttons(0, null).container().appendTo('#botoes-datatable');

        });
    </script>

    <script>
        $(document).ready(function() {
            $('#dataTable tbody').on('dblclick', 'tr.linha-clicavel', function() {
                var recordId = $(this).data('id');
                if (!recordId) return;


                $('#editModal form')[0].reset();

                $.ajax({
                    url: 'buscarRD.php',
                    type: 'POST',
                    data: {
                        id: recordId
                    },
                    dataType: 'json',
                    success: function(response) {
                        if (response.success) {
                            var data = response.data;
                            $('#edit_id').val(data.id);
                            $('#edit_cliente_id').val(data.clt_id);
                            $('#edit_remarks').val(data.remarks);
                            $('#edit_amount').val(data.amount);
                            $('#edit_category_id').val(data.category_id);
                            $('#edit_pix_type').val(data.pix_type);
                            $('#edit_chavepix').val(data.pix);

                            $('#editModal').modal('show');
                        } else {
                            alert('Erro ao buscar dados: ' + response.message);
                        }
                    },
                    error: function() {
                        alert('Erro de comunicação. Tente novamente.');
                    }
                });
            });
        });
    </script>

    <script>
        $('.auto-fade-alert').delay(3000).fadeOut(500, function() {
            $(this).remove();
        });
    </script>

    <script>
        $(document).ready(function() {
            var $dropdown = $('#categoryDropdown');
            var $menu = $dropdown.next('.dropdown-menu');
            var $menuParent = $menu.parent();

            function openMenu() {
                var offset = $dropdown.offset();
                var height = $dropdown.outerHeight();
                var width = $dropdown.outerWidth();
                $menu.appendTo('body');
                $menu.css({
                    position: 'absolute',
                    top: (offset.top + height + 12) + 'px',
                    left: offset.left + 'px',
                    width: width + 'px',
                    display: 'block'
                });

                $menu.addClass('show');
                $dropdown.attr('aria-expanded', 'true');
            }

            function closeMenu() {
                $menu.removeClass('show');
                $menu.css({
                    position: '',
                    top: '',
                    left: '',
                    width: '',
                    display: ''
                });
                $menu.appendTo($menuParent);
                $dropdown.attr('aria-expanded', 'false');
            }

            $dropdown.on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var isOpen = $menu.hasClass('show');
                $('.dropdown-menu.show').removeClass('show').hide();
                if (!isOpen) {
                    openMenu();
                } else {
                    closeMenu();
                }
            });

            // Permite clicar dentro do menu sem fechar
            $menu.on('click', function(e) {
                e.stopPropagation();
            });

            // Fecha apenas ao clicar fora
            $(document).on('click', function(e) {
                if (!$(e.target).closest('#categoryDropdown, .dropdown-menu').length) {
                    closeMenu();
                }
            });

            $(window).on('resize scroll', function() {
                if ($menu.hasClass('show')) {
                    openMenu();
                }
            });

            // Selecionar todos
            var $selectAll = $('#cat_select_all');

            function syncSelectAll() {
                var total = $menu.find('input[name="category_id[]"]').length;
                var checked = $menu.find('input[name="category_id[]"]:checked').length;
                $selectAll.prop('checked', total > 0 && checked === total);
            }
            $selectAll.on('change', function() {
                var checked = $(this).is(':checked');
                $menu.find('input[name="category_id[]"]').prop('checked', checked);
            });
            $menu.on('change', 'input[name="category_id[]"]', function() {
                syncSelectAll();
            });
            syncSelectAll();
        });
    </script>

</body>

</html>