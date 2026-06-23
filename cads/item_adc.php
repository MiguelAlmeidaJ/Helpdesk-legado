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
  $show1 = $pdo->prepare("SELECT subcategorias.*, categorias.cat_nome FROM subcategorias INNER JOIN categorias ON categorias.cat_id = subcategorias.scat_cat WHERE subcategorias.scat_id = :id");
  $show1->bindParam(':id', $id, PDO::PARAM_INT);
  $show1->execute();
  $row1=$show1->fetch(PDO::FETCH_ASSOC);
  $cat_nome=$row1["cat_nome"];
  $scat_nome=$row1["scat_nome"];
?>          
               
              <div class="form-group row my-1">
                <label class="col-3 col-form-label text-right px-0">Categoria:</label> 
                <div class="col-8">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-tags"></i></div>
                    </div> 
                    <input name="cat_nome" value="<?php echo h($cat_nome); ?>" type="text" class="form-control" disabled="">
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
                    <input name="scat_nome" value="<?php echo h($scat_nome); ?>" type="text" class="form-control" disabled="">
                    <input type="hidden" name="itens_scat" value="<?php echo h($id);?>">
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
                    <input name="itens_nome" placeholder="Descrição " type="text" class="form-control" required="required">
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
                      <option value="1" >Ativo</option>
                      <option value="0" >Inativo</option>
                    </select>
                  </div>
                </div>
              </div>

<?php } ?>
