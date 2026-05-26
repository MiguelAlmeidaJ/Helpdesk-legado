<?php
session_start(); // Inicia a sessão
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m8_04 == 0) {
    header("Location: ../index.php");
    exit;
}

// Definir permissão de setores
if ($m8_04 == 5 || $m8_04 == 6) {
    $setor_padrao = [1, 2]; // Tem permissão para ambos
} elseif ($m8_04 == 1 || $m8_04 == 2) {
    $setor_padrao = [1]; // Apenas TI
} elseif ($m8_04 == 3 || $m8_04 == 4) {
    $setor_padrao = [2]; // Apenas DevOps
} else {
    $setor_padrao = []; // Sem permissão
}


$autoSearch = false;

$pdo = ConnectionN3();

// Buscar lista de categorias para o mapa
$stmtCategorias = $pdo->query("SELECT categoria_id, categoria_nome FROM catalogos_categoria ORDER BY categoria_nome ASC");
$categorias = $stmtCategorias->fetchAll(PDO::FETCH_KEY_PAIR);

// Inicializa a query corretamente
$query = "
    SELECT catalogos.*, clientes.clt_nomef 
    FROM catalogos 
    LEFT JOIN clientes ON catalogos.cliente_id = clientes.clt_id 
    WHERE 1=1
";

$params = [];

// Verifica se recebeu dados via POST de uma busca manual ou da localizar_catalogo.php
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    
    $search_client = $_POST["search_client"] ?? $_POST["clt_id"] ?? "";
    $search_category = $_POST["search_cat"] ?? $_POST["catalogo_categoria"] ?? "";
    $search_title = $_POST["search_title"] ?? "";
    $search_setor = $_POST["search_setor"] ?? $_POST["setor"] ?? [];

    if (!is_array($search_setor)) {
        $search_setor = !empty($search_setor) ? [$search_setor] : [];
    }

    // Aplicando filtros do POST
    if (!empty($search_client)) {
        $query .= " AND clientes.clt_id = :search_client";
        $params[':search_client'] = $search_client;
    }

    if (!empty($search_category)) {
        $query .= " AND catalogos.catalogo_categoria = :search_category";
        $params[':search_category'] = $search_category;
    }

    // // busca somente por titulo
    // if (!empty($search_title)) {
    //     $query .= " AND catalogos.titulo LIKE :search_title";
    //     $params[':search_title'] = "%$search_title%";
    // }

    //Busca por titulo ou conteudo
    if (!empty($search_title)) {
        $query .= " AND (catalogos.titulo LIKE :search_text OR catalogos.conteudo LIKE :search_text)";
        $params[':search_text'] = "%$search_title%";
    }
    

    // Apenas adiciona filtro de setor se houver valores válidos
    if (!empty($search_setor)) {
        $placeholders = [];
        foreach ($search_setor as $index => $setor_id) {
            if (!empty($setor_id)) {
                $param_name = ":setor" . $index;
                $placeholders[] = $param_name;
                $params[$param_name] = $setor_id;
            }
        }
        if (!empty($placeholders)) {
            $query .= " AND catalogos.setor IN (" . implode(", ", $placeholders) . ")";
        }
    }

} else {
    // Caso seja uma busca sem POST, aplica a permissão padrão de setores
    $search_client = "";
    $search_category = "";
    $search_title = "";

    if (!empty($setor_padrao)) {
        $placeholders = [];
        foreach ($setor_padrao as $index => $setor_id) {
            if (!empty($setor_id)) {
                $param_name = ":setor" . $index;
                $placeholders[] = $param_name;
                $params[$param_name] = $setor_id;
            }
        }
        if (!empty($placeholders)) {
            $query .= " AND catalogos.setor IN (" . implode(", ", $placeholders) . ")";
        }
    }
}

$order_by = isset($_POST['order_by']) ? $_POST['order_by'] : 'id';
$order_dir = isset($_POST['order_dir']) && $_POST['order_dir'] === 'ASC' ? 'ASC' : 'DESC';

$query .= " ORDER BY $order_by $order_dir";

// Debug da Query antes da execução
// echo "<pre>?? Query Gerada:\n$query\n";
// print_r($params);
// echo "</pre>";

// Preparar e executar a consulta
$stmt = $pdo->prepare($query);
foreach ($params as $key => $value) {
    $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
}

try {
    $stmt->execute();
    $catalogos = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo "<pre>? Erro na Execução da Query:\n";
    echo $e->getMessage();
    echo "</pre>";
    exit;
}

// Buscar lista de clientes para o filtro
$stmtClientes = $pdo->query("SELECT clt_id, clt_nomef, clt_cnpj, clt_end, clt_city, clt_uf FROM clientes ORDER BY clt_nomef ASC");
$clientes = $stmtClientes->fetchAll(PDO::FETCH_ASSOC);

// Se o usuário quiser excluir um catálogo
if (isset($_GET['delete'])) {
    $id = intval($_GET['delete']);
    $stmt = $pdo->prepare("DELETE FROM catalogos WHERE id = ?");
    $stmt->execute([$id]);
    header("Location: catalogo.php");
    exit;
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
    <title>Catálogos Operacionais</title>

    <script>
        function confirmarExclusao(id) {
            if (confirm("Tem certeza que deseja excluir este catálogo?")) {
                window.location.href = "catalogo.php?delete=" + id;
            }
        }
    </script>

<script>
        document.addEventListener("DOMContentLoaded", function() {

            // ?? Se for uma busca automática (POST recebido), submeter automaticamente
            <?php if ($autoSearch) : ?>
                document.getElementById("searchForm").submit();
            <?php endif; ?>
        });
    </script>

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
}

    </style>
</head>



    <body>
        <?php include("../all/sidebar.php"); ?>

        <div class="container-fluid">
            <div class="row mt-2 justify-content-md-center">
                <div class="col-md-12" style = "padding-left: 1px; padding-right: 1px;">
                    <div class="card" style="overflow-x: hidden; min-height: 95vh">
                    <div class="card-header h6 d-flex py-1 ">

                            <div class="d-flex align-items-center" style="width: 20%;">
                                <i class="fas fa-book mr-2"></i> Gerenciamento de Catálogos
                            </div>

                            <!-- Formulário de Busca -->
                            <form method="POST" action="catalogo.php" class="form-row align-items-end w-100">

                                <!-- Setor -->
                                <div class="form-group col-md-2">
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
                                <div class="form-group col-md-2">
                                    <label for="search_cat" class="mb-1">Categoria:</label>
                                    <select name="search_cat" id="search_cat" class="form-control form-control-sm">
                                        <option value="">Todos</option>
                                        <?php foreach ($categorias as $categoria_id => $categoria_nome) : ?>
                                            <option value="<?php echo $categoria_id; ?>"
                                                <?php echo ($search_category == $categoria_id) ? 'selected' : ''; ?>>
                                                <?php echo htmlspecialchars($categoria_nome); ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>

                                <!-- Cliente -->
                                <div class="form-group col-md-2">
                                    <label for="search_client" class="mb-1">Cliente:</label>
                                    <select name="search_client" id="search_client" class="form-control form-control-sm">
                                        <option value="">Todos</option>
                                        <?php foreach ($clientes as $cliente) : ?>
                                            <option value="<?php echo $cliente['clt_id']; ?>"
                                                <?php echo ($search_client == $cliente['clt_id']) ? 'selected' : ''; ?>>
                                                <?php echo htmlspecialchars($cliente['clt_nomef']); ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>

                                <!-- Título/Conteúdo (maior espaço e responsivo) -->
                                <div class="form-group col-md-4">
                                    <label for="search_title" class="mb-1">Título/Conteúdo:</label>
                                    <input type="text" name="search_title" id="search_title"
                                        class="form-control form-control-sm"
                                        value="<?php echo htmlspecialchars($search_title); ?>"
                                        placeholder="Buscar por título">
                                </div>

                                <!-- Botões -->
                                <div class="form-group col-md-2 d-flex align-items-end">
                                    <button type="submit" class="btn btn-info btn-sm mr-2">Buscar</button>
                                    <a href="catalogo.php" class="btn btn-secondary btn-sm mr-2">Limpar</a>
                                </div>
                            </form>


                            <!-- Botão Criar Novo Catálogo alinhado corretamente -->
                            <div class="d-flex align-items-center" style="width: 10%; text-align: right;">
                                <a href="catalogo_editar.php" class="btn btn-success btn-sm mt-2">Criar Novo Catálogo</a>
                            </div>
                        </div>


                        <div class="card-body p-0">
                        <div class="table-container">
                            <table class="table table-hover table-striped small">
                                <thead>
                                    <tr>
                                        <!-- Botão para ordenação da coluna ID -->
                                        <th class="p-1 text-center" style="width: 5%">
                                            <form action="#" method="POST">
                                                <input type="hidden" name="order_by" value="id">
                                                <input type="hidden" name="order_dir" value="<?php echo ($order_by == 'id' && $order_dir == 'ASC') ? 'DESC' : 'ASC'; ?>">
                                                <button type="submit" class="btn btn-light btn-sm"><i class="fas fa-sort-amount-down-alt"></i> ID</button>
                                            </form>
                                        </th>

                                        <!-- Botão para ordenação da coluna Setor -->
                                        <th class="p-1 text-center" style="width: 5%">
                                            <form action="#" method="POST">
                                                <input type="hidden" name="order_by" value="setor">
                                                <input type="hidden" name="order_dir" value="<?php echo ($order_by == 'setor' && $order_dir == 'ASC') ? 'DESC' : 'ASC'; ?>">
                                                <button type="submit" class="btn btn-light btn-sm"><i class="fas fa-sort-amount-down-alt"></i> Setor</button>
                                            </form>
                                        </th>

                                        <!-- Botão para exibição de categorias -->
                                        <th class="p-1 text-center" style="width: 10%">
                                            <form action="#" method="POST">
                                                <input type="hidden" name="order_by" value="catalogo_categoria">
                                                <input type="hidden" name="order_dir" value="<?php echo ($order_by == 'catalogo_categoria' && $order_dir == 'ASC') ? 'DESC' : 'ASC'; ?>">

                                                <?php
                                                // Obtém o valor da categoria (se disponível)
                                                $categoria_id = isset($order_by) && $order_by == 'catalogo_categoria' ? intval($_POST['order_by'] ?? 0) : 0;

                                                // Converte para nome, se existir no array
                                                $categoria_nome = isset($categorias[$categoria_id]) ? $categorias[$categoria_id] : "Categoria";
                                                ?>

                                                <button type="submit" class="btn btn-light btn-sm">
                                                    <i class="fas fa-sort-amount-down-alt"></i> <?php echo htmlspecialchars($categoria_nome); ?>
                                                </button>
                                            </form>
                                        </th>



                                        <!-- Botão para ordenação da coluna Cliente -->
                                        <th class="p-1" style="width: 20%">
                                            <form action="#" method="POST">
                                                <input type="hidden" name="order_by" value="clt_nomef">
                                                <input type="hidden" name="order_dir" value="<?php echo ($order_by == 'clt_nomef' && $order_dir == 'ASC') ? 'DESC' : 'ASC'; ?>">
                                                <button type="submit" class="btn btn-light btn-sm"><i class="fas fa-sort-alpha-down"></i> Cliente</button>
                                            </form>
                                        </th>

                                        <!-- Botão para ordenação da coluna Título -->
                                        <th class="p-1" style="width: 30%">
                                            <form action="#" method="POST">
                                                <input type="hidden" name="order_by" value="titulo">
                                                <input type="hidden" name="order_dir" value="<?php echo ($order_by == 'titulo' && $order_dir == 'ASC') ? 'DESC' : 'ASC'; ?>">
                                                <button type="submit" class="btn btn-light btn-sm"><i class="fas fa-sort-alpha-down"></i> Título</button>
                                            </form>
                                        </th>



                                        <!-- Botão para ordenação da coluna Data de edição -->
                                        <th class="p-1 text-center" style="width: 10%">
                                            <form action="#" method="POST">
                                                <input type="hidden" name="order_by" value="data_criacao">
                                                <input type="hidden" name="order_dir" value="<?php echo ($order_by == 'data_criacao' && $order_dir == 'ASC') ? 'DESC' : 'ASC'; ?>">
                                                <button type="submit" class="btn btn-light btn-sm"><i class="fas fa-sort"></i> última Edição</button>
                                            </form>
                                        </th>

                                        <!-- Botão Açães (não precisa de ordenação) -->
                                        <th class="p-1 text-center" style="width: 20%">
                                            <button type="submit" class="btn btn-light btn-sm btn-block">Açães</button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($catalogos as $catalogo) : ?>
                                        <tr>
                                            <!-- id -->
                                            <td class="text-center"><?php echo $catalogo['id']; ?></td>

                                            <!-- Setor -->
                                            <td class="text-left">
                                                <?php
                                                $setor_id = $catalogo['setor']; // Obtém o ID do setor

                                                // Mapeamento de IDs para nomes
                                                $setores = [
                                                    1 => "TI",
                                                    2 => "DevOps"
                                                ];

                                                // Exibe o nome correspondente ou "Desconhecido" se não encontrar
                                                echo isset($setores[$setor_id]) ? $setores[$setor_id] : "Desconhecido";
                                                ?>
                                            </td>

                                            <!-- categoria -->
                                            <td class="text-left">
                                                <?php
                                                $categoria_id = $catalogo['catalogo_categoria']; // Obtém o ID da categoria
                                                echo isset($categorias[$categoria_id]) ? $categorias[$categoria_id] : "Desconhecido"; // Converte para nome
                                                ?>
                                            </td>

                                            <!-- cliente -->
                                            <td><?php echo htmlspecialchars($catalogo['clt_nomef']); ?></td>

                                            <!-- titulo -->
                                            <td><?php echo htmlspecialchars($catalogo['titulo']); ?></td>

                                            <!-- data edição -->
                                            <td class="text-center"><?php echo date('d/m/Y H:i:s', strtotime($catalogo['data_edicao'])); ?></td>

                                            <!-- botoes de açães -->
                                            <td class="text-center">
                                                <a href='catalogo_visualizar.php?id=<?php echo $catalogo['id']; ?>' class='btn btn-info btn-sm mr-2' target='_blank'>Visualizar</a>
                                                <?php if ($m8_04 == 2 || $m8_04 == 4 || $m8_04 == 6) : ?>
                                                    <a href='catalogo_editar.php?id=<?php echo $catalogo['id']; ?>' class='btn btn-warning btn-sm mr-2'>Editar</a>
                                                    <button onclick='confirmarExclusao(<?php echo $catalogo['id']; ?>)' class='btn btn-danger btn-sm'>Excluir</button>
                                                <?php endif; ?>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                        </div>

                        <!-- Scripts -->
                        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
                        <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
                    </div>
                </div>
            </div>
        </div>
    </body>

</html>