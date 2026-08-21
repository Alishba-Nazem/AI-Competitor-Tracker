import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function resolveCorsOrigins(): string[] {
  const configured = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const defaults = ['http://localhost:3001', 'http://127.0.0.1:3001'];
  return [...new Set([...configured, ...defaults])];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: resolveCorsOrigins(),
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
