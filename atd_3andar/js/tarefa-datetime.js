$.fn.datetimepicker.dates['en'] = {
  format: 'dd/mm/yyyy',
  days: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
  daysShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
  daysMin: ['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sa', 'Do'],
  months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  monthsShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  today: 'Hoje',
  suffix: [],
  meridiem: []
};

$(function () {
  $('.form_datetime').datetimepicker({
    format: 'yyyy-mm-dd hh:ii',
    container: 'body',
    pickerPosition: 'bottom-left',
    autoclose: true,
    zIndex: 2070
  });

  $('.form_datetime').on('show', function () {
    window.setTimeout(function () {
      $('.datetimepicker.dropdown-menu:visible').each(function () {
        var $picker = $(this);
        var left = parseInt($picker.css('left'), 10) || 0;
        var maxLeft = Math.max(8, window.innerWidth - $picker.outerWidth() - 12);

        if (left > maxLeft) {
          $picker.css('left', maxLeft);
        } else if (left < 8) {
          $picker.css('left', 8);
        }
      });
    }, 0);
  });
});