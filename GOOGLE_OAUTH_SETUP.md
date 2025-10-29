# Configurare Google OAuth pentru aplicația Essence Affirmations

## IMPORTANT: Pentru a funcționa, trebuie să obții Client ID-ul real de la Google!

### Pași pentru configurarea Google OAuth:

### 1. Creează un proiect Google Cloud Console
1. Mergi la [Google Cloud Console](https://console.cloud.google.com/)
2. Creează un proiect nou sau selectează unul existent
3. Activează Google+ API

### 2. Configurează OAuth consent screen
1. Mergi la "APIs & Services" > "OAuth consent screen"
2. Selectează "External" pentru tipul de utilizator
3. Completează informațiile:
   - App name: "Essence Affirmations"
   - User support email: email-ul tău
   - Developer contact: email-ul tău
4. Adaugă scope-uri: `email`, `profile`, `openid`

### 3. Creează credentiale OAuth 2.0
1. Mergi la "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Selectează "Web application"
4. Adaugă URI-uri autorizate:
   - `https://www.myessence.ro`
   - `https://myessence.ro`
   - `https://essence-affirmations.vercel.app`
   - `http://localhost:5173` (pentru development)
5. Copiază Client ID-ul generat

### 4. Configurează variabilele de mediu

#### Pentru Vercel (Producție):
1. Mergi la [Vercel Dashboard](https://vercel.com/dashboard)
2. Selectează proiectul tău "essence-affirmations"
3. Click pe "Settings" > "Environment Variables"
4. Adaugă o variabilă nouă:
   - **Name**: `VITE_GOOGLE_CLIENT_ID`
   - **Value**: Client ID-ul copiat din Google Cloud Console (ex: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
   - **Environment**: Production, Preview, Development (bifează toate)
5. Click "Save"
6. **IMPORTANT**: Trebuie să redeploy aplicația pentru ca variabilele să se actualizeze!
   - Mergi la "Deployments"
   - Click pe "..." de pe ultimul deployment
   - Selectează "Redeploy"

#### Pentru Development Local:
1. Creează un fișier `.env.local` în root-ul proiectului
2. Adaugă linia:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   ```
3. Nu commit acest fișier în Git (este deja în `.gitignore`)

### 5. Testează autentificarea
1. Rulează aplicația local: `npm run dev`
2. Mergi la pagina de înregistrare
3. Click pe butonul Google
4. Autentifică-te cu contul tău Google REAL
5. Formularul se va completa automat cu datele tale Google REALE

## Troubleshooting (Rezolvare probleme)

### Eroarea "400: The given client ID is not found"
**Cauze posibile:**
1. Client ID-ul nu este setat corect pe Vercel
   - Verifică că numele variabilei este exact `VITE_GOOGLE_CLIENT_ID` (cu majuscule)
   - Verifică că valoarea este identică cu cea din Google Cloud Console
   - **Ai făcut redeploy după setarea variabilei?** (Este obligatoriu!)

2. URI-urile autorizate nu includ domeniul tău
   - Mergi în Google Cloud Console > APIs & Services > Credentials
   - Click pe Client ID-ul tău
   - Verifică că "Authorized JavaScript origins" include:
     - `https://www.myessence.ro`
     - `https://myessence.ro`
     - `https://essence-affirmations.vercel.app`
     - Pentru development: `http://localhost:5173`
   
3. Client ID-ul este din alt proiect Google Cloud
   - Verifică că folosești Client ID-ul corect din proiectul potrivit

### Eroarea "Google Sign-In script failed to load"
**Soluții:**
1. Verifică conexiunea la internet
2. Verifică că script-ul Google este inclus în `index.html`:
   ```html
   <script src="https://accounts.google.com/gsi/client" async defer></script>
   ```
3. Verifică consola browser-ului pentru erori de rețea (Network tab)

### Butonul Google nu apare
**Verificări:**
1. Deschide consola browser-ului (F12) și caută mesaje de tip `🔍 Google OAuth Debug`
2. Dacă vezi `hasClientId: false`, variabila de mediu nu este setată
3. Dacă vezi `hasGoogleScript: false`, script-ul Google nu s-a încărcat

### Cum să verifici dacă funcționează:
1. Deschide consola browser-ului (F12)
2. Mergi la pagina de înregistrare
3. Caută mesaje care încep cu:
   - `🔍` - Debug info despre configurație
   - `✅` - Success messages
   - `❌` - Error messages
4. Dacă vezi `✅ Google Sign-In button rendered successfully`, butonul ar trebui să apară

## Notă importantă:
- Client ID-ul trebuie să fie același pentru toate environment-urile
- **IMPORTANT**: După setarea variabilei pe Vercel, TREBUIE să faci redeploy!
- URI-urile autorizate trebuie să includă EXACT domeniile tale (fără trailing slash)
- Testează întotdeauna înainte de deploy în producție
- Dacă problemele persistă, verifică că OAuth consent screen este complet configurat în Google Cloud Console