<?php
session_start();
include_once("../all/permissoes.php");
if(isset($_POST["id"])){
  include_once("../all/conect.php");
  $id = $_POST["id"];
  
  $pdo = ConnectionN3();
  $show = $pdo->prepare("SELECT cads_tipo_despe.* FROM cads_tipo_despe WHERE cads_tipo_despe.id = '$id'");
  $show->execute();
  $row=$show->fetch(PDO::FETCH_ASSOC);
  $tipo_despe=$row["tipo_despe"];
  $status=$row["status"];
?>          
              <div class="form-group row my-1">
                <label class="col-4 col-form-label text-right">Tipo de Despesa:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-funnel-dollar"></i></div>
                    </div> 
                    <input name="tipo_despe" type="text" class="form-control" required="required" value="<?php echo $tipo_despe; ?>">
                    <input type="hidden" name="id" value="<?php echo $id;?>">
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-4 col-form-label text-right">Nome Comercial:</label> 
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