# cleft — Design Review UI

Standalone frontend for design review. **All UI lives in one file:** `CleftUI.tsx`.

- No auth or login
- Mock data only (no API calls)
- Fully interactive client-side UI (items, members, summary, profile)

## Quick start

```bash
cd edit_front_end
npm install
npm run dev
```

Open http://localhost:5173

## Build for deploy

```bash
npm run build
npm run preview
```

Static output is in `dist/` — suitable for GitHub Pages or any static host.

## Edit UI

Change **`CleftUI.tsx`** only. That file contains:

- UI primitives (Button, Card, Input, Dialog, Toast)
- All screens (Home, Items, Members, Summary)
- Mock data and client-side bill logic

## Push to GitHub

This folder is self-contained and ready to push as its own repo or as part of the monorepo:

```bash
git add edit_front_end/
git commit -m "Add standalone design review frontend"
git push
```
