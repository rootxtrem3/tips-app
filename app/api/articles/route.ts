import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { articleInputSchema, createArticle, listPublicArticles } from "@/lib/data";
import { getAdminFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().min(1).max(50).default(20),
  category_id: z.coerce.number().int().positive().optional(),
  query: z.string().trim().max(80).optional()
});

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const parsed = querySchema.safeParse({
    page: url.searchParams.get("page") ?? 1,
    page_size: url.searchParams.get("page_size") ?? 20,
    category_id: url.searchParams.get("category_id") ?? undefined,
    query: url.searchParams.get("query") ?? undefined
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params." }, { status: 400 });
  }

  const payload = await listPublicArticles({
    page: parsed.data.page,
    pageSize: parsed.data.page_size,
    categoryId: parsed.data.category_id,
    query: parsed.data.query
  });
  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = articleInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid article payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const article = await createArticle(parsed.data);
  return NextResponse.json(article, { status: 201 });
}
