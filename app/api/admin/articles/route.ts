import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { listAdminArticles } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(request.nextUrl.searchParams.get("page_size") ?? "20");
  const query = request.nextUrl.searchParams.get("query")?.trim() || null;
  return NextResponse.json(await listAdminArticles(page, pageSize, query));
}
