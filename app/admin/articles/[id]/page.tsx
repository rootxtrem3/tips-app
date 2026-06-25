import { notFound, redirect } from "next/navigation";
import { getAdminFromCookieStore } from "@/lib/auth";
import { getAdminArticle, listCategories } from "@/lib/data";
import { DashboardHeader } from "@/components/dashboard-header";
import { ArticleEditor } from "@/components/article-editor";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromCookieStore();
  if (!admin) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const article = await getAdminArticle(Number(id));
  if (!article) {
    notFound();
  }
  const categories = await listCategories();

  return (
    <main className="page-shell">
      <DashboardHeader />
      <ArticleEditor article={article} categories={categories} />
    </main>
  );
}
