import { Controller, Delete, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

@Controller('notifications')
@UseGuards(ClerkAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findMine(@Request() req, @Query('unread') unread?: string) {
    return this.notificationsService.findForUser(req.user.id, unread === 'true');
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.id).then((count) => ({ count }));
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markRead(id, req.user.id);
  }

  @Patch('read-all')
  markAllRead(@Request() req) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req) {
    return this.notificationsService.deleteNotification(id, req.user.id);
  }
}
