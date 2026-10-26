// Gedeelde functies voor alle beheerpagina's
// =====================================================================
// INSTELLINGEN
// =====================================================================
// Plak hier je Firebase "apiKey" (Firebase console → Projectinstellingen → Algemeen → Jouw apps).
// Die sleutel is niet geheim; de beveiliging zit in de database-regels (zie BEVEILIGING.md).
const API_KEY = 'AIzaSyBaLHdFB6O6KRsr5TmwtmNNEVmwpwVo0gY';
const DB_ROOT = 'https://openstage-597a9-default-rtdb.europe-west1.firebasedatabase.app';
const MAX_BEHEERDERS = 5;
const MIN_WW = 10;
const MAIL_DOMEIN = 'beheer.jelopenstage.nl'; // gebruikersnaam wordt intern een nep-mailadres

// =====================================================================
// INLOGGEN (Firebase Authentication via REST)
// =====================================================================
const mailVan = n => `${n}@${MAIL_DOMEIN}`;
const naamOk = n => /^[a-z0-9._-]{3,30}$/.test(n);
const FOUTEN = {
  INVALID_LOGIN_CREDENTIALS: 'Gebruikersnaam of wachtwoord klopt niet.', EMAIL_NOT_FOUND: 'Gebruikersnaam of wachtwoord klopt niet.',
  INVALID_PASSWORD: 'Gebruikersnaam of wachtwoord klopt niet.', USER_DISABLED: 'Dit account is uitgezet.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Te vaak geprobeerd. Wacht even en probeer het later opnieuw.',
  EMAIL_EXISTS: 'Deze gebruikersnaam bestaat al.', WEAK_PASSWORD: 'Wachtwoord is te zwak.',
  OPERATION_NOT_ALLOWED: 'Inloggen met e-mail/wachtwoord staat nog uit in Firebase (zie BEVEILIGING.md).',
  API_KEY_INVALID: 'De API-sleutel in beheer.js klopt niet.', INVALID_API_KEY: 'De API-sleutel in beheer.js klopt niet.'
};
async function authCall(ep, body) {
  if (API_KEY.startsWith('PLAK_HIER')) throw new Error('De API-sleutel ontbreekt nog in beheer.js (zie BEVEILIGING.md).');
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${ep}?key=${API_KEY}`,
    {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const code = ((j.error && j.error.message) || '').split(/[ :]/)[0];
    const e = new Error(code.startsWith('WEAK_PASSWORD') ? FOUTEN.WEAK_PASSWORD : (FOUTEN[code] || 'Er ging iets mis (' + (code || r.status) + ').'));
    e.code = code; throw e;
  }
  return j;
}
let sessie = null;
try { sessie = JSON.parse(localStorage.getItem('jel_sessie') || 'null'); } catch {}
function bewaar(s) { sessie = s; try { s ? localStorage.setItem('jel_sessie', JSON.stringify(s)) : localStorage.removeItem('jel_sessie'); } catch {} }
const sessieVan = (j, naam) => ({idToken: j.idToken, refreshToken: j.refreshToken, uid: j.localId, naam, verloopt: Date.now() + (+j.expiresIn) * 1000});
async function ververs() {
  if (!sessie) return false;
  try {
    const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(sessie.refreshToken)});
    if (!r.ok) { bewaar(null); return false; }
    const j = await r.json();
    bewaar({...sessie, idToken: j.id_token, refreshToken: j.refresh_token, verloopt: Date.now() + (+j.expires_in) * 1000});
    return true;
  } catch { return false; }
}
function uitloggen() { bewaar(null); location.reload(); }

// Account aanmaken (of, als hij al bestaat en het wachtwoord klopt, gewoon inloggen)
async function maakAccount(naam, ww) {
  try { return await authCall('signUp', {email: mailVan(naam), password: ww, returnSecureToken: true}); }
  catch (e) {
    if (e.code !== 'EMAIL_EXISTS') throw e;
    try { return await authCall('signInWithPassword', {email: mailVan(naam), password: ww, returnSecureToken: true}); }
    catch { throw new Error('Deze gebruikersnaam bestaat al met een ander wachtwoord. Kies een andere naam.'); }
  }
}

let inlogPromise = null;
async function token() {
  if (sessie && Date.now() > sessie.verloopt - 60000) await ververs();
  if (!sessie) { inlogPromise = inlogPromise || toonInlog().finally(() => { inlogPromise = null; }); await inlogPromise; }
  return sessie.idToken;
}
function toonInlog() {
  return new Promise(klaar => {
    const o = document.createElement('div'); o.className = 'inlog';
    o.innerHTML = `<div class="inlog-kaart"><h1>JEL Openstage Beheer</h1><p class="sub" id="ilSub">Log in om verder te gaan.</p>
      <form id="ilForm"><label>Gebruikersnaam</label><input type="text" id="ilNaam" autocomplete="username" autocapitalize="none" spellcheck="false" required>
      <label>Wachtwoord</label><input type="password" id="ilWw" autocomplete="current-password" required>
      <div id="ilExtra" hidden><label>Wachtwoord nogmaals</label><input type="password" id="ilWw2" autocomplete="new-password">
        <p class="hint">Minimaal ${MIN_WW} tekens. Een zin van een paar woorden is sterker dan één lastig woord.</p></div>
      <p class="status fout" id="ilFout"></p><button class="primair" style="width:100%" id="ilKnop">Inloggen</button></form>
      <p class="hint" style="text-align:center;margin-top:14px"><a href="#" id="ilWissel">Eerste keer? Maak de eerste beheerder aan</a></p></div>`;
    document.body.appendChild(o);
    const $ = id => o.querySelector('#' + id); let setup = false;
    $('ilWissel').onclick = e => { e.preventDefault(); setup = !setup;
      $('ilExtra').hidden = !setup; $('ilKnop').textContent = setup ? 'Eerste beheerder aanmaken' : 'Inloggen';
      $('ilSub').textContent = setup ? 'Alleen mogelijk als er nog geen beheerder bestaat.' : 'Log in om verder te gaan.';
      $('ilWissel').textContent = setup ? 'Terug naar inloggen' : 'Eerste keer? Maak de eerste beheerder aan'; $('ilFout').textContent = ''; };
    $('ilForm').onsubmit = async e => {
      e.preventDefault(); const fout = $('ilFout'), knop = $('ilKnop'); fout.textContent = ''; knop.disabled = true;
      try {
        const naam = $('ilNaam').value.trim().toLowerCase(), ww = $('ilWw').value;
        if (setup) {
          if (!naamOk(naam)) throw new Error('Gebruikersnaam: 3–30 tekens, alleen letters, cijfers, punt, streepje of underscore.');
          if (ww.length < MIN_WW) throw new Error(`Wachtwoord moet minimaal ${MIN_WW} tekens zijn.`);
          if (ww !== $('ilWw2').value) throw new Error('De wachtwoorden zijn niet hetzelfde.');
          const j = await maakAccount(naam, ww);
          const r = await fetch(`${DB_ROOT}/beheerders/${j.localId}.json?auth=${j.idToken}`, {method: 'PUT',
            body: JSON.stringify({gebruikersnaam: naam, toegevoegd: new Date().toISOString()})});
          if (!r.ok) throw new Error('Er bestaat al een beheerder. Vraag een bestaande beheerder om je toe te voegen.');
          bewaar(sessieVan(j, naam));
        } else {
          const j = await authCall('signInWithPassword', {email: mailVan(naam), password: ww, returnSecureToken: true});
          const r = await fetch(`${DB_ROOT}/beheerders/${j.localId}.json?auth=${j.idToken}`);
          if (!r.ok || !(await r.json())) throw new Error('Dit account heeft geen toegang tot het beheer.');
          bewaar(sessieVan(j, naam));
        }
        o.remove(); klaar();
      } catch (err) { fout.textContent = err.message; knop.disabled = false; }
    };
    $('ilNaam').focus();
  });
}

// =====================================================================
// DATABASE (alles gaat met inlog-token mee; de database-regels bepalen wie mag schrijven)
// =====================================================================
async function dbReq(basis, pad, methode, body) {
  for (let poging = 0; poging < 2; poging++) {
    const t = await token();
    const r = await fetch(`${DB_ROOT}/${basis}${pad ? '/' + pad : ''}.json?auth=${encodeURIComponent(t)}`,
      {method: methode, body: body === undefined ? undefined : JSON.stringify(body)});
    if (r.status === 401 || r.status === 403) {
      if (poging === 0 && await ververs()) continue;
      bewaar(null); location.reload(); throw new Error('Niet ingelogd');
    }
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }
}
const dbGet = (pad = '') => dbReq('show', pad, 'GET');
const dbPut = (pad, waarde) => dbReq('show', pad, 'PUT', waarde);
const dbPatch = (pad, obj) => dbReq('show', pad, 'PATCH', obj);

const PAGINAS = [
  ['index.html','Overzicht'],['home.html','Home'],['setlist.html','Setlist'],['events.html','Events'],
  ['fotos.html',"Foto's"],['over-ons.html','Over ons'],['algemeen.html','Algemeen'],
  ['nummers.html','Nummers & mensen'],['live.html','Live modus'],['beheerders.html','Beheerders']
];
const LINK_PAGINAS = [['index.html','Home'],['setlist.html','Setlist'],['events.html','Events'],["foto's.html","Foto's"],['over-ons.html','Over ons']];
const linkNaam = h => (LINK_PAGINAS.find(p => p[0] === h) || [0, h])[1];
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));


function bouwNav(huidig) {
  const nav = document.createElement('nav'); nav.className = 'bnav';
  nav.innerHTML = '<span class="merk">JEL Openstage Beheer</span>' +
    PAGINAS.map(([h, l]) => `<a href="${h}" class="${h === huidig ? 'actief' : ''}${h === 'live.html' ? ' live' : ''}">${l}${h === 'live.html' ? ' ●' : ''}</a>`).join('') +
    '<button class="uit" onclick="uitloggen()">Uitloggen</button>';
  document.body.prepend(nav);
}
function zetStatus(tekst, soort = '') { const s = document.getElementById('status'); if (s) { s.textContent = tekst; s.className = 'status ' + soort; } }

// ---------- Tekstpagina's: velden uit config ----------
// velden: [{sleutel, label, type:'text'|'area', standaard}] gegroepeerd in secties
async function bouwTekstPagina(huidigeFile, titel, sub, secties) {
  bouwNav(huidigeFile);
  const wrap = document.getElementById('app');
  wrap.innerHTML = `<h1>${esc(titel)}</h1><p class="sub">${sub}</p>` + secties.map(s => `
    <div class="kaart"><h2>${esc(s.titel)}</h2>${s.velden.map(v => `
      <label for="f_${v[0]}">${esc(v[1])}</label>
      ${v[3] === 'area' ? `<textarea id="f_${v[0]}" data-sleutel="${v[0]}" placeholder="${esc(v[2])}"></textarea>`
                          : `<input type="text" id="f_${v[0]}" data-sleutel="${v[0]}" placeholder="${esc(v[2])}">`}
      ${v[4] ? `<div class="linkrij"><span class="hint">🔗 Gaat naar:</span>
        <select data-linksel="${v[0]}_link"><option value="">Standaard (${esc(linkNaam(v[4]))})</option>
          ${LINK_PAGINAS.map(p => `<option value="${esc(p[0])}">${esc(p[1])}</option>`).join('')}
          <option value="__eigen">Andere link…</option></select>
        <input type="text" data-sleutel="${v[0]}_link" placeholder="https://…" hidden></div>` : ''}`).join('')}</div>`).join('') +
    `<div class="balk"><span class="status" id="status"></span><button class="primair" id="opslaan">Opslaan</button></div>`;
  let teksten = {};
  try { teksten = (await dbGet('teksten')) || {}; } catch { zetStatus('Kon teksten niet laden', 'fout'); }
  try { teksten.footerTekst = (await dbGet('footerTekst')) || ''; } catch {}
  wrap.querySelectorAll('[data-sleutel]').forEach(el => { el.value = teksten[el.dataset.sleutel] ?? ''; });
  // link-dropdowns: stand zetten + gedrag
  wrap.querySelectorAll('[data-linksel]').forEach(sel => {
    const inp = wrap.querySelector(`input[data-sleutel="${sel.dataset.linksel}"]`);
    const val = inp.value.trim();
    if (!val) sel.value = '';
    else if (LINK_PAGINAS.some(p => p[0] === val)) sel.value = val;
    else { sel.value = '__eigen'; inp.hidden = false; }
    sel.onchange = () => {
      if (sel.value === '__eigen') { inp.hidden = false; inp.value = ''; inp.focus(); }
      else { inp.hidden = true; inp.value = sel.value; }
    };
  });
  document.getElementById('opslaan').onclick = async () => {
    const upd = {}; let footer;
    wrap.querySelectorAll('[data-sleutel]').forEach(el => {
      const w = el.value.trim() || null; // leeg = standaardtekst
      if (el.dataset.sleutel === 'footerTekst') footer = w; else upd[el.dataset.sleutel] = w;
    });
    zetStatus('Opslaan…');
    try { await dbPatch('teksten', upd); if (footer !== undefined) await dbPatch('', {footerTekst: footer}); zetStatus('✓ Opgeslagen — direct zichtbaar op de site', 'ok'); }
    catch { zetStatus('Opslaan mislukt', 'fout'); }
  };
}
