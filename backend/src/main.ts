import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendOrigin = process.env.FRONTEND_URL ?? 'http://localhost:3001';
  app.enableCors({
    origin: frontendOrigin.split(',').map((value) => value.trim()),
  });

  // Railway (and most PaaS hosts) require binding to 0.0.0.0 and process.env.PORT.
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
