export default () => ({
  authServerUrl:
    process.env.KEYCLOAK_BASE_URL || 'http://localhost:8080',
  realm: process.env.KEYCLOAK_REALM || 'master',
  clientId: process.env.KEYCLOAK_CLIENT_ID || 'random',
  secret: process.env.KEYCLOAK_CLIENT_SECRET || 'secret',
});
