function normalizeSelectpickers(scope) {
  if (!$.fn.selectpicker) {
    return;
  }

  $(scope || document).find('.selectpicker').each(function () {
    var $select = $(this);

    $select.attr('data-container', 'body');
    $select.attr('data-width', '100%');

    if ($select.data('selectpicker')) {
      $select.selectpicker('refresh');
    } else {
      $select.selectpicker({
        container: 'body',
        width: '100%',
        dropupAuto: false,
        size: 8
      });
    }
  });
}

function hideEnhancedSelect(selector) {
  var $select = $(selector);
  $select.hide();
  $select.parent('.bootstrap-select').hide();
}

function showEnhancedSelect(selector) {
  var $select = $(selector);
  $select.show();
  normalizeSelectpickers(document);
  $select.parent('.bootstrap-select').show();
}

$(function () {
  normalizeSelectpickers(document);

  $(document).on('shown.bs.select', '.selectpicker', function () {
    var $select = $(this);
    var $button = $select.parent('.bootstrap-select').find('> button.dropdown-toggle');
    var $container = $('.bs-container.bootstrap-select').last();
    var $menu = $container.find('> .dropdown-menu');

    if (!$menu.length) {
      $menu = $select.parent('.bootstrap-select').find('> .dropdown-menu');
    }

    if ($button.length && $menu.length) {
      var width = Math.min(Math.max($button.outerWidth(), 180), 420, window.innerWidth - 24);

      $container.css({
        width: width,
        minWidth: width,
        maxWidth: width
      });

      $menu.css({
        width: width,
        minWidth: width,
        maxWidth: width
      });
    }
  });
});