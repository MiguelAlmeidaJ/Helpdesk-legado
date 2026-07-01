<?php

if (!function_exists('n3_session_storage_path')) {
    function n3_session_storage_path(): string
    {
        $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'sessions';
        if (!is_dir($path)) {
            @mkdir($path, 0775, true);
        }
        return $path;
    }
}

if (!function_exists('n3_configure_session')) {
    function n3_configure_session(): void
    {
        if (session_status() !== PHP_SESSION_NONE || headers_sent()) {
            return;
        }

        $sessionPath = n3_session_storage_path();
        if (is_dir($sessionPath) && is_writable($sessionPath)) {
            session_save_path($sessionPath);
        }

        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.gc_maxlifetime', '28800');

        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['SERVER_PORT'] ?? null) == 443);

        if (PHP_VERSION_ID >= 70300) {
            session_set_cookie_params([
                'lifetime' => 0,
                'path' => '/',
                'secure' => $isHttps,
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
        }
    }
}


if (!function_exists('n3_app_base_url')) {
    function n3_app_base_url(): string
    {
        $documentRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '');
        $appRoot = realpath(dirname(__DIR__));

        if ($documentRoot && $appRoot && strpos($appRoot, $documentRoot) === 0) {
            $relative = trim(str_replace('\\', '/', substr($appRoot, strlen($documentRoot))), '/');
            return $relative === '' ? '' : '/' . $relative;
        }

        $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
        return rtrim($scriptDir === '/' ? '' : $scriptDir, '/');
    }
}

if (!function_exists('n3_app_url')) {
    function n3_app_url(string $path = ''): string
    {
        return n3_app_base_url() . '/' . ltrim($path, '/');
    }
}

if (!function_exists('n3_session_start')) {
    function n3_session_start(): void
    {
        n3_configure_session();
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
    }
}
