# Quick Cloud Deployment Checklist

## Step 1: Prepare MongoDB Atlas
- [ ] Create account at [mongodb.com/cloud](https://www.mongodb.com/cloud)
- [ ] Create a free cluster
- [ ] Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`
- [ ] Allow IP access (or set to 0.0.0.0 for testing)

## Step 2: Deploy Backend to Render
- [ ] Sign up at [render.com](https://render.com) with GitHub
- [ ] Click "New +" → "Web Service"
- [ ] Select your GitHub repo (`prajjwal6122/CipherVault`)
- [ ] Set:
  - **Name**: `ciphervault-api`
  - **Build command**: `npm install`
  - **Start command**: `node backend/server.js`
  - **Environment variables**:
    - `NODE_ENV=production`
    - `MONGODB_URI=<your-mongodb-atlas-url>`
    - `JWT_SECRET=<generate-random-secret>`
- [ ] Click "Create Web Service"
- [ ] Wait ~5 minutes for deployment
- [ ] Copy your Render backend URL (e.g., `https://ciphervault-api.onrender.com`)

## Step 3: Deploy Frontend to Vercel
- [ ] Sign up at [vercel.com](https://vercel.com) with GitHub
- [ ] Click "New Project"
- [ ] Import your GitHub repo
- [ ] Set:
  - **Project name**: `ciphervault-web`
  - **Framework**: `Vite`
  - **Root directory**: `frontend`
  - **Environment variable**: `VITE_API_BASE_URL=<your-render-backend-url>`
- [ ] Click "Deploy"
- [ ] Your app is live at `https://ciphervault-web.vercel.app` ✅

## Step 4: Enable CORS
- [ ] Go to Render dashboard → `ciphervault-api` → Environment
- [ ] Add: `ALLOWED_ORIGINS=https://ciphervault-web.vercel.app`
- [ ] Deploy

## Step 5: Test
```bash
# Test frontend
curl https://ciphervault-web.vercel.app

# Test backend
curl https://ciphervault-api.onrender.com/api/v1/health

# Test database connection
curl https://ciphervault-api.onrender.com/api/v1/records
```

**Done!** 🚀 Your CipherVault app is live.

---

### Troubleshooting

| Problem | Fix |
|---------|-----|
| 502 Bad Gateway | Check Render logs; ensure `backend/server.js` exists |
| CORS errors | Update `ALLOWED_ORIGINS` in Render environment |
| MongoDB timeout | Whitelist IP in MongoDB Atlas or set to 0.0.0.0 |
| `VITE_API_BASE_URL` not working | Redeploy Vercel with correct env variable |

### Optional: Custom Domain
- **Frontend**: Go to Vercel → Settings → Domains → Add custom domain
- **Backend**: Go to Render → Settings → Custom Domain → Add domain
- Update DNS records per platform instructions

