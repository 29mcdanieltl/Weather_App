import express from 'express';

type WeatherFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type ApiData = Record<string, unknown>;

function isRecord(value: unknown): value is ApiData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberAt(value: unknown, index = 0): number | null {
  if (!Array.isArray(value)) return null;
  const parsed = Number(value[index]);
  return value[index] === null || value[index] === undefined || !Number.isFinite(parsed) ? null : parsed;
}

function weatherPhrase(code: number | null): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code !== null && [51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if (code !== null && [61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if (code !== null && [71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if (code === 95 || code === 96 || code === 99) return 'Thunderstorm';
  return 'Current conditions';
}

class OpenMeteoApiError extends Error {
  constructor(readonly status: number) {
    super(`Open-Meteo returned HTTP ${status}`);
  }
}

export function createWeatherApp(fetchWeather: WeatherFetch = fetch) {
  const app = express();

  async function weatherRequest(url: URL) {
    const response = await fetchWeather(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new OpenMeteoApiError(response.status);
    const data: unknown = await response.json();
    if (!isRecord(data)) throw new Error('Open-Meteo returned an invalid response.');
    return data;
  }

  app.get('/api/weather', async (request, response) => {
    const city = String(request.query.city || '').trim().slice(0, 100);
    if (!city) return response.status(400).json({ error: 'Enter a city or ZIP code to search.' });

    try {
      const locationUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
      locationUrl.searchParams.set('name', city);
      locationUrl.searchParams.set('count', '1');
      locationUrl.searchParams.set('language', 'en');
      locationUrl.searchParams.set('format', 'json');

      const locations = await weatherRequest(locationUrl);
      const location = Array.isArray(locations.results) && isRecord(locations.results[0])
        ? locations.results[0]
        : null;
      if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        return response.status(404).json({ error: `No matching location found for "${city}". Try a nearby city name.` });
      }

      const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
      forecastUrl.searchParams.set('latitude', String(location.latitude));
      forecastUrl.searchParams.set('longitude', String(location.longitude));
      forecastUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,uv_index');
      forecastUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
      forecastUrl.searchParams.set('temperature_unit', 'fahrenheit');
      forecastUrl.searchParams.set('wind_speed_unit', 'mph');
      forecastUrl.searchParams.set('precipitation_unit', 'inch');
      forecastUrl.searchParams.set('timezone', 'auto');
      forecastUrl.searchParams.set('forecast_days', '5');

      const forecastData = await weatherRequest(forecastUrl);
      const current = isRecord(forecastData.current) ? forecastData.current : {};
      const daily = isRecord(forecastData.daily) ? forecastData.daily : {};
      const days = Array.isArray(daily.time) ? daily.time : [];
      const forecast = days.map((day, index) => ({
        day: typeof day === 'string' ? day : '',
        phrase: weatherPhrase(numberAt(daily.weather_code, index)),
        high: numberAt(daily.temperature_2m_max, index),
        low: numberAt(daily.temperature_2m_min, index),
        iconCode: numberAt(daily.weather_code, index) ?? 0,
      })).filter((day) => day.day);

      const currentIconCode = numberAt([current.weather_code]) ?? 0;
      response.json({
        city: location.name,
        region: typeof location.admin1 === 'string' ? location.admin1 : '',
        country: typeof location.country === 'string' ? location.country : '',
        localTime: typeof current.time === 'string' ? current.time : '',
        temperature: numberAt([current.temperature_2m]),
        feelsLike: numberAt([current.apparent_temperature]),
        phrase: weatherPhrase(currentIconCode),
        iconCode: currentIconCode,
        humidity: numberAt([current.relative_humidity_2m]),
        windSpeed: numberAt([current.wind_speed_10m]),
        windDirection: numberAt([current.wind_direction_10m]),
        uvIndex: numberAt([current.uv_index]),
        precipitation: numberAt([current.precipitation]),
        high: numberAt(daily.temperature_2m_max),
        low: numberAt(daily.temperature_2m_min),
        forecast,
      });
    } catch (error) {
      if (error instanceof OpenMeteoApiError) {
        console.error('Open-Meteo request failed:', error.message);
        if (error.status === 429) {
          return response.status(502).json({ error: 'The weather service is receiving too many requests. Try again shortly.' });
        }
        return response.status(502).json({ error: 'Open-Meteo is temporarily unavailable. Try again later.' });
      }
      const message = error instanceof Error ? error.message : 'The weather service could not be reached.';
      console.error('Open-Meteo request failed:', message);
      return response.status(502).json({ error: 'Could not reach Open-Meteo. Check your connection and try again.' });
    }
  });

  return app;
}
