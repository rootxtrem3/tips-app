export function DashboardHeader() {
  return (
    <div className="admin-bar" style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>power tips admin</h1>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Dashboard
          </p>
        </div>
      </div>
      <div className="admin-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <a className="button" href="/admin/articles/new" style={{ padding: "8px 16px" }}>
          + New Article
        </a>
        <form action="/api/auth/logout" method="post">
          <button className="button secondary" type="submit" style={{ padding: "8px 16px" }}>
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
