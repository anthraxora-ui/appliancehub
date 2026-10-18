/**
 * public/js/chat.js  -  auto-refresh for an open conversation
 * -------------------------------------------------------------
 * Every 5 seconds, ask the server for messages newer than the last one we
 * have (GET /messages/:id/poll?after=...) and append them, so a reply
 * appears without reloading the page.
 *
 * Simple "polling" instead of WebSockets: works on any host (including
 * Render's free tier) and is easy to explain. Polling pauses while the tab
 * is hidden to save requests.
 */
(function () {
  var box = document.getElementById('chat-messages');
  if (!box) return;

  var POLL_MS = 5000;
  var lastTime = box.dataset.last;
  var failures = 0;

  // Start at the bottom (newest message).
  box.scrollTop = box.scrollHeight;

  function formatTime(iso) {
    return new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  /** Adds one message bubble. textContent (not innerHTML) prevents script injection. */
  function appendMessage(m) {
    var empty = box.querySelector('.chat-empty');
    if (empty) empty.remove();

    var bubble = document.createElement('div');
    bubble.className = 'bubble ' + (m.mine ? 'mine' : 'theirs');
    var p = document.createElement('p');
    p.className = 'pre-line';
    p.textContent = m.body;
    var time = document.createElement('time');
    time.dateTime = m.createdAt;
    time.textContent = formatTime(m.createdAt);
    bubble.appendChild(p);
    bubble.appendChild(time);
    box.insertBefore(bubble, document.getElementById('latest'));
  }

  function poll() {
    if (document.hidden) return; // tab not visible: skip this round

    fetch(box.dataset.pollUrl + '?after=' + encodeURIComponent(lastTime), { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (messages) {
        failures = 0;
        if (!messages.length) return;
        var nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
        messages.forEach(appendMessage);
        lastTime = messages[messages.length - 1].createdAt;
        if (nearBottom) box.scrollTop = box.scrollHeight;
      })
      .catch(function () {
        // Robustness: a network hiccup shouldn't break the page; stop after many failures.
        failures += 1;
        if (failures >= 10) clearInterval(timer);
      });
  }

  var timer = setInterval(poll, POLL_MS);

  // Enter sends, Shift+Enter adds a new line.
  var textarea = document.getElementById('chat-body');
  if (textarea) {
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && textarea.value.trim()) {
        e.preventDefault();
        textarea.form.submit();
      }
    });
  }
})();
