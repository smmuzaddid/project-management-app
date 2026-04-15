# Project Management App — Setup Guide

## 1. Supabase Setup

1. Go to https://supabase.com and create a new project
2. In the **SQL Editor**, paste and run the entire contents of `supabase/schema.sql`
3. Copy your **Project URL** and **anon public key** from **Settings → API**

## 2. Environment Variables

Edit `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Create Admin Users

After running the schema, sign up via the app. Then in Supabase SQL Editor, manually promote Muzaddid and Rehan to admin:

```sql
UPDATE profiles SET role = 'admin' WHERE email IN ('muzaddid@example.com', 'rehan@example.com');
```

## 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

## 5. Deploy to Vercel

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## App structure

| Route | Description |
|-------|-------------|
| `/login` | Sign in |
| `/signup` | Create account |
| `/dashboard` | Summary dashboard |
| `/projects` | All projects |
| `/projects/new` | Create project (admin only) |
| `/projects/[id]` | Project detail with tasks, follow-ups, team |
| `/projects/[id]/edit` | Edit project (admin only) |
| `/tasks` | All tasks with filters |
| `/follow-ups` | Follow-up tracker |
| `/reminders` | Personal reminders |
| `/team` | Team management (admin only) |

## Note on Next.js version

This project uses Next.js 16. Run via:
```bash
npm run dev   # uses node node_modules/next/dist/bin/next
```
