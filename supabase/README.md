# supabase/

This folder is the source of truth for the Kanaan Postgres schema, edge functions,
and project config — usable by the Supabase CLI.

## Layout

```
supabase/
├── config.toml                              # Supabase CLI project config
├── migrations/
│   └── 20260507000000_init_bookings.sql     # Initial schema + RLS + indexes
└── functions/
    └── notify-booking/
        └── index.ts                         # Database-webhook → Resend email
```

## Two ways to apply

### Quick (no CLI) — via the Supabase dashboard
1. Copy the contents of [`migrations/20260507000000_init_bookings.sql`](migrations/20260507000000_init_bookings.sql)
2. Paste into Supabase → SQL Editor → Run
3. Same for the edge function — paste into Edge Functions → notify-booking → Deploy

This is what [`SUPABASE_SETUP.md`](../SUPABASE_SETUP.md) walks you through.

### Full (with CLI) — for ongoing development
```bash
npm i -g supabase                                    # one-time install
supabase login                                       # authenticate
supabase link --project-ref xxxxxxxxxxxxx            # link to your cloud project
supabase db push                                     # apply migrations
supabase functions deploy notify-booking             # deploy edge function
supabase secrets set RESEND_KEY=re_xxxxxxxxxxxx      # set the email API key
```

## Local development

```bash
supabase start    # spins up local Postgres + Studio + Auth + Storage
supabase stop
```

Local URL: `http://127.0.0.1:54321`
Local Studio: `http://127.0.0.1:54323`
