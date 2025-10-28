# Deploy Instructions

## Prerequisites
1. GitHub account
2. Render account (free tier)
3. Vercel account (free tier)

## Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/essence-affirmations.git
git push -u origin main
```

## Step 2: Deploy Backend on Render
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Use these settings:
   - Build Command: `npm install`
   - Start Command: `npm run server`
   - Environment: Node
5. Add database:
   - Click "New +" → "PostgreSQL"
   - Name: `essence-affirmations-db`
   - Create and connect to web service
6. Deploy!

## Step 3: Update Frontend API URL
After Render deployment, copy the backend URL (e.g., `https://essence-affirmations-api.onrender.com`)

Update `src/api/base44Client.js`:
```javascript
const API_URL = 'YOUR_RENDER_URL/api';
```

## Step 4: Deploy Frontend on Vercel
1. Go to https://vercel.com
2. Click "Import Project"
3. Connect your GitHub repository
4. Framework Preset: Vite
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Deploy!

## Step 5: Update Vercel Environment Variables
Go to Vercel project settings → Environment Variables:
- Add `VITE_API_URL` = your Render backend URL

## Your app is now live! 🎉

