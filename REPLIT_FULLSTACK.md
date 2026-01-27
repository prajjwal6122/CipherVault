# Deploy Full Stack on Replit

Deploy both frontend and backend on Replit in one project.

## Quick Setup (10 mins)

### Step 1: MongoDB Atlas
- Go to [mongodb.com/cloud](https://www.mongodb.com/cloud)
- Create free cluster
- Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/ciphervault`
- Whitelist all IPs (0.0.0.0/0) for testing

### Step 2: Import to Replit
1. Go to [replit.com](https://replit.com)
2. Click "Create" → "Import from GitHub"
3. Paste: `https://github.com/prajjwal6122/CipherVault`
4. Replit imports your repo

### Step 3: Configure Secrets
Click "Secrets" (lock icon) and add:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ciphervault
JWT_SECRET=your-secure-random-secret-key
JWT_EXPIRY=3600
BACKEND_PORT=3000
FRONTEND_PORT=3001
LOG_LEVEL=info
```

### Step 4: Run Both Services
Replit will use the `.replit` config to start both backend and frontend.

**Backend runs on**: `https://your-project.replit.dev` (port 3000)
**Frontend runs on**: `https://your-project.replit.dev:3001` or via proxy

### Step 5: Update Frontend API URL
The frontend needs to know the backend URL:
- Since both are on Replit, use the Replit dev URL
- Frontend will use `https://your-project.replit.dev` for API calls

## Architecture

```
Replit Project
├── Backend (Node.js) → Port 3000 → https://your-project.replit.dev
└── Frontend (Vite) → Port 3001 → Proxied or separate URL
```

## Testing

```bash
# Backend health
curl https://your-project.replit.dev/api/v1/health

# Frontend
curl https://your-project.replit.dev:3001
```

## Keep Replit Running (Important!)

Replit free tier sleeps after 1 hour of inactivity.

**Option 1: Upgrade** ($7/mo)
- Click "Upgrade" → "Always On"

**Option 2: Free Ping Service**
- Use [UptimeRobot](https://uptimerobot.com) (free)
- Create HTTP monitor
- URL: `https://your-project.replit.dev/api/v1/health`
- Interval: Every 5 minutes
- This keeps your app awake 24/7

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Frontend can't reach backend | Check `VITE_API_BASE_URL` in frontend build |
| MongoDB timeout | Whitelist 0.0.0.0/0 in MongoDB Atlas |
| Port conflicts | Backend on 3000, frontend on 3001 |
| Replit sleeping | Use UptimeRobot or upgrade |
| CORS errors | Backend automatically allows Replit domains |

## Production Notes

**Pros:**
- ✅ Simple setup (one platform)
- ✅ Free tier available
- ✅ Easy debugging (all logs in one place)
- ✅ Auto-redeploy on git push

**Cons:**
- ⚠️ Free tier sleeps (need UptimeRobot or upgrade)
- ⚠️ Limited resources on free tier
- ⚠️ Better for MVPs, not production scale

**For Production:** Consider Vercel (frontend) + Railway/Fly.io (backend) for better reliability and scaling.
