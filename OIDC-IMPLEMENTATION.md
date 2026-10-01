# TSCloak Angular OIDC implementation

The Angular UI uses `angular-auth-oidc-client` for the IDP Admin OIDC flow. Client Admin uses its legacy-compatible PKCE transaction because its client ID is dynamically selected from the login URL.

## Endpoints

- TSCloak OIDC/API: `http://localhost:3000`
- Angular UI: `http://localhost:4200`
- IDP Admin callback: `http://localhost:4200/idp-admin/callback`
- Client Admin callback: `http://localhost:4200/idp-client-admin/callback`

## Authentication responsibilities

`angular-auth-oidc-client` owns:

- Authorization Code + PKCE
- state and nonce handling
- OIDC discovery
- ID token validation
- token storage
- refresh-token renewal where configured
- logout/token revocation

The TSCloak-specific `OidcService` only handles portal-specific behavior, including loading `/me`, enforcing the required portal role, and routing to the appropriate dashboard.

The previous hand-written PKCE/state/nonce/token-exchange implementation is no longer used.

## Install

```bash
npm install
```

The project declares `angular-auth-oidc-client` as a runtime dependency.
