import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFromRequest } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const fcmToken = url.searchParams.get("fcm_token");

  if (fcmToken) {
    try {
      const subscriptions = await sql`
        SELECT
          fs.category_id,
          c.name AS category_name,
          c.slug AS category_slug,
          fs.created_at
        FROM fcm_subscriptions fs
        JOIN categories c ON c.id = fs.category_id
        WHERE fs.fcm_token = ${fcmToken}
        ORDER BY c.name ASC
      `;

      return NextResponse.json(
        { subscriptions: subscriptions.map((subscription) => ({ ...subscription })) },
        { status: 200 }
      );
    } catch (error) {
      console.error("[FCM] Error fetching subscriptions:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions." },
        { status: 500 }
      );
    }
  }

  try {
    const categories = await sql`
      SELECT id, name, slug
      FROM categories
      ORDER BY name ASC
    `;

    const topics = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      topic: `category-${cat.slug}`,
    }));

    return NextResponse.json({ topics }, { status: 200 });
  } catch (error) {
    console.error("[FCM] Error fetching topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch FCM topics." },
      { status: 500 }
    );
  }
}
