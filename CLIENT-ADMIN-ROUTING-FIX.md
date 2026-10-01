# TSCloak Angular - Client Admin Routing/Auth Fix

This bundle keeps the existing IDP Admin flow intact and fixes the Client Admin OIDC callback flow.

## Client Admin flow

`/idp-client-admin/:clientId`

-> load client OIDC configuration
-> generate PKCE/state/nonce
-> redirect to TSCloak `/auth`
-> return to `/idp-client-admin/callback`
-> exchange authorization code at `/token`
-> validate ID token and JWKS
-> load `/me`
-> require `IDP_CLIENT_ADMIN`
-> persist Client Admin tokens in `sessionStorage`
-> navigate to `/idp-client-admin/dashboard`

## Important fixes

- Client Admin callback identifies the portal from the actual callback URL.
- Callback displays progress messages during code exchange, token validation, profile loading, role checking, and dashboard navigation.
- Client Admin dashboard navigation uses `navigateByUrl('/idp-client-admin/dashboard')` and has a browser-navigation fallback if Angular reports a cancelled navigation.
- `/jwks` is included in the Angular dev proxy. This is required because Client Admin ID-token signature validation retrieves the provider JWKS through the Angular development server.
- Client Admin callback remains separate from `angular-auth-oidc-client` processing.
- IDP Admin continues using the existing `angular-auth-oidc-client` flow.
- Client ID remains required only on the Client Admin login entry URL; it is stored in `sessionStorage` for the callback.

## Run

```bash
npm install
npm start
```

Angular UI: `http://localhost:4200`
TSCloak API/IdP: `http://localhost:3000`

The Client Admin OIDC redirect URI must be:

`http://localhost:4200/idp-client-admin/callback`
