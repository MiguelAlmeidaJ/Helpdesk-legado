<?php
include_once("./all/conect.php");
$tokenValido = $_GET['token'];
$prazoexpirado = new DateTime();

$pdo = ConnectionN3();
$sql = "SELECT * FROM token_senha WHERE token = :tokenValido";
$busca_token = $pdo->prepare($sql);
$busca_token->bindParam(':tokenValido', $tokenValido);
$busca_token->execute();
$resultado = $busca_token->fetch(PDO::FETCH_ASSOC);

if (!$resultado) {
    echo "<script>alert('Token inválido'); window.location.href = 'index.php';</script>";
    exit();
}

$tokenbanco = $resultado['token'];
$databanco = $resultado['expire'];
$email = $resultado['email'];

if ($tokenValido !== $tokenbanco || $prazoexpirado > new DateTime($databanco)) {
    echo "<script>alert('Token expirado'); window.location.href = 'index.php';</script>";
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $n_senha1  = $_POST['n_senha1'];
    $n_senha2  = $_POST['n_senha2'];

    // Função para validar a senha
    function validarSenha($senha) {
        if (strlen($senha) < 12 || strlen($senha) > 20) {
            return false;
        }
        if (!preg_match('/[A-Z]/', $senha)) {
            return false;
        }
        if (!preg_match('/[a-z]/', $senha)) {
            return false;
        }
        if (!preg_match('/\d/', $senha)) {
            return false;
        }
        if (!preg_match('/[!@#$%^&*(),.?":{}|<>]/', $senha)) {
            return false;
        }
        return true;
    }

    if ($n_senha1 !== $n_senha2) {
        echo "<script>alert('As senhas não são iguais.'); window.history.back();</script>";
        exit();
    }

    if (!validarSenha($n_senha1)) {
        echo "<script>alert('A nova senha deve conter entre 12 a 20 caracteres, incluindo letras maiúsculas e minúsculas e um caractere especial.'); window.history.back();</script>";
        exit();
    }

    $senha2 = password_hash($n_senha1, PASSWORD_DEFAULT);
    $pdo = ConnectionN3();
    $edt = $pdo->prepare("UPDATE usuarios SET user_pass = :senha2 WHERE user_mail = :email");
    $edt->bindParam(':senha2', $senha2);
    $edt->bindParam(':email', $email);
    $edt->execute();
    echo "<script>alert('Senha de acesso ao sistema alterada com sucesso!'); window.location.href = 'index.php';</script>";
    exit();
}
?>

<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <title>Redefinir Senha</title>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />

    <style>
        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
        }
        body {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
        }
        .form-group {
            margin-bottom: 20px;
            /* Garante que o label fique alinhado à esquerda */
            text-align: left; 
        }
        .form-control {
            width: 100%;
        }
        .primary {
            color: #007BFF;
        }
        img {
            max-width: 100%;
        }
        
        /* NOVO: CSS para o ícone de olho ser clicável */
        .toggle-password {
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="img/logo_n3ti_001.png" alt="Logo" />
        <br><br><br><br>
        <h2 class="primary">Alteração da senha de acesso</h2>
        <form id="passwordForm" method="POST">
            
            <div class="form-group">
                <label class="primary" for="n_senha1">Nova Senha:</label>
                <div class="input-group">
                    <input id="n_senha1" name="n_senha1" type="password" placeholder="Nova Senha" class="form-control" required>
                    <div class="input-group-append">
                        <span class="input-group-text toggle-password">
                            <i class="fas fa-eye"></i>
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="primary" for="n_senha2">Repetir a Nova Senha:</label>
                <div class="input-group">
                    <input id="n_senha2" name="n_senha2" type="password" placeholder="Repita a nova senha" class="form-control" required>
                    <div class="input-group-append">
                        <span class="input-group-text toggle-password">
                            <i class="fas fa-eye"></i>
                        </span>
                    </div>
                </div>
                <div class="alert alert-info mt-2" role="alert">
                    A nova senha deverá conter no mínimo 12 caracteres, incluindo letras maiúsculas e minúsculas e um caractere especial.
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary">Salvar mudanças</button>
        </form>
    </div>

    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.16.0/umd/popper.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <script>
        // Seu script de validação original (mantido)
        document.getElementById('passwordForm').onsubmit = function() {
            var senha1 = document.getElementById('n_senha1').value;
            var senha2 = document.getElementById('n_senha2').value;

            if (senha1 !== senha2) {
                alert('As senhas não são iguais.');
                return false;
            }

            if (senha1.length < 12 || !/[A-Z]/.test(senha1) || !/[a-z]/.test(senha1) || !/\d/.test(senha1) || !/[!@#$%^&*(),.?":{}|<>]/.test(senha1)) {
                alert('A nova senha deve conter entre 12 a 20 caracteres, incluindo letras maiúsculas e minúsculas e um caractere especial.');
                return false;
            }

            return true;
        }

        // --- NOVO SCRIPT JQUERY PARA MOSTRAR/OCULTAR SENHA ---
        $(document).ready(function() {
            $('.toggle-password').click(function() {
                
                // 'this' é o <span> que foi clicado
                var icon = $(this).find('i');
                var input = $(this).closest('.input-group').find('input');

                // Verifica o tipo atual do input
                if (input.attr('type') === 'password') {
                    // Muda para texto
                    input.attr('type', 'text');
                    // Muda o ícone para 'olho cortado'
                    icon.removeClass('fa-eye').addClass('fa-eye-slash');
                } else {
                    // Muda para senha
                    input.attr('type', 'password');
                    // Muda o ícone de volta para 'olho'
                    icon.removeClass('fa-eye-slash').addClass('fa-eye');
                }
            });
        });
    </script>
</body>
</html>