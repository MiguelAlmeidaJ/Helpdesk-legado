<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'];

    // Caminho do arquivo de log 
    $log_file = 'C:/xampp/apache/logs/failed_logins.log';
    $current_time = date('Y-m-d H:i:s');
    $client_ip = $_SERVER['REMOTE_ADDR'];
    $log_entry = "[$current_time] Failed login attempt for user: $username from IP: $client_ip\n";

    // Gravação do log na pasta do apache
    $result = file_put_contents($log_file, $log_entry, FILE_APPEND);
    if ($result === false) {
        error_log("Failed to write to local log file: $log_file");
    }

    // Envia log para o servidor remoto linux
    $proxy_url = 'http://192.168.199.70'; //IP do Servidor Proxy
    $headers = [
        "Content-Type: application/json",
        "X-Failed-Login-Username: $username",
        "X-Failed-Login-IP: $client_ip",
        "X-Failed-Login-Time: $current_time"
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $proxy_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');

    $response = curl_exec($ch);

    if ($response === false) {
        $error = curl_error($ch);
        error_log("cURL Error: $error");
    } else {
        // Opcional: tratamento da resposta do servidor remoto
        echo "Request sent successfully. Response: $response";
    }

    curl_close($ch);

    //Gravação do log de erro ao acessar em um arquivo aqui na mesma pasta do programa
    $log_error_file = 'log_error.log';
    $error_log_entry = "[$current_time] Failed login attempt for user: $username from IP: $client_ip\n";

    $error_result = file_put_contents($log_error_file, $error_log_entry, FILE_APPEND);
    if ($error_result === false) {
        error_log("Failed to write to log file: $log_error_file");
    }
}
?>



