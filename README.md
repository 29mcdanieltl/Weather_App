# Weather Desk

A responsive weather dashboard powered by Open-Meteo's geocoding and forecast APIs. The custom React interface talks to a small Express proxy, which keeps upstream requests in one place. No API key or `.env` setup is required for non-commercial use.

## Requirements

- Node.js 20 or newer

## Setup

1. Install dependencies with `npm install`.
2. Start the app with `npm run dev`.
3. Open the local Vite URL shown in the terminal, usually `http://localhost:5173`.

The development command runs the Express proxy on port 3001 and Vite on port 5173. City names are resolved with the Open-Meteo Geocoding API; current conditions and a five-day forecast come from the Open-Meteo Forecast API. Weather values are live API data, not mock data.

Open-Meteo's free API is for non-commercial use and is subject to request limits and CC BY 4.0 attribution requirements. The app links to Open-Meteo in its footer. For commercial use, review Open-Meteo's [terms](https://open-meteo.com/en/terms) and [pricing](https://open-meteo.com/en/pricing).

Run `npm test` for API search and error-flow tests. Run `npm run build` to type-check and create the production frontend bundle. In production, the Express server serves both the built frontend and the weather API.

## Publish a shareable website on Render

1. Push this project, including `render.yaml`, to a GitHub repository.
2. In Render, choose **New → Blueprint**, connect the repository, and deploy the `weather-desk` service defined in `render.yaml`.
3. When the deployment finishes, open the `onrender.com` URL Render provides and share it.

The free Render service may sleep when idle and take a little time to wake up on the next visit. The Open-Meteo free API is for non-commercial use; see its terms before using this publicly.
