# Deployment Checklist for Background Refresh

## 1. Run Database Migration

```bash
# If using Supabase CLI:
supabase migration up

# Or apply manually via Supabase Dashboard → SQL Editor:
# Copy contents of supabase/migrations/add_refresh_timestamps.sql
```

## 2. Set Environment Variable in Vercel

Dashboard → Settings → Environment Variables → Add:

```
Name: CRON_SECRET
Value: <generate with: openssl rand -base64 32>
```

## 3. Deploy to Vercel

```bash
git add .
git commit -m "Add background company refresh cron job"
git push origin main
```

Vercel will auto-deploy and register the cron job from `vercel.json`.

## 4. Verify Cron Is Running

- Vercel Dashboard → Cron Jobs → Should show:
  - Path: `/api/cron/refresh-companies`
  - Schedule: `0 2 * * *` (daily at 2 AM UTC)
  
- Check logs after first run (wait 24h or trigger manually):
  ```bash
  curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
    https://your-app.vercel.app/api/cron/refresh-companies
  ```

## 5. Expected Behavior

- **Day 1**: Refreshes 10 companies with `last_researched_at = null` (newest additions)
- **Day 2-4**: Rotates through remaining ticker companies (oldest-first)
- **Ongoing**: Keeps all companies fresh with 3-4 day rotation
- **New companies**: Get researched on first click (don't wait for cron)

## Monitoring

Check Vercel Cron logs for:
- `processed: 10` (companies processed)
- `successful: X` (API calls succeeded)
- `errors: Y` (API failures - check Perplexity/Claude quotas)
