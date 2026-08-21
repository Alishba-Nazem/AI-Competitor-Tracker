import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function resolveCorsOrigins(): string[] {
  const fromEnv = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const defaults = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ];

  return [...new Set([...fromEnv, ...defaults])];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = resolveCorsOrigins();
  console.log(
    `CORS FRONTEND_URL raw=${JSON.stringify(process.env.FRONTEND_URL ?? null)}`,
  );
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      // Non-browser / same-origin tools may omit Origin.
      if (!requestOrigin) {
        callback(null, true);
        return;
      }

      const normalized = normalizeOrigin(requestOrigin);
      if (allowedOrigins.includes(normalized)) {
        callback(null, true);
        return;
      }

      console.warn(`CORS blocked origin: ${requestOrigin}`);
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Listening on http://0.0.0.0:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Nest application', error);
  process.exit(1);
});
