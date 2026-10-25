# Mealwise — Your Nigerian Food Diary

Mobile-first food diary: photograph a meal or describe it by voice, Claude identifies
the foods, the meal is saved automatically, and the day is reviewed as a whole.

Self-contained in this folder; unrelated to the Maximus app in the rest of the repo.

| Path | What it is |
|---|---|
| `web/index.html` | The app (single page). Also published as a claude.ai artifact. |
| `public/runtime.js` | Web runtime: Supabase sign-in + private storage, calls `/api/ai`. |
| `api/ai.js` | Vercel function: checks the signed-in user, daily limit, calls Claude. |
| `build.sh` | Wraps `web/index.html` into `public/index.html`. Run after editing the app. |

## Configuration (Vercel project `mealwise`, root directory `mealwise`)

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Server-only. Without it the app works but AI calls return "not switched on". |
| `MEALWISE_MODEL` | no | Default `claude-opus-5-5`. |
| `MEALWISE_DAILY_LIMIT` | no | AI calls per user per day, default 150. |

Database: Supabase project `mealwise` (`hmkhglqychrtdifkxwhd`). Table `docs` holds one
JSON document per path, readable only by its owner (row-level security) and only for
emails listed in `allowed_emails`.
