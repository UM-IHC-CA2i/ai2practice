var AssessmentEngine = (function() {
  'use strict';

  var state = {
    answers: {},
    answered: 0,
    total: 0,
    submitted: false,
    config: null
  };

  function init(config) {
    state.config = config;
    state.total = document.querySelectorAll('.quiz-question').length;
    bindOptions();
    bindSubmit();
    bindRetry();
  }

  function bindOptions() {
    document.querySelectorAll('.quiz-question').forEach(function(q, qi) {
      q.querySelectorAll('.quiz-option').forEach(function(opt) {
        opt.addEventListener('click', function() {
          if (state.submitted) return;
          q.querySelectorAll('.quiz-option').forEach(function(o) { o.classList.remove('selected'); });
          opt.classList.add('selected');
          var wasAnswered = state.answers.hasOwnProperty(qi);
          state.answers[qi] = parseInt(opt.getAttribute('data-idx'));
          if (!wasAnswered) {
            state.answered++;
            updateProgress();
          }
        });
      });
    });
  }

  function updateProgress() {
    var pct = Math.round((state.answered / state.total) * 100);
    var bar = document.getElementById('quiz-progress');
    if (bar) bar.style.width = pct + '%';
    var btn = document.getElementById('submit-quiz-btn');
    if (btn && state.answered === state.total) {
      btn.disabled = false;
      var hint = document.getElementById('submit-hint');
      if (hint) hint.textContent = 'Ready to submit.';
    }
  }

  function bindSubmit() {
    var btn = document.getElementById('submit-quiz-btn');
    if (!btn) return;

    btn.addEventListener('click', function() {
      if (state.submitted) return;
      state.submitted = true;

      var correct = 0;
      document.querySelectorAll('.quiz-question').forEach(function(q, qi) {
        var correctIdx = parseInt(q.getAttribute('data-correct'));
        var chosen = state.answers[qi];
        q.querySelectorAll('.quiz-option').forEach(function(opt) {
          var idx = parseInt(opt.getAttribute('data-idx'));
          opt.disabled = true;
          opt.style.cursor = 'default';
          if (idx === correctIdx) opt.classList.add('correct-answer');
          if (idx === chosen) {
            opt.classList.remove('selected');
            opt.classList.add(chosen === correctIdx ? 'correct' : 'incorrect');
          }
        });
        var expl = q.querySelector('.quiz-explanation');
        if (expl) expl.classList.add('shown');
        if (chosen === correctIdx) correct++;
      });

      var pct = Math.round((correct / state.total) * 100);
      var results = document.getElementById('quiz-results');
      if (!results) return;

      results.style.display = 'block';
      document.getElementById('quiz-score').textContent = pct + '%';
      document.getElementById('quiz-correct-count').textContent = correct;
      document.getElementById('quiz-total-count').textContent = state.total;

      btn.style.display = 'none';
      var hint = document.getElementById('submit-hint');
      if (hint) hint.style.display = 'none';

      if (pct >= 80) {
        document.getElementById('quiz-status').textContent = 'Passed';
        document.getElementById('quiz-status').className = 'quiz-status passed';
        document.getElementById('cert-section').style.display = 'block';
        document.getElementById('retry-section').style.display = 'none';
      } else {
        document.getElementById('quiz-status').textContent = 'Not Yet';
        document.getElementById('quiz-status').className = 'quiz-status failed';
        document.getElementById('cert-section').style.display = 'none';
        document.getElementById('retry-section').style.display = 'block';
      }

      results.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function bindRetry() {
    var btn = document.getElementById('retry-btn');
    if (!btn) return;

    btn.addEventListener('click', function() {
      state.submitted = false;
      state.answered = 0;
      state.answers = {};

      document.querySelectorAll('.quiz-question').forEach(function(q) {
        q.querySelectorAll('.quiz-option').forEach(function(opt) {
          opt.classList.remove('selected', 'correct', 'incorrect', 'correct-answer');
          opt.disabled = false;
          opt.style.cursor = 'pointer';
        });
        var expl = q.querySelector('.quiz-explanation');
        if (expl) expl.classList.remove('shown');
      });

      document.getElementById('quiz-results').style.display = 'none';
      var bar = document.getElementById('quiz-progress');
      if (bar) bar.style.width = '0%';
      var submitBtn = document.getElementById('submit-quiz-btn');
      if (submitBtn) { submitBtn.style.display = ''; submitBtn.disabled = true; }
      var hint = document.getElementById('submit-hint');
      if (hint) { hint.style.display = ''; hint.textContent = 'Answer all ' + state.total + ' questions to submit.'; }

      window.scrollTo({ top: document.getElementById('assessment-section').offsetTop - 80, behavior: 'smooth' });
    });
  }

  function generateCertificate() {
    var nameInput = document.getElementById('cert-name');
    var name = nameInput ? nameInput.value.trim() : '';
    if (!name) { alert('Please enter your name.'); return; }

    var score = document.getElementById('quiz-score').textContent;
    var correctCount = document.getElementById('quiz-correct-count').textContent;
    var totalCount = document.getElementById('quiz-total-count').textContent;
    var today = new Date();
    var dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    var trackLabel = state.config.trackLabel || 'General';

    if (typeof window.jspdf === 'undefined') {
      alert('PDF library not loaded. Please check your internet connection.');
      return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    var w = doc.internal.pageSize.getWidth();
    var h = doc.internal.pageSize.getHeight();

    doc.setDrawColor(0, 59, 111);
    doc.setLineWidth(1.5);
    doc.rect(12, 12, w - 24, h - 24);
    doc.setLineWidth(0.5);
    doc.rect(15, 15, w - 30, h - 30);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('AI-Ready', w / 2, 35, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(0, 59, 111);
    doc.text('Certificate of Completion', w / 2, 52, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 59, 111);
    doc.line(w / 2 - 50, 57, w / 2 + 50, 57);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(80, 80, 80);
    doc.text('This certifies that', w / 2, 72, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(28, 30, 33);
    doc.text(name, w / 2, 85, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text('has successfully completed the', w / 2, 98, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(28, 30, 33);
    doc.text('AI-Ready: Foundations of AI-Safe Training', w / 2, 110, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(trackLabel + ' Track', w / 2, 120, { align: 'center' });

    doc.setFontSize(11);
    doc.text('Score: ' + score + ' (' + correctCount + ' / ' + totalCount + ' correct)', w / 2, 135, { align: 'center' });
    doc.text('Date: ' + dateStr, w / 2, 143, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text('Based on Ke et al., "AI-induced never-skilling in medical education," Nature Medicine 2026', w / 2, 160, { align: 'center' });
    doc.text('This is an educational completion certificate, not a CME/ACCME accredited credential.', w / 2, 167, { align: 'center' });

    doc.save('AI-Ready-Certificate-' + trackLabel.replace(/\s+/g, '-') + '-' + name.replace(/\s+/g, '-') + '.pdf');
  }

  window.generateCertificate = generateCertificate;

  return { init: init };
})();
