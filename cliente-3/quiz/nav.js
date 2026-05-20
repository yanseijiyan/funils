(function () {
  const m = location.pathname.match(/(\d{2})\.html?$/);
  const cur = m ? parseInt(m[1], 10) : 1;
  const total = 35;
  const nextFile = cur + 1 <= total ? String(cur + 1).padStart(2, '0') + '.html' : null;
  const prevFile = cur > 1 ? String(cur - 1).padStart(2, '0') + '.html' : null;

  const isMagicScreen = !!document.querySelector('.progressbar-widget');
  const isLast = !nextFile;

  let advancing = false;
  function goNext() {
    if (advancing || !nextFile) return;
    advancing = true;
    window.location.href = nextFile;
  }
  function goPrev() { if (prevFile) window.location.href = prevFile; }

  if (isMagicScreen && nextFile) {
    setTimeout(goNext, 3500);
  }

  // Force-show elements that the original quiz JS would have faded in via Animate.css.
  // Without that JS, anything with inline opacity:0 stays invisible — including the submit
  // button on the Profile Summary slide.
  function forceShowAnimated() {
    document.querySelectorAll('#quiz-container [style*="opacity"]').forEach(el => {
      const op = el.style.opacity;
      if (op === '0' || op === '0.0') el.style.opacity = '1';
    });
  }
  forceShowAnimated();
  // Re-run after DOM settles in case CSS animations re-apply opacity:0.
  setTimeout(forceShowAnimated, 50);

  // Profile Summary slide: animate the progress bar to the value from .point-content.
  // Scale is read from the first <ul> (e.g. 10..50). Without the original JS the bar
  // stays at width:0.
  function fillProfileProgress() {
    const wrap = document.querySelector('.profile-progress');
    if (!wrap) return;
    const progress = wrap.querySelector('.progress-wrap .progress');
    const point = wrap.querySelector('.point');
    const pointContent = wrap.querySelector('.point-content');
    if (!progress || !point || !pointContent) return;

    const labels = wrap.querySelectorAll(':scope > ul:not(.last) li');
    let min = 10, max = 50;
    if (labels.length >= 2) {
      const a = parseFloat(labels[0].textContent);
      const b = parseFloat(labels[labels.length - 1].textContent);
      if (!isNaN(a) && !isNaN(b)) { min = a; max = b; }
    }
    const numMatch = pointContent.textContent.match(/-?\d+(\.\d+)?/);
    if (!numMatch) return;
    const value = parseFloat(numMatch[0]);
    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

    // The .point sits at right:0 inside .progress, so it follows the bar's end naturally.
    // Center the label (.point-content) horizontally above the marker.
    pointContent.style.left = '50%';
    pointContent.style.transform = 'translateX(-50%)';
    pointContent.style.marginBottom = '8px';

    // Animate the bar fill.
    progress.style.transition = 'width 1s ease-out';
    requestAnimationFrame(() => { progress.style.width = pct + '%'; });
  }
  fillProfileProgress();
  setTimeout(fillProfileProgress, 100);

  // Sync .selected visual state on wrapper widgets and on <li> inside rate-widget.
  const WIDGET_SELECTOR = '.checkbox-widget, .image-radio-widget, .hidden-radio-widget, .radio-widget';
  function syncSelected() {
    document.querySelectorAll(WIDGET_SELECTOR).forEach(w => {
      const input = w.querySelector('input[type="checkbox"], input[type="radio"]');
      if (!input) return;
      w.classList.toggle('selected', input.checked);
    });
    // rate-widget: each <li> wraps one radio
    document.querySelectorAll('.rate-widget li').forEach(li => {
      const input = li.querySelector('input[type="radio"]');
      if (!input) return;
      li.classList.toggle('selected', input.checked);
    });
  }
  syncSelected();

  // Any change to a visible radio/checkbox in the quiz body → advance.
  document.addEventListener('change', function (e) {
    const input = e.target;
    if (!input || !input.matches || !input.matches('input[type="radio"], input[type="checkbox"]')) return;
    if (input.closest('.progressbar-widget')) return; // fake radios in MagicScreen
    if (input.hidden || input.type === 'hidden') return;
    if (!input.checked) return;
    if (!input.closest('#quiz-body')) return;
    syncSelected();
    setTimeout(goNext, 300);
  }, true);

  // Form submit: navigate (used by ValueProp / email / fallback)
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    e.stopImmediatePropagation && e.stopImmediatePropagation();
    if (isLast) {
      const b = document.getElementById('quiz-body');
      if (b) b.innerHTML = '<div style="text-align:center;padding:40px 20px;"><h1 style="font-size:24px;margin-bottom:16px;">ありがとうございました！</h1><p style="font-size:16px;color:#666;">パーソナルプランをメールでお送りします。</p></div>';
      const block = document.getElementById('quiz-submit-block');
      if (block) block.style.display = 'none';
      return false;
    }
    goNext();
    return false;
  }, true);

  // Back button
  document.addEventListener('click', function (e) {
    if (e.target.closest('#slide-header-back-button, .back-button, [data-action="back"]')) {
      e.preventDefault();
      goPrev();
    }
  }, true);
})();
