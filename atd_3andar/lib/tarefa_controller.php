<?php

function n3_tarefa3_process_request(
  PDO $pdo,
  int $user_id,
  string $hoje,
  string $agora,
  array $perms,
  string $usar_token = "true"
): array {
  $action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
  $tarefa = (int)($_POST['tarefa'] ?? $_GET['tarefa'] ?? 0);

  if ($action === "alterar_senha") {
    include_once(__DIR__ . "/../../all/update_senha.php");
  }

  $mensagem = null;
  $mensagem_cor = 'alert-info';
  $actionAllowed = true;

  if ($action && $action !== 'alterar_senha') {
    $tecnicoAtual = null;

    if ($tarefa > 0 && $action !== 'tarefa_adc') {
      $tecnicoAtual = n3_tarefa3_get_tecnico_atual($pdo, $tarefa);
    }

    $actionAllowed = n3_tarefa3_action_allowed($action, $tarefa, $tecnicoAtual, $user_id, $perms);

    if (!$actionAllowed) {
      $mensagem = '<i class="fas fa-exclamation-triangle"></i> Voce nao tem permissao para executar esta acao na tarefa.';
      $mensagem_cor = 'alert-danger';
    }
  }
  if ($actionAllowed && $usar_token === "true" && $action && $action !== "alterar_senha") {
    $resultadoAcao = n3_tarefa3_handle_action(
      $pdo,
      $action,
      $tarefa,
      $user_id,
      $hoje,
      $agora
    );

    $mensagem = $resultadoAcao['mensagem'] ?? '';
    $mensagem_cor = $resultadoAcao['mensagem_cor'] ?? 'alert-info';

    if (!empty($resultadoAcao['tarefa'])) {
      $tarefa = (int)$resultadoAcao['tarefa'];
    }
  }

  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($mensagem !== null && $mensagem !== '') {
      $_SESSION['mensagem'] = $mensagem;
      $_SESSION['mensagem_cor'] = $mensagem_cor;
    }

    if ($mensagem !== null && $mensagem_cor !== 'alert-success') {
      return [
        'action' => $action,
        'tarefa' => $tarefa,
      ];
    }

    $quick_modal = $_POST['quick_modal'] ?? '';
    $allowed_quick_modals = ['tarefa_aceitar', 'tarefa_retomar', 'tarefa_finalizar'];

    if (!$action && in_array($quick_modal, $allowed_quick_modals, true)) {
      $_SESSION['tarefa_quick_modal'] = $quick_modal;
    }

    $redirect_url = !empty($tarefa)
      ? 'tarefa.php?tarefa=' . urlencode((string)$tarefa)
      : 'tarefa.php';

    if (ob_get_length()) {
      ob_clean();
    }

    if (!headers_sent()) {
      header('Location: ' . $redirect_url);
    } else {
      echo '<script>window.location.href = ' . json_encode($redirect_url) . ';</script>';
    }

    exit;
  }

  return [
    'action' => $action,
    'tarefa' => $tarefa,
  ];
}