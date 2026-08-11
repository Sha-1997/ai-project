import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { configuration } from '../../config/configuration';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      secretOrKey: configuration.jwt.secret,
    });
  }


  async validate(payload: any) {

    return {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      status: payload.status,
      loginType: payload.loginType,
    };
  }
}