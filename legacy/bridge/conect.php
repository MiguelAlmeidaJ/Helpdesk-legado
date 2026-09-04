<?php
require_once __DIR__ . '/app_url.php';

if (!function_exists('n3_database_connection_from_url')) {
  function n3_database_connection_from_url($url, $label)
  {
    $url = trim((string)$url);
    $parts = parse_url($url);

    if (
      $parts === false ||
      strtolower((string)($parts['scheme'] ?? '')) !== 'mysql' ||
      empty($parts['host'])
    ) {
      error_log('[Legacy DB] URL inválida para ' . $label . '.');
      return null;
    }

    $database = ltrim((string)($parts['path'] ?? ''), '/');
    if ($database === '') {
      error_log('[Legacy DB] Banco não informado na URL de ' . $label . '.');
      return null;
    }

    $host = (string)$parts['host'];
    $port = isset($parts['port']) ? (int)$parts['port'] : null;
    $user = isset($parts['user']) ? rawurldecode((string)$parts['user']) : '';
    $pass = isset($parts['pass']) ? rawurldecode((string)$parts['pass']) : '';
    $charset = 'utf8';

    if (!empty($parts['query'])) {
      $query = [];
      parse_str((string)$parts['query'], $query);
      $candidate = isset($query['charset']) ? (string)$query['charset'] : '';
      if ($candidate !== '' && preg_match('/^[a-zA-Z0-9_]+$/', $candidate)) {
        $charset = $candidate;
      }
    }

    $dsn = 'mysql:host=' . $host;
    if ($port !== null && $port > 0) {
      $dsn .= ';port=' . $port;
    }
    $dsn .= ';dbname=' . $database . ';charset=' . $charset;

    try {
      return new PDO($dsn, $user, $pass);
    } catch (PDOException $exc) {
      error_log('[Legacy DB] Falha ao conectar em ' . $label . ': ' . $exc->getMessage());
      return null;
    }
  }
}

if (!function_exists('n3_database_url')) {
  function n3_database_url($name, $fallback)
  {
    return (string)allterus_env_value($name, $fallback);
  }
}

function ConnectionN3()
{
  return n3_database_connection_from_url(
    n3_database_url('NIVEL3_DATABASE_URL', 'mysql://root@localhost/nivel3'),
    'nivel3'
  );
}

function ConnectionN3rd()
{
  return n3_database_connection_from_url(
    n3_database_url('N3RD_DATABASE_URL', 'mysql://root@localhost/n3rd'),
    'n3rd'
  );
}

/**
 * @deprecated The native architecture does not use a separate mkt database.
 * Keep this compatibility entry point only while a legacy PHP caller remains.
 */
function ConnectionMkt()
{
  return n3_database_connection_from_url(
    n3_database_url('MKT_DATABASE_URL', 'mysql://root@localhost/mkt'),
    'mkt'
  );
}
