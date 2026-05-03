# Code Health Audit
**Generated:** 2026-05-03  
**Method:** `tsc --noEmit` (full TypeScript check) + `npm outdated` + `npm audit`  
**Build flags removed for audit:** `typescript: { ignoreBuildErrors: true }` (audit config saved as `next.config.audit.mjs`)  
**Note:** ESLint flag (`ignoreDuringBuilds: true`) was retained — ESLint is not installed at all (see Finding #2 below).

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| TypeScript errors | 1 | 🟡 Medium |
| ESLint status | Not installed | 🟡 Medium |
| Security vulnerabilities (npm audit) | 4 (1 moderate, 2 high, 1 critical) | 🔴 Critical |
| Significantly outdated packages | 5 | 🟡–🔴 |
| Peer dependency warnings | 0 | ✅ |

**Key finding:** The codebase is in remarkably clean TypeScript shape — `ignoreBuildErrors: true` is masking exactly **one** error. The bigger risks are the security vulnerabilities in `undici` and the major version drift on core dependencies.

---

## Top 10 Critical Errors

Only 1 actual TypeScript error was found:

| # | File | Line | Error | Category | Priority |
|---|------|------|-------|----------|----------|
| 1 | `src/app/api/cloudinary-gallery/route.ts` | 56 | `Cannot find module '@/lib/projects' or its corresponding type declarations` | Path alias mismatch | 🟡 Medium |

**Root cause:** `tsconfig.json` maps `@/*` to `./` (project root), but `src/lib/projects.ts` lives under `src/`. The correct path would be `../../lib/projects` (relative) or `@/src/lib/projects`. Next.js resolves this correctly at runtime (it internally maps `@/` to `src/`), which is why the build works — but `tsc --noEmit` uses the raw tsconfig and fails. This is a type-only import (`import type`), so there is **zero runtime impact**.

**Fix:** Change the import in `cloudinary-gallery/route.ts` line 56 from:
```ts
import type { GalleryProject, ProjectCategory } from "@/lib/projects";
```
to:
```ts
import type { GalleryProject, ProjectCategory } from "../../lib/projects";
```

---

## Finding #2 — ESLint Not Installed

ESLint is **not in `package.json` devDependencies at all**. The `eslint: { ignoreDuringBuilds: true }` flag in `next.config.mjs` is there specifically to suppress the error that would occur without it.

Without the flag, the build outputs:
```
⨯ ESLint must be installed in order to run during builds: npm install --save-dev eslint
Failed to compile.
```

**Implication:** There is **zero linting enforcement** on this codebase. No rules are catching:
- Unused variables
- Missing React keys
- Accessibility issues (`jsx-a11y`)
- Import ordering
- `any` usage

**Priority:** 🟡 Medium — Not breaking anything today, but means code quality relies entirely on developer discipline and TypeScript.

**Fix:** `npm install --save-dev eslint eslint-config-next` then create `.eslintrc.json` with `{ "extends": "next/core-web-vitals" }`.

---

## File Hot Spots

Only 1 TypeScript error exists, so no "hot spot" files in the TS sense. However, the files most likely to accumulate errors if stricter rules were applied:

| File | LOC | Risk Factors |
|------|-----|-------------|
| `admin/cockpit/page.tsx` | 1,648 | Heavy state, many `any`-typed API responses |
| `components/AdminPortal.tsx` | 2,125 | Complex async chains, mixed `any` usage |
| `internal/content-editor/page.tsx` | 1,628 | Form state, canvas operations |
| `api/cloudinary-gallery/route.ts` | ~100 | Current TS error lives here |
| `components/AttendanceAdminPanel.tsx` | 1,082 | API response mapping |

---

## Outdated Packages

### 🔴 Critical / High Risk

| Package | Current | Latest | Gap | Risk |
|---------|---------|--------|-----|------|
| `lucide-react` | 0.575.0 | 1.14.0 | 2 major versions | 🟡 Icon API changes between v0.x → v1.x; some icon names renamed. Needs audit before upgrade. |
| `@vercel/kv` | 1.0.1 | 3.0.0 | 2 major versions | 🟡 KV client API may have breaking changes. Used in `internal/api/tasks`. |
| `framer-motion` | 10.18.0 | 12.38.0 | 2 major versions | 🟡 Animation API changes; v11+ dropped some legacy hooks. |

### 🟡 Medium Risk

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `next` | 14.2.3 | 16.2.4 | 2 major versions. Next 15 has breaking changes (async `params`, `cookies()` API). Not urgent but drifting. |
| `react` / `react-dom` | 18.3.1 | 19.2.5 | React 19 is stable. Major new APIs (Actions, `use()`). Not breaking for existing code. |
| `@supabase/supabase-js` | 2.99.2 | 2.105.1 | Minor version drift — low risk, safe to `npm update`. |
| `@vercel/blob` | 2.3.1 | 2.3.3 | Patch — safe to update. |
| `autoprefixer` | 10.4.24 | 10.5.0 | Minor — safe to update. |
| `@types/node` | 20.19.33 | 25.6.0 | Major types version drift. May cause friction if Node version also diverges. |

---

## Security Vulnerabilities (`npm audit`)

**4 vulnerabilities** found, all in `undici` (HTTP client bundled within `next`):

| CVE / Advisory | Severity | Description |
|----------------|----------|-------------|
| GHSA-f269-vfmq-vjvj | 🔴 **Critical** | Malicious WebSocket 64-bit length overflows parser |
| GHSA-2mjp-6q6p-2qxm | 🔴 **High** | HTTP Request/Response Smuggling |
| GHSA-vrm6-8vpv-qv8q | 🔴 **High** | Unbounded memory consumption in WebSocket |
| GHSA-v9p9-hfj2-hcw8 | 🟡 **Moderate** | Invalid `server_max_window_bits` unhandled exception |
| GHSA-4992-7rv2-5pvq | 🟡 **Moderate** | CRLF Injection via `upgrade` option |

**Source:** `undici <=6.23.0` bundled within `node_modules/next`. Fix available via `npm audit fix` (no `--force` needed per npm output).

**Practical risk:** These vulnerabilities are in the HTTP client Next.js uses internally. In a server-rendered Next.js app on Vercel, the exposure is limited (Vercel handles the TLS/HTTP layer), but they should still be patched.

---

## Recommendations (Priority Order)

1. **🔴 Run `npm audit fix`** — patches the `undici` security vulnerabilities at no breaking-change risk. (5 minutes)
2. **🟡 Install ESLint** — `npm install --save-dev eslint eslint-config-next` + create `.eslintrc.json`. (30 minutes to set up + fix initial warnings)
3. **🟡 Fix TS path alias** — change one import in `cloudinary-gallery/route.ts` to remove the false type error. (2 minutes)
4. **🟡 Update safe minor/patch packages** — `@supabase/supabase-js`, `@vercel/blob`, `autoprefoster`, `postcss`. Run `npm update` for these. (10 minutes)
5. **🟡 Plan `lucide-react` upgrade** — audit icon name changes from v0.575 → v1.14, then upgrade. Check all `import { X } from "lucide-react"` usages. (1-2 hours)
6. **🟢 Plan `next` upgrade** — next v15 has breaking async `params` API. Requires careful migration. Not urgent but worth planning before next v17 arrives.

---

## Risk Assessment — If We Remove Both Flags Today

| Scenario | Estimated Fix Time |
|----------|-------------------|
| Remove `typescript: { ignoreBuildErrors }` only | **~5 minutes** — 1 import path to fix |
| Install ESLint + add `next/core-web-vitals` | **2-4 hours** — initial ESLint run will produce many warnings; bulk of work is `no-unused-vars` and `@typescript-eslint/no-explicit-any` in the large admin components |
| Full clean build (both flags removed, 0 errors/warnings) | **~1 day** — mostly ESLint cleanup across 5 large files |

**Verdict:** The TypeScript situation is excellent (1 trivial error). The ESLint situation is the real gap — there's no automated code quality gate at all.
