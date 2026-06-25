import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/cold-start-sync
 * Check for new articles since last app open/refresh
 * Returns unread articles based on the user's last sync timestamp
 */
export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const lastSync = url.searchParams.get("last_sync");

  try {
    // If no last_sync, return empty - this is the first app open
    if (!lastSync) {
      return NextResponse.json({
        newArticleCount: 0,
        unreadArticles: [],
        needsFullSync: true,
      });
    }

    // Get articles created after the last sync time
    const newArticles = await sql`
      SELECT
        a.id,
        a.title,
        a.summary,
        a.image_url,
        a.category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        a.created_at::text
      FROM articles a
      JOIN categories c ON c.id = a.category_id
      WHERE a.is_published = TRUE
        AND a.created_at > ${lastSync}
      ORDER BY a.created_at DESC
    `;

    return NextResponse.json({
      newArticleCount: newArticles.length,
      unreadArticles: newArticles,
      needsFullSync: false,
    });
  } catch (error) {
    console.error("[Cold Start Sync] Error:", error);
    return NextResponse.json(
      { error: "Failed to check for new articles." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cold-start-sync/mark-read
 * Mark an article as read after opening it
 */
export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { articleId } = body;

  if (!articleId) {
    return NextResponse.json(
      { error: "articleId is required." },
      { status: 400 }
    );
  }

  try {
    // Mark the article as having been sent via FCM (deduplication)
    await sql`
      INSERT INTO fcm_notifications_sent (article_id, sent_at)
      VALUES (${articleId}, NOW())
      ON CONFLICT (article_id) DO NOTHING
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Cold Start Sync] Error marking as read:", error);
    return NextResponse.json(
      { error: "Failed to mark article as read." },
      { status: 500 }
    );
  }
}
