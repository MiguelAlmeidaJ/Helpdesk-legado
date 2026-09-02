<?php
if (!function_exists('allterus_normalize_prefix')) {
  function allterus_normalize_prefix($prefix)
  {
    $prefix = trim((string)$prefix);
    if ($prefix === '' || $prefix === '/') {
      return '';
    }

    $prefix = str_replace('\\', '/', $prefix);
    return '/' . trim($prefix, '/');
  }
}

if (!function_exists('allterus_app_base_path')) {
  function allterus_app_base_path()
  {
    static $basePath = null;
    if ($basePath !== null) {
      return $basePath;
    }

    $docRoot = isset($_SERVER['DOCUMENT_ROOT']) ? realpath((string)$_SERVER['DOCUMENT_ROOT']) : false;
    $appRoot = realpath(dirname(__DIR__));

    if ($docRoot !== false && $appRoot !== false) {
      $docRoot = str_replace('\\', '/', rtrim($docRoot, '\\/'));
      $appRoot = str_replace('\\', '/', rtrim($appRoot, '\\/'));

      if (stripos($appRoot, $docRoot) === 0) {
        $basePath = allterus_normalize_prefix(substr($appRoot, strlen($docRoot)));
        return $basePath;
      }
    }

    $basePath = '';
    return $basePath;
  }
}

if (!function_exists('allterus_app_url')) {
  function allterus_app_url($path = '')
  {
    $path = (string)$path;
    $basePath = allterus_app_base_path();

    if ($path === '' || $path === '/') {
      return $basePath === '' ? '/' : $basePath . '/';
    }

    return ($basePath === '' ? '' : $basePath) . '/' . ltrim($path, '/');
  }
}

if (!function_exists('allterus_relative_url')) {
  function allterus_relative_url($url)
  {
    $url = (string)$url;
    if ($url === '' || preg_match('#^[a-z][a-z0-9+.-]*://#i', $url)) {
      return $url;
    }

    $parts = parse_url($url);
    $targetPath = isset($parts['path']) ? (string)$parts['path'] : $url;
    $query = isset($parts['query']) ? '?' . $parts['query'] : '';
    $fragment = isset($parts['fragment']) ? '#' . $parts['fragment'] : '';

    if ($targetPath === '' || $targetPath[0] !== '/') {
      return $url;
    }

    $scriptName = isset($_SERVER['SCRIPT_NAME']) ? str_replace('\\', '/', (string)$_SERVER['SCRIPT_NAME']) : '';
    if ($scriptName === '') {
      return $url;
    }

    $fromDir = dirname($scriptName);
    if ($fromDir === '.' || $fromDir === '/') {
      $fromDir = '';
    }

    $fromParts = array_values(array_filter(explode('/', trim($fromDir, '/')), 'strlen'));
    $toParts = array_values(array_filter(explode('/', trim($targetPath, '/')), 'strlen'));
    $common = 0;
    $limit = min(count($fromParts), count($toParts));

    while ($common < $limit && $fromParts[$common] === $toParts[$common]) {
      $common++;
    }

    $relativeParts = array_merge(
      array_fill(0, count($fromParts) - $common, '..'),
      array_slice($toParts, $common)
    );

    $relativePath = implode('/', $relativeParts);
    return ($relativePath === '' ? './' : $relativePath) . $query . $fragment;
  }
}

if (!function_exists('allterus_app_href')) {
  function allterus_app_href($path = '')
  {
    return allterus_relative_url(allterus_app_url($path));
  }
}

if (!function_exists('allterus_env_value')) {
  function allterus_env_value($name, $default = '')
  {
    $environment = getenv((string)$name);
    if ($environment !== false && trim((string)$environment) !== '') {
      return trim((string)$environment);
    }

    $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
    if (!is_readable($path)) {
      return $default;
    }

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
      $line = trim((string)$line);
      if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
        continue;
      }
      [$key, $value] = array_map('trim', explode('=', $line, 2));
      if ($key === $name) {
        return trim($value, "\"'");
      }
    }

    return $default;
  }
}

if (!function_exists('allterus_web_url')) {
  function allterus_web_url($path = '')
  {
    $origin = rtrim((string)allterus_env_value('WEB_PUBLIC_URL', allterus_env_value('WEB_ORIGIN', 'http://localhost:3000')), '/');
    return $origin . '/' . ltrim((string)$path, '/');
  }
}
