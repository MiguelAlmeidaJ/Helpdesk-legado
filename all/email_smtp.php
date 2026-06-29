<?php
if (!function_exists('n3_send_mail')) {
    function n3_smtp_config()
    {
        static $config = null;
        if ($config !== null) {
            return $config;
        }

        $configPath = dirname(__DIR__) . '/config/email_smtp.php';
        $config = file_exists($configPath) ? require $configPath : [];
        return $config;
    }

    function n3_mail_log($message)
    {
        error_log('[N3 SMTP] ' . $message);
    }

    function n3_normalize_recipients($recipients)
    {
        if (is_array($recipients)) {
            $items = $recipients;
        } else {
            $items = preg_split('/[,;]/', (string)$recipients);
        }

        $emails = [];
        foreach ($items as $item) {
            $item = trim((string)$item);
            if ($item === '') {
                continue;
            }
            if (preg_match('/<([^>]+)>/', $item, $matches)) {
                $item = trim($matches[1]);
            }
            if (filter_var($item, FILTER_VALIDATE_EMAIL)) {
                $emails[] = $item;
            }
        }

        return array_values(array_unique($emails));
    }

    function n3_parse_mail_headers($headers)
    {
        $parsed = [
            'from' => null,
            'reply_to' => null,
            'content_type' => null,
            'extra' => [],
        ];

        if (is_array($headers)) {
            $headerLines = [];
            foreach ($headers as $key => $value) {
                $headerLines[] = is_string($key) ? $key . ': ' . $value : $value;
            }
        } else {
            $headerLines = preg_split('/\r\n|\n|\r/', (string)$headers);
        }

        foreach ($headerLines as $line) {
            $line = trim((string)$line);
            if ($line === '' || strpos($line, ':') === false) {
                continue;
            }

            [$name, $value] = array_map('trim', explode(':', $line, 2));
            $lower = strtolower($name);

            if ($lower === 'from') {
                $parsed['from'] = $value;
            } elseif ($lower === 'reply-to') {
                $parsed['reply_to'] = $value;
            } elseif ($lower === 'content-type') {
                $parsed['content_type'] = $value;
            } elseif (!in_array($lower, ['to', 'subject', 'mime-version', 'x-mailer'], true)) {
                $parsed['extra'][] = $name . ': ' . $value;
            }
        }

        return $parsed;
    }

    function n3_extract_email($value)
    {
        $value = trim((string)$value);
        if (preg_match('/<([^>]+)>/', $value, $matches)) {
            return trim($matches[1]);
        }
        return $value;
    }

    function n3_smtp_read($socket)
    {
        $response = '';
        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            if (strlen($line) >= 4 && $line[3] === ' ') {
                break;
            }
        }
        return $response;
    }

    function n3_smtp_expect($socket, array $codes, $context)
    {
        $response = n3_smtp_read($socket);
        $code = (int)substr($response, 0, 3);
        if (!in_array($code, $codes, true)) {
            throw new Exception($context . ' falhou: ' . trim($response));
        }
        return $response;
    }

    function n3_smtp_command($socket, $command, array $codes, $context)
    {
        fwrite($socket, $command . "\r\n");
        return n3_smtp_expect($socket, $codes, $context);
    }

    function n3_header_encode($value)
    {
        if (preg_match('/[^\x20-\x7E]/', $value)) {
            return '=?UTF-8?B?' . base64_encode($value) . '?=';
        }
        return $value;
    }

    function n3_send_mail($to, $subject, $message, $headers = '', $attachments = [])
    {
        $config = n3_smtp_config();
        $host = $config['host'] ?? 'smtp.gmail.com';
        $port = (int)($config['port'] ?? 587);
        $secure = strtolower($config['secure'] ?? 'tls');
        $username = trim((string)($config['username'] ?? ''));
        $password = (string)($config['password'] ?? '');
        $timeout = (int)($config['timeout'] ?? 20);

        if ($username === '' || $password === '') {
            n3_mail_log('Usuário ou senha SMTP não configurados. Defina N3_SMTP_USER e N3_SMTP_PASS ou config/email_smtp.php.');
            return false;
        }

        $recipients = n3_normalize_recipients($to);
        if (empty($recipients)) {
            n3_mail_log('Nenhum destinat?rio v?lido informado.');
            return false;
        }

        $parsedHeaders = n3_parse_mail_headers($headers);
        $configuredFromEmail = trim((string)($config['from_email'] ?: $username));
        $configuredFromName = trim((string)($config['from_name'] ?? 'Allterus N3TI'));
        $allowHeaderFrom = !empty($config['allow_header_from']);

        if ($allowHeaderFrom && !empty($parsedHeaders['from'])) {
            $fromHeader = $parsedHeaders['from'];
            $fromEmail = n3_extract_email($fromHeader);
        } else {
            $fromEmail = filter_var($configuredFromEmail, FILTER_VALIDATE_EMAIL) ? $configuredFromEmail : $username;
            $fromHeader = ($configuredFromName !== '' ? $configuredFromName . ' ' : '') . '<' . $fromEmail . '>';
        }

        if (!filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
            $fromEmail = $username;
            $fromHeader = ($configuredFromName !== '' ? $configuredFromName . ' ' : '') . '<' . $fromEmail . '>';
        }

        $replyTo = $parsedHeaders['reply_to'] ?: ($parsedHeaders['from'] ?: $fromHeader);
        $contentType = $parsedHeaders['content_type'] ?: 'text/html; charset=UTF-8';
        $isHtml = stripos($contentType, 'text/html') !== false;

        $subjectEncoded = n3_header_encode($subject);
        $date = date('r');
        $messageId = sprintf('<%s.%s@%s>', bin2hex(random_bytes(8)), time(), preg_replace('/^www\./', '', $_SERVER['HTTP_HOST'] ?? 'localhost'));

        $mailHeaders = [];
        $mailHeaders[] = 'Date: ' . $date;
        $mailHeaders[] = 'From: ' . $fromHeader;
        $mailHeaders[] = 'Reply-To: ' . $replyTo;
        $mailHeaders[] = 'To: ' . implode(', ', $recipients);
        $mailHeaders[] = 'Subject: ' . $subjectEncoded;
        $mailHeaders[] = 'Message-ID: ' . $messageId;
        $mailHeaders[] = 'MIME-Version: 1.0';
        $mailHeaders[] = 'Content-Type: ' . $contentType;
        $mailHeaders[] = 'Content-Transfer-Encoding: 8bit';
        foreach ($parsedHeaders['extra'] as $extraHeader) {
            $mailHeaders[] = $extraHeader;
        }

        $body = str_replace(["\r\n", "\r"], "\n", (string)$message);
        $body = str_replace("\n", "\r\n", $body);
        if (!$isHtml && stripos($contentType, 'charset=') === false) {
            $mailHeaders[] = 'Content-Type: text/plain; charset=UTF-8';
        }
        $payload = implode("\r\n", $mailHeaders) . "\r\n\r\n" . $body;
        $payload = preg_replace('/^\./m', '..', $payload);

        $remote = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
        $errno = 0;
        $errstr = '';

        try {
            $socket = stream_socket_client($remote, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT);
            if (!$socket) {
                throw new Exception($errstr ?: ('erro ' . $errno));
            }
            stream_set_timeout($socket, $timeout);

            n3_smtp_expect($socket, [220], 'Conex?o SMTP');
            n3_smtp_command($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), [250], 'EHLO');

            if ($secure === 'tls') {
                n3_smtp_command($socket, 'STARTTLS', [220], 'STARTTLS');
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new Exception('Falha ao iniciar TLS. Verifique OpenSSL/certificados do PHP.');
                }
                n3_smtp_command($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), [250], 'EHLO TLS');
            }

            n3_smtp_command($socket, 'AUTH LOGIN', [334], 'AUTH LOGIN');
            n3_smtp_command($socket, base64_encode($username), [334], 'SMTP Usuário');
            n3_smtp_command($socket, base64_encode($password), [235], 'SMTP senha');
            n3_smtp_command($socket, 'MAIL FROM:<' . $fromEmail . '>', [250], 'MAIL FROM');
            foreach ($recipients as $recipient) {
                n3_smtp_command($socket, 'RCPT TO:<' . $recipient . '>', [250, 251], 'RCPT TO ' . $recipient);
            }
            n3_smtp_command($socket, 'DATA', [354], 'DATA');
            fwrite($socket, $payload . "\r\n.\r\n");
            n3_smtp_expect($socket, [250], 'Envio DATA');
            n3_smtp_command($socket, 'QUIT', [221], 'QUIT');
            fclose($socket);
            return true;
        } catch (Throwable $e) {
            if (isset($socket) && is_resource($socket)) {
                fclose($socket);
            }
            n3_mail_log($e->getMessage());
            return false;
        }
    }
}
