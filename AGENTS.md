# Repository Guidelines

## Important rules
- Do not run the server on any port. It is already running on port 3000.
- Do not delete any files EVER!
- DO not every read app_old.js or modify it!

## Project Structure & Module Organization
- Core app lives in `public/`: entry pages (`etf_savings.html`, `scenario-comparison.html`), ES modules in `public/js/`, and styles in `public/css/`.
- Calculation logic resides under `public/js/core/` (accumulation, tax, withdrawal). UI wiring sits in `public/js/ui/`, while scenario/profile features live in `public/js/features/`.
- Docs, specs, and plans are in `docs/`. Legacy assets such as `public/app_old.js` and `public/style_old.css` must remain untouched.

## Build, Test, and Development Commands
- Local dev server: `python dev-server.py` (serves on port 3000; confirm no existing instance before starting).
- Static review: open `public/etf_savings.html` via an HTTP server only; ES modules break on `file://`.
- No automated test suite is defined yet; do not add ad-hoc scripts without coordination.

## Coding Style & Naming Conventions
- JavaScript: ES modules with 2-space indentation, semicolons, and `camelCase` identifiers (classes use `UpperCamelCase`, constants `UPPER_SNAKE_CASE`).
- CSS modules live under `public/css/modules/`; filenames use lowercase nouns (e.g., `layout.css`). Keep selectors terse and component-scoped.
- Avoid introducing Unicode characters unless the target file already uses them. Never read or modify legacy `_old` files.

## Testing Guidelines
- Manual validation is expected: use browser console tools and `localStorage.clear()` (when needed) to reset state.
- Document scenario coverage in PR descriptions until an automated suite exists.
- When adding future tests, prefer colocating them beside source modules and follow `*.test.js` naming.

## Commit & Pull Request Guidelines
- Follow Conventional Commits, e.g., `feat: scenario manager autosave`. Keep subjects under 50 characters and use an imperative verb.
- PRs should link related issues, describe validation steps, and include before/after screenshots for UI-facing changes.
- Keep diffs focused; avoid drive-by refactors in unrelated modules and call out any data model changes explicitly.

## Security & Configuration Tips
- Never commit secrets; this client-only app persists data only via `localStorage`.
- Respect the running development server on port 3000 and avoid starting redundant instances.
