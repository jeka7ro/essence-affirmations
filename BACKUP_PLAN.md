# Plan Backup Complet și Restaurare

## Obiective

1. **Backup automat** cu setări de oră și interval
2. **Backup complet** care salvează TOATE datele utilizatorilor pentru restaurare fără pierderi
3. **Restaurare completă** care poate recrea utilizatorii exact cum erau, inclusiv crearea utilizatorilor noi

---

## Date care trebuie salvate în backup

### Date personale (obligatorii pentru restaurare completă)
- ✅ `username` - utilizatorul să poată loga
- ✅ `email` - identificare
- ✅ `first_name`, `last_name`, `full_name` - nume complet
- ✅ `phone` - telefon
- ✅ `birth_date` - data naștere
- ✅ `sex` - M/F
- ✅ `pin` - **CRITIC** - fără PIN, utilizatorul nu se poate loga
- ✅ `avatar` - emoji sau imagine (base64/blob)
- ✅ `preferences` - JSON cu setări (tema, popup-uri văzute, etc.)
- ✅ `role` - admin/user

### Date challenge (obligatorii pentru progres)
- ✅ `affirmation` - **AFIRMAȚIA PERSONALĂ** - CRITIC
- ✅ `total_repetitions` - total general
- ✅ `today_repetitions` - repetări astăzi
- ✅ `current_day` - ziua curentă
- ✅ `last_date` - ultima dată cu repetări
- ✅ `repetition_history` - **ISTORIC COMPLET** - JSON cu toate repetările cu data și ora
- ✅ `completed_days` - zilele marcate ca complete
- ✅ `challenge_start_date` - data începutului provocării

### Date grup (opționale)
- ✅ `group_id` - grupul din care face parte
- ✅ `group_joined_at` - când a intrat în grup

### Date sistem
- ✅ `created_at` - când s-a înregistrat
- ✅ `last_login` - ultima logare

---

## Status Actual

### ✅ Ce funcționează deja:
1. Backup salvează `SELECT * FROM users` - deci salvează TOATE datele
2. Backend are `auto_backup_time` (ora) și `auto_backup_interval_hours` (interval)
3. UI-ul permite setarea ora și interval în Admin → Setări Backup
4. Backup automat primește nume automat: "Backup automat DD.MM.YYYY HH:MM"
5. Restaurarea poate actualiza utilizatori existenți

### ❌ Ce trebuie îmbunătățit:
1. **Bug**: `now` duplicat în `performAutoBackup` (linia 1203 și 1245)
2. **Restaurare incompletă**: Restaurarea doar ACTUALIZEAZĂ utilizatori existenți, nu CREEAZĂ noi utilizatori dacă au fost șterși
3. **Verificare**: Trebuie să ne asigurăm că backup-ul include TOATE câmpurile necesare

---

## Plan de Implementare

### Pas 1: Corectare Bug `now` duplicat
- **Fișier**: `server.js`, funcția `performAutoBackup`
- **Problema**: `now` este declarat de două ori (linia 1203 și 1245)
- **Soluție**: Șterge declarația duplicată de la linia 1245

### Pas 2: Îmbunătățire Restaurare - Creare Utilizatori Noi
- **Fișier**: `server.js`, endpoint `POST /api/backups/:id/restore`
- **Problema**: Doar actualizează utilizatori existenți, nu creează noi
- **Soluție**: 
  - Verifică dacă utilizatorul există
  - Dacă NU există, îl CREEAZĂ (INSERT)
  - Dacă există, îl actualizează (UPDATE)
- **Importanță**: Dacă un utilizator este șters accidental, restaurarea trebuie să îl recreze complet

### Pas 3: Verificare Backup Complet
- **Verificare manuală**: Testează că backup-ul salvează:
  - `affirmation` (afirmația personală)
  - `pin` (pentru login)
  - `repetition_history` complet (cu toate datele și orele)
  - `total_repetitions`
  - Toate datele personale
- **Test**: Creează backup → șterge utilizator → restore → verifică că totul e restorat

### Pas 4: Testare Completă
1. Creează un utilizator de test cu:
   - Afirmație personală
   - Repetări (minimum 10-20)
   - PIN
   - Date personale complete
2. Creează backup manual
3. Șterge utilizatorul
4. Restaurează backup-ul
5. Verifică:
   - ✅ Utilizatorul există
   - ✅ Poate loga cu PIN-ul original
   - ✅ Afirmația este salvată
   - ✅ Repetările sunt restorate (total și istoric)
   - ✅ Datele personale sunt restorate

---

## Structura Backup JSON

```json
{
  "users": [
    {
      "id": 1,
      "username": "test_user",
      "email": "test@example.com",
      "pin": "1234",
      "affirmation": "Eu sunt puternic și încrezător",
      "total_repetitions": 150,
      "repetition_history": "[{\"date\":\"2025-10-28\",\"time\":\"14:30:00\",\"count\":1},...]",
      "today_repetitions": 25,
      "current_day": 5,
      "completed_days": "[1,2,3,4]",
      "challenge_start_date": "2025-10-24",
      "first_name": "Test",
      "last_name": "User",
      "birth_date": "1990-01-01",
      "sex": "M",
      "avatar": "👨",
      "preferences": "{\"theme\":\"dark\",...}",
      "group_id": 1,
      "created_at": "2025-10-24T10:00:00Z"
    }
  ],
  "groups": [...],
  "messages": [...],
  "activities": [...],
  "backup_timestamp": "2025-10-28T17:00:00Z"
}
```

---

## Endpoints API

### Backup Manual
- `POST /api/backups/create`
- Body: `{ description?: string }`
- Rezultat: Creează backup cu toate datele

### Backup Automat
- Rulează automat la ora setată în `backup_settings.auto_backup_time`
- Verifică la fiecare oră dacă e timpul pentru backup

### Restaurare
- `POST /api/backups/:id/restore`
- Body: `{ restoreType: 'all' | 'user', userId?: number }`
- Rezultat: Restaurează utilizatori (UPDATE sau INSERT)

---

## Pași de Testare

1. **Test Backup Manual**:
   - Admin → Management Backup → "Creează Backup Manual"
   - Verifică că apare în listă cu nume corect

2. **Test Backup Automat**:
   - Admin → Setări Backup → Activează "Backup automat"
   - Setează ora la câteva minute în viitor
   - Așteaptă → verifică că backup-ul apare automat

3. **Test Restaurare Completă**:
   - Creează utilizator de test cu date complete
   - Creează backup
   - Șterge utilizatorul din Admin
   - Restaurează backup-ul (toți utilizatorii)
   - Verifică că utilizatorul a fost recreat cu TOATE datele

---

## Concluzie

Backup-ul actual SALVEAZĂ toate datele necesare (`SELECT * FROM users`). 
**Problemele principale** sunt:
1. Bug-ul cu `now` duplicat (minor, dar trebuie corectat)
2. Restaurarea nu creează utilizatori noi (CRITIC - trebuie rezolvat)

După implementarea acestor îmbunătățiri, sistemul de backup va fi complet funcțional și va permite restaurare completă fără pierderi de date.

