# Deploy — Tasti (gratis: Vercel + Neon + Render)

Architettura: **app Next.js su Vercel** (free), **Neon Postgres** (free) come DB,
**login Google** (Auth.js), e un **microservizio Audiveris** su **Render** (free)
per convertire i PDF. L'app non esegue binari nativi → gira su Vercel.

## 1. Neon (database, free)
1. Crea un progetto su https://neon.tech (free tier).
2. Copia la connection string → sarà `DATABASE_URL`
   (`postgresql://...neon.tech/...?sslmode=require`).
3. In locale: metti `DATABASE_URL` in `.env.local`, poi crea le tabelle:
   ```
   npm run db:push
   ```
   (Crea le tabelle Auth.js + `song`.)

## 2. Google OAuth (login, free)
1. https://console.cloud.google.com → APIs & Services → Credentials →
   **Create OAuth client ID** → tipo **Web application**.
2. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://TUO-DOMINIO.vercel.app/api/auth/callback/google` (prod)
3. Copia Client ID/Secret → `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
4. Genera `AUTH_SECRET`: `openssl rand -base64 32`.

## 3. OMR service su Render (PDF, free)
1. Push del repo su GitHub.
2. Render → **New → Web Service** → repo → **Root Directory: `omr-service`** →
   Render rileva il `Dockerfile`. Piano **Free**.
3. Env del servizio: `OMR_SERVICE_SECRET` = una stringa lunga casuale
   (`AUDIVERIS_CMD` e `USE_XVFB` sono già nel Dockerfile).
4. Dopo il deploy, copia l'URL pubblico (`https://....onrender.com`).
   Test: `curl -F file=@spartito.pdf -H "x-omr-secret: IL_SECRET" $URL/omr`.
   - Nota: il free tier **dorme** dopo ~15 min → il primo PDF dopo la pausa è
     lento (cold start ~30-60s).

## 4. App su Vercel (free)
1. Vercel → **Import** del repo (root del progetto).
2. **Environment Variables**:
   - `NEXT_PUBLIC_SITE_URL` = `https://TUO-DOMINIO.vercel.app`
   - `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
   - `DATABASE_URL` (da Neon)
   - `OMR_SERVICE_URL` (URL Render), `OMR_SERVICE_SECRET` (stesso valore del servizio)
3. Deploy. Apri il dominio.

## Verifica
- `/` landing visibile; `/robots.txt`, `/sitemap.xml`, OG image OK.
- Login Google → torni su `/app` loggato.
- Carica un MIDI/MusicXML → suona. Carica un PDF → convertito da Render.
- "Salva" → compare in `/library`; logout/login altro utente non vede i tuoi brani.

## Note
- PDF in **locale**: avvia il servizio (`cd omr-service && npm i && npm start` con
  Audiveris installato, oppure `docker build`/`run`) e setta `OMR_SERVICE_URL`
  in `.env.local`. Senza, `/api/omr` risponde 501 (MIDI/MusicXML funzionano).
- Per tenere "sveglio" Render: un cron esterno che pinga `GET /` ogni ~10 min.
