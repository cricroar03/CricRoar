# 🔥 CricRoar — Deploy Guide
## Launch today in under 30 minutes

---

## STEP 1 — Supabase Setup (5 mins)
> Free database + realtime chat backend

1. Go to https://supabase.com → Sign up free
2. Click "New Project" → name it "cricroar" → set a password → Create
3. Wait ~2 mins for project to load
4. Click **SQL Editor** in left sidebar
5. Paste the entire contents of `supabase_setup.sql` → click **RUN**
6. You should see "Success. No rows returned"

**Get your keys:**
- Go to Project Settings → API
- Copy **Project URL** → this is your VITE_SUPABASE_URL
- Copy **anon public** key → this is your VITE_SUPABASE_KEY

---

## STEP 2 — CricketData.org API (3 mins)
> Free live cricket scores

1. Go to https://cricketdata.org → Sign up free
2. After login → go to Dashboard → copy your API Key
3. This is your VITE_CRICKET_API

---

## STEP 3 — Razorpay Key (2 mins)
> You already have this from Quickwise!

1. Go to https://dashboard.razorpay.com
2. Settings → API Keys → copy your **Key ID** (starts with rzp_)
3. This is your VITE_RAZORPAY_KEY

---

## STEP 4 — GitHub (5 mins)
> Push your code

1. Go to https://github.com → New repository → name it "cricroar" → Public → Create
2. Open terminal on your computer and run:

```bash
cd cricroar
npm install
git init
git add .
git commit -m "CricRoar launch"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cricroar.git
git push -u origin main
```

Replace YOUR_USERNAME with your GitHub username.

---

## STEP 5 — Vercel Deploy (5 mins)
> Free hosting, auto-deploys on every push

1. Go to https://vercel.com → Sign up with GitHub
2. Click "Add New Project" → Import your "cricroar" repo
3. Framework: **Vite** (auto-detected)
4. Before clicking Deploy → click **Environment Variables** and add:

| Name | Value |
|------|-------|
| VITE_CRICKET_API | your cricketdata.org key |
| VITE_SUPABASE_URL | your supabase project URL |
| VITE_SUPABASE_KEY | your supabase anon key |
| VITE_RAZORPAY_KEY | your razorpay key ID |

5. Click **Deploy** → wait 2 mins → your app is LIVE!

---

## STEP 6 — Update App.jsx with env vars (1 min)

Open `src/App.jsx` and replace lines 6-9 with:

```js
const CFG = {
  CRICKET_API : import.meta.env.VITE_CRICKET_API  || "",
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_KEY: import.meta.env.VITE_SUPABASE_KEY || "",
  RAZORPAY_KEY: import.meta.env.VITE_RAZORPAY_KEY || "",
  PLAN_AMOUNT : 4900,
};
```

Then push again:
```bash
git add .
git commit -m "add env vars"
git push
```

Vercel auto-redeploys in ~1 min.

---

## STEP 7 — Custom Domain (optional, 5 mins)

1. Buy cricroar.in on GoDaddy/Namecheap (~₹800/yr)
2. In Vercel → your project → Settings → Domains → add your domain
3. Follow DNS instructions → live in 10 mins

---

## 🎉 YOU'RE LIVE!

Share your app link in:
- Cricket WhatsApp groups
- Reddit r/Cricket, r/IPL
- Twitter/X with #IPL2026
- Instagram stories

---

## Monthly Costs

| Service | Cost |
|---------|------|
| Vercel | FREE |
| Supabase | FREE (up to 50k rows) |
| CricketData.org | FREE (500 req/day) |
| Domain (optional) | ~₹800/yr |
| **Total** | **₹0/month** |

You start earning from ₹49 subscriptions from day 1. 🚀
