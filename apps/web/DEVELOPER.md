# Web Developer Docs

## Configuration

Create a `.env` file using the following template:

```sh
# Only used by docker-compose, ignored by vite
APP_PORT=5173

# Should match the `api` uri
VITE_API_URI=
VITE_APP_NAME="Single Digital Gateway"

VITE_OIDC_ISSUER=
VITE_OIDC_CLIENT_ID=
VITE_OIDC_REDIRECT_URI=http://localhost:5173/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:5173

VITE_CONSENT_MANAGER_API_URL=
VITE_SERVICE_CATALOGUE_API_URL=
```
