import { NextRequest, NextResponse } from "next/server";
import { articleInputSchema, deleteArticle, getAdminArticle, getPublicArticle, updateArticle } from "@/lib/data";
import { getAdminFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getPublicArticle(Number(id));
  if (!article) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }
  return NextResponse.json(article);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getAdminArticle(Number(id));
  if (!existing) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
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
  const article = await updateArticle(Number(id), parsed.data);
  return NextResponse.json(article);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getAdminArticle(Number(id));
  if (!existing) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }
  await deleteArticle(Number(id));
  return NextResponse.json({ success: true });
}
