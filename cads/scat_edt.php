<?php
session_start();
include_once("../all/permissoes.php");
if(isset($_POST["id"])){
  include_once("../all/conect.php");
  $id = filter_input(INPUT_POST, 'id', FILTER_SANITIZE_NUMBER_INT);

  function h($value)
  {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
  }
  
  $pdo = ConnectionN3();
  $show = $pdo->prepare("SELECT subcategorias.*, categorias.cat_nome FROM subcategorias INNER JOIN categorias ON subcategorias.scat_cat = categorias.cat_id WHERE subcategorias.scat_id = :id");
  $show->bindParam(':id', $id, PDO::PARAM_INT);
  $show->execute();
  $row=$show->fetch(PDO::FETCH_ASSOC);
  $scat_nome=$row["scat_nome"];
  $cat_nome=$row["cat_nome"];
  $scat_sts=$row["scat_sts"];
?>          
               
              <div class="form-group row my-1">
                <label class="col-3 col-form-label text-right px-0">Categoria:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-tags"></i></div>
                    </div> 
                    <input name="cat_nome" value="<?php echo h($cat_nome); ?>" type="text" class="form-control" disabled="">
                    <input type="hidden" name="scat_id" value="<?php echo h($id);?>">
                  </div>
                </div>
              </div>
               
              <div class="form-group row my-1">
                <label class="col-3 col-form-label text-right px-0">Sub Categoria:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-tag"></i></div>
                    </div> 
                    <input name="scat_nome" value="<?php echo h($scat_nome); ?>" type="text" class="form-control" required="required">
                  </div>
                </div>
              </div>

              <div class="form-group row my-1">              
                <label class="col-3 col-form-label text-right">Status:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-toggle-on"></i></div>
                    </div> 
                    <select name="scat_sts" required="required" class="form-control">
                      <option value="1" <?php if($scat_sts == 1){echo " selected";} ?>>Ativo</option>
                      <option value="0" <?php if($scat_sts == 0){echo " selected";} ?>>Inativo</option>
                    </select>
                  </div>
                </div>
              </div>

<?php } ?>
