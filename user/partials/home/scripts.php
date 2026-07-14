  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>

  <script>
    $(function() {
      const newUserModal = $('#new_user');
      const newUserForm = $('#newUserForm');
      const passwordInput = $('#passwordInput');
      const passwordError = $('#passwordError');
      const companiesSelect = $('#newUserCompanies');
      const companiesHelper = $('#companiesHelper');

      $('.companies').select2({
        dropdownParent: newUserModal,
        placeholder: 'Selecione as empresas',
        width: '100%',
        closeOnSelect: false
      });


      function applyUserListFilter() {
        const status = $('.user-status-filter [data-user-filter].active').data('user-filter') || 'active';
        const term = ($('#userListSearch').val() || '').toLowerCase().trim();

        $('.user-table tbody tr').each(function() {
          const row = $(this);
          const statusMatches = status === 'all' || row.data('user-status') === status;
          const textMatches = !term || row.text().toLowerCase().indexOf(term) !== -1;
          row.toggle(statusMatches && textMatches);
        });
      }

      $('.user-status-filter').on('click', '[data-user-filter]', function() {
        $('.user-status-filter [data-user-filter]')
          .removeClass('active btn-primary')
          .addClass('btn-outline-secondary');
        $(this)
          .addClass('active btn-primary')
          .removeClass('btn-outline-secondary');
        applyUserListFilter();
      });

      $('#userListSearch').on('input', applyUserListFilter);
      applyUserListFilter();
      function passwordRules(value) {
        return {
          length: value.length >= 12 && value.length <= 100,
          upper: /[A-Z]/.test(value),
          lower: /[a-z]/.test(value),
          number: /[0-9]/.test(value),
          symbol: /[^a-zA-Z0-9]/.test(value)
        };
      }

      function updatePasswordRules() {
        const rules = passwordRules(passwordInput.val() || '');
        const matchedRules = Object.values(rules).filter(Boolean).length;
        const isComplete = Object.values(rules).every(Boolean);
        $('#passwordMeter')
          .removeClass('strength-0 strength-1 strength-2 strength-3 strength-4 strength-5 is-complete')
          .addClass('strength-' + matchedRules)
          .toggleClass('is-complete', isComplete);
        $('#passwordRules').toggleClass('is-complete', isComplete);
        Object.keys(rules).forEach(function(rule) {
          const item = $('#passwordRules [data-rule="' + rule + '"]');
          item.toggleClass('is-met', rules[rule]);
          item.find('i')
            .toggleClass('fa-circle', !rules[rule])
            .toggleClass('fa-check-circle', rules[rule]);
        });
        return isComplete;
      }

      function updateCompanyRequirement() {
        const isClient = newUserForm.find('input[name="tipo_usuario"]:checked').val() === '2';
        companiesSelect.attr('aria-required', isClient ? 'true' : 'false');
        companiesHelper.text(isClient ? 'Obrigatório para usuários do tipo Cliente.' : 'Opcional para colaboradores.');
      }

      passwordInput.on('input', function() {
        passwordError.hide().text('');
        updatePasswordRules();
      });

      newUserForm.on('change', 'input[name="tipo_usuario"]', updateCompanyRequirement);

      newUserModal.on('shown.bs.modal', function() {
        updatePasswordRules();
        updateCompanyRequirement();
      });

      newUserForm.on('submit', function(event) {
        const hasStrongPassword = updatePasswordRules();
        const isClient = newUserForm.find('input[name="tipo_usuario"]:checked').val() === '2';
        const selectedCompanies = companiesSelect.val() || [];

        if (!hasStrongPassword) {
          event.preventDefault();
          passwordError.text('A senha deve conter 12 ou mais caracteres, com maiúscula, minúscula, número e símbolo.').show();
          passwordInput.trigger('focus');
          return;
        }

        if (isClient && selectedCompanies.length === 0) {
          event.preventDefault();
          companiesSelect.select2('open');
        }
      });


      function buildEditUserTabs() {
        const content = $('#info_edt_user .edit-user-content');
        if (!content.length || content.hasClass('is-tabbed')) return;

        const sections = content.find('> .edit-user-section');
        if (!sections.length) return;

        const hiddenFields = content.children().not('.edit-user-section').detach();
        const nav = $('<ul class="nav nav-tabs user-modal-tabs edit-user-tabs" role="tablist"></ul>');
        const panes = $('<div class="tab-content user-modal-tab-content edit-user-tab-content"></div>');

        sections.each(function(index) {
          const section = $(this);
          const title = $.trim(section.find('.card-header h6').first().text()) || ('Aba ' + (index + 1));
          const icon = section.find('.card-header h6 i').first().attr('class') || 'fas fa-circle';
          const paneId = 'edit-user-tab-' + index;
          const isActive = index === 0;
          const body = section.find('> .collapse > .card-body, > .card-body').first();

          nav.append(
            '<li class="nav-item"><a class="nav-link ' + (isActive ? 'active' : '') + '" data-toggle="tab" href="#' + paneId + '" role="tab" aria-selected="' + (isActive ? 'true' : 'false') + '"><i class="' + icon + '"></i> ' + title + '</a></li>'
          );

          const pane = $('<div class="tab-pane fade ' + (isActive ? 'show active' : '') + '" id="' + paneId + '" role="tabpanel"></div>');
          pane.append(body.contents());
          panes.append(pane);
        });

        content.addClass('is-tabbed').empty().append(hiddenFields, nav, panes);
      }
      // ? Abrir modal de edição corretamente (Bootstrap 4)
      $(document).on('click', '.view_data', function() {
        const user_id = $(this).attr("id");
        if (!user_id) return;

        // Mostra modal imediatamente com loading
        $("#info_edt_user").html('<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><div class="mt-3 small text-muted">Carregando informações do usuário...</div></div>');
        $('#modalEdtUser').appendTo('body').modal('show');

        // Carrega conteúdo via AJAX
        $.post('edt_user.php', {
          user_id
        }, function(retorna) {
          $("#info_edt_user").html(retorna);
          buildEditUserTabs();
          $('.companiesEdit').select2({
            dropdownParent: $('#modalEdtUser'),
            placeholder: 'Selecione as empresas',
            width: '100%',
            closeOnSelect: false
          });
        }).fail(function() {
          $("#info_edt_user").html('<div class="alert alert-danger m-3">Erro ao carregar informações do usuário.</div>');
        });
      });

      // Limpa conteúdo ao fechar modal
      $('#modalEdtUser').on('hidden.bs.modal', function() {
        $("#info_edt_user").html('<div class="p-4 text-center text-muted">Carregando informações do usuário...</div>');
      });

      const flashMessage = $('#userFlashMessage');
      if (flashMessage.length) {
        setTimeout(function() {
          flashMessage.addClass('fade-out');
          setTimeout(function() {
            flashMessage.alert('close');
          }, 240);
        }, 4200);
      }
    });
  </script>
</body>
</html>
