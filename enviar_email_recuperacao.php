<?php
session_start();

include_once("./all/conect.php");
include_once("./all/email_smtp.php");
function generateToken($length = 20) {
    return bin2hex(random_bytes($length));
}

function calculateExpiryDate() {
    $expiryDate = new DateTime();
    $expiryDate->add(new DateInterval('PT30M')); // Adicione 30 minutos
    return $expiryDate->format('Y-m-d H:i:s');
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $_POST["email"];

    $pdo = ConnectionN3();
    $sql = "SELECT * FROM usuarios WHERE user_mail = :email AND user_sts = '1' LIMIT 1";
    $busca_user = $pdo->prepare($sql);
    $busca_user->bindParam(':email',$email);
    $busca_user->execute();
    $resultado = $busca_user->rowCount();
    if(empty($resultado)){
    $_SESSION['loginErro'] = "Email Invalido";
    echo "erro email nao encontrado";
    }else{
        $token = generateToken();
        $expiryDate = calculateExpiryDate();

        $pdo = ConnectionN3();
        $sql = "INSERT INTO token_senha (token, expire, email)
        VALUES (:token, :expirydate, :email)";
        $guarda_user = $pdo->prepare($sql);
        $guarda_user->bindParam(':token', $token);
        $guarda_user->bindParam(':expirydate', $expiryDate);
        $guarda_user->bindParam(':email', $email);
        $guarda_user->execute();

        $to_email = "$email"; 
        $from_email = "allterus@nivel3ti.com.br"; 
        $subject = "Recuperacao de senha";
        
        // Armazene o token em sua base de dados junto com o prazo de validade (geralmente, 30 minutos)
        // Você também deve incluir a lógica para armazenar o token no banco de dados.

        // Crie o corpo do e-mail com o link para redefinir a senha
        $resetLink = "https://allterus.nivel3ti.com.br/n3ti/reset_senha.php?token=" . $token;
        $message = "Clique no link a seguir para redefinir sua senha:\n" . $resetLink;

        // Configure os cabeçalhos do e-mail
        $headers = "From: $from_email" . "\r\n" .
            "Reply-To: $from_email" . "\r\n" .
            "X-Mailer: PHP/" . phpversion();
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";

        // Envie o e-mail
        if (n3_send_mail($email, $subject, $message, $headers)) {
            $_SESSION["success_message"] = "Um e-mail de recuperação de senha foi enviado para o seu endereço de e-mail.";
        } else {
            $_SESSION["error_message"] = "Ocorreu um erro ao enviar o e-mail.";
        }
    } 
    // Redirecione de volta para a página de solicitação de recuperação de senha
    header("Location: index.php");
    exit();
}
