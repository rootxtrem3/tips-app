import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFromRequest } from "@/lib/auth";
import { registerFcmToken, unregisterFcmToken } from "@/lib/fcm";
import { sql } from "@/lib/db";

const registerSchema = z.object({
  fcm_token: z.string().min(1).max(500),
  category_id: z.coerce.number().int().positive().optional(),
});

const unregisterSchema = z.object({
  fcm_token: z.string().min(1).max(500),
  category_id: z.coerce.number().int().positive().optional(),
});

/**
 * POST /api/fcm/register
 * Register an FCM token for push notifications
 * Optionally subscribe to a specific category
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { fcm_token, category_id } = parsed.data;

  // If category_id provided, verify it exists and belongs to admin
  if (category_id) {
    const category = await sql`
      SELECT id FROM categories WHERE id = ${category_id}
    `;
    if (category.length === 0) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 }
      );
    }
  }

  const success = await registerFcmToken(fcm_token, category_id || 0);

  if (success) {
    return NextResponse.json(
      { message: "FCM token registered successfully." },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { error: "Failed to register FCM token." },
    { status: 500 }
  );
}

/**
 * DELETE /api/fcm/register
 * Unregister an FCM token (for logout or device removal)
 */
export async function DELETE(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = unregisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { fcm_token, category_id } = parsed.data;

  const success = await unregisterFcmToken(fcm_token, category_id || undefined);

  if (success) {
    return NextResponse.json(
      { message: "FCM token unregistered successfully." },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { error: "Failed to unregister FCM token." },
    { status: 500 }
  );
}
