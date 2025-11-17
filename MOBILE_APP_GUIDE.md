# Ghid pentru Aplicație Mobilă - App Store & Google Play

## 🎯 Prioritate: iOS (Apple) → Android (Google)

## ✅ Ce s-a făcut

1. **Capacitor instalat** - Framework pentru a transforma aplicația web în aplicație mobilă
2. **Platformele adăugate:**
   - ✅ iOS (prioritar - App Store)
   - ✅ Android (după iOS - Google Play)
3. **Configurație creată** - `capacitor.config.json`
4. **Scripturi adăugate** în `package.json`
5. **Ghiduri detaliate create:**
   - `IOS_SETUP_GUIDE.md` - Ghid complet pentru iOS/App Store
   - `ANDROID_SETUP_GUIDE.md` - Ghid complet pentru Android/Google Play

## 📱 Pași următori

### ⚡ PRIORITAR: Pentru iOS (App Store)

**Vezi ghidul complet:** `IOS_SETUP_GUIDE.md`

**Pași rapizi:**
1. Cont Apple Developer ($99/an) - [developer.apple.com](https://developer.apple.com)
2. Instalează Xcode complet (nu doar Command Line Tools)
3. Generează icon 1024x1024px din logo
4. Rulează `npm run cap:ios` pentru a deschide Xcode
5. Configurează Bundle ID și Team în Xcode
6. Testează pe iPhone/iPad real
7. Creează Archive și upload la App Store Connect
8. Completează informațiile în App Store Connect
9. Submit pentru review

### Pentru Android (Google Play Store) - DUPĂ iOS

1. **Deschide proiectul Android:**
   ```bash
   npm run cap:android
   ```
   Aceasta va deschide Android Studio.

2. **Generează iconuri și splash screens:**
   - Iconuri: 1024x1024px (pentru Play Store)
   - Splash screens: 2732x2732px pentru Android
   - Poți folosi tool-uri online sau să le creezi manual

3. **Configurează aplicația în Android Studio:**
   - Deschide `android/app/src/main/res/`
   - Adaugă iconuri în `mipmap-*` folders
   - Adaugă splash screens în `drawable` folders

4. **Build pentru producție:**
   - În Android Studio: Build → Generate Signed Bundle / APK
   - Creează un keystore (dacă nu ai deja)
   - Generează AAB (Android App Bundle) pentru Play Store

5. **Publică pe Google Play:**
   - Cont Google Play Developer ($25 o singură dată)
   - Creează aplicația în Google Play Console
   - Încarcă AAB-ul
   - Completează informațiile (descriere, screenshots, etc.)

### Pentru iOS (App Store)

1. **Instalează Xcode complet** (nu doar Command Line Tools):
   - Descarcă din App Store
   - Instalează CocoaPods: `sudo gem install cocoapods`

2. **Deschide proiectul iOS:**
   ```bash
   npm run cap:ios
   ```
   Aceasta va deschide Xcode.

3. **Generează iconuri și splash screens:**
   - Iconuri: 1024x1024px (pentru App Store)
   - Splash screens: diferite dimensiuni pentru iOS
   - Poți folosi tool-uri online sau să le creezi manual

4. **Configurează aplicația în Xcode:**
   - Deschide `ios/App/App.xcworkspace`
   - Adaugă iconuri în Assets.xcassets
   - Configurează Bundle Identifier, Version, etc.

5. **Build pentru producție:**
   - În Xcode: Product → Archive
   - Distribuie app-ul prin App Store Connect

6. **Publică pe App Store:**
   - Cont Apple Developer ($99/an)
   - Creează aplicația în App Store Connect
   - Încarcă build-ul
   - Completează informațiile (descriere, screenshots, etc.)

## 🔧 Scripturi disponibile

- `npm run cap:sync` - Build și sincronizează cu platformele native
- `npm run cap:android` - Deschide Android Studio
- `npm run cap:ios` - Deschide Xcode
- `npm run cap:copy` - Copiază doar assets-urile web
- `npm run cap:update` - Actualizează dependențele native

## 📝 Note importante

- **După fiecare modificare în cod web:** Rulează `npm run cap:sync` pentru a actualiza aplicația mobilă
- **Iconuri:** Trebuie să fie în format PNG, fără transparență
- **Splash screens:** Configurate în `capacitor.config.json`
- **Testare:** Testează pe dispozitive reale înainte de publicare

## 🎨 Resurse pentru iconuri și splash screens

- [App Icon Generator](https://www.appicon.co/)
- [Icon Kitchen](https://icon.kitchen/)
- [Splash Screen Generator](https://www.appicon.co/splash)

## 🔐 Securitate

- **Android:** Păstrează keystore-ul în siguranță (necesar pentru update-uri)
- **iOS:** Certificatul de dezvoltare trebuie reînnoit anual

