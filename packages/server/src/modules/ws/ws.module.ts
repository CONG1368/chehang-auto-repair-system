import { Module, OnModuleInit } from '@nestjs/common';
import { WsGateway } from './ws.gateway';
import { NotificationModule } from '../notification/notification.module';
import { NotificationService } from '../notification/notification.service';

@Module({
  imports: [NotificationModule],
  providers: [WsGateway],
  exports: [WsGateway],
})
export class WsModule implements OnModuleInit {
  constructor(
    private readonly wsGateway: WsGateway,
    private readonly notificationService: NotificationService,
  ) {}

  onModuleInit() {
    this.wsGateway.setNotificationService(this.notificationService);
  }
}
