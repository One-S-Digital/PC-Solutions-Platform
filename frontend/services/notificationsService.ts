import { apiService } from './api';

export interface InAppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

class NotificationsApiService {
  async getMyNotifications(unreadOnly = false): Promise<InAppNotification[]> {
    const res = await apiService.get<InAppNotification[]>(
      `/notifications${unreadOnly ? '?unread=true' : ''}`
    );
    if (!res.success || !res.data) return [];
    return Array.isArray(res.data) ? res.data : [];
  }

  async getUnreadCount(): Promise<number> {
    const res = await apiService.get<{ count: number }>('/notifications/unread-count');
    if (!res.success || !res.data) return 0;
    return res.data.count ?? 0;
  }

  async markRead(id: string): Promise<void> {
    await apiService.patch(`/notifications/${id}/read`);
  }

  async markAllRead(): Promise<void> {
    await apiService.patch('/notifications/read-all');
  }

  async deleteNotification(id: string): Promise<void> {
    await apiService.delete(`/notifications/${id}`);
  }
}

export const notificationsApiService = new NotificationsApiService();
