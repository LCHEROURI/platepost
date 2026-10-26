# PlatePost — Restaurant Social Media Manager

Cross-platform SaaS for restaurant managers to create, schedule, and publish social media
content (daily specials, food facts, promotions) with AI caption assistance and a minimalist
design aesthetic.

**Stack:** React 18 · TypeScript (strict) · Tailwind CSS · Zustand · React Router · Firebase (Google)

## Quickstart

```bash
npm install
npm run dev       # http://localhost:5173
```

The app runs **without any credentials** in local demo mode: seed data renders every screen,
created posts persist to `localStorage`, and AI captions come from a bundled mock generator.

To wire the Google backend, copy `.env.example` to `.env.local` and fill in your Firebase
project values (Firestore + Storage). The service layer (`src/services/postService.ts`) then
switches from localStorage to Firestore automatically — no UI changes needed.

## Scripts

| Command            | Purpose                              |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start Vite dev server                |
| `npm run build`    | Typecheck + production build         |
| `npm run typecheck`| Strict TypeScript check              |
| `npm test`         | Vitest unit tests                    |
| `npm run lint`     | ESLint                               |

## Structure

```
src/
  components/   Layout, sidebar, post cards, media dropzone, caption editor,
                schedule picker, platform selector, preview mockups, SVG charts, toasts
  lib/          types.ts (domain model), firebase.ts, ai.ts (caption generator),
                seed.ts (demo data), utils.ts
  pages/        Dashboard, Create Post, Calendar, Analytics, Settings, 404
  services/     postService.ts — Firestore ↔ localStorage persistence
  store/        useAppStore.ts — Zustand global state
```

## Design tokens

Primary `#4A5568` · Secondary `#A0AEC0` · Accent `#38B2AC` · Background `#F7FAFC` ·
Text `#2D3748` / `#718096` · Font: Inter. Mobile-first, responsive drawer navigation,
WCAG 2.1 AA-oriented (labels, focus rings, aria-live toasts, keyboard-closable modals).

## Backend roadmap (Google ecosystem, per project AGENTS.md)

- **Auth** — Firebase Auth UI + Cloud Firestore security rules for restaurant profiles.
- **AI captions** — Cloud Run service proxying Google Gemini; replace `src/lib/ai.ts` mock
  (same `AiSuggestion[]` return shape) and keep API keys server-side.
- **Publishing & analytics** — Cloud Run functions calling Instagram/Facebook Graph APIs
  with encrypted token storage and refresh-token handling.
- **Scheduled publishing** — Cloud Scheduler → Cloud Run publisher, updating Firestore statuses
  (the data model already has `scheduled_at`, `post_platforms`, `failed_reason`).
- **Media processing** — Cloud Storage triggers for resizing/WebP + watermark overlay.
- **Multi-restaurant & approvals** — schema-ready (restaurant-scoped rows, `review_pending`
  status); POS/menu pull and TikTok/X are future integrations.

## Testing

Unit tests cover the AI generator, utilities, and store logic. React Testing Library,
Playwright E2E, RLS policy tests, and Lighthouse audits are planned next.
