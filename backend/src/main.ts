import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const frontendOrigin = process.env.FRONTEND_URL ?? 'http://localhost:3001';
  app.enableCors({
    origin: frontendOrigin
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  });

  const parsedPort = Number(process.env.PORT);
  const port =
    Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

  await app.listen(port, '0.0.0.0');
  logger.log(`Listening on http://0.0.0.0:${port}`);
}

bootstrap();
