import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';

import { join } from 'path';

import { configuration } from './config/configuration';
import { validate } from './config/config.validation';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AppLoggerService } from './common/logger/logger.service';

import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';


async function bootstrap() {

  // 1. Validate Environment Variables
  validate(process.env);


  const app =
    await NestFactory.create<NestExpressApplication>(
      AppModule,
    );


  // 2. Logger
  const logger =
    app.get(AppLoggerService);

  app.useLogger(logger);



  // 3. Global API Prefix
  app.setGlobalPrefix('api/v1');



  // 4. Helmet Security
  try {

    const helmet = require('helmet');

    app.use(
      helmet(),
    );

    logger.log(
      'Helmet security headers mounted successfully.',
      'Bootstrap',
    );

  } catch(e) {

    logger.warn(
      'Helmet module not found.',
      'Bootstrap',
    );

  }



  // 5. Validation
  app.useGlobalPipes(

    new ValidationPipe({

      whitelist:true,

      transform:true,

      forbidNonWhitelisted:true,

      transformOptions:{
        enableImplicitConversion:true,
      },

    }),

  );




  // 6. Static Files Uploads
  //
  // URL:
  // http://localhost:5000/uploads/file-name.png
  //
  app.useStaticAssets(

    join(
      process.cwd(),
      'uploads',
    ),

    {
      prefix:'/uploads/',
    },

  );





  // 7. Interceptors + Filters

  app.useGlobalInterceptors(
    new TransformInterceptor(),
  );


  app.useGlobalFilters(
    new HttpExceptionFilter(),
  );





  // 8. CORS

  app.enableCors({

    origin:
      configuration.cors.origin,

    methods:
      'GET,HEAD,PUT,PATCH,POST,DELETE',

    credentials:true,

  });





  // 9. Swagger

  const swaggerConfig =
    new DocumentBuilder()

      .setTitle(
        'JovianeX AI Ecosystem Launch Platform API',
      )

      .setDescription(
        'Core Backend REST contracts for user identity, memberships, campaigns, referrals, and payments.',
      )

      .setVersion('1.0.0')

      .addBearerAuth()

      .build();



  const document =
    SwaggerModule.createDocument(
      app,
      swaggerConfig,
    );


  SwaggerModule.setup(
    'api/docs',
    app,
    document,
  );


  logger.log(
    'Swagger API documentation mounted on: /api/docs',
    'Bootstrap',
  );





  // 10. Start Server

  const port =
    configuration.port;


  await app.listen(
    port,
  );


  logger.log(
    `Launch platform backend running in ${configuration.environment} mode on port: ${port}`,
    'Bootstrap',
  );


  logger.log(
    `Health check status page available at: http://localhost:${port}/api/v1/health`,
    'Bootstrap',
  );

}


bootstrap();