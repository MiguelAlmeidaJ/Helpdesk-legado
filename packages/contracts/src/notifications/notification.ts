export type NotificationSeverity = 'info' | 'warning' | 'critical';

export type NotificationSource =
  | 'ticket'
  | 'devops'
  | 'finance'
  | 'maintenance'
  | 'system';

export interface AppNotificationItem {
  key: string;
  severity: NotificationSeverity;
  source: NotificationSource;
  sourceId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string | null;
  read: boolean;
}

export interface NotificationCenterResponse {
  unreadCount: number;
  total: number;
  generatedAt: string;
  items: AppNotificationItem[];
}

export interface MarkNotificationsReadRequest {
  keys: string[];
}
