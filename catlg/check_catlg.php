<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

$pdo = ConnectionN3();

// Definir permissão de setores
if ($m8_04 == 5 || $m8_04 == 6) {
    $setor_padrao = [1, 2];
} elseif ($m8_04 == 1 || $m8_04 == 2) {
    $setor_padrao = [1];
} elseif ($m8_04 == 3 || $m8_04 == 4) {
    $setor_padrao = [2];
} else {
    $setor_padrao = [];
}

// Capturar filtros enviados pelo formulário
$search_client = $_POST["search_client"] ?? "";
$search_category = $_POST["search_cat"] ?? "";
$search_setor = $_POST["search_setor"] ?? "";

// Definir colunas permitidas para ordenação
$allowed_columns = ["clt_id", "clt_nomef"];
$order_by = "clt_nomef"; // Ordenação padrão
$order_dir = "ASC"; // Direção padrão

// Ajustar ordenação se estiver no POST e for válida
if (!empty($_POST['ord']) && in_array($_POST['ord'], $allowed_columns)) {
    $order_by = $_POST['ord'];
}

if (!empty($_POST['order_dir']) && in_array(strtoupper($_POST['order_dir']), ["ASC", "DESC"])) {
    $order_dir = strtoupper($_POST['order_dir']);
}

// Buscar lista de categorias
$stmtCategorias = $pdo->query("SELECT categoria_id, categoria_nome FROM catalogos_categoria ORDER BY categoria_nome ASC");
$categorias = $stmtCategorias->fetchAll(PDO::FETCH_KEY_PAIR);

// Consultar clientes filtrando apenas os que possuem a categoria desejada
$queryclientes = "SELECT DISTINCT c.clt_id, c.clt_nomef 
                  FROM clientes c
                  LEFT JOIN catalogos cat ON c.clt_id = cat.cliente_id 
                  WHERE 1=1";

$paramsClientes = [];

if (!empty($search_client)) {
    $queryclientes .= " AND c.clt_id = :search_client";
    $paramsClientes[':search_client'] = $search_client;
}

if (!empty($search_category)) {
    $queryclientes .= " AND cat.catalogo_categoria = :search_cat";
    $paramsClientes[':search_cat'] = $search_category;
}

$queryclientes .= " ORDER BY $order_by $order_dir";

$stmtclientes = $pdo->prepare($queryclientes);
$stmtclientes->execute($paramsClientes);
$clientes = $stmtclientes->fetchAll(PDO::FETCH_ASSOC);

// Buscar relação entre clientes e categorias com filtros aplicados
$queryCatalogos = "SELECT cliente_id, catalogo_categoria, setor FROM catalogos WHERE 1=1";
$paramsCatalogos = [];

if (!empty($search_client)) {
    $queryCatalogos .= " AND cliente_id = :search_client";
    $paramsCatalogos[':search_client'] = $search_client;
}

if (!empty($search_category)) {
    $queryCatalogos .= " AND catalogo_categoria = :search_cat";
    $paramsCatalogos[':search_cat'] = $search_category;
}

if (!empty($search_setor)) {
    $queryCatalogos .= " AND setor = :search_setor";
    $paramsCatalogos[':search_setor'] = $search_setor;
} elseif (!empty($setor_padrao)) {
    $queryCatalogos .= " AND setor IN (" . implode(", ", array_map('intval', $setor_padrao)) . ")";
}

$stmtCatalogos = $pdo->prepare($queryCatalogos);
$stmtCatalogos->execute($paramsCatalogos);
$catalogos = $stmtCatalogos->fetchAll(PDO::FETCH_ASSOC);

// Estruturar os dados em um array associativo para exibição na tabela
$clienteCategorias = [];
foreach ($catalogos as $catalogo) {
    $clienteCategorias[$catalogo['cliente_id']][$catalogo['catalogo_categoria']] = true;
}
?>


<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/help.css">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="../css/bootstrap-select.min.css">
    <title>Checklist de clientes</title>
</head>

<style>
    body {
        zoom: 0.9;
        width: 100%;
    }

    th form {
        display: block;
        /* Faz o formulário ocupar 100% da largura da célula */
        width: 100%;
    }

    th button {
        width: 100%;
        /* Faz o botão ocupar toda a largura do <th> */
    }

    .table-container {
        max-height: 85vh;
        /* Define um limite de altura para a tabela */
        overflow-y: auto;
        /* Habilita o scroll vertical */
        display: block;
        border: 1px solid #dee2e6;
    }

    table {
        display: auto;
        width: 100%;
        border-collapse: collapse;
    }

    thead {
        position: sticky;
        top: 0;
        background-color: white;
        /* Fundo branco para cobrir o conteúdo rolante */
        /* z-index: 1000; */
        /* Garante que o cabeçalho fique sobre o restante da tabela */
    }

    td {
        font-size: 12px;
        padding: 1px;
    }

    .table-container td .checkmark {
        font-size: 1.4em;
        /* Aumenta o tamanho do check */
    }

    .-dropdown-toggle-split::after {
  /*alinha o icone da setinha na direita*/
  position: absolute;
  right: 10px;
  top:45%;
}

.dropdown-toggle-split::before {
  content: none; /* Remove a setinha */
}


    /* ?? Ajusta contêiner da tabela para rolagem no celular */
    @media (max-width: 768px) {
        .table-responsive {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }
    }

    /* ?? Ajusta formulário de busca para ficar empilhado */
    @media (max-width: 768px) {
        .form-row {
            flex-direction: column;
        }

        .form-group {
            width: 100% !important;
            margin-bottom: 10px;
        }
    }

    /* ?? Ajusta botões e inputs no mobile */
    @media (max-width: 768px) {
        .btn {
            width: 100%;
            text-align: center;
            margin-bottom: 5px;
        }
    }

    /* ?? Garante que os cards tenham um espaço melhor no celular */
    @media (max-width: 768px) {
        .card {
            padding: 10px;
            margin: 5px;
        }
    }

    @media (max-width: 768px) {
        .card-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        .card-header .d-flex {
            width: 100% !important;
            justify-content: center;
            flex-direction: column;
        }

        .form-row {
            flex-direction: column;
            align-items: center;
        }

        .form-group {
            width: 100%;
            max-width: 90%;
            text-align: left;
        }

        .btn {
            width: 100%;
            margin-top: 5px;

        }

        .btn-group {
            display: flex;
            flex-direction: column;
            width: 100%;

        }

        .categoria-col {
            width: 100px;
            /* Defina um valor fixo conforme necessário */
            min-width: 15px;
            max-width: 15px;
            text-align: center;
        }

    }
</style>



<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid">
            <div class="row mt-2 justify-content-md-center">
                <div class="col-md-12" style = "padding-left: 1px; padding-right: 1px;">
                    <div class="card" style="overflow-x: hidden; min-height: 95vh">
                    <div class="card-header h6 d-flex py-1 ">

                        <div class="d-flex align-items-center" style="width: 25%;">
                            <i class="fas fa-book mr-2"></i> Checklist de Catálogos
                        </div>

                        <form method="POST" class="form-row align-items-center w-100">
                            <!-- Setor -->
                            <div class="form-group col-md-2 mb-1">
                                <label for="setor" class="mb-1">Setor:</label>
                                <select name="search_setor" id="setor" class="form-control form-control-sm">
                                    <?php
                                    if ($m8_04 == 1 || $m8_04 == 2) {
                                        echo '<option value="1" selected>TI</option>';
                                    } elseif ($m8_04 == 3 || $m8_04 == 4) {
                                        echo '<option value="2" selected>DevOps</option>';
                                    } elseif ($m8_04 == 5 || $m8_04 == 6) {
                                        echo '<option value="">Selecione</option>';
                                        echo '<option value="1">TI</option>';
                                        echo '<option value="2">DevOps</option>';
                                    }
                                    ?>
                                </select>
                            </div>

                            <!-- Categoria -->
                            <div class="form-group col-md-2 mb-1">
                                <label for="search_cat" class="mb-1">Categoria:</label>
                                <select name="search_cat" id="search_cat" class="form-control form-control-sm" >
                                    <option value="">Todos</option>
                                    <?php foreach ($categorias as $categoria_id => $categoria_nome) : ?>
                                        <option value="<?php echo $categoria_id; ?>" <?php echo ($search_category == $categoria_id) ? 'selected' : ''; ?>>
                                            <?php echo htmlspecialchars($categoria_nome); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>

                            <!-- Cliente -->
                            <div class="form-group col-md-2 mb-1">
                                <label for="search_client" class="mb-1">Cliente:</label>
                                <select name="search_client" id="search_client" class="form-control form-control-sm" >
                                    <option value="">Todos</option>
                                    <?php foreach ($clientes as $cliente) : ?>
                                        <option value="<?php echo $cliente['clt_id']; ?>" <?php echo ($search_client == $cliente['clt_id']) ? 'selected' : ''; ?>>
                                            <?php echo htmlspecialchars($cliente['clt_nomef']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>

                            <div class=" align-items-left pt-3 " style="width: 30%; text-align: right;">
                                <button type="submit" class="btn btn-info btn-sm mr-2 ms-2">Buscar</button>
                                <a href="check_catlg.php" class="btn btn-secondary btn-sm mr-2 ms-2">Limpar</a>
                            </div>


                        </form>

                    </div>

                    <div class="card-body p-0">
                        <div class="table-container">
                            <table class="table table-hover table-striped small">
                                <thead>
                                    <tr>
                                        <th class="p-1 text-center" style="width: 20%">
                                            <form method="POST">
                                                <input type="hidden" name="ord" value="clt_nomef">
                                                <input type="hidden" name="order_dir" value="<?php echo ($order_dir === 'ASC') ? 'DESC' : 'ASC'; ?>">
                                                <button type="submit" class="btn btn-light btn-sm">
                                                    <i class="fas fa-sort-amount-down-alt"></i> Cliente
                                                </button>
                                            </form>
                                        </th>
                                        <?php foreach ($categorias as $categoriaNome) : ?>
                                            <th class="p-1 text-center">
                                                <button type="submit" class="btn btn-light btn-sm"><?php echo htmlspecialchars($categoriaNome); ?></button>
                                            </th>
                                        <?php endforeach; ?>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($clientes as $cliente) : ?>
                                        <tr>
                                            <td><?php echo htmlspecialchars($cliente['clt_nomef']); ?></td>
                                            <?php foreach ($categorias as $categoriaId => $categoriaNome) : ?>
                                                <td class="text-center align-middle categoria-col" style=" width-min: 10%;width-max: 10%;"><?php echo isset($clienteCategorias[$cliente['clt_id']][$categoriaId]) ? '<span class="checkmark">?</span>' : '?'; ?></td>
                                            <?php endforeach; ?>
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


    <script src="../js/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.bundle.min.js"></script>



</body>

</html>