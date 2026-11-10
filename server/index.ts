import express from 'express';
import { resolve } from 'node:path';
import { createWeatherApp } from './app';

const port = Number(process.env.PORT || 3001);
const app = createWeatherApp();

app.use(express.static(resolve(process.cwd(), 'dist')));

app.listen(port, () => console.log(`Weather proxy listening on http://localhost:${port}`));
