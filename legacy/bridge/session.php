<?php

require_once __DIR__ . '/app_url.php';
require_once __DIR__ . '/conect.php';

if (!defined('N3_SESSION_LIFETIME')) {
    define('N3_SESSION_LIFETIME', 60 * 60 * 24 * 365);
}

if (!function_exists('n3_legacy_absolute_path')) {
    function n3_legacy_absolute_path(string $path): bool
    {
        return $path !== '' && (
            $path[0] === '/' ||
            $path[0] === '\\' ||
            preg_match('/^[A-Za-z]:[\\\\\\/]/', $path) === 1
        );
    }
}

if (!function_exists('n3_session_storage_path')) {
    function n3_session_storage_path(): string
    {
        $configured = trim((string)allterus_env_value(
            'LEGACY_SESSION_PATH',
            './storage/sessions'
        ));
        $path = $configured !== '' ? $configured : './storage/sessions';

        if (!n3_legacy_absolute_path($path)) {
            $path = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . ltrim(
                str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path),
                '.' . DIRECTORY_SEPARATOR
            );
        }

        if (!is_dir($path)) {
            @mkdir($path, 0775, true);
        }

        return $path;
    }
}

if (!function_exists('n3_legacy_session_cookie_name')) {
    function n3_legacy_session_cookie_name(): string
    {
        $name = trim((string)allterus_env_value(
            'LEGACY_SESSION_COOKIE',
            'PHPSESSID'
        ));

        return preg_match('/^[A-Za-z0-9_-]{1,64}$/', $name) === 1
            ? $name
            : 'PHPSESSID';
    }
}

if (!function_exists('n3_configure_session')) {
    function n3_configure_session(): void
    {
        if (session_status() !== PHP_SESSION_NONE || headers_sent()) {
            return;
        }

        session_name(n3_legacy_session_cookie_name());

        $sessionPath = n3_session_storage_path();
        if (is_dir($sessionPath) && is_writable($sessionPath)) {
            session_save_path($sessionPath);
        }

        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.gc_maxlifetime', (string)N3_SESSION_LIFETIME);

        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['SERVER_PORT'] ?? null) == 443);

        if (PHP_VERSION_ID >= 70300) {
            session_set_cookie_params([
                'lifetime' => N3_SESSION_LIFETIME,
                'path' => '/',
                'secure' => $isHttps,
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
        }
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

if (!function_exists('n3_session_destroy')) {
    function n3_session_destroy(): void
    {
        n3_session_start();
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'] ?? '/',
                $params['domain'] ?? '',
                (bool)($params['secure'] ?? false),
                (bool)($params['httponly'] ?? true)
            );
        }

        session_destroy();
    }
}

if (!function_exists('n3_app_base_url')) {
    function n3_app_base_url(): string
    {
        return allterus_app_base_path();
    }
}

if (!function_exists('n3_app_url')) {
    function n3_app_url(string $path = ''): string
    {
        return allterus_app_url($path);
    }
}

if (!function_exists('n3_hydrate_native_api_session')) {
    function n3_hydrate_native_api_session(): bool
    {
        n3_session_start();

        if (!empty($_SESSION['allterusN3Id'])) {
            return true;
        }

        $cookieName = (string)allterus_env_value(
            'API_SESSION_COOKIE',
            'HELPDESK_SESSION'
        );
        $token = isset($_COOKIE[$cookieName])
            ? (string)$_COOKIE[$cookieName]
            : '';

        if (strlen($token) < 32 || strlen($token) > 256) {
            return false;
        }

        $pdo = ConnectionN3();
        if (!$pdo) {
            return false;
        }

        $statement = $pdo->prepare(
            "SELECT u.*
             FROM api_sessions s
             INNER JOIN usuarios u ON u.user_id = s.user_id
             WHERE s.refresh_token_hash = :token_hash
               AND s.revoked_at IS NULL
               AND s.expires_at > NOW(6)
               AND u.user_sts = 1
             LIMIT 1"
        );
        $statement->execute([':token_hash' => hash('sha256', $token)]);
        $user = $statement->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            return false;
        }

        session_regenerate_id(true);
        $_SESSION['allterusN3Id'] = $user['user_id'];
        $_SESSION['allterusN3Nome'] = $user['user_nome'];
        $_SESSION['allterusN3Login'] = $user['user_login'];
        $_SESSION['allterusN3func'] = $user['user_funcao'];

        for ($module = 1; $module <= 9; $module++) {
            $suffix = str_pad((string)$module, 2, '0', STR_PAD_LEFT);
            $_SESSION['allterusN3Modulo' . $module] =
                $user['user_modulo_' . $suffix] ?? '0000000000';
        }

        $_SESSION['tipo'] = (int)$user['tipo_usuario'];

        $companies = $pdo->prepare(
            'SELECT cliente_id FROM clientes_usuarios WHERE usuario_id = :user_id'
        );
        $companies->execute([':user_id' => $user['user_id']]);
        $_SESSION['empresas'] = array_map(
            'intval',
            $companies->fetchAll(PDO::FETCH_COLUMN)
        );

        $_SESSION['usuarios'] = [];
        if (!empty($_SESSION['empresas'])) {
            $placeholders = implode(
                ',',
                array_fill(0, count($_SESSION['empresas']), '?')
            );
            $related = $pdo->prepare(
                "SELECT DISTINCT usuario_id
                 FROM clientes_usuarios
                 WHERE cliente_id IN ($placeholders)"
            );
            $related->execute($_SESSION['empresas']);
            $_SESSION['usuarios'] = array_map(
                'intval',
                $related->fetchAll(PDO::FETCH_COLUMN)
            );
        }

        return true;
    }
}

if (!function_exists('n3_legacy_session_is_authenticated')) {
    function n3_legacy_session_is_authenticated(): bool
    {
        $required = [
            'allterusN3Id',
            'allterusN3Nome',
            'allterusN3Login',
            'allterusN3Modulo1',
            'allterusN3Modulo2',
            'allterusN3Modulo3',
            'allterusN3Modulo4',
            'allterusN3Modulo5',
            'allterusN3Modulo6',
            'allterusN3Modulo7',
            'allterusN3Modulo8',
            'allterusN3Modulo9',
        ];

        foreach ($required as $key) {
            if (empty($_SESSION[$key])) {
                return false;
            }
        }

        return true;
    }
}

if (!function_exists('n3_clear_legacy_auth_session')) {
    function n3_clear_legacy_auth_session(): void
    {
        $keys = [
            'allterusN3Id',
            'allterusN3Nome',
            'allterusN3Login',
            'allterusN3func',
            'allterusN3Modulo1',
            'allterusN3Modulo2',
            'allterusN3Modulo3',
            'allterusN3Modulo4',
            'allterusN3Modulo5',
            'allterusN3Modulo6',
            'allterusN3Modulo7',
            'allterusN3Modulo8',
            'allterusN3Modulo9',
            'tipo',
            'empresas',
            'usuarios',
        ];

        foreach ($keys as $key) {
            unset($_SESSION[$key]);
        }
    }
}

if (!function_exists('n3_legacy_require_authenticated')) {
    function n3_legacy_require_authenticated(): void
    {
        n3_session_start();
        n3_hydrate_native_api_session();

        ob_start();
        if (n3_legacy_session_is_authenticated()) {
            return;
        }

        n3_clear_legacy_auth_session();
        $_SESSION['loginErro'] =
            'Área restrita para usuários cadastrados.';
        header('Location: ' . allterus_web_url('/login'));
        exit;
    }
}
