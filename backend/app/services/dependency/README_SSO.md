# SSO Extension Point

The `AbstractAuthProvider` in `auth.py` is the single swap point for switching auth strategy.

## Providers

| Provider | Activation | Use case |
|----------|-----------|----------|
| `JWTAuthProvider` | default (`AUTH_MODE` not set) | Production |
| `MockAuthProvider` | `AUTH_MODE=mock` | Local dev & tests |
| `OAuthProvider` (yours) | swap in `get_current_user` | SSO (Azure AD, Okta, Auth0) |

## How to add an SSO provider

1. Create a class inheriting `AbstractAuthProvider`:
   ```python
   class OAuthProvider(AbstractAuthProvider):
       async def get_current_user(self, token: str, db: AsyncSession) -> User:
           # Validate OIDC token, map claims to a local User record
           ...
   ```

2. Wire it into `get_current_user` in `auth.py`:
   ```python
   if os.getenv("AUTH_MODE") == "sso":
       return await _sso_provider.get_current_user(credentials.credentials, db)
   ```

3. No route code changes needed — `require_admin` and all endpoints stay unchanged.
