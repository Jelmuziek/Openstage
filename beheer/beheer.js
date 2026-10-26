// Gedeelde functies voor alle beheerpagina's
const DB = 'https://openstage-597a9-default-rtdb.europe-west1.firebasedatabase.app/show';
const PAGINAS = [
  ['index.html','Overzicht'],['home.html','Home'],['setlist.html','Setlist'],['events.html','Events'],
  ['fotos.html',"Foto's"],['over-ons.html','Over ons'],['algemeen.html','Algemeen'],
  ['nummers.html','Nummers & mensen'],['live.html','Live modus']
];
const LINK_PAGINAS = [['index.html','Home'],['setlist.html','Setlist'],['events.html','Events'],["foto's.html","Foto's"],['over-ons.html','Over ons']];
const linkNaam = h => (LINK_PAGINAS.find(p => p[0] === h) || [0, h])[1];
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function dbGet(pad = '') { const r = await fetch(`${DB}${pad ? '/' + pad : ''}.json`); if (!r.ok) throw new Error(r.status); return r.json(); }
async function dbPut(pad, waarde) { const r = await fetch(`${DB}/${pad}.json`, {method:'PUT', body: JSON.stringify(waarde)}); if (!r.ok) throw new Error(r.status); return r.json(); }
async function dbPatch(pad, obj) { const r = await fetch(`${DB}${pad ? '/' + pad : ''}.json`, {method:'PATCH', body: JSON.stringify(obj)}); if (!r.ok) throw new Error(r.status); return r.json(); }

function bouwNav(huidig) {
  const nav = document.createElement('nav'); nav.className = 'bnav';
  nav.innerHTML = '<span class="merk">JEL Openstage Beheer</span>' +
    PAGINAS.map(([h, l]) => `<a href="${h}" class="${h === huidig ? 'actief' : ''}${h === 'live.html' ? ' live' : ''}">${l}${h === 'live.html' ? ' ●' : ''}</a>`).join('');
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
