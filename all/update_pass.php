<?php
if (!isset($user_id)) {
    header("Location: ../index.php");
    die();
}
?>

<style>
  .password-modal .modal-content {
    border: 0;
    border-radius: 18px;
    box-shadow: 0 28px 80px rgba(15, 23, 42, .28);
    overflow: hidden;
  }

  .password-modal .modal-header {
    align-items: center;
    background: linear-gradient(135deg, #f8fbff, #eef4ff);
    border-bottom: 1px solid #e5edf7;
    padding: 20px 24px;
  }

  .password-modal-title {
    align-items: center;
    display: flex;
    gap: 12px;
  }

  .password-modal-icon {
    align-items: center;
    background: #eaf2ff;
    border-radius: 12px;
    color: #2f5be6;
    display: inline-flex;
    flex: 0 0 42px;
    height: 42px;
    justify-content: center;
    width: 42px;
  }

  .password-modal-title h5 {
    color: #111827;
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
  }

  .password-modal-title p {
    color: #64748b;
    font-size: .82rem;
    margin: 2px 0 0;
  }

  .password-modal .modal-body {
    background: #fff;
    padding: 22px 24px 18px;
  }

  .password-field-label {
    color: #334155;
    font-size: .82rem;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .password-modal .form-control {
    border-color: #d8e2ef;
    border-radius: 10px 0 0 10px;
    height: 42px;
  }

  .password-modal .form-control:focus {
    border-color: #7f97c3;
    box-shadow: 0 0 0 .2rem rgba(47, 91, 230, .12);
  }

  .password-modal .input-group-text {
    background: #f6f8fb;
    border-color: #d8e2ef;
    border-radius: 0 10px 10px 0;
    color: #2f487e;
    min-width: 42px;
    justify-content: center;
  }

  .password-strength-meter {
    background: #e5eaf2;
    border-radius: 999px;
    height: 7px;
    margin: 10px 0 12px;
    overflow: hidden;
  }

  .password-strength-meter span {
    background: #ef4444;
    display: block;
    height: 100%;
    transition: width .2s ease, background .2s ease;
    width: 0;
  }

  .password-strength-meter.strength-1 span { width: 20%; background: #ef4444; }
  .password-strength-meter.strength-2 span { width: 40%; background: #f97316; }
  .password-strength-meter.strength-3 span { width: 60%; background: #eab308; }
  .password-strength-meter.strength-4 span { width: 80%; background: #22c55e; }
  .password-strength-meter.strength-5 span { width: 100%; background: #16a34a; }

  .password-rules {
    background: #f8fafc;
    border: 1px solid #e5edf7;
    border-radius: 12px;
    color: #64748b;
    display: grid;
    font-size: .8rem;
    gap: 7px;
    margin: 0;
    padding: 12px;
  }

  .password-rules .is-met {
    color: #15803d;
    font-weight: 600;
  }

  .password-rules i {
    margin-right: 7px;
  }

  .password-match-message,
  .password-error-message {
    display: none;
    font-size: .82rem;
    margin-top: 8px;
  }

  .password-modal .modal-footer {
    background: #fff;
    border-top: 1px solid #eef2f7;
    padding: 16px 24px 22px;
  }

  .password-modal .btn-save-password {
    background: linear-gradient(135deg, #2f5be6, #2448bf);
    border: 0;
    border-radius: 10px;
    box-shadow: 0 10px 22px rgba(47, 91, 230, .22);
    color: #fff;
    font-weight: 700;
    padding: 8px 16px;
  }

  .password-modal .btn-cancel-password {
    border-radius: 10px;
    padding: 8px 16px;
  }
</style>

<div class="modal fade password-modal" id="modalSenha" tabindex="-1" role="dialog" aria-labelledby="modalSenhaLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-md" role="document">
    <div class="modal-content">
      <form id="passwordChangeForm">
        <div class="modal-header">
          <div class="password-modal-title">
            <span class="password-modal-icon"><i class="fas fa-user-lock"></i></span>
            <div>
              <h5 class="modal-title" id="modalSenhaLabel">Alterar senha de acesso</h5>
              <p>Use uma senha forte para proteger sua conta.</p>
            </div>
          </div>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="password-field-label" for="currentPasswordInput">Senha atual</label>
            <div class="input-group">
              <input id="currentPasswordInput" name="senha_atual" type="password" class="form-control" autocomplete="current-password" required>
              <div class="input-group-append">
                <span class="input-group-text toggle-password" role="button" tabindex="0" aria-label="Mostrar senha" title="Mostrar senha"><i class="fas fa-eye"></i></span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="password-field-label" for="newPasswordInput">Nova senha</label>
            <div class="input-group">
              <input id="newPasswordInput" name="n_senha1" type="password" placeholder="Digite a nova senha" class="form-control" autocomplete="new-password" required>
              <div class="input-group-append">
                <span class="input-group-text toggle-password" role="button" tabindex="0" aria-label="Mostrar senha" title="Mostrar senha"><i class="fas fa-eye"></i></span>
              </div>
            </div>
            <div id="changePasswordMeter" class="password-strength-meter strength-0"><span></span></div>
            <div id="changePasswordRules" class="password-rules">
              <div data-rule="length"><i class="far fa-circle"></i>Entre 12 e 100 caracteres</div>
              <div data-rule="upper"><i class="far fa-circle"></i>Uma letra maiúscula</div>
              <div data-rule="lower"><i class="far fa-circle"></i>Uma letra minúscula</div>
              <div data-rule="number"><i class="far fa-circle"></i>Um número</div>
              <div data-rule="symbol"><i class="far fa-circle"></i>Um símbolo ou caractere especial</div>
            </div>
          </div>

          <div class="form-group mb-0">
            <label class="password-field-label" for="confirmPasswordInput">Confirmar nova senha</label>
            <div class="input-group">
              <input id="confirmPasswordInput" name="n_senha2" type="password" placeholder="Repita a nova senha" class="form-control" autocomplete="new-password" required>
              <div class="input-group-append">
                <span class="input-group-text toggle-password" role="button" tabindex="0" aria-label="Mostrar senha" title="Mostrar senha"><i class="fas fa-eye"></i></span>
              </div>
            </div>
            <div id="passwordMatchMessage" class="password-match-message text-danger">As senhas não conferem.</div>
            <div id="passwordChangeError" class="password-error-message text-danger">A senha deve conter 12 ou mais caracteres, com maiúscula, minúscula, número e símbolo.</div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary btn-cancel-password" data-dismiss="modal">Cancelar</button>
          <button type="submit" formaction="#" formmethod="POST" name="action" value="alterar_senha" class="btn btn-save-password">Salvar mudanças</button>
        </div>
      </form>
    </div>
  </div>
</div>

<script>
  (function() {
    function initPasswordModal() {
      var form = document.getElementById('passwordChangeForm');
      if (!form || form.dataset.passwordValidationReady === '1') {
        return;
      }
      form.dataset.passwordValidationReady = '1';

      var newPasswordInput = document.getElementById('newPasswordInput');
      var confirmPasswordInput = document.getElementById('confirmPasswordInput');
      var meter = document.getElementById('changePasswordMeter');
      var rulesContainer = document.getElementById('changePasswordRules');
      var matchMessage = document.getElementById('passwordMatchMessage');
      var errorMessage = document.getElementById('passwordChangeError');

      function passwordRules(value) {
        return {
          length: value.length >= 12 && value.length <= 100,
          upper: /[A-Z]/.test(value),
          lower: /[a-z]/.test(value),
          number: /[0-9]/.test(value),
          symbol: /[^a-zA-Z0-9]/.test(value)
        };
      }

      function updateRules() {
        var rules = passwordRules(newPasswordInput.value || '');
        var matchedRules = Object.keys(rules).filter(function(rule) { return rules[rule]; }).length;
        var isComplete = Object.keys(rules).every(function(rule) { return rules[rule]; });

        meter.className = 'password-strength-meter strength-' + matchedRules;
        Object.keys(rules).forEach(function(rule) {
          var item = rulesContainer.querySelector('[data-rule="' + rule + '"]');
          if (!item) return;
          item.classList.toggle('is-met', rules[rule]);
          var icon = item.querySelector('i');
          icon.classList.toggle('far', !rules[rule]);
          icon.classList.toggle('fas', rules[rule]);
          icon.classList.toggle('fa-circle', !rules[rule]);
          icon.classList.toggle('fa-check-circle', rules[rule]);
        });

        return isComplete;
      }

      function updateMatch() {
        var hasMismatch = confirmPasswordInput.value.length > 0 && newPasswordInput.value !== confirmPasswordInput.value;
        matchMessage.style.display = hasMismatch ? 'block' : 'none';
        return !hasMismatch;
      }

      function togglePasswordVisibility(toggle) {
        var inputGroup = toggle.closest ? toggle.closest('.input-group') : toggle.parentNode.parentNode;
        var input = inputGroup ? inputGroup.querySelector('input') : null;
        var icon = toggle.querySelector('i');
        if (!input || !icon) return;

        var showPassword = input.type === 'password';
        input.type = showPassword ? 'text' : 'password';
        toggle.setAttribute('aria-label', showPassword ? 'Ocultar senha' : 'Mostrar senha');
        toggle.setAttribute('title', showPassword ? 'Ocultar senha' : 'Mostrar senha');
        icon.classList.toggle('fa-eye', !showPassword);
        icon.classList.toggle('fa-eye-slash', showPassword);
      }

      Array.prototype.forEach.call(form.querySelectorAll('.toggle-password'), function(toggle) {
        toggle.addEventListener('click', function(event) {
          event.preventDefault();
          togglePasswordVisibility(toggle);
        });

        toggle.addEventListener('keydown', function(event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            togglePasswordVisibility(toggle);
          }
        });
      });

      newPasswordInput.addEventListener('input', function() {
        errorMessage.style.display = 'none';
        updateRules();
        updateMatch();
      });

      confirmPasswordInput.addEventListener('input', updateMatch);

      form.addEventListener('submit', function(event) {
        var isStrong = updateRules();
        var isMatched = updateMatch();

        if (!isStrong || !isMatched) {
          event.preventDefault();
          errorMessage.style.display = isStrong ? 'none' : 'block';
          if (!isStrong) {
            newPasswordInput.focus();
          } else {
            confirmPasswordInput.focus();
          }
        }
      });

      updateRules();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPasswordModal);
    } else {
      initPasswordModal();
    }
  })();
</script>
