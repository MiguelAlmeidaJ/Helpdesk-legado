<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../ativos/ativos_conect.php");


// Estabelece a conexão com o banco de dados plugins_app
$pdoAtivos = ConnectionPluginsApp();
if (!$pdoAtivos) {
    exit("Erro ao conectar ao banco de dados plugins_app."); // Exibe mensagem de erro se a conexão falhar
}

// Processa o formulário ao ser enviado
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
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

    // Insere os dados no banco de dados
    $stmt = $pdoAtivos->prepare("INSERT INTO ativos (
        hora_da_coleta, empresa, nome_computador, sistema_operacional, versao_sistema, arquitetura,
        processador, nucleos_fisicos, threads, frequencia_max_cpu, frequencia_max_memoria,
        placa_de_video, armazenamento_disco_total,
        armazenamento_disco_uso, armazenamento_disco_livre, armazenamento_porcentagem_uso, tipo_de_armazenamento,
        memoria_ram_total, memoria_ram_em_uso, memoria_ram_disponivel, percentual_uso_memoria,
        fabricante_placa_mae, nome_placa_mae, versao_placa_mae, numero_serie_placa_mae,
        endereco_mac, endereco_ip, firewall_dominio, firewall_publico, firewall_privado,
        rede_detalhada, observacoes, data_insercao
    ) VALUES (
        :hora_da_coleta, :empresa, :nome_computador, :sistema_operacional, :versao_sistema, :arquitetura,
        :processador, :nucleos_fisicos, :threads, :frequencia_max_cpu, :frequencia_max_memoria,
        :placa_de_video, :armazenamento_disco_total,
        :armazenamento_disco_uso, :armazenamento_disco_livre, :armazenamento_porcentagem_uso, :tipo_de_armazenamento,
        :memoria_ram_total, :memoria_ram_em_uso, :memoria_ram_disponivel, :percentual_uso_memoria,
        :fabricante_placa_mae, :nome_placa_mae, :versao_placa_mae, :numero_serie_placa_mae,
        :endereco_mac, :endereco_ip, :firewall_dominio, :firewall_publico, :firewall_privado,
        :rede_detalhada, :observacoes, NOW()
    )");

    $stmt->execute([
        ':hora_da_coleta' => $hora_da_coleta,
        ':empresa' => $empresa,
        ':nome_computador' => $nome_computador,
        ':sistema_operacional' => $sistema_operacional,
        ':versao_sistema' => $versao_sistema,
        ':arquitetura' => $arquitetura,
        ':processador' => $processador,
        ':nucleos_fisicos' => $nucleos_fisicos,
        ':threads' => $threads,
        ':frequencia_max_cpu' => $frequencia_max_cpu,
        ':frequencia_max_memoria' => $frequencia_max_memoria,
        ':placa_de_video' => $placa_de_video,
        ':armazenamento_disco_total' => $armazenamento_disco_total,
        ':armazenamento_disco_uso' => $armazenamento_disco_uso,
        ':armazenamento_disco_livre' => $armazenamento_disco_livre,
        ':armazenamento_porcentagem_uso' => $armazenamento_porcentagem_uso,
        ':tipo_de_armazenamento' => $tipo_de_armazenamento,
        ':memoria_ram_total' => $memoria_ram_total,
        ':memoria_ram_em_uso' => $memoria_ram_em_uso,
        ':memoria_ram_disponivel' => $memoria_ram_disponivel,
        ':percentual_uso_memoria' => $percentual_uso_memoria,
        ':fabricante_placa_mae' => $fabricante_placa_mae,
        ':nome_placa_mae' => $nome_placa_mae,
        ':versao_placa_mae' => $versao_placa_mae,
        ':numero_serie_placa_mae' => $numero_serie_placa_mae,
        ':endereco_mac' => $endereco_mac,
        ':endereco_ip' => $endereco_ip,
        ':firewall_dominio' => $firewall_dominio,
        ':firewall_publico' => $firewall_publico,
        ':firewall_privado' => $firewall_privado,
        ':rede_detalhada' => $rede_detalhada,
        ':observacoes' => $observacoes

    ]);
    header("Location: ativos.php?success=1");
    exit;
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
            <div class="row mt-0 justify-content-md-center">
                <div style="margin-right: 40px; margin-left: 40px">
                    <div class="card">
                        <div class="h6 card-header">
                            <i class="fas fa-plus-circle text-primary"></i> Adicionar Ativo
                        </div>
                        <?php if (isset($_GET['success'])) : ?>
                            <div class="alert alert-success" role="alert">
                                Ativo adicionado com sucesso!
                            </div>
                        <?php endif; ?>
                        <form action="ativos_insert.php" method="POST">
                            <div class="row form-row-spacing">
                                <div class="col-md-4 d-flex align-items-center mt-2">
                                    <div class="form-group w-100">
                                        <label for="empresa">Empresa</label>
                                        <input type="text" class="form-control" id="empresa" name="empresa" required>
                                    </div>
                                </div>
                                <div class="col-md-4 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="nome_computador" style="white-space: nowrap;">Nome do Computador</label>
                                        <input type="text" class="form-control" id="nome_computador" name="nome_computador" required>
                                    </div>
                                </div>
                                <div class="col-md-3 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="sistema_operacional" style="white-space: nowrap;">Sistema Operacional</label>
                                        <input type="text" class="form-control" id="sistema_operacional" name="sistema_operacional" required>
                                    </div>
                                </div>
                                <div class="col-md-1 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="arquitetura">Arquitetura</label>
                                        <input type="text" class="form-control" id="arquitetura" name="arquitetura" required>
                                    </div>
                                </div>
                            </div>


                            <div class="row form-row-spacing">

                                <div class="col-md-4 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="processador">Processador</label>
                                        <input type="text" class="form-control" id="processador" name="processador" required>
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="versao_sistema" style="white-space: nowrap;">Versão do Sistema</label>
                                        <input type="text" class="form-control" id="versao_sistema" name="versao_sistema">
                                    </div>
                                </div>

                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="frequencia_max_cpu" style="white-space: nowrap;">Freq. Máx. CPU</label>
                                        <input type="text" class="form-control" id="frequencia_max_cpu" name="frequencia_max_cpu">
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="frequencia_max_memoria" style="white-space: nowrap;">Freq. Máx. Memória</label>
                                        <input type="text" class="form-control" id="frequencia_max_memoria" name="frequencia_max_memoria">
                                    </div>
                                </div>


                                <div class="col-md-1 d-flex align-items-center">
                                    <div class="form-group">
                                        <label for="nucleos_fisicos">Núcleos</label>
                                        <input type="number" class="form-control" id="nucleos_fisicos" name="nucleos_fisicos">
                                    </div>
                                </div>
                                <div class="col-md-1 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="threads">Threads</label>
                                        <input type="number" class="form-control" id="threads" name="threads">
                                    </div>
                                </div>

                            </div>

                            <div class="row form-row-spacing">
                                <div class="col-md-4 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="placa_de_video" style="white-space: nowrap;">Placa de Vídeo</label>
                                        <input type="text" class="form-control" id="placa_de_video" name="placa_de_video">
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="armazenamento_disco_total" style="white-space: nowrap;">Armaz. Total</label>
                                        <input type="text" class="form-control" id="armazenamento_disco_total" name="armazenamento_disco_total" required>
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="armazenamento_disco_uso" style="white-space: nowrap;">Armaz. em Uso</label>
                                        <input type="text" class="form-control" id="armazenamento_disco_uso" name="armazenamento_disco_uso" required>
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="armazenamento_disco_livre" style="white-space: nowrap;">Armaz. Livre</label>
                                        <input type="text" class="form-control" id="armazenamento_disco_livre" name="armazenamento_disco_livre" required>
                                    </div>
                                </div>
                                <div class="col-md-1 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="armazenamento_porcentagem_uso" style="white-space: nowrap;">% Uso</label>
                                        <input type="text" class="form-control" id="armazenamento_porcentagem_uso" name="armazenamento_porcentagem_uso">
                                    </div>
                                </div>
                                <div class="col-md-1 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="tipo_de_armazenamento" style="white-space: nowrap;">Tipo de Armaz.</label>
                                        <input type="text" class="form-control" id="tipo_de_armazenamento" name="tipo_de_armazenamento">
                                    </div>
                                </div>
                            </div>

                            <div class="row form-row-spacing">


                                <div class="col-md-4 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="fabricante_placa_mae" style="white-space: nowrap;">Fabricante da Placa Mãe</label>
                                        <input type="text" class="form-control" id="fabricante_placa_mae" name="fabricante_placa_mae">
                                    </div>
                                </div>

                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="memoria_ram_total" style="white-space: nowrap;">Memória RAM Total</label>
                                        <input type="text" class="form-control" id="memoria_ram_total" name="memoria_ram_total" required>
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="memoria_ram_em_uso" style="white-space: nowrap;">Memória RAM em Uso</label>
                                        <input type="text" class="form-control" id="memoria_ram_em_uso" name="memoria_ram_em_uso">
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="memoria_ram_disponivel" style="white-space: nowrap;">Memória RAM Livre</label>
                                        <input type="text" class="form-control" id="memoria_ram_disponivel" name="memoria_ram_disponivel">
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="percentual_uso_memoria" style="white-space: nowrap;">% Uso da Memória</label>
                                        <input type="text" class="form-control" id="percentual_uso_memoria" name="percentual_uso_memoria">
                                    </div>
                                </div>

                            </div>

                            <div class="row form-row-spacing">

                                <div class="col-md-4 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="nome_placa_mae" style="white-space: nowrap;">Nome da Placa Mãe</label>
                                        <input type="text" class="form-control" id="nome_placa_mae" name="nome_placa_mae" required>
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="firewall_dominio" style="white-space: nowrap;">Firewall Domínio</label>
                                        <input type="text" class="form-control" id="firewall_dominio" name="firewall_dominio">
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="firewall_publico" style="white-space: nowrap;">Firewall Público</label>
                                        <input type="text" class="form-control" id="firewall_publico" name="firewall_publico">
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="firewall_privado" style="white-space: nowrap;">Firewall Privado</label>
                                        <input type="text" class="form-control" id="firewall_privado" name="firewall_privado">
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="data_cadastro" style="white-space: nowrap;">Cadastrado</label>
                                        <input type="text" class="form-control" id="data_cadastro" name="data_cadastro" required>
                                    </div>
                                </div>
                            </div>

                            <div class="row form-row-spacing">

                                <div class="col-md-4 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="numero_serie_placa_mae" style="white-space: nowrap;">N. Série Placa Mãe</label>
                                        <input type="text" class="form-control" id="numero_serie_placa_mae" name="numero_serie_placa_mae">
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="versao_placa_mae" style="white-space: nowrap;">Versão da Placa Mãe</label>
                                        <input type="text" class="form-control" id="versao_placa_mae" name="versao_placa_mae">
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="endereco_ip" style="white-space: nowrap;">Endereço IP</label>
                                        <input type="text" class="form-control" id="endereco_ip" name="endereco_ip" required>
                                    </div>
                                </div>

                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="endereco_mac" style="white-space: nowrap;">Endereço MAC</label>
                                        <input type="text" class="form-control" id="endereco_mac" name="endereco_mac" required>
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="hora_da_coleta" style="white-space: nowrap;">Ultima Atualização</label>
                                        <input type="text" class="form-control" id="hora_da_coleta" name="hora_da_coleta" required>
                                    </div>
                                </div>

                                <div class="col-md-12 d-flex align-items-center">
                                    <div class="form-group w-100">
                                        <label for="observacoes" style="white-space: nowrap;">Observações</label>
                                        <textarea class="form-control" id="observacoes" name="observacoes" rows="3" style="height: auto;"></textarea>
                                    </div>
                                </div>

                            </div>
                            <div class="container">
                                <div class="row p-0 justify-content-md-center">
                                    <div class="col-md-3 d-flex justify-content-center p-1">
                                        <button type="submit" class="btn-outline-success btn-sm btn-block text-center mt-3 mb-3 w-100">Adicionar Ativo</button>
                                    </div>
                                </div>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>

<!-- JavaScript do jQuery e do Bootstrap -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
</body>

</html>