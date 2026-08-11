import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { join } from 'path';

import configuration from './configuration';
import { validate } from './config.validation';


@Module({
  imports: [
    NestConfigModule.forRoot({

      isGlobal: true,

      envFilePath: join(
        __dirname,
        '../../../../.env',
      ),

      load: [
        configuration,
      ],

      validate,

    }),
  ],

  exports: [
    NestConfigModule,
  ],
})
export class ConfigModule {}