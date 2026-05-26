<?php
session_start();
session_unset();  // Remove todas as variáveis da sessão
session_destroy(); // Destrói a sessão ativa
session_start();   // Inicia uma nova sessão limpa
unset(
  $_SESSION['loginErro'],
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
  $_SESSION['allterusN3Modulo9'],
);

include_once("./all/conect.php");



function sanitizeInput($input)
{
  return htmlspecialchars(strip_tags(trim($input)));
}

// function isPasswordValid($password) {
//     $minLength = 12;
//     $maxLength = 20;
//     $hasUpperCase = preg_match('/[A-Z]/', $password);
//     $hasLowerCase = preg_match('/[a-z]/', $password);
//     $hasNumbers = preg_match('/[0-9]/', $password);
//     $hasSpecialChar = preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password);
//     $lengthValid = strlen($password) >= $minLength && strlen($password) <= $maxLength;

//     return $hasUpperCase && $hasLowerCase && $hasNumbers && $hasSpecialChar && $lengthValid;
// }

function isPasswordValid($password)
{
  $minLength = 12;
  $maxLength = 100; // Aumentado para permitir frases

  $hasUpperCase = preg_match('/[A-Z]/', $password);
  $hasLowerCase = preg_match('/[a-z]/', $password);
  $hasNumbers = preg_match('/[0-9]/', $password);

  // Verifica se há qualquer caractere que NÃO seja letra ou número (símbolos gerais)
  $hasSpecialChar = preg_match('/[^a-zA-Z0-9]/', $password);

  $lengthValid = strlen($password) >= $minLength && strlen($password) <= $maxLength;

  return $hasUpperCase && $hasLowerCase && $hasNumbers && $hasSpecialChar && $lengthValid;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $action = sanitizeInput(filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS));
  $usuariot = sanitizeInput($_POST['usuario']);
  $senhat = $_POST['senha'];



  if ($action == "logar") {
    if (!isPasswordValid($senhat)) {
      $_SESSION['loginErro'] = "A senha deve ter entre 12 e 20 caracteres, incluindo: letra maiúscula, letra minúscula, números e caracteres especiais.";
      header("Location: index.php");
      exit;
    }

    $pdo = ConnectionN3();
    // Consulta segura ao banco
    $sql = "SELECT * FROM usuarios WHERE user_login = :usuariot AND user_sts = '1' LIMIT 1";
    $busca_user = $pdo->prepare($sql);
    $busca_user->bindParam(':usuariot', $usuariot, PDO::PARAM_STR);
    $busca_user->execute();
    $resultado = $busca_user->fetch(PDO::FETCH_ASSOC);



    // echo "<pre>";
    // print_r($resultado);
    // echo "</pre>";

    // echo "<pre>";
    // print_r($_SESSION);
    // echo "</pre>";
    // exit;

    // Verifica se encontrou o usuário e se a senha está correta
    if ($resultado && password_verify($senhat, $resultado['user_pass'])) {
      unset($_SESSION['loginErro']); // Remove qualquer erro de login

      // remove a senha da sessão
      unset($_SESSION['allterusN3Pass']);

      // ✅ Define as variáveis de sessão
      $_SESSION['allterusN3Id'] = $resultado['user_id'];
      $_SESSION['allterusN3Nome'] = $resultado['user_nome'];
      $_SESSION['allterusN3Login'] = $resultado['user_login'];
      $_SESSION['allterusN3func'] = $resultado['user_funcao'];
      $_SESSION['allterusN3Modulo1'] = $resultado['user_modulo_01'];
      $_SESSION['allterusN3Modulo2'] = $resultado['user_modulo_02'];
      $_SESSION['allterusN3Modulo3'] = $resultado['user_modulo_03'];
      $_SESSION['allterusN3Modulo4'] = $resultado['user_modulo_04'];
      $_SESSION['allterusN3Modulo5'] = $resultado['user_modulo_05'];
      $_SESSION['allterusN3Modulo6'] = $resultado['user_modulo_06'];
      $_SESSION['allterusN3Modulo7'] = $resultado['user_modulo_07'];
      $_SESSION['allterusN3Modulo8'] = $resultado['user_modulo_08'];
      $_SESSION['allterusN3Modulo9'] = $resultado['user_modulo_09'];



      // Consulta para obter as empresas do usuário
      $sqlEmpresasUsuario = "SELECT cliente_id FROM clientes_usuarios WHERE usuario_id = :user_id";
      $empresas_usuario = $pdo->prepare($sqlEmpresasUsuario);
      $empresas_usuario->bindParam(':user_id', $resultado['user_id']);
      $empresas_usuario->execute();
      $exibe = $empresas_usuario->fetchAll(PDO::FETCH_ASSOC);
      $_SESSION['empresas'] = array_column($exibe, 'cliente_id');

      if (!empty($exibe)) {
        $sqlUsuariosEmpresa = "SELECT DISTINCT usuario_id FROM clientes_usuarios WHERE cliente_id IN (" . implode(',', array_column($exibe, 'cliente_id')) . ")";
        $usuarios_empresas = $pdo->prepare($sqlUsuariosEmpresa);
        $usuarios_empresas->execute();
        $exibeUsuariosEmpresas = $usuarios_empresas->fetchAll(PDO::FETCH_ASSOC);
        $_SESSION['usuarios'] = array_column($exibeUsuariosEmpresas, 'usuario_id');
      }

      $_SESSION['tipo'] = $resultado['tipo_usuario'];

      // ✅ Grava o log de login
      $user_id = $resultado['user_id'];
      $today = date("Y-m-d H:i:s");
      $acao = "Logou.";
      $insert_log = $pdo->prepare("INSERT INTO `log_uso` (`log_area`, `log_user`, `log_time`, `log_action`) VALUES ('1', :user_id, :today, :acao)");
      $insert_log->bindParam(':user_id', $user_id);
      $insert_log->bindParam(':today', $today);
      $insert_log->bindParam(':acao', $acao);
      $insert_log->execute();

      // echo "<prev>";
      // print_r($_SESSION);
      // echo "</prev>";
      // exit;

      header("Location: home.php");
      exit;
    } else {
      // 🚨 Se usuário ou senha estiverem errados
      $_SESSION['loginErro'] = "Usuário ou senha inválidos.";
      header("Location: index.php");
      exit;
    }
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
  <!-- <link href="./css/login.css" rel="stylesheet"> -->
  <link href="./css/signin.css" rel="stylesheet">
  <link href="./css/index.css" rel="stylesheet">
  <link href="./fontawesome/css/all.css" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">

  <style>
    .container {
      max-width: 400px;
      margin-top: 50px;
      padding: 20px;
      background-color: #f7f7f7;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    .text-center img {
      margin-bottom: 20px;
    }

    .alert {
      margin-top: 20px;
    }

    .input-group-text {
      background-color: #e9ecef;
    }

    .btn-block {
      margin-top: 20px;
    }

    .box {
      text-align: center;
      margin-top: 10px;
    }

    .box a {
      color: #007bff;
      text-decoration: none;
    }

    .box a:hover {
      text-decoration: underline;
    }

    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
    }

    .modal-content {
      background-color: #fff;
      width: 50%;
      margin: 100px auto;
      padding: 20px;
      border-radius: 5px;
    }

    .close {
      float: right;
      cursor: pointer;
    }

    .text-small {
      font-size: 0.8em;
    }

    .text-center.text-muted {
      margin-top: 10px;
    }

    body {
      zoom: 0.9;
      /* Escala o conteúdo sem alterar o contexto de layout */
      width: 100%;
      /* Mantém o layout responsivo */
      overflow-x: hidden;
      /* Garante que não haja rolagem horizontal */
    }
  </style>
</head>

<body>
  <div class="container form-signin">


    <!-- 2FA -->
    <!-- <form class="form-horizontal" method="POST" action="authenticate.php"> -->


    <form class="form-horizontal" method="POST" action="#">
      <fieldset>
        <div class="form-group">
          <div class="text-center">
            <img src="img/logo_n3ti_001.png" alt="Nivel 3" height="90" />
          </div>

          <?php
          if (isset($_SESSION['loginErro'])) { ?>
            <div class="alert alert-danger" role="alert">
              <p class="text-center text-danger">
                <?php echo $_SESSION['loginErro']; ?>
              </p>
            </div>
          <?php unset($_SESSION['loginErro']);
          } ?>
        </div>

        <div class="input-group mt-2">
          <input type="text" name="usuario" class="form-control" placeholder="Usuário" required autofocus>
          <div class="input-group-append">
            <div class="input-group-text"><i class="fas fa-user text-primary"></i></div>
          </div>
        </div>

        <div class="input-group mt-2">
          <input type="password" name="senha" class="form-control" placeholder="Senha" required>
          <div class="input-group-append">
            <div class="input-group-text"><i class="fas fa-eye text-primary" id="toggle-password"></i></div>
          </div>
        </div>

        <div class="input-group mt-2">
          <input type="hidden" name="action" value="logar">
          <button class="btn btn-lg btn-primary btn-block" type="submit">Acessar</button>
        </div>
      </fieldset>
    </form>

    <div class="box">
      <a href="#" id="esqueciSenhaLink">Esqueci minha senha</a>
    </div>

    <p class="text-center text-muted text-small mt-2">Allterus - Gestão Inteligente</p>
  </div>

  <div id="myModal" class="modal">
    <div class="modal-content" style="background-color: #f9f9f9; border-radius: 8px; box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.2); max-width: 400px; margin: auto; padding: 20px; position: relative; text-align: center;">
      <span class="close" id="fecharModal" style="color: #555; float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
      <form method="post" action="enviar_email_recuperacao.php">
        <h2 style="color: #333; font-family: Arial, sans-serif; margin-bottom: 20px;">Recuperar Senha</h2>
        <label for="email" style="display: block; margin-bottom: 10px; color: #555; font-family: Arial, sans-serif;">Digite seu e-mail cadastrado:</label>
        <input type="email" name="email" id="email" required style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;">
        <input type="submit" value="Enviar E-mail de Recuperação" style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; transition: background-color 0.3s;">
      </form>
    </div>
  </div>

  <style>
    .modal {
      display: none;
      position: fixed;
      z-index: 1;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgba(0, 0, 0, 0.4);
      padding-top: 60px;
    }

    .modal-content input[type="submit"]:hover {
      background-color: #45a049;
    }

    .modal-content input[type="submit"]:active {
      background-color: #3e8e41;
    }

    .modal-content .close:hover,
    .modal-content .close:focus {
      color: #000;
      text-decoration: none;
      cursor: pointer;
    }
  </style>


  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const form = document.querySelector('.form-horizontal');
      const passwordInput = document.querySelector('input[name="senha"]');
      const usuarioInput = document.querySelector('input[name="usuario"]');
      const errorMessage = document.createElement('div');
      errorMessage.classList.add('alert', 'alert-danger', 'mt-2');
      errorMessage.style.display = 'none';
      form.insertBefore(errorMessage, form.firstChild);

      function validatePassword(password) {
        const minLength = 12;
        const maxLength = 20;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const lengthValid = password.length >= minLength && password.length <= maxLength;

        return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && lengthValid;
      }

      // Validação da senha antes de enviar o formulário
      form.addEventListener('submit', function(event) {
        errorMessage.style.display = 'none';
        if (!validatePassword(passwordInput.value)) {
          event.preventDefault();
          errorMessage.innerHTML = `
        <p>A senha deve atender aos seguintes critérios:</p>
        <ul>
          <li>Entre 12 e 20 caracteres</li>
          <li>Pelo menos uma letra maiúscula</li>
          <li>Pelo menos uma letra minúscula</li>
          <li>Pelo menos um número</li>
          <li>Pelo menos um caractere especial (!@#$%^&*)</li>
        </ul>`;
          errorMessage.style.display = 'block';
          logLoginError(usuarioInput.value);
        }
      });


      // CHAMA A FUNÇÃO PARA GERAR O LOG DE ERRO DE ACESSO PARA CONFIGURAÇÃO DO FAIL2BAN
      async function logLoginError(username) {
        await fetch('loginAllterus_error.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            username: username,
          })

        });
      }

      document.getElementById('toggle-password').addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
      });

      document.getElementById("esqueciSenhaLink").addEventListener("click", function(event) {
        event.preventDefault();
        document.getElementById("myModal").style.display = "block";
      });

      document.getElementById("fecharModal").addEventListener("click", function() {
        document.getElementById("myModal").style.display = "none";
      });

      window.onclick = function(event) {
        if (event.target == document.getElementById("myModal")) {
          document.getElementById("myModal").style.display = "none";
        }
      };
    });
  </script>
</body>

</html>