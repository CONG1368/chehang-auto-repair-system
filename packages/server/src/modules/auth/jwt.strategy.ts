import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'taizhou-auto-repair-jwt-secret-key-2024',
    });
  }

  async validate(payload: { id: number; username: string; roleId: number }) {
    return { id: payload.id, username: payload.username, roleId: payload.roleId };
  }
}
