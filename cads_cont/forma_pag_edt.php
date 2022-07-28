<?php
session_start();
include_once("../all/permissoes.php");
if(isset($_POST["id"])){
  include_once("../all/conect.php");
  $id = $_POST["id"];
  
  $pdo = ConnectionN3();
  $show = $pdo->prepare("SELECT cads_forma_pag.* FROM cads_forma_pag WHERE cads_forma_pag.id = '$id'");
  $show->execute();
  $row=$show->fetch(PDO::FETCH_ASSOC);
  $forma=$row["forma"];
  $status=$row["status"];
?>          
              <div class="form-group row my-1">
                <label class="col-4 col-form-label text-right">Forma de Pagamento:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-comments-dollar"></i></div>
                    </div> 
                    <input name="forma" type="text" class="form-control" required="required" value="<?php echo $forma; ?>">
                    <input type="hidden" name="id" value="<?php echo $id;?>">
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