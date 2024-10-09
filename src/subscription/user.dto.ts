export class UserDto {
  exp: number;
  iat: number;
  auth_time: number;
  jti: string;
  iss: string;
  aud: string;
  sub: string;
  typ: string;
  azp: string;
  nonce: string;
  session_state: string;
  acr: string;
  allowed_origins: string[];
  realm_access: {
    roles: string[];
  };
  resource_access: {
    account: {
      roles: string[];
    };
  };
  scope: string;
  sid: string;
  email_verified: boolean;
  name: string;
  preferred_username: string;
  locale: string;
  given_name: string;
  family_name: string;
  email?: string;
}