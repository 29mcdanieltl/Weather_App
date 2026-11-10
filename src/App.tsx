import { useState, type FormEvent } from 'react';
import {
  ArrowUp,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Compass,
  Droplets,
  LoaderCircle,
  MapPin,
  Search,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';

type DayForecast = {
  day: string;
  phrase: string;
  high: number | null;
  low: number | null;
  iconCode: number;
};

type Weather = {
  city: string;
  region: string;
  country: string;
  localTime: string;
  temperature: number | null;
  feelsLike: number | null;
  phrase: string;
  iconCode: number;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  uvIndex: number | null;
  precipitation: number | null;
  high: number | null;
  low: number | null;
  forecast: DayForecast[];
};

function isWeather(value: unknown): value is Weather {
  if (typeof value !== 'object' || value === null) return false;
  const weather = value as Record<string, unknown>;
  const isNullableNumber = (item: unknown) => item === null || typeof item === 'number';
  return typeof weather.city === 'string'
    && typeof weather.region === 'string'
    && typeof weather.country === 'string'
    && typeof weather.localTime === 'string'
    && typeof weather.phrase === 'string'
    && typeof weather.iconCode === 'number'
    && isNullableNumber(weather.temperature)
    && isNullableNumber(weather.feelsLike)
    && isNullableNumber(weather.humidity)
    && isNullableNumber(weather.windSpeed)
    && isNullableNumber(weather.windDirection)
    && isNullableNumber(weather.uvIndex)
    && isNullableNumber(weather.precipitation)
    && isNullableNumber(weather.high)
    && isNullableNumber(weather.low)
    && Array.isArray(weather.forecast)
    && weather.forecast.every((day) => {
      if (typeof day !== 'object' || day === null) return false;
      const forecast = day as Record<string, unknown>;
      return typeof forecast.day === 'string'
        && typeof forecast.phrase === 'string'
        && isNullableNumber(forecast.high)
        && isNullableNumber(forecast.low)
        && typeof forecast.iconCode === 'number';
    });
}

function WeatherIcon({ code, size = 32 }: { code: number; size?: number }) {
  const Icon = code === 0
    ? Sun
    : code === 1 || code === 2
      ? CloudSun
      : code === 3
        ? Cloud
        : [45, 48].includes(code)
          ? CloudFog
          : [51, 53, 55, 56, 57].includes(code)
            ? CloudDrizzle
            : [61, 63, 65, 66, 67, 80, 81, 82].includes(code)
              ? CloudRain
              : [71, 73, 75, 77, 85, 86].includes(code)
                ? CloudSnow
                : [95, 96, 99].includes(code)
                  ? CloudLightning
                  : Cloud;
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />;
}

function formatTemperature(value: number | null, unit: 'F' | 'C') {
  if (value === null || Number.isNaN(value)) return '--°';
  return `${Math.round(unit === 'C' ? (value - 32) * 5 / 9 : value)}°`;
}

function formatDay(value: string, index: number) {
  if (index === 0) return 'Today';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date);
}

function formatLocalTime(value: string) {
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) return 'Unavailable';
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return 'Unavailable';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

function formatWindSpeed(value: number | null, unit: 'F' | 'C') {
  if (value === null) return '--';
  return `${Math.round(unit === 'C' ? value * 1.60934 : value)} ${unit === 'C' ? 'km/h' : 'mph'}`;
}

function formatPrecipitation(value: number | null, unit: 'F' | 'C') {
  if (value === null) return '--';
  return `${unit === 'C' ? (value * 25.4).toFixed(1) : value} ${unit === 'C' ? 'mm' : 'in'}`;
}

function formatWindDirection(value: number | null) {
  if (value === null) return '';
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(value / 45) % 8];
}

export default function App() {
  const [query, setQuery] = useState('');
  const [weather, setWeather] = useState<Weather | null>(null);
  const [unit, setUnit] = useState<'F' | 'C'>('F');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function searchCity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const city = query.trim();
    if (loading) return;
    if (!city) {
      setWeather(null);
      setError('Enter a city or ZIP code to search.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new Error('The weather service returned an invalid response. Try again later.');
      }
      if (!response.ok) {
        const message = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Weather could not be loaded.';
        throw new Error(message);
      }
      if (!isWeather(data)) {
        throw new Error('The weather service returned incomplete data. Try again later.');
      }
      setWeather(data);
    } catch (err) {
      setWeather(null);
      setError(err instanceof TypeError
        ? 'Could not connect to the weather service. Check your connection and try again.'
        : err instanceof Error ? err.message : 'Weather could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Weather Desk home">
          <span className="brand-mark"><Sun size={18} strokeWidth={1.8} /></span>
          <span>weather<span className="brand-light">desk</span></span>
        </a>
        <div className="topbar-meta"><span className="live-dot" /> OPEN-METEO FORECAST</div>
      </header>

      <section className="intro" id="top">
        <div className="intro-copy">
          <p className="eyebrow">YOUR DAILY OUTLOOK</p>
          <h1>A little more<br /><span>weather-wise.</span></h1>
          <p className="intro-subtitle">The forecast, without the fuss.</p>
        </div>
        <form className="search-form" onSubmit={searchCity}>
          <label htmlFor="city-search">Find a city</label>
          <div className="search-control">
            <MapPin size={18} aria-hidden="true" />
            <input
              id="city-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (error) setError('');
              }}
              placeholder="Search city or ZIP code"
              autoComplete="off"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'search-error' : undefined}
            />
            <button type="submit" aria-label="Search weather" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={19} /> : <Search size={19} />}
            </button>
          </div>
        </form>
      </section>

      {error && <div className="notice" id="search-error" role="alert">{error}</div>}

      {!weather ? (
        <section className={`welcome-panel ${error ? 'has-error' : ''}`} aria-live="polite">
          <div className="welcome-sun"><CloudSun size={62} strokeWidth={1.2} /></div>
          <div className="welcome-text">
            <p className="eyebrow">A CLEARER LOOK OUTSIDE</p>
            <h2>{loading ? 'Finding your forecast' : 'Where should we look?'}</h2>
            <p>{loading ? 'Checking current conditions and the days ahead.' : 'Search for a city to see current conditions and a five-day outlook.'}</p>
          </div>
          <span className="welcome-index">01 <i /> 05</span>
        </section>
      ) : (
        <>
          <section className="weather-overview" aria-live="polite" aria-busy={loading}>
            <div className="conditions-main">
              <div className="location-line"><MapPin size={15} /> {weather.city}{weather.region ? `, ${weather.region}` : ''}{weather.country ? `, ${weather.country}` : ''}</div>
              <div className="temperature-row">
                <WeatherIcon code={weather.iconCode} size={60} />
                <div className="temperature">{formatTemperature(weather.temperature, unit)}</div>
                <div className="unit-switch" role="group" aria-label="Temperature units">
                  <button className={unit === 'F' ? 'selected' : ''} onClick={() => setUnit('F')} aria-pressed={unit === 'F'}>°F</button>
                  <button className={unit === 'C' ? 'selected' : ''} onClick={() => setUnit('C')} aria-pressed={unit === 'C'}>°C</button>
                </div>
              </div>
              <p className="condition-phrase">{weather.phrase || 'Current conditions'}</p>
              <p className="feels-like">Feels like {formatTemperature(weather.feelsLike, unit)} <span>·</span> H {formatTemperature(weather.high, unit)} <span>·</span> L {formatTemperature(weather.low, unit)}</p>
            </div>
            <div className="conditions-aside">
              <p className="eyebrow">RIGHT NOW</p>
              <p className="updated">Local time {formatLocalTime(weather.localTime)}</p>
              <div className="metrics-grid">
                <Metric icon={<Droplets />} label="Humidity" value={weather.humidity === null ? '--' : `${weather.humidity}%`} />
                <Metric icon={<Wind />} label="Wind" value={`${formatWindSpeed(weather.windSpeed, unit)} ${formatWindDirection(weather.windDirection)}`.trim()} />
                <Metric icon={<Thermometer />} label="UV index" value={weather.uvIndex === null ? '--' : `${weather.uvIndex}`} />
                <Metric icon={<CloudRain />} label="Precip. 1h" value={formatPrecipitation(weather.precipitation, unit)} />
              </div>
            </div>
          </section>

          <section className="forecast-section">
            <div className="section-heading">
              <div><p className="eyebrow">PLAN AHEAD</p><h2>Five-day forecast</h2></div>
              <span className="forecast-caption"><Compass size={15} /> LOCAL FORECAST</span>
            </div>
            {weather.forecast.length ? (
              <div className="forecast-list">
                {weather.forecast.map((day, index) => (
                  <article className="forecast-day" key={`${day.day}-${index}`}>
                    <p className="forecast-name">{formatDay(day.day, index)}</p>
                    <div className="forecast-icon"><WeatherIcon code={day.iconCode} size={27} /></div>
                    <p className="forecast-phrase">{day.phrase}</p>
                    <div className="forecast-range"><span>{formatTemperature(day.high, unit)}</span><i><b style={{ left: `${18 + index * 10}%` }} /></i><span>{formatTemperature(day.low, unit)}</span></div>
                  </article>
                ))}
              </div>
            ) : <p className="forecast-empty">No forecast data is available for this location.</p>}
          </section>
        </>
      )}

      <footer className="footer"><span>Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>)</span><span>LOOK UP, THEN STEP OUT <ArrowUp size={13} /></span></footer>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="metric"><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span><strong>{value}</strong></div>;
}
