import { redirect } from "next/navigation";
import { getAdminFromCookieStore } from "@/lib/auth";
import { getDashboardStats, getRecentArticles } from "@/lib/data";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ query?: string }>;
}) {
  const admin = await getAdminFromCookieStore();
  if (!admin) {
    redirect("/admin/login");
  }

  const stats = await getDashboardStats();
  const recentArticles = await getRecentArticles(20);
  const params = await searchParams;
  const query = params?.query?.trim() || "";

  return (
    <main className="page-shell">
      <DashboardHeader />

      {/* Statistics Overview */}
      <section className="panel" style={{ padding: 24 }}>
        <div className="stats-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 24
        }}>
          <StatCard
            title="Total Articles"
            value={stats.articleCount}
            subtitle={stats.publishedCount > 0 ? `${stats.publishedCount} published` : undefined}
            color="blue"
          />
          <StatCard
            title="Categories"
            value={stats.categoryCount}
            subtitle="Content categories"
            color="purple"
          />
          <StatCard
            title="Total Views"
            value={stats.totalViews}
            subtitle="All-time article views"
            color="green"
          />
          <StatCard
            title="Drafts"
            value={stats.draftCount}
            subtitle="Unpublished articles"
            color="orange"
          />
        </div>

        {/* Article Publishing Section */}
        <div className="publish-section" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          padding: "16px 20px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 12,
          color: "white"
        }}>
          <div>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "20px" }}>Ready to publish?</h2>
            <p style={{ margin: 0, opacity: 0.9 }}>Create a new article and share it with your audience.</p>
          </div>
          <a
            href="/admin/articles/new"
            className="button"
            style={{
              background: "white",
              color: "#667eea",
              border: "none",
              padding: "10px 20px",
              fontWeight: "600",
              borderRadius: 8
            }}
          >
            New Article
          </a>
        </div>

        {/* Search */}
        <form className="admin-search" action="/admin/dashboard" method="get" style={{ marginBottom: 16 }}>
          <input
            className="input"
            defaultValue={query}
            name="query"
            placeholder="Search title, summary, content, or hidden article ID"
          />
          <button className="button" type="submit">Search</button>
        </form>

        {/* Recent Articles */}
        <div className="card-list">
          {recentArticles.map((article) => (
            <a key={article.id} className="article-card" href={`/admin/articles/${article.id}`}>
              <div className="muted" style={{ marginBottom: 8 }}>
                {article.category.name} · {article.is_published ? "Published" : "Draft"}
              </div>
              {article.hidden_article_id ? (
                <div className="muted" style={{ marginBottom: 8 }}>
                  Hidden article ID: {article.hidden_article_id}
                </div>
              ) : null}
              <h3 style={{ marginTop: 0 }}>{article.title}</h3>
              <p className="muted" style={{ marginBottom: 0 }}>{article.summary}</p>
            </a>
          ))}
          {recentArticles.length === 0 ? (
            <div className="muted">{query ? "No articles matched that search." : "No articles yet."}</div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function StatCard({ title, value, subtitle, color }: { title: string; value: number; subtitle?: string; color: string }) {
  const colorStyles: Record<string, string> = {
    blue: "border-blue-500 text-blue-600",
    purple: "border-purple-500 text-purple-600",
    green: "border-green-500 text-green-600",
    orange: "border-orange-500 text-orange-600",
  };

  return (
    <div className="stat-card" style={{
      padding: 16,
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: "#fff"
    }}>
      <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "var(--color-text)" }}>
        {value.toLocaleString()}
      </div>
      {subtitle && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}
