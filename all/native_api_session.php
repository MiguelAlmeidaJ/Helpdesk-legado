<?php

require_once __DIR__ . '/app_url.php';
require_once __DIR__ . '/conect.php';

if (!function_exists('n3_hydrate_native_api_session')) {
  function n3_hydrate_native_api_session(): bool
  {
    if (!empty($_SESSION['allterusN3Id'])) {
      return true;
    }

    $cookieName = (string)allterus_env_value('API_SESSION_COOKIE', 'HELPDESK_SESSION');
    $token = isset($_COOKIE[$cookieName]) ? (string)$_COOKIE[$cookieName] : '';
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
      $_SESSION['allterusN3Modulo' . $module] = $user['user_modulo_' . $suffix] ?? '0000000000';
    }
    $_SESSION['tipo'] = (int)$user['tipo_usuario'];

    $companies = $pdo->prepare('SELECT cliente_id FROM clientes_usuarios WHERE usuario_id = :user_id');
    $companies->execute([':user_id' => $user['user_id']]);
    $_SESSION['empresas'] = array_map('intval', $companies->fetchAll(PDO::FETCH_COLUMN));
    $_SESSION['usuarios'] = [];
    if (!empty($_SESSION['empresas'])) {
      $placeholders = implode(',', array_fill(0, count($_SESSION['empresas']), '?'));
      $related = $pdo->prepare("SELECT DISTINCT usuario_id FROM clientes_usuarios WHERE cliente_id IN ($placeholders)");
      $related->execute($_SESSION['empresas']);
      $_SESSION['usuarios'] = array_map('intval', $related->fetchAll(PDO::FETCH_COLUMN));
    }

    return true;
  }
}
