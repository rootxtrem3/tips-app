import { redirect } from "next/navigation";
import { getAdminFromCookieStore } from "@/lib/auth";
import { listCategories } from "@/lib/data";
import { DashboardHeader } from "@/components/dashboard-header";
import { ArticleEditor } from "@/components/article-editor";

export default async function NewArticlePage() {
  const admin = await getAdminFromCookieStore();
  if (!admin) {
    redirect("/admin/login");
  }

  const categories = await listCategories();

  return (
    <main className="page-shell">
      <DashboardHeader />
      <ArticleEditor categories={categories} />
    </main>
  );
}
