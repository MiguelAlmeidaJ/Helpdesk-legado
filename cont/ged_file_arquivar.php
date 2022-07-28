<?php
session_start();
//include_once("../all/permissoes.php");
if(isset($_POST["id"])){
  include_once("../all/conect.php");
  $id = $_POST["id"];
 
  $pdo = ConnectionN3();
  $show = $pdo->prepare("SELECT ged_fl_id, ged_fl_name FROM ged_file WHERE ged_fl_id = '$id'");
  $show->execute();
  $exibe=$show->fetch(PDO::FETCH_ASSOC);
  $ged_fl_name = $exibe["ged_fl_name"];
?>          

          <input type="hidden" name="ged_fl_id" value="<?php echo $id; ?>">


<?php } ?>