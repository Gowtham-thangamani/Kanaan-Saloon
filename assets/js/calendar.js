/* Kanaan inline calendar — vanilla, no deps, ~3KB.
   Auto-replaces every <input type="date" data-calendar> with a custom
   month-grid picker that has year + month dropdowns, and an inline
   calendar grid. Bilingual EN/AR. */
(function () {
  'use strict';
  var isAr = document.documentElement.lang === 'ar';
  var L = isAr ? {
    months: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    days: ['ح','ن','ث','ر','خ','ج','س'],
    today: 'اليوم',
    pickDate: 'اختر التاريخ'
  } : {
    months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    days: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    today: 'Today',
    pickDate: 'Pick a date'
  };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtArDigits(s) { return s.replace(/[0-9]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); }

  function buildCalendar(input) {
    if (input.dataset.calBuilt === '1') return;
    input.dataset.calBuilt = '1';

    var today = new Date(); today.setHours(0,0,0,0);
    var minDate = today;
    var maxDate = new Date(today); maxDate.setDate(today.getDate() + 90);
    var current = input.value ? new Date(input.value) : new Date(today);
    if (isNaN(current.getTime())) current = new Date(today);
    var view = new Date(current.getFullYear(), current.getMonth(), 1);

    // Wrap input + add a button that opens the inline panel
    var wrap = document.createElement('div');
    wrap.className = 'cal-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    input.type = 'text';
    input.readOnly = true;
    input.placeholder = L.pickDate;
    input.value = current ? isoDate(current) : '';
    input.classList.add('cal-input');

    var panel = document.createElement('div');
    panel.className = 'cal-panel';
    panel.setAttribute('role','dialog');
    wrap.appendChild(panel);

    function render() {
      var year = view.getFullYear();
      var month = view.getMonth();
      var first = new Date(year, month, 1);
      var startDay = first.getDay();
      var daysInMonth = new Date(year, month + 1, 0).getDate();

      // Year options: today's year ± 1 (we don't allow past years; only this year + next for booking convenience)
      var yearMin = today.getFullYear();
      var yearMax = today.getFullYear() + 1;
      var yearOpts = '';
      for (var yy = yearMin; yy <= yearMax; yy++) {
        yearOpts += '<option value="' + yy + '"' + (yy === year ? ' selected' : '') + '>' + (isAr ? fmtArDigits(String(yy)) : yy) + '</option>';
      }
      var monthOpts = L.months.map(function (m, i) {
        return '<option value="' + i + '"' + (i === month ? ' selected' : '') + '>' + m + '</option>';
      }).join('');

      var headRow = L.days.map(function (d) { return '<div class="cal-dow">' + d + '</div>'; }).join('');

      var cells = '';
      // empty leading
      for (var i = 0; i < startDay; i++) cells += '<div class="cal-day cal-day--empty"></div>';
      for (var d = 1; d <= daysInMonth; d++) {
        var thisDate = new Date(year, month, d);
        var iso = isoDate(thisDate);
        var disabled = thisDate < minDate || thisDate > maxDate;
        var isToday = isoDate(thisDate) === isoDate(today);
        var isSelected = isoDate(thisDate) === input.value;
        var classes = ['cal-day'];
        if (disabled) classes.push('cal-day--disabled');
        if (isToday) classes.push('cal-day--today');
        if (isSelected) classes.push('cal-day--selected');
        // Friday late-open hint
        if (thisDate.getDay() === 5) classes.push('cal-day--fri');
        var label = isAr ? fmtArDigits(String(d)) : d;
        cells += '<button type="button" class="' + classes.join(' ') + '" data-iso="' + iso + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button>';
      }

      panel.innerHTML =
        '<div class="cal-head">' +
          '<button type="button" class="cal-nav" data-nav="-1" aria-label="Previous month">‹</button>' +
          '<select class="cal-month">' + monthOpts + '</select>' +
          '<select class="cal-year">' + yearOpts + '</select>' +
          '<button type="button" class="cal-nav" data-nav="1" aria-label="Next month">›</button>' +
        '</div>' +
        '<div class="cal-grid cal-grid--head">' + headRow + '</div>' +
        '<div class="cal-grid">' + cells + '</div>' +
        '<div class="cal-foot">' +
          '<button type="button" class="cal-today">' + L.today + '</button>' +
        '</div>';

      // Wire controls
      panel.querySelector('.cal-month').addEventListener('change', function (e) {
        view.setMonth(parseInt(e.target.value, 10));
        render();
      });
      panel.querySelector('.cal-year').addEventListener('change', function (e) {
        view.setFullYear(parseInt(e.target.value, 10));
        render();
      });
      panel.querySelectorAll('.cal-nav').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var delta = parseInt(btn.dataset.nav, 10);
          view.setMonth(view.getMonth() + delta);
          render();
        });
      });
      panel.querySelector('.cal-today').addEventListener('click', function () {
        input.value = isoDate(today);
        view = new Date(today.getFullYear(), today.getMonth(), 1);
        render();
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      panel.querySelectorAll('.cal-day').forEach(function (d) {
        d.addEventListener('click', function () {
          if (d.classList.contains('cal-day--disabled')) return;
          input.value = d.dataset.iso;
          render();
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    }

    render();
  }

  // Auto-attach to every date input
  function init() {
    document.querySelectorAll('input[type="date"]').forEach(buildCalendar);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
