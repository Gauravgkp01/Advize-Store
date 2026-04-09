# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Shop (artifacts/shop) — previewPath: /
A beginner-friendly, mobile-first Shopify-like store builder. Pure frontend with mock data. No backend integration.

**Pages:**
- `/` — Landing page with hero section and CTA
- `/onboarding` — 3-step store setup wizard (business name, category, WhatsApp)
- `/dashboard` — Stats cards (revenue, orders, products) + product grid
- `/add-product` — Form to add a new product
- `/store/:slug` — Public-facing storefront page
- `/product/:id` — Product detail with coupon input and WhatsApp order button

**Tech stack:**
- React + Vite + Wouter (routing)
- Tailwind CSS + shadcn/ui
- react-hook-form + zod for forms
- framer-motion for animations
- Mock data in `src/lib/mock-data.ts`

**Key Components:**
- `Navbar` — Top navigation bar
- `ProductCard` — Product display with copy/share actions
- `StatCard` — Dashboard stat display
- `StepIndicator` — Onboarding progress indicator

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
