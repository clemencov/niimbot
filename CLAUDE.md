# Niimbot D110 Web Label Printer

## Project overview
Minimalistic single-page web app to print text labels on a Niimbot D110 via Web Bluetooth.

## Tech stack
- Vanilla HTML/CSS/TypeScript + Vite (no framework)
- `@mmote/niimbluelib@0.0.1-alpha.36` — BLE protocol, packet encoding, image encoding, print tasks

## Architecture
- `index.html` — single page: connect bar, canvas preview, form controls, print button
- `src/main.ts` — entry point, DOM event wiring, live preview updates
- `src/printer.ts` — wraps niimbluelib: connect/disconnect/print, forwards events via callbacks
- `src/canvas.ts` — renders text to offscreen canvas at print resolution, updates preview
- `src/style.css` — minimal styling

## Key constants & gotchas
- D110 printhead: **96px wide = ~12mm at 203 DPI**
- Print direction: `"left"` (niimbluelib rotates 90 CW)
- Canvas dimensions **must be multiples of 8px** (niimbluelib encoder requirement)
- mm to px: `Math.round(mm * 203 / 25.4)`
- Font sizes are in **points**, converted via `Math.round(pt * 203 / 72)` — do NOT use mmToPx for font sizes (caused blank label bug)
- Default print task type: auto-detected via `client.getPrintTaskType()`, fallback `"D110"`
- Label type: `LabelType.WithGaps`

## Commands
- `npm run dev` — start dev server
- `npm run build` — typecheck + production build
- Web Bluetooth requires Chrome/Edge + localhost or HTTPS
