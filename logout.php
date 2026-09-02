<?php
require_once __DIR__ . "/all/session.php";
require_once __DIR__ . '/all/app_url.php';
require_once __DIR__ . '/all/conect.php';

$cookieName = (string)allterus_env_value('API_SESSION_COOKIE', 'HELPDESK_SESSION');
$token = isset($_COOKIE[$cookieName]) ? (string)$_COOKIE[$cookieName] : '';
if (strlen($token) >= 32 && strlen($token) <= 256) {
  $pdo = ConnectionN3();
  if ($pdo) {
    $statement = $pdo->prepare(
      "UPDATE api_sessions
       SET revoked_at = COALESCE(revoked_at, NOW(6)),
           revoke_reason = COALESCE(revoke_reason, 'logout_php_bridge')
       WHERE refresh_token_hash = :token_hash"
    );
    $statement->execute([':token_hash' => hash('sha256', $token)]);
  }
}

n3_session_destroy();
setcookie($cookieName, '', time() - 42000, '/', '', !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', true);

header('Location: ' . allterus_web_url('/login'));
exit;
