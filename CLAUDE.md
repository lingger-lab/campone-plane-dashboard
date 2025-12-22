# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CampOne Admin Dashboard (캠프원 관리자 대시보드) - A Korean political campaign management platform with 5 core modules: Insights (여론 분석), Studio (콘텐츠), Policy Lab (정책), Ops (운영), and Civic Hub (시민 소통).

## Commands

```bash
npm run dev      # Start development server (MSW auto-initializes)
npm run build    # Production build
npm run lint     # ESLint
npm run format   # Prettier formatting
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **State**: Zustand (global), TanStack Query (server state)
- **UI**: Radix UI primitives styled via shadcn/ui pattern
- **Forms**: react-hook-form + zod validation
- **Charts**: Recharts
- **API Mocking**: MSW (Mock Service Worker) - auto-starts in dev mode

### Route Structure
```
src/app/
├── page.tsx                    # Main dashboard
├── (modules)/                  # Route group for modules
│   ├── layout.tsx              # Shared module layout (header + sidebar)
│   ├── pulse/                  # M1: Insights (여론 트렌드)
│   ├── studio/                 # M2: Content Studio
│   ├── policy/                 # M3: Policy Lab
│   ├── ops/                    # M4: Operations
│   └── hub/                    # M5: Civic Hub
├── channels/                   # Channel link management
├── roles/                      # RBAC management
├── audit/                      # Activity logs
├── settings/                   # System settings
└── help/                       # Help center
```

### Key Patterns

**Component Organization**
- `src/components/ui/` - Primitive UI components (button, card, badge, etc.)
- `src/components/layout/` - App shell components (AppHeader, Sidebar, AppFooter)
- `src/components/dashboard/` - Dashboard-specific components (KPICard, ModuleCard)
- `src/components/modules/` - Module-specific components

**API Layer**
- All API endpoints are mocked via MSW handlers in `src/mocks/handlers.ts`
- Base path: `/api/v1/*`
- Mock data in `src/mocks/data/*.json`

**RBAC System**
- Defined in `src/lib/rbac.ts`
- Four roles: Admin, Manager, Staff, Viewer
- Permission matrix for entities: contacts, segments, messages, campaigns, events, donations, tasks, policy, studio, ops, roles, audit, settings, channels
- Use `hasPermission(role, entity, action)` to check permissions

**Trend Index Calculation**
- Composite index formula: GT 30% + Naver 30% + SNS 40%
- Implementation in `src/lib/trendIndex.ts`
- Includes spike detection and WoW (Week over Week) calculations

### Styling
- Tailwind CSS with custom design tokens in `tailwind.config.ts`
- Brand colors: primary (#2563EB), accent (#22C55E)
- Typography scale: headline-1/2/3, body-lg/md/sm, caption
- Class merging utility: `cn()` from `src/lib/utils.ts`
- Dark mode support via `class` strategy

### Providers
App providers in `src/app/providers.tsx`:
1. QueryClientProvider (TanStack Query with 1min staleTime)
2. ThemeProvider (next-themes)
3. MSW initialization (dev only)
