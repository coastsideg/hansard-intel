# HANSARD INTEL — Deployment Guide

## Prerequisites
- GitHub account
- Railway account (railway.app)
- Anthropic API key

## Step 1: Push to GitHub

```bash
cd /path/to/hansard-intel
git init
git add .
git commit -m "Initial HANSARD INTEL commit"
git remote add origin https://github.com/YOUR_USERNAME/hansard-intel.git
git push -u origin main
```

## Step 2: Set Up Railway

1. Go to railway.app → New Project → Deploy from GitHub repo
2. Select your `hansard-intel` repository
3. Railway will auto-detect the Dockerfile

### Add PostgreSQL
1. In Railway project → New Service → Database → PostgreSQL
2. Copy the `DATABASE_URL` from the PostgreSQL service

### Enable pgvector
Connect to your Railway PostgreSQL via the Railway shell or a client and run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

### Set Environment Variables
In your Railway service → Variables, add:
```
DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@HOST:PORT/railway
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=generate-a-random-32-char-string
ENVIRONMENT=production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
PDF_STORAGE_PATH=/data/pdfs
```

**Note on DATABASE_URL**: Railway provides the URL as `postgresql://...` — 
you must change `postgresql://` to `postgresql+asyncpg://` for async support.

## Step 3: Add Persistent Volume (for PDFs)

1. Railway service → Volumes → Add Volume
2. Mount path: `/data`
3. This stores all downloaded Hansard PDFs

## Step 4: Deploy & Initialize

After first deployment:

```bash
# Get your JWT token
curl -X POST https://your-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Save the token
TOKEN="eyJ..."

# Step 1: Seed known opposition members
curl -X POST https://your-app.railway.app/api/admin/seed-members \
  -H "Authorization: Bearer $TOKEN"

# Step 2: Start historical scrape (runs in background)
curl -X POST https://your-app.railway.app/api/admin/scrape/historical \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from_year": 2021}'

# Check progress
curl https://your-app.railway.app/api/admin/status \
  -H "Authorization: Bearer $TOKEN"
```

**Recommendation**: Start with `from_year: 2021` (post-election) to get ~600 PDFs 
rather than all 1,400+ from 2017. You can run the 2017 scrape later.

## Step 5: GitHub Actions (Daily Scrape)

In GitHub → Settings → Secrets → Actions, add:
- `HANSARD_API_URL` = `https://your-app.railway.app`
- `HANSARD_API_TOKEN` = your JWT token (generate a long-lived one)

The workflow runs automatically Mon-Fri at 6am AWST.

## Estimated Costs (Railway)
- Hobby plan: ~$5 USD/month (app + PostgreSQL)
- Pro plan: ~$20 USD/month (recommended for background tasks)
- Anthropic API: ~$0.30/day at 100 queries = ~$110 AUD/year
- Total: Under $50 AUD/month as per spec

## Accessing the App
Once deployed: `https://your-app.railway.app`
Login with your ADMIN_USERNAME and ADMIN_PASSWORD.
