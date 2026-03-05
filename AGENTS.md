# AGENTS.md

## Cursor Cloud specific instructions

This is **Diário de Bordo** — a React web app for Brazilian truck drivers to track freight trips, expenses, and fuel consumption. Authentication and user profiles are stored in **Supabase**; trip/expense/fuel data is still in browser `localStorage`.

### Tech stack

Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui + React Router v6. See `package.json` for scripts.

### Running the app

- `npm run dev` — starts Vite dev server on **port 8080**
- `npm run build` — production build
- `npm run lint` — ESLint (pre-existing warnings from shadcn/ui boilerplate; exit code 1 is expected)
- `npm run test` — Vitest (jsdom environment)

### Notes

- The lint command exits with code 1 due to pre-existing errors in generated shadcn/ui components (`@typescript-eslint/no-empty-object-type` in `command.tsx`/`textarea.tsx`, `@typescript-eslint/no-require-imports` in `tailwind.config.ts`). These are not regressions.
- The app is entirely in Portuguese (Brazilian). UI labels, buttons, and navigation are in Portuguese.
- **Supabase is required**: the app needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars (see `.env.example`). Without them, the dev server starts but the app throws on load. For local dev, pass them inline: `VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run dev`.
- The `VITE_SUPABASE_URL` can be either the API URL (`https://xxx.supabase.co`) or the dashboard URL (`https://supabase.com/dashboard/project/xxx/...`) — the client auto-corrects dashboard URLs.
- A `profiles` table and `handle_new_user` trigger must exist in Supabase — see `supabase_setup.sql` for the full schema.
- Supabase free tier has a 4 emails/hour rate limit for auth. If you hit "email rate limit exceeded", either wait ~1 hour or disable email confirmation in the Supabase dashboard (Authentication > Email > Confirm email → OFF).
