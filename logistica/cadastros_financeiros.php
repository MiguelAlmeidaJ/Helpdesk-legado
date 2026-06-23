<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// if ($m9_04 < 2) { header("Location: ../home.php"); exit; }

$pdo = ConnectionN3();
if (!$pdo) {
    exit("Erro ao conectar ao banco de dados.");
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$tabRedirect = $_GET['tab'] ?? $_POST['tabRedirect'] ?? 'grupos';

try {
    // --- ALTERAR STATUS ---
    if ($action === 'toggle_status') {
        $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
        $tabela = filter_input(INPUT_POST, 'tabela');
        $tabelasPermitidas = ['categorias_grupo', 'categorias_subgrupo', 'categorias_classificacao', 'categorias_tipo_documento', 'cads_forma_pag', 'agenciasbancarias'];

        if ($id && in_array($tabela, $tabelasPermitidas)) {
            $stmt = $pdo->prepare("UPDATE `$tabela` SET `status` = 1 - `status` WHERE id = ?");
            $stmt->execute([$id]);
            $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Status alterado com sucesso!'];
        } else {
            $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao alterar o status.'];
        }
    }
    // --- GRUPOS ---
    if ($action === 'add_grupo') {
        $stmt = $pdo->prepare("INSERT INTO categorias_grupo (nome) VALUES (?)");
        $stmt->execute([$_POST['nome']]);
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Grupo adicionado com sucesso!'];
    }
    if ($action === 'edit_grupo') {
        $stmt = $pdo->prepare("UPDATE categorias_grupo SET nome = ? WHERE id = ?");
        $stmt->execute([$_POST['nome'], $_POST['id']]);
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Grupo atualizado com sucesso!'];
    }

    // --- SUBGRUPOS ---
    if ($action === 'add_subgrupo') {
        $stmt = $pdo->prepare("INSERT INTO categorias_subgrupo (nome, id_grupo) VALUES (?, ?)");
        $stmt->execute([$_POST['nome'], $_POST['id_grupo']]);
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Subgrupo adicionado com sucesso!'];
    }
    if ($action === 'edit_subgrupo') {
        $stmt = $pdo->prepare("UPDATE categorias_subgrupo SET nome = ?, id_grupo = ? WHERE id = ?");
        $stmt->execute([$_POST['nome'], $_POST['id_grupo'], $_POST['id']]);
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Subgrupo atualizado com sucesso!'];
    }

    // --- CLASSIFICAÇÕES ---
    if ($action === 'add_classificacao') {
        $stmt = $pdo->prepare("INSERT INTO categorias_classificacao (nome) VALUES (?)");
        $stmt->execute([$_POST['nome']]);
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Classificação adicionada com sucesso!'];
    }
    if ($action === 'edit_classificacao') {
        $stmt = $pdo->prepare("UPDATE categorias_classificacao SET nome = ? WHERE id = ?");
        $stmt->execute([$_POST['nome'], $_POST['id']]);
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Classificação atualizada com sucesso!'];
    }

    // --- TIPOS DE DOCUMENTO ---
    if ($action === 'add_tipo_documento') {
        $stmt = $pdo->prepare("INSERT INTO categorias_tipo_documento (nome) VALUES (?)");
        $stmt->execute([$_POST['nome']]);
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Tipo de Documento adicionado com sucesso!'];
    }
    if ($action === 'edit_tipo_documento') {
        $stmt = $pdo->prepare("UPDATE categorias_tipo_documento SET nome = ? WHERE id = ?");
        $stmt->execute([$_POST['nome'], $_POST['id']]);
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Tipo de Documento atualizado com sucesso!'];
    }

    // --- FORMAS DE PAGAMENTO ---
    if ($action === 'add_forma_pag') {
        $stmt = $pdo->prepare("INSERT INTO cads_forma_pag (forma, status) VALUES (?, ?)");
        $stmt->execute([$_POST['forma'], $_POST['status']]);
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Forma de Pagamento adicionada com sucesso!'];
    }
    if ($action === 'edit_forma_pag') {
        $stmt = $pdo->prepare("UPDATE cads_forma_pag SET forma = ?, status = ? WHERE id = ?");
        $stmt->execute([$_POST['forma'], $_POST['status'], $_POST['id']]);
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Forma de Pagamento atualizada com sucesso!'];
    }

    // --- AGENCIAS BANCARIAS ---
    if ($action === 'add_agencia') {
        $stmt = $pdo->prepare("INSERT INTO agenciasbancarias (ag_nome, status) VALUES (?, ?)");
        $stmt->execute([$_POST['nome'], $_POST['status']]);
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Agência Bancária adicionada com sucesso!'];
    }
    if ($action === 'edit_agencia') {
        $stmt = $pdo->prepare("UPDATE agenciasbancarias SET ag_nome = ?, status = ? WHERE id = ?");
        $stmt->execute([$_POST['nome'], $_POST['status'], $_POST['id']]);
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Agência Bancária atualizada com sucesso!'];
    }

    // --- Ação de Exclusão Genérica ---
    if ($action === 'delete_item') {
        $tabela = filter_input(INPUT_POST, 'tabela');
        $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
        $tabelasPermitidas = ['categorias_grupo', 'categorias_subgrupo', 'categorias_classificacao', 'categorias_tipo_documento', 'cads_forma_pag', 'agenciasbancarias'];

        if ($id && in_array($tabela, $tabelasPermitidas)) {
            $stmt = $pdo->prepare("DELETE FROM $tabela WHERE id = ?");
            $stmt->execute([$id]);
            $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Registro excluído com sucesso!'];
        } else {
            $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao excluir o registro.'];
        }
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        header("Location: cadastros_financeiros.php?tab=$tabRedirect");
        exit;
    }
} catch (PDOException $e) {
    $errorMessage = ($e->getCode() == '23000')
        ? '<b>Erro:</b> Não à possível excluir este registro, pois ele já está sendo utilizado em outro lugar do sistema.'
        : 'Ocorreu um erro ao processar a sua solicitação.';
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => $errorMessage];
    header("Location: cadastros_financeiros.php?tab=$tabRedirect");
    exit;
}

$grupos = $pdo->query("SELECT * FROM categorias_grupo ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$subgrupos = $pdo->query("SELECT sg.*, g.nome AS grupo_nome FROM categorias_subgrupo sg JOIN categorias_grupo g ON sg.id_grupo = g.id ORDER BY sg.nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$classificacoes = $pdo->query("SELECT * FROM categorias_classificacao ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$documentos = $pdo->query("SELECT * FROM categorias_tipo_documento ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$pagamentos = $pdo->query("SELECT * FROM cads_forma_pag ORDER BY forma ASC")->fetchAll(PDO::FETCH_ASSOC);
$agenciasBancarias = $pdo->query("SELECT * FROM agenciasbancarias  ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);


$active_tab = $_GET['tab'] ?? 'grupos';
?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <title>Gestão de Cadastros Financeiros</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="css/cadastros_financeiros_modern.css">
</head>

<body>
    <?php include("../all/sidebar.php"); ?>
    <div class="container-fluid pt-2 cadfin-page">
        <div class="row">
            <div class="col-12">
        <?php
        if (isset($_SESSION['alert_message'])) {
            $alert = $_SESSION['alert_message'];
            echo "<div class='alert alert-{$alert['type']} cadfin-alert'>{$alert['text']}</div>";
            unset($_SESSION['alert_message']);
        }
        ?>
        <div class="card cadfin-main-card">
            <div class="card-header py-1 cadfin-toolbar">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="m-0 font-weight-bold cadfin-title">Cadastro de Dados Financeiros</h5>
                    <button type="button" class="btn btn-primary btn-sm cadfin-new-btn" id="btn-novo-item"><i class="fas fa-plus"></i> Novo Cadastro</button>
                </div>
                <ul class="nav nav-pills mt-2 cadfin-tabs" role="tablist">
                    <li class="nav-item"><a class="nav-link <?= ($active_tab === 'grupos') ? 'active' : '' ?>" href="?tab=grupos"><i class="fas fa-layer-group mr-1"></i> Grupos</a></li>
                    <li class="nav-item"><a class="nav-link <?= ($active_tab === 'subgrupos') ? 'active' : '' ?>" href="?tab=subgrupos"><i class="fas fa-sitemap mr-1"></i> Subgrupos</a></li>
                    <li class="nav-item"><a class="nav-link <?= ($active_tab === 'classificacoes') ? 'active' : '' ?>" href="?tab=classificacoes"><i class="fas fa-tags mr-1"></i> Classificação</a></li>
                    <li class="nav-item"><a class="nav-link <?= ($active_tab === 'documentos') ? 'active' : '' ?>" href="?tab=documentos"><i class="fas fa-file-alt mr-1"></i> Tipos de Documento</a></li>
                    <li class="nav-item"><a class="nav-link <?= ($active_tab === 'pagamentos') ? 'active' : '' ?>" href="?tab=pagamentos"><i class="fas fa-credit-card mr-1"></i> Formas de Pagamento</a></li>
                    <li class="nav-item"><a class="nav-link <?= ($active_tab === 'agencias') ? 'active' : '' ?>" href="?tab=agencias"><i class="fas fa-university mr-1"></i> Agências Bancárias</a></li>
                </ul>
            </div>

            <div class="card-body card-principal cadfin-body">
                <div class="tab-content cadfin-tab-content">

                    <!-- ABA GRUPOS -->
                    <div class="tab-pane fade <?= ($active_tab === 'grupos') ? 'show active' : '' ?>">
                        <div class="table-responsive cadfin-table-wrap">
                            <table class="table table-sm table-bordered table-hover cadfin-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th class="text-center">Status</th>
                                        <th class="text-center" width="150px">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($grupos as $item) : ?>
                                        <tr>
                                            <td><?= htmlspecialchars($item['nome']) ?></td>
                                            <td class="text-center"><?= $item['status'] == 1 ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-secondary">Inativo</span>' ?></td>
                                            <td class="text-center cadfin-actions-cell">
                                                <form method="POST"><input type="hidden" name="action" value="toggle_status"><input type="hidden" name="id" value="<?= $item['id'] ?>"><input type="hidden" name="tabela" value="categorias_grupo"><input type="hidden" name="tabRedirect" value="grupos">
                                                    <button type="submit" class="btn btn-sm <?= $item['status'] ? 'btn-secondary' : 'btn-success' ?>" title="<?= $item['status'] ? 'Desativar' : 'Ativar' ?>"><i class="fas <?= $item['status'] ? 'fa-power-off' : 'fa-check-circle' ?>"></i></button>
                                                </form>
                                                <button class="btn btn-warning btn-sm btn-edit-grupo" data-toggle="modal" data-target="#modalEditGrupo" data-id="<?= $item['id'] ?>" data-nome="<?= htmlspecialchars($item['nome']) ?>" title="Editar"><i class="fas fa-edit"></i></button>
                                                <button class="btn btn-danger btn-sm btn-delete" data-id="<?= $item['id'] ?>" data-tabela="categorias_grupo" data-tab="grupos" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- ABA SUBGRUPOS -->
                    <div class="tab-pane fade <?= ($active_tab === 'subgrupos') ? 'show active' : '' ?>">
                        <div class="table-responsive cadfin-table-wrap">
                            <table class="table table-sm table-bordered table-hover cadfin-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Grupo</th>
                                        <th class="text-center">Status</th>
                                        <th class="text-center" width="150px">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($subgrupos as $item) : ?>
                                        <tr>
                                            <td><?= htmlspecialchars($item['nome']) ?></td>
                                            <td><?= htmlspecialchars($item['grupo_nome']) ?></td>
                                            <td class="text-center"><?= $item['status'] == 1 ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-secondary">Inativo</span>' ?></td>
                                            <td class="text-center cadfin-actions-cell">
                                                <form method="POST"><input type="hidden" name="action" value="toggle_status"><input type="hidden" name="id" value="<?= $item['id'] ?>"><input type="hidden" name="tabela" value="categorias_subgrupo"><input type="hidden" name="tabRedirect" value="subgrupos">
                                                    <button type="submit" class="btn btn-sm <?= $item['status'] ? 'btn-secondary' : 'btn-success' ?>" title="<?= $item['status'] ? 'Desativar' : 'Ativar' ?>"><i class="fas <?= $item['status'] ? 'fa-power-off' : 'fa-check-circle' ?>"></i></button>
                                                </form>
                                                <button class="btn btn-warning btn-sm btn-edit-subgrupo" data-toggle="modal" data-target="#modalEditSubgrupo" data-id="<?= $item['id'] ?>" data-nome="<?= htmlspecialchars($item['nome']) ?>" data-id_grupo="<?= $item['id_grupo'] ?>" title="Editar"><i class="fas fa-edit"></i></button>
                                                <button class="btn btn-danger btn-sm btn-delete" data-id="<?= $item['id'] ?>" data-tabela="categorias_subgrupo" data-tab="subgrupos" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- ABA CLASSIFICAÇÕES -->
                    <div class="tab-pane fade <?= ($active_tab === 'classificacoes') ? 'show active' : '' ?>">
                        <div class="table-responsive cadfin-table-wrap">
                            <table class="table table-sm table-bordered table-hover cadfin-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th class="text-center">Status</th>
                                        <th class="text-center" width="150px">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($classificacoes as $item) : ?>
                                        <tr>
                                            <td><?= htmlspecialchars($item['nome']) ?></td>
                                            <td class="text-center"><?= $item['status'] == 1 ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-secondary">Inativo</span>' ?></td>
                                            <td class="text-center cadfin-actions-cell">
                                                <form method="POST"><input type="hidden" name="action" value="toggle_status"><input type="hidden" name="id" value="<?= $item['id'] ?>"><input type="hidden" name="tabela" value="categorias_classificacao"><input type="hidden" name="tabRedirect" value="classificacoes">
                                                    <button type="submit" class="btn btn-sm <?= $item['status'] ? 'btn-secondary' : 'btn-success' ?>" title="<?= $item['status'] ? 'Desativar' : 'Ativar' ?>"><i class="fas <?= $item['status'] ? 'fa-power-off' : 'fa-check-circle' ?>"></i></button>
                                                </form>
                                                <button class="btn btn-warning btn-sm btn-edit-classificacao" data-toggle="modal" data-target="#modalEditClassificacao" data-id="<?= $item['id'] ?>" data-nome="<?= htmlspecialchars($item['nome']) ?>" title="Editar"><i class="fas fa-edit"></i></button>
                                                <button class="btn btn-danger btn-sm btn-delete" data-id="<?= $item['id'] ?>" data-tabela="categorias_classificacao" data-tab="classificacoes" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- ABA DOCUMENTOS -->
                    <div class="tab-pane fade <?= ($active_tab === 'documentos') ? 'show active' : '' ?>">
                        <div class="table-responsive cadfin-table-wrap">
                            <table class="table table-sm table-bordered table-hover cadfin-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th class="text-center">Status</th>
                                        <th class="text-center" width="150px">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($documentos as $item) : ?>
                                        <tr>
                                            <td><?= htmlspecialchars($item['nome']) ?></td>
                                            <td class="text-center"><?= $item['status'] == 1 ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-secondary">Inativo</span>' ?></td>
                                            <td class="text-center cadfin-actions-cell">
                                                <form method="POST"><input type="hidden" name="action" value="toggle_status"><input type="hidden" name="id" value="<?= $item['id'] ?>"><input type="hidden" name="tabela" value="categorias_tipo_documento"><input type="hidden" name="tabRedirect" value="documentos">
                                                    <button type="submit" class="btn btn-sm <?= $item['status'] ? 'btn-secondary' : 'btn-success' ?>" title="<?= $item['status'] ? 'Desativar' : 'Ativar' ?>"><i class="fas <?= $item['status'] ? 'fa-power-off' : 'fa-check-circle' ?>"></i></button>
                                                </form>
                                                <button class="btn btn-warning btn-sm btn-edit-tipo_documento" data-toggle="modal" data-target="#modalEditTipoDocumento" data-id="<?= $item['id'] ?>" data-nome="<?= htmlspecialchars($item['nome']) ?>" title="Editar"><i class="fas fa-edit"></i></button>
                                                <button class="btn btn-danger btn-sm btn-delete" data-id="<?= $item['id'] ?>" data-tabela="categorias_tipo_documento" data-tab="documentos" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- ABA PAGAMENTOS -->
                    <div class="tab-pane fade <?= ($active_tab === 'pagamentos') ? 'show active' : '' ?>">
                        <div class="table-responsive cadfin-table-wrap">
                            <table class="table table-sm table-bordered table-hover cadfin-table">
                                <thead>
                                    <tr>
                                        <th>Forma</th>
                                        <th class="text-center">Status</th>
                                        <th class="text-center" width="150px">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($pagamentos as $item) : ?>
                                        <tr>
                                            <td><?= htmlspecialchars($item['forma']) ?></td>
                                            <td class="text-center"><?= $item['status'] == 1 ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-secondary">Inativo</span>' ?></td>
                                            <td class="text-center cadfin-actions-cell">
                                                <form method="POST">
                                                    <input type="hidden" name="action" value="toggle_status">
                                                    <input type="hidden" name="id" value="<?= $item['id'] ?>">
                                                    <input type="hidden" name="tabela" value="cads_forma_pag">
                                                    <input type="hidden" name="tabRedirect" value="pagamentos">
                                                    <button type="submit" class="btn btn-sm <?= $item['status'] ? 'btn-secondary' : 'btn-success' ?>" title="<?= $item['status'] ? 'Desativar' : 'Ativar' ?>"><i class="fas <?= $item['status'] ? 'fa-power-off' : 'fa-check-circle' ?>"></i></button>
                                                </form>
                                                <button class="btn btn-warning btn-sm btn-edit-forma_pag" data-toggle="modal" data-target="#modalEditFormaPag" data-id="<?= $item['id'] ?>" data-forma="<?= htmlspecialchars($item['forma']) ?>" data-status="<?= $item['status'] ?>" title="Editar"><i class="fas fa-edit"></i></button>
                                                <button class="btn btn-danger btn-sm btn-delete" data-id="<?= $item['id'] ?>" data-tabela="cads_forma_pag" data-tab="pagamentos" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- ABA AGENCIA / BANCO -->
                    <div class="tab-pane fade <?= ($active_tab === 'agencias') ? 'show active' : '' ?>">
                        <div class="table-responsive cadfin-table-wrap">
                            <table class="table table-sm table-bordered table-hover cadfin-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th class="text-center">Status</th>
                                        <th class="text-center" width="150px">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($agenciasBancarias as $item) : ?>
                                        <tr>
                                            <td><?= htmlspecialchars($item['ag_nome']) ?></td>
                                            <td class="text-center"><?= $item['status'] == 1 ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-secondary">Inativo</span>' ?></td>
                                            <td class="text-center cadfin-actions-cell">
                                                <form method="POST">
                                                    <input type="hidden" name="action" value="toggle_status">
                                                    <input type="hidden" name="id" value="<?= $item['id'] ?>">
                                                    <input type="hidden" name="tabela" value="agenciasbancarias">
                                                    <input type="hidden" name="tabRedirect" value="agencias">
                                                    <button type="submit" class="btn btn-sm <?= $item['status'] ? 'btn-secondary' : 'btn-success' ?>" title="<?= $item['status'] ? 'Desativar' : 'Ativar' ?>"><i class="fas <?= $item['status'] ? 'fa-power-off' : 'fa-check-circle' ?>"></i></button>
                                                </form>

                                                <button class="btn btn-warning btn-sm btn-edit-agencia" data-toggle="modal" data-target="#modalEditAgencia" data-id="<?= $item['id'] ?>" data-nome="<?= htmlspecialchars($item['ag_nome']) ?>" data-status="<?= $item['status'] ?>" title="Editar"><i class="fas fa-edit"></i></button>

                                                <button class="btn btn-danger btn-sm btn-delete" data-id="<?= $item['id'] ?>" data-tabela="agenciasbancarias" data-tab="agencias" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>


                    <!-- Modais add grupo -->
                    <div class="modal fade cadfin-modal" id="modalAddGrupo" tabindex="-1" role="dialog" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                            <form class="modal-content" method="POST"><input type="hidden" name="action" value="add_grupo"><input type="hidden" name="tabRedirect" value="grupos">
                                <div class="modal-header">
                                    <h5 class="modal-title">Novo Grupo</h5><button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                                </div>
                                <div class="modal-body">
                                    <div class="form-group"><label>Nome</label><input type="text" class="form-control" name="nome" required></div>
                                </div>
                                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Salvar</button></div>
                            </form>
                        </div>
                    </div>
                    <!-- Modal add subgrupo -->
                    <div class="modal fade cadfin-modal" id="modalAddSubgrupo" tabindex="-1" role="dialog" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                            <form class="modal-content" method="POST"><input type="hidden" name="action" value="add_subgrupo"><input type="hidden" name="tabRedirect" value="subgrupos">
                                <div class="modal-header">
                                    <h5 class="modal-title">Novo Subgrupo</h5><button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                                </div>
                                <div class="modal-body">
                                    <div class="form-group"><label>Nome</label><input type="text" class="form-control" name="nome" required></div>
                                    <div class="form-group"><label>Grupo</label><select name="id_grupo" class="form-control" required>
                                            <option value="">Selecione...</option><?php foreach ($grupos as $g) if ($g['status']) echo "<option value='{$g['id']}'>" . htmlspecialchars($g['nome']) . "</option>"; ?>
                                        </select></div>
                                </div>
                                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Salvar</button></div>
                            </form>
                        </div>
                    </div>
                    <!-- Modal add classificação -->
                    <div class="modal fade cadfin-modal" id="modalAddClassificacao" tabindex="-1" role="dialog" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                            <form class="modal-content" method="POST"><input type="hidden" name="action" value="add_classificacao"><input type="hidden" name="tabRedirect" value="classificacoes">
                                <div class="modal-header">
                                    <h5 class="modal-title">Nova Classificação</h5><button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                                </div>
                                <div class="modal-body">
                                    <div class="form-group"><label>Nome</label><input type="text" class="form-control" name="nome" required></div>
                                </div>
                                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Salvar</button></div>
                            </form>
                        </div>
                    </div>
                    <!-- Modal add tipo de documento -->
                    <div class="modal fade cadfin-modal" id="modalAddTipoDocumento" tabindex="-1" role="dialog" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                            <form class="modal-content" method="POST"><input type="hidden" name="action" value="add_tipo_documento"><input type="hidden" name="tabRedirect" value="documentos">
                                <div class="modal-header">
                                    <h5 class="modal-title">Novo Tipo de Documento</h5><button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                                </div>
                                <div class="modal-body">
                                    <div class="form-group"><label>Nome</label><input type="text" class="form-control" name="nome" required></div>
                                </div>
                                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Salvar</button></div>
                            </form>
                        </div>
                    </div>
                    <!-- Modal add forma de pagamento -->
                    <div class="modal fade cadfin-modal" id="modalAddFormaPag" tabindex="-1" role="dialog" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                            <form class="modal-content" method="POST"><input type="hidden" name="action" value="add_forma_pag"><input type="hidden" name="tabRedirect" value="pagamentos">
                                <div class="modal-header">
                                    <h5 class="modal-title">Nova Forma de Pagamento</h5><button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                                </div>
                                <div class="modal-body">
                                    <div class="form-group"><label>Forma</label><input type="text" class="form-control" name="forma" required></div>
                                    <div class="form-group"><label>Status</label><select class="form-control" name="status">
                                            <option value="1">Ativo</option>
                                            <option value="0">Inativo</option>
                                        </select></div>
                                </div>
                                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Salvar</button></div>
                            </form>
                        </div>
                    </div>
                    <!-- Modal add agencia -->
                    <div class="modal fade cadfin-modal" id="modalAddAgencia" tabindex="-1" role="dialog" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                            <form class="modal-content" method="POST">
                                <input type="hidden" name="action" value="add_agencia">
                                <input type="hidden" name="tabRedirect" value="agencias">
                                <div class="modal-header">
                                    <h5 class="modal-title">Nova Agência Bancária</h5><button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                                </div>
                                <div class="modal-body">
                                    <div class="form-group">
                                        <label>Nome da Agência</label>
                                        <input type="text" class="form-control" name="nome" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Status</label>
                                        <select class="form-control" name="status">
                                            <option value="1" selected>Ativo</option>
                                            <option value="0">Inativo</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Salvar</button></div>
                            </form>
                        </div>
                    </div>


                    <!-- Modais de Edição -->
                    <div class="modal fade cadfin-modal" id="modalEditGrupo" tabindex="-1" role="dialog" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                            <form class="modal-content" method="POST"><input type="hidden" name="action" value="edit_grupo"><input type="hidden" name="id" id="edit_g_id"><input type="hidden" name="tabRedirect" value="grupos">
                                <div class="modal-header">
                                    <h5 class="modal-title">Editar Grupo</h5><button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                                </div>
                                <div class="modal-body">
                                    <div class="form-group"><label>Nome</label><input type="text" class="form-control" name="nome" id="edit_g_nome" required></div>
                                </div>
                                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Salvar</button></div>
                            </form>
                        </div>
                    </div>

                    <!-- Modal edit subgrupo -->
                    <div class="modal fade cadfin-modal" id="modalEditSubgrupo" tabindex="-1" role="dialog" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                            <form class="modal-content" method="POST"><input type="hidden" name="action" value="edit_subgrupo"><input type="hidden" name="id" id="edit_sg_id"><input type="hidden" name="tabRedirect" value="subgrupos">
                                <div class="modal-header">
                                    <h5 class="modal-title">Editar Subgrupo</h5><button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                                </div>
                                <div class="modal-body">
                                    <div class="form-group"><label>Nome</label><input type="text" class="form-control" name="nome" id="edit_sg_nome" required></div>
                                    <div class="form-group"><label>Grupo</label><select name="id_grupo" class="form-control" id="edit_sg_id_grupo" required><?php foreach ($grupos as $g) if ($g['status']) echo "<option value='{$g['id']}'>" . htmlspecialchars($g['nome']) . "</option>"; ?></select></div>
                                </div>
                                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Salvar</button></div>
                            </form>
                        </div>
                    </div>

                    <!-- Modal edit classificação -->
                    <div class="modal fade cadfin-modal" id="modalEditClassificacao" tabindex="-1" role="dialog" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                            <form class="modal-content" method="POST"><input type="hidden" name="action" value="edit_classificacao"><input type="hidden" name="id" id="edit_c_id"><input type="hidden" name="tabRedirect" value="classificacoes">
                                <div class="modal-header">
                                    <h5 class="modal-title">Editar Classificação</h5><button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                                </div>
                                <div class="modal-body">
                                    <div class="form-group"><label>Nome</label><input type="text" class="form-control" name="nome" id="edit_c_nome" required></div>
                                </div>
                                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Salvar</button></div>
                            </form>
                        </div>
                    </div>

                    <!-- Modal edit tipo de documento -->
                    <div class="modal fade cadfin-modal" id="modalEditTipoDocumento" tabindex="-1" role="dialog" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                            <form class="modal-content" method="POST"><input type="hidden" name="action" value="edit_tipo_documento"><input type="hidden" name="id" id="edit_td_id"><input type="hidden" name="tabRedirect" value="documentos">
                                <div class="modal-header">
                                    <h5 class="modal-title">Editar Tipo de Documento</h5><button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                                </div>
                                <div class="modal-body">
                                    <div class="form-group"><label>Nome</label><input type="text" class="form-control" name="nome" id="edit_td_nome" required></div>
                                </div>
                                <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-sm btn-primary">Salvar</button></div>
                            </form>
                        </div>
                    </div>

                    <!-- Modal edit forma de pagamento -->
                    <div class="modal fade cadfin-modal" id="modalEditFormaPag" tabindex="-1" role="dialog" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                            <form class="modal-content" method="POST"><input type="hidden" name="action" value="edit_forma_pag"><input type="hidden" name="id" id="edit_fp_id"><input type="hidden" name="tabRedirect" value="pagamentos">
                                <div class="modal-header">
                                    <h5 class="modal-title">Editar Forma de Pagamento</h5><button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                                </div>
                                <div class="modal-body">
                                    <div class="form-group"><label>Forma</label><input type="text" class="form-control" name="forma" id="edit_fp_forma" required></div>
                                    <div class="form-group"><label>Status</label><select class="form-control" name="status" id="edit_fp_status">
                                            <option value="1">Ativo</option>
                                            <option value="0">Inativo</option>
                                        </select></div>
                                </div>
                                <div class="modal-footer"><button type="submit" class="btn btn-primary btn-sm">Salvar</button></div>
                            </form>
                        </div>
                    </div>

                    <!-- Modal edit agencia bancaria -->
                    <div class="modal fade cadfin-modal" id="modalEditAgencia" tabindex="-1" role="dialog" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                            <form class="modal-content" method="POST">
                                <input type="hidden" name="action" value="edit_agencia">
                                <input type="hidden" name="id" id="edit_ag_id">
                                <input type="hidden" name="tabRedirect" value="agencias">
                                <div class="modal-header">
                                    <h5 class="modal-title">Editar Agência Bancária</h5><button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                                </div>
                                <div class="modal-body">
                                    <div class="form-group">
                                        <label>Nome da Agência</label>
                                        <input type="text" class="form-control" name="nome" id="edit_ag_nome" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Status</label>
                                        <select class="form-control" name="status" id="edit_ag_status">
                                            <option value="1">Ativo</option>
                                            <option value="0">Inativo</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="modal-footer"><button type="submit" class="btn btn-primary btn-sm">Salvar</button></div>
                            </form>
                        </div>
                    </div>


                    <!-- Modal Genérico de Exclusão -->
                    <div class="modal fade cadfin-modal" id="modalDelete" tabindex="-1" role="dialog" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered modal-sm" role="document">
                            <form class="modal-content" method="POST"><input type="hidden" name="action" value="delete_item"><input type="hidden" name="id" id="delete_id"><input type="hidden" name="tabela" id="delete_tabela"><input type="hidden" name="tabRedirect" id="delete_tab">
                                <div class="modal-header">
                                    <h5 class="modal-title">Confirmar Exclusão</h5><button type="button" class="close" data-dismiss="modal" aria-label="Fechar"><span aria-hidden="true">&times;</span></button>
                                </div>
                                <div class="modal-body">
                                    <p>Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.</p>
                                </div>
                                <div class="modal-footer"><button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-danger btn-sm">Excluir</button></div>
                            </form>
                        </div>
                    </div>

                    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
                    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
                    <script>
                        $(document).ready(function() {
                            $('[data-toggle="tooltip"]').tooltip();

                            // --- LÓGICA DO BOTÃO "NOVO" DINÂMICO ---
                            const activeTab = '<?= $active_tab ?>';
                            const novoBtn = $('#btn-novo-item');

                            function updateNewButton(tab) {
                                switch (tab) {
                                    case 'grupos':
                                        novoBtn.html('<i class="fas fa-plus"></i> Novo Grupo').attr('data-target', '#modalAddGrupo');
                                        break;
                                    case 'subgrupos':
                                        novoBtn.html('<i class="fas fa-plus"></i> Novo Subgrupo').attr('data-target', '#modalAddSubgrupo');
                                        break;
                                    case 'classificacoes':
                                        novoBtn.html('<i class="fas fa-plus"></i> Nova Classificação').attr('data-target', '#modalAddClassificacao');
                                        break;
                                    case 'documentos':
                                        novoBtn.html('<i class="fas fa-plus"></i> Novo Tipo de Documento').attr('data-target', '#modalAddTipoDocumento');
                                        break;
                                    case 'pagamentos':
                                        novoBtn.html('<i class="fas fa-plus"></i> Nova Forma de Pagamento').attr('data-target', '#modalAddFormaPag');
                                        break;
                                    case 'agencias':
                                        novoBtn.html('<i class="fas fa-plus"></i> Nova Agência Bancária').attr('data-target', '#modalAddAgencia');
                                        break;
                                }
                                novoBtn.attr('data-toggle', 'modal');
                            }
                            updateNewButton(activeTab); // Atualiza no carregamento da página

                            // --- LÓGICA PARA POPULAR MODAIS DE EDIÇÃO ---
                            $('.btn-edit-grupo').on('click', function() {
                                $('#edit_g_id').val($(this).data('id'));
                                $('#edit_g_nome').val($(this).data('nome'));
                            });
                            $('.btn-edit-subgrupo').on('click', function() {
                                $('#edit_sg_id').val($(this).data('id'));
                                $('#edit_sg_nome').val($(this).data('nome'));
                                $('#edit_sg_id_grupo').val($(this).data('id_grupo'));
                            });
                            $('.btn-edit-classificacao').on('click', function() {
                                $('#edit_c_id').val($(this).data('id'));
                                $('#edit_c_nome').val($(this).data('nome'));
                            });
                            $('.btn-edit-tipo_documento').on('click', function() {
                                $('#edit_td_id').val($(this).data('id'));
                                $('#edit_td_nome').val($(this).data('nome'));
                            });
                            $('.btn-edit-forma_pag').on('click', function() {
                                $('#edit_fp_id').val($(this).data('id'));
                                $('#edit_fp_forma').val($(this).data('forma'));
                                $('#edit_fp_status').val($(this).data('status'));
                            });
                            $('.btn-edit-agencia').on('click', function() {
                                $('#edit_ag_id').val($(this).data('id'));
                                $('#edit_ag_nome').val($(this).data('nome'));
                                $('#edit_ag_status').val($(this).data('status'));
                            })

                            // --- LÓGICA PARA MODAL DE EXCLUSÃO ---
                            $('.btn-delete').on('click', function() {
                                $('#delete_id').val($(this).data('id'));
                                $('#delete_tabela').val($(this).data('tabela'));
                                $('#delete_tab').val($(this).data('tab'));
                                $('#modalDelete').modal('show');
                            });

                            // --- ALERTA AUTO-HIDE ---
                            window.setTimeout(function() {
                                $(".alert").fadeOut(500, function() {
                                    $(this).remove();
                                });
                            }, 3000);
                        });
                    </script>
            </div>
        </div>
    </div>
</body>

</html>