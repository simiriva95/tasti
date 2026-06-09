# Guida completa — da repo a online (tutto gratis)

Questa guida ti porta da zero al sito pubblico funzionante: login Google,
libreria salvata, conversione PDF. Costo: **€0** (tutti free tier).

**Architettura**
- **App** (Next.js) → **Vercel** (free)
- **Database** → **Neon** Postgres (free)
- **Login** → **Google OAuth** (free) via Auth.js
- **Conversione PDF (OMR)** → microservizio **Audiveris** (Docker) su **Render** (free)

> Ordine consigliato: Neon → Google → Render → Vercel. Segui i passi in ordine.

---

## 0. Prerequisiti (account, tutti gratis)
- [x] GitHub (repo già creato: `simiriva95/tasti`)
- [ ] Neon — https://neon.tech
- [ ] Google Cloud — https://console.cloud.google.com
- [ ] Render — https://render.com
- [ ] Vercel — https://vercel.com

Tieni aperto un blocco note: ci segni i valori da incollare dopo
(`DATABASE_URL`, `AUTH_SECRET`, ecc.).

---

## 1. Database — Neon
1. Vai su https://neon.tech → **Sign up** (con GitHub va bene).
2. **Create project** (region: Europe). 
3. Apri **Connection string** → copia la stringa
   `postgresql://...neon.tech/...?sslmode=require`.
   - Questo è il valore **`DATABASE_URL`** → segnalo.
4. Crea le tabelle (login, libreria). Sul tuo PC, nel progetto:
   - Metti `DATABASE_URL` in `.env.local`:
     ```
     DATABASE_URL="postgresql://...neon.tech/...?sslmode=require"
     ```
   - Lancia:
     ```
     npm run db:push
     ```
   - Deve dire che ha creato le tabelle (`user`, `account`, `session`,
     `verificationToken`, `song`).

---

## 2. Login — Google OAuth
1. https://console.cloud.google.com → in alto crea/seleziona un **progetto**.
2. Menu → **APIs & Services** → **OAuth consent screen**:
   - User type: **External** → Create.
   - App name: `Tasti`, email di supporto = la tua. Salva (basta il minimo).
   - In **Audience/Test users** aggiungi la tua email Google (per testare).
3. Menu → **APIs & Services** → **Credentials** → **Create credentials** →
   **OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized redirect URIs** (aggiungi entrambi):
     ```
     http://localhost:3000/api/auth/callback/google
     https://IL-TUO-DOMINIO.vercel.app/api/auth/callback/google
     ```
     (il dominio Vercel lo conoscerai al passo 4; puoi tornare qui ad aggiungerlo.)
   - Create → copia **Client ID** e **Client secret**:
     - `AUTH_GOOGLE_ID` = Client ID
     - `AUTH_GOOGLE_SECRET` = Client secret
4. Genera il segreto di sessione **`AUTH_SECRET`**:
   - In un terminale: `openssl rand -base64 32` (oppure usa un generatore di
     stringhe casuali di 32+ caratteri).

---

## 3. Conversione PDF — servizio Render
1. https://render.com → **New** → **Web Service** → **Build and deploy from a
   Git repository** → collega GitHub → scegli il repo **`tasti`**.
2. Impostazioni:
   - **Root Directory**: `omr-service`
   - **Runtime**: Render rileva il **Dockerfile** automaticamente.
   - **Instance type**: **Free**.
3. **Environment** → aggiungi una variabile:
   - `OMR_SERVICE_SECRET` = una stringa lunga casuale (es. `openssl rand -hex 24`).
     Segnala questo valore: serve **identico** anche su Vercel.
4. **Create Web Service** → aspetta il build (la prima volta installa Audiveris,
   ci mette qualche minuto).
5. Copia l'URL pubblico del servizio: `https://tasti-xxxx.onrender.com`
   - Questo è **`OMR_SERVICE_URL`** → segnalo.
6. Test rapido (facoltativo) da terminale:
   ```
   curl -F file=@spartito.pdf -H "x-omr-secret: IL_TUO_SECRET" https://tasti-xxxx.onrender.com/omr
   ```
   Deve tornare un JSON con `xml`, `name`, `bpm`.

> ⚠️ Render Free **dorme** dopo ~15 min di inattività. Il **primo PDF** dopo la
> pausa parte lento (~30–60s perché si risveglia il servizio). È normale.

---

## 4. App — Vercel
1. https://vercel.com → **Add New** → **Project** → importa il repo **`tasti`**.
   - Framework: Next.js (auto). **Root Directory**: lascia la radice (NON
     `omr-service`).
2. **Environment Variables** — aggiungi tutte queste:

   | Nome | Valore |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://IL-TUO-DOMINIO.vercel.app` |
   | `AUTH_SECRET` | (dal passo 2.4) |
   | `AUTH_GOOGLE_ID` | (dal passo 2.3) |
   | `AUTH_GOOGLE_SECRET` | (dal passo 2.3) |
   | `DATABASE_URL` | (dal passo 1.3) |
   | `OMR_SERVICE_URL` | (dal passo 3.5) |
   | `OMR_SERVICE_SECRET` | **stesso valore** del passo 3.3 |

3. **Deploy**. Al termine Vercel ti dà il dominio
   `https://tasti-xxxx.vercel.app`.
4. **Torna su Google** (passo 2.3) e assicurati che il redirect URI con il
   dominio Vercel reale sia presente:
   `https://tasti-xxxx.vercel.app/api/auth/callback/google`.
   - Se l'hai aggiunto dopo, su Vercel fai **Redeploy** (o aspetta il prossimo).
5. Se `NEXT_PUBLIC_SITE_URL` non corrisponde al dominio reale, correggilo e
   **Redeploy**.

---

## 5. Verifica finale (sul sito pubblico)
- [ ] `/` landing carica; `/robots.txt` e `/sitemap.xml` rispondono.
- [ ] **Accedi** con Google → torni su `/app` loggato (avatar in alto).
- [ ] Carica un **MIDI/MusicXML** → le note scendono, l'audio suona.
- [ ] Carica un **PDF** → dopo il (eventuale) risveglio di Render, vedi le note;
      se il PDF ha il tempo scritto, lo legge in automatico.
- [ ] Premi **Salva** → vai su **Libreria** → il brano c'è.
- [ ] Logout / login con un **altro** account → non vede i tuoi brani.

---

## Riepilogo variabili d'ambiente

**App (Vercel)**
```
NEXT_PUBLIC_SITE_URL   https://tasti-xxxx.vercel.app
AUTH_SECRET            (random 32+)
AUTH_GOOGLE_ID         (Google client id)
AUTH_GOOGLE_SECRET     (Google client secret)
DATABASE_URL           (Neon)
OMR_SERVICE_URL        https://tasti-xxxx.onrender.com
OMR_SERVICE_SECRET     (random, = a quello su Render)
```

**Servizio OMR (Render)**
```
OMR_SERVICE_SECRET     (random, = a quello su Vercel)
# AUDIVERIS_CMD e USE_XVFB sono già nel Dockerfile
```

---

## Sviluppo in locale
- Copia `.env.example` in `.env.local` e riempi `DATABASE_URL`,
  `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET` per testare login+libreria.
- **PDF in locale**: se hai **Audiveris** installato, imposta `AUDIVERIS_CMD`
  in `.env.local` → la conversione usa Audiveris locale (con lettura del tempo).
  Senza, `/api/omr` risponde 501 (MIDI/MusicXML funzionano lo stesso).
- Avvia: `npm run dev` → http://localhost:3000

---

## Problemi comuni
- **Login non funziona / redirect_uri_mismatch**: il redirect URI su Google deve
  combaciare ESATTAMENTE con il dominio Vercel + `/api/auth/callback/google`.
- **Il primo PDF è lentissimo**: è il cold start di Render Free. Dal secondo in
  poi è veloce. Per tenerlo sveglio: un cron esterno (es. cron-job.org gratis)
  che fa `GET https://tasti-xxxx.onrender.com/` ogni ~10 minuti.
- **L'audio non parte**: deve esserci un click (policy browser). Se proprio non
  suona, controlla la console: la CSP permette già il CDN dei suoni (gleitz).
- **Errore DB / tabelle mancanti**: hai lanciato `npm run db:push` con il
  `DATABASE_URL` giusto? Rilancialo.
- **`db:push` chiede conferme**: rispondi sì alla creazione tabelle.

---

## Aggiornare il sito
Ogni `git push` su `master` fa **auto-deploy** su Vercel (e su Render se hai
toccato `omr-service/`). Niente da fare a mano.
