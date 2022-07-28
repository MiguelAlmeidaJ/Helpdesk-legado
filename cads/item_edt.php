<?php
session_start();
include_once("../all/permissoes.php");
if(isset($_POST["id"])){
  include_once("../all/conect.php");
  $id = $_POST["id"];
  $pdo = ConnectionN3();
  $show1 = $pdo->prepare("SELECT itens.*, subcategorias.scat_nome, categorias.cat_nome FROM itens INNER JOIN subcategorias ON subcategorias.scat_id = itens.itens_scat INNER JOIN categorias ON categorias.cat_id = subcategorias.scat_cat WHERE itens.itens_id = '$id'");
  $show1->execute();
  $row1=$show1->fetch(PDO::FETCH_ASSOC);
  $cat_nome=$row1["cat_nome"];
  $scat_nome=$row1["scat_nome"];
  $itens_nome=$row1["itens_nome"];
  $itens_sts=$row1["itens_sts"];
?>          
               
              <div class="form-group row my-1">
                <label class="col-3 col-form-label text-right px-0">Categoria:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-tags"></i></div>
                    </div> 
                    <input name="cat_nome" value="<?php echo $cat_nome; ?>" type="text" class="form-control" disabled="">
                  </div>
                </div>
              </div>
              <div class="form-group row my-1">
                <label class="col-3 col-form-label text-right px-0">Sub Categoria:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-tags"></i></div>
                    </div> 
                    <input name="scat_nome" value="<?php echo $scat_nome; ?>" type="text" class="form-control" disabled="">
                    <input type="hidden" name="itens_id" value="<?php echo $id;?>">
                  </div>
                </div>
              </div>
               
              <div class="form-group row my-1">
                <label class="col-3 col-form-label text-right px-0">Item:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-tag"></i></div>
                    </div> 
                    <input name="itens_nome" value="<?php echo $itens_nome; ?>" type="text" class="form-control" required="required">
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
                    <select name="itens_sts" required="required" class="form-control">
                      <option value="1" <?php if($itens_sts == 1){echo " selected";} ?>>Ativo</option>
                      <option value="0" <?php if($itens_sts == 0){echo " selected";} ?>>Inativo</option>
                    </select>
                  </div>
                </div>
              </div>

<?php } ?>