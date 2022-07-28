<?php
session_start();
include_once("../all/permissoes.php");
if(isset($_POST["id"])){
  include_once("../all/conect.php");
  $id = $_POST["id"];
  
  $pdo = ConnectionN3();
  $show = $pdo->prepare("SELECT clientes.* FROM clientes WHERE clientes.clt_id = '$id'");
  $show->execute();
  $row=$show->fetch(PDO::FETCH_ASSOC);
  $clt_nomer=$row["clt_nomer"];
  $clt_nomef=$row["clt_nomef"];
  $clt_cnpj=$row["clt_cnpj"];
  $clt_end=$row["clt_end"];
  $clt_city=$row["clt_city"];
  $clt_uf=$row["clt_uf"];
  $clt_mail=$row["clt_mail"];
  $clt_tel=$row["clt_tel"];
  $clt_sts=$row["clt_sts"];
  $clt_ti=$row["clt_ti"];
  $clt_adm=$row["clt_adm"];
  $clt_mkt=$row["clt_mkt"];
?>          
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right">Razão Social:</label> 
                <div class="col-9">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="far fa-user"></i></div>
                    </div> 
                    <input name="clt_nomer" type="text" class="form-control" required="required" value="<?php echo $clt_nomer; ?>">
                    <input type="hidden" name="clt_id" value="<?php echo $id;?>">
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right">Nome Comercial:</label> 
                <div class="col-9">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="far fa-user"></i></div>
                    </div> 
                    <input name="clt_nomef"  value="<?php echo $clt_nomef; ?>" type="text" class="form-control" required="required">
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right">CNPJ:</label> 
                <div class="col-9">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-paste"></i></div>
                    </div> 
                    <input type="text" name="clt_cnpj" id="cnpj" onkeyup="FormataCnpj(this,event)" onblur="if(!validarCNPJ(this.value)){alert('O CNPJ informado é inválido'); this.value='';}" maxlength="18"  class="form-control" ng-model="cadastro.cnpj"  value="<?php echo $clt_cnpj; ?>">
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right">Endereço:</label> 
                <div class="col-9">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-route"></i></div>
                    </div> 
                    <input name="clt_end" type="text" value="<?php echo $clt_end; ?>" class="form-control" required="required">
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right">Cidade:</label> 
                <div class="col-9">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-map-marked-alt"></i></div>
                    </div> 
                    <input name="clt_city" type="text" value="<?php echo $clt_city; ?>" class="form-control" required="required">
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right">Estado:</label> 
                <div class="col-9">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-globe-americas"></i></div>
                    </div> 
                    <select name="clt_uf" required="required" class="form-control">
                      <option></option>
                      <option value="AC" <?php if($clt_uf=="AC"){echo "selected";} ?>>Acre</option>
                      <option value="AL" <?php if($clt_uf=="AL"){echo "selected";} ?>>Alagoas</option>
                      <option value="AP" <?php if($clt_uf=="AP"){echo "selected";} ?>>Amapá</option>
                      <option value="AM" <?php if($clt_uf=="AM"){echo "selected";} ?>>Amazonas</option>
                      <option value="BA" <?php if($clt_uf=="BA"){echo "selected";} ?>>Bahia</option>
                      <option value="CE" <?php if($clt_uf=="CE"){echo "selected";} ?>>Ceará</option>
                      <option value="DF" <?php if($clt_uf=="DF"){echo "selected";} ?>>Distrito Federal</option>
                      <option value="ES" <?php if($clt_uf=="ES"){echo "selected";} ?>>Espírito Santo</option>
                      <option value="GO" <?php if($clt_uf=="GO"){echo "selected";} ?>>Goiás</option>
                      <option value="MA" <?php if($clt_uf=="MA"){echo "selected";} ?>>Maranhão</option>
                      <option value="MT" <?php if($clt_uf=="MT"){echo "selected";} ?>>Mato Grosso</option>
                      <option value="MS" <?php if($clt_uf=="MS"){echo "selected";} ?>>Mato Grosso do Sul</option>
                      <option value="MG" <?php if($clt_uf=="MG"){echo "selected";} ?>>Minas Gerais</option>
                      <option value="PA" <?php if($clt_uf=="PA"){echo "selected";} ?>>Pará</option>
                      <option value="PB" <?php if($clt_uf=="PB"){echo "selected";} ?>>Paraíba</option>
                      <option value="PR" <?php if($clt_uf=="PR"){echo "selected";} ?>>Paraná</option>
                      <option value="PE" <?php if($clt_uf=="PE"){echo "selected";} ?>>Pernambuco</option>
                      <option value="PI" <?php if($clt_uf=="PI"){echo "selected";} ?>>Piauí</option>
                      <option value="RJ" <?php if($clt_uf=="RJ"){echo "selected";} ?>>Rio de Janeiro</option>
                      <option value="RN" <?php if($clt_uf=="RN"){echo "selected";} ?>>Rio Grande do Norte</option>
                      <option value="RS" <?php if($clt_uf=="RS"){echo "selected";} ?>>Rio Grande do Sul</option>
                      <option value="RO" <?php if($clt_uf=="RO"){echo "selected";} ?>>Rondônia</option>
                      <option value="RR" <?php if($clt_uf=="RR"){echo "selected";} ?>>Roraima</option>
                      <option value="SC" <?php if($clt_uf=="SC"){echo "selected";} ?>>Santa Catarina</option>
                      <option value="SP" <?php if($clt_uf=="SP"){echo "selected";} ?>>São Paulo</option>
                      <option value="SE" <?php if($clt_uf=="SE"){echo "selected";} ?>>Sergipe</option>
                      <option value="TO" <?php if($clt_uf=="TO"){echo "selected";} ?>>Tocantins</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right">E-mail:</label> 
                <div class="col-9">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-at"></i></div>
                    </div> 
                    <input name="clt_mail" type="email" class="form-control" required="required"  value="<?php echo $clt_mail; ?>">
                  </div>
                </div>
              </div>

              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right">Telefone:</label> 
                <div class="col-9">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-mobile-alt"></i></div>
                    </div> 
                    <input name="clt_tel" value="<?php echo $clt_tel; ?>" type="text" required="required" class="form-control">
                  </div>
                </div>
              </div>

              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right">TI:</label> 
                <div class="col-2">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-microchip"></i></div>
                    </div> 
                    <select name="clt_ti" required="required" class="form-control">
                      <option></option>
                      <option value="1" <?php if($clt_ti==1){echo "selected";} ?>>Sim</option>
                      <option value="0" <?php if($clt_ti==0){echo "selected";} ?>>Não</option>
                    </select>
                  </div>
                </div>
                <label class="col-2 col-form-label text-right">ADM:</label> 
                <div class="col-2">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-chart-bar"></i></div>
                    </div> 
                    <select name="clt_adm" required="required" class="form-control">
                      <option></option>
                      <option value="1" <?php if($clt_adm==1){echo "selected";} ?>>Sim</option>
                      <option value="0" <?php if($clt_adm==0){echo "selected";} ?>>Não</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right">MKT:</label> 
                <div class="col-2">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-bullhorn"></i></div>
                    </div> 
                    <select name="clt_mkt" required="required" class="form-control">
                      <option></option>
                      <option value="1" <?php if($clt_mkt==1){echo "selected";} ?>>Sim</option>
                      <option value="0" <?php if($clt_mkt==0){echo "selected";} ?>>Não</option>
                    </select>
                  </div>
                </div>                
                <label class="col-2 col-form-label text-right">Status:</label> 
                <div class="col-2">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-toggle-on"></i></div>
                    </div> 
                    <select name="clt_sts" required="required" class="form-control">
                      <option value="1" <?php if($clt_sts==1){echo "selected";} ?>>Ativo</option>
                      <option value="0" <?php if($clt_sts==0){echo "selected";} ?>>Inativo</option>
                    </select>
                  </div>
                </div>
              </div>

<?php } ?>