<?php
require_once __DIR__ . "/all/session.php";
n3_session_start();
$isPost = (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST');
if ($isPost) {
  unset($_SESSION['loginErro']);
}

function n3_index_url(string $path = ''): string
{
  $basePath = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
  return ($basePath === '' ? '' : $basePath) . '/' . ltrim($path, '/');
}

if (
  !$isPost &&
  !empty($_SESSION['allterusN3Id']) &&
  !empty($_SESSION['allterusN3Nome']) &&
  !empty($_SESSION['allterusN3Login'])
) {
  header("Location: " . n3_index_url("home.php"));
  exit;
}

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

if ($isPost) {
  $action = sanitizeInput(filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS));
  $usuariot = sanitizeInput($_POST['usuario']);
  $senhat = $_POST['senha'];



  if ($action == "logar") {
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
      session_regenerate_id(true);
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

      header("Location: " . n3_index_url("home.php"));
      exit;
    } else {
      // 🚨 Se usuário ou senha estiverem errados
      $_SESSION['loginErro'] = "Usuário ou senha inválidos.";
      header("Location: " . n3_index_url("index.php"));
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
  <title>N3TI</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="./img/favicon.ico" rel="icon">
  <link href="./css/bootstrap.css" rel="stylesheet">
  <link href="./fontawesome/css/all.css" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
  <link href="./css/login_modern.css" rel="stylesheet">
</head>

<body>
  <video class="login-body-video" autoplay muted loop playsinline poster="./img/3.png" aria-hidden="true">
    <source src="./img/file.mp4" type="video/mp4">
  </video>

  <div class="login-page">
    <div class="login-shell">
      <div class="login-visual"></div>
      <div class="login-card">
        <div class="login-content">
          <div class="brand-logos">
            <div class="brand-logo-slot brand-logo-slot--nivel3" title="Nível 3">
              <img src="./img/logo_sidebar_expanded.png" alt="Logo Nível 3">
            </div>
          </div>

          <div class="brand">
            <p>Entre com seu usuário e senha</p>
          </div>

          <?php if (isset($_SESSION['loginErro'])) { ?>
            <div class="alert alert-danger" role="alert">
              <p class="mb-0 text-center text-danger"><?php echo $_SESSION['loginErro']; ?></p>
            </div>
          <?php unset($_SESSION['loginErro']); } ?>

          <form class="form-horizontal" method="POST" action="<?php echo htmlspecialchars(n3_index_url('index.php'), ENT_QUOTES, 'UTF-8'); ?>">
            <fieldset>
              <div class="input-group mt-2">
                <input type="text" name="usuario" class="form-control" placeholder="Usuário" required autofocus>
                <div class="input-group-append">
                  <div class="input-group-text"><i class="fas fa-user" style="color: #2f487e;"></i></div>
                </div>
              </div>

              <div class="input-group mt-2">
                <input type="password" name="senha" class="form-control" placeholder="Senha" required>
                <div class="input-group-append">
                  <button class="input-group-text border-left-0" type="button" id="toggle-password" aria-label="Mostrar senha">
                    <i class="fas fa-eye" style="color: #2f487e;"></i>
                  </button>
                </div>
              </div>

              <input type="hidden" name="action" value="logar">
              <button class="btn btn-lg btn-acessar btn-block" type="submit">Login</button>
            </fieldset>
          </form>

          <div class="box">
            <a href="#" id="esqueciSenhaLink">Esqueci minha senha</a>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="modalRecuperarLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content" style="border-radius: 10px; border: none; overflow: hidden;">
        <form method="post" action="enviar_email_recuperacao.php">
          <div class="modal-header" style="background-color: #2f487e; color: white; border-bottom: none;">
            <h5 class="modal-title" id="modalRecuperarLabel">Recuperar Senha</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Fechar" style="color: white; opacity: 1;">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body" style="padding: 2rem;">
            <p class="text-muted" id="modal-desc">Digite seu e-mail cadastrado. Enviaremos um link para você redefinir sua senha.</p>
            <div class="form-group" id="modal-form-group">
              <label for="email" class="sr-only">E-mail</label>
              <div class="input-group">
                <input type="email" name="email" id="email" class="form-control" placeholder="Seu e-mail" required>
                <div class="input-group-append">
                  <div class="input-group-text"><i class="fas fa-envelope" style="color: #2f487e;"></i></div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer" style="border-top: none; padding: 0 2rem 2rem;">
            <button type="button" class="btn btn-light" data-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-acessar">Enviar recuperação</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <script src="./js/jquery-3.4.1.min.js"></script>
  <script src="./js/bootstrap.bundle.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const passwordInput = document.querySelector('input[name="senha"]');
      const togglePassword = document.getElementById('toggle-password');
      const forgotPassword = document.getElementById('esqueciSenhaLink');

      if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
          const icon = this.querySelector('i');
          const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
          passwordInput.setAttribute('type', type);
          icon.classList.toggle('fa-eye');
          icon.classList.toggle('fa-eye-slash');
        });
      }

      if (forgotPassword && window.jQuery) {
        forgotPassword.addEventListener('click', function(event) {
          event.preventDefault();
          $('#myModal').modal('show');
        });
      }
    });
  </script>
</body>

</html>
