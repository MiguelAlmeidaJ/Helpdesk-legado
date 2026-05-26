<?php
if (!isset($user_id)) {
  header("Location: ../index.php");
  die();
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  // consultar a senha atual
  $pdo = ConnectionN3();
  $sql = "SELECT user_pass FROM usuarios WHERE user_id = :user_id";
  $stmt = $pdo->prepare($sql);
  $stmt->bindValue(":user_id", $user_id);
  $stmt->execute();
  
  if ($stmt->rowCount() > 0) {
    $exibe = $stmt->fetch(PDO::FETCH_ASSOC);
    $senha = $exibe['user_pass'];
  } else {
    $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Usuário não encontrado!";
    $mensagem_cor = "alert-danger";
    exit;
  }

  // Senhas do formulário
  $senha_atual  = $_POST['senha_atual'];
  $n_senha2  = $_POST['n_senha2'];
  $n_senha1  = $_POST['n_senha1'];

  // Confere a senha atual
  if (!password_verify($senha_atual, $senha)) {
    $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Não foi possível atualizar sua senha de acesso: A senha digitada está incorreta!";
    $mensagem_cor = "alert-danger";
  } 
  // Confere se as novas senhas conferem
  else if ($n_senha2 != $n_senha1) {
    $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Não foi possível atualizar sua senha de acesso: As senhas digitadas não conferem!";
    $mensagem_cor = "alert-danger";
  } 
  // Atualiza a senha
  else {
    $senha2 = password_hash($n_senha1, PASSWORD_DEFAULT);
    $edt = $pdo->prepare("UPDATE usuarios SET user_pass = :nova_senha WHERE user_id = :user_id");
    $edt->bindValue(":nova_senha", $senha2);
    $edt->bindValue(":user_id", $user_id);
    if ($edt->execute()) {
      $mensagem = "<i class=\"fas fa-check\"></i> Senha de acesso ao sistema alterada com sucesso!";
      $mensagem_cor = "alert-success";
    } else {
      $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Erro ao atualizar a senha. Tente novamente.";
      $mensagem_cor = "alert-danger";
    }
  }
}
?>

