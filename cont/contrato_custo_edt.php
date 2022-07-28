<?php
session_start();
//include_once("../all/permissoes.php");
if(isset($_POST["id"])){
  include_once("../all/conect.php");
  $id = $_POST["id"];
 
  $pdo = ConnectionN3();
  $show = $pdo->prepare("SELECT custos.* FROM custos WHERE custos.id = '$id'");
  $show->execute();
  $exibe=$show->fetch(PDO::FETCH_ASSOC);
  $tipo = $exibe["tipo"];
  $custo_data_competencia = $exibe["data_competencia"];
  $custo_data_competencia =  date('Y-m', strtotime($custo_data_competencia));
  $custo_data_vencimento = $exibe["data_vencimento"];
  $custo = $exibe["custo"];
  $valor = $exibe["valor"];
  $info_consumo = $exibe["info_consumo"];
  $info_nf = $exibe["nf"];
  $descricao = $exibe["descricao"];
  $centro_custo = $exibe["centro_custo"];
  $status = $exibe["status"];
?>          
         <div class="form-row pt-2">
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Descrição:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="far fa-comment-alt"></i></div>
                </div>
                <input type="text" name="descricao" value="<?php echo $descricao; ?>" class="form-control form-control-sm">
                <input type="hidden" name="custo_id" value="<?php echo $id; ?>">
              </div>
            </div>            
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">NF:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-file-alt"></i></div>
                </div>
                <input type="number" min="0" name="nf"  value="<?php echo $info_nf; ?>"class="form-control form-control-sm">
              </div>
            </div>
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Inf. Consumo:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fab fa-cloudscale"></i></div>
                </div>
                <input type="number" name="info_consumo"  value="<?php echo $info_consumo; ?>" class="form-control form-control-sm">
              </div>
            </div>            
          </div>          
          <div class="form-row pt-2">
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Valor:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-dollar-sign"></i></div>
                </div>
                <input type="number" step="0.01" min="0" name="valor" value="<?php echo $valor; ?>"  required="required" class="form-control form-control-sm">
              </div>
            </div>
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Vencimento:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="far fa-calendar-check"></i></div>
                </div>
                <input type="date" name="data_vencimento" value="<?php echo $custo_data_vencimento; ?>" required="required" class="form-control form-control-sm">
              </div>
            </div>
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Competência:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="far fa-calendar-check"></i></div>
                </div>
                <input type="month" name="data_competencia" value="<?php echo $custo_data_competencia; ?>" required="required" class="form-control form-control-sm">
              </div>
            </div>
          </div>
          <div class="form-row pt-2">
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Tipo:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-tag"></i></div>
                </div>              
                <select name="tipo" id="tipo" class="form-control form-control-sm" required="required" tabindex="1" disabled="">
                  <option value="1" <?php if($tipo==1){ echo" Selected";} ?>>Despesa</option>
                  <option value="2" <?php if($tipo==2){ echo" Selected";} ?>>Serviço</option>
                  <option value="3" <?php if($tipo==3){ echo" Selected";} ?>>Taxa</option>
                </select>
                <input type="hidden" name="custo_tipo" value="<?php echo $tipo; ?>">                
              </div>
            </div>
<!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'tipo'-->
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Custo:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-tag"></i></div>
                </div>
                <select name="custo_edt" id="custo_edt"  class="form-control form-control-sm" required="required" tabindex="2">
<?php
if($tipo==1){$sql="SELECT cads_tipo_despe.id, cads_tipo_despe.despesa as custo FROM cads_tipo_despe WHERE cads_tipo_despe.`status` = '1' ORDER BY cads_tipo_despe.despesa ASC";}
if($tipo==2){$sql="SELECT cads_tipo_servi.id, cads_tipo_servi.servico as custo FROM cads_tipo_servi WHERE cads_tipo_servi.`status` = '1' ORDER BY cads_tipo_servi.servico ASC";}
if($tipo==3){$sql="SELECT cads_tipo_taxa.id, cads_tipo_taxa.taxa as custo FROM cads_tipo_taxa WHERE cads_tipo_taxa.`status` = '1' ORDER BY cads_tipo_taxa.taxa ASC";}
$show = $pdo->prepare("$sql");
$show->execute();
while($row=$show->fetch(PDO::FETCH_ASSOC)){  
  $cst_id = $row["id"];
  $cst_nome = $row["custo"];  
?>
                  <option value="<?php echo $cst_id; ?>" <?php if($custo==$cst_id){ echo" Selected";} ?>><?php echo $cst_nome; ?></option>
<?php } ?>                  
                </select>
              </div>
            </div>

            <div class="form-group col-sm-4">
              <label class="my-0 small">Centro de Custo:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-funnel-dollar"></i></div>
                </div>
                <select name="centro_custo" class="form-control form-control-sm" required="required" tabindex="8">
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT cads_centro_custo.id, cads_centro_custo.centro_custo FROM cads_centro_custo WHERE cads_centro_custo.`status` = '1' ORDER BY centro_custo ASC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
$centro_c_id = $exibe["id"];
$centro_custo_nome = $exibe["centro_custo"];
?>
                  <option value="<?php echo $centro_c_id; ?>"<?php if($centro_c_id==$centro_custo){ echo" selected";}?>><?php echo $centro_custo_nome;?></option>
<?php } ?>
                </select>
              </div>
            </div> 
          </div>
          <div class="form-row pt-2">
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Status:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-info-circle"></i></div>
                </div>              
                <select name="status" id="tipo" class="form-control form-control-sm" required="required" tabindex="1" >
                  <option value="0" <?php if($status==0){ echo" Selected";} ?>>Excluído</option>
                  <option value="1" <?php if($status==1){ echo" Selected";} ?>>Executado</option>
                  <option value="2" <?php if($status==2){ echo" Selected";} ?>>Planejado</option>
                </select>
              </div>
            </div> 
          </div>

<?php } ?>