# TSCloak Angular migration — Phase 1: Shared foundation

This phase establishes the Angular architecture without migrating page-specific business UI.

## Included

- Angular 22 standalone application structure
- SCSS design tokens, reset, mixins and utilities
- Original TSCloak assets retained under `src/assets`
- Portal route helpers and client-id context service
- Portal-aware session state backed by the legacy sessionStorage keys
- Shared authentication service and HTTP authorization interceptor
- Reusable brand and mobile-navigation primitives
- Centralized API error model
- One layout outlet per portal:
  - `/idp-admin/**`
  - `/idp-client-admin/:clientId/**`
- Existing portal dashboards remain available only as temporary migration anchors

## Deliberately not migrated yet

- Page-specific API/business logic
- Dashboard/client/user/federation/settings/security/profile forms
- OIDC callback implementation
- Zod schemas for individual forms
- Signal Forms for individual forms

Those belong to the page-by-page migration phase so the legacy implementation can be compared with each Angular page.
