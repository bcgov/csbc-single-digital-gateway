/** The render subset of the notifications feed contract (BFF `/v1/me/notifications`). */
export interface NotificationItem {
  deliveryId: string;
  title: string;
  body: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp when read; null = unread. */
  readAt: string | null;
}
