import { NextResponse } from "next/server";
import { z } from "zod";
import { queryRows } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { createAdminToken, setAdminCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/security";

export const runtime = "nodejs";

const schema = z.object({
  username: z.string().trim().min(3).max(64),
  password: z.string().min(8).max(128)
});

export async function POST(request: Request) {
  await ensureSchema();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
  }

  const rows = await queryRows<{ id: number; username: string; password_hash: string }>(
    "SELECT id, username, password_hash FROM admin_users WHERE username = $1 LIMIT 1",
    [parsed.data.username]
  );

  const admin = rows[0];
  if (!admin || !verifyPassword(parsed.data.password, admin.password_hash)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const response = NextResponse.json({
    access_token: "cookie",
    token_type: "bearer",
    admin: { id: admin.id, username: admin.username }
  });
  setAdminCookie(response, await createAdminToken({ id: admin.id, username: admin.username }));
  return response;
}
