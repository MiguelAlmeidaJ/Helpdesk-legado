<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../ativos/ativos_conect.php");

function loadTecnicos($pdo) {
    $stmtTodos = $pdo->prepare("SELECT user_id, user_nome, user_funcao, user_sts FROM usuarios WHERE user_sts = 1 AND (user_id != 1)");
    $stmtTodos->execute();
    $todosTecnicos = $stmtTodos->fetchAll(PDO::FETCH_ASSOC);
    usort($todosTecnicos, function($a, $b) {
        return strcmp($a['user_nome'], $b['user_nome']);
    });
    array_unshift($todosTecnicos, array('user_id' => 0, 'user_nome' => '', 'user_funcao' => 0, 'user_sts' => 1));
    $todosTecnicos[] = array('user_id' => 0, 'user_nome' => 'Não Determinado', 'user_funcao' => 0, 'user_sts' => 1);
    return ['todosTecnicos' => $todosTecnicos];
}

$pdo = ConnectionN3();
if (!$pdo) {
    exit("Erro ao conectar ao banco de dados.");
}

$dadosTecnicos = loadTecnicos($pdo);
$todosTecnicos = $dadosTecnicos['todosTecnicos'];

$pdoPatrimonio = ConnectionPatrimonios();
if (!$pdoPatrimonio) {
    exit("Erro ao conectar ao banco de dados.");
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $num_registro = filter_input(INPUT_POST, 'num_registro', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $item = $_POST ['item'];
    $marca = $_POST ['marca'];
    $modelo = $_POST ['modelo'];
    $numero_serie = $_POST ['numero_serie'];
    if ($data_aquisicao === '0000-00-00') {
        $data_aquisicao = null;
    } else {
        $data_aquisicao = filter_input(INPUT_POST, 'data_aquisicao', FILTER_SANITIZE_FULL_SPECIAL_CHARS);    
    }
    $garantia_expira = filter_input(INPUT_POST, 'garantia_expira', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    if ($valor_input === '') {
        $valor = null;
    } else {
        $valor_input = filter_input(INPUT_POST, 'valor', FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
        $valor = floatval($valor_input);
    }
    $status_item = $_POST['status_item'];
    $localizacao = $_POST['localizacao'];
    $setor = filter_input(INPUT_POST, 'setor', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $colaborador = $_POST['colaborador'];
    $fornecedor = $_POST['fornecedor'];
    $especificacoes = $_POST['especificacoes']; 
    $observacoes = $_POST['observacoes']; 
    $nota_fiscal = $_POST['nota_fiscal'];

    // Processa o upload da imagem
    if (isset($_FILES['imagem']) && $_FILES['imagem']['error'] === UPLOAD_ERR_OK) {
        $img_patrimonio = file_get_contents($_FILES['imagem']['tmp_name']);
    } else {
        $img_patrimonio = null;
    }

    // Prepara a declaração SQL
    $stmt = $pdoPatrimonio->prepare("INSERT INTO patrimonios (num_registro, item, marca, modelo, numero_serie, valor, fornecedor, data_aquisicao, garantia_expira, setor, status_item, localizacao, colaborador, especificacoes, observacoes, nota_fiscal, img_patrimonio) 
        VALUES (:num_registro,:item, :marca, :modelo, :numero_serie, :valor, :fornecedor, :data_aquisicao, :garantia_expira, :setor, :status_item, :localizacao, :colaborador, :especificacoes, :observacoes, :nota_fiscal, :img_patrimonio)");

    // Vincula os parâmetros à declaração SQL
    $stmt->bindParam(':num_registro', $num_registro);
    $stmt->bindParam(':item', $item);
    $stmt->bindParam(':marca', $marca);
    $stmt->bindParam(':modelo', $modelo);
    $stmt->bindParam(':numero_serie', $numero_serie);
    $stmt->bindParam(':valor', $valor);
    $stmt->bindParam(':fornecedor', $fornecedor);
    $stmt->bindParam(':data_aquisicao', $data_aquisicao);
    $stmt->bindParam(':garantia_expira', $garantia_expira);
    $stmt->bindParam(':setor', $setor);
    $stmt->bindParam(':status_item', $status_item);
    $stmt->bindParam(':localizacao', $localizacao);
    $stmt->bindParam(':colaborador', $colaborador, PDO::PARAM_STR);
    $stmt->bindParam(':especificacoes', $especificacoes);
    $stmt->bindParam(':observacoes', $observacoes);
    $stmt->bindParam(':nota_fiscal', $nota_fiscal);
    $stmt->bindParam(':img_patrimonio', $img_patrimonio, PDO::PARAM_LOB);

    if ($stmt->execute()) {
        header("Location: patrimonios.php?success=true");
        exit();
    } else {
        echo "Erro ao executar a inserção: " . $stmt->errorInfo()[2];
    }
}
?>



<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, pt-br">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/help.css">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="../css/bootstrap-select.min.css">
    <link rel="stylesheet" href="../css/timeline.css">
    <link rel="stylesheet" href="../css/bootstrap-datetimepicker.min.css">
    <title>Allterus</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <style>
        body {
            zoom: 0.9; /* Escala o conteúdo sem alterar o contexto de layout */
            width: 100%; /* Mantém o layout responsivo */
            overflow-x: hidden; /* Garante que não haja rolagem horizontal */
        }
        .form-group {
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 100%;
        }
        .form-group label {
            margin-bottom: 0rem;
            font-size: 0.8rem;
        }
        .row.form-row-spacing {
            
            margin-bottom: -0.5rem;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }
    </style>
</head>
<body>
<?php include("../all/sidebar.php"); ?>
    <div class="container-fluid">
        <div class="row">
        <div class="col-md-12">
            <div style="margin-right: 40px; margin-left: 40px">
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-plus-circle text-success"></i> Adicionar Patrimônio
                    </div>
                    <div class="card-body">
                        <?php if (isset($_GET['success']) && $_GET['success'] == 'true'): ?>
                            <div class="alert alert-success" role="alert">
                                Ativo adicionado com sucesso!
                            </div>
                        <?php endif; ?>
                        <form action="" method="POST" enctype="multipart/form-data">
                        <!-- <form action="patrimonios_insert.php" method="POST">  -->
                            <!-- enctype="multipart/form-data"> -->
                            <!-- Campos do formulário -->
                            <div class="row form-row-spacing" style= "margin-top: -1rem;">
                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="item">Item</label>
                                        <input type="text" class="form-control" id="item" name="item" placeholder="Ex: Computador, Impressora" required>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="marca">Marca</label>
                                        <input type="text" class="form-control" id="marca" name="marca" placeholder="Ex: Samsung, HP" required>
                                    </div> 
                                </div>
                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="modelo">Modelo</label>
                                        <input type="text" class="form-control" id="modelo" name="modelo">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="numero_serie">Nºmero de Série</label>
                                        <input type="text" class="form-control" id="numero_serie" name="numero_serie">
                                    </div>
                                </div>
                            </div>

                            <div class="row form-row-spacing">
                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="valor">Valor</label>
                                        <input type="text" class="form-control" id="valor" name="valor" placeholder="R$ 0,00">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="fornecedor">Fornecedor</label>
                                        <input type="text" class="form-control" id="fornecedor" name="fornecedor">
                                    </div>
                                </div>
                                
                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="data_aquisicao">Data de Aquisição</label>
                                        <input type="date" class="form-control" id="data_aquisicao" name="data_aquisicao">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="garantia_expira">Garantia Expira em</label>
                                        <input type="date" class="form-control" id="garantia_expira" name="garantia_expira">
                                    </div>
                                </div>
                            </div>

                            <div class="row form-row-spacing">
                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="setor">Setor</label>
                                        <select class="form-control" id="setor" name="setor">
                                            <option></option>
                                            <option value="Ti">Ti</option>
                                            <option value="DevOps">DevOps</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Diretoria">Diretoria</option>
                                            <option value="Coworking">Coworking</option>
                                            <option value="Facility">Facility</option>
                                            <option value="Cibersegurança">Cibersegurança</option>
                                            <option value="Qualidade">Qualidade</option>
                                            <option value="Outros">Outros</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="status_item">Situação</label>
                                        <select class="form-control" id="status_item" name="status_item" required>
                                            <option></option>
                                            <option value="Em uso">Em uso</option>
                                            <option value="Em manutenção">Em manutenção</option>
                                            <option value="Desativado">Desativado</option>
                                            <option value="Em estoque">Em estoque</option>
                                            <option value="Perdido">Perdido</option>
                                            <option value="Doado">Doado</option>
                                            <option value="Vendida">Vendida</option>
                                            <option value="Sucata">Sucata</option>
                                        </select>
                                    </div>
                                </div>
                            
                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="localizacao">Localização</label>
                                        <input type="text" class="form-control" id="localizacao" name="localizacao" required>

                                    </div>
                                </div>

                                
                                <div class="col-md-3">
                                    <div class="form-group">
                                        <label for="colaborador">Colaborador</label>
                                        <select class="form-control" id="colaborador" name="colaborador">
                                            <?php foreach ($todosTecnicos as $tecnico): ?>
                                                <option value="<?php echo htmlspecialchars($tecnico['user_nome']); ?>">
                                                    <?php echo htmlspecialchars($tecnico['user_nome']); ?>
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                </div>
                                
                            </div>

                            <div class="row form-row-spacing">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="especificacoes">Especificações Técnicas</label>
                                        <textarea class="form-control" id="especificacoes" name="especificacoes" rows="4"></textarea>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="descricao">Observações</label>
                                        <textarea class="form-control" id="observacoes" name="observacoes" rows="4"></textarea>
                                    </div>
                                </div>
                            </div>
                            <div class="row form-row-spacing">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="nota_fiscal">Nota Fiscal</label>
                                        <input type="text" class="form-control" id="nota_fiscal" name="nota_fiscal">
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="form-group">
                                        <label for="nota_fiscal">Nº do Patrimonio</label>
                                        <input type="text" class="form-control" id="num_registro" name="num_registro">
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label for="imagem">Imagem</label>
                                        <input type="file"  id="imagem" name="imagem">
                                    </div>
                                </div>
                            </div>
                            <div class="container">
                                <div class="row p-0 justify-content-md-center">
                                    <div class="col-md-3 d-flex justify-content-center p-1" style="margin-top: 1rem;margin-bottom: -1rem">
                                        <button type="submit" value="Enviar" class="btn-outline-success btn-sm btn-block text-center mt-3 mb-3 w-100">Adicionar Patrimônio</button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </div>

<!-- JavaScript do jQuery e do Bootstrap -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/cleave.js@1.6.0/dist/cleave.min.js"></script>
  <script>
document.addEventListener('DOMContentLoaded', function() {
      new Cleave('#valor', {
        numeral: true,
//         numeralThousandsGroupStyle: 'thousand',

        numeralDecimalScale: 2,
        numeralDecimalMark: ',',
        numeralDecimalMark: '.',
//         delimiter: '.',
        prefix: 'R$ ',
        noImmediatePrefix: true,
        rawValueTrimPrefix: true
    
      });
    });
  </script>
</body>
</html>