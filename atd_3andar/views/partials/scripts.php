<?php
/**
 * Scripts da página tarefa.php
 *
 * @var int $tarefa
 * @var bool $exibe_bt_tarefa_espera
 */
?>

<script src="../js/jquery-3.6.0.min.js"></script>
<script src="../js/bootstrap.bundle.min.js"></script>
<script src="../js/bootstrap-select.min.js"></script>
<script src="../js/bootstrap-datetimepicker.js"></script>
<script src="../js/loader.js" type="text/javascript"></script>

<script src="js/tarefa.js"></script>

<?php if (empty($tarefa)) { ?>
  <script src="js/tarefa-create.js"></script>
<?php } ?>


<?php if (empty($tarefa) || !empty($exibe_bt_tarefa_espera)) { ?>
  <script src="js/tarefa-datetime.js"></script>
<?php } ?>

<script>
  window.setTimeout(function() {
    $(".alert").fadeOut(500, function() {
      $(this).remove();
    });
  }, 4000);
</script>