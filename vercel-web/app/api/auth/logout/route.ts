import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.redirect(new URL("/admin/login", "http://localhost"));
  clearAdminCookie(response);
  return response;
}
