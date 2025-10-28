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

### 4. Actualizează aplicația
1. Înlocuiește `YOUR_GOOGLE_CLIENT_ID` din `src/pages/Register.jsx` cu Client ID-ul real
2. Înlocuiește `YOUR_GOOGLE_CLIENT_ID` din `index.html` cu Client ID-ul real

### 5. Testează autentificarea
1. Rulează aplicația local: `npm run dev`
2. Mergi la pagina de înregistrare
3. Click pe butonul Google
4. Autentifică-te cu contul tău Google REAL
5. Formularul se va completa automat cu datele tale Google REALE

## Notă importantă:
- Client ID-ul trebuie să fie același în ambele fișiere
- Asigură-te că URI-urile autorizate includ domeniile tale de producție și development
- Testează întotdeauna înainte de deploy în producție
- Acum va folosi datele REALE de la Google, nu date fake!