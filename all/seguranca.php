<?php
ob_start();
if(
  ($_SESSION['allterusN3Id'] == "") ||
  ($_SESSION['allterusN3Nome'] == "") ||
  ($_SESSION['allterusN3Login'] == "") ||
  ($_SESSION['allterusN3Modulo1'] == "") ||
  ($_SESSION['allterusN3Modulo2'] == "") ||
  ($_SESSION['allterusN3Modulo3'] == "") ||
  ($_SESSION['allterusN3Modulo4'] == "") ||   
  ($_SESSION['allterusN3Modulo5'] == "") || 
  ($_SESSION['allterusN3Modulo6'] == "") ||  
  ($_SESSION['allterusN3Modulo7'] == "") ||   
  ($_SESSION['allterusN3Modulo8'] == "")    
){unset(
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
  $_SESSION['allterusN3Modulo8']
  );
  $_SESSION['loginErro'] = "Área restrita para usuários cadastrados.";
  header("Location: index.php");
  exit();
}
?>