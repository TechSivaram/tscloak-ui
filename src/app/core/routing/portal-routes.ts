export const PORTAL_ROUTES = {
  idpAdmin: '/idp-admin',
  clientAdmin: '/idp-client-admin',
} as const;

export const idpAdminUrl = (page = '') =>
  page ? `${PORTAL_ROUTES.idpAdmin}/${page}` : PORTAL_ROUTES.idpAdmin;

export const clientAdminUrl = (clientId: string, page = '') =>
  page
    ? `${PORTAL_ROUTES.clientAdmin}/${encodeURIComponent(clientId)}/${page}`
    : `${PORTAL_ROUTES.clientAdmin}/${encodeURIComponent(clientId)}`;
