<?php
// Define o fuso horário para evitar erros com a função date()
date_default_timezone_set('America/Sao_Paulo');

// --- Variáveis de estado ---
$result_message = '';
$result_type = 'info'; // info (padrão, azul), sucesso (verde), erro (vermelho)

// Pega a URL base da API do formulário, ou usa um valor padrão
$api_base_url = $_POST['api_url'] ?? 'http://localhost:7741';

/**
 * Função helper para fazer requisições cURL.
 * Ela lida com GET, POST, JSON e retorna a resposta e o código HTTP.
 *
 * @param string $url URL completa do endpoint
 * @param string $method Método HTTP (GET, POST, etc.)
 * @param array|null $data Dados para enviar (serão convertidos para JSON se for POST)
 * @return array Contém 'response' (corpo da resposta), 'http_code' (código HTTP) e 'error' (erro do cURL)
 */
function make_request($url, $method = 'GET', $data = null) {
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // Retorna a resposta como string
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);    // Timeout de conexão
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);           // Timeout total da requisição
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method); // Define o método (GET, POST)

    $headers = [
        'Accept: application/json' // Sempre esperamos JSON da API
    ];

    if ($method == 'POST' && $data !== null) {
        $payload = json_encode($data);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        $headers[] = 'Content-Type: application/json'; // Informa que estamos enviando JSON
        $headers[] = 'Content-Length: ' . strlen($payload);
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE); // Pega o código HTTP (200, 404, 500, etc.)
    $error = curl_error($ch);     // Pega qualquer erro do cURL (ex: não conseguiu conectar)
    
    curl_close($ch);

    return ['response' => $response, 'http_code' => $http_code, 'error' => $error];
}

// Verifica se o formulário foi enviado
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    
    // Pega os dados dos campos de teste
    $user = $_POST['login_user'] ?? 'testuser';
    $pass = $_POST['login_pass'] ?? 'testpass';
    $driver_name = $_POST['driver_name'] ?? 'Nome Teste';

    $result_data = null;
    $result_type = 'info'; // Reseta o tipo em cada requisição

    try {
        // --- Teste 1: Rota Home (/) ---
        if (isset($_POST['test_home'])) {
            $url = $api_base_url . '/';
            $result_data = make_request($url, 'GET');
        
        // --- Teste 2: Rota Login (/login) ---
        } elseif (isset($_POST['test_login'])) {
            $url = $api_base_url . '/login';
            $payload = ['usuario' => $user, 'senha' => $pass];
            $result_data = make_request($url, 'POST', $payload);

        // --- Teste 3: Rota Histórico (/historico) ---
        } elseif (isset($_POST['test_historico'])) {
            // Garante que o nome do motorista está codificado para a URL (ex: "Nome Teste" vira "Nome%20Teste")
            $url = $api_base_url . '/historico/' . urlencode($driver_name);
            $result_data = make_request($url, 'GET');

        // --- Teste 4: Rota Enviar Dados (/enviar-dados) ---
        } elseif (isset($_POST['test_enviar'])) {
            $url = $api_base_url . '/enviar-dados';
            $payload = [
                'date' => date('Y-m-d H:i:s'), // Envia data/hora atual
                'driver' => $driver_name,
                'kmInicial' => rand(10000, 50000) // Envia um KM aleatório para teste
            ];
            $result_data = make_request($url, 'POST', $payload);
        }

    } catch (Exception $e) {
        $result_message = "Erro na aplicação PHP: " . $e->getMessage();
        $result_type = 'erro';
    }

    // Se houve um teste, formata a mensagem de resultado
    if ($result_data) {
        $result_message = "URL Testada: " . $url . "\n";
        $result_message .= "HTTP Code: " . $result_data['http_code'] . "\n\n";
        
        if ($result_data['error']) {
            $result_message .= "Erro do cURL: " . $result_data['error'] . "\n";
            $result_message .= "(Isso geralmente significa que a API não está rodando no endereço/porta ou o firewall está bloqueando)";
            $result_type = 'erro';
        } else {
            $result_message .= "Retorno:\n-----------------\n" . $result_data['response'];
            
            // --- Lógica de Cores ---
            $http_code = (int)$result_data['http_code'];
            if ($http_code >= 200 && $http_code <= 299) {
                $result_type = 'sucesso'; // SUCESSO (Verde)
            } elseif ($http_code >= 400) {
                $result_type = 'erro'; // ERRO (Vermelho)
            } else {
                $result_type = 'info'; // Outros (Azul/Padrão)
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teste da API Flask</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f7f6;
            color: #333;
        }
        h1 {
            color: #0056b3;
            border-bottom: 2px solid #0056b3;
            padding-bottom: 10px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
        }
        form {
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
            margin-bottom: 20px;
        }
        fieldset {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        legend {
            font-size: 1.2em;
            font-weight: bold;
            color: #0056b3;
            padding: 0 10px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }
        input[type="text"],
        input[type="password"] {
            width: calc(100% - 20px);
            padding: 10px;
            margin-bottom: 15px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 1em;
        }
        .test-buttons {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 10px;
        }
        button {
            background-color: #007bff;
            color: white;
            padding: 12px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1em;
            font-weight: 600;
            transition: background-color 0.2s;
            text-align: left;
        }
        button:hover {
            background-color: #0056b3;
        }

        /* --- Estilos do Resultado --- */
        .result {
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
        }
        .result h2 {
            margin-top: 0;
            padding-bottom: 10px;
            border-bottom: 1px solid; /* Cor herdada */
        }
        
        /* Classe para SUCESSO */
        .result-sucesso {
            background-color: #00B526;
            color: #fff;
            border: 1px solid #38c1a5;
        }
        .result-sucesso h2 {
             border-bottom-color: #38c1a5;
        }

        /* Classe para ERRO */
        .result-erro {
            background-color: #fff5f5;
            color: #9b2c2c;
            border: 1px solid #f56565;
        }
        .result-erro h2 {
             border-bottom-color: #f56565;
        }

        /* Classe para INFO (Padrão) */
        .result-info {
            background-color: #2d3748;
            color: #f7fafc;
        }
        .result-info h2 {
             border-bottom-color: #4a5568;
        }

        pre {
            white-space: pre-wrap; /* Quebra a linha em vez de criar scroll horizontal */
            word-wrap: break-word;
            font-family: "Courier New", Courier, monospace;
            font-size: 1.1em;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Painel de Teste da API Frota</h1>

        <!-- Se houver uma mensagem de resultado, mostra aqui -->
        <?php if ($result_message): ?>
            <div class="result <?php echo 'result-' . htmlspecialchars($result_type); ?>">
                <h2>Resultado do Teste</h2>
                <pre><?php echo htmlspecialchars($result_message); ?></pre>
            </div>
        <?php endif; ?>

        <!-- Formulário de Teste -->
        <form method="POST" action="">
            <fieldset>
                <legend>Configurações</legend>
                
                <label for="api_url">URL Base da API:</label>
                <input type="text" name="api_url" id="api_url" value="<?php echo htmlspecialchars($api_base_url); ?>">
                
                <label for="login_user">Usuário (para login):</label>
                <input type="text" name="login_user" id="login_user" value="<?php echo htmlspecialchars($_POST['login_user'] ?? 'testuser'); ?>">
                
                <label for="login_pass">Senha (para login):</label>
                <input type="password" name="login_pass" id="login_pass" value="<?php echo htmlspecialchars($_POST['login_pass'] ?? 'testpass'); ?>">
                
                <label for="driver_name">Nome Motorista (para histórico/envio):</label>
                <input type="text" name="driver_name" id="driver_name" value="<?php echo htmlspecialchars($_POST['driver_name'] ?? 'Nome Teste'); ?>">
            </fieldset>

            <fieldset>
                <legend>Testes</legend>
                <div class="test-buttons">
                    <button type="submit" name="test_home">1. Testar Rota Home (/) - GET</button>
                    <button type="submit" name="test_login">2. Testar Rota /login - POST</button>
                    <button type="submit" name="test_historico">3. Testar Rota /historico - GET</button>
                    <button type="submit" name="test_enviar">4. Testar Rota /enviar-dados - POST</button>
                </div>
            </fieldset>
        </form>
    </div>
</body>
</html>