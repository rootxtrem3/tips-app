import { NextResponse } from "next/server";
import { z } from "zod";
import { queryRows } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";

const registerTokenSchema = z.object({
  token: z.string().trim().min(1),
});

export async function POST(request: Request) {
  await ensureSchema();

  const body = await request.json().catch(() => null);
  const parsed = registerTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await queryRows(
    `
      INSERT INTO push_tokens (token)
      VALUES ($1)
      ON CONFLICT (token) DO NOTHING
    `,
    [parsed.data.token],
  );

  return NextResponse.json({ ok: true });
}
