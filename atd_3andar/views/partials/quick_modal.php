<?php
$quick_modal = $_SESSION['tarefa_quick_modal'] ?? '';
unset($_SESSION['tarefa_quick_modal']);

$allowed_quick_modals = ['tarefa_aceitar', 'tarefa_retomar', 'tarefa_finalizar'];
?>

<?php if (in_array($quick_modal, $allowed_quick_modals, true)) { ?>
  <script>
    $(function() {
      var quickModal = '#<?php echo $quick_modal; ?>';

      if ($(quickModal).length) {
        $(quickModal).modal('show');
      }
    });
  </script>
<?php } ?>