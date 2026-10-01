// OIDC access-token attachment is handled by angular-auth-oidc-client's
// interceptor configuration. This file is intentionally kept as a no-op
// compatibility point for code that imports the previous interceptor.
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => next(req);
