<?php
// Desabilitar warnings padrão para que possamos controlar todas as mensagens de erro.
error_reporting(E_ALL & ~E_WARNING);

// --- CONFIGURAÇÕES ---
$ftp_host = '138.94.29.143';
$ftp_port = 21;
$ftp_user = 'joaovictor';
$ftp_pass = 'asd123';
$network_timeout = 10; // Segundos

//======================================================================
// FUNÇÕES AUXILIARES
//======================================================================

/**
 * Função para testar a resposta do host com ping (ICMP).
 * NOTA: Requer que a função `exec()` do PHP esteja habilitada no servidor.
 *
 * @param string $host O IP ou hostname a ser pingado.
 * @param array  $raw_output Passado por referência, conterá a saída bruta do comando.
 * @return bool|null Retorna TRUE para sucesso, FALSE para falha, NULL se exec() estiver desabilitado.
 */
function ping_host($host, &$raw_output = [])
{
    if (!function_exists('exec')) {
        $raw_output = ['A função `exec()` está desabilitada no php.ini.'];
        return null;
    }
    $command = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN')
        ? "ping -n 1 " . escapeshellarg($host)
        : "ping -c 1 " . escapeshellarg($host);

    exec($command, $raw_output, $return_var);
    return $return_var === 0;
}

/**
 * Função para exibir um bloco de status formatado em HTML.
 */
function print_status($message, $type = 'info')
{
    echo "<div class='status $type'>$message</div>";
}

//======================================================================
// ETAPA 1: COLETA DE DADOS DE DIAGNÓSTICO
//======================================================================

$report = []; // Array para armazenar todos os resultados

// 1.1 - Teste de Ping
$ping_output_raw = [];
$report['ping_result'] = ping_host($ftp_host, $ping_output_raw);
$report['ping_output'] = htmlspecialchars(implode("\n", $ping_output_raw));

// 1.2 - Teste de Porta TCP
$report['socket_errno'] = 0;
$report['socket_errstr'] = '';
$socket = @fsockopen($ftp_host, $ftp_port, $report['socket_errno'], $report['socket_errstr'], $network_timeout);
$report['port_ok'] = is_resource($socket);

// CORREÇÃO APLICADA AQUI
if ($report['port_ok']) {
    $meta = stream_get_meta_data($socket);
    $report['stream_details'] = [
        'remote_ip' => ($meta['unread_bytes'] > 0) ? $meta['remote_address'] : $ftp_host,
        'protocol' => $meta['stream_type'],
        'timed_out' => $meta['timed_out'] // Chave correta para saber se o tempo esgotou
    ];
    fclose($socket);
}

// 1.3 - Teste de Autenticação FTP (só se a rede estiver OK)
if ($report['port_ok']) {
    $conn_id = @ftp_connect($ftp_host);
    if ($conn_id) {
        $login_result = @ftp_login($conn_id, $ftp_user, $ftp_pass);
        $report['login_ok'] = $login_result;
        if ($login_result) {
            $report['ftp_systype'] = ftp_systype($conn_id);
            ftp_close($conn_id);
        } else {
            $last_error = error_get_last();
            $report['ftp_error'] = "Autenticação falhou.";
            if ($last_error && (strpos($last_error['message'], '530') !== false || strpos($last_error['message'], 'Login incorrect') !== false)) {
                $report['ftp_error'] .= " Causa Provável: Usuário ou senha incorretos (Erro FTP 530).";
            }
        }
    } else {
        $report['login_ok'] = false;
        $report['ftp_error'] = "A função ftp_connect() falhou mesmo após o teste de porta bem-sucedido.";
    }
}

//======================================================================
// ETAPA 2: EXIBIÇÃO DO RELATÓRIO
//======================================================================
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <title>Diagnóstico Avançado de Conexão FTP</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            background-color: #f4f4f4;
        }

        .container {
            max-width: 800px;
            margin: auto;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        h1,
        h2,
        h3 {
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }

        .status {
            padding: 15px;
            border-radius: 5px;
            margin-top: 10px;
            font-weight: bold;
            border-left: 5px solid;
        }

        .success {
            background-color: #e6ffed;
            border-color: #28a745;
            color: #155724;
        }

        .error {
            background-color: #ffebee;
            border-color: #dc3545;
            color: #721c24;
        }

        .info {
            background-color: #e7f3fe;
            border-color: #007bff;
            color: #004085;
        }

        .details,
        .summary {
            font-style: italic;
            color: #555;
            font-size: 0.9em;
            margin-top: 5px;
            padding-left: 10px;
        }

        summary {
            cursor: pointer;
            font-weight: bold;
        }

        strong.highlight {
            color: #d9534f;
        }

        code {
            background-color: #eee;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>Diagnóstico Avançado de Conexão FTP</h1>

        <h3>Sumário Executivo</h3>
        <div class="summary">
            <?php
            if ($report['port_ok'] && ($report['login_ok'] ?? false)) {
                print_status("Diagnóstico: <strong>SUCESSO TOTAL</strong>. A conexão de rede e a autenticação FTP funcionaram perfeitamente.", 'success');
            } elseif (!$report['port_ok']) {
                print_status("Diagnóstico: <strong>FALHA DE REDE</strong>. Não foi possível estabelecer uma conexão com o servidor na porta especificada. Veja detalhes na Etapa 1.", 'error');
            } else {
                print_status("Diagnóstico: <strong>FALHA DE AUTENTICAÇÃO</strong>. A rede está OK, mas o login FTP falhou. Verifique as credenciais ou permissões na Etapa 2.", 'error');
            }
            ?>
        </div>

        <h2>ETAPA 1: Diagnóstico de Rede Detalhado</h2>

        <?php
        // Bloco de Análise e Diagnóstico Final da Rede
        if ($report['port_ok']) {
            print_status("<strong>Status da Porta <code>$ftp_port</code>:</strong> ABERTA.", 'success');
            // CORREÇÃO APLICADA NA EXIBIÇÃO
            echo "<div class='details'>Conectado via: <code>{$report['stream_details']['protocol']}</code> ao IP <code>{$report['stream_details']['remote_ip']}</code></div>";
            echo "<div class='details'>Timeout configurado para esta verificação: $network_timeout segundos.</div>";
            echo "<div class='details'>Conexão esgotou o tempo (timed out): " . ($report['stream_details']['timed_out'] ? 'Sim' : 'Não') . ".</div>";
        } elseif ($report['ping_result'] === true) {
            print_status("<strong>Status da Porta <code>$ftp_port</code>:</strong> FILTRADA/BLOQUEADA.", 'error');
            echo "<div class='details'>O servidor <strong>$ftp_host</strong> está online (responde ao Ping), mas a porta <code>$ftp_port</code> está inacessível.</div>";
            echo "<div class='details'><strong>Causa Provável:</strong> Um <strong class='highlight'>FIREWALL</strong> no servidor de destino ou na rede está bloqueando a porta.</div>";
            echo "<div class='details'>Erro retornado: ({$report['socket_errno']}) {$report['socket_errstr']}</div>";
        } else {
            print_status("<strong>Status da Porta <code>$ftp_port</code>:</strong> INACESSÍVEL.", 'error');
            echo "<div class='details'>Falha de comunicação completa com o servidor <strong>$ftp_host</strong> (não responde ao Ping nem à porta).</div>";
            echo "<div class='details'><strong>Causas Prováveis:</strong> IP incorreto, servidor offline, ou firewall principal bloqueando todo o tráfego.</div>";
        }
        ?>
        <details>
            <summary>Clique para ver a saída bruta do teste de Ping</summary>
            <pre><?php echo $report['ping_output']; ?></pre>
        </details>

        <h2>ETAPA 2: Diagnóstico de Autenticação FTP</h2>
        <?php
        if ($report['port_ok']) {
            if ($report['login_ok']) {
                print_status("SUCESSO: Autenticação realizada com o usuário <code>$ftp_user</code>.", 'success');
                echo "<div class='details'>Tipo de sistema do servidor FTP: <strong>{$report['ftp_systype']}</strong></div>";
            } else {
                print_status($report['ftp_error'], 'error');
            }
        } else {
            print_status("Teste de autenticação ignorado devido à falha de rede na Etapa 1.", 'info');
        }
        ?>
    </div>
</body>

</html>