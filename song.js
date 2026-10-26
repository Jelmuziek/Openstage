// =============================
// SONG.JS – Laadt songinfo vanuit Firebase op basis van slot (SLOT variabele)
// =============================

const SONG_FB_URL = 'https://openstage-597a9-default-rtdb.europe-west1.firebasedatabase.app/show.json';

async function laadSong() {
    try {
        const r    = await fetch(SONG_FB_URL);
        const data = await r.json();
        const nummers = data?.nummers || [];

        // Slot is 1-gebaseerd, array is 0-gebaseerd
        const song = nummers[SLOT - 1];

        document.getElementById('song-skeleton').style.display = 'none';

        if (!song || !song.naam) {
            document.getElementById('song-leeg').style.display = 'block';
            return;
        }

        // Paginatitel updaten
        document.title = `${song.naam} – JEL Openstage`;

        // Naam
        document.getElementById('song-naam').textContent = song.naam;

        // Info kaart
        const kaart = document.getElementById('song-info-card');
        let rows = '';

        if (song.artiest) {
            rows += `<div class="song-info-row">
                <span class="song-info-label">Artiest</span>
                <span class="song-info-value">${esc(song.artiest)}</span>
            </div>`;
        }
        if (song.gespeeldDoor) {
            rows += `<div class="song-info-row">
                <span class="song-info-label">Gespeeld door</span>
                <span class="song-info-value">${esc(song.gespeeldDoor)}</span>
            </div>`;
        }
        if (song.slot) {
            rows += `<div class="song-info-row">
                <span class="song-info-label">Nummer</span>
                <span class="song-info-value">${SLOT} van ${nummers.length}</span>
            </div>`;
        }

        kaart.innerHTML = rows;
        if (!rows) kaart.style.display = 'none';

        // Beschrijving
        const beschrEl = document.getElementById('song-beschrijving');
        if (song.beschrijving) {
            beschrEl.textContent = song.beschrijving;
            beschrEl.style.display = 'block';
        }

        // YouTube
        const ytEl = document.getElementById('song-yt');
        if (song.youtube) {
            ytEl.href = song.youtube;
            ytEl.style.display = 'flex';
        }

        document.getElementById('song-inhoud').style.display = 'block';

    } catch (e) {
        document.getElementById('song-skeleton').style.display = 'none';
        document.getElementById('song-leeg').style.display = 'block';
    }
}

laadSong();
