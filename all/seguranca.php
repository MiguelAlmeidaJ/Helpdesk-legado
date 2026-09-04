<?php
require_once __DIR__ . '/session.php';
n3_session_start();
require_once __DIR__ . '/native_api_session.php';
n3_hydrate_native_api_session();


ob_start();
if (
  empty($_SESSION['allterusN3Id']) ||
  empty($_SESSION['allterusN3Nome']) ||
  empty($_SESSION['allterusN3Login']) ||
  empty($_SESSION['allterusN3Modulo1']) ||
  empty($_SESSION['allterusN3Modulo2']) ||
  empty($_SESSION['allterusN3Modulo3']) ||
  empty($_SESSION['allterusN3Modulo4']) ||
  empty($_SESSION['allterusN3Modulo5']) ||
  empty($_SESSION['allterusN3Modulo6']) ||
  empty($_SESSION['allterusN3Modulo7']) ||
  empty($_SESSION['allterusN3Modulo8']) ||
  empty($_SESSION['allterusN3Modulo9'])
) {
  unset(
  $_SESSION['allterusN3Id'],
  $_SESSION['allterusN3Nome'],
  $_SESSION['allterusN3Login'],
  $_SESSION['allterusN3Modulo1'],
  $_SESSION['allterusN3Modulo2'],
  $_SESSION['allterusN3Modulo3'],
  $_SESSION['allterusN3Modulo4'],
  $_SESSION['allterusN3Modulo5'],
  $_SESSION['allterusN3Modulo6'],
  $_SESSION['allterusN3Modulo7'],
  $_SESSION['allterusN3Modulo8'],
  $_SESSION['allterusN3Modulo9']
  );
  $_SESSION['loginErro'] = "Área restrita para usuários cadastrados.";
  header('Location: ' . allterus_web_url('/login'));
  exit();
}
?>
