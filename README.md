# Roadmap Builder

Assemble a roadmap from a catalog of milestones and features, and see what it
costs as you build it.

The problem it solves: deciding scope with a client usually happens in a
spreadsheet or a slide, where nothing recalculates and nobody can feel the
trade-offs. Here, milestones and features are a catalog you pick from, the
running total updates as you choose, and the result is a roadmap you can talk
through.

## How it works

A **catalog** of milestones and features is defined in `src/content/` as
markdown. Nothing in it is a decision — it is what is _available_.

A **roadmap** is what someone assembles from that catalog. It lives in the
browser's localStorage, so it survives a reload without needing a database or
a sign-in. A milestone is in the roadmap or it is not; there is no third state,
no budget ceiling, and therefore nothing to be over.

A milestone's price is simply the sum of the features in it. Changing a price
means changing what is included.

### Pages

| Route              | What it does                                                  |
| ------------------ | ------------------------------------------------------------- |
| `/`                | Choose from suggested milestones, or start your own           |
| `/roadmap`         | What you have assembled, grouped by milestone, with the total |
| `/features`        | The full catalog, with filters and per-option counts          |
| `/features/[id]`   | One feature: body, dependencies as a tree or a diagram        |
| `/milestones/[id]` | One milestone and the features in it                          |
| `/milestones/edit` | Build or change a milestone; no `?id` starts a new one        |

## Making it yours

Most of what makes this _your_ roadmap is content and config, not code.

- **`src/content/`** — the milestones, features and tags. The filename stem is
  the ID. Features record dependencies in one direction with `blockedBy`; the
  reverse is derived when the catalog is built, so the two can never disagree.
- **`src/config/categories.ts`** — the kinds of work a feature can be.
- **`src/config/statuses.ts`** — the ordered status lists. Position in the array
  is the order; there is no separate field.
- **`src/config/sizes.ts`** — the sizing scale and what a unit is worth. Sizes
  can display as t-shirt letters, points, or money by changing `displayUnit`.
- **`src/config/labels.ts`** — the words the interface uses. If your domain
  calls a feature a "proposal", change it here and nowhere else.
- **`src/styles/themes/default.css`** — the palette, type and geometry. Copy it,
  change the values, and point `global.css` at the copy.

Content is validated at build time: a reference to a milestone or feature that
does not exist, an unknown tag, or a cycle in the dependency graph all fail the
build with the offending entry named.

## Running it

```sh
pnpm install
pnpm dev          # http://localhost:4321
pnpm checks       # types, lint, formatting
pnpm test         # unit tests
pnpm build
```

Requires Node 22.18 or newer, and pnpm.

## Built with

Astro with Svelte islands, nanostores for state, Zod for content schemas, plain
CSS with design tokens, Vitest for tests. It builds to a fully static site; the
Cloudflare adapter is configured so a later page that needs a database can opt
into on-demand rendering without changing the hosting.

## Licence

MIT. See [LICENSE](./LICENSE).
