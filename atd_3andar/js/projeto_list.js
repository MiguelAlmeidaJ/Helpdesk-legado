(function () {
  function findForm(container) {
    var selector = container.getAttribute('data-projeto-form');
    return selector ? document.querySelector(selector) : document.querySelector('[data-projeto-ajax-form]');
  }

  function setHidden(form, name, value) {
    var field = form.querySelector('[name="' + name + '"]');
    if (!field) {
      field = document.createElement('input');
      field.type = 'hidden';
      field.name = name;
      form.appendChild(field);
    }
    field.value = value;
  }

  function setLoading(container, loading) {
    container.classList.toggle('is-loading', loading);
  }

  function setAppending(container, loading) {
    container.classList.toggle('is-appending', loading);
    container.dataset.appending = loading ? '1' : '0';
  }

  function updateMeta(container, pagination) {
    var meta = container.querySelector('.projeto-list-meta');
    if (!meta || !pagination) {
      return;
    }

    var counters = meta.querySelectorAll('span');
    if (counters[0]) {
      counters[0].innerHTML = 'Total: <strong>' + pagination.total + '</strong>';
    }
    if (counters[1]) {
      counters[1].textContent = 'Exibindo ' + pagination.loaded + ' de ' + pagination.total;
    }
  }

  function formatDateBR(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return '';
    }
    var parts = value.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function updateDateRangeLabel(button, label, startField, endField) {
    var start = startField.value || '';
    var end = endField.value || '';

    if (start && end) {
      label.textContent = formatDateBR(start) + ' ate ' + formatDateBR(end);
      button.classList.remove('btn-outline-info');
      button.classList.add('btn-info');
      return;
    }
    if (start) {
      label.textContent = 'A partir de ' + formatDateBR(start);
      button.classList.remove('btn-outline-info');
      button.classList.add('btn-info');
      return;
    }
    if (end) {
      label.textContent = 'Ate ' + formatDateBR(end);
      button.classList.remove('btn-outline-info');
      button.classList.add('btn-info');
      return;
    }

    label.textContent = 'Periodo';
    button.classList.remove('btn-info');
    button.classList.add('btn-outline-info');
  }

  function initDateRangePicker(container) {
    var button = document.getElementById('btn-projeto-date-range');
    var startField = document.getElementById('projeto_data_1');
    var endField = document.getElementById('projeto_data_2');
    var label = document.getElementById('projeto-date-range-label');
    var form = findForm(container);

    if (!button || !startField || !endField || !label || !form || typeof flatpickr === 'undefined') {
      return;
    }
    if (button.dataset.periodBound === '1') {
      updateDateRangeLabel(button, label, startField, endField);
      return;
    }
    button.dataset.periodBound = '1';

    var defaultDates = [];
    if (startField.value) defaultDates.push(startField.value);
    if (endField.value) defaultDates.push(endField.value);
    var lastRange = { start: startField.value || '', end: endField.value || '' };
    var isOpen = false;

    var picker = flatpickr(button, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      locale: (flatpickr.l10ns && flatpickr.l10ns.pt) ? flatpickr.l10ns.pt : 'default',
      allowInput: false,
      clickOpens: false,
      defaultDate: defaultDates,
      onOpen: function () {
        isOpen = true;
        button.setAttribute('aria-expanded', 'true');
      },
      onClose: function (selectedDates, _dateStr, instance) {
        isOpen = false;
        button.setAttribute('aria-expanded', 'false');

        var start = '';
        var end = '';
        if (selectedDates && selectedDates.length === 1) {
          start = instance.formatDate(selectedDates[0], 'Y-m-d');
        } else if (selectedDates && selectedDates.length > 1) {
          start = instance.formatDate(selectedDates[0], 'Y-m-d');
          end = instance.formatDate(selectedDates[1], 'Y-m-d');
        }

        startField.value = start;
        endField.value = end;
        updateDateRangeLabel(button, label, startField, endField);

        if (start !== lastRange.start || end !== lastRange.end) {
          lastRange = { start: start, end: end };
          setHidden(form, 'page', 1);
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    });

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (isOpen || picker.isOpen) {
        picker.close();
        return;
      }
      picker.open();
    });

    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    updateDateRangeLabel(button, label, startField, endField);
  }

  function bindInfiniteScroll(container) {
    var tableWrap = container.querySelector('.projeto-table-wrap');
    if (!tableWrap) {
      return;
    }

    tableWrap.onscroll = function () {
      var loader = container.querySelector('[data-projeto-infinite-loader]');
      if (!loader || loader.getAttribute('data-has-more') !== '1' || container.dataset.appending === '1') {
        return;
      }

      var nearEnd = tableWrap.scrollTop + tableWrap.clientHeight >= tableWrap.scrollHeight - 80;
      if (nearEnd) {
        loadList(container, {
          mode: 'append',
          page: loader.getAttribute('data-next-page')
        });
      }
    };
  }

  function loadList(container, options) {
    var form = findForm(container);
    if (!form) {
      return Promise.resolve();
    }

    var endpoint = container.getAttribute('data-projeto-endpoint');
    if (!endpoint) {
      return Promise.resolve();
    }

    options = options || {};
    var mode = options.mode === 'append' ? 'append' : 'refresh';
    if (options.page) {
      setHidden(form, 'page', options.page);
    }
    if (options.sort) {
      setHidden(form, 'ord', options.sort);
      setHidden(form, 'order_dir', options.dir || 'ASC');
      setHidden(form, 'page', 1);
    }
    if (options.resetPage) {
      setHidden(form, 'page', 1);
    }

    var data = new FormData(form);
    data.set('mode', mode);

    if (mode === 'append') {
      setAppending(container, true);
    } else {
      setLoading(container, true);
    }

    return fetch(endpoint, {
      method: 'POST',
      body: data,
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'fetch'
      }
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Falha HTTP');
        }
        return response.json();
      })
      .then(function (payload) {
        if (!payload.ok) {
          throw new Error(payload.message || 'Falha ao carregar.');
        }
        if (mode === 'append') {
          var tbody = container.querySelector('.projeto-table tbody');
          var loader = container.querySelector('[data-projeto-infinite-loader]');
          if (tbody && payload.html && payload.html.rows) {
            tbody.insertAdjacentHTML('beforeend', payload.html.rows);
          }
          if (loader && payload.html && payload.html.loader) {
            loader.outerHTML = payload.html.loader;
          }
          updateMeta(container, payload.pagination);
        } else {
          container.innerHTML = payload.html;
          bindInfiniteScroll(container);
        }
      })
      .catch(function () {
        form.submit();
      })
      .finally(function () {
        if (mode === 'append') {
          setAppending(container, false);
        } else {
          setLoading(container, false);
        }
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-projeto-list]').forEach(function (container) {
      var form = findForm(container);
      if (form) {
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          loadList(container, { resetPage: true });
        });
      }

      container.addEventListener('click', function (event) {
        var sortButton = event.target.closest('[data-projeto-sort]');
        if (sortButton) {
          event.preventDefault();
          loadList(container, {
            sort: sortButton.getAttribute('data-projeto-sort'),
            dir: sortButton.getAttribute('data-projeto-dir') || 'ASC'
          });
          return;
        }

        var pageButton = event.target.closest('[data-projeto-page]');
        if (pageButton && !pageButton.disabled) {
          event.preventDefault();
          loadList(container, { page: pageButton.getAttribute('data-projeto-page') });
        }
      });

      container.addEventListener('dblclick', function (event) {
        var row = event.target.closest('[data-projeto-open-url]');
        if (!row) {
          return;
        }

        var url = row.getAttribute('data-projeto-open-url');
        if (url) {
          window.open(url, '_blank', 'noopener');
        }
      });

      bindInfiniteScroll(container);
      initDateRangePicker(container);
    });
  });
})();
