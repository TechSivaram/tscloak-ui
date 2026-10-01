<div align="center">

# <img src="public/assets/tscloak-icon.png" alt="TSCloak" width="48" valign="middle"> TSCloak Legacy → Angular

### Modernizing the administration experience. Preserving the identity platform.

<p>
  <img src="https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white" alt="Angular 22">
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" alt="TypeScript 6">
  <img src="https://img.shields.io/badge/NestJS-11+-E0234E?logo=nestjs&logoColor=white" alt="NestJS 11+">
  <img src="https://img.shields.io/badge/RxJS-7.8-B7178C?logo=reactivex&logoColor=white" alt="RxJS 7.8">
  <img src="https://img.shields.io/badge/OIDC-OpenID%20Connect-7B61FF" alt="OpenID Connect">
</p>

<p>
  <img src="https://img.shields.io/badge/angular--auth--oidc--client-22-0F0F0F" alt="angular-auth-oidc-client 22">
  <img src="https://img.shields.io/badge/Zod-4-3E67B1" alt="Zod 4">
  <img src="https://img.shields.io/badge/Vitest-5-6E9F18?logo=vitest&logoColor=white" alt="Vitest 5">
  <img src="https://img.shields.io/badge/Prettier-3.8-F7B93E?logo=prettier&logoColor=black" alt="Prettier 3.8">
</p>

**Legacy UI → Angular UI · IDP Admin + Client Admin · OIDC-aware administration**

</div>

---

> [!NOTE]
> This migration changes the presentation layer while keeping the existing TSCloak identity platform, NestJS APIs, OIDC behavior, authentication flows, and portal boundaries intact.



## ✨ What is changing?

The **legacy frontend is being progressively replaced with Angular**. The backend remains the source of truth for identity, OIDC, authorization, APIs, federation, MFA, and client configuration.

```mermaid
flowchart LR
    U[👤 Browser]

    subgraph OLD[Legacy UI — reference during migration]
        L[Legacy HTML / JS]
    end

    subgraph NEW[Angular UI — target]
        A[Angular Application]
        IA[IDP Admin]
        CA[Client Admin]
        SH[Shared Components]
        A --> IA
        A --> CA
        A --> SH
    end

    subgraph SERVER[TSCloak / NestJS]
        API[REST APIs]
        OIDC[OIDC Provider]
        AUTH[Authentication / MFA]
        FED[Federation]
        DB[(Database)]
        API --> DB
        OIDC --> AUTH
        AUTH --> DB
        FED --> DB
    end

    U -. visual & behavioral reference .-> L
    U --> A
    A --> API
    A --> OIDC
    API --> AUTH
```

### 🎯 Migration principle

**Change the presentation layer, not the identity platform.**

The Angular implementation should reproduce the required behavior of the legacy application while improving maintainability, component reuse, responsiveness, and long-term development velocity.

---

## 🧭 Table of contents

- [Goals](#-goals)
- [Target architecture](#-target-architecture)
- [Portal structure](#-portal-structure)
- [Application Screenshots](#-application-Screenshots)
- [Application structure](#-application-structure)
- [Authentication and request flow](#-authentication-and-request-flow)
- [Legacy compatibility](#-legacy-compatibility)
- [Shared profile behavior](#-shared-profile-behavior)
- [Responsive UI](#-responsive-ui)
- [Migration roadmap](#-migration-roadmap)
- [Page migration rules](#-page-migration-rules)
- [Development](#-development)
- [Angular + NestJS build](#-angular--nestjs-build)
- [Production architecture](#-production-architecture)
- [Verification checklist](#-verification-checklist)
- [Definition of done](#-definition-of-done)

---

## 🎯 Goals

- Replace the legacy HTML/JavaScript UI with maintainable Angular components.
- Preserve existing TSCloak backend APIs and OIDC behavior.
- Keep **IDP Admin** and **Client Admin** as separate portal experiences.
- Preserve route behavior and client-specific context.
- Centralize authentication, API configuration, session state, and shared UI behavior.
- Support desktop, tablet, and mobile layouts.
- Avoid backend changes solely because the frontend is being migrated.
- Allow Angular production files to eventually be served directly by NestJS.
- Make shared UI behavior consistent across both administration portals.

---

## 🏗️ Target architecture

```mermaid
flowchart TB
    Browser[🌐 Browser]

    Browser --> Public[Public TSCloak UI]
    Browser --> IDP[🔐 IDP Admin]
    Browser --> Client[👥 Client Admin]

    subgraph ANGULAR[Angular Frontend]
        Public
        IDP
        Client
        Core[Core
        • Auth
        • HTTP
        • Config
        • Services]
        Shared[Shared
        • Profile
        • Navigation
        • Security
        • UI components]

        IDP --> Core
        Client --> Core
        IDP --> Shared
        Client --> Shared
    end

    Core --> API[NestJS REST APIs]
    Core --> Provider[Nest OIDC Provider]

    subgraph NEST[NestJS / TSCloak]
        API
        Provider
        MFA[MFA / Security]
        Federation[Federation]
        Config[OIDC / Client Configuration]
    end

    API --> DB[(Database)]
    Provider --> MFA
    Provider --> Config
    API --> Federation
```

### Design boundary

| Layer | Responsibility |
|---|---|
| **Angular** | Presentation, routing, forms, UI state, API consumption |
| **NestJS** | APIs, identity operations, authorization, business rules |
| **OIDC provider** | Authorization flows, tokens, interactions, federation |
| **Database** | Persistent identity and configuration data |

---

## 🧩 Portal structure

TSCloak has two primary administration experiences.

```text
                         TSCloak
                            │
              ┌─────────────┴─────────────┐
              │                           │
        🔐 IDP Admin                👥 Client Admin
              │                           │
       Platform-level               Client-level
       administration               administration
              │                           │
       ┌──────┼──────┐             ┌──────┼──────┐
       │      │      │             │      │      │
     Users  Clients Roles        Users  Settings Security
       │      │      │             │      │      │
       └──────┴──────┘             └──────┴──────┘
```

### Public UI

```text
/
```

### IDP Admin

```text
/idp-admin
/idp-admin/dashboard
/idp-admin/users
/idp-admin/clients
/idp-admin/roles
/idp-admin/federation
/idp-admin/security-policy
/idp-admin/reset-password
/idp-admin/initial-access-tokens
```

### Client Admin

The client ID is required only for the Client Admin login entry point:

```text
/idp-client-admin/:clientId
```

After authentication, protected routes do not repeat the client ID:

```text
/idp-client-admin/callback
/idp-client-admin/dashboard
/idp-client-admin/users
/idp-client-admin/federation
/idp-client-admin/settings
/idp-client-admin/profile
/idp-client-admin/security
```

The client ID remains available through the established session/client context for OIDC configuration and subsequent API operations.

---

## 🖥️ Application Screenshots

The screenshots below cover the TSCloak Angular administration experience, shared authentication UI, OIDC flows, federation, security/MFA, and responsive views captured during development.

### 🔐 IDP Admin & Platform Administration

<details>
<summary><strong>IDP Admin — platform screens</strong></summary>

![TSCloak screenshot 06](docs/screenshots/screen-06.png)

![TSCloak screenshot 07](docs/screenshots/screen-07.png)

![TSCloak screenshot 08](docs/screenshots/screen-08.png)

![TSCloak screenshot 09](docs/screenshots/screen-09.png)

![TSCloak screenshot 10](docs/screenshots/screen-10.png)

![TSCloak screenshot 11](docs/screenshots/screen-11.png)

![TSCloak screenshot 12](docs/screenshots/screen-12.png)

![TSCloak screenshot 13](docs/screenshots/screen-13.png)

![TSCloak screenshot 14](docs/screenshots/screen-14.png)

![TSCloak screenshot 15](docs/screenshots/screen-15.png)

</details>

### 👥 Client Admin

<details>
<summary><strong>Client Admin — dashboard, users, settings, federation and profile</strong></summary>

![TSCloak Client Admin Dashboard](docs/screenshots/screen-21.png)

![TSCloak Client Admin Users](docs/screenshots/screen-22.png)

![TSCloak Client Admin Settings](docs/screenshots/screen-23.png)

![TSCloak Client Admin Federation](docs/screenshots/screen-24.png)

![TSCloak Client Admin Profile](docs/screenshots/screen-25.png)

</details>

### 🔒 Security, MFA & Recovery

<details>
<summary><strong>MFA enrollment, recovery and security actions</strong></summary>

![TSCloak MFA enrollment](docs/screenshots/screen-26.png)

![TSCloak MFA recovery](docs/screenshots/screen-27.png)

![TSCloak regenerate recovery codes](docs/screenshots/screen-28.png)

![TSCloak MFA verification](docs/screenshots/screen-29.png)

</details>

### 🔑 Authentication & OIDC Interaction Screens

<details>
<summary><strong>Login, authorization, password and authentication flows</strong></summary>

![TSCloak authentication screen 04](docs/screenshots/screen-04.png)

![TSCloak authentication screen 05](docs/screenshots/screen-05.png)

![TSCloak authentication screen 16](docs/screenshots/screen-16.png)

![TSCloak authentication screen 17](docs/screenshots/screen-17.png)

![TSCloak authentication screen 18](docs/screenshots/screen-18.png)

![TSCloak authentication screen 19](docs/screenshots/screen-19.png)

![TSCloak authentication screen 20](docs/screenshots/screen-20.png)

</details>

### Responsive UI

<details>
<summary><strong>Responsive UI for mobiles</strong></summary>

![TSCloak authentication screen 20](docs/screenshots/responsive.png)

</details>

> [!IMPORTANT]
> These screenshots were captured from the TSCloak demo/development environment. Before publishing them publicly, verify that visible client IDs, email addresses, setup keys, OTP values, recovery codes, tokens, or other environment-specific values are demo-only or redacted.

---

## 📁 Application structure

```text
src/
└── app/
    ├── core/
    │   ├── config/              # Application / API configuration
    │   ├── auth/                # Authentication / OIDC integration
    │   ├── http/                # HTTP infrastructure
    │   └── services/            # Core application services
    │
    ├── shared/
    │   ├── components/          # Reusable UI components
    │   ├── profile/             # Shared profile / roles UI
    │   ├── security/            # Shared security UI
    │   └── ui/                  # Common UI primitives
    │
    ├── layouts/
    │   ├── admin-layout/        # IDP Admin shell
    │   └── client-admin-layout/ # Client Admin shell
    │
    └── features/
        ├── auth/
        ├── admin/
        └── client-admin/
```

### Technology baseline

- **Angular 22**
- Standalone components
- Angular Router
- Signals where appropriate for local UI state
- SCSS component styling
- `angular-auth-oidc-client`
- RxJS
- Zod for validation/schema use in migrated forms

---

## 🔑 Authentication and request flow

Angular consumes the existing TSCloak identity infrastructure rather than creating a parallel authentication system.

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant A as Angular
    participant O as NestJS OIDC Provider
    participant API as NestJS API
    participant DB as Database

    B->>A: Open Admin portal
    A->>O: Start OIDC authorization
    O-->>B: Login / interaction
    B->>O: Authenticate
    O-->>A: Authorization callback
    A->>O: Token exchange / validation
    O-->>A: Authenticated session/tokens

    A->>API: Authenticated API request
    API->>DB: Read / write data
    DB-->>API: Result
    API-->>A: JSON response
    A-->>B: Render Angular UI
```

### Central configuration

Application configuration belongs in:

```text
src/app/core/config/app-config.ts
```

Do not scatter API origins or OIDC configuration across feature components.

For local development, `proxy.conf.json` can route Angular development requests to the local TSCloak server. The development proxy is not the production runtime architecture.

---

## 🔄 Legacy compatibility

The legacy implementation remains a **reference implementation during migration**.

Where applicable, legacy federation files such as:

```text
legacy-federation.html
legacy-federation.js
```

remain available for comparison.

### What must remain stable

```text
Legacy behavior
      │
      ├── API contracts
      ├── OIDC behavior
      ├── Session semantics
      ├── Authorization rules
      ├── Redirect behavior
      └── Client context
             │
             ▼
      Angular implementation
```

Existing session-storage keys and portal context should not be renamed or removed casually during a page migration. Authentication/session changes should be treated as a separate, explicitly verified change.

---

## 👤 Shared profile behavior

The profile component is shared across **IDP Admin** and **Client Admin**.

```mermaid
flowchart LR
    P[👤 Profile Area]
    IMG{Profile image available?}
    PHOTO[Display profile photo]
    INIT[Display initials fallback]
    HOVER[Hover profile area]
    TIP[Custom roles tooltip]
    ROLES[Role 1 · Role 2 · Role N]

    P --> IMG
    IMG -->|Yes| PHOTO
    IMG -->|No / load fails| INIT
    P --> HOVER
    HOVER --> TIP
    TIP --> ROLES
```

### Required behavior

1. Hovering the profile area displays the **custom roles tooltip**.
2. No native browser/HTML tooltip is displayed.
3. Multiple roles remain supported.
4. Profile photo is displayed when available.
5. Missing or failed profile images fall back to initials.
6. Behavior is identical across IDP Admin and Client Admin.

> **Important:** the custom tooltip must remain the single tooltip mechanism. Do not add `title`, a native browser tooltip, or a second tooltip directive to the same profile area.

---

## 📱 Responsive UI

The two Admin portals are designed to work across:

```text
┌──────────────────────────────────────────────────────────┐
│                    Desktop / Wide                        │
│  Sidebar      Content                         Profile    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│              Tablet                  │
│  Compact navigation + content        │
└──────────────────────────────────────┘

┌──────────────────────┐
│       Mobile         │
│  Menu → Content      │
│  Profile / Actions   │
└──────────────────────┘
```

Responsive behavior belongs in Angular layouts/component SCSS rather than ad-hoc inline styles.

---

## 🛣️ Migration roadmap

```mermaid
gantt
    title TSCloak Legacy → Angular Migration
    dateFormat  YYYY-MM-DD
    axisFormat  %b %Y

    section Foundation
    Angular shell / routing           :done, f1, 2026-08-01, 20d
    Shared UI / layouts                :done, f2, 2026-08-10, 25d
    Authentication integration         :done, f3, 2026-08-20, 20d

    section IDP Admin
    Dashboard                          :active, i1, 2026-09-01, 20d
    Users / Clients / Roles            :i2, after i1, 25d
    Federation / Security              :i3, after i2, 25d

    section Client Admin
    Dashboard / Users                  :c1, 2026-09-15, 25d
    Federation / Settings / Profile    :c2, after c1, 25d

    section Finalization
    Regression / cleanup               :r1, 2026-10-15, 20d
    Integrated NestJS deployment       :r2, after r1, 10d
```

> The dates above are a visual roadmap, not a commitment or release schedule. Update them as the migration progresses.

### Phase 1 — Shared foundation

- [x] Angular standalone application structure
- [x] Shared SCSS foundation
- [x] Existing TSCloak assets retained
- [x] Portal route helpers
- [x] Client-ID context
- [x] Portal-aware session state
- [x] Shared authentication service
- [x] HTTP authorization infrastructure
- [x] Shared brand/mobile navigation
- [x] Separate IDP Admin and Client Admin layouts

### Phase 2 — Authentication and portal entry

- [ ] IDP Admin login
- [ ] Client Admin login
- [ ] OIDC callback handling
- [ ] MFA/security flows
- [ ] Session restoration
- [ ] Logout / post-logout behavior

### Phase 3 — IDP Admin

- [ ] Dashboard
- [ ] Users
- [ ] Clients
- [ ] Roles
- [ ] Federation
- [ ] Security Policy
- [ ] Reset Password
- [ ] Initial Access Tokens
- [ ] Profile/security UI

### Phase 4 — Client Admin

- [ ] Dashboard
- [ ] Users
- [ ] Federation
- [ ] Settings
- [ ] Profile
- [ ] Security

### Phase 5 — Cleanup and deployment

- [ ] Remove obsolete legacy pages/scripts
- [ ] Remove temporary migration code
- [ ] Consolidate duplicated styles/components
- [ ] Final production build
- [ ] NestJS static serving
- [ ] SPA fallback verification
- [ ] End-to-end regression verification

---

## 🧠 Page migration rules

Every legacy page should follow the same migration loop:

```mermaid
flowchart TD
    A[📄 Select legacy page]
    B[🔍 Understand behavior]
    C[🧩 Identify reusable Angular pieces]
    D[🏗️ Implement Angular page]
    E[🔌 Connect existing APIs]
    F[📱 Match responsive behavior]
    G[🧪 Verify functional states]
    H[👀 Compare with legacy UI]
    I{Verified?}
    J[✅ Mark migrated]
    K[🔧 Fix differences]

    A --> B --> C --> D --> E --> F --> G --> H --> I
    I -->|Yes| J
    I -->|No| K --> D
```

### Rules

1. Understand the legacy behavior first.
2. Preserve API contracts unless a backend change is explicitly required.
3. Preserve authentication and authorization semantics.
4. Preserve route behavior and redirects.
5. Reproduce responsive behavior.
6. Reuse shared Angular components instead of duplicating them.
7. Keep page-specific state inside the feature component/service.
8. Avoid global CSS for page-specific requirements.
9. Verify loading, empty, error, success, and unauthorized states.
10. Compare at desktop and mobile widths.
11. Keep migration changes isolated; avoid unrelated fixes in the same change.

---

## 🧪 UI verification matrix

| Area | IDP Admin | Client Admin |
|---|:---:|:---:|
| Login | ☐ | ☐ |
| OIDC callback | ☐ | ☐ |
| MFA/security | ☐ | ☐ |
| Dashboard | ☐ | ☐ |
| Users | ☐ | ☐ |
| Federation | ☐ | ☐ |
| Profile image fallback | ☐ | ☐ |
| Multiple-role tooltip | ☐ | ☐ |
| No native tooltip | ☐ | ☐ |
| Mobile layout | ☐ | ☐ |
| Logout | ☐ | ☐ |

---

## 🧰 Tools & technologies used

The migration uses a focused Angular toolchain around the existing TSCloak backend.

| Tool / technology | Version | Purpose |
|---|---:|---|
| **Angular** | 22 | Component-based frontend, routing, forms and application structure |
| **Angular CLI / Angular Build** | 22 | Local development and production builds |
| **TypeScript** | 6 | Application language and type safety |
| **RxJS** | 7.8 | Reactive data and asynchronous application flows |
| **angular-auth-oidc-client** | 22 | OIDC client integration |
| **Zod** | 4 | Runtime schema validation where needed |
| **Vitest** | 5 | Unit/component test tooling |
| **JSDOM** | 30 | Browser-like DOM environment for tests |
| **Prettier** | 3.8 | Consistent source formatting |
| **NestJS** | 11+ | Existing backend/API and identity server |
| **OIDC / OpenID Connect** | — | Authentication and authorization protocol |
| **Mermaid** | — | Architecture and flow diagrams in this README |
| **Shields.io** | — | Project/tool badges in this README |

### Frontend toolchain

```text
┌─────────────────────────────────────────────────────────────┐
│                     TSCloak Angular UI                      │
├─────────────────────────────────────────────────────────────┤
│ Angular 22        → UI + routing + standalone components   │
│ TypeScript 6      → Application language                   │
│ RxJS 7.8          → Reactive flows                         │
│ OIDC Client 22    → Authentication / OIDC integration     │
│ Zod 4             → Runtime validation                     │
│ Vitest 5 + JSDOM  → Testing                               │
│ Prettier 3.8      → Formatting                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Existing TSCloak Backend                 │
│                NestJS + OIDC Provider + APIs               │
└─────────────────────────────────────────────────────────────┘
```

> [!TIP]
> The project already contains the TSCloak brand assets under `public/assets/`, including the icon, full brand image, and horizontal brand image.

---

## 💻 Development

Install dependencies:

```bash
npm install
```

Start Angular development server:

```bash
npm start
```

Build Angular:

```bash
npm run build
```

Run tests:

```bash
npm test
```

### Local development model

```mermaid
flowchart LR
    DEV[Developer]
    NG[Angular dev server]
    PROXY[proxy.conf.json]
    NEST[NestJS local server]
    DB[(Local DB)]

    DEV --> NG
    NG --> PROXY
    PROXY --> NEST
    NEST --> DB
```

The Angular development server is only a development convenience. Production should use the intended deployment architecture below.

---

## 📦 Angular + NestJS build

`nest build` builds the NestJS backend. It does **not** automatically build Angular.

For TSCloak, use a project-level build command that orchestrates both builds.

### Recommended build flow

```text
npm run build
       │
       ├── 🅰️ Build Angular UI
       │      ├── IDP Admin
       │      └── Client Admin
       │
       └── 🟢 Build NestJS backend
```

A final project-level build can therefore produce:

```text
TSCloak build output
├── server/
│   └── NestJS compiled application
│
└── public/
    ├── idp-admin/
    │   └── Angular production files
    │
    └── client-admin/
        └── Angular production files
```

The exact output directories should follow the repository's final workspace structure.

---

## 🚀 Production architecture

The desired deployment model is a **single NestJS-served application**.

```mermaid
flowchart TB
    B[🌐 Browser]
    N[🟢 NestJS Server]

    B --> N

    N -->|/api/*| API[REST APIs]
    N -->|/auth/* / OIDC| OIDC[OIDC Provider]
    N -->|/idp-admin/*| IDP[Angular IDP Admin static files]
    N -->|/idp-client-admin/*| CLIENT[Angular Client Admin static files]
    N -->|SPA fallback| INDEX[Angular index.html]

    API --> DB[(Database)]
    OIDC --> DB
```

### Example same-origin URLs

```text
https://tscloak.example.com/
https://tscloak.example.com/idp-admin/
https://tscloak.example.com/idp-client-admin/<clientId>
https://tscloak.example.com/api/...
```

This model reduces frontend/backend cross-origin complexity because the browser can communicate with the UI and API through the same origin.

### SPA fallback

Deep links must return Angular's `index.html` rather than a server-side 404.

For example:

```text
GET /idp-admin/users
          │
          ▼
     NestJS static server
          │
          ├── /assets/... → static asset
          ├── /api/...    → NestJS API
          └── /idp-admin/users
                    │
                    ▼
              Angular index.html
                    │
                    ▼
             Angular Router
                    │
                    ▼
             Users component
```

When using `@nestjs/serve-static`, make sure the final static-file configuration and SPA fallback do not accidentally intercept API/OIDC endpoints.

---

## ✅ Verification checklist

### Functional

- [ ] Route loads directly and through navigation.
- [ ] Authentication works.
- [ ] API calls reach the existing TSCloak backend.
- [ ] Authorization is preserved.
- [ ] Loading state works.
- [ ] Empty state works.
- [ ] Error state works.
- [ ] Logout works.

### Visual

- [ ] Desktop layout matches the legacy UI requirements.
- [ ] Tablet layout is usable.
- [ ] Mobile layout is usable.
- [ ] Spacing and typography are consistent.
- [ ] Icons and assets are correctly positioned.
- [ ] No unintended browser/native tooltips appear.
- [ ] Profile image falls back to initials when unavailable.
- [ ] Multiple roles display correctly.

### Regression

- [ ] IDP Admin remains functional.
- [ ] Client Admin remains functional.
- [ ] Client ID is preserved through login/OIDC configuration.
- [ ] Existing session behavior remains compatible.
- [ ] Existing federation behavior remains intact.
- [ ] Existing MFA/security behavior remains intact.
- [ ] No unrelated migrated screen is broken.

---

## 🎨 TSCloak branding

The migration keeps the existing TSCloak visual identity instead of introducing an Angular-only brand.

```text
public/
└── assets/
    ├── tscloak-icon.png
    ├── tscloak-brand.png
    ├── tscloak-brand-horozontal.png
    ├── google-g.svg
    └── linkedin.png
```

### Documentation style

The README follows the visual convention already used by the TSCloak MFA documentation:

- TSCloak icon in the title
- Centered product tagline
- Technology badges
- Mermaid architecture and flow diagrams
- Clear navigation and section hierarchy

This keeps the Angular migration documentation visually consistent with the existing TSCloak technical documentation.

---

## 🏁 Definition of Done

A screen is considered migrated when:

```text
                  ┌──────────────────────┐
                  │ Legacy screen chosen │
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │ Angular implementation│
                  └──────────┬───────────┘
                             ▼
              ┌──────────────────────────────┐
              │ Functional + visual parity  │
              └──────────────┬───────────────┘
                             ▼
                  ┌──────────────────────┐
                  │ Responsive verified  │
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │ Regression verified  │
                  └──────────┬───────────┘
                             ▼
                        ✅ MIGRATED
```

A migration is complete only when all required legacy screens have been replaced, their behavior has been verified, and legacy-only frontend code is no longer required.

---

## 🧹 Final cleanup

Once migration reaches completion:

- Remove obsolete legacy HTML/JS.
- Remove migration-only compatibility code.
- Remove duplicated styles.
- Remove unused assets.
- Remove dead routes.
- Remove temporary debugging code.
- Consolidate duplicate Angular components.
- Verify a clean production build.
- Verify NestJS serves the Angular application correctly.
- Perform a final OIDC, MFA, federation, API, and responsive regression pass.

---

<p align="center">
  <b>🔐 TSCloak</b><br />
  <sub>Legacy UI → Angular • Same identity platform • Cleaner frontend architecture</sub>
</p>
