import {
  Controller, Get, Put, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(@Query() query: any, @Request() req: any) {
    return this.notificationService.findAll({ ...query, userId: req.user.id });
  }

  @Get('unread-count')
  async unreadCount(@Request() req: any) {
    const count = await this.notificationService.getUnreadCount(req.user.id);
    return { count };
  }

  @Put(':id/read')
  async markRead(@Param('id') id: string) {
    return this.notificationService.markRead(+id);
  }

  @Put('read-all')
  async markAllRead(@Request() req: any) {
    return this.notificationService.markAllRead(req.user.id);
  }
}
