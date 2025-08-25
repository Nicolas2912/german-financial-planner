# Repository 

## Important rules
- Do not run the server on any port. It is already running on port 3000.
- Do not delete any files EVER!

## Project Structure & Module Organization
- `public/`: App assets and entry pages (e.g., `etf_savings.html`, `scenario-comparison.html`).
- `public/js/`: ES modules
  - `core/` (calculations: `accumulation.js`, `tax.js`, `withdrawal.js`)
  - `features/` (app features: scenario/profile management)
  - `ui/` (DOM, charts, setup, event wiring)
  - `state.js`, `utils.js`, `app.js` (entry)
- `public/css/`: Styles (`main.css`, `modules/*.css`).
- `docs/`: Product docs and plans.
- `dev-server.py`: Local dev server with live reload.
- Ignore `app_old.js` and `style_old.css` files.

## Development Workflow (No Running Now)
- Do not start servers or run tests for now. Focus on small, clear code changes.
- Edit modules in `public/js/*` and styles in `public/css/*`. Keep changes isolated and easy to review.
- If you need to reset local app state later: use the browser console `localStorage.clear()` (do not execute now).

## Coding Style & Naming Conventions
- JavaScript: ES modules, 2-space indent, semicolons, `camelCase` for variables/functions, classes `UpperCamelCase`, constants `UPPER_SNAKE_CASE`.
- Filenames: JS modules `camelCase` (e.g., `scenarioManager.js`); CSS lowercase nouns (e.g., `components.css`).
- Module boundaries: pure calculations in `public/js/core/*` (no DOM), UI and events in `public/js/ui/*`, app state via `state.js`.
- Numbers: format user-facing values for `de-DE`; keep internal math as raw numbers.

## Modular Structure Guidance
- Prefer a modular layout over a monolith, but avoid micro-modules.
- Group by responsibility/feature: calculations (core), UI, features, state, utilities.
- Rule of thumb: new module only if it’s reused, independently testable, or clearly separable. Otherwise extend the closest coherent file.

## Testing Guidelines
- No automated tests yet; do not run tests now or develop tests at all.

## Commit & Pull Request Guidelines
- Use modern Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, with an optional scope (e.g., `ui`, `core`).
- Style: imperative mood, concise subject (<50 chars), details in body, reference issues (e.g., `Closes #123`).
- PRs: short description, before/after screenshots for UI, clear validation steps (conceptual only—no running now), and linked issues. Keep diffs focused.

## Security & Configuration Tips
- Client-only app; do not commit secrets. Local persistence uses `localStorage`—clear before recording demos. Avoid large binaries in `public/`.
