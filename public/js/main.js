/**
 * public/js/main.js
 * -------------------------------------------------------------
 * Small browser-side script loaded on every page (see footer.ejs).
 * Most logic runs on the server; this file only adds interactivity
 * that doesn't need the server. Each feature is opt-in through a
 * data- attribute in the HTML, so pages without it are unaffected.
 */
document.addEventListener('DOMContentLoaded', function () {
  // ---------- Mobile navigation: the ☰ button shows/hides the menu ----------
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('open');
      // aria-expanded tells screen readers whether the menu is open
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // ---------- Account dropdown: close it when clicking elsewhere or pressing Esc ----------
  var userMenu = document.querySelector('.user-menu');
  if (userMenu) {
    document.addEventListener('click', function (e) {
      if (userMenu.open && !userMenu.contains(e.target)) userMenu.open = false;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') userMenu.open = false;
    });
  }

  // ---------- <form data-confirm="Are you sure?">: ask before submitting ----------
  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.dataset.confirm)) e.preventDefault();
    });
  });

  // ---------- <select data-autosubmit>: submit the form when the value changes ----------
  document.querySelectorAll('select[data-autosubmit]').forEach(function (select) {
    select.addEventListener('change', function () { select.form.submit(); });
  });

  // ---------- 🔔 Bell: refresh the unread notification count every 20 s ----------
  // So a buyer sees "your offer was accepted" without reloading the page.
  var bellCount = document.querySelector('[data-bell-count]');
  if (bellCount) {
    setInterval(function () {
      if (document.hidden) return;
      fetch('/notifications/unread-count', { headers: { Accept: 'application/json' } })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          if (!data) return;
          bellCount.textContent = data.count;
          bellCount.hidden = data.count === 0;
        })
        .catch(function () { /* offline for a moment: try again next time */ });
    }, 20000);
  }

  // ---------- Photo gallery: clicking a thumbnail shows it as the main photo ----------
  document.querySelectorAll('[data-gallery]').forEach(function (gallery) {
    var main = gallery.querySelector('[data-gallery-main]');
    gallery.querySelectorAll('.gallery-thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        main.src = thumb.dataset.src;
        gallery.querySelectorAll('.gallery-thumb').forEach(function (t) { t.classList.remove('active'); });
        thumb.classList.add('active');
      });
    });
  });
});
