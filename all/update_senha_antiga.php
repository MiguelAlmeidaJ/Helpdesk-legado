<?php
if(!isset($user_id)){
  header("Location: ../index.php");
  die();
}
    $senha_atual  = $_POST['senha_atual'];
    $n_senha2  = $_POST['n_senha2'];
    $n_senha1  = $_POST['n_senha1'];
    // $senha = $_SESSION['allterusN3Pass'];
    //CONFERE SE A SENHA ATUAL ESTÁ CORRETA
    if($senha != $senha_atual){
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Não foi possível atualizar sua senha de acesso: A senha digitada está incorreta!";
        $mensagem_cor = "alert-danger";
    }
    else{
      //CONFERE SE A SENHA REPETIDA É IGUAL
      if($n_senha2 != $n_senha1){
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Não foi possível atualizar sua senha de acesso: as senhas digitadas não conferem!";
        $mensagem_cor = "alert-danger";
      }
      //SE TUDO OK, ALTERA A SENHA
      else{
      $senha2 = password_hash($n_senha1, PASSWORD_DEFAULT);
      $pdo = ConnectionN3();
      $edt = $pdo->prepare("UPDATE usuarios SET user_pass = '$senha2' WHERE user_id = '$user_id'");
      $edt->execute(); 
      $mensagem = "<i class=\"fas fa-check\"></i> Senha de acesso ao sistema alterada com sucesso!";
      $mensagem_cor = "alert-success";
      }
    }
