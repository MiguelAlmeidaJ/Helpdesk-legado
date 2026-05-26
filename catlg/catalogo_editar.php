<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m8_04 != 2 && $m8_04 != 4 && $m8_04 != 6) {
    header("Location: ../index.php");
    exit;
}

$pdo = ConnectionN3();
$conteudo = "";
$titulo = "";
$categoria_id = "";
$catalogo_categoria = "";
$setor = 0;
$id = 0;
$cliente_id = 0;
$usuario_id = $_SESSION['allterusN3Id']; // ID do usuário logado

// Buscar clientes
$stmtClientes = $pdo->query("SELECT clt_id, clt_nomef FROM clientes ORDER BY clt_nomef ASC");
$clientes = $stmtClientes->fetchAll(PDO::FETCH_ASSOC);

$stmtCatalogoCategorias = $pdo->query("SELECT categoria_id, categoria_nome FROM catalogos_categoria ORDER BY categoria_nome ASC");
$categorias = $stmtCatalogoCategorias->fetchAll(PDO::FETCH_ASSOC);
// echo json_encode($categorias);

// Se estiver editando um catálogo
if (isset($_GET['id'])) {
    $id = intval($_GET['id']);
    $stmt = $pdo->prepare("SELECT * FROM catalogos WHERE id = ?");
    $stmt->execute([$id]);
    $catalogo = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($catalogo) {
        $titulo = $catalogo['titulo'];
        $conteudo = $catalogo['conteudo'];
        $cliente_id = $catalogo['cliente_id'];
        $catalogo_categoria = $catalogo['catalogo_categoria'];
        $setor = $catalogo['setor'];
    }
}

// Se o formulário for enviado
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Verifica se os campos existem antes de usá-los
    $titulo = isset($_POST['titulo']) ? trim($_POST['titulo']) : '';
    $conteudo = isset($_POST['conteudo']) ? trim($_POST['conteudo']) : '';
    $cliente_id = isset($_POST['cliente_id']) ? intval($_POST['cliente_id']) : 0;
    $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
    $catalogo_categoria = isset($_POST['catalogo_categoria']) ? intval($_POST['catalogo_categoria']) : 0;
    $setor = isset($_POST['setor']) ? intval($_POST['setor']) : 0;

    // Validação: Impede inserção de dados vazios no banco
    if (empty($titulo)) {
        die("Erro: O campo título é obrigatório.");
    }
    if ($cliente_id == 0) {
        die("Erro: Selecione um cliente válido.");
    }

    if ($catalogo_categoria == 0) {
        die("Erro: Selecione uma categoria.");
    }

    if ($setor == 0) {
        die("Erro: Selecione um setor válido.");
    }

    // Debug: Mostra os valores recebidos (remova depois de testar)
    // echo "Título: $titulo, Cliente ID: $cliente_id, ID: $id, Catálogo Categoria: $catalogo_categoria";
    // exit;

    if ($id > 0) {
        // Atualiza catálogo existente
        $stmt = $pdo->prepare("UPDATE catalogos 
            SET catalogo_categoria = ?, setor = ?, titulo = ?, conteudo = ?, cliente_id = ?, usuario_id = ?, data_edicao = NOW() 
            WHERE id = ?");
        $stmt->execute([$catalogo_categoria, $setor, $titulo, $conteudo, $cliente_id, $usuario_id, $id]);
    } else {
        // Insere novo catálogo
        $stmt = $pdo->prepare("INSERT INTO catalogos (catalogo_categoria, setor, titulo, conteudo, cliente_id, usuario_id, data_criacao, data_edicao) 
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([$catalogo_categoria, $setor, $titulo, $conteudo, $cliente_id, $usuario_id]);
        $id = $pdo->lastInsertId();
    }

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
    <title>Gerenciamento de Catálogos</title>
    <script src="../js/tinymce/tinymce.min.js"></script>

    <style>
        body {
            zoom: 0.9;
            width: 100%;
        }

        .tox-tinymce-aux {
            z-index: 9999 !important;
        }

        .tox-tooltip {
            position: absolute !important;
            transform: translateY(-10px) !important;
            /* Ajusta a altura */
            opacity: 1 !important;
            visibility: visible !important;
        }

        table {
            width: auto !important;
            max-width: 100% !important;
            margin: 0 !important;
            /* ?? Remove centralização */
            margin-left: 0px !important;
            /* ?? Garante alinhamento é esquerda */
            border-collapse: collapse !important;
            text-align: left !important;
            table-layout: auto !important;
            /* ?? Permite ajuste dinâmico */
            display: inline-table !important;
            /* ?? Mantém fluxo normal do conteúdo */
        }

        table tr {
            height: auto !important;
        }

        table td,
        table th {
            padding: 6px !important;
            border: 1px solid #ccc !important;
            text-align: left !important;
            white-space: normal !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            width: auto !important;
        }

        .tox .tox-edit-area {
            padding: 10px !important;
            padding-bottom: 0 !important;
            /* Adiciona margem branca dentro do editor */
            max-width: 1135px !important;
            /* Define um tamanho máximo */
            margin: 0 auto !important;
            /* Centraliza o conteúdo */
            background-color: white !important;
            /* Mantém fundo branco */
            border: 2px solid #ddd !important;
            /* ?? Adiciona uma borda sutil ao redor */
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1) !important;
            /* ?? Dá um efeito de destaque */
        }

        .tox .tox-editor-container {
            /* padding: 10px !important; */
            background: white !important;
        }

        .tox .tox-editor-container iframe {
            padding: 10px !important;
            /* Aplica margem interna dentro do editor */
        }

        .tox .tox-menubar {
            height: 30px !important;
            padding: 0 !important;
        }

        .tox .tox-editor-header {
            height: 50px !important;
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid">
        <div class="row mt-1 justify-content-md-center">
            <div class="col-md-12">
                <div class="card" style="overflow-x: hidden;overflow-y: hidden; min-height: 93vh; max-height: 93vh">
                    <form method="post">
                        <input type="hidden" name="id" value="<?php echo $id; ?>">

                        <div class="h6 card-header">
                            <div class="row">
                                <div class="col-md-2 d-flex align-items-center">
                                    <i class="fas fa-book mr-2"></i>
                                    <span><?php echo $id ? "Editar Catálogo" : "Novo Catálogo"; ?></span>
                                </div>

                                <div class="col-md-8 d-flex align-items-center">

                                    <!-- Setor -->
                                    <div class="col-md-2">
                                        <label for="setor" class="mb-0"><b>Setor:</b></label>
                                        <select name="setor" id="setor" class="form-control form-control-sm" required>
                                            <?php
                                            if ($m8_04 == 1 || $m8_04 == 2) {
                                                echo '<option value="1" ' . ($setor == 1 ? 'selected' : '') . '>TI</option>';
                                            } elseif ($m8_04 == 3 || $m8_04 == 4) {
                                                echo '<option value="2" ' . ($setor == 2 ? 'selected' : '') . '>DevOps</option>';
                                            } elseif ($m8_04 == 5 || $m8_04 == 6) {
                                                echo '<option value="">Selecione</option>';
                                                echo '<option value="1" ' . ($setor == 1 ? 'selected' : '') . '>TI</option>';
                                                echo '<option value="2" ' . ($setor == 2 ? 'selected' : '') . '>DevOps</option>';
                                            }
                                            ?>
                                        </select>
                                    </div>




                                    <!-- Categoria -->
                                    <div class="col-md-3">
                                        <label for="catalogo_categoria" class="mb-0">Categoria:</label>
                                        <select name="catalogo_categoria" id="catalogo_categoria" class="form-control form-control-sm" required>
                                            <option value="">Selecione</option>
                                            <?php foreach ($categorias as $categoria) : ?>
                                                <option value="<?php echo $categoria['categoria_id']; ?>"
                                                    <?php echo ($categoria['categoria_id'] == $catalogo_categoria) ? 'selected' : ''; ?>>
                                                    <?php echo htmlspecialchars($categoria['categoria_nome']); ?>
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>


                                    <!-- Cliente -->
                                    <div class="col-md-4">
                                        <label for="cliente_id" class="mb-0"><b>Cliente:</b></label>
                                        <select name="cliente_id" id="cliente_id" class="form-control form-control-sm" required>
                                            <option value="">Selecione</option>
                                            <?php foreach ($clientes as $cliente) : ?>
                                                <option value="<?php echo $cliente['clt_id']; ?>" <?php echo ($cliente['clt_id'] == $cliente_id) ? 'selected' : ''; ?>>
                                                    <?php echo htmlspecialchars($cliente['clt_nomef']); ?>
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>

                                    <!-- Título -->
                                    <div class="col-md-4">
                                        <label for="titulo" class="mb-0"><b>Título:</b></label>
                                        <input type="text" name="titulo" id="titulo" class="form-control form-control-sm"
                                            value="<?php echo htmlspecialchars($titulo); ?>" required>
                                    </div>
                                </div>
                                <div class="col-md-2 text-right">
                                    <a href="catalogo.php" id="botaoVoltar" class="btn btn-secondary btn-sm mr-3 mt-3">Voltar</a>
                                    <button type="submit" class="btn btn-primary btn-sm mr-2 mt-3">Salvar</button>
                                </div>
                            </div>
                        </div>

                        <div class="card-body p-1">
                            <!-- Conteúdo -->
                            <div class="form-group">
                                <textarea id="editor" name="conteudo" class="form-control"><?php echo htmlspecialchars($conteudo); ?></textarea>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            let formAlterado = false;
            let valoresOriginais = {};

            // Captura valores iniciais
            function armazenarValoresOriginais() {
                valoresOriginais['cliente_id'] = document.getElementById('cliente_id').value;
                valoresOriginais['titulo'] = document.getElementById('titulo').value;
                valoresOriginais['conteudo'] = tinymce.get('editor').getContent();
                valoresOriginais['setor'] = document.getElementById('setor').value;
                valoresOriginais['catalogo_categoria'] = document.getElementById('catalogo_categoria').value;
            }

            // Compara valores para detectar alteração real
            function formularioFoiAlterado() {
                return (
                    document.getElementById('cliente_id').value !== valoresOriginais['cliente_id'] ||
                    document.getElementById('titulo').value !== valoresOriginais['titulo'] ||
                    document.getElementById('setor').value !== valoresOriginais['setor'] ||
                    document.getElementById('catalogo_categoria').value !== valoresOriginais['catalogo_categoria'] ||
                    tinymce.get('editor').getContent() !== valoresOriginais['conteudo']

                );
            }

            // Inicializa o TinyMCE
            tinymce.init({
                selector: '#editor',
                content_style: `
                table { border-collapse: collapse; border-spacing: 0; }
                th, td { border: 1px solid #ccc; padding: 6px; text-align: left; word-break: break-word; white-space: normal; }
            `,
                plugins: 'image link lists media table paste',
                toolbar: 'undo redo | bold italic underline | alignleft aligncenter alignright | numlist bullist | link image media table moveLeft moveRight removeSpacing adjustRowCol normalizeTable',
                paste_data_images: true,
                branding: false,
                promotion: false,
                license_key: 'gpl',
                elementpath: false,
                statusbar: false,
                language: 'pt_BR',
                height: Math.max(window.innerHeight * 0.83, 560),

                //CARREGAR IMAGENS
                images_upload_handler: function(blobInfo) {
                    return new Promise((resolve, reject) => {
                        let reader = new FileReader();

                        reader.onload = function() {
                            // console.log("Imagem convertida com sucesso:", reader.result); // Teste se a imagem foi convertida corretamente
                            resolve(reader.result); // Retorna a imagem em Base64 corretamente
                        };

                        reader.onerror = function() {
                            reject("Erro ao converter imagem para Base64");
                        };

                        reader.readAsDataURL(blobInfo.blob());
                    });
                },


                table_advtab: true, // Habilita aba avançada para propriedades da tabela
                table_resize_bars: true, // Permite redimensionar colunas e linhas
                //table_responsive_width: true, // Ajusta automaticamente a largura da tabela
                table_default_attributes: {
                    border: '1',
                    cellspacing: '0',
                    cellpadding: '0'
                }, // Define atributos padrão

                setup: function(editor) {
                    editor.on('init', function() {
                        armazenarValoresOriginais();
                    });

                    editor.on('change', function() {
                        formAlterado = formularioFoiAlterado();
                    });

                    // Adicionar suporte ao Tab e Shift + Tab para indentação em listas e espaços em parágrafos
                    editor.on('keydown', function(event) {
                        if (event.key === 'Tab') {
                            event.preventDefault();
                            if (event.shiftKey) {
                                editor.execCommand('Outdent'); // Shift + Tab reduz indentação (listas)
                            } else {
                                let selectedNode = editor.selection.getNode();
                                if (selectedNode.nodeName === 'LI') {
                                    editor.execCommand('Indent'); // Tab aumenta indentação (listas)
                                } else {
                                    editor.execCommand('mceInsertContent', false, '&nbsp;&nbsp;&nbsp;&nbsp;'); // Insere 4 espaços no parágrafo
                                }
                            }
                        }
                    });

                    // ?? Botão para remover espaçamentos antes/depois dos parágrafos
                    editor.ui.registry.addButton('removeSpacing', {
                        text: '??',
                        tooltip: 'Remover Espaçamento do Texto Selecionado',
                        onAction: function() {
                            let selectedContent = editor.selection.getContent({
                                format: 'html'
                            });

                            if (selectedContent) {
                                let modifiedContent = selectedContent.replace(/<p([^>]*)>/g, '<p style="margin-top: 0px; margin-bottom: 0px;"$1>');
                                editor.selection.setContent(modifiedContent);
                            }
                        }
                    });

                    editor.ui.registry.addButton('normalizeTable', {
                        text: '??',
                        tooltip: 'Corrigir Tabela e Alinhar é Esquerda',
                        onAction: function() {
                            let table = editor.dom.getParent(editor.selection.getNode(), 'table');
                            if (table) {
                                table.removeAttribute('style'); // ?? Remove estilos inline antigos

                                table.style.width = 'auto'; // ?? Mantém largura ajustável
                                table.style.maxWidth = '100%'; // ?? Garante que a tabela não ultrapasse os limites do editor
                                table.style.margin = '0'; // ?? Remove qualquer centralização automática
                                table.style.marginLeft = '0'; // ?? Garante alinhamento total é esquerda
                                table.style.borderCollapse = 'collapse'; // ?? Evita bordas duplicadas
                                table.style.tableLayout = 'auto'; // ?? Permite ajuste natural das colunas
                                table.style.display = 'inline-table'; // ?? Mantém fluxo normal do conteúdo

                                let rows = table.querySelectorAll('tr');
                                rows.forEach(row => {
                                    row.style.height = 'auto'; // ?? Mantém altura dinâmica das linhas
                                });

                                let cells = table.querySelectorAll('td, th');
                                cells.forEach(cell => {
                                    cell.removeAttribute('style'); // ?? Remove estilos inline para evitar conflito
                                    cell.style.padding = '5px';
                                    cell.style.border = '1px solid #ccc';
                                    cell.style.textAlign = 'left';
                                    cell.style.wordBreak = 'break-word';
                                    cell.style.width = 'auto'; // ?? Mantém células ajustáveis conforme o conteúdo
                                });

                                alert('Tabela corrigida e alinhada é esquerda corretamente!');
                            } else {
                                alert('Selecione uma tabela para ajustar.');
                            }
                        }
                    });



                    // ?? Botão para ajustar medidas da tabela (altura e largura)
                    editor.ui.registry.addButton('adjustRowCol', {
                        text: '??',
                        tooltip: 'Ajustar Altura das Linhas e Largura das Colunas',
                        onAction: function() {
                            let table = editor.dom.getParent(editor.selection.getNode(), 'table');

                            if (table) {
                                let newRowHeight = prompt("Digite a nova altura das linhas (em px):", "30");
                                let newColWidth = prompt("Digite a nova largura das colunas (em px ou %):", "auto");

                                // ?? Aplica a nova altura das linhas corretamente
                                if (newRowHeight) {
                                    let rows = table.querySelectorAll('tr');
                                    rows.forEach(row => {
                                        row.style.height = newRowHeight + 'px';
                                    });
                                }

                                // ?? Aplica a nova largura das colunas corretamente
                                if (newColWidth) {
                                    let cols = table.querySelectorAll('td, th');
                                    cols.forEach(col => {
                                        col.style.width = newColWidth;
                                        col.style.maxWidth = newColWidth; // Evita expansão excessiva
                                        col.style.wordBreak = 'break-word'; // Evita estouro de conteúdo
                                        col.style.whiteSpace = 'normal'; // Mantém o texto ajustado dentro da célula
                                    });
                                }

                                // ?? Garante que a tabela respeite as novas dimensões corretamente
                                // table.style.tableLayout = 'fixed';
                                // table.style.width = '100%';
                                //aplica as novas medidas corretamente
                                table.style.width = 'auto'; // ?? Mantém a largura ajustável conforme o conteúdo
                                table.style.maxWidth = '100%'; // ?? Evita que a tabela ultrapasse o limite do editor
                                table.style.margin = '0px'; // ?? Remove qualquer centralização automática
                                table.style.marginLeft = '0px'; // ?? Força alinhamento total é esquerda
                                table.style.borderCollapse = 'collapse'; // ?? Evita bordas duplicadas
                                table.style.tableLayout = 'fixed'; // ?? Mantém colunas proporcionais


                            } else {
                                alert("Selecione uma tabela para ajustar.");
                            }
                        }
                    });



                    // Adicionar suporte ao Tab e Shift + Tab para indentação em listas e espaços em parágrafos
                    editor.ui.registry.addButton('removeSpacing', {
                        text: '??', // ícone de limpeza
                        tooltip: 'Remover Espaçamento do Texto Selecionado',
                        onAction: function() {
                            let selectedContent = editor.selection.getContent({
                                format: 'html'
                            }); // Obtém o HTML da seleção

                            if (selectedContent) {
                                // Remove margens do conteúdo selecionado
                                let modifiedContent = selectedContent.replace(/<p([^>]*)>/g, '<p style="margin-top: 0px; margin-bottom: 0px;"$1>');

                                // Substitui o conteúdo no editor
                                editor.selection.setContent(modifiedContent);
                            }
                        }
                    });

                    // ?? Mover tabela para a esquerda sem ultrapassar a margem esquerda
                    editor.addCommand('moveTableLeft', function() {
                        let table = editor.dom.getParent(editor.selection.getNode(), 'table');
                        if (table) {
                            let currentMargin = parseInt(editor.dom.getStyle(table, 'margin-left')) || 0;
                            if (currentMargin > 0) { // Impede que ultrapasse a margem esquerda
                                let newMargin = Math.max(0, currentMargin - 20);
                                editor.dom.setStyle(table, 'margin-left', `${newMargin}px`);
                            }
                            updateTableButtons(table);
                        }
                    });

                    // ?? Mover tabela para a direita
                    editor.addCommand('moveTableRight', function() {
                        let table = editor.dom.getParent(editor.selection.getNode(), 'table');
                        if (table) {
                            let currentMargin = parseInt(editor.dom.getStyle(table, 'margin-left')) || 0;
                            let newMargin = currentMargin + 20;
                            editor.dom.setStyle(table, 'margin-left', `${newMargin}px`);
                            updateTableButtons(table);
                        }
                    });

                    // Adicionar botões para mover a tabela manualmente
                    editor.ui.registry.addButton('moveLeft', {
                        text: '??',
                        tooltip: 'Mover tabela para esquerda',
                        onAction: function() {
                            editor.execCommand('moveTableLeft');
                        }
                    });

                    editor.ui.registry.addButton('moveRight', {
                        text: '??',
                        tooltip: 'Mover tabela para direita',
                        onAction: function() {
                            editor.execCommand('moveTableRight');
                        }
                    });

                }
            });



            // Monitora mudanças nos inputs normais
            document.querySelectorAll('input, select').forEach(el => {
                el.addEventListener('input', function() {
                    formAlterado = formularioFoiAlterado();
                });
            });

            // Reseta ao enviar o formulário
            document.querySelector('form').addEventListener('submit', function() {
                formAlterado = false;
            });

            // Alerta antes de sair se houver alterações reais
            window.addEventListener('beforeunload', function(event) {
                if (formAlterado) {
                    event.preventDefault();
                    event.returnValue = "Você tem alterações não salvas. Deseja realmente sair?";
                }
            });

            // Confirmação ao clicar no botão "Voltar"
            document.getElementById('botaoVoltar').addEventListener('click', function(event) {
                if (formAlterado) {
                    let confirmarSaida = confirm("Você tem alterações não salvas. Deseja realmente sair?");
                    if (!confirmarSaida) {
                        event.preventDefault();
                    }
                }
            });
        });
    </script>


    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

</body>

</html>