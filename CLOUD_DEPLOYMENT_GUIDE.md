# CipherVault Cloud Deployment Guide

Deploy your CipherVault app to **Vercel** (frontend) + **Render** (backend) + **MongoDB Atlas** (database).

## Quick Setup (15 mins)

### 1. MongoDB Atlas Setup
- Go to [mongodb.com/cloud](https://www.mongodb.com/cloud)
- Sign up (free tier available)
- Create a cluster
- Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/dbname`
- Whitelist your IP (or allow all for testing)
- Save this URI—you'll need it for Render

### 2. Backend Deployment (Render)
- Go to [render.com](https://render.com)
- Sign up with GitHub
- Click "New +" → "Web Service"
- Connect your GitHub repo (`prajjwal6122/CipherVault`)
- Name: `ciphervault-api`
- Environment: `Node`
- Build command: `npm install && npm run build` (if applicable)
- Start command: `node backend/server.js`
- Set Environment Variables:
  ```
  NODE_ENV=production
  MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ciphervault
  JWT_SECRET=your-secure-random-secret-here
  JWT_EXPIRY=3600
  LOG_LEVEL=info
  ```
- Click "Create Web Service"
- Copy the backend URL once deployed (e.g., `https://ciphervault-api.onrender.com`)

### 3. Frontend Deployment (Vercel)
- Go to [vercel.com](https://vercel.com)
- Sign up with GitHub
- Click "New Project"
- Import your GitHub repo (`prajjwal6122/CipherVault`)
- Project name: `ciphervault-web`
- Framework: `Vite` (auto-detected)
- Root directory: `frontend`
- Environment Variables:
  ```
  VITE_API_BASE_URL=https://ciphervault-api.onrender.com
  ```
- Click "Deploy"
- Your frontend is live at `https://ciphervault-web.vercel.app`

### 4. Connect Backend to Frontend
- Update Render environment variables with frontend URL (CORS):
  - Go to Render dashboard → `ciphervault-api` → "Environment"
  - Add: `ALLOWED_ORIGINS=https://ciphervault-web.vercel.app`
  - Deploy

## Post-Deployment Verification

Test the live app:
```bash
# Frontend
curl https://ciphervault-web.vercel.app

# Backend health
curl https://ciphervault-api.onrender.com/api/v1/health

# Upload a record
curl -X POST https://ciphervault-api.onrender.com/api/v1/records/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.csv","content":"...","password":"test"}'
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Verify `ALLOWED_ORIGINS` on Render includes your Vercel domain |
| MongoDB connection timeout | Check IP whitelist on MongoDB Atlas; allow all for dev |
| 502 Bad Gateway | Check Render logs: `backend/server.js` start command correct? |
| Frontend shows `API Error` | Verify `VITE_API_BASE_URL` points to deployed Render backend |

## Next Steps

- [ ] Set up CI/CD: Render auto-redeploys on `git push`; same for Vercel
- [ ] Enable HTTPS: Both platforms provide free SSL
- [ ] Add custom domain: Update DNS to point to Render (backend) and Vercel (frontend)
- [ ] Monitor: Set up alerts in Render/Vercel dashboards
- [ ] Backup: Enable MongoDB Atlas automated backups

## Cost Estimate (Monthly)

- **MongoDB Atlas**: Free (512 MB) to ~$10/mo
- **Render**: Free to ~$7/mo (Web Service)
- **Vercel**: Free (up to 100 GB bandwidth)
- **Total**: ~$0–$20/mo for hobby tier

## Useful Links

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas: https://www.mongodb.com/cloud
