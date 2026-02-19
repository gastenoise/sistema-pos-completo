**Frontend local setup**

**About**

This frontend communicates directly with the backend API configured in your
environment variables.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_API_BASE_URL=your_backend_url

e.g.
VITE_API_BASE_URL=http://localhost:8000
```

Run the app: `npm run dev`

**Backend integration**

Start the backend API locally and point `VITE_API_BASE_URL` at its base URL so
the frontend can reach it.

## Timezone policy

- Keep the backend default Laravel timezone unchanged.
- The frontend must always render date/time values using the browser timezone
  through helpers in `src/lib/dateTime.js`.
- Do not hardcode `America/Argentina/Buenos_Aires` in UI components/pages.
- Do not use `toLocaleDateString`, `toLocaleString`, or
  `Intl.DateTimeFormat` directly in UI components/pages; use `lib/dateTime`
  helpers instead.

## npm audit (devDependencies)

`npm audit` may report vulnerabilities in **ajv** and **minimatch** coming from ESLint and its plugins. These are **devDependencies only** (they are not included in the production build). There is currently no safe fix: `npm audit fix --force` breaks peer dependencies and lint; upgrading to ESLint 10 requires plugin support that is not yet available. Until the ecosystem ships updated versions, these findings are accepted as low-risk for local/CI development.
