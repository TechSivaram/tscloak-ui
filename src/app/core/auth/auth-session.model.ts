export type Portal = 'idp-admin' | 'idp-client-admin';

export interface AuthUser {
  id?: string;
  username?: string;
  displayName?: string;
  email?: string;
  roles: string[];
  [key: string]: unknown;
}

export interface AuthSession {
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  clientId: string | null;
  user: AuthUser | null;
}
