import { env } from "@/lib/env";
import { queryRows } from "@/lib/db";

/**
 * Firebase Cloud Messaging configuration
 */
interface FcmConfig {
  serverKey: string;
  senderId: string;
}

/**
 * FCM Notification Payload
 * Only lightweight metadata - never full article content
 */
export interface FcmPayload {
  articleId: number;
  hiddenArticleId?: string;
  title: string;
  summary: string;
  categoryId: number;
  categorySlug: string;
  timestamp: string;
}

/**
 * Build FCM message for a single category subscription
 */
export function buildFcmMessage(payload: FcmPayload, categorySlug: string): object {
  return {
    message: {
      topic: `category-${categorySlug}`,
      data: {
        article_id: String(payload.articleId),
        hidden_article_id: payload.hiddenArticleId ?? "",
        title: payload.title,
        summary: payload.summary,
        category_id: String(payload.categoryId),
        category_slug: categorySlug,
        timestamp: payload.timestamp,
      },
      android: {
        priority: "HIGH",
        notification: {
          title: payload.title,
          body: payload.summary,
          clickAction: "com.yourname.powertips.MainActivity",
          icon: "ic_stat_powertips",
          color: "#6200ee",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 0,
          },
        },
        headers: {
          "apns-priority": "10",
        },
      },
    },
  };
}

/**
 * Get FCM server key from environment
 */
function getFcmServerKey(): string {
  const key = env.fcmServerKey || env.FCM_SERVER_KEY;
  if (!key) {
    console.warn("[FCM] FCM_SERVER_KEY not configured - push notifications disabled");
  }
  return key;
}

/**
 * Get FCM sender ID from environment
 */
function getFcmSenderId(): string {
  return env.fcmSenderId || env.FCM_SENDER_ID || "";
}

/**
 * Get all subscribed FCM tokens for a category
 */
async function getCategorySubscriptions(categoryId: number): Promise<string[]> {
  try {
    const rows = await queryRows<{ fcm_token: string }>(
      `SELECT fs.fcm_token
       FROM fcm_subscriptions fs
       JOIN categories c ON c.id = fs.category_id
       WHERE fs.category_id = $1`,
      [categoryId]
    );
    return rows.map((r) => r.fcm_token);
  } catch (error) {
    console.error("[FCM] Error fetching subscriptions:", error);
    return [];
  }
}

/**
 * Get categories associated with an article
 */
async function getArticleCategories(articleId: number): Promise<number[]> {
  try {
    const rows = await queryRows<{ category_id: number }>(
      "SELECT category_id FROM articles WHERE id = $1",
      [articleId]
    );
    return rows.map((r) => r.category_id);
  } catch (error) {
    console.error("[FCM] Error fetching article categories:", error);
    return [];
  }
}

/**
 * Check if FCM notification was already sent for this article
 */
export async function isFcmSent(articleId: number): Promise<boolean> {
  try {
    const rows = await queryRows<{ id: number }>(
      "SELECT id FROM fcm_notifications_sent WHERE article_id = $1",
      [articleId]
    );
    return rows.length > 0;
  } catch (error) {
    console.error("[FCM] Error checking sent status:", error);
    return false;
  }
}

/**
 * Mark FCM notification as sent (for deduplication)
 */
export async function markFcmSent(articleId: number): Promise<void> {
  try {
    await queryRows(
      "INSERT INTO fcm_notifications_sent (article_id, sent_at) VALUES ($1, NOW())",
      [articleId]
    );
  } catch (error) {
    console.error("[FCM] Error marking sent:", error);
  }
}

/**
 * Send FCM notification to a category with retry logic
 * Returns true if at least one device received, false otherwise
 */
export async function sendFcmToCategoryWithRetry(
  payload: FcmPayload,
  categoryId: number,
  categorySlug: string
): Promise<boolean> {
  const serverKey = getFcmServerKey();
  if (!serverKey) {
    console.warn("[FCM] Server key not configured, skipping notification");
    return false;
  }

  const subscriptions = await getCategorySubscriptions(categoryId);
  if (subscriptions.length === 0) {
    console.log(`[FCM] No subscriptions for category ${categorySlug}, skipping`);
    return false;
  }

  const message = buildFcmMessage(payload, categorySlug);

  const maxRetries = 3;
  const baseDelay = 1000; // 1 second base delay for exponential backoff

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(
        "https://fcm.googleapis.com/v1/projects/powertips-281607/messages:send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serverKey}`,
          },
          body: JSON.stringify(message),
        }
      );

      if (response.ok) {
        console.log(`[FCM] Successfully sent to category ${categorySlug}`);
        return true;
      }

      // Don't retry 4xx client errors (except 429 rate limit)
      if (response.status >= 400 && response.status < 500) {
        const errorText = await response.text();
        console.error(`[FCM] FCM client error (no retry): ${response.status}`, errorText);
        return false;
      }

      // 5xx errors or network errors - retry
      console.warn(`[FCM] FCM attempt ${attempt + 1} failed, status: ${response.status}`);

      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`[FCM] FCM attempt ${attempt + 1} failed:`, error);
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[FCM] Failed to send to category ${categorySlug} after ${maxRetries} attempts`);
  return false;
}

/**
 * Register FCM token for a user/category subscription
 */
export async function registerFcmToken(fcmToken: string, categoryId: number): Promise<boolean> {
  try {
    // Check if already subscribed
    const existing = await queryRows<{ id: number }>(
      "SELECT id FROM fcm_subscriptions WHERE fcm_token = $1 AND category_id = $2",
      [fcmToken, categoryId]
    );

    if (existing.length > 0) {
      // Update timestamp to keep subscription active
      await queryRows(
        "UPDATE fcm_subscriptions SET updated_at = NOW() WHERE fcm_token = $1 AND category_id = $2",
        [fcmToken, categoryId]
      );
      return true;
    }

    // Insert new subscription
    await queryRows(
      "INSERT INTO fcm_subscriptions (fcm_token, category_id, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())",
      [fcmToken, categoryId]
    );

    console.log(`[FCM] Token registered for category ${categoryId}`);
    return true;
  } catch (error) {
    console.error("[FCM] Error registering token:", error);
    return false;
  }
}

/**
 * Unregister FCM token (called on logout or uninstall)
 */
export async function unregisterFcmToken(fcmToken: string, categoryId?: number): Promise<boolean> {
  try {
    if (categoryId) {
      await queryRows(
        "DELETE FROM fcm_subscriptions WHERE fcm_token = $1 AND category_id = $2",
        [fcmToken, categoryId]
      );
    } else {
      await queryRows("DELETE FROM fcm_subscriptions WHERE fcm_token = $1", [fcmToken]);
    }
    return true;
  } catch (error) {
    console.error("[FCM] Error unregistering token:", error);
    return false;
  }
}

/**
 * Get all topics a token is subscribed to
 */
export async function getTokenTopics(fcmToken: string): Promise<number[]> {
  try {
    const rows = await queryRows<{ category_id: number }>(
      "SELECT category_id FROM fcm_subscriptions WHERE fcm_token = $1",
      [fcmToken]
    );
    return rows.map((r) => r.category_id);
  } catch (error) {
    console.error("[FCM] Error getting token topics:", error);
    return [];
  }
}

/**
 * Send FCM notification for a specific article (used by queue processor)
 */
export async function sendFcmForArticle(articleId: number): Promise<void> {
  const serverKey = getFcmServerKey();
  if (!serverKey) {
    console.log("[FCM] Notifications disabled - server key not configured");
    return;
  }

  try {
    // Check for duplicate
    const alreadySent = await isFcmSent(articleId);
    if (alreadySent) {
      console.log(`[FCM] Notification already sent for article ${articleId}`);
      return;
    }

    // Fetch article details
    const rows = await queryRows<{
      id: number;
      title: string;
      hidden_article_id: string | null;
      summary: string;
      category_id: number;
      category_slug: string;
      created_at: string;
    }>(
      "SELECT id, title, hidden_article_id, summary, category_id, '' AS category_slug, created_at::text FROM articles WHERE id = $1",
      [articleId]
    );

    const article = rows[0];
    if (!article) {
      console.error(`[FCM] Article ${articleId} not found - cannot send notification`);
      return;
    }

    // Build payload
    const payload: FcmPayload = {
      articleId: article.id,
      hiddenArticleId: article.hidden_article_id ?? undefined,
      title: article.title,
      summary: article.summary,
      categoryId: article.category_id,
      categorySlug: article.category_slug,
      timestamp: article.created_at,
    };

    // Send to the article's category with retry logic
    await sendFcmToCategoryWithRetry(payload, article.category_id, article.category_slug);

    // Mark as sent for deduplication
    await markFcmSent(articleId);

    console.log(`[FCM] Notification sent for article ${articleId}: "${article.title}"`);
  } catch (error) {
    console.error("[FCM] Error in sendFcmForArticle:", error);
  }
}
