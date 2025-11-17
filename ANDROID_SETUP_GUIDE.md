# Ghid Complet pentru Publicare Android (Google Play Store)

## 📋 Checklist Pre-Build

### 1. Cont Google Play Developer
- [ ] Cont Google Play Developer creat ($25 o singură dată)
- [ ] Acces la [Google Play Console](https://play.google.com/console)
- [ ] Contul de plată configurat

### 2. Iconuri și Assets

#### Icon Aplicație (App Icon)
- [ ] Icon 512x512px (PNG, fără transparență) - pentru Play Store
- [ ] Iconuri multiple dimensiuni pentru Android:
  - `mipmap-mdpi`: 48x48px
  - `mipmap-hdpi`: 72x72px
  - `mipmap-xhdpi`: 96x96px
  - `mipmap-xxhdpi`: 144x144px
  - `mipmap-xxxhdpi`: 192x192px

#### Splash Screen
- [ ] Splash screen pentru Android (opțional, Capacitor gestionează automat)

### 3. Configurare Android Studio

#### Deschide Proiectul
```bash
npm run cap:android
```
Aceasta va deschide Android Studio cu proiectul Android.

#### În Android Studio, configurează:

1. **Application ID:**
   - Deschide `android/app/build.gradle`
   - Verifică `applicationId "com.essence.afirmatia"`
   - **Notă:** Nu poate fi schimbat după publicare!

2. **Versiunea Aplicației:**
   - În `android/app/build.gradle`:
     ```gradle
     versionCode 1  // Incrementează la fiecare update
     versionName "1.0.0"  // Versiunea afișată utilizatorilor
     ```

3. **Icon Aplicație:**
   - Poziționare: `android/app/src/main/res/mipmap-*/ic_launcher.png`
   - Sau folosește Android Studio: File → New → Image Asset
   - Selectează "Launcher Icons (Adaptive and Legacy)"
   - Upload icon-ul tău

4. **Signing Config:**
   - Trebuie să creezi un keystore pentru semnarea aplicației
   - **IMPORTANT:** Păstrează keystore-ul în siguranță! Este necesar pentru toate update-urile viitoare

### 4. Creare Keystore

#### Generare Keystore
```bash
cd android/app
keytool -genkey -v -keystore afirmatia-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias afirmatia
```

**Informații necesare:**
- Parolă pentru keystore (păstrează-o în siguranță!)
- Parolă pentru alias
- Nume, organizație, etc.

#### Configurare Signing în build.gradle
Adaugă în `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('afirmatia-release-key.jks')
            storePassword 'PAROLA_KEYSTORE'
            keyAlias 'afirmatia'
            keyPassword 'PAROLA_ALIAS'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

**⚠️ SECURITATE:** Nu comite keystore-ul sau parolele în Git! Adaugă în `.gitignore`:
```
*.jks
*.keystore
```

### 5. Testare pe Dispozitiv

1. **Activează Developer Mode:**
   - Settings → About Phone → Tap "Build Number" de 7 ori
   - Settings → Developer Options → Enable "USB Debugging"

2. **Conectează Dispozitivul:**
   - Conectează Android device la computer
   - Trust computer pe dispozitiv

3. **Run în Android Studio:**
   - Click pe "Run" (▶) sau Shift+F10
   - Selectează dispozitivul
   - Aplicația va fi instalată și lansată

### 6. Build pentru Google Play

#### Generate Signed Bundle / APK
1. În Android Studio: Build → Generate Signed Bundle / APK
2. Alege "Android App Bundle" (recomandat pentru Play Store)
3. Selectează keystore-ul creat
4. Alege "release" build variant
5. Click "Finish"
6. Bundle-ul va fi generat în `android/app/release/app-release.aab`

### 7. Configurare Google Play Console

1. **Creează Aplicația:**
   - Deschide [Google Play Console](https://play.google.com/console)
   - All apps → Create app
   - Completează:
     - App name: "Afirmația Mea"
     - Default language: Romanian
     - App or game: App
     - Free or paid: Free (sau Paid)
     - Privacy Policy: URL către politica de confidențialitate

2. **Store Listing:**
   - Short description (până la 80 caractere)
   - Full description (până la 4000 caractere)
   - Screenshots:
     - Phone: minim 2, maxim 8 (16:9 sau 9:16)
     - Tablet (opțional): minim 1, maxim 8
   - High-res icon: 512x512px
   - Feature graphic: 1024x500px
   - Categorii și tag-uri

3. **Content Rating:**
   - Completează questionnaire-ul
   - Așteaptă aprobarea (de obicei instant)

4. **App Access:**
   - Declară dacă aplicația este publică sau necesită acces

5. **Ads:**
   - Declară dacă aplicația conține anunțuri

6. **Data Safety:**
   - Declară ce date colectezi și cum le folosești
   - Obligatoriu pentru toate aplicațiile noi

7. **Target Audience:**
   - Selectează vârsta minimă

### 8. Upload și Publicare

1. **Upload AAB:**
   - Production → Create new release
   - Upload AAB-ul generat
   - Completează "Release notes"

2. **Review:**
   - Verifică toate secțiunile (Store listing, Content rating, etc.)
   - Toate trebuie să fie complete (verzi)

3. **Submit:**
   - Click "Start rollout to Production"
   - Aplicația va fi trimisă pentru review (de obicei 1-3 zile)

## 🔧 Comenzi Utile

```bash
# Sync web assets cu Android
npm run cap:sync

# Deschide Android Studio
npm run cap:android

# Build pentru producție
npm run build
npm run cap:sync
```

## ⚠️ Probleme Comune

### Gradle sync failed
- File → Invalidate Caches / Restart
- Re-run `npm run cap:sync`

### Keystore not found
- Verifică că keystore-ul este în `android/app/`
- Verifică căre căile în `build.gradle` sunt corecte

### Build eșuează
- Clean Project: Build → Clean Project
- Rebuild Project: Build → Rebuild Project

## 📝 Notițe Importante

- **Application ID:** Nu poate fi schimbat după publicare
- **Keystore:** Păstrează-l în siguranță! Este necesar pentru toate update-urile
- **Version Code:** Trebuie incrementat la fiecare update
- **Review Time:** De obicei 1-3 zile pentru prima publicare

## 🎯 Următorii Pași

1. Creează cont Google Play Developer
2. Generează iconuri pentru toate dimensiunile
3. Creează keystore pentru semnare
4. Configurează versiunea în build.gradle
5. Testează pe dispozitiv real
6. Generează AAB signed
7. Creează aplicația în Play Console
8. Upload AAB și completează informațiile
9. Submit pentru review

