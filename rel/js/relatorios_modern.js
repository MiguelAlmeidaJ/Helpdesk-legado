$(function() {
  if (new URLSearchParams(window.location.search).get('pdf') === '1') {
    document.body.classList.add('rel-pdf-render');
  }
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

  function isPdfEnabledPage() {
    return pdfEnabledPages.has(getCurrentReportPage());
  }

  function isReportFilterForm($form) {
    const id = ($form.attr('id') || '').toLowerCase();
    if (id === 'formacoesrelatorios' || id === 'formgerarrelatorio') {
      return false;
    }
    if ($form.closest('#formAcoesRelatorios, #formGerarRelatorio').length) {
      return false;
    }
    return isPdfEnabledPage() && $form.find('button[type="submit"], input[type="submit"]').length > 0;
  }

  function getPrimaryFilterForm() {
    let $selected = $();
    $('.rel-legacy-page form, .rel-modern-filter').each(function() {
      const $form = $(this);
      if (!$selected.length && isReportFilterForm($form)) {
        $selected = $form;
      }
    });
    return $selected;
  }

  function buildPdfUrl($form) {
    const params = new URLSearchParams();
    params.set('pagina', getCurrentReportPage());

    if ($form && $form.length) {
      $form.serializeArray().forEach(function(item) {
        if (!item.name || item.value === undefined) {
          return;
        }
        params.append(item.name, item.value);
      });
    }

    return 'gerar_relatorio_pdf.php?' + params.toString();
  }

  function createPdfButton(extraClass) {
    return $('<button>', {
      type: 'button',
      class: 'btn rel-pdf-btn ' + (extraClass || ''),
      html: '<i class="fas fa-file-pdf"></i><span>Gerar PDF</span>'
    });
  }

  function normalizeActions($form, $submit) {
    $submit.addClass('rel-filter-submit-btn');

    $form.find('a, button').each(function() {
      const $action = $(this);
      const text = $.trim($action.text()).toLowerCase();
      if (text === 'limpar' || text === 'limpar filtros') {
        $action.addClass('rel-clear-btn');
      }
    });

    let $actions = $submit.closest('.rel-filter-actions, .rel-actions, .form-actions, .btn-group-actions');
    if (!$actions.length) {
      $submit.wrap('<span class="rel-inline-actions"></span>');
      $actions = $submit.parent();
    }

    return $actions;
  }

  function ensurePdfButton($form) {
    if (!isReportFilterForm($form) || $form.data('pdf-ready') || $form.find('.rel-pdf-btn').length) {
      return;
    }

    const $submit = $form.find('button[type="submit"], input[type="submit"]').first();
    if (!$submit.length) {
      return;
    }

    const $actions = normalizeActions($form, $submit);
    $actions.append(createPdfButton());
    $form.data('pdf-ready', true);
  }

  $('.rel-legacy-page form, .rel-modern-filter').each(function() {
    ensurePdfButton($(this));
  });

  if (isPdfEnabledPage() && !$('.rel-pdf-btn').length) {
    const $toolbar = $('.rel-toolbar').first();
    const $form = getPrimaryFilterForm();
    if ($toolbar.length && $form.length) {
      const $button = createPdfButton('rel-toolbar-pdf');
      $button.data('target-form', $form);
      $toolbar.append($button);
    }
  }

  let pdfRequestInProgress = false;

  function resetPdfButtons(originalHtml) {
    pdfRequestInProgress = false;
    $('.rel-pdf-btn')
      .prop('disabled', false)
      .removeClass('is-loading')
      .html(originalHtml);
  }

  function showPdfError(message) {
    const text = message || 'Não foi possível gerar o PDF. Tente novamente.';
    window.alert(text);
  }

  $(document).on('click', '.rel-pdf-btn', function() {
    if (pdfRequestInProgress) {
      return;
    }

    const $button = $(this);
    const originalHtml = $button.html();
    let $form = $button.closest('form');
    if (!$form.length && $button.data('target-form')) {
      $form = $button.data('target-form');
    }
    if (!$form.length) {
      $form = getPrimaryFilterForm();
    }

    if ($form.length && $form[0] && !$form[0].checkValidity()) {
      $form[0].reportValidity();
      return;
    }

    pdfRequestInProgress = true;
    $('.rel-pdf-btn')
      .prop('disabled', true)
      .addClass('is-loading')
      .html('<i class="fas fa-spinner fa-spin"></i><span>Gerando...</span>');

    const iframeName = 'relPdfDownloadFrame';
    let $iframe = $('#' + iframeName);
    if (!$iframe.length) {
      $iframe = $('<iframe>', {
        id: iframeName,
        name: iframeName,
        title: 'Download PDF',
        css: { display: 'none' }
      }).appendTo('body');
    }

    $iframe.off('load.relPdf').on('load.relPdf', function() {
      let responseText = '';
      try {
        const iframeDocument = this.contentDocument || this.contentWindow.document;
        responseText = $.trim($(iframeDocument.body).text());
      } catch (error) {
        responseText = '';
      }

      if (responseText && !responseText.startsWith('%PDF')) {
        showPdfError(responseText.substring(0, 900));
      }

      window.setTimeout(function() {
        resetPdfButtons(originalHtml);
      }, 1200);
    });

    window.setTimeout(function() {
      if (pdfRequestInProgress) {
        resetPdfButtons(originalHtml);
      }
    }, 120000);

    $iframe.attr('src', buildPdfUrl($form));
  });
});

