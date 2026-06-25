import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { env, requireEnv } from "@/lib/env";
import type { AdminUser } from "@/lib/types";

const COOKIE_NAME = "power_tips_admin";

function secretKey() {
  return new TextEncoder().encode(requireEnv(env.jwtSecretKey, "JWT_SECRET_KEY"));
}

export async function createAdminToken(admin: AdminUser) {
  return new SignJWT({ username: admin.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(admin.id))
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifyAdminToken(token: string): Promise<AdminUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = Number(payload.sub);
    const username = String(payload.username ?? "");
    if (!userId || !username) {
      return null;
    }
    return { id: userId, username };
  } catch {
    return null;
  }
}

export async function getAdminFromRequest(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyAdminToken(token) : null;
}

export async function getAdminFromCookieStore() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token ? verifyAdminToken(token) : null;
}

export function setAdminCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function clearAdminCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0
  });
}
