$(function() {
  const pdfEnabledPages = new Set([
    'atd_abertos_por_tecnico.php',
    'atd_total_por_cliente.php',
    'atd_total_por_tecnico.php',
    'atd_total_por_categoria.php',
    'atd_tempo_por_tecnico.php',
    'atd_analitico_por_cliente.php',
    'atd_analitico_por_tarefa.php',
    'atd_analitico_por_melhoria.php',
    'rel_Unificado.php',
    'rel_Unificado_Id.php',
    'rel_ti.php',
    'rel_tempo_atd.php'
  ]);

  function getCurrentReportPage() {
    return window.location.pathname.split('/').pop() || '';
  }

  function isReportFilterForm($form) {
    const id = ($form.attr('id') || '').toLowerCase();
    if (id === 'formacoesrelatorios' || id === 'formgerarrelatorio') {
      return false;
    }
    if ($form.closest('#formAcoesRelatorios, #formGerarRelatorio').length) {
      return false;
    }
    return pdfEnabledPages.has(getCurrentReportPage()) && $form.find('button[type="submit"], input[type="submit"]').length > 0;
  }

  function buildPdfUrl($form) {
    const params = new URLSearchParams();
    const page = getCurrentReportPage();

    params.set('pagina', page);
    if ($form && $form.length) {
      $form.serializeArray().forEach(function(item) {
        if (item.name && item.value !== undefined) {
          params.set(item.name, item.value);
        }
      });
    }

    return 'gerar_relatorio_pdf.php?' + params.toString();
  }

  function createPdfButton(extraClass) {
    return $('<button>', {
      type: 'button',
      class: 'btn btn-outline-danger rel-pill-btn rel-pdf-btn ' + (extraClass || ''),
      html: '<i class="fas fa-file-pdf"></i> Gerar PDF'
    });
  }

  function ensurePdfButton($form) {
    if (!isReportFilterForm($form) || $form.data('pdf-ready') || $form.find('.rel-pdf-btn').length) {
      return;
    }

    const $submit = $form.find('button[type="submit"], input[type="submit"]').first();
    if (!$submit.length) {
      return;
    }

    $submit.addClass('rel-pill-btn rel-filter-submit-btn');
    $form.find('a, button').each(function() {
      const $action = $(this);
      const text = $.trim($action.text()).toLowerCase();
      if (text === 'limpar' || text === 'limpar filtros') {
        $action.addClass('rel-clear-btn');
      }
    });

    const $button = createPdfButton();

    let $actions = $submit.closest('.rel-filter-actions, .rel-actions, .form-actions');
    if (!$actions.length) {
      $submit.wrap('<span class="rel-inline-actions"></span>');
      $actions = $submit.parent();
    }
    $actions.append($button);

    $form.data('pdf-ready', true);
  }

  $('.rel-legacy-page form, .rel-modern-filter').each(function() {
    const $form = $(this);
    ensurePdfButton($form);
  });

  if (pdfEnabledPages.has(getCurrentReportPage()) && !$('.rel-pdf-btn').length) {
    const $toolbar = $('.rel-toolbar').first();
    if ($toolbar.length) {
      $toolbar.append(createPdfButton('rel-toolbar-pdf'));
    }
  }

  $(document).on('click', '.rel-pdf-btn', function() {
    const $form = $(this).closest('form');
    window.open(buildPdfUrl($form), '_blank', 'noopener');
  });
});
