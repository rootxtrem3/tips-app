import { redirect } from "next/navigation";
import { getAdminFromCookieStore } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const admin = await getAdminFromCookieStore();
  if (admin) {
    redirect("/admin/dashboard");
  }

  return (
    <main className="page-shell">
      <section className="panel" style={{ maxWidth: 480, margin: "80px auto", padding: 24 }}>
        <div className="stack">
          <div>
            <h1 style={{ marginTop: 0 }}>power tips</h1>
            <p className="muted">Minimal admin website hosted on Vercel.</p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
