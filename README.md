# TSCloak Angular UI

Angular 22 implementation of the TSCloak public site, IDP Admin portal, and Client Admin portal.

## Routes

- `/` — public TSCloak site
- `/idp-admin` — IDP Admin sign-in
- `/idp-admin/dashboard` — IDP Admin dashboard
- `/idp-client-admin/:clientId` — Client Admin sign-in
- `/idp-client-admin/dashboard` — Client Admin dashboard

The IDP Admin and Client Admin routes deliberately use different layout components and styling systems, matching the supplied legacy implementation.

## Assets

Original TSCloak assets from the supplied bundle are retained under `src/assets/`.

## Architecture

- Standalone Angular components
- Signals for UI state
- SCSS component styling
- Zod dependency reserved for migrated validation schemas
- Lazy placeholder pages are wired for the remaining legacy screens so the route hierarchy is established before each feature is migrated.

## Build

Run `npm install` and then `npm start` in an environment with the Angular 22 dependencies available.

## Client Admin route model

Client Admin uses the client ID only for the login entry URL:

- `/idp-client-admin/:clientId` — Client Admin login entry
- `/idp-client-admin/callback` — OIDC callback
- `/idp-client-admin/dashboard` — protected application
- `/idp-client-admin/users` — protected application
- `/idp-client-admin/federation` — protected application
- `/idp-client-admin/settings` — protected application
- `/idp-client-admin/profile` — protected application
- `/idp-client-admin/security` — protected application

The login client ID is retained in session storage for OIDC configuration and is not included in the protected application URLs.

## IDP/API URL configuration

The Angular application keeps the TSCloak IDP/API origin in one place:

`src/app/core/config/app-config.ts`

Change `appConfig.idpUrl` when the TSCloak IDP/API is hosted somewhere other than the local development server. Application code for both IDP Admin and Client Admin imports this value instead of hardcoding the IDP origin.

The Angular development proxy (`proxy.conf.json`) still targets the local TSCloak server because that file is development-server infrastructure, not application runtime configuration.
