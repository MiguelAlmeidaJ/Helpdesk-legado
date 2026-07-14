<?php
$flashMensagem = $_SESSION['mensagem'] ?? '';
$flashCor = $_SESSION['mensagem_cor'] ?? 'alert-info';

unset($_SESSION['mensagem'], $_SESSION['mensagem_cor']);
?>

<?php if (!empty($flashMensagem)) { ?>
  <div class="row pull-right" style="position:absolute; top: 65px; right:50px; z-index: 3;">
    <div class="alert <?php echo $flashCor; ?> alert-dismissible fade show" role="alert">
      <?php echo $flashMensagem; ?>
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  </div>
<?php } ?>