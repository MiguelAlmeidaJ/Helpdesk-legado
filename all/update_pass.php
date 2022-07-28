<div class="modal fade" id="modalSenha" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-md" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Alteração da senha de acesso</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <form>
        <div class="modal-body">
            <div class="form-group row">
              <label class="col-sm-3 col-form-label col-form-label-sm text-right">Senha Atual:</label>
              <div class="col-sm-8">
                <input name="senha_atual" type="password" placeholder="" class="form-control form-control-sm" required="">
              </div>
            </div>
            <div class="form-group row">
              <label class="col-sm-3 col-form-label col-form-label-sm text-right">Nova Senha:</label>
              <div class="col-sm-8">
                <input name="n_senha1" type="password" placeholder="Nova Senha" class="form-control form-control-sm" required="">
              </div>
            </div>
            <div class="form-group row">
              <label class="col-sm-3 col-form-label col-form-label-sm text-right">Nova Senha:</label>
              <div class="col-sm-8">
                <input name="n_senha2" type="password" placeholder="Repita a nova senha" class="form-control form-control-sm" required="">
              </div>
            </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-sm btn-outline-secondary" data-dismiss="modal">Cancelar</button>
          <button type="submit" formaction="#" formmethod="POST" name="action" value="alterar_senha" class="btn btn-sm btn-outline-primary">Salvar mudanças</button>
        </div>
      </form>
    </div>
  </div>
</div>