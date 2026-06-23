<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// Proteção de Acesso e Permissão
if ($m9_02 < 3) {
    header("Location: ../home.php");
    exit;
}
// if (!isset($_SESSION['allterusN3Id'])) {
//     header("Location: ../index.php");
//     exit;
// }

$pdo = ConnectionN3rd();
if (!$pdo) {
    exit("Erro ao conectar ao banco de dados.");
}


// Bloco de Processamento de ação de add_categoria
if (isset($_POST['action']) && $_POST['action'] === 'add_categoria') {
    $categories = filter_input(INPUT_POST, 'categories');
    $description = filter_input(INPUT_POST, 'description');
    $status = filter_input(INPUT_POST, 'status', FILTER_VALIDATE_INT);
    if ($categories && in_array($status, [0, 1])) {
        $sql = "INSERT INTO category (categories, description, status, date_created) VALUES (:categories, :description, :status, NOW())";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':categories', $categories, PDO::PARAM_STR);
        $stmt->bindParam(':description', $description, PDO::PARAM_STR);
        $stmt->bindParam(':status', $status, PDO::PARAM_INT);
        $stmt->execute();
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Categoria adicionada com sucesso!'];
        header("Location: ../logistica/gestaoDadosRD.php?tab=categorias");
        exit;
    }
}

// Bloco de Processamento de ação de edit_categoria
if (isset($_POST['action']) && $_POST['action'] === 'edit_categoria') {
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    $categories = filter_input(INPUT_POST, 'categories');
    $description = filter_input(INPUT_POST, 'description');
    $status = filter_input(INPUT_POST, 'status', FILTER_VALIDATE_INT);
    if ($id && $categories && in_array($status, [0, 1])) {
        $sql = "UPDATE category SET categories = :categories, description = :description, status = :status WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->bindParam(':categories', $categories, PDO::PARAM_STR);
        $stmt->bindParam(':description', $description, PDO::PARAM_STR);
        $stmt->bindParam(':status', $status, PDO::PARAM_INT);
        $stmt->execute();
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Categoria atualizada com sucesso!'];
        header("Location: ../logistica/gestaoDadosRD.php?tab=categorias");
        exit;
    }
}


// Bloco de Processamento de ação de delete_categoria
if (isset($_POST['action']) && $_POST['action'] === 'delete_categoria') {
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    if ($id) {
        $sql = "DELETE FROM category WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Categoria excluida com sucesso!'];
        header("Location: ../logistica/gestaoDadosRD.php?tab=categorias");
        exit;
    }
}

// Bloco de Processamento de ação de add_cliente
if (isset($_POST['action']) && $_POST['action'] === 'add_cliente') {
    $nome = filter_input(INPUT_POST, 'nome');
    $status = filter_input(INPUT_POST, 'status', FILTER_VALIDATE_INT);
    if ($nome && in_array($status, [0, 1])) {
        $sql = "INSERT INTO clientes (nome, status) VALUES (:nome, :status)";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':nome', $nome, PDO::PARAM_STR);
        $stmt->bindParam(':status', $status, PDO::PARAM_INT);
        $stmt->execute();
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Cliente adicionado com sucesso!'];
        header("Location: ../logistica/gestaoDadosRD.php?tab=clientes");
        exit;
    }
}

//bloco de processamento de editar cliente
if (isset($_POST['action']) && $_POST['action'] === 'edit_cliente') {
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    $nome = filter_input(INPUT_POST, 'nome');
    $status = filter_input(INPUT_POST, 'status', FILTER_VALIDATE_INT);
    if ($id && $nome && in_array($status, [0, 1])) {
        $sql = "UPDATE clientes SET nome = :nome, status = :status WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->bindParam(':nome', $nome, PDO::PARAM_STR);
        $stmt->bindParam(':status', $status, PDO::PARAM_INT);
        $stmt->execute();
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Cliente atualizado com sucesso!'];
        header("Location: ../logistica/gestaoDadosRD.php?tab=clientes");
        exit;
    }
}

// Bloco de Processamento de ação de delete_cliente
if (isset($_POST['action']) && $_POST['action'] === 'delete_cliente') {
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    if ($id) {
        $sql = "DELETE FROM clientes WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Cliente excluido com sucesso!'];
        header("Location: ../logistica/gestaoDadosRD.php?tab=clientes");
        exit;
    }
}


// Carrega os dados para exibição da página
$stmt_cat = $pdo->query("SELECT * FROM category ORDER BY categories ASC");
$categorias = $stmt_cat->fetchAll(PDO::FETCH_ASSOC);

$stmt_cli = $pdo->query("SELECT * FROM clientes ORDER BY nome ASC");
$clientes = $stmt_cli->fetchAll(PDO::FETCH_ASSOC);

$active_tab = $_GET['tab'] ?? 'categorias';


?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8" />
    <title>Gestão de Dados RD</title>
    <link rel="stylesheet" href="../css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
    <style>
        body {
            zoom: 0.9;
            overflow-x: hidden;
            width: 100%;
        }

        .card-body {
            overflow: auto;
            max-height: calc(100vh - 80px);
        }

        .table-responsive {
            margin-left: 15%;
            width: 60%;
        }

        .table td,
        .table th {
            /* padding: vertical horizontal; */
            padding: 0.1rem 0.7rem;
            vertical-align: middle;
        }

        .auto-fade-alert {
            animation: fadeOut 5s ease-in-out;
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid mt-2">

        <?php
        if (isset($_SESSION['alert_message'])) {
            $alert = $_SESSION['alert_message'];
            echo "<div class='alert alert-{$alert['type']} auto-fade-alert'>{$alert['text']}</div>";
            unset($_SESSION['alert_message']);
        }
        ?>

        <div class="card mt-2">
            <div class="card-header">
                <div class="d-flex align-items-center">
                    <h4 class="m-0 font-weight-bold">Gestão de Cadastros</h4>
                    <a href="gestaoRD.php" class="ml-4"><i class="fas fa-home" style="font-size: 25px;" data-toggle="tooltip" title="Home RD"></i></a>
                </div>
            </div>
            <div class="card-body p-0">
                <ul class="nav nav-tabs" id="myTab" role="tablist">
                    <li class="nav-item">
                        <a class="nav-link <?= ($active_tab === 'categorias') ? 'active' : '' ?>" id="categorias-tab" data-toggle="tab" href="#tab-categorias" role="tab"><i class="fas fa-tags"></i> Categorias</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link <?= ($active_tab === 'clientes') ? 'active' : '' ?>" id="clientes-tab" data-toggle="tab" href="#tab-clientes" role="tab"><i class="fas fa-users"></i> Clientes</a>
                    </li>
                </ul>
                <div class="tab-content p-3" id="myTabContent">
                    <div class="tab-pane fade <?= ($active_tab === 'categorias') ? 'show active' : '' ?>" id="tab-categorias" role="tabpanel">
                        <div class="d-flex justify-content-end mb-2">
                            <button type="button" class="btn btn-success btn-sm" data-toggle="modal" data-target="#modalAddCategoria"><i class="fas fa-plus"></i> Nova Categoria</button>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-sm table-bordered table-striped" width="100%">
                                <thead class="thead-light">
                                    <tr>
                                        <th>ID</th>
                                        <th>Nome</th>
                                        <th>Descrição</th>
                                        <th class="text-center">Status</th>
                                        <th class="text-center" style="width: 100px;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($categorias as $cat) : ?>
                                        <tr>
                                            <td><?= $cat['id'] ?></td>
                                            <td><?= htmlspecialchars($cat['categories']) ?></td>
                                            <td><?= htmlspecialchars($cat['description']) ?></td>
                                            <td class="text-center"><?= $cat['status'] == 1 ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-danger">Inativo</span>' ?></td>
                                            <td class="text-center">
                                                <button type="button" class="btn btn-warning btn-sm btn-edit-categoria" data-toggle="modal" data-target="#modalEditCategoria" data-id="<?= $cat['id'] ?>" data-nome="<?= htmlspecialchars($cat['categories']) ?>" data-descricao="<?= htmlspecialchars($cat['description']) ?>" data-status="<?= $cat['status'] ?>" title="Editar"><i class="fas fa-edit"></i></button>
                                                <!-- <button type="button" class="btn btn-danger btn-sm btn-delete-categoria" data-toggle="modal" data-target="#modalDeleteCategoria" data-id="<?= $cat['id'] ?>" title="Excluir"><i class="fas fa-trash-alt"></i></button> -->
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="tab-pane fade <?= ($active_tab === 'clientes') ? 'show active' : '' ?>" id="tab-clientes" role="tabpanel">
                        <div class="d-flex justify-content-end mb-2">
                            <button type="button" class="btn btn-success btn-sm" data-toggle="modal" data-target="#modalAddCliente"><i class="fas fa-plus"></i> Novo Cliente</button>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-sm table-bordered table-striped" width="100%">
                                <thead class="thead-light">
                                    <tr>
                                        <th>ID</th>
                                        <th>Nome do Cliente</th>
                                        <th class="text-center">Status</th>
                                        <th class="text-center" style="width: 100px;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($clientes as $cli) : ?>
                                        <tr>
                                            <td><?= $cli['id'] ?></td>
                                            <td><?= htmlspecialchars($cli['nome']) ?></td>
                                            <td class="text-center"><?= $cli['status'] == 1 ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-danger">Inativo</span>' ?></td>
                                            <td class="text-center">
                                                <button type="button" class="btn btn-warning btn-sm btn-edit-cliente" data-toggle="modal" data-target="#modalEditCliente" data-id="<?= $cli['id'] ?>" data-nome="<?= htmlspecialchars($cli['nome']) ?>" data-status="<?= $cli['status'] ?>" title="Editar"><i class="fas fa-edit"></i></button>
                                                <!-- <button type="button" class="btn btn-danger btn-sm btn-delete-cliente" data-toggle="modal" data-target="#modalDeleteCliente" data-id="<?= $cli['id'] ?>" title="Excluir"><i class="fas fa-trash-alt"></i></button> -->
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Add Categoria -->
    <div class="modal fade" id="modalAddCategoria" tabindex="-1">
        <div class="modal-dialog">
            <form class="modal-content" action="" method="POST"><input type="hidden" name="action" value="add_categoria">
                <div class="modal-header">
                    <h5 class="modal-title">Adicionar Categoria</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group"><label>Nome</label><input type="text" class="form-control form-control-sm" name="categories" required></div>
                    <div class="form-group"><label>Descrição</label><textarea class="form-control form-control-sm" name="description" rows="3"></textarea></div>
                    <div class="form-group"><label>Status</label><select class="form-control form-control-sm" name="status">
                            <option value="1" selected>Ativo</option>
                            <option value="0">Inativo</option>
                        </select></div>
                </div>
                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Adicionar</button></div>
            </form>
        </div>
    </div>

    <!-- Modal Editar Categoria -->
    <div class="modal fade" id="modalEditCategoria" tabindex="-1">
        <div class="modal-dialog">
            <form class="modal-content" action="" method="POST"><input type="hidden" name="action" value="edit_categoria"><input type="hidden" name="id" id="edit_cat_id">
                <div class="modal-header">
                    <h5 class="modal-title">Editar Categoria</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group"><label>Nome</label><input type="text" class="form-control form-control-sm" id="edit_cat_nome" name="categories" required></div>
                    <div class="form-group"><label>Descrição</label><textarea class="form-control form-control-sm" id="edit_cat_desc" name="description" rows="3"></textarea></div>
                    <div class="form-group"><label>Status</label><select class="form-control form-control-sm" id="edit_cat_status" name="status">
                            <option value="1">Ativo</option>
                            <option value="0">Inativo</option>
                        </select></div>
                </div>
                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Salvar</button></div>
            </form>
        </div>
    </div>

    <!-- Modal Excluir Categoria -->
    <div class="modal fade" id="modalDeleteCategoria" tabindex="-1">
        <div class="modal-dialog modal-sm">
            <form class="modal-content" action="" method="POST"><input type="hidden" name="action" value="delete_categoria"><input type="hidden" name="id" id="delete_cat_id">
                <div class="modal-header">
                    <h5 class="modal-title">Excluir Categoria</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">Tem certeza?</div>
                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-danger">Excluir</button></div>
            </form>
        </div>
    </div>

    <!-- Modal Add Cliente -->
    <div class="modal fade" id="modalAddCliente" tabindex="-1">
        <div class="modal-dialog">
            <form class="modal-content" action="" method="POST"><input type="hidden" name="action" value="add_cliente">
                <div class="modal-header">
                    <h5 class="modal-title">Adicionar Cliente</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group"><label>Nome do Cliente</label><input type="text" class="form-control form-control-sm" name="nome" required></div>
                    <div class="form-group"><label>Status</label><select class="form-control form-control-sm" name="status">
                            <option value="1" selected>Ativo</option>
                            <option value="0">Inativo</option>
                        </select></div>
                </div>
                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Adicionar</button></div>
            </form>
        </div>
    </div>

    <!-- Modal Editar Cliente -->
    <div class="modal fade" id="modalEditCliente" tabindex="-1">
        <div class="modal-dialog">
            <form class="modal-content" action="" method="POST"><input type="hidden" name="action" value="edit_cliente"><input type="hidden" name="id" id="edit_cli_id">
                <div class="modal-header">
                    <h5 class="modal-title">Editar Cliente</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group"><label>Nome do Cliente</label><input type="text" class="form-control form-control-sm" id="edit_cli_nome" name="nome" required></div>
                    <div class="form-group"><label>Status</label><select class="form-control form-control-sm" id="edit_cli_status" name="status">
                            <option value="1">Ativo</option>
                            <option value="0">Inativo</option>
                        </select></div>
                </div>
                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Salvar</button></div>
            </form>
        </div>
    </div>

    <!-- Modal Excluir Cliente -->
    <div class="modal fade" id="modalDeleteCliente" tabindex="-1">
        <div class="modal-dialog modal-sm">
            <form class="modal-content" action="" method="POST"><input type="hidden" name="action" value="delete_cliente"><input type="hidden" name="id" id="delete_cli_id">
                <div class="modal-header">
                    <h5 class="modal-title">Excluir Cliente</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">Tem certeza?</div>
                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-danger">Excluir</button></div>
            </form>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <script>
        $(document).ready(function() {
            $('.auto-fade-alert').delay(3000).fadeOut(500, function() {
                $(this).remove();
            });

            $('.btn-edit-categoria').on('click', function() {
                $('#edit_cat_id').val($(this).data('id'));
                $('#edit_cat_nome').val($(this).data('nome'));
                $('#edit_cat_desc').val($(this).data('descricao'));
                $('#edit_cat_status').val($(this).data('status'));
            });
            $('.btn-delete-categoria').on('click', function() {
                $('#delete_cat_id').val($(this).data('id'));
            });
            $('.btn-edit-cliente').on('click', function() {
                $('#edit_cli_id').val($(this).data('id'));
                $('#edit_cli_nome').val($(this).data('nome'));
                $('#edit_cli_status').val($(this).data('status'));
            });
            $('.btn-delete-cliente').on('click', function() {
                $('#delete_cli_id').val($(this).data('id'));
            });
        });
    </script>
</body>

</html>