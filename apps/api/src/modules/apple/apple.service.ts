import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify, createRemoteJWKSet } from 'jose';

export interface AppleUserPayload {
  appleId: string;
  email: string;
  emailVerified: boolean;
}

@Injectable()
export class AppleService {

  private appleKeys =
    createRemoteJWKSet(
      new URL(
        'https://appleid.apple.com/auth/keys'
      )
    );


  async verifyToken(
    token: string
  ): Promise<AppleUserPayload> {

    try {

      const { payload } =
        await jwtVerify(
          token,
          this.appleKeys,
          {
            issuer:
              'https://appleid.apple.com',

            audience:
              process.env.APPLE_CLIENT_ID
          }
        );


      if (
        !payload.sub ||
        typeof payload.email !== 'string'
      ) {
        throw new UnauthorizedException(
          'Invalid Apple payload'
        );
      }


      return {

        appleId:
          payload.sub,

        email:
          payload.email,

        emailVerified:
          payload.email_verified === true

      };


    } catch (error) {

      throw new UnauthorizedException(
        'Invalid Apple token'
      );

    }

  }

}