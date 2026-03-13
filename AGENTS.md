# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the React 19 + TypeScript UI. `src/main.tsx` boots the app, `src/App.tsx` is the current top-level screen, and `src/assets/` holds imported assets. `public/` stores static files served as-is. `src-tauri/` contains the desktop shell: `src-tauri/src/main.rs` starts the app, `src-tauri/src/lib.rs` defines Tauri commands, `src-tauri/capabilities/default.json` limits permissions, and `src-tauri/icons/` holds bundle icons.

## Build, Test, and Development Commands
Use Bun for the frontend workflow; `bun.lock` is committed.

- `bun install` installs JavaScript dependencies.
- `bun run dev` starts the Vite frontend on port `1420`.
- `bun run tauri dev` launches the desktop app with the Rust backend and Vite dev server.
- `bun run build` runs `tsc` and creates the production frontend build in `dist/`.
- `bun run tauri build` packages the desktop application.
- `cargo check --manifest-path src-tauri/Cargo.toml` validates Rust changes without packaging.

## Coding Style & Naming Conventions
Follow the existing frontend style: 2-space indentation, double quotes, semicolons, PascalCase for React components, and camelCase for variables, hooks, and event handlers. Keep TypeScript strict-mode clean under `noUnusedLocals` and `noUnusedParameters`. For Rust, use `rustfmt` defaults, 4-space indentation, and snake_case for functions and Tauri commands. Prefer descriptive asset names such as `src/assets/status-ring.svg`.

## Testing Guidelines
There is no automated frontend or Rust test suite configured yet. Treat `bun run build` and `cargo check --manifest-path src-tauri/Cargo.toml` as the minimum validation before submitting changes. When adding nontrivial logic, place Rust unit tests beside the module they cover and add frontend tests as `*.test.tsx` under `src/` once a test runner is introduced.

## Commit & Pull Request Guidelines
No local Git history is available in this workspace, so there is no repository-specific commit pattern to mirror. Until one exists, use focused Conventional Commit messages such as `feat: add monitoring dashboard` or `fix: handle empty Tauri response`. Pull requests should explain the user-visible change, list validation steps, link related issues, and include screenshots or recordings for UI changes. Call out any edits to `src-tauri/capabilities/default.json` or `src-tauri/tauri.conf.json` explicitly.
