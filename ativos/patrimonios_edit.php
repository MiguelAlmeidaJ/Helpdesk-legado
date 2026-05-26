
<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../ativos/ativos_conect.php");

// Função para carregar tecnicos
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

// Conexão com o banco de dados
$pdo = ConnectionN3();
if (!$pdo) {
    exit("Erro ao conectar ao banco de dados.");
}

$dadosTecnicos = loadTecnicos($pdo);
$todosTecnicos = $dadosTecnicos['todosTecnicos'];

// Conexão com o banco de dados patrimonios
$pdoPatrimonio = ConnectionPatrimonios();
if (!$pdoPatrimonio) {
    exit("Erro ao conectar ao banco de dados."); // Exibe mensagem de erro se a conexão falhar
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id'])) {
    $id = filter_input(INPUT_POST, 'id', FILTER_SANITIZE_NUMBER_INT);
    $num_registro = filter_input(INPUT_POST, 'num_registro', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $item = $_POST['item'];
    $marca = $_POST['marca'];
    $modelo = $_POST['modelo'];
    $numero_serie = $_POST['numero_serie'];
    $data_aquisicao = filter_input(INPUT_POST, 'data_aquisicao', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $garantia_expira = filter_input(INPUT_POST, 'garantia_expira', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $valor_input = filter_input(INPUT_POST, 'valor', FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
    $valor = ($valor_input === '') ? null : str_replace(',', '.', $valor_input);
    $status_item = $_POST['status_item'];
    $localizacao = $_POST['localizacao'];
    $setor = filter_input(INPUT_POST, 'setor', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $colaborador = $_POST['colaborador'];
    $fornecedor = $_POST['fornecedor'];
    $especificacoes = $_POST['especificacoes'];
    $observacoes = $_POST['observacoes'];
    $nota_fiscal = filter_input(INPUT_POST, 'nota_fiscal', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

    // Verifica se o patrimônio já tem uma imagem salva
    $stmt = $pdoPatrimonio->prepare("SELECT img_patrimonio FROM patrimonios WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $patrimonio = $stmt->fetch(PDO::FETCH_ASSOC);

    // Processar o upload da imagem se uma nova imagem for enviada
    if (isset($_FILES['img_patrimonio']) && $_FILES['img_patrimonio']['error'] === UPLOAD_ERR_OK) {
        $img_patrimonio = file_get_contents($_FILES['img_patrimonio']['tmp_name']);
    } else {
        // Mantém a imagem existente se nenhuma nova imagem foi enviada
        $img_patrimonio = $patrimonio['img_patrimonio'];
    }

    // Atualizar os dados do patrimônio no banco de dados
    $stmt = $pdoPatrimonio->prepare("UPDATE patrimonios SET num_registro = :num_registro, item = :item, marca = :marca, modelo = :modelo,
        numero_serie = :numero_serie, data_aquisicao = :data_aquisicao, garantia_expira = :garantia_expira, valor = :valor, status_item = :status_item,
        localizacao = :localizacao, setor = :setor, colaborador = :colaborador, fornecedor = :fornecedor, especificacoes = :especificacoes, observacoes = :observacoes,
        nota_fiscal = :nota_fiscal, img_patrimonio = :img_patrimonio WHERE id = :id");
    
    if (!$stmt) {
        exit("Erro na atualização do patrimônio: " . $pdoPatrimonio->errorInfo()[2]); // Exibe mensagem de erro se a consulta falhar
    }

    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->bindParam(':num_registro', $num_registro, PDO::PARAM_STR);
    $stmt->bindParam(':item', $item, PDO::PARAM_STR);
    $stmt->bindParam(':marca', $marca, PDO::PARAM_STR);
    $stmt->bindParam(':modelo', $modelo, PDO::PARAM_STR);
    $stmt->bindParam(':numero_serie', $numero_serie, PDO::PARAM_STR);
    $stmt->bindParam(':data_aquisicao', $data_aquisicao, PDO::PARAM_STR);
    $stmt->bindParam(':garantia_expira', $garantia_expira, PDO::PARAM_STR);
    $stmt->bindParam(':valor', $valor, PDO::PARAM_STR);
    $stmt->bindParam(':status_item', $status_item, PDO::PARAM_STR);
    $stmt->bindParam(':localizacao', $localizacao, PDO::PARAM_STR);
    $stmt->bindParam(':setor', $setor, PDO::PARAM_STR);
    $stmt->bindParam(':colaborador', $colaborador, PDO::PARAM_STR);
    $stmt->bindParam(':fornecedor', $fornecedor, PDO::PARAM_STR);
    $stmt->bindParam(':especificacoes', $especificacoes, PDO::PARAM_STR);
    $stmt->bindParam(':observacoes', $observacoes, PDO::PARAM_STR);
    $stmt->bindParam(':nota_fiscal', $nota_fiscal, PDO::PARAM_STR);
    $stmt->bindParam(':img_patrimonio', $img_patrimonio, PDO::PARAM_LOB);
    
    if ($stmt->execute()) {
        header("Location: patrimonios_edit.php?id=$id&sucess=1");
        exit();
    } else {
        exit("Erro ao atualizar patrimônio: " . $pdoPatrimonio->errorInfo()[2]);
    }

} else if (isset($_GET['id'])) {
    $id = filter_input(INPUT_GET, 'id', FILTER_SANITIZE_NUMBER_INT);

    $stmt = $pdoPatrimonio->prepare("SELECT * FROM patrimonios WHERE id = :id");
    if (!$stmt) {
        exit("Erro na consulta do patrimônio: " . $pdoPatrimonio->errorInfo()[2]); // Exibe mensagem de erro se a consulta falhar
    }
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $patrimonio = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($patrimonio) {
        $num_registro = $patrimonio['num_registro'];
        $item = $patrimonio['item'];
        $marca = $patrimonio['marca'];
        $modelo = $patrimonio['modelo'];
        $numero_serie = $patrimonio['numero_serie'];
        $data_aquisicao = $patrimonio['data_aquisicao'];
        $garantia_expira = $patrimonio['garantia_expira'];
        $valor = $patrimonio['valor'];
        $valor = str_replace(',', '.', $valor);
        $valor_formatado = number_format($valor, 2, '.', '');
        $status_item = $patrimonio['status_item'];
        $localizacao = $patrimonio['localizacao'];
        $setor = $patrimonio['setor'];
        $colaborador = $patrimonio['colaborador'];
        $fornecedor = $patrimonio['fornecedor'];
        $especificacoes = $patrimonio['especificacoes'];
        $observacoes = $patrimonio['observacoes'];
        $nota_fiscal = $patrimonio['nota_fiscal'];
        $img_patrimonio = $patrimonio['img_patrimonio'];
        $img_url = 'data:image/jpeg;base64,' . base64_encode($img_patrimonio);
    } else {
        exit("Patrimônio não encontrado");
    }
}
?>



<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link rel="icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../css/help.css">
  <link rel="stylesheet" href="../css/bootstrap.min.css">
  <link rel="stylesheet" href="../fontawesome/css/all.css">
  <link rel="stylesheet" href="../css/bootstrap-select.min.css">
  <link rel="stylesheet" href="../css/timeline.css">
  <link rel="stylesheet" href="../css/bootstrap-datetimepicker.min.css">
    <title>Allterus</title>
    <!-- CSS do Bootstrap -->
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
            margin-bottom: 0.7rem;
            
        }

        .form-control {
            font-size: 0.9rem;
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
        .form-row-spacing .form-group {
            font-size: 0.6rem;
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
                <div class="h6 card-header">
                    <i class="fas fa-pencil-alt text-primary"></i> Editar Patrimônio
                </div>
                <?php if (isset($_GET['success'])): ?>
                <div class="alert alert-success" role="alert">
                    Patrimônio editado com sucesso!
                </div>
                <?php endif; ?>
                <form id="editPatrimonio" action="./patrimonios_edit.php" method="POST" enctype="">
                    <input type="hidden" name="id" value="<?php echo htmlspecialchars($id); ?>"> <!-- Adiciona o campo oculto para armazenar o ID do patrimonio -->
                    <div class="row form-row-spacing" style= "margin-top: 6px;">

                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group  w-100">
                                        <label for="item">Item</label>
                                        <input type="text" class="form-control" id="item" name="item" value="<?php echo htmlspecialchars($item); ?>" required>
                                    </div>
                                </div>
                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="marca">Marca</label>
                                        <input type="text" class="form-control" id="marca" name="marca" value="<?php echo htmlspecialchars($marca); ?>" required>
                                    </div> 
                                </div>
                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="modelo">Modelo</label>
                                        <input type="text" class="form-control" id="modelo" name="modelo" value="<?php echo htmlspecialchars($modelo); ?>">
                                    </div>
                                </div>
                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="numero_serie">Nºmero de Série</label>
                                        <input type="text" class="form-control" id="numero_serie" name="numero_serie" value="<?php echo htmlspecialchars($numero_serie); ?>">
                                    </div>
                                </div>
                            </div>

                            <div class="row form-row-spacing">
                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="valor">Valor</label>
                                            <input type="text" class="form-control" id="valor" name="valor" placeholder ="R$ 0.00" value="<?php echo htmlspecialchars($valor_formatado); ?>">
                                    </div>
                                </div>

                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="fornecedor">Fornecedor</label>
                                        <input type="text" class="form-control" id="fornecedor" name="fornecedor" value="<?php echo htmlspecialchars($fornecedor); ?>">
                                    </div>
                                </div>
                                
                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="data_aquisicao">Data de Aquisição</label>
                                        <input type="date" class="form-control" id="data_aquisicao" name="data_aquisicao" value="<?php echo htmlspecialchars($data_aquisicao); ?>">
                                    </div>
                                </div>
                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="garantia_expira">Garantia Expira em</label>
                                        <input type="date" class="form-control" id="garantia_expira" name="garantia_expira" value="<?php echo htmlspecialchars($garantia_expira); ?>">
                                    </div>
                                </div>
                            </div>

                            <div class="row form-row-spacing">
                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="setor">Setor</label>
                                        <select class="form-control" id="setor" name="setor" >
                                            <option></option>
                                            <option value="Ti"<?php echo ($setor == 'Ti') ? 'selected' : ''; ?>>Ti</option>
                                            <option value="DevOps"<?php echo ($setor == 'DevOps') ? 'selected' : ''; ?>>DevOps</option>
                                            <option value="Marketing"<?php echo ($setor == 'Marketing') ? 'selected' : ''; ?>>Marketing</option>
                                            <option value="Diretoria"<?php echo ($setor == 'Diretoria') ? 'selected' : ''; ?>>Diretoria</option>
                                            <option value="Coworking"<?php echo ($setor == 'Coworking') ? 'selected' : ''; ?>>Coworking</option>
                                            <option value="Facility"<?php echo ($setor == 'Facility') ? 'selected' : ''; ?>>Facility</option>
                                            <option value="Cibersegurança"<?php echo ($setor == 'Cibersegurança') ? 'selected' : ''; ?>>Cibersegurança</option>
                                            <option value="Outros"<?php echo ($setor == 'Outros') ? 'selected' : ''; ?>>Outros</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="status_item">Situação</label>
                                        <select class="form-control" id="status_item" name="status_item" required>
                                            <option></option>
                                            <option value="Em uso"<?php echo ($status_item == 'Em uso') ? 'selected' : ''; ?>>Em uso</option>
                                            <option value="Em manutenção"<?php echo ($status_item == 'Em manutenção') ? 'selected' : ''; ?>>Em manutenção</option>
                                            <option value="Desativado"<?php echo ($status_item == 'Desativado') ? 'selected' : ''; ?>>Desativado</option>
                                            <option value="Em estoque"<?php echo ($status_item == 'Em estoque') ? 'selected' : ''; ?>>Em estoque</option>
                                            <option value="Perdido"<?php echo ($status_item == 'Perdido') ? 'selected' : ''; ?>>Perdido</option>
                                            <option value="Doado"<?php echo ($status_item == 'Doado') ? 'selected' : ''; ?>>Doado</option>
                                            <option value="Vendida"<?php echo ($status_item == 'Vendida') ? 'selected' : ''; ?>>Vendida</option>
                                            <option value="Sucata"<?php echo ($status_item == 'Sucata') ? 'selected' : ''; ?>>Sucata</option>
                                        </select>
                                    </div>
                                </div>
                            
                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="localizacao">Localização</label>
                                        <input type="text" class="form-control" id="localizacao" name="localizacao" value="<?php echo htmlspecialchars($localizacao); ?>" required>

                                    </div>
                                </div>

                                
                                <div class="col-md-3">
                                <div class="form-group">
                                    <label for="colaborador">Colaborador</label>
                                    <select class="form-control" id="colaborador" name="colaborador">
                                        <?php foreach ($todosTecnicos as $tecnico): ?>
                                            <option value="<?php echo htmlspecialchars($tecnico['user_nome']); ?>" <?php echo ($tecnico['user_nome'] == $colaborador) ? 'selected' : ''; ?>>
                                                <?php echo htmlspecialchars($tecnico['user_nome']); ?>
                                            </option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                </div>
                                
                                
                            </div>

                            <div class="row form-row-spacing">
                                <div class="col-md-6 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="especificacoes">Especificações Técnicas</label>
                                        <textarea class="form-control" id="especificacoes" name="especificacoes" rows="4"><?php echo htmlspecialchars($especificacoes); ?></textarea>
                                    </div>
                                </div>
                                <div class="col-md-6 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="observacoes">Observações</label>
                                        <textarea class="form-control" id="observacoes" name="observacoes" rows="4"><?php echo htmlspecialchars($observacoes); ?></textarea>
                                    </div>
                                </div>
                            </div>
                            <div class="row form-row-spacing">
                                <div class="col-md-6 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="nota_fiscal">Nota Fiscal</label>
                                        <input type="text" class="form-control" id="nota_fiscal" name="nota_fiscal" value="<?php echo htmlspecialchars($nota_fiscal); ?>">
                                    </div>
                                </div>
                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="nota_fiscal">Numero de Registro do Patrimonio</label>
                                        <input type="text" class="form-control" id="num_registro" name="num_registro" value="<?php echo htmlspecialchars($num_registro); ?>">
                                    </div>
                                </div>

                                <!-- exibe a imagem -->
                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="img_patrimonio">Imagem</label>
                                        <!-- Exibir input se a imagem for null -->
                                        <?php if ($img_patrimonio == null): ?>
                                            <input type="file" id="img_patrimonio" name="img_patrimonio" data-img-present="false">
                                        <?php else: ?>
                                            <img src="<?= $img_url ?>" alt="Imagem do Patrimônio" style="width: 100px; height: auto;" data-toggle="modal" data-target="#imagemModal">
                                            <input type="file" id="img_patrimonio" name="img_patrimonio" data-img-present="true" style="display: none;">
                                        <?php endif; ?>
                                    </div>
                                </div>
                                        
                                <input type="hidden" name="id" value="<?php echo $id; ?>">
                                        
                            </form>



                            <!-- Botoes -->
                    <div class="container">
                        <div class="row p-0 justify-content-md-center">
                            <div class="col-md-3 d-flex justify-content-center p-1">
                                <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center mt-3 mb-3 w-100" onclick="location.href='./patrimonios.php'">Voltar / Cancelar</button>
                            </div>                               
                            <div class="col-md-3 d-flex justify-content-center p-1">
                                <button type="button" class="btn btn-outline-success btn-sm btn-block text-center mt-3 mb-3 w-100" id="btnEditarAtivo" data-toggle="modal" data-target="#editarModal">Editar Patrimônio</button>
                            </div>
                            <div class="col-md-3 d-flex justify-content-center p-1">
                                <input type="hidden" name="id" value="<?php echo $id; ?>">
                                <button type="button" class="btn btn-outline-danger btn-sm btn-block text-center mt-3 mb-3 w-100" id="btnExcluirAtivo" data-toggle="modal" data-target="#excluirModal">Excluir Patrimônio</button>
                            </div>
                        </div>
                    </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    

<!-- MODAL EDIÇÃO DE PATRIMONIO -->
<div class="modal fade" id="editarModal" tabindex="-1" role="dialog" aria-labelledby="editarModalLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <div class="modal-content rounded-lg shadow-lg">
      <div class="modal-header bg-light rounded-top">
        <h5 class="modal-title" id="editarModalLabel">Confirmar Edição</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        Tem certeza de que deseja editar este patrimônio?
      </div>
      <div class="modal-footer bg-light rounded-bottom">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
        <button type="button" class="btn btn-primary" onclick="enviarEdicao()">Confirmar</button>
      </div>
    </div>
  </div>
</div>


<!-- MODAL CONFIRMACAO DE EXCLUSAO DE PATRIMONIO-->
<div class="modal fade" id="excluirModal" tabindex="-1" role="dialog" aria-labelledby="excluirModalLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <div class="modal-content rounded-lg shadow-lg">
      <div class="modal-header bg-light rounded-top">
        <h5 class="modal-title" id="excluirModalLabel">Confirmar Exclusão</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        Tem certeza de que deseja excluir este patrimônio?
      </div>
      <div class="modal-footer bg-light rounded-bottom">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
        <button type="button" class="btn btn-danger" onclick="excluirPatrimonio()">Excluir</button>
      </div>
    </div>
  </div>
</div>


<!-- Modal imagem-->
<div class="modal fade" id="imagemModal" tabindex="-1" role="dialog" aria-labelledby="imagemModalLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <?php if ($img_patrimonio == null): ?>
            <h5 class="modal-title" id="imagemModalLabel">Não há imagem para este patrimônio</h5>
        <?php else: ?>
            <img src="<?= $img_url ?>" alt="Imagem do Patrimônio" style="max-width: 400px; height: auto;" data-toggle="modal" data-target="#imagemModal">
        <?php endif; ?>
      <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      
      <div class="modal-footer" style= "justify-content: center;">
        <button type="button" class="btn btn-danger" id="deleteImagemBtn">Excluir Imagem</button>
        <!-- se existe imagem, mostrar bota~o para editar imagem, senao mostrar bota~o para adicionar imagem -->
        <?php if (!empty($img_patrimonio)) { ?>
            <button type="button" class="btn btn-primary" id="editImagemBtn">Editar Imagem</button>
        <?php } else { ?>
            <button type="button" class="btn btn-primary" id="addImagemBtn">Adicionar Imagem</button>
        <?php } ?>
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
      </div>
    </div>
  </div>
</div>

<!-- Modal para editar a imagem -->
<div class="modal fade" id="editImagemModal" tabindex="-1" role="dialog" aria-labelledby="editImagemModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="editImagemModalLabel">Editar Imagem</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <form id="editImagemForm" method="POST" enctype="multipart/form-data">
                    <div class="form-group">
                        <label for="editImagemInput">Nova Imagem</label>
                        <input type="file" class="form-control-file" id="editImagemInput" name="editImagemInput">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="salvarImagem()">Salvar</button>
            </div>
        </div>
    </div>
</div>




<!-- jQuery e Bootstrap JS -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/cleave.js@1.6.0/dist/cleave.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.4/dist/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

<script>
document.addEventListener('DOMContentLoaded', function() {
    new Cleave('#valor', {
        numeral: true,
        numeralDecimalScale: 2,
        numeralDecimalMark: ',',
        numeralDecimalMark: '.',
        prefix: 'R$ ',
        noImmediatePrefix: true,
        rawValueTrimPrefix: true
    });
});

// Função para exibir o modal com a imagem
$(document).ready(function() {
    $('#imagemModal').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget); // Botão que abriu o modal
        var imgSrc = button.data('src'); // Extrai a URL da imagem
        var modal = $(this);
        modal.find('.modal-body img').attr('src', imgSrc); // Atualiza a imagem no modal
    });
});

// // Função para enviar edição
// function enviarEdicao() {
//     document.getElementById("editPatrimonio").submit();
// }
function enviarEdicao() {
    console.log("enviarEdicao() chamada");

    var editImagemInput = document.getElementById('img_patrimonio');
    var form = document.getElementById('editPatrimonio');
    
    if (!editImagemInput) {
        console.error("Campo de imagem não encontrado");
        return;
    }

    var imgPresent = editImagemInput.getAttribute('data-img-present') === 'true';

    if (!imgPresent) {
        console.error("Imagem não encontrada");
        form.enctype = "multipart/form-data"; // Define o tipo de codificação do formulário

    } else {
        console.log("Imagem encontrada");
        form.enctype = ""; // Remove o tipo de codificação do formulário

    }

    form.submit();



    
}





// Função para excluir patrimônio
function excluirPatrimonio() {
    var id = document.getElementsByName('id')[0].value;
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "./patrimonios_delete.php", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log(xhr.responseText);
            $('#excluirModal').modal('hide');
            alert("Patrimônio deletado com sucesso!");
            setTimeout(function() {window.location.href = './patrimonios.php';}, 1000);
        }
    };

    xhr.send("id=" + encodeURIComponent(id));
}

function salvarImagem() {
    // Pega o id do patrimonio e a imagem
    var id = document.getElementsByName('id')[0].value;
    var editImagemInput = document.getElementById('editImagemInput');
    var formData = new FormData();
    formData.append('editImagemInput', editImagemInput.files[0]);
    formData.append('id', id);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', './patrimonios_edit_imagem.php', true);

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log(xhr.responseText);
            $('#editImagemModal').modal('hide');
            alert("Imagem editada com sucesso!");
            setTimeout(function() { window.location.href = './patrimonios.php'; }, 1000);
        } else if (xhr.readyState === 4) {
            alert("Erro ao editar a imagem: " + xhr.statusText);
        }
    };

    xhr.send(formData);
}

// função para excluir a imagem
document.addEventListener('DOMContentLoaded', function() {
    // Evento para abrir o modal com a imagem
    $('.open-imagem-modal').on('click', function() {
        var id = document.getElementsByName('id')[0].value;
        var imgSrc = $(this).data('img-src');
        var patrimonioId = $(this).data('patrimonio-id'); // Adiciona o ID do patrimônio
        $('#modalImagem').attr('src', imgSrc);
        $('#imagemModal').data('patrimonio-id', id); // Armazena o ID do patrimônio no modal
        $('#imagemModal').modal('show');
    });
});


    

    // Evento para editar a imagem (placeholder)
    $('#editImagemBtn').on('click', function() {
        //fechat imGEm modal
        $('#imagemModal').modal('hide');
        $('#editImagemModal').modal('show');

    });

    //Evento para excluir a imagem
    $('#deleteImagemBtn').on('click', function() {
        var id = document.getElementsByName('id')[0].value;
        var patrimonioId = $('#imagemModal').data('patrimonio-id');
        var xhr = new XMLHttpRequest();
        //pergunta se o usuario tem certeza que deseja excluir a imagem
        if (confirm("Tem certeza que deseja excluir esta imagem?")) {
            xhr.open("POST", "./patrimonio_delete_img.php", true);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        } else {
            return;
        }

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                console.log(xhr.responseText);
                $('#imagemModal').modal('hide');
                alert("Imagem excluída com sucesso!");
                setTimeout(function() {window.location.href = './patrimonios.php';}, 1000);
            }
        };

        xhr.send("id=" + encodeURIComponent(id));
    });




</script>

</body>
</html>