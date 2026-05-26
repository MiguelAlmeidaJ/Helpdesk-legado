
<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../ativos/ativos_conect.php");

// Verifica se os parâmetros recebidos por get e atribui valores a variáveis
$page_voltar = isset($_GET['page']) ? htmlspecialchars($_GET['page']) : '';
$limit_voltar = isset($_GET['limit']) ? htmlspecialchars($_GET['limit']) : '';
$ord_voltar = isset($_GET['ord']) ? htmlspecialchars($_GET['ord']) : '';
$empresa_voltar = isset($_GET['empresa']) ? htmlspecialchars($_GET['empresa']) : '';
$nome_computador_voltar = isset($_GET['nome_computador']) ? htmlspecialchars($_GET['nome_computador']) : '';
$endereco_mac_voltar = isset($_GET['endereco_mac']) ? htmlspecialchars($_GET['endereco_mac']) : '';

// Estabelece a conexão com o banco de dados plugins_app
$pdoAtivos = ConnectionPluginsApp();
if (!$pdoAtivos) {
    exit("Erro ao conectar ao banco de dados plugins_app."); // Exibe mensagem de erro se a conexão falhar
}

// Verifica se o formulário foi enviado
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id'])) {
    // Sanitiza e valida os dados recebidos do formulário
    $id = filter_input(INPUT_POST, 'id', FILTER_SANITIZE_NUMBER_INT);
    $hora_da_coleta = filter_input(INPUT_POST, 'hora_da_coleta', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $empresa = filter_input(INPUT_POST, 'empresa', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $nome_computador = filter_input(INPUT_POST, 'nome_computador', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $sistema_operacional = filter_input(INPUT_POST, 'sistema_operacional', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $versao_sistema = filter_input(INPUT_POST, 'versao_sistema', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $arquitetura = filter_input(INPUT_POST, 'arquitetura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $processador = filter_input(INPUT_POST, 'processador', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $nucleos_fisicos = filter_input(INPUT_POST, 'nucleos_fisicos', FILTER_SANITIZE_NUMBER_INT);
    $threads = filter_input(INPUT_POST, 'threads', FILTER_SANITIZE_NUMBER_INT);
    $frequencia_max_cpu = filter_input(INPUT_POST, 'frequencia_max_cpu', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $frequencia_max_memoria = filter_input(INPUT_POST, 'frequencia_max_memoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $placa_de_video = filter_input(INPUT_POST, 'placa_de_video', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $armazenamento_disco_total = filter_input(INPUT_POST, 'armazenamento_disco_total', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $armazenamento_disco_uso = filter_input(INPUT_POST, 'armazenamento_disco_uso', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $armazenamento_disco_livre = filter_input(INPUT_POST, 'armazenamento_disco_livre', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $armazenamento_porcentagem_uso = filter_input(INPUT_POST, 'armazenamento_porcentagem_uso', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $tipo_de_armazenamento = filter_input(INPUT_POST, 'tipo_de_armazenamento', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $memoria_ram_total = filter_input(INPUT_POST, 'memoria_ram_total', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $memoria_ram_em_uso = filter_input(INPUT_POST, 'memoria_ram_em_uso', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $memoria_ram_disponivel = filter_input(INPUT_POST, 'memoria_ram_disponivel', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $percentual_uso_memoria = filter_input(INPUT_POST, 'percentual_uso_memoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $fabricante_placa_mae = filter_input(INPUT_POST, 'fabricante_placa_mae', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $nome_placa_mae = filter_input(INPUT_POST, 'nome_placa_mae', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $versao_placa_mae = filter_input(INPUT_POST, 'versao_placa_mae', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $numero_serie_placa_mae = filter_input(INPUT_POST, 'numero_serie_placa_mae', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $endereco_mac = filter_input(INPUT_POST, 'endereco_mac', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $endereco_ip = filter_input(INPUT_POST, 'endereco_ip', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $firewall_dominio = filter_input(INPUT_POST, 'firewall_dominio', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $firewall_publico = filter_input(INPUT_POST, 'firewall_publico', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $firewall_privado = filter_input(INPUT_POST, 'firewall_privado', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $rede_detalhada = filter_input(INPUT_POST, 'rede_detalhada', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $observacoes = filter_input(INPUT_POST, 'observacoes', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

    // Atualiza os dados do ativo no banco de dados
    $stmt = $pdoAtivos->prepare("UPDATE ativos SET hora_da_coleta = :hora_da_coleta, empresa = :empresa, nome_computador = :nome_computador, sistema_operacional = :sistema_operacional, versao_sistema = :versao_sistema, arquitetura = :arquitetura, processador = :processador, nucleos_fisicos = :nucleos_fisicos, threads = :threads, frequencia_max_cpu = :frequencia_max_cpu, frequencia_max_memoria = :frequencia_max_memoria, placa_de_video = :placa_de_video, armazenamento_disco_total = :armazenamento_disco_total, armazenamento_disco_uso = :armazenamento_disco_uso, armazenamento_disco_livre = :armazenamento_disco_livre, armazenamento_porcentagem_uso = :armazenamento_porcentagem_uso, tipo_de_armazenamento = :tipo_de_armazenamento, memoria_ram_total = :memoria_ram_total, memoria_ram_em_uso = :memoria_ram_em_uso, memoria_ram_disponivel = :memoria_ram_disponivel, percentual_uso_memoria = :percentual_uso_memoria, fabricante_placa_mae = :fabricante_placa_mae, nome_placa_mae = :nome_placa_mae, versao_placa_mae = :versao_placa_mae, numero_serie_placa_mae = :numero_serie_placa_mae, endereco_mac = :endereco_mac, endereco_ip = :endereco_ip, firewall_dominio = :firewall_dominio, firewall_publico = :firewall_publico, firewall_privado = :firewall_privado, rede_detalhada = :rede_detalhada, observacoes = :observacoes WHERE id = :id");
    if (!$stmt) {
        exit("Erro na atualização do ativo: " . $pdoAtivos->errorInfo()[2]); // Exibe mensagem de erro se a consulta falhar
    }

    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->bindParam(':hora_da_coleta', $hora_da_coleta);
    $stmt->bindParam(':empresa', $empresa, PDO::PARAM_STR);
    $stmt->bindParam(':nome_computador', $nome_computador);
    $stmt->bindParam(':sistema_operacional', $sistema_operacional);
    $stmt->bindParam(':versao_sistema', $versao_sistema);
    $stmt->bindParam(':arquitetura', $arquitetura);
    $stmt->bindParam(':processador', $processador);
    $stmt->bindParam(':nucleos_fisicos', $nucleos_fisicos);
    $stmt->bindParam(':threads', $threads);
    $stmt->bindParam(':frequencia_max_cpu', $frequencia_max_cpu);
    $stmt->bindParam(':frequencia_max_memoria', $frequencia_max_memoria);
    $stmt->bindParam(':placa_de_video', $placa_de_video);
    $stmt->bindParam(':armazenamento_disco_total', $armazenamento_disco_total);
    $stmt->bindParam(':armazenamento_disco_uso', $armazenamento_disco_uso);
    $stmt->bindParam(':armazenamento_disco_livre', $armazenamento_disco_livre);
    $stmt->bindParam(':armazenamento_porcentagem_uso', $armazenamento_porcentagem_uso);
    $stmt->bindParam(':tipo_de_armazenamento', $tipo_de_armazenamento);
    $stmt->bindParam(':memoria_ram_total', $memoria_ram_total);
    $stmt->bindParam(':memoria_ram_em_uso', $memoria_ram_em_uso);
    $stmt->bindParam(':memoria_ram_disponivel', $memoria_ram_disponivel);
    $stmt->bindParam(':percentual_uso_memoria', $percentual_uso_memoria);
    $stmt->bindParam(':fabricante_placa_mae', $fabricante_placa_mae);
    $stmt->bindParam(':nome_placa_mae', $nome_placa_mae);
    $stmt->bindParam(':versao_placa_mae', $versao_placa_mae);
    $stmt->bindParam(':numero_serie_placa_mae', $numero_serie_placa_mae);
    $stmt->bindParam(':endereco_mac', $endereco_mac);
    $stmt->bindParam(':endereco_ip', $endereco_ip);
    $stmt->bindParam(':firewall_dominio', $firewall_dominio);
    $stmt->bindParam(':firewall_publico', $firewall_publico);
    $stmt->bindParam(':firewall_privado', $firewall_privado);
    $stmt->bindParam(':rede_detalhada', $rede_detalhada);
    $stmt->bindParam(':observacoes', $observacoes);


    if ($stmt->execute()) {
        // Redireciona para a página de edição com um parâmetro de sucesso
        header("Location: ativos_edit.php?id=$id&success=1");
        exit();
    } else {
        exit("Erro ao atualizar os dados do ativo."); // Exibe mensagem de erro se a atualização falhar
    }
} else if (isset($_GET['id'])) {
    // consulta o ativo pelo id no banco de dados
    $id = $_GET['id'];
    $stmt = $pdoAtivos->prepare("SELECT * FROM ativos WHERE id = :id");
    if (!$stmt) {
        exit("Erro na consulta do ativo: " . $pdoAtivos->errorInfo()[2]); // Exibe mensagem de erro se a consulta falhar
    }
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $ativo = $stmt->fetch(PDO::FETCH_ASSOC);

    // insere os dados do ativo no formulário
    if ($ativo) {
        $id = $ativo['id'];
        $hora_da_coleta = $ativo['hora_da_coleta'];
        $empresa = $ativo['empresa'];
        $nome_computador = $ativo['nome_computador'];
        $sistema_operacional = $ativo['sistema_operacional'];
        $versao_sistema = $ativo['versao_sistema'];
        $arquitetura = $ativo['arquitetura'];
        $processador = $ativo['processador'];
        $nucleos_fisicos = $ativo['nucleos_fisicos'];
        $threads = $ativo['threads'];
        $frequencia_max_cpu = $ativo['frequencia_max_cpu'];
        $frequencia_max_memoria = $ativo['frequencia_max_memoria'];
        $placa_de_video = $ativo['placa_de_video'];
        $armazenamento_disco_total = $ativo['armazenamento_disco_total'];
        $armazenamento_disco_uso = $ativo['armazenamento_disco_uso'];
        $armazenamento_disco_livre = $ativo['armazenamento_disco_livre'];
        $armazenamento_porcentagem_uso = $ativo['armazenamento_porcentagem_uso'];
        $tipo_de_armazenamento = $ativo['tipo_de_armazenamento'];
        $memoria_ram_total = $ativo['memoria_ram_total'];
        $memoria_ram_em_uso = $ativo['memoria_ram_em_uso'];
        $memoria_ram_disponivel = $ativo['memoria_ram_disponivel'];
        $percentual_uso_memoria = $ativo['percentual_uso_memoria'];
        $fabricante_placa_mae = $ativo['fabricante_placa_mae'];
        $nome_placa_mae = $ativo['nome_placa_mae'];
        $versao_placa_mae = $ativo['versao_placa_mae'];
        $numero_serie_placa_mae = $ativo['numero_serie_placa_mae'];
        $endereco_mac = $ativo['endereco_mac'];
        $endereco_ip = $ativo['endereco_ip'];
        $firewall_dominio = $ativo['firewall_dominio'];
        $firewall_publico = $ativo['firewall_publico'];
        $firewall_privado = $ativo['firewall_privado'];
        $rede_detalhada = $ativo['rede_detalhada'];
        $cadastro = $ativo['data_insercao'];
        $observacoes = $ativo['observacoes'];


    }
}
//formatando a data
$data_cadastro = date('d/m/Y H:i:s', strtotime($cadastro));

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
        <div class="row mt-1 justify-content-md-center col-md-12">
            <div style="margin-right: 40px; margin-left: 40px">
            <div class="card">
                <div class="h6 card-header">
                    <i class="fas fa-pencil-alt text-primary"></i> Editar Ativo
                </div>
                <?php if (isset($_GET['success'])): ?>
                <div class="alert alert-success" role="alert">
                    Ativo editado com sucesso!
                </div>
                <?php endif; ?>
                <form id="editAtivo" action="ativos_edit.php" method="POST">
                    <input type="hidden" name="id" value="<?php echo htmlspecialchars($id); ?>"> <!-- Adiciona o campo oculto para armazenar o ID do ativo -->
                    <div class="row form-row-spacing" style=" margin-top: 6px">

                        <div class="col-md-4 d-flex align-items-center" >
                            <div class="form-group w-100">
                                <label for="empresa">Empresa</label>
                                <input type="text" class="form-control" id="empresa" name="empresa" value="<?php echo $empresa; ?>" required>
                            </div>
                        </div>
                        <div class="col-md-4 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="nome_computador"style="white-space: nowrap;">Nome do Computador</label>
                                <input type="text" class="form-control" id="nome_computador" name="nome_computador" value="<?php echo $nome_computador; ?>" required>
                            </div>
                        </div>
                        <div class="col-md-3 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="sistema_operacional"style="white-space: nowrap;">Sistema Operacional</label>
                                <input type="text" class="form-control" id="sistema_operacional" name="sistema_operacional" value="<?php echo $sistema_operacional; ?>">
                            </div>
                        </div>
                        <div class="col-md-1 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="arquitetura">Arquitetura</label>
                                <input type="text" class="form-control" id="arquitetura" name="arquitetura" value="<?php echo $arquitetura; ?>">
                            </div>
                        </div>
                    </div>

                    
                    <div class="row form-row-spacing">

                        <div class="col-md-4 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="processador">Processador</label>
                                <input type="text" class="form-control" id="processador" name="processador" value="<?php echo $processador; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="versao_sistema" style="white-space: nowrap;">Versão do Sistema</label>
                                <input type="text" class="form-control" id="versao_sistema" name="versao_sistema" value="<?php echo $versao_sistema; ?>">
                            </div>
                        </div>

                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="frequencia_max_cpu" style="white-space: nowrap;">Freq. Máx. CPU</label>
                                <input type="text" class="form-control" id="frequencia_max_cpu" name="frequencia_max_cpu" value="<?php echo $frequencia_max_cpu; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="frequencia_max_memoria" style="white-space: nowrap;">Freq. Máx. Memória</label>
                                <input type="text" class="form-control" id="frequencia_max_memoria" name="frequencia_max_memoria" value="<?php echo $frequencia_max_memoria; ?>" >
                            </div>
                        </div>
  
                        
                        <div class="col-md-1 d-flex align-items-center">
                            <div class="form-group">
                                <label for="nucleos_fisicos">Núcleos</label>
                                <input type="number" class="form-control" id="nucleos_fisicos" name="nucleos_fisicos" value="<?php echo $nucleos_fisicos; ?>">
                            </div>
                        </div>
                        <div class="col-md-1 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="threads">Threads</label>
                                <input type="number" class="form-control" id="threads" name="threads" value="<?php echo $threads; ?>" >
                            </div>
                        </div>
                      
                    </div>

                    <div class="row form-row-spacing">
                        <div class="col-md-4 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="placa_de_video"style="white-space: nowrap;">Placa de Vídeo</label>
                                <input type="text" class="form-control" id="placa_de_video" name="placa_de_video" value="<?php echo $placa_de_video; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="armazenamento_disco_total"style="white-space: nowrap;">Armaz. Total</label>
                                <input type="text" class="form-control" id="armazenamento_disco_total" name="armazenamento_disco_total" value="<?php echo $armazenamento_disco_total; ?>" required>
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="armazenamento_disco_uso"style="white-space: nowrap;">Armaz. em Uso</label>
                                <input type="text" class="form-control" id="armazenamento_disco_uso" name="armazenamento_disco_uso" value="<?php echo $armazenamento_disco_uso; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="armazenamento_disco_livre"style="white-space: nowrap;">Armaz. Livre</label>
                                <input type="text" class="form-control" id="armazenamento_disco_livre" name="armazenamento_disco_livre" value="<?php echo $armazenamento_disco_livre; ?>">
                            </div>
                        </div>
                        <div class="col-md-1 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="armazenamento_porcentagem_uso"style="white-space: nowrap;">% Uso</label>
                                <input type="text" class="form-control" id="armazenamento_porcentagem_uso" name="armazenamento_porcentagem_uso" value="<?php echo $armazenamento_porcentagem_uso; ?>">
                            </div>
                        </div>
                        <div class="col-md-1 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="tipo_de_armazenamento"style="white-space: nowrap;">Tipo de Armaz.</label>
                                <input type="text" class="form-control" id="tipo_de_armazenamento" name="tipo_de_armazenamento" value="<?php echo $tipo_de_armazenamento; ?>">
                            </div>
                        </div>
                    </div>
        
                    <div class="row form-row-spacing">

                        
                        <div class="col-md-4 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="fabricante_placa_mae"style="white-space: nowrap;">Fabricante da Placa Mãe</label>
                                <input type="text" class="form-control" id="fabricante_placa_mae" name="fabricante_placa_mae" value="<?php echo $fabricante_placa_mae; ?>">
                            </div>
                        </div>

                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="memoria_ram_total"style="white-space: nowrap;">Memória RAM Total</label>
                                <input type="text" class="form-control" id="memoria_ram_total" name="memoria_ram_total" value="<?php echo $memoria_ram_total; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="memoria_ram_em_uso"style="white-space: nowrap;">Memória RAM em Uso</label>
                                <input type="text" class="form-control" id="memoria_ram_em_uso" name="memoria_ram_em_uso" value="<?php echo $memoria_ram_em_uso; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="memoria_ram_disponivel"style="white-space: nowrap;">Memória RAM Livre</label>
                                <input type="text" class="form-control" id="memoria_ram_disponivel" name="memoria_ram_disponivel" value="<?php echo $memoria_ram_disponivel; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="percentual_uso_memoria"style="white-space: nowrap;">% Uso da Memória</label>
                                <input type="text" class="form-control" id="percentual_uso_memoria" name="percentual_uso_memoria" value="<?php echo $percentual_uso_memoria; ?>">
                            </div>
                        </div>

                    </div>
                            
                    <div class="row form-row-spacing">
                      
                        <div class="col-md-4 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="nome_placa_mae"style="white-space: nowrap;">Nome da Placa Mãe</label>
                                <input type="text" class="form-control" id="nome_placa_mae" name="nome_placa_mae" value="<?php echo $nome_placa_mae; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="firewall_dominio"style="white-space: nowrap;">Firewall Domínio</label>
                                <input type="text" class="form-control" id="firewall_dominio" name="firewall_dominio" value="<?php echo $firewall_dominio; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="firewall_publico"style="white-space: nowrap;">Firewall Público</label>
                                <input type="text" class="form-control" id="firewall_publico" name="firewall_publico" value="<?php echo $firewall_publico; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="firewall_privado"style="white-space: nowrap;">Firewall Privado</label>
                                <input type="text" class="form-control" id="firewall_privado" name="firewall_privado" value="<?php echo $firewall_privado; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="data_cadastro"style="white-space: nowrap;">Cadastrado</label>
                                <input type="text" class="form-control" id="data_cadastro" name="data_cadastro" value="<?php echo $data_cadastro; ?>" required>
                            </div>
                        </div>

                    </div>

                    <div class="row form-row-spacing">
                        
                        <div class="col-md-4 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="numero_serie_placa_mae"style="white-space: nowrap;">N. Série Placa Mãe</label>
                                <input type="text" class="form-control" id="numero_serie_placa_mae" name="numero_serie_placa_mae" value="<?php echo $numero_serie_placa_mae; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="versao_placa_mae"style="white-space: nowrap;">Versão da Placa Mãe</label>
                                <input type="text" class="form-control" id="versao_placa_mae" name="versao_placa_mae" value="<?php echo $versao_placa_mae; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="endereco_ip"style="white-space: nowrap;">Endereço IP</label>
                                <input type="text" class="form-control" id="endereco_ip" name="endereco_ip" value="<?php echo $endereco_ip; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="endereco_mac"style="white-space: nowrap;">Endereço MAC</label>
                                <input type="text" class="form-control" id="endereco_mac" name="endereco_mac" value="<?php echo $endereco_mac; ?>">
                            </div>
                        </div>
                        <div class="col-md-2 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="hora_da_coleta"style="white-space: nowrap;">Ultima Atualização</label>
                                <input type="text" class="form-control" id="hora_da_coleta" name="hora_da_coleta" value="<?php echo $hora_da_coleta; ?>" required>
                            </div>
                        </div>


                    </div>

                    <div class="row form-row-spacing">
                        <div class="col-md-6 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="rede_detalhada"style="white-space: nowrap;">Rede Detalhada</label>
                                <textarea class="form-control" id="rede_detalhada" name="rede_detalhada" rows="3"><?php echo $rede_detalhada; ?></textarea>
                            </div>
                        </div>

                        <div class="col-md-6 d-flex align-items-center">
                            <div class="form-group w-100">
                                <label for="observacoes"style="white-space: nowrap;">Observações</label>
                                <textarea class="form-control" id="observacoes" name="observacoes" rows="3"><?php echo $observacoes; ?></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="container">
                        <div class="row p-0 justify-content-md-center">
                            <div class="col-md-3 d-flex justify-content-center p-1">
                                <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center mt-3 mb-3 w-100" onclick="location.href='ativos.php?page=<?php echo $page_voltar; ?>&limit=<?php echo $limit_voltar; ?>&ord=<?php echo $ord_voltar; ?>&empresa=<?php echo $empresa_voltar; ?>&nome_computador=<?php echo $nome_computador_voltar; ?>&endereco_mac=<?php echo $endereco_mac_voltar; ?>'">Voltar / Cancelar</button>
                            </div>                               
                            <div class="col-md-3 d-flex justify-content-center p-1">
                                <button type="button" class="btn btn-outline-success btn-sm btn-block text-center mt-3 mb-3 w-100" id="btnEditarAtivo" data-toggle="modal" data-target="#editarModal">Editar Ativo</button>
                            </div>
                            <div class="col-md-3 d-flex justify-content-center p-1">
                                <input type="hidden" name="id" value="<?php echo $id; ?>">
                                <button type="button" class="btn btn-outline-danger btn-sm btn-block text-center mt-3 mb-3 w-100" id="btnExcluirAtivo" data-toggle="modal" data-target="#excluirModal">Excluir Ativo</button>
                            </div>
                        </div>
                    </div>
                        </form>
            </div>                               
            </div>
        </div>
    </div>
</div>


<!-- Modal de edição-->
<!-- <div class="modal fade" id="editarModal" tabindex="-1" role="dialog" aria-labelledby="editarModalLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="editarModalLabel">Confirmar Edição</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        Tem certeza de que deseja editar este ativo?
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
        <button type="button" class="btn btn-primary" onclick="enviarEdicao()">Confirmar</button>
      </div>
    </div>
  </div>
</div> -->

<!-- Modal de confirmação -->
<!-- <div class="modal fade" id="excluirModal" tabindex="-1" role="dialog" aria-labelledby="excluirModalLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="excluirModalLabel">Confirmar Exclusão</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        Tem certeza de que deseja excluir este ativo?
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
        <button type="button" class="btn btn-danger" onclick="excluirAtivo()">Excluir</button>
      </div>
    </div>
  </div>
</div> -->

<!-- MODAL EDIÇÃO DE ATIVOS-->
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
        Tem certeza de que deseja editar este ativo?
      </div>
      <div class="modal-footer bg-light rounded-bottom">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
        <button type="button" class="btn btn-primary" onclick="enviarEdicao()">Confirmar</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL CONFIRMACAO DE EDICAO DE ATIVOS-->
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
        Tem certeza de que deseja excluir este ativo?
      </div>
      <div class="modal-footer bg-light rounded-bottom">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
        <button type="button" class="btn btn-danger" onclick="excluirAtivo()">Excluir</button>
      </div>
    </div>
  </div>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
<script>
function enviarEdicao() {
    // Envia os dados do formulário de edição
    document.getElementById("editAtivo").submit();}

function excluirAtivo() {
    // Obtém o valor do campo oculto
    var id = document.getElementsByName('id')[0].value;

    // Cria uma requisição AJAX
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "ativos_delete.php", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    // Define a função de callback
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            // Manipula a resposta do servidor aqui, se necessário
            console.log(xhr.responseText);
            // Fecha o modal
            $('#excluirModal').modal('hide');
            // Exibe a mensagem de confirmação
            alert("Ativo deletado com sucesso!");
            // Atualiza a interface do usuário, redirecionando para a lista de ativos
            setTimeout(function() {window.location.href = 'ativos.php';}, 1000);
        }
    };

    // Envia a requisição com o ID do ativo
    xhr.send("id=" + encodeURIComponent(id));
}
</script>
</body>
</html>



