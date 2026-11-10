import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test, type TestContext } from 'node:test';
import { createWeatherApp } from './app';

const locationData = {
  results: [{
    name: 'Berlin',
    admin1: 'Berlin',
    country: 'Germany',
    latitude: 52.52,
    longitude: 13.41,
  }],
};

const forecastData = {
  timezone: 'Europe/Berlin',
  current: {
    time: '2026-11-09T12:00',
    temperature_2m: 54,
    relative_humidity_2m: 65,
    apparent_temperature: 51,
    is_day: 1,
    precipitation: 0,
    weather_code: 2,
    wind_speed_10m: 8,
    wind_direction_10m: 225,
    uv_index: 2,
  },
  daily: {
    time: ['2026-11-09', '2026-11-10'],
    weather_code: [2, 0],
    temperature_2m_max: [58, 60],
    temperature_2m_min: [42, 44],
    precipitation_probability_max: [10, 0],
  },
};

async function requestWeather(t: TestContext, fetchWeather: typeof fetch, query = 'Berlin') {
  const server = createWeatherApp(fetchWeather).listen(0);
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${port}/api/weather?city=${encodeURIComponent(query)}`);
}

test('city search returns mapped current conditions and multi-day forecast', async (t) => {
  const requestedUrls: URL[] = [];
  const fetchWeather: typeof fetch = async (input) => {
    const url = new URL(input.toString());
    requestedUrls.push(url);
    const data = url.hostname === 'geocoding-api.open-meteo.com' ? locationData : forecastData;
    return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
  };

  const response = await requestWeather(t, fetchWeather);
  const weather = await response.json();

  assert.equal(response.status, 200);
  assert.equal(weather.city, 'Berlin');
  assert.equal(weather.temperature, 54);
  assert.equal(weather.localTime, forecastData.current.time);
  assert.equal(weather.windDirection, 225);
  assert.equal(weather.forecast.length, 2);
  assert.equal(requestedUrls.length, 2);
  assert.equal(requestedUrls[0].searchParams.get('name'), 'Berlin');
  assert.equal(requestedUrls[1].searchParams.get('timezone'), 'auto');
  assert.equal(requestedUrls[1].searchParams.get('forecast_days'), '5');
});

test('empty search is rejected before contacting Open-Meteo', async (t) => {
  let fetchCalled = false;
  const response = await requestWeather(t, async () => {
    fetchCalled = true;
    return new Response('{}');
  }, '   ');

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'Enter a city or ZIP code to search.');
  assert.equal(fetchCalled, false);
});

test('unknown locations return a clear not-found error', async (t) => {
  const response = await requestWeather(t, async () => new Response(JSON.stringify({ results: [] })));

  assert.equal(response.status, 404);
  assert.match((await response.json()).error, /No matching location found/);
});

test('provider failures return actionable messages', async (t) => {
  let callCount = 0;
  const response = await requestWeather(t, async () => {
    callCount += 1;
    return callCount === 1
      ? new Response(JSON.stringify(locationData))
      : new Response('upstream details', { status: 503 });
  });

  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /temporarily unavailable/);
});

test('network failures are reported as connection errors', async (t) => {
  const response = await requestWeather(t, async () => {
    throw new Error('network unavailable');
  });

  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /Check your connection/);
});
