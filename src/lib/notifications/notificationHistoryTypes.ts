/**
 * notification_history - Tek kaynak (single source of truth)
 * Bu dosyadaki tip ve kolonlar, tüm insert işlemlerinde kullanılmalı.
 *
 * Tablo kolonları (alfabetik):
 * - action_url: string | null
 * - icon: string | null
 * - message: string
 * - metadata: object
 * - notification_type: 'news' | 'signal' | 'price_alert' | 'calendar' | 'system' | 'announcement'
 * - related_id: string | null
 * - related_type: string | null
 * - title: string
 * - type: 'news' | 'signal' | 'price_alert' | 'calendar' | 'system' | 'announcement'
 * - user_id: string (UUID)
 *
 * NOT: type ve notification_type aynı değeri alır (DB uyumluluğu için ikisi de set edilir)
 */

export type NotificationType =
  | 'news'
  | 'signal'
  | 'price_alert'
  | 'calendar'
  | 'system'
  | 'announcement';

export interface NotificationHistoryInsert {
  user_id: string;
  type: NotificationType;
  notification_type: NotificationType;
  title: string;
  message: string;
  icon?: string | null;
  action_url?: string | null;
  related_id?: string | null;
  related_type?: string | null;
  metadata?: Record<string, unknown>;
}

/** Insert objesi oluştur - tüm zorunlu kolonlar dahil */
export function buildNotificationRecord(
  opts: Omit<NotificationHistoryInsert, 'type' | 'notification_type'> & {
    type: NotificationType;
  }
): NotificationHistoryInsert {
  const t = opts.type;
  return {
    user_id: opts.user_id,
    type: t,
    notification_type: t,
    title: opts.title,
    message: opts.message,
    icon: opts.icon ?? null,
    action_url: opts.action_url ?? null,
    related_id: opts.related_id ?? null,
    related_type: opts.related_type ?? null,
    metadata: opts.metadata ?? {},
  };
}
