# Ghid Complet pentru Publicare iOS (App Store) - PRIORITAR

## 📋 Checklist Pre-Build

### 1. Cont Apple Developer
- [ ] Cont Apple Developer activ ($99/an)
- [ ] Acces la [App Store Connect](https://appstoreconnect.apple.com)
- [ ] Certificat de dezvoltare creat
- [ ] Provisioning Profile configurat

### 2. Iconuri și Assets

#### Icon Aplicație (App Icon)
- [ ] Icon 1024x1024px (PNG, fără transparență)
- [ ] Format: PNG, RGB, fără alpha channel
- [ ] Poziționare: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
- [ ] **Notă:** Trebuie să fie exact 1024x1024px

#### Splash Screen
- [ ] Splash screen 2732x2732px (deja există în `Assets.xcassets/Splash.imageset/`)
- [ ] Sau poți folosi LaunchScreen.storyboard pentru splash custom

### 3. Configurare Xcode

#### Deschide Proiectul
```bash
npm run cap:ios
```
Aceasta va deschide Xcode cu proiectul iOS.

#### În Xcode, configurează:

1. **Bundle Identifier:**
   - Selectează proiectul "App" în navigator
   - Tab "Signing & Capabilities"
   - Bundle Identifier: `com.essence.afirmatia`
   - Team: Selectează echipa ta Apple Developer

2. **Versiunea Aplicației:**
   - Tab "General"
   - Version: `1.0.0` (sau versiunea dorită)
   - Build: `1` (incrementează la fiecare build)

3. **Icon Aplicație:**
   - Deschide `Assets.xcassets` → `AppIcon`
   - Drag & drop icon-ul 1024x1024px în slot-ul "App Icon - iOS 1024pt"

4. **Orientări Suportate:**
   - Tab "General" → "Deployment Info"
   - Verifică orientările dorite (Portrait, Landscape, etc.)

5. **Capabilități (dacă e nevoie):**
   - Tab "Signing & Capabilities"
   - Adaugă capabilități dacă aplicația le necesită (Push Notifications, etc.)

### 4. Testare pe Dispozitiv

1. **Conectează iPhone/iPad:**
   - Conectează dispozitivul la Mac
   - Trust computer pe dispozitiv

2. **Selectează Dispozitivul:**
   - În Xcode, selectează dispozitivul din dropdown-ul de lângă "Run"

3. **Build și Run:**
   - Click pe "Run" (⌘R) sau Product → Run
   - Aplicația va fi instalată pe dispozitiv

### 5. Build pentru App Store

#### Archive Build
1. În Xcode: Product → Destination → "Any iOS Device (arm64)"
2. Product → Archive
3. Așteaptă ca archive-ul să fie creat

#### Upload la App Store Connect
1. Window → Organizer (sau ⌘⇧O)
2. Selectează archive-ul creat
3. Click "Distribute App"
4. Alege "App Store Connect"
5. Alege "Upload"
6. Urmează pașii pentru upload

### 6. Configurare App Store Connect

1. **Creează Aplicația:**
   - Deschide [App Store Connect](https://appstoreconnect.apple.com)
   - My Apps → "+" → New App
   - Completează:
     - Platform: iOS
     - Name: "Afirmația Mea"
     - Primary Language: Romanian
     - Bundle ID: `com.essence.afirmatia`
     - SKU: `afirmatia-001` (sau alt identificator unic)

2. **Informații Aplicație:**
   - Descriere (până la 4000 caractere)
   - Keywords (până la 100 caractere)
   - Support URL
   - Marketing URL (opțional)
   - Privacy Policy URL (obligatoriu pentru GDPR)

3. **Screenshots:**
   - iPhone 6.7" (iPhone 14 Pro Max): 1290 x 2796 px
   - iPhone 6.5" (iPhone 11 Pro Max): 1242 x 2688 px
   - iPhone 5.5" (iPhone 8 Plus): 1242 x 2208 px
   - iPad Pro 12.9": 2048 x 2732 px
   - iPad Pro 11": 1668 x 2388 px

4. **Icon Aplicație:**
   - 1024x1024px (același ca în Xcode)

5. **Categorii:**
   - Primary Category: Health & Fitness (sau altă categorie relevantă)
   - Secondary Category (opțional)

6. **Rating:**
   - Completează questionnaire-ul pentru rating-ul aplicației

7. **Preț:**
   - Alege "Free" sau setează prețul

### 7. Submit pentru Review

1. **Build:**
   - După ce build-ul a fost procesat (poate dura 10-30 minute)
   - Selectează build-ul în "Build" section

2. **Review Information:**
   - Contact Information
   - Demo Account (dacă e nevoie)
   - Notes (pentru reviewer)

3. **Submit:**
   - Click "Submit for Review"
   - Aplicația va fi trimisă pentru review (1-3 zile de obicei)

## 🔧 Comenzi Utile

```bash
# Sync web assets cu iOS
npm run cap:sync

# Deschide Xcode
npm run cap:ios

# Build pentru producție
npm run build
npm run cap:sync
```

## ⚠️ Probleme Comune

### CocoaPods nu este instalat
```bash
sudo gem install cocoapods
cd ios/App
pod install
```

### Xcode nu găsește certificatul
- Verifică în Xcode → Preferences → Accounts
- Adaugă Apple ID-ul tău
- Download Manual Profiles

### Build eșuează
- Clean Build Folder: Product → Clean Build Folder (⇧⌘K)
- Delete Derived Data
- Re-run `pod install`

## 📝 Notițe Importante

- **Bundle ID:** Trebuie să fie unic și nu poate fi schimbat după publicare
- **Versiunea:** Trebuie să fie incrementată la fiecare update
- **Review Time:** De obicei 1-3 zile, dar poate dura mai mult
- **Rejections:** Dacă aplicația este respinsă, vei primi feedback detaliat

## 🎯 Următorii Pași

1. Generează icon 1024x1024px din logo-ul existent
2. Configurează Bundle ID și Team în Xcode
3. Testează pe dispozitiv real
4. Creează archive și upload la App Store Connect
5. Completează informațiile în App Store Connect
6. Submit pentru review

