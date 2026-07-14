  <div class="modal fade user-modal" id="modalEdtUser" tabindex="-1" role="dialog" aria-labelledby="edt_user_title" aria-hidden="true">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <form method="POST" action="" name="edit_user">
          <input type="hidden" name="action" value="edt_user">
          <div class="modal-header">
            <div class="user-modal-title">
              <span class="user-modal-icon"><i class="fas fa-user-edit"></i></span>
              <div>
                <h6 class="modal-title" id="edt_user_title">Edição de usuário</h6>
                <p>Atualize dados cadastrais, vínculos e permissões de acesso.</p>
              </div>
            </div>
            <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div id="info_edt_user" class="text-muted">
              Carregando informações do usuário...
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar alterações</button>
          </div>
        </form>
      </div>
    </div>
  </div>

