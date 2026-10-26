// =============================
// Scrollbar indicator
// =============================
window.addEventListener('scroll', () => {
    const scrollTop    = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    const bar = document.querySelector('.scrollbar');
    if (bar) bar.style.width = pct + '%';
    const navbar = document.querySelector('.navbar');
    if (navbar) navbar.classList.toggle('scrolled', scrollTop > 40);
});

// =============================
// Hamburger menu
// =============================
function toggleMenu() {
    const menu = document.getElementById('navlinks');
    const hamburger = document.querySelector('.hamburger');
    menu.classList.toggle('active');
    hamburger.classList.toggle('open');
}

document.querySelectorAll('.navlinks a').forEach(a => {
    a.addEventListener('click', () => {
        document.getElementById('navlinks').classList.remove('active');
        document.querySelector('.hamburger')?.classList.remove('open');
    });
});

(function() {
    const current = location.pathname.split('/').pop();
    document.querySelectorAll('.navlinks a').forEach(a => {
        const href = a.getAttribute('href').split('/').pop();
        if (href === current || (current === '' && href === 'index.html')) {
            a.classList.add('active');
        }
    });
})();

// =============================
// Foto popup / lightbox
// =============================
function openImage(img) {
    const popup    = document.getElementById('popup');
    const popupImg = document.getElementById('popup-img');
    if (!popup || !popupImg) return;
    popupImg.src        = img.src;
    popup.style.display = 'flex';
    popup.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeImage() {
    const popup = document.getElementById('popup');
    if (!popup) return;
    popup.style.display = 'none';
    popup.classList.remove('open');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeImage(); });
document.getElementById('popup')?.addEventListener('click', function(e) {
    if (e.target === this) closeImage();
});

// =============================
// SONG LINK – slot-gebaseerd
// Elk nummer op positie i linkt naar songs/song-(i+1).html
// Werkt ongeacht naam, altijd max 30 slots
// =============================
const MAX_SLOTS = 30;

// Maakt tekst veilig om in HTML te zetten
function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function vindSongUrl(slotNr) {
    if (slotNr >= 1 && slotNr <= MAX_SLOTS) return `songs/song-${slotNr}.html`;
    return null;
}

// =============================
// SETLIST DYNAMISCH OPBOUWEN
// =============================
function bouwSetlist(nummers, huidig, afgespeeld) {
    const container = document.getElementById('setlist-container');
    if (!container) return;

    container.innerHTML = nummers.map((song, i) => {
        const nr       = i + 1;
        const url      = vindSongUrl(nr);   // slot-gebaseerd: positie = url
        const isActief = nr === huidig;
        const isKlaar  = Array.isArray(afgespeeld) && afgespeeld.includes(nr);
        const klassen  = `song${isActief ? ' speelt-nu' : ''}${isKlaar ? ' afgespeeld' : ''}`;

        const inhoud = `
            <span class="song-nummer">${nr}</span>
            ${esc(song.naam)}
            <span class="song-icon">♫</span>
        `;

        return `<a class="${klassen}" href="${url}" style="animation-delay:${i * 0.05}s">${inhoud}</a>`;
    }).join('');

    // Scroll-animaties opnieuw koppelen
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateX(0)';
            }
        });
    }, { threshold: 0.1 });
    container.querySelectorAll('.song:not(.song-skeleton)').forEach(s => observer.observe(s));
}

// =============================
// NU SPEELT BANNER UPDATEN
// =============================
function updateBanner(state) {
    const banner = document.getElementById('nu-speelt-banner');
    const naamEl = document.getElementById('nu-speelt-naam');
    if (!banner || !naamEl) return;

    const nummers = state.nummers || [];
    if (state.huidig && nummers[state.huidig - 1]) {
        naamEl.textContent = nummers[state.huidig - 1].naam;
        banner.classList.add('zichtbaar');
        const actief = document.querySelector('.song.speelt-nu');
        if (actief) actief.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        banner.classList.remove('zichtbaar');
    }
}

// =============================
// FIREBASE – LIVE UPDATES
// =============================
const FB_URL = 'https://openstage-597a9-default-rtdb.europe-west1.firebasedatabase.app/show.json';

let huidigeState = null;

function verwerkState(state) {
    if (!state || !Array.isArray(state.nummers)) return;
    huidigeState = state;
    bouwSetlist(state.nummers, state.huidig, state.afgespeeld || []);
    updateBanner(state);
}

if (document.getElementById('setlist-container') || document.getElementById('nu-speelt-banner')) {
    // Direct laden
    fetch(FB_URL)
        .then(r => r.json())
        .then(verwerkState)
        .catch(() => {
            // Fallback: verberg skeletons als Firebase niet bereikbaar is
            const container = document.getElementById('setlist-container');
            if (container) container.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px">Setlist tijdelijk niet beschikbaar</p>';
        });

    // Firebase SSE voor instant live updates
    try {
        const sse = new EventSource(FB_URL.replace('.json', '.json?accept=text/event-stream'));
        sse.addEventListener('put', e => {
            try { verwerkState(JSON.parse(e.data).data); } catch {}
        });
        sse.addEventListener('patch', () => {
            fetch(FB_URL).then(r => r.json()).then(verwerkState).catch(() => {});
        });
    } catch {}

    // Fallback poll elke 10 sec
    setInterval(() => {
        fetch(FB_URL).then(r => r.json()).then(verwerkState).catch(() => {});
    }, 10000);
}

// =============================
// COUNTDOWN
// =============================
function startCountdown(targetISO) {
    const vakken = {
        d: document.getElementById('cd-dagen'),
        u: document.getElementById('cd-uren'),
        m: document.getElementById('cd-minuten'),
        s: document.getElementById('cd-seconden'),
    };
    const klaar = document.getElementById('cd-klaar');
    const wrap  = document.querySelector('.countdown-wrap');
    if (!vakken.d) return;

    function flip(el, val) {
        const str = String(val).padStart(2, '0');
        if (el.textContent !== str) {
            el.classList.add('flip');
            el.textContent = str;
            setTimeout(() => el.classList.remove('flip'), 200);
        }
    }

    function tick() {
        const diff = new Date(targetISO) - new Date();
        if (diff <= 0) {
            if (klaar) klaar.style.display = 'block';
            document.querySelector('.countdown-vakken')?.style.setProperty('display', 'none');
            return;
        }
        flip(vakken.d, Math.floor(diff / 86400000));
        flip(vakken.u, Math.floor((diff % 86400000) / 3600000));
        flip(vakken.m, Math.floor((diff % 3600000) / 60000));
        flip(vakken.s, Math.floor((diff % 60000) / 1000));
        if (wrap) wrap.classList.add('zichtbaar');
    }
    tick();
    setInterval(tick, 1000);
}

// Datum wordt dynamisch geladen uit Firebase
// Fallback als Firebase niet bereikbaar is
const FALLBACK_DATUM = '2026-12-12T19:00:00';

async function laadEnStartCountdown() {
    if (!document.getElementById('cd-dagen')) return;
    try {
        const r = await fetch('https://openstage-597a9-default-rtdb.europe-west1.firebasedatabase.app/show.json');
        const data = await r.json();
        const datum = data?.evenementDatum || FALLBACK_DATUM;
        startCountdown(datum);
    } catch {
        startCountdown(FALLBACK_DATUM);
    }
}
laadEnStartCountdown();


// =============================
// FOOTER – tekst komt uit het beheerpaneel
// Staat er niets in de database, dan blijft de standaardtekst uit de HTML staan
// =============================
(function laadFooter() {
    const el = document.getElementById('footer-tekst');
    if (!el) return;
    fetch(FB_URL.replace('show.json', 'show/footerTekst.json'))
        .then(r => r.json())
        .then(tekst => { if (typeof tekst === 'string' && tekst.trim()) el.textContent = tekst; })
        .catch(() => {});
})();

// EVENTS – komen uit het beheerpaneel
(function laadEvents() {
    const el = document.getElementById('eventpagina');
    if (!el) return;
    fetch(FB_URL.replace('show.json', 'show/events.json'))
        .then(r => r.json())
        .then(lijst => {
            if (!Array.isArray(lijst)) return;
            el.innerHTML = lijst.filter(Boolean).map(ev =>
                `<div class="event-card"><span class="event-icon">${esc(ev.label)}</span><p>${esc(ev.tekst)}</p></div>`
            ).join('');
        })
        .catch(() => {});
})();

// =============================
// TEKSTEN – alle teksten met data-t="..." komen uit het beheerpaneel
// Staat er niets in de database, dan blijft de standaardtekst uit de HTML staan
// =============================
(function laadTeksten() {
    const els = document.querySelectorAll('[data-t]');
    if (!els.length) return;
    fetch(FB_URL.replace('show.json', 'show/teksten.json'))
        .then(r => r.json())
        .then(t => {
            if (!t || typeof t !== 'object') return;
            const prefix = location.pathname.includes('/songs/') ? '../' : '';
            els.forEach(el => {
                const v = t[el.dataset.t];
                if (typeof v === 'string' && v.trim()) el.textContent = v;
                // link van knoppen/menu-items (alleen eigen pagina's of http/mailto)
                const l = t[el.dataset.t + '_link'];
                if (el.tagName === 'A' && typeof l === 'string' && l.trim()) {
                    if (/^(https?:|mailto:)/i.test(l)) el.href = l;
                    else if (/^[\w'%.-]+\.html$/.test(l)) el.href = prefix + l;
                }
            });
        })
        .catch(() => {});
})();
