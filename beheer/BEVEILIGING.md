# Beveiliging instellen (eenmalig, ±10 minuten)

Tot je dit gedaan hebt, werkt het beheer niet (er is dan nog geen inlog) en blijft de database zoals hij nu is.

## Hoe het werkt
- De publieke site mag alles **lezen** (nodig voor de setlist), maar **schrijven** mag alleen een ingelogde beheerder.
- Inloggen gaat via Firebase Authentication. Wachtwoorden staan dus nooit in de code of op GitHub.
- De regels in `firebase-regels.json` worden door Firebase zelf afgedwongen, ook als iemand de database direct probeert aan te spreken.
- Dat de code op GitHub openbaar staat is dus geen probleem: de beveiliging zit in Firebase, niet in verborgen bestanden.

## Stappen
1. **Inloggen aanzetten** — Firebase console → *Build* → *Authentication* → *Get started* → tabblad *Sign-in method* → **Email/Password** → aanzetten → Opslaan.
2. **API-sleutel kopiëren** — Tandwiel linksboven → *Project settings* → tabblad *General* → onderaan *Your apps*. Staat er geen web-app, kies `</>` (Web) en maak er een (naam maakt niet uit, hosting niet aanvinken). Kopieer de waarde van `apiKey`.
   Open `beheer/beheer.js` en vervang `PLAK_HIER_JE_FIREBASE_API_KEY` door die sleutel (laat de aanhalingstekens staan).
3. **Regels plaatsen** — *Build* → *Realtime Database* → tabblad *Rules* → alles vervangen door de inhoud van `beheer/firebase-regels.json` → **Publish**.
   (Kijk eerst even in het tabblad *Data*: staan er naast `show` nog andere onderdelen, dan worden die door deze regels dichtgezet voor publiek. Dat is meestal precies wat je wilt.)
4. **Direct daarna de eerste beheerder aanmaken** — zet de bestanden op GitHub, open `beheer/index.html`, klik op *Eerste keer? Maak de eerste beheerder aan* en kies gebruikersnaam + wachtwoord.
   Doe dit meteen na stap 3: zolang er nog geen beheerder is, kan de eerste die dat doet de beheerder worden.
5. Daarna kun je onder **Beheerders** tot 5 mensen toevoegen, je wachtwoord en je gebruikersnaam wijzigen.

## Extra (aanbevolen, 2 minuten)
Google Cloud console → *APIs & Services* → *Credentials* → je Browser key → *Application restrictions: Websites* → voeg je GitHub Pages-adres toe (bijv. `https://jouwnaam.github.io/*`). Dan werkt de sleutel alleen vanaf jouw site.

## Goed om te weten
- Wachtwoord vergeten: een andere beheerder kan je verwijderen en opnieuw toevoegen onder een **andere gebruikersnaam**, of reset het wachtwoord in Firebase console → Authentication → Users.
- Een verwijderde beheerder kan niet meer schrijven, ook niet als hij nog is ingelogd (Firebase controleert bij elke wijziging).
- Firebase vertraagt en blokkeert zelf herhaald proberen met foute wachtwoorden.
- Gebruik voor iedereen een eigen wachtwoord van minimaal 10 tekens dat nergens anders gebruikt wordt.
