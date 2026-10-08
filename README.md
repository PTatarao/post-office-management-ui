# Post Office Management UI

Angular 22 shipment and post-office operations interface for the REST API in the developer task.

## Run locally

Requirements: Node.js 24.15+ and npm.

```powershell
npm install
npm start
```

The development server runs at `http://localhost:4200`. Build the production bundle with `npm run build`.

## API configuration

The API base URL is configured in `src/app/environment.ts` and defaults to `https://localhost:7086`. The API must allow browser requests from the Angular dev-server origin. For a local HTTPS backend, trust its development certificate in the browser.

The API specification does not define `GET /api/post-offices`; the office screen therefore lists offices created or looked up in this browser, saved in local storage. Existing offices can be loaded by UUID.

`ShipmentStatus` and `WeightCategory` numeric values are not defined in the API schema. The UI currently assumes `0/1/2` map to origin processed/destination processed/delivered and under 1 kg/1-5 kg/over 5 kg. Update the constants in `src/app/models.ts` if the backend uses different values.