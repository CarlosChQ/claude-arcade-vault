# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault is a platform for playing games online and competing for the highest score. The repo is still close to the `create-next-app` scaffold: `app/page.tsx` and the metadata in `app/layout.tsx` are template placeholders, and no games, scoring or persistence exist yet.



No test runner is configured, so there is no test command yet.

The contact form on `/acerca` sends mail through Resend from a Server Action. It reads `RESEND_API_KEY` and `CONTACT_TO_EMAIL` (both required) and `CONTACT_FROM_EMAIL` (optional, defaults to `Arcade Vault <onboarding@resend.dev>`) on the server only. Copy `.env.template` to `.env.local` to set them. With the `onboarding@resend.dev` sender, Resend delivers only to the Resend account's own address. Without these variables the build still works and the form shows a generic error.

On a clean checkout, run `npx next typegen` before `tsc`. Global route helpers such as `LayoutProps<"/">` (used in `app/layout.tsx`) are generated into `.next/`, not imported.

## Next.js version

This project uses Next.js 16.4 and React 19.3, and their APIs may differ from your training data. As `AGENTS.md` requires, read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.

`next dev` manages blocks in `AGENTS.md` and restores them if removed. With `experimental.agentFeedback` enabled, it can also add a feedback-reporting block there. Commit `AGENTS.md` changes rather than reverting them.

## Skills
usa siempre /frontend-desing para diseñar el interfaz de usuario.

## Architecture

App Router only, with `app/` at the repo root (no `src/`). The `@/*` import alias resolves to the repo root.

`next.config.ts` enables settings that change how routes must be written:

- **`cacheComponents: true`**: data fetching is dynamic by default, and you opt in to caching with `"use cache"`, `cacheLife` and `cacheTag`. Uncached data accessed outside `<Suspense>` is a prerender error, and the error output lists the possible fixes. Route `runtime` exports are not supported.
- **Route state on navigation**: a side effect of `cacheComponents`. Next.js hides routes with React `<Activity>` instead of unmounting them, so state survives navigating away while effects are cleaned up and re-run. Anything driven by an effect, such as timers or animation loops, must stop in its cleanup and restart cleanly. See the `preserving-ui-state` guide in the bundled docs.
- **`partialPrefetching: true`**: links prefetch one reusable App Shell per route, and content that depends on `params` or `searchParams` resolves after navigation. Use `<Link prefetch={true}>` to fetch more. This option requires `cacheComponents`.

Tailwind CSS v4 runs through the `@tailwindcss/turbopack` loader configured in `next.config.ts`, so there is no PostCSS or Tailwind config file. Theme tokens are CSS variables in `app/globals.css`, exposed to Tailwind through `@theme inline`.

## Workflow

The project follows Spec Driven Design using the `/spec` and `/spec-impl` skills from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills). If they aren't available, install them with:

```bash
npx skills@latest add Klerith/fernando-skills
```
