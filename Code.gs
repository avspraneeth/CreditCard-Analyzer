// Code.gs — Google Apps Script Web App for CC Analyzer
// Deploy as: Execute as ME, Who has access: Anyone
// Actions: save (writes CC Analyzer.html to Drive), saveRefs (writes T&C reference files)

var FOLDER_PATH = 'AI/Credit Card App';
var FILE_NAME   = 'CC Analyzer.html';
var REFS_FOLDER = 'AI/Credit Card App/References';

var TNC_REFS = [
  { name:'Axis Atlas - Terms & Conditions.url',
    url:'https://campaign.axis.bank.in/generic/axis-atlas-credit-card-terms-and-conditions.pdf',
    note:'Axis Atlas T&C PDF — updated April 2026 (Accor/Marriott/Qatar removed, BA/Finnair/Vietnam added at poor 2:1 ratio)' },
  { name:'Axis Atlas April 2026 Devaluation - LiveFromALounge.url',
    url:'https://livefromalounge.com/end-of-an-era-axis-bank-credit-cards-nix-accor-marriott-and-qatar-airways-from-transfer-partner-list-with-immediate-effect/',
    note:'Live From A Lounge — Axis Bank removes Accor, Marriott, Qatar (April 2, 2026)' },
  { name:'Axis Atlas Transfer Partners 2026 - CardTrail.url',
    url:'https://cardtrail.in/news/axis-bank-miles-transfer-partners-2026/',
    note:'CardTrail — full updated Axis partner list post April 2026 devaluation' },
  { name:'Axis Vistara Infinite - Terms & Conditions.url',
    url:'https://www.axis.bank.in/cards/credit-card/axis-bank-vistara-infinite-credit-card',
    note:'Axis Vistara Infinite card page (discontinued for new applicants)' },
  { name:'IndusInd Avios Infinite - Terms & Conditions.url',
    url:'https://www.indusind.bank.in/in/en/personal/cards/credit-card/avios-visa-infinite-credit-card.html',
    note:'IndusInd Avios Visa Infinite card page' },
  { name:'BOBCard Etihad Guest Premier - Terms & Conditions.url',
    url:'https://www.bobcard.co.in/credit-card-types/bobcard-etihad-guest-premium',
    note:'BOBCard Etihad Guest Premium card page' },
  { name:'ICICI Emirates Emeralde - Terms & Conditions.url',
    url:'https://www.icicibank.com/personal-banking/cards/credit-card/emirates-skywards/emirates-emeralde',
    note:'ICICI Bank Emirates Skywards Emeralde card page' },
  { name:'ICICI Times Black - Terms & Conditions.url',
    url:'https://www.timesblack.com/faqs',
    note:'ICICI Times Black FAQs and T&C' },
  { name:'HDFC Tata Neu Infinity - Terms & Conditions.url',
    url:'https://www.hdfcbank.com/personal/pay/cards/credit-cards/tata-neu-infinity-hdfc-bank-credit-card',
    note:'HDFC Tata Neu Infinity card page' },
  { name:'HDFC Marriott Bonvoy - Terms & Conditions.url',
    url:'https://www.hdfcbank.com/personal/pay/cards/credit-cards/marriott-bonvoy-credit-card',
    note:'HDFC Marriott Bonvoy card page' },
  { name:'Amex Platinum Travel - Terms & Conditions.url',
    url:'https://www.americanexpress.com/in/credit-cards/platinum-travel-credit-card/',
    note:'American Express Platinum Travel India card page' },
  { name:'HSBC Premier Credit Card - Terms & Conditions.url',
    url:'https://www.hsbc.co.in/credit-cards/products/premier/',
    note:'HSBC Premier credit card page (exclusive to Premier banking customers)' },
];

// ── Entry points ──────────────────────────────────────────────────────────────

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, msg: 'CC Analyzer Apps Script v3 running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;

    if (action === 'save') {
      var folder  = ensureFolderPath(FOLDER_PATH);
      var fileId  = upsertFile(FILE_NAME, payload.html, folder);
      return jsonResponse({ ok: true, fileId: fileId, url: 'https://drive.google.com/file/d/' + fileId + '/view' });
    }

    if (action === 'saveRefs') {
      saveReferences();
      return jsonResponse({ ok: true, msg: 'References saved to ' + REFS_FOLDER });
    }

    return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ── T&C References ────────────────────────────────────────────────────────────

function saveReferences() {
  var folder = ensureFolderPath(REFS_FOLDER);

  TNC_REFS.forEach(function(ref) {
    var content = '[InternetShortcut]\nURL=' + ref.url + '\n\n; ' + ref.note + '\n; Saved by CC Analyzer ' + new Date().toDateString();
    upsertFile(ref.name, content, folder);
  });

  // README with all links
  var readme = '# CC Analyzer — T&C Reference Sources\nSaved: ' + new Date().toDateString() + '\n\n';
  readme += 'Source URLs used to research card T&Cs. Open .url files in any browser.\n\n';
  TNC_REFS.forEach(function(ref) {
    readme += '## ' + ref.name.replace('.url', '') + '\n' + ref.note + '\n' + ref.url + '\n\n';
  });
  upsertFile('_README - Sources.md', readme, folder);
}

// ── Drive helpers ─────────────────────────────────────────────────────────────

function ensureFolderPath(path) {
  var parts  = path.split('/').filter(function(p) { return p.length > 0; });
  var parent = DriveApp.getRootFolder();
  for (var i = 0; i < parts.length; i++) {
    var found = parent.getFoldersByName(parts[i]);
    parent = found.hasNext() ? found.next() : parent.createFolder(parts[i]);
  }
  return parent;
}

function upsertFile(name, content, folder) {
  var existing = folder.getFilesByName(name);
  if (existing.hasNext()) {
    var file = existing.next();
    file.setContent(content);
    return file.getId();
  }
  var mime = name.endsWith('.html') ? MimeType.HTML : MimeType.PLAIN_TEXT;
  return folder.createFile(name, content, mime).getId();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── One-time setup — run this manually from the Apps Script editor ────────────

function setup() {
  var mainFolder = ensureFolderPath(FOLDER_PATH);
  Logger.log('Main folder ready: ' + mainFolder.getUrl());
  saveReferences();
  Logger.log('T&C references saved to References/ folder.');
  Logger.log('Now deploy as Web App (Execute as: Me, Access: Anyone) to enable Save button.');
}
