import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { RoleController } from './role.controller';

@Module({
  controllers: [UserController, RoleController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
