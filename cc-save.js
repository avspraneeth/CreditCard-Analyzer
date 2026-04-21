// cc-save.js — Save, Restore & Google Drive logic for CC Analyzer

document.addEventListener('DOMContentLoaded', function () {
  initSpendInputs();
  populateTravelSelects();
  restoreState();
});

// ── State capture / apply ─────────────────────────────────────────────────────

function captureState() {
  var spends = {};
  cats.forEach(function(cat) {
    var el = document.getElementById('spend-' + cat);
    if (el) spends[cat] = parseFloat(el.dataset.raw || el.value.replace(/,/g,'')) || 0;
  });
  return {
    version: 2,
    cats: cats.slice(),
    pv: Object.assign({}, pv),
    exclusions: (function() {
      var o = {};
      cards.forEach(function(c) { o[c.id] = c.exclusions.slice(); });
      return o;
    })(),
    spends: spends,
    pctFlights: parseFloat((document.getElementById('pct-flights')||{}).value) || 50,
    pctHotels:  parseFloat((document.getElementById('pct-hotels') ||{}).value) || 50,
    defAirline: ((document.getElementById('default-airline')||{}).value) || '',
    defHotel:   ((document.getElementById('default-hotel')   ||{}).value) || '',
    intlTravelPct: typeof intlTravelPct !== 'undefined' ? intlTravelPct : 0.5,
  };
}

function applyState(state) {
  if (!state || state.version !== 2) return;
  if (Array.isArray(state.cats) && state.cats.length) {
    cats = state.cats.slice();
    initSpendInputs();
  }
  if (state.pv) Object.assign(pv, state.pv);
  if (state.exclusions) {
    cards.forEach(function(card) {
      if (state.exclusions[card.id]) card.exclusions = state.exclusions[card.id].slice();
    });
  }
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

// ── Build download HTML ───────────────────────────────────────────────────────

function buildDownloadHTML(state) {
  var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  var OT  = '\u003cscript id="_ccab"\u003e';
  var CT  = '\u003c/script\u003e';
  var boot = '\n' + OT + '\n' +
    '(function(){\n' +
    '  try{\n' +
    '    var s=JSON.parse(decodeURIComponent(escape(atob("' + b64 + '"))));\n' +
    '    localStorage.setItem("ccanalyzer_state",JSON.stringify(s));\n' +
    '  }catch(e){}\n' +
    '})();\n' +
    CT + '\n';
  var html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  html = html.replace(new RegExp('\u003cscript id="_ccab"\u003e[\\s\\S]*?\u003c/script\u003e\\s*', 'g'), '');
  html = html.replace('</head>', boot + '</head>');
  return html;
}

// ── Option A: Download ────────────────────────────────────────────────────────

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
    showStatus('Downloaded \u2713', 'ok');
  } catch(e) {
    showStatus('Download failed', 'err');
    console.error('saveLocal:', e);
  }
}

// ── Option B: Save via Apps Script (no OAuth needed) ─────────────────────────

var WEB_APP_URL_KEY = 'ccanalyzer_webapp_url';

function getWebAppUrl() {
  return localStorage.getItem(WEB_APP_URL_KEY) || '';
}

function saveWebAppUrl(url) {
  localStorage.setItem(WEB_APP_URL_KEY, url);
}

async function saveToDrive() {
  var webAppUrl = getWebAppUrl();
  if (!webAppUrl) { openModal(); return; }

  setSaving(true);
  showStatus('Saving to Drive\u2026', '');

  try {
    var state = captureState();
    try { localStorage.setItem('ccanalyzer_state', JSON.stringify(state)); } catch(e) {}

    var html = buildDownloadHTML(state);

    var resp = await fetch(webAppUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'save', html: html }),
    });

    // Apps Script redirects to a final URL — follow it
    var data = await resp.json();

    if (data.ok) {
      showStatus('Saved to Drive \u2713 ' + new Date().toLocaleTimeString(), 'ok');
      // Store the Drive file URL for reference
      if (data.url) localStorage.setItem('ccanalyzer_drive_url', data.url);
    } else {
      throw new Error(data.error || 'Unknown error from Apps Script');
    }
  } catch(e) {
    console.error('saveToDrive:', e);
    if (e.message.includes('fetch') || e.message.includes('Failed')) {
      showStatus('Cannot reach Apps Script \u2014 check URL in setup', 'err');
    } else {
      showStatus('Save failed: ' + e.message, 'err');
    }
  } finally {
    setSaving(false);
  }
}

function saveDriveConfig() {
  var url = (document.getElementById('webapp-url-input').value || '').trim();
  if (!url || !url.startsWith('https://script.google.com/')) {
    alert('Please paste a valid Apps Script Web App URL\n(starts with https://script.google.com/macros/s/...)');
    return;
  }
  saveWebAppUrl(url);
  closeModal();
  // Verify it works
  showStatus('Testing connection\u2026', '');
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.ok) {
        showStatus('Connected \u2713 Ready to save', 'ok');
        // Also trigger saving of T&C references on first setup
        fetch(url, { method:'POST', body: JSON.stringify({ action:'saveRefs' }) })
          .catch(function(){});
      } else {
        showStatus('Connected but got error: ' + d.error, 'err');
      }
    })
    .catch(function() {
      showStatus('URL saved. Test save to verify.', '');
    });
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function showStatus(msg, type) {
  var el = document.getElementById('save-status'); if (!el) return;
  el.textContent = msg;
  el.className = 'save-status' + (type ? ' ' + type : '');
  if (type === 'ok') setTimeout(function(){ el.textContent = ''; el.className = 'save-status'; }, 4000);
}

function setSaving(on) {
  document.querySelectorAll('.btn-save-drive').forEach(function(b) { b.classList.toggle('saving', on); });
}

function openModal() {
  var saved = getWebAppUrl();
  if (saved) document.getElementById('webapp-url-input').value = saved;
  document.getElementById('drive-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('drive-modal').classList.add('hidden');
}
