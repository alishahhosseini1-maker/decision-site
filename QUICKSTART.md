# Quick Start Guide

## TL;DR - Get It Running in 5 Minutes

### 1. Apply Database Migration

```bash
# Copy the SQL from supabase/migrations/add_refresh_timestamps.sql
# Paste into Supabase Dashboard → SQL Editor → Run
```

### 2. Seed Ticker Companies

```bash
node scripts/seed-ticker-companies.mjs
```

### 3. Generate Cron Secret

```bash
openssl rand -base64 32
```

Copy the output.

### 4. Add to Vercel

**Vercel Dashboard → Your Project → Settings → Environment Variables:**

- Name: `CRON_SECRET`
- Value: `<paste the secret from step 3>`
- Save

### 5. Deploy

```bash
git add .
git commit -m "Add background refresh + ticker"
git push
```

Done! Vercel will deploy and start the cron job.

---

## Verify It's Working

### Check Ticker (Immediate)

1. Open your deployed app
2. Should see 30 companies scrolling in ticker bar
3. Click any company → Detail page loads
4. Should see "Researching..." → then data appears within 60s

### Check Cron (Wait 24h or Trigger Manually)

**Manual trigger:**
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.vercel.app/api/cron/refresh-companies
```

**Check logs:**
- Vercel Dashboard → Cron Jobs → View Logs
- Look for `successful: 10` in the output

---

## Troubleshooting

**"No companies in ticker"**
- Did you run the seed script?
- Check database: `SELECT COUNT(*) FROM lumen_companies`

**"Researching... never finishes"**
- Check Perplexity API key is set: `PERPLEXITY_API_KEY`
- Check Anthropic API key is set: `ANTHROPIC_API_KEY`
- Check browser console for errors

**"Cron job not running"**
- Is `CRON_SECRET` set in Vercel?
- Check Vercel Dashboard → Cron Jobs → should show the job
- Try manual trigger (see above)

**"API quota exceeded"**
- Reduce `BATCH_SIZE` in `/api/cron/refresh-companies/route.ts` (10 → 5)
- Increase cron schedule in `vercel.json` (daily → every 2 days)

---

## What You Get

✅ **30 high-value private companies** in ticker bar  
✅ **Auto-scrolling ticker** (hover to pause)  
✅ **Click → Detail page** with evidence + AI valuation  
✅ **Daily background refresh** (10 companies/day)  
✅ **Immediate research** for new companies  
✅ **"Last updated" timestamps** everywhere  
✅ **Manual "Re-run"** buttons still work  

---

## Files to Know

- **`vercel.json`** - Cron schedule (daily at 2 AM UTC)
- **`data/ticker-companies-seed.json`** - 30 companies to add more
- **`app/api/cron/refresh-companies/route.ts`** - Background job logic
- **`IMPLEMENTATION_SUMMARY.md`** - Full technical details

---

## Support

If something's not working:
1. Check `IMPLEMENTATION_SUMMARY.md` for detailed architecture
2. Check `DEPLOYMENT_CHECKLIST.md` for step-by-step guide
3. Check Vercel logs for errors
4. Check Supabase logs for database issues
