(function() {
  'use strict';

  // Light interactives shared by every module. Each widget finds its own markup, so a
  // lesson only includes the pieces it uses. Dragging uses pointer events, so it works
  // with a mouse, a finger or a pen; every widget also works from the keyboard.
  //   .ix-flip      flip cards: term on the front, explanation on the back
  //   .ix-buckets   drag each chip into the right bin; right answers stay, wrong ones bounce back
  //   .ix-order     drag the items into order, then check
  //   .ix-find      click the hidden targets in a passage (e.g. every piece of patient information)
  //   .ix-prev      prevalence slider over 1,000 people (PPV)

  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // Pointer drag helper. Calls onMove(x, y) while dragging and onDrop(x, y) on release.
  // A press that never moves more than a few pixels counts as a click and is left alone.
  function draggable(item, opts) {
    item.addEventListener('pointerdown', function(e) {
      if (e.button !== 0 || (opts.enabled && !opts.enabled())) return;
      var startX = e.clientX, startY = e.clientY, started = false, ghost = null, offX = 0, offY = 0;
      function move(ev) {
        if (!started) {
          if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 6) return;
          started = true;
          var r = item.getBoundingClientRect();
          offX = startX - r.left; offY = startY - r.top;
          if (opts.ghost) {
            ghost = item.cloneNode(true);
            ghost.classList.add('ix-ghost');
            ghost.style.width = r.width + 'px';
            document.body.appendChild(ghost);
          }
          item.classList.add('ix-dragging');
          if (opts.onStart) opts.onStart();
        }
        ev.preventDefault();
        if (ghost) { ghost.style.left = (ev.clientX - offX) + 'px'; ghost.style.top = (ev.clientY - offY) + 'px'; }
        if (opts.onMove) opts.onMove(ev.clientX, ev.clientY);
      }
      function up(ev) {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        if (!started) return;
        item.classList.remove('ix-dragging');
        if (ghost) ghost.remove();
        // Swallow the click that follows a drag.
        item.addEventListener('click', function stop(c) { c.stopPropagation(); c.preventDefault(); }, { capture: true, once: true });
        if (opts.onDrop) opts.onDrop(ev.clientX, ev.clientY);
      }
      document.addEventListener('pointermove', move, { passive: false });
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    });
  }

  // ── Flip cards ──
  // <div class="ix-flip"> <div class="ix-card"><div class="ix-front">...</div><div class="ix-back">...</div></div> ...
  //   <p class="ix-count"></p> </div>
  all('.ix-flip').forEach(function(box) {
    var cards = all('.ix-card', box), count = box.querySelector('.ix-count');
    function update() {
      if (!count) return;
      var n = all('.ix-card.ix-seen', box).length;
      count.textContent = n < cards.length ? n + ' of ' + cards.length + ' cards turned over.' : 'All ' + cards.length + ' cards turned over. Click any card to flip it back.';
    }
    cards.forEach(function(card) {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-pressed', 'false');
      var front = card.querySelector('.ix-front');
      if (front && !front.querySelector('.ix-hint')) front.appendChild(el('span', 'ix-hint', 'Tap to flip'));
      function flip() {
        var on = card.classList.toggle('ix-flipped');
        card.classList.add('ix-seen');
        card.setAttribute('aria-pressed', on ? 'true' : 'false');
        update();
      }
      card.addEventListener('click', function(e) { if (!e.target.closest('a')) flip(); });
      card.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    });
    update();
  });

  // ── Drag into bins ──
  // <div class="ix-buckets">
  //   <div class="ix-pool"> <div class="ix-chip" data-bin="a" data-why="shown once it lands right">text</div> ... </div>
  //   <div class="ix-bins"> <div class="ix-bin" data-bin="a"><div class="ix-bin-head">Label <small>hint</small></div></div> ... </div>
  //   <p class="ix-feedback"></p> </div>
  // Keyboard or click: pick a chip (it lifts), then pick a bin.
  all('.ix-buckets').forEach(function(box) {
    var pool = box.querySelector('.ix-pool'), bins = all('.ix-bin', box);
    var chips = all('.ix-chip', box), feedback = box.querySelector('.ix-feedback');
    var picked = null, firstTry = 0, tried = {};
    if (feedback) feedback.setAttribute('aria-live', 'polite');
    bins.forEach(function(bin) {
      bin.appendChild(el('div', 'ix-bin-items'));
      bin.setAttribute('tabindex', '0');
      bin.setAttribute('role', 'button');
      bin.addEventListener('click', function() { if (picked) place(picked, bin); });
      bin.addEventListener('keydown', function(e) { if ((e.key === 'Enter' || e.key === ' ') && picked) { e.preventDefault(); place(picked, bin); } });
    });
    function binAt(x, y) {
      return bins.filter(function(b) { var r = b.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; })[0];
    }
    function say(html, cls) { if (feedback) { feedback.innerHTML = html; feedback.className = 'ix-feedback ' + (cls || ''); } }
    function pick(chip) {
      if (picked) picked.classList.remove('ix-picked');
      picked = picked === chip ? null : chip;
      if (picked) { picked.classList.add('ix-picked'); say('Now click the box it belongs in.'); }
    }
    function place(chip, bin) {
      chip.classList.remove('ix-picked');
      picked = null;
      var key = chip.getAttribute('data-bin'), i = chips.indexOf(chip);
      var label = bin.querySelector('.ix-bin-head').firstChild.textContent.trim();
      if (bin.getAttribute('data-bin') === key) {
        if (!tried[i]) firstTry++;
        chip.classList.add('ix-placed');
        chip.removeAttribute('tabindex');
        chip.setAttribute('aria-disabled', 'true');
        bin.querySelector('.ix-bin-items').appendChild(chip);
        var why = chip.getAttribute('data-why');
        var left = chips.filter(function(c) { return !c.classList.contains('ix-placed'); }).length;
        say('<strong>Right: ' + label + '.</strong> ' + (why || '') +
          (left ? '' : ' <span class="ix-done">All sorted. ' + firstTry + ' of ' + chips.length + ' on the first try.</span>'), 'ix-ok');
        if (!left) box.classList.add('ix-complete');
      } else {
        tried[i] = true;
        chip.classList.remove('ix-shake'); void chip.offsetWidth; chip.classList.add('ix-shake');
        say('<strong>Not ' + label + '.</strong> ' + (chip.getAttribute('data-hint') || 'Read the card again and try another box.'), 'ix-no');
      }
    }
    chips.forEach(function(chip) {
      chip.setAttribute('tabindex', '0');
      chip.setAttribute('role', 'button');
      chip.addEventListener('click', function() { if (!chip.classList.contains('ix-placed')) pick(chip); });
      chip.addEventListener('keydown', function(e) { if ((e.key === 'Enter' || e.key === ' ') && !chip.classList.contains('ix-placed')) { e.preventDefault(); pick(chip); } });
      var over = null;
      draggable(chip, {
        ghost: true,
        enabled: function() { return !chip.classList.contains('ix-placed'); },
        onMove: function(x, y) {
          var b = binAt(x, y);
          if (b !== over) { if (over) over.classList.remove('ix-over'); over = b; if (b) b.classList.add('ix-over'); }
        },
        onDrop: function(x, y) {
          if (over) over.classList.remove('ix-over');
          over = null;
          var b = binAt(x, y);
          if (b) place(chip, b);
        }
      });
    });
    if (pool) pool.setAttribute('aria-label', 'Cards to sort');
  });

  // ── Drag into order ──
  // <div class="ix-order" data-top="Darkest" data-bottom="Brightest">
  //   <ol class="ix-order-list"> <li data-pos="2" data-why="optional note shown after checking">...</li> ... </ol>
  //   <p class="ix-order-result"></p> </div>        data-pos is the item's correct place, from 1.
  // Keyboard: focus an item and use the up and down arrow keys.
  all('.ix-order').forEach(function(box) {
    var list = box.querySelector('.ix-order-list'), result = box.querySelector('.ix-order-result');
    var top = box.getAttribute('data-top'), bottom = box.getAttribute('data-bottom');
    if (top) box.insertBefore(el('div', 'ix-order-end', top), list);
    if (bottom) list.parentNode.insertBefore(el('div', 'ix-order-end ix-order-end--bottom', bottom), list.nextSibling);
    if (result) result.setAttribute('aria-live', 'polite');
    function items() { return all('li', list); }
    function clear() {
      items().forEach(function(li) { li.classList.remove('ix-ok', 'ix-off'); });
      if (result) result.textContent = '';
      box.classList.remove('ix-complete');
    }
    items().forEach(function(li) {
      li.setAttribute('tabindex', '0');
      li.innerHTML = '<span class="ix-grip" aria-hidden="true"></span><span class="ix-order-text">' + li.innerHTML + '</span>';
      var why = li.getAttribute('data-why');
      if (why) li.querySelector('.ix-order-text').appendChild(el('small', 'ix-order-why', why));
      li.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowUp' && li.previousElementSibling) { e.preventDefault(); list.insertBefore(li, li.previousElementSibling); clear(); li.focus(); }
        if (e.key === 'ArrowDown' && li.nextElementSibling) { e.preventDefault(); list.insertBefore(li.nextElementSibling, li); clear(); li.focus(); }
      });
      draggable(li, {
        onStart: clear,
        onMove: function(x, y) {
          var others = items().filter(function(o) { return o !== li; });
          var before = others.filter(function(o) { var r = o.getBoundingClientRect(); return y < r.top + r.height / 2; })[0];
          if (before) { if (li.nextElementSibling !== before) list.insertBefore(li, before); }
          else if (list.lastElementChild !== li) list.appendChild(li);
        }
      });
    });
    var actions = el('div', 'ix-actions',
      '<button type="button" class="mi-btn mi-btn--fill">Check my order</button>' +
      '<button type="button" class="mi-btn" hidden>Show the right order</button>');
    box.insertBefore(actions, result);
    var check = actions.children[0], show = actions.children[1];
    function finish(text) {
      box.classList.add('ix-complete');
      if (result) result.textContent = text;
    }
    check.addEventListener('click', function() {
      var all_ = items(), right = 0;
      all_.forEach(function(li, i) {
        var ok = +li.getAttribute('data-pos') === i + 1;
        if (ok) right++;
        li.classList.toggle('ix-ok', ok);
        li.classList.toggle('ix-off', !ok);
      });
      show.hidden = right === all_.length;
      if (right === all_.length) finish('All ' + right + ' in the right order.');
      else if (result) result.textContent = right + ' of ' + all_.length + ' are in the right place. Drag the red ones and check again, or show the right order.';
    });
    show.addEventListener('click', function() {
      items().sort(function(a, b) { return a.getAttribute('data-pos') - b.getAttribute('data-pos'); })
        .forEach(function(li) { list.appendChild(li); li.classList.remove('ix-off'); li.classList.add('ix-ok'); });
      show.hidden = true;
      finish(box.getAttribute('data-done') || 'This is the right order.');
    });
  });

  // ── Find them all ──
  // <div class="ix-find"> <div class="ix-find-text"> ... <span class="ix-target" data-note="why">text</span> ... </div>
  //   <p class="ix-find-note"></p> <button class="mi-btn ix-find-show">Show the ones I missed</button> </div>
  all('.ix-find').forEach(function(box) {
    var targets = all('.ix-target', box), note = box.querySelector('.ix-find-note');
    var show = box.querySelector('.ix-find-show');
    if (note) note.setAttribute('aria-live', 'polite');
    function count() { return all('.ix-target.ix-found', box).length; }
    function tally() { return count() + ' of ' + targets.length + ' found.'; }
    function report(t) {
      if (!note) return;
      note.innerHTML = (t ? '<strong>' + t.textContent + ':</strong> ' + t.getAttribute('data-note') + ' ' : '') + '<span class="ix-tally">' + tally() + '</span>';
    }
    targets.forEach(function(t) {
      t.setAttribute('tabindex', '0');
      t.setAttribute('role', 'button');
      function hit() {
        t.classList.add('ix-found');
        report(t);
        if (count() === targets.length) { box.classList.add('ix-complete'); if (show) show.hidden = true; }
      }
      t.addEventListener('click', function(e) { e.stopPropagation(); hit(); });
      t.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(); } });
    });
    // A click on plain text is a miss: say so briefly.
    var text = box.querySelector('.ix-find-text');
    if (text) text.addEventListener('click', function() {
      if (note && count() < targets.length) note.innerHTML = 'That part is safe to share. <span class="ix-tally">' + tally() + '</span>';
    });
    if (show) show.addEventListener('click', function() {
      targets.forEach(function(t) { if (!t.classList.contains('ix-found')) t.classList.add('ix-found', 'ix-missed'); });
      show.hidden = true;
      box.classList.add('ix-complete');
      if (note) note.innerHTML = 'The ones you missed are outlined. Click any highlight to read why it counts.';
    });
    report(null);
  });

  // ── Prevalence slider ──
  // <div class="ix-prev" data-sens="0.9" data-spec="0.9"></div>
  // 1,000 people drawn as a waffle chart: true positives first, then missed cases, false alarms, true negatives.
  all('.ix-prev').forEach(function(box, n) {
    var sens = +(box.getAttribute('data-sens') || 0.9), spec = +(box.getAttribute('data-spec') || 0.9);
    var steps = [0.5, 1, 2, 5, 10, 20, 30, 50];
    var id = 'ix-prev-' + n;
    box.innerHTML =
      '<div class="ix-prev-top"><label for="' + id + '">How common is the disease here?</label>' +
      '<input type="range" id="' + id + '" min="0" max="' + (steps.length - 1) + '" step="1" value="5">' +
      '<span class="ix-prev-val"></span></div>' +
      '<div class="ix-prev-body">' +
      '<div><div class="ix-prev-grid" role="img"></div>' +
      '<div class="mi-legend">' +
      '<span><i style="background:#0e8177"></i>Has the disease, flagged</span>' +
      '<span><i style="background:#fff;border:2px solid #a8492c"></i>Has the disease, missed</span>' +
      '<span><i style="background:#f0b9a6"></i>Healthy, flagged (false alarm)</span>' +
      '<span><i style="background:#dfe3e8"></i>Healthy, cleared</span></div></div>' +
      '<div class="ix-prev-side">' +
      '<div class="ix-prev-big"><b></b><span>of the alerts are real (PPV)</span></div>' +
      '<p class="ix-prev-counts"></p>' +
      '<p class="ix-prev-fixed">The tool does not change: ' + Math.round(sens * 100) + '% sensitivity and ' + Math.round(spec * 100) + '% specificity at every setting.</p>' +
      '</div></div>' +
      '<p class="ix-prev-note"></p>';
    var range = box.querySelector('input'), val = box.querySelector('.ix-prev-val');
    var grid = box.querySelector('.ix-prev-grid'), big = box.querySelector('.ix-prev-big b');
    var counts = box.querySelector('.ix-prev-counts'), note = box.querySelector('.ix-prev-note');
    var cells = [];
    for (var k = 0; k < 1000; k++) cells.push(grid.appendChild(el('span', 'ix-prev-cell')));
    function render() {
      var p = steps[+range.value] / 100;
      var sick = Math.round(1000 * p), tp = Math.round(sick * sens), fn = sick - tp;
      var fp = Math.round((1000 - sick) * (1 - spec)), tn = 1000 - sick - fp;
      cells.forEach(function(c, i) {
        c.className = 'ix-prev-cell ' + (i < tp ? 'tp' : i < tp + fn ? 'fn' : i < tp + fn + fp ? 'fp' : 'tn');
      });
      var ppv = tp + fp ? Math.round(tp / (tp + fp) * 100) : 0;
      val.textContent = steps[+range.value] + '% (' + sick + ' in 1,000)';
      big.textContent = ppv + '%';
      counts.innerHTML = '<strong>' + (tp + fp) + ' alerts</strong>: ' + tp + ' real, ' + fp + ' false alarms. ' + fn + ' sick ' + (fn === 1 ? 'person' : 'people') + ' missed.';
      grid.setAttribute('aria-label', '1,000 people: ' + tp + ' flagged with disease, ' + fn + ' missed, ' + fp + ' false alarms, ' + tn + ' cleared.');
      note.textContent = p <= 0.02
        ? 'Rare disease, as in screening: most alerts are false alarms, even though the tool is just as good as before.'
        : p >= 0.2
          ? 'Common disease, as in a busy emergency department or many research test sets: most alerts are real.'
          : 'In between: move the slider and watch the pink false alarms and the teal real alerts trade places.';
    }
    range.addEventListener('input', render);
    render();
  });
})();
