# Configurare Google OAuth pentru Autentificare Reală

## Pași pentru a obține Google Client ID:

1. **Accesează Google Cloud Console:**
   - Mergi la: https://console.cloud.google.com/
   - Fă login cu contul tău Google

2. **Creează sau selectează proiectul:**
   - Click pe dropdown-ul de proiecte din partea de sus
   - Creează un proiect nou sau selectează unul existent

3. **Activează Google Identity API:**
   - Mergi la "APIs & Services" -> "Library"
   - Caută "Google Identity" și activează API-ul

4. **Creează OAuth Client ID:**
   - Mergi la "APIs & Services" -> "Credentials"
   - Click "Create Credentials" -> "OAuth client ID"
   - Selectează "Web application"

5. **Configurează autorizările:**
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `https://essence-affirmations.vercel.app`
   - **Authorized redirect URIs:**
     - `http://localhost:3000`
     - `https://essence-affirmations.vercel.app`

6. **Copiază Client ID-ul:**
   - După creare, copiază Client ID-ul (format: `xxxxx.apps.googleusercontent.com`)

## Configurare în aplicație:

1. **Pentru dezvoltare locală:**
   - Creează fișierul `.env.local` în root-ul proiectului
   - Adaugă: `VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com`

2. **Pentru producție pe Vercel:**
   - Mergi la dashboard-ul Vercel
   - Selectează proiectul
   - Mergi la "Settings" -> "Environment Variables"
   - Adaugă: `VITE_GOOGLE_CLIENT_ID` cu valoarea Client ID-ului

## Testare:

După configurare, butonul Google va deschide popup-ul real de autentificare Google și va pre-completa formularul cu datele reale din contul tău Google.
