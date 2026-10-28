# KK Collection

A full-stack cosmetics and beauty storefront built with React, TypeScript, Vite, Express, and Firebase. It includes a product catalog, customer accounts, checkout, order management, and an admin portal.

## Requirements

- Node.js 20.19 or newer
- npm

## Run locally

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env` and set `JWT_SECRET` and `PAYMENT_GATEWAY_SECRET` to independent random values. Generate each with:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Set both `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` if you want to create a password-based administrator when the local database is first created. Use a unique password of at least 12 characters. Existing database files are not reseeded.

3. Start the app:

   ```sh
   npm run dev
   ```

   The Express server and Vite development middleware run at `http://localhost:3000`.

## Checks and production build

```sh
npm run lint
npm run build
npm start
```

`npm start` serves the production build, so run `npm run build` first. The JSON database is stored in `data/database.json` for local development and is intentionally excluded from Git. It is not suitable for multi-instance production deployments; configure a durable database before deploying.

The checkout payment flow is a local simulation. It does not charge cards or connect to a real payment provider; integrate and validate a provider before accepting real payments.

## Firebase configuration

The Firebase web configuration is in `firebase-applet-config.json`. Firebase web API keys and client IDs are public identifiers, not server secrets; restrict the API key to the required APIs and domains in Google Cloud, and deploy the Firestore rules in `firestore.rules`. Never put service-account credentials or other private keys in this repository.

## GitHub

Before pushing, confirm that `.env`, `data/database.json`, generated output, and any private Firebase/service-account credentials are not staged. Configure production secrets in the deployment platform rather than committing them.

After creating an empty repository on GitHub, connect and push this local `main` branch:

```sh
git remote add origin https://github.com/<username>/<repository>.git
git add .
git status
git commit -m "Prepare KK Collection for GitHub"
git push -u origin main
```
