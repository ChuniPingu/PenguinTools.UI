<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# Base UI (`@base-ui/react`)

Use [Base UI](https://base-ui.com) primitives — not Radix. Compose with the `render` prop (not `asChild`); merge props with `mergeProps`. See existing components in `src/components/ui/` for patterns.

# i18n

Do not hardcode user-facing strings. Use `useTranslation()` with `ui.*` keys from `src/locales/ui.en.json`. For CLI/diagnostic `MessageDescriptor` payloads, use `resolveMessage()` from `src/lib/messages.ts`. Backend message keys live in PenguinTools (`external/PenguinTools/docs/locales/messages.*.json`, symlinked under `src/locales/` — run `bun run setup` if missing).
