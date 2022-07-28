<?php
function ConnectionN3(){
  $dsn ='mysql:host=localhost;dbname=nivel3;charset=utf8';
  $user ='root';
  $pass = '';
//  $dsn ='mysql:host=nivel3.mysql.dbaas.com.br;dbname=nivel3;charset=utf8';
//  $user ='nivel3';
//  $pass = 'N3ti+Allterus@';
  try {
    $pdo = new PDO($dsn, $user, $pass);
    return $pdo;
  } catch (PDOException $exc) {
    echo 'Erro: '.$exc->getMessage();
  }
}