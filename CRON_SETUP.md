# Cron Job Setup

## Required Environment Variable

Add to Vercel project settings:

```
CRON_SECRET=<generate-a-secure-random-string>
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

## Cron Schedule

- **Frequency**: Daily at 2 AM UTC (`0 2 * * *`)
- **Batch size**: 10 companies per run
- **Logic**: Processes oldest-researched companies first (by `last_researched_at ASC NULLS FIRST`)

With 30-40 ticker companies, full rotation every 3-4 days.

## Manual Trigger (for testing)

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.vercel.app/api/cron/refresh-companies
```

## Monitoring

Check Vercel Cron logs in the dashboard:
- Dashboard → Cron Jobs → View Logs
- Look for `processed`, `successful`, `errors` counts
