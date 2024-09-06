export type User = {
    access?: Map<string, boolean>;
    attributes?: Map<string, string[]>;
    clientConsents?: UserConsentRepresentation[];
    clientRoles?: Map<string, string[]>;
    createdTimestamp?: number;
    credentials?: CredentialRepresentation[];
    disableableCredentialTypes?: string[];
    email?: string;
    emailVerified?: boolean;
    enabled?: boolean;
    federatedIdentities?: FederatedIdentityRepresentation[];
    federationLink?: string;
    firstName?: string;
    groups?: string[];
    id?: string;
    lastName?: string;
    notBefore?: number;
    origin?: string;
    realmRoles?: string[];
    requiredActions?: string[];
    self?: string;
    serviceAccountClientId?: string;
    username?: string;
  };

type UserConsentRepresentation = {
clientId?: string;
createdDate?: number;
lastUpdatedDate?: number;
grantedClientScopes?: string[];
};

type CredentialRepresentation = {
    createdDate?: number; // integer(int64)
    credentialData?: string;
    id?: string;
    priority?: number; // integer(int32)
    secretData?: string;
    temporary?: boolean;
    type?: string;
    userLabel?: string;
    value?: string;
};

type FederatedIdentityRepresentation = {
    identityProvider?: string;
    userId?: string;
    userName?: string;
};

export type AdditionalProperties = {
    clientId?: string;
    source?: string;
}