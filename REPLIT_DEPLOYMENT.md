# Deploy Backend to Replit + Frontend to Vercel

## Backend Deployment (Replit)

### Step 1: Create Replit Project
1. Go to [replit.com](https://replit.com)
2. Sign up with GitHub
3. Click "Create" → "Import from GitHub"
4. Paste: `https://github.com/prajjwal6122/CipherVault`
5. Click "Import"
6. Replit auto-detects Node.js project

### Step 2: Configure Environment Variables
1. Click "Secrets" (lock icon) in left sidebar
2. Add these variables:
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ciphervault
   JWT_SECRET=your-secure-random-secret
   JWT_EXPIRY=3600
   LOG_LEVEL=info
   BACKEND_PORT=3000
   ALLOWED_ORIGINS=https://ciphervault-web.vercel.app
   ```
3. Click "Add Secret" for each

### Step 3: Set Up .replit File
Already created in repo. Make sure `backend/.replit` exists:
```
run = "npm install && npm run start"
```

### Step 4: Run & Get URL
1. Click "Run" button (or press Ctrl+Enter)
2. Backend starts on Replit URL (auto-generated)
3. Copy the URL (format: `https://your-project.replit.dev`)
4. Your backend is live! ✅

### Step 5: Get Public URL
- Replit auto-generates: `https://your-replit-project.replit.dev`
- Use this as your `VITE_API_BASE_URL` for Vercel frontend

---

## Frontend Deployment (Vercel)

### Step 1: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import GitHub repo (`prajjwal6122/CipherVault`)
4. Root directory: `frontend`
5. Framework: `Vite`

### Step 2: Set Environment Variable
- `VITE_API_BASE_URL=https://your-replit-project.replit.dev`
- Click "Deploy"

### Step 3: Verify
- Frontend live at: `https://ciphervault-web.vercel.app` ✅

---

## Test Your Deployment

```bash
# Test frontend
curl https://ciphervault-web.vercel.app

# Test backend
curl https://your-replit-project.replit.dev/api/v1/health

# Upload encrypted record
curl -X POST https://your-replit-project.replit.dev/api/v1/records/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.csv"}'
```

---

## Replit Tips

| Task | How |
|------|-----|
| **View logs** | Click "Console" tab |
| **Stop/restart** | Click "Stop" then "Run" |
| **Custom domain** | Click "Domains" → Add custom domain |
| **Deploy again** | Push to GitHub → Replit auto-syncs |
| **Keep alive** | Replit free tier sleeps after 1 hour inactivity; upgrade to "Always On" ($7/mo) |

---

## Keep Replit Running

Replit free tier puts projects to sleep after 1 hour of inactivity.

**Option 1: Upgrade** ($7/mo)
- Go to your Replit → Click "Upgrade" → Select "Always On"

**Option 2: Keep-Alive Script** (Free)
- Add a scheduled task to ping your API every 5 mins
- Example using UptimeRobot (free): Set monitor to ping `https://your-replit-project.replit.dev/api/v1/health` every 5 minutes

**Option 3: Use Railway/Fly.io** (Better for production)
- Free tier + auto-sleep after 30 days inactivity
- More reliable than Replit for production

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install` in Replit console |
| MongoDB connection timeout | Whitelist IP in MongoDB Atlas or set to 0.0.0.0 |
| CORS errors | Check `ALLOWED_ORIGINS` env var matches Vercel URL |
| 502 Bad Gateway | Restart Replit by clicking "Stop" then "Run" |
| Replit project sleeping | See "Keep Replit Running" section above |

