      <script src="./js/jquery-3.6.0.min.js"></script>
      <script src="./js/bootstrap.min.js"></script>
      <?php include_once($projectRoot . "/all/update_pass.php"); ?>
      <?php if (isset($mensagem)) { ?>
        <script>
          window.setTimeout(function() {
            $(".alert").alert('close');
          }, 4000);
        </script>
      <?php } ?>

      <script>
        $(document).ready(function() {
          $('#modalSenha').on('click', '.toggle-password', function() {

            // 'this' Ã© o <span> que foi clicado
            var icon = $(this).find('i');
            var input = $(this).closest('.input-group').find('input');

            // Verifica o tipo atual do input
            if (input.attr('type') === 'password') {
              // Muda para texto
              input.attr('type', 'text');
              // Muda o Ã­cone para 'olho cortado'
              icon.removeClass('fa-eye').addClass('fa-eye-slash');
            } else {
              // Muda para senha
              input.attr('type', 'password');
              // Muda o Ã­cone de volta para 'olho'
              icon.removeClass('fa-eye-slash').addClass('fa-eye');
            }
          });

          var periodForm = $('#rankingPeriodForm');
          var rangeToggle = $('#rankingRangeToggle');
          var hiddenStart = $('#data_inicio');
          var hiddenEnd = $('#data_fim');
          var calendarGrid = $('#rankingCalendarGrid');
          var calendarMonth = $('#rankingCalendarMonth');
          var calendarYear = $('#rankingCalendarYear');
          var rangeLabel = $('#rankingRangeLabel');
          var rangeHint = $('#rankingRangeHint');
          var monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
          var selectedStart = parseDateValue(hiddenStart.val());
          var selectedEnd = parseDateValue(hiddenEnd.val());
          var viewDate = new Date(selectedStart.getFullYear(), selectedStart.getMonth(), 1);
          var selectingEnd = false;

          function parseDateValue(value) {
            var parts = (value || '').split('-');
            if (parts.length !== 3) {
              return new Date();
            }

            return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          }

          function formatDateValue(date) {
            var month = String(date.getMonth() + 1).padStart(2, '0');
            var day = String(date.getDate()).padStart(2, '0');
            return date.getFullYear() + '-' + month + '-' + day;
          }

          function formatDateLabel(date) {
            var day = String(date.getDate()).padStart(2, '0');
            var month = String(date.getMonth() + 1).padStart(2, '0');
            return day + '/' + month + '/' + date.getFullYear();
          }

          function sameDate(first, second) {
            return first && second && first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
          }

          function normalizeDate(date) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
          }

          function syncRangePreview(updateHidden) {
            if (!selectedStart) {
              rangeHint.text('Selecione a data inicial');
              return;
            }

            var finalEnd = selectedEnd || selectedStart;

            if (updateHidden) {
              hiddenStart.val(formatDateValue(selectedStart));
              hiddenEnd.val(formatDateValue(finalEnd));
              rangeLabel.text(formatDateLabel(selectedStart) + ' - ' + formatDateLabel(finalEnd));
            }

            if (selectingEnd) {
              rangeHint.text('Escolha a data final');
            } else {
              rangeHint.text(formatDateLabel(selectedStart) + ' - ' + formatDateLabel(finalEnd));
            }
          }

          function renderCalendar() {
            var year = viewDate.getFullYear();
            var month = viewDate.getMonth();
            var firstDay = new Date(year, month, 1);
            var gridStart = new Date(year, month, 1 - firstDay.getDay());
            var rangeStart = selectedStart ? normalizeDate(selectedStart) : null;
            var rangeEnd = selectedStart ? normalizeDate(selectedEnd || selectedStart) : null;

            if (rangeStart && rangeEnd && rangeEnd < rangeStart) {
              var tempDate = rangeStart;
              rangeStart = rangeEnd;
              rangeEnd = tempDate;
            }

            calendarMonth.text(monthNames[month]);
            calendarYear.text(year);
            calendarGrid.empty();

            for (var index = 0; index < 42; index++) {
              var dayDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
              var normalizedDay = normalizeDate(dayDate);
              var dayButton = $('<button type="button" class="ranking-day"><span></span></button>');

              dayButton.find('span').text(dayDate.getDate());
              dayButton.attr('data-date', formatDateValue(dayDate));

              if (dayDate.getMonth() !== month) {
                dayButton.addClass('is-muted');
              }

              if (rangeStart && rangeEnd && normalizedDay >= rangeStart && normalizedDay <= rangeEnd) {
                dayButton.addClass('is-in-range');
              }

              if (rangeStart && sameDate(normalizedDay, rangeStart)) {
                dayButton.addClass('is-range-start');
              }

              if (rangeEnd && sameDate(normalizedDay, rangeEnd)) {
                dayButton.addClass('is-range-end');
              }

              calendarGrid.append(dayButton);
            }
          }

          rangeToggle.on('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            periodForm.toggleClass('range-open');
            rangeToggle.attr('aria-expanded', periodForm.hasClass('range-open') ? 'true' : 'false');
            renderCalendar();
          });

          periodForm.on('click', function(event) {
            event.stopPropagation();
          });

          $('#rankingCalendarPrev').on('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
            renderCalendar();
          });

          $('#rankingCalendarNext').on('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
            renderCalendar();
          });

          calendarGrid.on('click', '.ranking-day', function(event) {
            event.preventDefault();
            event.stopPropagation();
            var clickedDate = parseDateValue($(this).attr('data-date'));

            if ((selectedStart && sameDate(clickedDate, selectedStart)) || (selectedEnd && sameDate(clickedDate, selectedEnd))) {
              selectedStart = null;
              selectedEnd = null;
              selectingEnd = false;
              rangeHint.text('Selecione a data inicial');
              renderCalendar();
              return;
            }

            if (!selectingEnd) {
              selectedStart = clickedDate;
              selectedEnd = null;
              selectingEnd = true;
            } else {
              selectedEnd = clickedDate;

              if (selectedEnd < selectedStart) {
                var oldStart = selectedStart;
                selectedStart = selectedEnd;
                selectedEnd = oldStart;
              }

              selectingEnd = false;
            }

            syncRangePreview(false);
            renderCalendar();
          });

          $('#rankingRangeApply').on('click', function(event) {
            if (!selectedStart) {
              event.preventDefault();
              rangeHint.text('Selecione a data inicial');
              return;
            }

            syncRangePreview(true);
          });

          $(document).on('click', function(event) {
            if (!$(event.target).closest('#rankingPeriodForm').length) {
              periodForm.removeClass('range-open');
              rangeToggle.attr('aria-expanded', 'false');
            }
          });

          syncRangePreview(true);
          renderCalendar();

        })
      </script>

</body>
