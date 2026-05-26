<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/permissoes.php");
if(isset($_POST["id"])){
  include_once("../all/conect.php");
  $id = $_POST["id"];
  
  $pdo = ConnectionN3();
  $show = $pdo->prepare("SELECT cads_tipo_despe.* FROM cads_tipo_despe WHERE cads_tipo_despe.id = '$id'");
  $show->execute();
  $row=$show->fetch(PDO::FETCH_ASSOC);
  $tipo_despesa=$row["despesa"];
  $class_contab_id=$row["class_contab"];
  $status=$row["status"];
?>          

              <div class="form-group row my-1">
                <label class="col-4 col-form-label text-right">Tipo de Despesa:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-tag"></i></div>
                    </div> 
                    <input name="despesa" type="text" class="form-control" required="required" value="<?php echo $tipo_despesa; ?>">
                    <input type="hidden" name="id" value="<?php echo $id;?>">
                  </div>
                </div>
              </div>

              <div class="form-group row my-1">
                <label class="col-4 col-form-label text-right">Clas. Contábil:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-tags"></i></div>
                    </div> 
                    <select name="class_contab" required="required" class="form-control">
<?php
$pdo = ConnectionN3();
$show_eqp = $pdo->prepare("SELECT cads_class_contab.* FROM cads_class_contab ORDER BY cads_class_contab.categoria ASC");
$show_eqp->execute();
while($row=$show_eqp->fetch(PDO::FETCH_ASSOC)){
  $id=$row["id"];
  $class_contab=$row["categoria"];
?>
                      <option value="<?php echo $id; ?>" <?php if($class_contab_id==$id){ echo " Selected";}?>><?php echo $class_contab; ?></option>
<?php } ?>
                    </select>
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-4 col-form-label text-right">Status:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-toggle-on"></i></div>
                    </div>
                    <select name="status" required="required" class="form-control">
                      <option value="1" <?php if($status==1){ echo " selected";}?>>Ativo</option>
                      <option value="0" <?php if($status==0){ echo " selected";}?>>Inativo</option>
                    </select>
                  </div>
                </div>
              </div>
<?php } ?>