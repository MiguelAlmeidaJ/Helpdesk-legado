<?php
function ConnectionN3()
{
  $dsn = 'mysql:host=localhost;dbname=nivel3;charset=utf8';
  $user = 'root';
  $pass = '';
  //  $dsn ='mysql:host=nivel3.mysql.dbaas.com.br;dbname=nivel3;charset=utf8';
  //  $user ='nivel3';
  //  $pass = '**********';
  try {
    $pdo = new PDO($dsn, $user, $pass);
    return $pdo;
  } catch (PDOException $exc) {
    echo 'Erro: ' . $exc->getMessage();
  }
}

function ConnectionMkt()
{
  $dsn = 'mysql:host=localhost;dbname=mkt;charset=utf8';
  $user = 'root';
  $pass = '';
  try {
    $pdoMkt = new PDO($dsn, $user, $pass);
    return $pdoMkt;
  } catch (PDOException $exc) {
    echo 'Erro: ' . $exc->getMessage();
  }
}

function ConnectionN3rd()
{
  $dsn = 'mysql:host=localhost;dbname=n3rd;charset=utf8';
  $user = 'root';
  $pass = '';
  try {
    $pdoN2 = new PDO($dsn, $user, $pass);
    return $pdoN2;
  } catch (PDOException $exc) {
    echo 'Erro: ' . $exc->getMessage();
  }
}
