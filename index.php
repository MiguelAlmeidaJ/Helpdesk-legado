<?php
session_start();
unset($_SESSION['loginErro'],
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
$_SESSION['allterusN3Modulo8'] );

  
include_once("./all/conect.php");
//RECEBE DADOS DO FORMULÁRIO DE LOGIN
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_STRING);
$usuariot = filter_input(INPUT_POST, 'usuario', FILTER_SANITIZE_STRING);
$senhat = filter_input(INPUT_POST, 'senha', FILTER_SANITIZE_STRING);
//VERIFICA SE EXISTE USUARIO E SENHA CADASTRADOS
if($action=="logar"){
  $pdo = ConnectionN3();
  $sql = "SELECT * FROM usuarios WHERE user_login = :usuariot AND user_pass = :senhat AND user_sts = '1' LIMIT 1";
  $busca_user = $pdo->prepare($sql);
  $busca_user->bindParam(':usuariot',$usuariot);
  $busca_user->bindParam(':senhat',$senhat);
  $busca_user->execute();
  $resultado = $busca_user->rowCount();
  if(empty($resultado)){
    $_SESSION['loginErro'] = "Usuário ou senha Inválido.";
    //header("Location: index.php");
  }else{
    $resultado=$busca_user->fetch(PDO::FETCH_ASSOC);
    $_SESSION['allterusN3Id'] = $resultado['user_id'];
    $_SESSION['allterusN3Nome'] = $resultado['user_nome'];
    $_SESSION['allterusN3Login'] = $resultado['user_login'];
    $_SESSION['allterusN3Pass'] = $resultado['user_pass'];
    $_SESSION['allterusN3Modulo1'] = $resultado['user_modulo_01'];
    $_SESSION['allterusN3Modulo2'] = $resultado['user_modulo_02'];
    $_SESSION['allterusN3Modulo3'] = $resultado['user_modulo_03'];
    $_SESSION['allterusN3Modulo4'] = $resultado['user_modulo_04'];
    $_SESSION['allterusN3Modulo5'] = $resultado['user_modulo_05'];
    $_SESSION['allterusN3Modulo6'] = $resultado['user_modulo_06'];
    $_SESSION['allterusN3Modulo7'] = $resultado['user_modulo_07'];
    $_SESSION['allterusN3Modulo8'] = $resultado['user_modulo_08'];
    
    $user_id = $resultado['user_id'];
    $today = date("Y-m-d H:i:s");
    $acao = "Logou.";
    $pdo =ConnectionN3();
    $insert_log = $pdo->prepare("INSERT INTO `log_uso` (`log_area`, `log_user`, `log_time`, `log_action`) VALUES ('1', '$user_id', '$today', '$acao')");
    $insert_log->execute();
    header("Location: home.php");
  }
}
?>
<!DOCTYPE html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Allterus</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="./img/favicon.ico" rel="icon"> 
    <link href="./css/bootstrap.css" rel="stylesheet">
    <link href="./css/login.css" rel="stylesheet">
    <link href="./css/signin.css" rel="stylesheet">
    <link href="./css/index.css" rel="stylesheet">
    <link href="./fontawesome/css/all.css" rel="stylesheet">    
  </head>
  <body>
      <div>
    
      
      
</div>

    <div class="container form-signin">
<!--      <form class="form-horizontal" method="POST" action="https://allterus.com.br/allterus/nivel3ti/index.php">      -->
      <form class="form-horizontal" method="POST" action="#">
        <fieldset>
          <div class="form-group">
            <div class="text-center">
              <img src="img/logo_n3ti_001.png" alt="Nivel 3" height="90"/>
            </div>
            <h4 class="form-signin-heading text-center"> </h4>
            
<?php
if(isset($_SESSION['loginErro'])){ ?>
            <div class="alert alert-danger" role="alert">
              <p class="text-center text-danger">
<?php echo $_SESSION['loginErro'];?>
              </p>
            </div>
<?php unset($_SESSION['loginErro'],
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
  $_SESSION['allterusN3Modulo8']); } ?>
          </div>

          <div class="input-group">
            <div class="input-group-prepend">
              <div class="input-group-text"><i class="fas fa-user text-danger"></i></div>
            </div>
            <input type="text" name="usuario" class="form-control" placeholder="Usuário" required autofocus>
          </div>
          
          <div class="input-group mt-2">
            <div class="input-group-prepend">
              <div class="input-group-text"><i class="fas fa-unlock-alt text-danger"></i></div>
            </div>
            <input type="password" name="senha" class="form-control" placeholder="Senha" required>
          </div>
          
          <div class="input-group mt-2">
            <input type="hidden" name="action" value="logar">
            <button class="btn btn-lg btn-danger btn-block" type="submit">Acessar</button>
          </div>
        </fieldset>
      </form>
      <p class="text-center text-muted text-small mt-2">ALLTERUS - Gestão inteligente</p>
    </div>
  </body>
  <div>
  
  </div>
</html>
