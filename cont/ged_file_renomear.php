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
        <div class="modal-body py-1">
          <div class="form-row">        
            <div class="form-group col-sm-12">
              <label class="my-0 small">Nome do arquivo:</label>
              <input type="text" name="ged_fl_name" value="<?php echo $ged_fl_name; ?>" class="form-control form-control-sm" required="required" tabindex="1" >
              <input type="hidden" name="ged_fl_id" value="<?php echo $id; ?>">
            </div>
          </div>
        </div>

<?php } ?>