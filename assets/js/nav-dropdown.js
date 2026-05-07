/* Kanaan nav dropdown — keyboard support + mobile accordion + outside-click close. */
(function () {
  'use strict';

  // Desktop dropdowns
  document.querySelectorAll('.nav-dd').forEach(function (dd) {
    var trigger = dd.querySelector('.nav-dd__trigger');
    var panel = dd.querySelector('.nav-dd__panel');
    if (!trigger || !panel) return;

    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');

    function open() { dd.dataset.open = 'true'; trigger.setAttribute('aria-expanded', 'true'); }
    function close() { dd.dataset.open = 'false'; trigger.setAttribute('aria-expanded', 'false'); }

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      dd.dataset.open === 'true' ? close() : open();
    });
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        open();
        var first = panel.querySelector('a');
        if (first) first.focus();
      }
    });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); trigger.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!dd.contains(e.target)) close();
    });
  });

  // Mobile accordion
  document.querySelectorAll('.nav-dd-m').forEach(function (acc) {
    var head = acc.querySelector('.nav-dd-m__head');
    if (!head) return;
    head.setAttribute('aria-expanded', 'false');
    head.addEventListener('click', function () {
      var isOpen = acc.dataset.open === 'true';
      acc.dataset.open = isOpen ? 'false' : 'true';
      head.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
  });
})();
