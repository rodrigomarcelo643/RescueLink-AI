# 12 — Deployment

---

## Frontend — Vercel

### Step 1: Push to GitHub

```bash
git add .
git commit -m "initial setup"
git push origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → Import Project → select repo
2. Framework: **Vite**
3. Build command: `pnpm build`
4. Output directory: `dist`
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_APP_ENV=production`

### Step 3: Custom Domain (optional)

Vercel Dashboard → Domains → Add `rescuelinkai.ph`

---

## Supabase — Production

### Apply Migrations

```bash
supabase db push --project-ref <project-ref>
```

### Deploy All Edge Functions

```bash
supabase functions deploy
```

### Set All Secrets

```bash
supabase secrets set \
  OPENAI_API_KEY=sk-... \
  FB_PAGE_ACCESS_TOKEN=... \
  FB_VERIFY_TOKEN=... \
  FB_PAGE_ID=... \
  TELEGRAM_BOT_TOKEN=... \
  WHATSAPP_TOKEN=... \
  WHATSAPP_PHONE_NUMBER_ID=... \
  WHATSAPP_VERIFY_TOKEN=... \
  PAYMONGO_SECRET_KEY=sk_... \
  RESEND_API_KEY=re_... \
  MAIL_FROM=noreply@rescuelinkai.ph \
  SMS_API_KEY=... \
  SMS_SENDER_NAME=RescueLinkAI \
  GOOGLE_MAPS_API_KEY=... \
  SUPABASE_SERVICE_ROLE_KEY=...
```

---

## CI/CD — GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_GOOGLE_MAPS_API_KEY: ${{ secrets.VITE_GOOGLE_MAPS_API_KEY }}

  deploy-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

Add these GitHub Secrets in repo Settings → Secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN` (from supabase.com → Account → Access Tokens)

---

## Production Checklist

- [ ] RLS enabled on all tables
- [ ] Supabase Auth signups disabled (LGU accounts only)
- [ ] `service_role` key never exposed to frontend
- [ ] All Edge Function secrets set
- [ ] Webhook URLs updated to production Supabase URLs in:
  - Facebook Developer Console
  - Telegram `setWebhook`
  - WhatsApp Business API
  - PayMongo Dashboard
- [ ] Google Maps API key restricted to production domain
- [ ] Custom domain configured on Vercel
- [ ] Realtime enabled on `rescue_tickets` table
