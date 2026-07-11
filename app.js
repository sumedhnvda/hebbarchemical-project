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


  // Swipe Gestures — attached to document so it captures the whole viewport
  const SWIPE_THRESHOLD = 40;   // min horizontal distance px
  const SWIPE_RATIO     = 1.3;  // must be more horizontal than vertical
  const INTERACTIVE     = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'LABEL']);

  let touchStartX = 0;
  let touchStartY = 0;
  let swipeLocked = false;

  document.addEventListener('touchstart', e => {
    // Don't hijack touches on interactive elements
    const tag = e.target.tagName;
    swipeLocked = INTERACTIVE.has(tag);
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (swipeLocked) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO) {
      dx > 0 ? switchTab(-1) : switchTab(1);
    }
  }, { passive: true });

  const calcPanels = {
    'solid-content': $('calc-solid-content'),
    'dilution':      $('calc-dilution'),
    'flow-rate':     $('calc-flow-rate'),
    'blending':      $('calc-blending'),
    'packing':       $('calc-packing'),
    'filling-time':  $('calc-filling-time'),
    'known-qty':     $('calc-known-qty'),
    'mass-vol':      $('calc-mass-vol'),
    'recipe-scale':  $('calc-recipe-scale'),
  };

  const navScroll = $('formula-nav');
  $('nav-arrow-left').addEventListener('click', () => {
    navScroll.scrollBy({ left: -150, behavior: 'smooth' });
  });
  $('nav-arrow-right').addEventListener('click', () => {
    navScroll.scrollBy({ left: 150, behavior: 'smooth' });
  });

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
    const inputs   = inputIds.map($);
    const groups   = groupIds.map($);
    const fvLabels = fvIds || null;   // keep as plain string array
    const btnCalc  = $(btnCalcId);

    inputs.forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const filled = inp.value.trim() !== '';
        groups[i].classList.toggle('filled', filled);
        groups[i].classList.remove('error');
        // Highlight ALL fv-label elements with matching data-fv attribute
        if (fvLabels && fvLabels[i]) {
          document.querySelectorAll(`[data-fv="${fvLabels[i]}"]`)
            .forEach(el => el.classList.toggle('active', filled));
        }
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
      if (fvLabels && fvLabels[i]) {
        document.querySelectorAll(`[data-fv="${fvLabels[i]}"]`)
          .forEach(el => el.classList.remove('active'));
      }
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
  // Helper: toggle active on all fv-labels sharing a data-fv key
  function fvToggle(key, state) {
    document.querySelectorAll(`[data-fv="${key}"]`)
      .forEach(el => el.classList.toggle('active', state));
  }

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
    fvToggle('fv-fr-qty', filled);
    frValidate();
  });

  frTimeInputs.forEach((inp) => {
    inp.addEventListener('input', () => {
      const timeOk = frGetTotalSeconds() > 0;
      frGroupTime.classList.toggle('filled', timeOk);
      frGroupTime.classList.remove('error');
      fvToggle('fv-fr-time', timeOk);
      frValidate();
    });
  });

  frSG.addEventListener('input', () => {
    const filled = frSG.value.trim() !== '';
    frGroupSG.classList.toggle('filled', filled);
    frGroupSG.classList.remove('error');
    fvToggle('fv-fr-sg', filled);
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

    // Step 1: Weight → Volume (Liters)
    const volumeL = qty / sg;

    // Step 2: Flow rate
    const flowRateMin = (volumeL * 60) / totalSec;
    const flowRateHr  = (volumeL * 3600) / totalSec;

    // Original intervals (in mL)
    const volumeML = volumeL * 1000;
    const flowRateSecML = volumeML / totalSec;
    
    const intervals = [10, 15, 20, 25, 30];
    intervals.forEach((t) => {
      $('fr-iv-' + t).textContent = (flowRateSecML * t).toFixed(2) + ' ml';
    });

    const now = new Date();
    const hh = parseInt(frHH.value) || 0;
    const mm = parseInt(frMM.value) || 0;
    const ss = parseInt(frSS.value) || 0;
    const timeStr = `${hh}h ${mm}m ${ss}s (${totalSec} sec)`;

    $('fr-result-ts').textContent  = formatTime(now);
    $('fr-bd-qty').textContent     = qty.toFixed(2) + ' ' + t('kg');
    $('fr-bd-time').textContent    = timeStr;
    $('fr-bd-sg').textContent      = sg.toFixed(3);
    $('fr-bd-vol').textContent     = volumeL.toFixed(2) + ' ' + t('L');
    $('fr-bd-rate-min').textContent = flowRateMin.toFixed(2) + ' ' + t('LPM');
    $('fr-bd-rate-hr').textContent  = flowRateHr.toFixed(2) + ' ' + t('LPH');

    const card = $('fr-result');
    card.classList.remove('hidden');
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    if (navigator.vibrate) navigator.vibrate(60);
  });

  // Reset
  $('fr-btn-reset').addEventListener('click', () => {
    frAllInputs.forEach((inp) => { inp.value = ''; });
    [frGroupQty, frGroupTime, frGroupSG].forEach((g) => g.classList.remove('filled', 'error'));
    fvToggle('fv-fr-qty', false);
    fvToggle('fv-fr-time', false);
    fvToggle('fv-fr-sg', false);
    $('fr-result').classList.add('hidden');
    frBtnCalc.disabled = true;
    frQty.focus();
    if (navigator.vibrate) navigator.vibrate(20);
  });

  // =====================
  // FORMULA 4: CHEMICAL BLENDING
  // =====================
  const bl = setupInputs(
    ['bl-input-c1', 'bl-input-c2', 'bl-input-mix'],
    ['bl-group-c1', 'bl-group-c2', 'bl-group-mix'],
    ['fv-bl-c1',    'fv-bl-c2',    'fv-bl-mix'],
    'bl-btn-calc'
  );

  bl.btnCalc.addEventListener('click', () => {
    const c1 = parseFloat(bl.inputs[0].value);
    const c2 = parseFloat(bl.inputs[1].value);
    const mix = parseFloat(bl.inputs[2].value);

    let err = false;
    if (isNaN(c1) || c1 < 0 || c1 > 100) { bl.groups[0].classList.add('error'); err = true; }
    if (isNaN(c2) || c2 < 0 || c2 > 100) { bl.groups[1].classList.add('error'); err = true; }
    if (isNaN(mix) || mix < 0 || mix > 100) { bl.groups[2].classList.add('error'); err = true; }
    if (err) { showToast('Please enter valid percentages', true); return; }

    if ((mix > c1 && mix > c2) || (mix < c1 && mix < c2)) {
      bl.groups[2].classList.add('error');
      showToast('Desired mixture must be between Chemical 1 and 2', true);
      return;
    }

    if (c1 === c2) {
       bl.groups[0].classList.add('error');
       bl.groups[1].classList.add('error');
       showToast('Chemical percentages must be different', true);
       return;
    }

    const r1 = Math.abs(c1 - mix);
    const r2 = Math.abs(c2 - mix);

    // If mixture exactly matches one chemical
    let p1Text = "0 kg";
    let p2Text = "0 kg";

    if (r1 === 0) {
      p1Text = t('Only Chemical 1 needed');
      p2Text = "0 " + t('kg');
    } else if (r2 === 0) {
      p1Text = "0 " + t('kg');
      p2Text = t('Only Chemical 2 needed');
    } else {
      const p1 = r2 / r1;
      const p2 = r1 / r2;
      p1Text = `${p1.toFixed(2)} ${t('kg of Chemical 1')}`;
      p2Text = `${p2.toFixed(2)} ${t('kg of Chemical 2')}`;
    }

    const now = new Date();
    $('bl-result-ts').textContent = formatTime(now);
    
    $('bl-res-p2').textContent = p2Text;
    $('bl-res-p1').textContent = p1Text;

    const card = $('bl-result');
    card.classList.remove('hidden');
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    if (navigator.vibrate) navigator.vibrate(60);
  });

  $('bl-btn-reset').addEventListener('click', () => {
    resetForm(bl.inputs, bl.groups, bl.fvLabels, bl.btnCalc, 'bl-result');
  });

  // =====================
  // FORMULA 5: PACKING QUANTITY
  // =====================
  const pk = setupInputs(
    ['pk-input-c1', 'pk-input-c2', 'pk-input-mix', 'pk-input-qty'],
    ['pk-group-c1', 'pk-group-c2', 'pk-group-mix', 'pk-group-qty'],
    ['fv-pk-c1',   'fv-pk-c2',   'fv-pk-mix',   'fv-pk-qty'],
    'pk-btn-calc'
  );

  pk.btnCalc.addEventListener('click', () => {
    const c1  = parseFloat(pk.inputs[0].value);
    const c2  = parseFloat(pk.inputs[1].value);
    const mix = parseFloat(pk.inputs[2].value);
    const qty = parseFloat(pk.inputs[3].value);

    let err = false;
    if (isNaN(c1) || c1 < 0 || c1 > 100)   { pk.groups[0].classList.add('error'); err = true; }
    if (isNaN(c2) || c2 < 0 || c2 > 100)   { pk.groups[1].classList.add('error'); err = true; }
    if (isNaN(mix) || mix < 0 || mix > 100) { pk.groups[2].classList.add('error'); err = true; }
    if (isNaN(qty) || qty <= 0)             { pk.groups[3].classList.add('error'); err = true; }
    if (err) { showToast(t('Please enter valid values'), true); return; }

    if ((mix > c1 && mix > c2) || (mix < c1 && mix < c2)) {
      pk.groups[2].classList.add('error');
      showToast(t('Desired mixture must be between Chemical 1 and 2'), true);
      return;
    }

    if (c1 === c2) {
      pk.groups[0].classList.add('error');
      pk.groups[1].classList.add('error');
      showToast(t('Chemical percentages must be different'), true);
      return;
    }

    const r1 = Math.abs(c1 - mix);
    const r2 = Math.abs(c2 - mix);
    const multiple = qty / (r1 + r2);
    const p1 = multiple * r2;
    const p2 = multiple * r1;

    const now = new Date();
    $('pk-result-ts').textContent = formatTime(now);
    $('pk-bd-qty').textContent   = qty.toFixed(2) + ' ' + t('kg');
    $('pk-res-p1').textContent   = `${t('For a')} ${qty} ${t('kg batch, add')} ${p1.toFixed(2)} ${t('kg of Chemical 1')}`;
    $('pk-res-p2').textContent   = `${t('For a')} ${qty} ${t('kg batch, add')} ${p2.toFixed(2)} ${t('kg of Chemical 2')}`;

    const card = $('pk-result');
    card.classList.remove('hidden');
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    if (navigator.vibrate) navigator.vibrate(60);
  });

  $('pk-btn-reset').addEventListener('click', () => {
    resetForm(pk.inputs, pk.groups, pk.fvLabels, pk.btnCalc, 'pk-result');
  });

  
  // =====================
  // FORMULA 6: FILLING TIME
  // =====================
  const ft = setupInputs(
    ['ft-input-st', 'ft-input-sq', 'ft-input-wt'],
    ['ft-group-st', 'ft-group-sq', 'ft-group-wt'],
    ['fv-ft-st',   'fv-ft-sq',   'fv-ft-wt'],
    'ft-btn-calc'
  );

  function secsToHM(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.round((totalSec % 3600) / 60);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}`;
  }

  function secsToFriendly(s) {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    if (h === 0 && m === 0) return t('Less than a minute to complete filling.');
    const parts = [];
    if (h) parts.push(`${h} ${t(h !== 1 ? 'hours' : 'hour')}`);
    if (m) parts.push(`${m} ${t(m !== 1 ? 'minutes' : 'minute')}`);
    return `${t('It will take approximately')} ${parts.join(' ' + t('and') + ' ')} ${t('to complete filling.')}`;
  }

  ft.btnCalc.addEventListener('click', () => {
    const st = parseFloat(ft.inputs[0].value);   // minutes
    const sq = parseFloat(ft.inputs[1].value);   // kg
    const wt = parseFloat(ft.inputs[2].value);   // kg

    let err = false;
    if (isNaN(st) || st <= 0) { ft.groups[0].classList.add('error'); err = true; }
    if (isNaN(sq) || sq <= 0) { ft.groups[1].classList.add('error'); err = true; }
    if (isNaN(wt) || wt <= 0) { ft.groups[2].classList.add('error'); err = true; }
    if (err) { showToast('Please enter valid values', true); return; }

    const totalSec = (wt * st * 60) / sq;   // st in minutes → ×60 for seconds
    const totalMin = totalSec / 60;
    const now = new Date();

    $('ft-result-ts').textContent       = formatTime(now);
    $('ft-result-hms').textContent      = secsToHM(totalSec);
    $('ft-result-friendly').textContent = secsToFriendly(totalSec);
    $('ft-bd-st').textContent           = st.toFixed(2) + ' min';
    $('ft-bd-sq').textContent           = sq.toFixed(2) + ' kg';
    $('ft-bd-wt').textContent           = wt.toFixed(2) + ' kg';
    $('ft-bd-sec').textContent          = totalMin.toFixed(1) + ' minutes';

    const card = $('ft-result');
    card.classList.remove('hidden');
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    if (navigator.vibrate) navigator.vibrate(60);
  });

  // =====================
  // FORMULA 7: KNOWN QUANTITY
  // =====================
  const kq = setupInputs(
    ['kq-input-c1', 'kq-input-c2', 'kq-input-mix', 'kq-input-qty'],
    ['kq-group-c1', 'kq-group-c2', 'kq-group-mix', 'kq-group-qty'],
    ['fv-kq-c1', 'fv-kq-c2', 'fv-kq-mix', 'fv-kq-qty'],
    'kq-btn-calc'
  );

  const kqCheckInputs = () => {
    const allFilled = kq.inputs.every(input => input.value.trim() !== '');
    const isSelected = $('kq-type-c1').checked || $('kq-type-c2').checked;
    kq.btnCalc.disabled = !(allFilled && isSelected);
  };

  kq.inputs.forEach(input => input.addEventListener('input', kqCheckInputs));
  $('kq-type-c1').addEventListener('change', kqCheckInputs);
  $('kq-type-c2').addEventListener('change', kqCheckInputs);


  kq.btnCalc.addEventListener('click', () => {
    const c1  = parseFloat(kq.inputs[0].value);
    const c2  = parseFloat(kq.inputs[1].value);
    const mix = parseFloat(kq.inputs[2].value);
    const qty = parseFloat(kq.inputs[3].value);
    const isC1 = $('kq-type-c1').checked;
    const isC2 = $('kq-type-c2').checked;

    let err = false;
    if (isNaN(c1) || c1 < 0 || c1 > 100)   { kq.groups[0].classList.add('error'); err = true; }
    if (isNaN(c2) || c2 < 0 || c2 > 100)   { kq.groups[1].classList.add('error'); err = true; }
    if (isNaN(mix) || mix < 0 || mix > 100) { kq.groups[2].classList.add('error'); err = true; }
    if (isNaN(qty) || qty <= 0)             { kq.groups[3].classList.add('error'); err = true; }
    
    if (!isC1 && !isC2) {
      showToast(t('Please select Chemical 1 or Chemical 2'), true);
      return;
    }
    if (err) { showToast(t('Please enter valid values'), true); return; }

    if ((mix > c1 && mix > c2) || (mix < c1 && mix < c2)) {
      kq.groups[2].classList.add('error');
      showToast(t('Desired mixture must be between Chemical 1 and 2'), true);
      return;
    }
    if (c1 === c2) {
      kq.groups[0].classList.add('error');
      kq.groups[1].classList.add('error');
      showToast(t('Chemical percentages must be different'), true);
      return;
    }

    const r1 = Math.abs(c2 - mix);
    const r2 = Math.abs(c1 - mix);

    let resultText = "";
    if (isC1) {
      const requiredC2 = qty * (r2 / r1);
      resultText = `${t('Add')} ${requiredC2.toFixed(2)} ${t('kg of Chemical 2')}`;
    } else {
      const requiredC1 = qty * (r1 / r2);
      resultText = `${t('Add')} ${requiredC1.toFixed(2)} ${t('kg of Chemical 1')}`;
    }

    const now = new Date();
    $('kq-result-ts').textContent = formatTime(now);
    $('kq-bd-c1').textContent = c1.toFixed(2) + ' %';
    $('kq-bd-c2').textContent = c2.toFixed(2) + ' %';
    $('kq-bd-mix').textContent = mix.toFixed(2) + ' %';
    $('kq-bd-qty').textContent = qty.toFixed(2) + ' ' + t('kg') + ' (' + t(isC1 ? 'Chem 1' : 'Chem 2') + ')';
    $('kq-res-text').textContent = resultText;

    const card = $('kq-result');
    card.classList.remove('hidden');
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    if (navigator.vibrate) navigator.vibrate(60);
  });

  $('kq-btn-reset').addEventListener('click', () => {
    resetForm(kq.inputs, kq.groups, kq.fvLabels, kq.btnCalc, 'kq-result');
    $('kq-type-c1').checked = false;
    $('kq-type-c2').checked = false;
  });

  $('ft-btn-reset').addEventListener('click', () => {
    resetForm(ft.inputs, ft.groups, ft.fvLabels, ft.btnCalc, 'ft-result');
    $('ft-result-hms').textContent = '00:00';
    $('ft-result-friendly').textContent = '';
  });

  // =====================
  // FORMULA 8: MASS-VOLUME CONVERSION
  // =====================
  const mv = setupInputs(
    ['mv-input-den', 'mv-input-val'],
    ['mv-group-den', 'mv-group-val'],
    ['fv-mv-den', 'fv-mv-val'],
    'mv-btn-calc'
  );

  const mvCheckInputs = () => {
    const allFilled = mv.inputs.every(input => input.value.trim() !== '');
    const isSelected = $('mv-type-mass').checked || $('mv-type-vol').checked;
    mv.btnCalc.disabled = !(allFilled && isSelected);
  };
  mv.inputs.forEach(input => input.addEventListener('input', mvCheckInputs));
  $('mv-type-mass').addEventListener('change', () => {
    $('mv-unit-val').textContent = 'kg';
    mvCheckInputs();
  });
  $('mv-type-vol').addEventListener('change', () => {
    $('mv-unit-val').textContent = 'L';
    mvCheckInputs();
  });

  mv.btnCalc.addEventListener('click', () => {
    const den = parseFloat(mv.inputs[0].value);
    const val = parseFloat(mv.inputs[1].value);
    const isMass = $('mv-type-mass').checked;

    let err = false;
    if (isNaN(den) || den <= 0) { mv.groups[0].classList.add('error'); err = true; }
    if (isNaN(val) || val < 0)  { mv.groups[1].classList.add('error'); err = true; }
    
    if (!isMass && !$('mv-type-vol').checked) {
      showToast(t('Please select Mass or Volume'), true);
      return;
    }
    
    if (err) { showToast(t('Please enter valid values'), true); return; }

    let resultText = "";
    if (isMass) {
      // Volume = Mass / Density
      const vol = val / den;
      resultText = `Volume = ${vol.toFixed(2)} L`;
    } else {
      // Mass = Volume * Density
      const mass = val * den;
      resultText = `Mass = ${mass.toFixed(2)} kg`;
    }

    const now = new Date();
    $('mv-result-ts').textContent = formatTime(now);
    $('mv-bd-den').textContent = den.toFixed(2) + ' kg/L';
    $('mv-bd-val').textContent = val.toFixed(2) + (isMass ? ' kg (Mass)' : ' L (Volume)');
    $('mv-res-text').textContent = resultText;

    const card = $('mv-result');
    card.classList.remove('hidden');
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    if (navigator.vibrate) navigator.vibrate(60);
  });

  $('mv-btn-reset').addEventListener('click', () => {
    resetForm(mv.inputs, mv.groups, mv.fvLabels, mv.btnCalc, 'mv-result');
    $('mv-type-mass').checked = false;
    $('mv-type-vol').checked = false;
    $('mv-unit-val').textContent = '--';
  });

  // =====================
  // FORMULA 9: RECIPE SCALING
  // =====================
  const rsInputCount  = $('rs-input-count');
  const rsBtnGenerate = $('rs-btn-generate');
  const rsTableWrap   = $('rs-table-wrap');
  const rsRows        = $('rs-rows');
  const rsBtnCalc     = $('rs-btn-calc');
  const rsResult      = $('rs-result');
  const rsResultRows  = $('rs-result-rows');
  const rsResultInfo  = $('rs-result-info');
  let rsIngredientCount = 0;

  rsInputCount.addEventListener('input', () => {
    const n = parseInt(rsInputCount.value);
    rsBtnGenerate.disabled = !(n >= 2 && n <= 30);
  });

  rsBtnGenerate.addEventListener('click', () => {
    const n = parseInt(rsInputCount.value);
    if (isNaN(n) || n < 2 || n > 30) return;
    rsIngredientCount = n;
    rsRows.innerHTML = '';
    rsResult.classList.add('hidden');
    rsBtnCalc.disabled = true;
    for (let i = 1; i <= n; i++) {
      const row = document.createElement('div');
      row.className = 'rs-row';
      row.id = 'rs-row-' + i;
      row.innerHTML =
        '<span class="rs-num">' + i + '</span>' +
        '<input type="number" id="rs-std-' + i + '" inputmode="decimal" placeholder="Std" step="0.01" min="0">' +
        '<div class="rs-chk-wrap"><input type="checkbox" id="rs-chk-' + i + '"></div>' +
        '<input type="number" id="rs-avl-' + i + '" inputmode="decimal" placeholder="Avl" step="0.01" min="0" disabled>';
      rsRows.appendChild(row);
      const stdInp = $('rs-std-' + i);
      const avlInp = $('rs-avl-' + i);
      const chk    = $('rs-chk-' + i);
      chk.addEventListener('change', () => {
        avlInp.disabled = !chk.checked;
        if (!chk.checked) { avlInp.value = ''; }
        rsCheckAllFilled();
      });
      stdInp.addEventListener('input', rsCheckAllFilled);
      avlInp.addEventListener('input', rsCheckAllFilled);
    }
    rsTableWrap.classList.remove('hidden');
    setTimeout(() => rsTableWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  });

  function rsCheckAllFilled() {
    let ok = true;
    for (let i = 1; i <= rsIngredientCount; i++) {
      const s = $('rs-std-' + i);
      const c = $('rs-chk-' + i);
      const a = $('rs-avl-' + i);
      if (!s || s.value.trim() === '') { ok = false; break; }
      if (c && c.checked && (!a || a.value.trim() === '')) { ok = false; break; }
    }
    rsBtnCalc.disabled = !ok;
  }

  rsBtnCalc.addEventListener('click', () => {
    const ings = [];
    let hasError = false;
    for (let i = 1; i <= rsIngredientCount; i++) {
      const std = parseFloat($('rs-std-' + i).value);
      const chk = $('rs-chk-' + i);
      const isConstrained = chk && chk.checked;
      const avlRaw = isConstrained ? parseFloat($('rs-avl-' + i).value) : Infinity;
      $('rs-row-' + i).classList.remove('limiting');
      if (isNaN(std) || std <= 0) { hasError = true; }
      else if (isConstrained && (isNaN(avlRaw) || avlRaw < 0)) { hasError = true; }
      else { ings.push({ serial: i, std, ratio: isConstrained ? (avlRaw / std) : Infinity }); }
    }
    if (hasError) { showToast(t('Please enter valid values'), true); return; }
    const constrained = ings.filter(g => isFinite(g.ratio));
    if (constrained.length === 0) { showToast('Please constrain at least one ingredient', true); return; }
    const rMin = Math.min(...constrained.map(g => g.ratio));
    const limitIdx = ings.findIndex(g => g.ratio === rMin);
    $('rs-row-' + ings[limitIdx].serial).classList.add('limiting');
    rsResultRows.innerHTML = '';
    ings.forEach((ing, idx) => {
      const revised = ing.std * rMin;
      const isLim = idx === limitIdx;
      const row = document.createElement('div');
      row.className = 'rs-result-row' + (isLim ? ' limiting-result' : '');
      row.innerHTML =
        '<span>' + ing.serial + '</span>' +
        '<span>' + ing.std.toFixed(2) + '</span>' +
        '<span class="rs-revised">' + revised.toFixed(2) + '</span>';
      rsResultRows.appendChild(row);
    });
    rsResultInfo.textContent = 'Scale: ' + (rMin * 100).toFixed(1) + '% — Limiting ingredient: #' + ings[limitIdx].serial;
    $('rs-result-ts').textContent = formatTime(new Date());
    rsResult.classList.remove('hidden');
    setTimeout(() => rsResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    if (navigator.vibrate) navigator.vibrate(60);
  });

  $('rs-btn-reset').addEventListener('click', () => {
    rsInputCount.value = '';
    rsRows.innerHTML = '';
    rsTableWrap.classList.add('hidden');
    rsResult.classList.add('hidden');
    rsBtnGenerate.disabled = true;
    rsBtnCalc.disabled = true;
    rsIngredientCount = 0;
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => { console.log('SW registered!', reg); reg.update(); })
        .catch(err => console.log('SW registration failed: ', err));
    });
  }

})();
