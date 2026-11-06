<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Actual frontend workspace

- Apply code changes in this actual project, not an isolated design copy.
- client and admin are separate Next.js apps. Put genuinely shared code in packages/shared or packages/ui.
- Run pnpm check, pnpm typecheck, pnpm build from this root.
- Next.js local guides resolve under client/node_modules/next or admin/node_modules/next.

- Preserve the active dark/mint design during structural refactors. Shared design lives in packages/ui; client layouts and admin CSS are in the actual app folders. Do not replace the actual source with an older design copy.
