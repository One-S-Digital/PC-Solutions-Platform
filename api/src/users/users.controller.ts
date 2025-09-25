import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  
  @Get('me')
  async getCurrentUser(@Req() req: any) {
    if (!req.context) {
      throw new Error('User context not found');
    }
    
    return {
      userId: req.context.userId,
      role: req.context.role,
      appUserId: req.context.appUserId,
    };
  }
}