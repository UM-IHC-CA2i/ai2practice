(function() {
  'use strict';

  // In-page interactives for Module 3. Load after m1-interactives.js (sort cards,
  // step-through, tabbed explorer and the clickable report all come from there).
  //   .m3-reveal     commit to an answer, see the AI output, answer again, then see the truth (3.3)

  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ── Commit, then reveal ──
  // <div class="m3-reveal">
  //   <div class="m3-stage">... <div class="mi-choices"><button class="mi-choice">...</button></div></div>
  //   <div class="m3-stage" hidden>... AI output ... <div class="mi-choices">...</div></div>
  //   <div class="m3-stage" hidden>... the truth ... <p class="m3-summary"></p></div>
  // </div>
  // Picking a choice locks that stage and opens the next one. The summary lists the picks.
  all('.m3-reveal').forEach(function(box) {
    var stages = all('.m3-stage', box);
    var picks = [];
    stages.forEach(function(stage, k) {
      all('.mi-choice', stage).forEach(function(b) {
        b.type = 'button';
        b.addEventListener('click', function() {
          if (stage.classList.contains('m3-done')) return;
          stage.classList.add('m3-done');
          b.classList.add('mi-picked');
          picks.push(b.textContent);
          var next = stages[k + 1];
          if (!next) return;
          next.hidden = false;
          var summary = next.querySelector('.m3-summary');
          if (summary && picks.length >= 2) {
            summary.textContent = picks[0] === picks[1]
              ? 'You answered "' + picks[0] + '" both times.'
              : 'You first answered "' + picks[0] + '", then changed to "' + picks[1] + '" after seeing the AI.';
          }
        });
      });
    });
  });
})();
