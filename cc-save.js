// cc-save.js — State persistence for CC Analyzer (localStorage + download)

document.addEventListener('DOMContentLoaded', function () {
  initSpendInputs();
  populateTravelSelects();
  restoreState();
  patchBuiltinsOnLoad();
});

// Auto-patch cards with latest milestoneBonus / fee data from cc-builtin.json.
// Only updates fields that are structural data (not user-edited earn rates).
// Runs silently on every page load so stale localStorage state stays fresh.
async function patchBuiltinsOnLoad() {
  if (!cards.length) return;
  try {
    var r = await fetch('cc-builtin.json');
    if (!r.ok) return;
    var builtins = (await r.json()).cards || [];
    var patched = 0;
    cards.forEach(function(card) {
      var match = (typeof findBuiltin === 'function') ? findBuiltin(card.name, builtins) : null;
      if (!match) return;
      if (Array.isArray(match.milestoneBonus))
        card.milestoneBonus = JSON.parse(JSON.stringify(match.milestoneBonus));
      if (typeof match.annualFee === 'number') card.annualFee = match.annualFee;
      if (match.feeNote) card.feeNote = match.feeNote;
      if (Array.isArray(match.renewalBenefits))
        card.renewalBenefits = JSON.parse(JSON.stringify(match.renewalBenefits));
      patched++;
    });
    if (patched) autoSave();
  } catch(e) { /* offline / file missing — skip silently */ }
}

// ── State capture / apply ─────────────────────────────────────────────────────

function captureState() {
  var spends = {};
  cats.forEach(function(cat) {
    var el = document.getElementById('spend-' + cat);
    if (el) spends[cat] = parseFloat(el.dataset.raw || el.value.replace(/,/g,'')) || 0;
  });
  return {
    version: 3,
    cards: JSON.parse(JSON.stringify(cards)),
    cats: cats.slice(),
    pv: Object.assign({}, pv),
    spends: spends,
    pctFlights: parseFloat((document.getElementById('pct-flights')||{}).value) || 50,
    pctHotels:  parseFloat((document.getElementById('pct-hotels') ||{}).value) || 50,
    defAirline: ((document.getElementById('default-airline')||{}).value) || '',
    defHotel:   ((document.getElementById('default-hotel')   ||{}).value) || '',
    intlTravelPct: typeof intlTravelPct !== 'undefined' ? intlTravelPct : 0.5,
  };
}

function applyState(state) {
  if (!state || state.version !== 3) return;

  // Restore full card objects
  if (Array.isArray(state.cards)) {
    cards = JSON.parse(JSON.stringify(state.cards));
    var sel = document.getElementById('data-card-select');
    if (sel) {
      sel.innerHTML = '';
      cards.forEach(function(c) {
        var o = document.createElement('option');
        o.value = c.id; o.textContent = c.name;
        sel.appendChild(o);
      });
    }
    populateTravelSelects();
  }

  if (Array.isArray(state.cats) && state.cats.length) {
    cats = state.cats.slice();
    initSpendInputs();
  }
  if (state.pv) Object.assign(pv, state.pv);

  if (state.spends) {
    cats.forEach(function(cat) {
      var el = document.getElementById('spend-' + cat);
      if (el && state.spends[cat] !== undefined) {
        var v = state.spends[cat] || 0;
        el.dataset.raw = v;
        el.value = v ? v.toLocaleString('en-IN') : '0';
      }
    });
    if (typeof updateSpendTotal === 'function') updateSpendTotal();
  }
  if (state.intlTravelPct !== undefined) {
    intlTravelPct = state.intlTravelPct;
    var itEl = document.getElementById('intl-travel-pct');
    if (itEl) itEl.value = Math.round(intlTravelPct * 100);
  }
  var pf = document.getElementById('pct-flights'), ph = document.getElementById('pct-hotels');
  if (pf && state.pctFlights !== undefined) pf.value = state.pctFlights;
  if (ph && state.pctHotels  !== undefined) ph.value = state.pctHotels;
  setTimeout(function() {
    function setVal(id, val) {
      var sel = document.getElementById(id); if (!sel || !val) return;
      var opt = sel.querySelector('option[value="' + val + '"]');
      if (opt) opt.selected = true;
    }
    setVal('default-airline', state.defAirline);
    setVal('default-hotel',   state.defHotel);
  }, 50);
}

function restoreState() {
  try {
    var saved = localStorage.getItem('ccanalyzer_state');
    if (saved) applyState(JSON.parse(saved));
  } catch(e) { console.warn('restoreState:', e); }
}

// ── Auto-save to localStorage ─────────────────────────────────────────────────

function autoSave() {
  try { localStorage.setItem('ccanalyzer_state', JSON.stringify(captureState())); } catch(e) {}
}

// ── Build download HTML ───────────────────────────────────────────────────────

function buildDownloadHTML(state) {
  var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  var OT  = '<script id="_ccab">';
  var CT  = '</script>';
  var boot = '\n' + OT + '\n' +
    '(function(){\n' +
    '  try{\n' +
    '    var s=JSON.parse(decodeURIComponent(escape(atob("' + b64 + '"))));\n' +
    '    localStorage.setItem("ccanalyzer_state",JSON.stringify(s));\n' +
    '  }catch(e){}\n' +
    '})();\n' +
    CT + '\n';
  var html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  html = html.replace(new RegExp('<script id="_ccab">[\\s\\S]*?</script>\\s*', 'g'), '');
  html = html.replace('</head>', boot + '</head>');
  return html;
}

// ── Download ──────────────────────────────────────────────────────────────────

function saveLocal() {
  var state = captureState();
  try { localStorage.setItem('ccanalyzer_state', JSON.stringify(state)); } catch(e) {}
  try {
    var html = buildDownloadHTML(state);
    var blob = new Blob([html], { type: 'text/html' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'CC Analyzer.html';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus('Downloaded ✓', 'ok');
  } catch(e) {
    showStatus('Download failed', 'err');
    console.error('saveLocal:', e);
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function showStatus(msg, type) {
  var el = document.getElementById('save-status'); if (!el) return;
  el.textContent = msg;
  el.className = 'save-status' + (type ? ' ' + type : '');
  if (type === 'ok') setTimeout(function(){ el.textContent = ''; el.className = 'save-status'; }, 4000);
}
