$(function () {
  $('#cliente').change(function () {
    if ($(this).val()) {
      hideEnhancedSelect('#solicitante');
      hideEnhancedSelect('#local');

      $('.carregando').show();
      $('.carregando2').show();

      $.getJSON('busca_solicitantes.php?search=', {
        cliente: $(this).val(),
        ajax: 'true'
      }, function (j) {
        var options = '<option value="">Escolha o solicitante</option>';

        for (var i = 0; i < j.length; i++) {
          options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
        }

        $('#solicitante').html(options);
        showEnhancedSelect('#solicitante');
        $('.carregando').hide();
      });

      $.getJSON('busca_locais.php?search=', {
        cliente: $(this).val(),
        ajax: 'true'
      }, function (j) {
        var options = '<option value="">Escolha o local</option>';

        for (var i = 0; i < j.length; i++) {
          options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
        }

        $('#local').html(options);
        showEnhancedSelect('#local');
        $('.carregando2').hide();
      });
    } else {
      $('#solicitante').html('<option value="">Escolha o Solicitante</option>');
      $('#local').html('<option value="">Escolha o Local</option>');
      normalizeSelectpickers(document);
    }
  });
});