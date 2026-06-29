(function() {
  var endpoint = 'api/home_list.php';
  var refreshLoading = false;
  var appendLoading = false;
  var autoReloadTimer = null;
  var reloadInterval = 60000;

  function getFilterForm() {
    return document.getElementById('form-filtros');
  }

  function getTableContainer() {
    return document.querySelector('.table-container');
  }

  function buildBodyFromForm(form, mode) {
    var body = new URLSearchParams();
    if (form) {
      var data = new FormData(form);
      data.forEach(function(value, key) {
        body.append(key, value);
      });
    }
    body.set('mode', mode || 'refresh');
    return body;
  }

  function post(body) {
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: body
    }).then(function(response) {
      if (!response.ok) {
        throw new Error('Falha ao carregar atendimentos.');
      }
      return response.json();
    }).then(function(data) {
      if (!data || data.ok !== true) {
        throw new Error((data && data.message) ? data.message : 'Falha ao carregar atendimentos.');
      }
      return data;
    });
  }

  function setRefreshBusy(isBusy) {
    refreshLoading = isBusy;
    ensureLoadingOverlay();
    document.body.classList.toggle('atd-refreshing', isBusy);
  }

  function ensureLoadingOverlay() {
    var tableRegion = document.getElementById('atdTableRegion');
    if (!tableRegion || tableRegion.querySelector('.atd-loading-overlay')) {
      return;
    }

    var overlay = document.createElement('div');
    overlay.className = 'atd-loading-overlay';
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = '<div class="atd-loading-box"><i class="fas fa-spinner fa-spin"></i><span>Carregando atendimentos...</span></div>';
    tableRegion.appendChild(overlay);
  }

  function ajustarAlturaTabela() {
    var tableContainer = getTableContainer();
    if (!tableContainer) return;

    var topoTabela = tableContainer.getBoundingClientRect().top;
    var alturaDisponivel = window.innerHeight - topoTabela;
    tableContainer.style.height = Math.max(240, alturaDisponivel) + 'px';
    tableContainer.style.maxHeight = Math.max(240, alturaDisponivel) + 'px';
  }

  function afterDomUpdate() {
    initPeriodPicker();
    initAutoReload();
    ajustarAlturaTabela();
    bindTableScroll();
  }

  function applyRefresh(data) {
    var cards = document.getElementById('atdStatusCards');
    var filters = document.getElementById('atdFilters');
    var table = document.getElementById('atdTableRegion');

    if (cards && data.html.cards !== undefined) {
      cards.innerHTML = data.html.cards;
    }
    if (filters && data.html.filters !== undefined) {
      filters.innerHTML = data.html.filters;
    }
    if (table && data.html.table !== undefined) {
      table.innerHTML = data.html.table;
      ensureLoadingOverlay();
    }

    afterDomUpdate();
  }

  function refreshFromForm(form, silent) {
    if (refreshLoading) return Promise.resolve();

    var body = buildBodyFromForm(form || getFilterForm(), 'refresh');
    body.set('page', '1');
    setRefreshBusy(!silent);

    return post(body)
      .then(applyRefresh)
      .catch(function(error) {
        if (!silent) {
          console.error(error);
        }
      })
      .finally(function() {
        setRefreshBusy(false);
      });
  }

  function clearPeriodFilter() {
    var campoData1 = document.getElementById('f_date_1');
    var campoData2 = document.getElementById('f_date_2');
    var botaoPeriodo = document.getElementById('btn-date-range');
    var labelPeriodo = document.getElementById('date-range-label');

    if (campoData1) campoData1.value = '';
    if (campoData2) campoData2.value = '';

    if (botaoPeriodo && botaoPeriodo._flatpickr) {
      botaoPeriodo._flatpickr.clear();
      botaoPeriodo._flatpickr.close();
    }

    if (botaoPeriodo && labelPeriodo && campoData1 && campoData2) {
      atualizarLabelPeriodo(botaoPeriodo, labelPeriodo, campoData1, campoData2);
    }
  }

  function clearFilters() {
    if (refreshLoading) return;
    clearPeriodFilter();
    var body = new URLSearchParams();
    body.set('mode', 'refresh');
    body.set('clear', '1');
    body.set('f_date_1', '');
    body.set('f_date_2', '');
    setRefreshBusy(true);

    post(body)
      .then(applyRefresh)
      .catch(function(error) {
        console.error(error);
      })
      .finally(function() {
        setRefreshBusy(false);
      });
  }

  function appendNextPage() {
    var loader = document.getElementById('atdInfiniteLoader');
    var tbody = document.getElementById('atdRows');
    if (!loader || !tbody || appendLoading || loader.dataset.hasMore === '0') {
      return;
    }

    appendLoading = true;
    loader.classList.add('is-loading');
    var text = document.getElementById('atdInfiniteLoaderText');
    if (text) {
      text.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Carregando mais atendimentos...';
    }

    var body = buildBodyFromForm(getFilterForm(), 'append');
    body.set('page', loader.dataset.nextPage || '2');

    post(body)
      .then(function(data) {
        if (data.html.rows) {
          tbody.insertAdjacentHTML('beforeend', data.html.rows);
        }
        if (data.html.loader) {
          loader.outerHTML = data.html.loader;
        }
      })
      .catch(function(error) {
        console.error(error);
        if (text) {
          text.textContent = 'Falha ao carregar mais atendimentos. Role novamente para tentar.';
        }
      })
      .finally(function() {
        appendLoading = false;
        var activeLoader = document.getElementById('atdInfiniteLoader');
        if (activeLoader) {
          activeLoader.classList.remove('is-loading');
        }
        ajustarAlturaTabela();
      });
  }

  function maybeAppend() {
    var tableContainer = getTableContainer();
    var loader = document.getElementById('atdInfiniteLoader');
    if (!tableContainer || !loader || loader.dataset.hasMore === '0') {
      return;
    }

    var distanciaFim = tableContainer.scrollHeight - tableContainer.scrollTop - tableContainer.clientHeight;
    if (distanciaFim < 180) {
      appendNextPage();
    }
  }

  function bindTableScroll() {
    var tableContainer = getTableContainer();
    if (!tableContainer || tableContainer.dataset.scrollBound === '1') {
      return;
    }
    tableContainer.dataset.scrollBound = '1';
    tableContainer.addEventListener('scroll', maybeAppend);
    window.requestAnimationFrame(maybeAppend);
  }

  function formatarDataBR(dataIso) {
    if (!dataIso || !/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return '';
    var partes = dataIso.split('-');
    return partes[2] + '/' + partes[1] + '/' + partes[0];
  }

  function atualizarLabelPeriodo(botao, label, campoData1, campoData2) {
    var d1 = campoData1.value || '';
    var d2 = campoData2.value || '';

    if (d1 && d2) {
      label.textContent = formatarDataBR(d1) + ' ate ' + formatarDataBR(d2);
      botao.classList.remove('btn-outline-info');
      botao.classList.add('btn-info');
      return;
    }
    if (d1) {
      label.textContent = 'A partir de ' + formatarDataBR(d1);
      botao.classList.remove('btn-outline-info');
      botao.classList.add('btn-info');
      return;
    }
    if (d2) {
      label.textContent = 'Ate ' + formatarDataBR(d2);
      botao.classList.remove('btn-outline-info');
      botao.classList.add('btn-info');
      return;
    }

    label.textContent = 'Periodo';
    botao.classList.remove('btn-info');
    botao.classList.add('btn-outline-info');
  }

  function initPeriodPicker() {
    var botaoPeriodo = document.getElementById('btn-date-range');
    var campoData1 = document.getElementById('f_date_1');
    var campoData2 = document.getElementById('f_date_2');
    var formFiltros = getFilterForm();

    if (!botaoPeriodo || !campoData1 || !campoData2 || !formFiltros || typeof flatpickr === 'undefined') {
      return;
    }
    if (botaoPeriodo.dataset.periodBound === '1') {
      return;
    }
    botaoPeriodo.dataset.periodBound = '1';

    var labelPeriodo = document.getElementById('date-range-label');
    var datasDefault = [];
    if (campoData1.value) datasDefault.push(campoData1.value);
    if (campoData2.value) datasDefault.push(campoData2.value);
    var ultimaFaixa = { d1: campoData1.value || '', d2: campoData2.value || '' };
    var periodoAberto = false;

    var fp = flatpickr(botaoPeriodo, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      locale: (flatpickr.l10ns && flatpickr.l10ns.pt) ? flatpickr.l10ns.pt : 'default',
      allowInput: false,
      clickOpens: false,
      defaultDate: datasDefault,
      onOpen: function() {
        periodoAberto = true;
        botaoPeriodo.setAttribute('aria-expanded', 'true');
      },
      onClose: function(selectedDates, _dateStr, instance) {
        periodoAberto = false;
        botaoPeriodo.setAttribute('aria-expanded', 'false');

        var d1Atual = '';
        var d2Atual = '';
        if (selectedDates && selectedDates.length === 1) {
          d1Atual = instance.formatDate(selectedDates[0], 'Y-m-d');
        } else if (selectedDates && selectedDates.length > 1) {
          d1Atual = instance.formatDate(selectedDates[0], 'Y-m-d');
          d2Atual = instance.formatDate(selectedDates[1], 'Y-m-d');
        }

        campoData1.value = d1Atual;
        campoData2.value = d2Atual;
        atualizarLabelPeriodo(botaoPeriodo, labelPeriodo, campoData1, campoData2);

        if (d1Atual !== ultimaFaixa.d1 || d2Atual !== ultimaFaixa.d2) {
          ultimaFaixa = { d1: d1Atual, d2: d2Atual };
          refreshFromForm(formFiltros, false);
        }
      }
    });

    botaoPeriodo.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      if (periodoAberto || fp.isOpen) {
        fp.close();
        return;
      }
      fp.open();
    });

    botaoPeriodo.setAttribute('aria-haspopup', 'dialog');
    botaoPeriodo.setAttribute('aria-expanded', 'false');
    atualizarLabelPeriodo(botaoPeriodo, labelPeriodo, campoData1, campoData2);
  }

  function updateAutoReloadIcon() {
    var icon = document.getElementById('autoReloadToggle');
    if (!icon) return;

    var enabled = localStorage.getItem('autoReload') !== 'false';
    icon.classList.toggle('fa-spin', enabled);
    icon.classList.toggle('text-primary', enabled);
    icon.classList.toggle('text-secondary', !enabled);
    icon.title = enabled ? 'Auto-reload ativado (clique para desativar)' : 'Auto-reload desativado (clique para ativar)';
  }

  function startAutoReloadTimer() {
    if (autoReloadTimer) {
      clearInterval(autoReloadTimer);
    }
    if (localStorage.getItem('autoReload') === 'false') {
      autoReloadTimer = null;
      return;
    }
    autoReloadTimer = setInterval(function() {
      refreshFromForm(getFilterForm(), true);
    }, reloadInterval);
  }

  function initAutoReload() {
    var icon = document.getElementById('autoReloadToggle');
    if (!icon) {
      if (autoReloadTimer) {
        clearInterval(autoReloadTimer);
        autoReloadTimer = null;
      }
      return;
    }

    if (localStorage.getItem('autoReload') === null) {
      localStorage.setItem('autoReload', 'true');
    }

    if (icon && icon.dataset.reloadBound !== '1') {
      icon.dataset.reloadBound = '1';
      icon.addEventListener('click', function() {
        var enabled = localStorage.getItem('autoReload') !== 'false';
        localStorage.setItem('autoReload', enabled ? 'false' : 'true');
        updateAutoReloadIcon();
        startAutoReloadTimer();
      });
    }

    updateAutoReloadIcon();
    startAutoReloadTimer();
  }

  window.toggleAllTipos = function() {
    var selectAll = document.getElementById('select-all-tipo');
    document.querySelectorAll('.tipo-checkbox').forEach(function(checkbox) {
      checkbox.checked = !!(selectAll && selectAll.checked);
    });
  };

  window.toggleAllTecnicos = function() {
    var selectAll = document.getElementById('select-all-tecnicos');
    document.querySelectorAll('.tec-checkbox').forEach(function(checkbox) {
      checkbox.checked = !!(selectAll && selectAll.checked);
    });
  };

  document.addEventListener('submit', function(event) {
    var form = event.target;
    if (!form || form.dataset.atdDynamicForm !== '1') {
      return;
    }
    event.preventDefault();
    refreshFromForm(form, false);
  });

  document.addEventListener('click', function(event) {
    var clearButton = event.target.closest('[data-atd-clear-filters]');
    if (clearButton) {
      event.preventDefault();
      clearFilters();
    }
  });

  document.addEventListener('dblclick', function(event) {
    var linha = event.target.closest('tr.atd-row-clickable');
    if (!linha) return;
    var destino = linha.getAttribute('data-atd-url');
    if (destino) {
      window.open(destino, '_blank');
    }
  });

  window.addEventListener('resize', ajustarAlturaTabela);
  document.addEventListener('DOMContentLoaded', afterDomUpdate);
  window.addEventListener('load', afterDomUpdate);
})();
