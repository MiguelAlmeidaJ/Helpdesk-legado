<?php
function ConnectionPluginsApp() {
/*   $host = '189.17.195.66:41306';
  $db = 'plugins_app';
  $user = 'root';
  $pass = ''; */
  $host = '127.0.0.1:3306';
  $db = 'plugins_app';
  $user = 'root';
  $pass = '';

  try {
      $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
      $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
      return $pdo;
  } catch (PDOException $e) {
      die("Erro ao conectar ao banco de dados plugins_app: " . $e->getMessage());
  }
}

function ConnectionPatrimonios() {
  /*   $host = '189.17.195.66:41306';
    $db = 'plugins_app';
    $user = 'root';
    $pass = ''; */
    $host = '127.0.0.1:3306';
    $db = 'patrimonios';
    $user = 'root';
    $pass = '';
  
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        die("Erro ao conectar ao banco de dados patrimonios: " . $e->getMessage());
    }
  }

?>