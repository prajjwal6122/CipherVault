# Quick Render + Vercel Deployment

Deploy backend on Render and frontend on Vercel in 15 minutes.

## Step 1: MongoDB Atlas (5 mins)
- [ ] Go to [mongodb.com/cloud](https://www.mongodb.com/cloud)
- [ ] Create free cluster
- [ ] Database Access → Add user (simple password, no special chars)
- [ ] Network Access → Add IP: `0.0.0.0/0` (allow all)
- [ ] Get connection string: `mongodb+srv://username:password@wanderon.qqm0de1.mongodb.net/ciphervault`

## Step 2: Deploy Backend to Render (5 mins)
- [ ] Go to [render.com](https://render.com)
- [ ] Sign up with GitHub
- [ ] Click "New +" → "Web Service"
- [ ] Connect repo: `prajjwal6122/CipherVault`
- [ ] Settings:
  - **Name**: `ciphervault-api`
  - **Root Directory**: Leave empty
  - **Build Command**: `cd backend && npm install`
  - **Start Command**: `cd backend && npm start`
  - **Instance Type**: Free
- [ ] Environment Variables (click "Add Environment Variable"):
  ```
  NODE_ENV=production
  MONGODB_URI=mongodb+srv://username:password@wanderon.qqm0de1.mongodb.net/ciphervault
  JWT_SECRET=your-random-secret-here-min-32-chars
  JWT_EXPIRY=3600
  PORT=3000
  ```
- [ ] Click "Create Web Service"
- [ ] Wait 5-10 mins for first deploy
- [ ] Copy Render URL: `https://ciphervault-api.onrender.com`

## Step 3: Deploy Frontend to Vercel (3 mins)
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign up with GitHub
- [ ] Click "New Project"
- [ ] Import: `prajjwal6122/CipherVault`
- [ ] Settings:
  - **Framework Preset**: Vite
  - **Root Directory**: `frontend`
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
- [ ] Environment Variables:
  ```
  VITE_API_BASE_URL=https://ciphervault-api.onrender.com
  ```
- [ ] Click "Deploy"
- [ ] Frontend live at: `https://ciphervault.vercel.app` (or your custom URL)

## Step 4: Enable CORS (2 mins)
- [ ] Go to Render dashboard → `ciphervault-api`
- [ ] Environment tab
- [ ] Add new variable:
  ```
  ALLOWED_ORIGINS=https://ciphervault.vercel.app
  ```
  (replace with your actual Vercel URL)
- [ ] Save (triggers auto-redeploy)

## Done! 🚀
- **Frontend**: https://ciphervault.vercel.app
- **Backend**: https://ciphervault-api.onrender.com
- **Database**: MongoDB Atlas

---

## Test Your Deployment
```bash
# Test backend
curl https://ciphervault-api.onrender.com/api/v1/health

# Test frontend
curl https://ciphervault.vercel.app
```

---

## Important Notes
- **Render free tier**: Spins down after 15 mins inactivity (first request after ~30s cold start)
- **Vercel**: Always on, no cold starts
- **Auto-deploy**: Both platforms redeploy automatically on git push

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 502 Bad Gateway on Render | Check Render logs; ensure build/start commands are correct |
| MongoDB auth failed | Verify username/password in connection string; no special chars |
| CORS errors | Update `ALLOWED_ORIGINS` in Render with correct Vercel URL |
| Render service won't start | Check `backend/server.js` exists and `npm start` works locally |
| Frontend shows API error | Verify `VITE_API_BASE_URL` in Vercel matches Render URL exactly |
