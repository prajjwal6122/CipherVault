# Quick Replit Deployment (Full Stack)

## Step 1: MongoDB Atlas (5 mins)
- [ ] Go to [mongodb.com/cloud](https://www.mongodb.com/cloud)
- [ ] Create free cluster
- [ ] Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/ciphervault`
- [ ] Whitelist all IPs: 0.0.0.0/0

## Step 2: Deploy to Replit (5 mins)
- [ ] Go to [replit.com](https://replit.com)
- [ ] Click "Create" → "Import from GitHub"
- [ ] Paste: `https://github.com/prajjwal6122/CipherVault`
- [ ] Click "Import"

## Step 3: Configure Secrets (2 mins)
Click "Secrets" (lock icon) and add:
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI=<your-mongodb-atlas-url>`
- [ ] `JWT_SECRET=<generate-random-secret>`
- [ ] `JWT_EXPIRY=3600`
- [ ] `BACKEND_PORT=3000`
- [ ] `FRONTEND_PORT=3001`
- [ ] `LOG_LEVEL=info`

## Step 4: Run (1 min)
- [ ] Click "Run" button (or press Ctrl+Enter)
- [ ] Wait ~30 seconds for install & startup
- [ ] Backend: `https://your-project.replit.dev` (port 3000)
- [ ] Frontend: `https://your-project.replit.dev:3001` (port 3001)

## Step 5: Keep It Running (Optional)
**Free Option:** Use [UptimeRobot](https://uptimerobot.com)
- [ ] Create HTTP monitor
- [ ] Ping `https://your-project.replit.dev/api/v1/health` every 5 mins
- [ ] Keeps backend awake 24/7 (free)

**Paid Option:** Upgrade to "Always On" ($7/mo)

---

**Done!** 🚀 Your full-stack CipherVault is live on Replit.

---

## Troubleshooting

| Issue           | Fix                                       |
| --------------- | ----------------------------------------- |
| Replit sleeping | Use UptimeRobot or upgrade to "Always On" |
| MongoDB timeout | Whitelist 0.0.0.0/0 in MongoDB Atlas      |
| Port conflicts  | Backend=3000, Frontend=3001               |
| Can't reach API | Check backend is running on port 3000     |

