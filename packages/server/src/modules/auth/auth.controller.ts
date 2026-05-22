import { Controller, Post, Get, Put, Body, UseGuards, Request, Req, Optional, HttpException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuditService } from '../audit/audit.service';

// 简单内存限流
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 1分钟窗口

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_ATTEMPTS) return false;
  record.count++;
  return true;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Optional() private audit?: AuditService,
  ) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }, @Req() req: any) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      throw new HttpException('登录尝试过于频繁，请1分钟后再试', 429);
    }
    const result = await this.authService.login(body.username, body.password);

    // 记录登录审计日志
    if (result.user) {
      await this.audit?.log({
        userId: result.user.id,
        action: 'login',
        module: 'auth',
        detail: `用户 ${result.user.realName} 登录系统`,
        ip: req.ip,
      });
    }

    return { token: result.token };
  }

  @UseGuards(JwtAuthGuard)
  @Get('userinfo')
  async getUserInfo(@Request() req: any) {
    return this.authService.getUserInfo(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }
}
