// ===== Hebbar Chemicals – Quality Calculator =====
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const $q = (s) => document.querySelector(s);
  const $qa = (s) => document.querySelectorAll(s);

  // --- Splash ---
  const splash = $('splash-screen');
  const app = $q('#app');
  setTimeout(() => {
    splash.classList.add('hidden');
    app.classList.remove('hidden');
  }, 2200);

  // --- Toast ---
  const toast = $('toast');
  const toastText = $('toast-text');
  let toastTimer;
  function showToast(msg, isWarn) {
    clearTimeout(toastTimer);
    toastText.textContent = msg;
    toast.classList.toggle('warn', !!isWarn);
    toast.classList.remove('hidden');
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
  }

  // --- Time formatter ---
  function formatTime(d) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dd = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    const h = d.getHours();
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${dd} ${mon}, ${h % 12 || 12}:${mm} ${ap}`;
  }



  // =====================
  // TAB SWITCHING
  // =====================
  const tabs = $qa('.formula-tab:not(.disabled)');
  const formulaNav = $('formula-nav');
  const arrowLeft = $('nav-arrow-left');
  const arrowRight = $('nav-arrow-right');

  function switchTab(direction) {
    const tabsArray = Array.from(tabs);
    const currentIndex = tabsArray.findIndex(tab => tab.classList.contains('active'));
    let newIndex = currentIndex + direction;
    
    // Cyclic behavior
    if (newIndex < 0) newIndex = tabsArray.length - 1;
    if (newIndex >= tabsArray.length) newIndex = 0;
    
    if (newIndex !== currentIndex) {
      tabsArray[newIndex].click();
    }
  }

  if (arrowLeft && arrowRight) {
    arrowLeft.addEventListener('click', () => switchTab(-1));
    arrowRight.addEventListener('click', () => switchTab(1));
  }

  const calcPanels = {
    'solid-content': $('calc-solid-content'),
    'dilution':      $('calc-dilution'),
    'flow-rate':     $('calc-flow-rate'),
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.formula;
      if (!target || !calcPanels[target]) return;

      // Update tabs
      $qa('.formula-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      // Show/hide panels
      Object.entries(calcPanels).forEach(([key, panel]) => {
        panel.classList.toggle('hidden', key !== target);
      });
    });
  });

  // =====================
  // GENERIC HELPERS
  // =====================
  function setupInputs(inputIds, groupIds, fvIds, btnCalcId) {
    const inputs = inputIds.map($);
    const groups = groupIds.map($);
    const fvLabels = fvIds ? fvIds.map($) : null;
    const btnCalc = $(btnCalcId);

    inputs.forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const filled = inp.value.trim() !== '';
        groups[i].classList.toggle('filled', filled);
        groups[i].classList.remove('error');
        if (fvLabels) fvLabels[i].classList.toggle('active', filled);
        // Validate
        const allOk = inputs.every((el) => el.value.trim() !== '' && Number(el.value) >= 0);
        btnCalc.disabled = !allOk;
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (i < inputs.length - 1) { inputs[i + 1].focus(); }
        else { inp.blur(); if (!btnCalc.disabled) btnCalc.click(); }
      });
    });

    return { inputs, groups, fvLabels, btnCalc };
  }

  function resetForm(inputs, groups, fvLabels, btnCalc, resultId) {
    inputs.forEach((inp, i) => {
      inp.value = '';
      groups[i].classList.remove('filled', 'error');
      if (fvLabels) fvLabels[i].classList.remove('active');
    });
    $(resultId).classList.add('hidden');
    btnCalc.disabled = true;
    inputs[0].focus();
    if (navigator.vibrate) navigator.vibrate(20);
  }

  // =====================
  // FORMULA 1: SOLID CONTENT
  // =====================
  const sc = setupInputs(
    ['sc-input-tray', 'sc-input-sample', 'sc-input-gross'],
    ['sc-group-tray', 'sc-group-sample', 'sc-group-gross'],
    ['fv-sc-tray', 'fv-sc-sample', 'fv-sc-gross'],
    'sc-btn-calc'
  );

  sc.btnCalc.addEventListener('click', () => {
    const tray   = parseFloat(sc.inputs[0].value);
    const sample = parseFloat(sc.inputs[1].value);
    const gross  = parseFloat(sc.inputs[2].value);

    let err = false;
    if (isNaN(tray) || tray < 0)      { sc.groups[0].classList.add('error'); err = true; }
    if (isNaN(sample) || sample <= 0)  { sc.groups[1].classList.add('error'); err = true; }
    if (isNaN(gross) || gross < 0)     { sc.groups[2].classList.add('error'); err = true; }
    if (err) { showToast('Please enter valid values', true); return; }

    if (gross < tray) {
      sc.groups[2].classList.add('error');
      showToast('Gross weight must be ≥ Tray weight', true);
      return;
    }

    const residue = gross - tray;
    const solidContent = (residue / sample) * 100;
    const now = new Date();

    $('sc-result-val').textContent  = solidContent.toFixed(2);
    $('sc-result-ts').textContent   = formatTime(now);
    $('sc-bd-tray').textContent     = tray.toFixed(4) + ' grams';
    $('sc-bd-sample').textContent   = sample.toFixed(4) + ' grams';
    $('sc-bd-gross').textContent    = gross.toFixed(4) + ' grams';
    $('sc-bd-residue').textContent  = residue.toFixed(4) + ' grams';

    const card = $('sc-result');
    card.classList.remove('hidden');
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    if (navigator.vibrate) navigator.vibrate(60);
  });

  $('sc-btn-reset').addEventListener('click', () => {
    resetForm(sc.inputs, sc.groups, sc.fvLabels, sc.btnCalc, 'sc-result');
  });

  // =====================
  // FORMULA 2: DILUTION
  // =====================
  const dil = setupInputs(
    ['dil-input-psp', 'dil-input-ptw', 'dil-input-esp'],
    ['dil-group-psp', 'dil-group-ptw', 'dil-group-esp'],
    ['fv-dil-psp', 'fv-dil-ptw', 'fv-dil-esp'],
    'dil-btn-calc'
  );

  let dilWaterKg = 0; // store for unit toggle

  dil.btnCalc.addEventListener('click', () => {
    const psp = parseFloat(dil.inputs[0].value);
    const ptw = parseFloat(dil.inputs[1].value);
    const esp = parseFloat(dil.inputs[2].value);

    let err = false;
    if (isNaN(psp) || psp <= 0 || psp > 100) { dil.groups[0].classList.add('error'); err = true; }
    if (isNaN(ptw) || ptw <= 0)               { dil.groups[1].classList.add('error'); err = true; }
    if (isNaN(esp) || esp <= 0 || esp > 100)  { dil.groups[2].classList.add('error'); err = true; }
    if (err) { showToast('Please enter valid values', true); return; }

    if (esp >= psp) {
      dil.groups[2].classList.add('error');
      showToast('Expected % must be less than Present %', true);
      return;
    }

    // Step 1: New Total Weight
    const ntw = (psp * ptw) / esp;
    // Step 2: Water to Add
    const water = ntw - ptw;
    dilWaterKg = water;
    const now = new Date();

    // Display
    $('dil-result-val').textContent = water.toFixed(2);
    $('dil-result-ts').textContent  = formatTime(now);
    $('dil-bd-psp').textContent     = psp.toFixed(2) + ' %';
    $('dil-bd-ptw').textContent     = ptw.toFixed(2) + ' kg';
    $('dil-bd-esp').textContent     = esp.toFixed(2) + ' %';
    $('dil-bd-ntw').textContent     = ntw.toFixed(2) + ' kg';
    $('dil-bd-water').textContent   = water.toFixed(2) + ' kg';


    const card = $('dil-result');
    card.classList.remove('hidden');
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    if (navigator.vibrate) navigator.vibrate(60);
  });


  $('dil-btn-reset').addEventListener('click', () => {
    resetForm(dil.inputs, dil.groups, dil.fvLabels, dil.btnCalc, 'dil-result');
    dilWaterKg = 0;
  });

  // =====================
  // FORMULA 3: FLOW RATE
  // =====================
  const frQty = $('fr-input-qty');
  const frHH  = $('fr-input-hh');
  const frMM  = $('fr-input-mm');
  const frSS  = $('fr-input-ss');
  const frSG  = $('fr-input-sg');
  const frBtnCalc = $('fr-btn-calc');
  const frGroupQty  = $('fr-group-qty');
  const frGroupTime = $('fr-group-time');
  const frGroupSG   = $('fr-group-sg');
  const frFvQty  = $('fv-fr-qty');
  const frFvTime = $('fv-fr-time');
  const frFvSG   = $('fv-fr-sg');

  const frTimeInputs = [frHH, frMM, frSS];
  const frAllInputs  = [frQty, frHH, frMM, frSS, frSG];

  function frGetTotalSeconds() {
    const hh = parseInt(frHH.value) || 0;
    const mm = parseInt(frMM.value) || 0;
    const ss = parseInt(frSS.value) || 0;
    return hh * 3600 + mm * 60 + ss;
  }

  function frValidate() {
    const qtyOk = frQty.value.trim() !== '' && Number(frQty.value) > 0;
    const timeOk = frGetTotalSeconds() > 0;
    const sgOk = frSG.value.trim() !== '' && Number(frSG.value) > 0;
    frBtnCalc.disabled = !(qtyOk && timeOk && sgOk);
  }

  // Input listeners
  frQty.addEventListener('input', () => {
    const filled = frQty.value.trim() !== '';
    frGroupQty.classList.toggle('filled', filled);
    frGroupQty.classList.remove('error');
    frFvQty.classList.toggle('active', filled);
    frValidate();
  });

  frTimeInputs.forEach((inp) => {
    inp.addEventListener('input', () => {
      const timeOk = frGetTotalSeconds() > 0;
      frGroupTime.classList.toggle('filled', timeOk);
      frGroupTime.classList.remove('error');
      frFvTime.classList.toggle('active', timeOk);
      frValidate();
    });
  });

  frSG.addEventListener('input', () => {
    const filled = frSG.value.trim() !== '';
    frGroupSG.classList.toggle('filled', filled);
    frGroupSG.classList.remove('error');
    frFvSG.classList.toggle('active', filled);
    frValidate();
  });

  // Enter key navigation
  frQty.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); frHH.focus(); } });
  frHH.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); frMM.focus(); } });
  frMM.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); frSS.focus(); } });
  frSS.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); frSG.focus(); } });
  frSG.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); frSG.blur(); if (!frBtnCalc.disabled) frBtnCalc.click(); }
  });

  // Calculate
  frBtnCalc.addEventListener('click', () => {
    const qty = parseFloat(frQty.value);
    const sg  = parseFloat(frSG.value);
    const totalSec = frGetTotalSeconds();

    let err = false;
    if (isNaN(qty) || qty <= 0) { frGroupQty.classList.add('error'); err = true; }
    if (totalSec <= 0)          { frGroupTime.classList.add('error'); err = true; }
    if (isNaN(sg) || sg <= 0)   { frGroupSG.classList.add('error'); err = true; }
    if (err) { showToast('Please enter valid values', true); return; }

    // Step 1: Weight → Volume
    const volumeL  = qty / sg;
    const volumeML = volumeL * 1000;

    // Step 2: Flow rate
    const flowRate = volumeML / totalSec;

    // Step 3: Intervals
    const intervals = [10, 15, 20, 25, 30];
    intervals.forEach((t) => {
      $('fr-iv-' + t).textContent = (flowRate * t).toFixed(2) + ' ml';
    });

    const now = new Date();
    const hh = parseInt(frHH.value) || 0;
    const mm = parseInt(frMM.value) || 0;
    const ss = parseInt(frSS.value) || 0;
    const timeStr = `${hh}h ${mm}m ${ss}s (${totalSec} sec)`;

    $('fr-result-ts').textContent  = formatTime(now);
    $('fr-bd-qty').textContent     = qty.toFixed(2) + ' kg';
    $('fr-bd-time').textContent    = timeStr;
    $('fr-bd-sg').textContent      = sg.toFixed(3);
    $('fr-bd-vol').textContent     = volumeML.toFixed(2) + ' ml';
    $('fr-bd-rate').textContent    = flowRate.toFixed(2) + ' ml/s';

    const card = $('fr-result');
    card.classList.remove('hidden');
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    if (navigator.vibrate) navigator.vibrate(60);
  });

  // Reset
  $('fr-btn-reset').addEventListener('click', () => {
    frAllInputs.forEach((inp) => { inp.value = ''; });
    [frGroupQty, frGroupTime, frGroupSG].forEach((g) => g.classList.remove('filled', 'error'));
    [frFvQty, frFvTime, frFvSG].forEach((fv) => fv.classList.remove('active'));
    $('fr-result').classList.add('hidden');
    frBtnCalc.disabled = true;
    frQty.focus();
    if (navigator.vibrate) navigator.vibrate(20);
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('SW registered!', reg);
          reg.update();
        })
        .catch(err => console.log('SW registration failed: ', err));
    });
  }

})();
