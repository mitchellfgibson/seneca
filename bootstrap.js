'use strict';

/* Wires the homepage chrome: index buttons, clock. */

document.querySelectorAll('.idx-item').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var name = btn.dataset.panel;
    if (typeof openPanel === 'function') openPanel(name);
  });
});

function updateClock() {
  var el = document.getElementById('clock');
  var elDate = document.getElementById('clock-date');
  if (!el) return;
  var now = new Date();
  var h = now.getHours();
  var m = String(now.getMinutes()).padStart(2, '0');
  var hh = ((h + 11) % 12) + 1;
  el.textContent = hh + ':' + m;
  if (elDate) {
    elDate.innerHTML =
      now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase() + '<br>' +
      '<span class="dot"></span>' + (h < 12 ? 'AM' : 'PM') + ' · ' + now.getFullYear();
  }
}
updateClock();
setInterval(updateClock, 30000);
