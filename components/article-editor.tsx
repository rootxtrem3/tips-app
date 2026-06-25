"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ArticleLink, ArticleResponse, Category } from "@/lib/types";

type Props = {
  categories: Category[];
  article?: ArticleResponse | null;
};

export function ArticleEditor({ categories, article }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title ?? "");
  const [hiddenArticleId, setHiddenArticleId] = useState(article?.hidden_article_id ?? "");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(article?.image_url ?? null);
  const [links, setLinks] = useState<ArticleLink[]>(article?.links ?? []);
  const [categoryId, setCategoryId] = useState<number>(article?.category.id ?? categories[0]?.id ?? 0);
  const [isPublished, setIsPublished] = useState<boolean>(article?.is_published ?? true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [allCategories, setAllCategories] = useState(categories);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = useMemo(() => Boolean(article?.id), [article?.id]);

  function normalizeLinkUrl(rawUrl: string) {
    const trimmed = rawUrl.trim();
    if (!trimmed) return "";
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed.replace(/^\/+/, "")}`;
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    setIsUploading(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Upload failed.");
      return;
    }
    const payload = (await response.json()) as { url: string };
    setImageUrl(payload.url);
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim() })
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Category creation failed.");
      return;
    }
    const created = (await response.json()) as Category;
    const merged = [...allCategories, created].sort((left, right) => left.name.localeCompare(right.name));
    setAllCategories(merged);
    setCategoryId(created.id);
    setNewCategoryName("");
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedHiddenArticleId = hiddenArticleId.trim();
    const trimmedSummary = summary.trim();
    const trimmedContent = content.trim();
    const normalizedLinks = links
      .map((link) => ({
        alias: link.alias.trim(),
        url: normalizeLinkUrl(link.url)
      }))
      .filter((link) => link.alias.length > 0 || link.url.length > 0);

    if (trimmedTitle.length < 4) {
      setError("Title must be at least 4 characters.");
      return;
    }
    if (trimmedHiddenArticleId.length > 80) {
      setError("Hidden article ID must be 80 characters or fewer.");
      return;
    }
    if (trimmedSummary.length < 8) {
      setError("Summary must be at least 8 characters.");
      return;
    }
    if (trimmedContent.length < 20) {
      setError("Content must be at least 20 characters.");
      return;
    }
    if (categoryId <= 0) {
      setError("Select a category before publishing.");
      return;
    }
    for (const link of normalizedLinks) {
      if (!link.alias || !link.url) {
        setError("Each bottom link needs both an alias and a URL.");
        return;
      }
      try {
        new URL(link.url);
      } catch {
        setError(`Invalid link URL: ${link.url}`);
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    const response = await fetch(isEditing ? `/api/articles/${article?.id}` : "/api/articles", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: trimmedTitle,
        hidden_article_id: trimmedHiddenArticleId || null,
        summary: trimmedSummary,
        content: trimmedContent,
        image_url: imageUrl,
        links: normalizedLinks,
        category_id: categoryId,
        is_published: isPublished
      })
    });
    setIsSaving(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Save failed.");
      return;
    }
    router.push("/admin/dashboard");
    router.refresh();
  }

  async function handleDelete() {
    if (!article?.id) return;
    const confirmed = window.confirm("Delete this article?");
    if (!confirmed) return;
    const response = await fetch(`/api/articles/${article.id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Delete failed.");
      return;
    }
    router.push("/admin/dashboard");
    router.refresh();
  }

  function updateLink(index: number, field: keyof ArticleLink, value: string) {
    setLinks((current) => current.map((link, linkIndex) => (linkIndex === index ? { ...link, [field]: value } : link)));
  }

  function addLink() {
    setLinks((current) => [...current, { alias: "", url: "" }]);
  }

  function removeLink(index: number) {
    setLinks((current) => current.filter((_, linkIndex) => linkIndex !== index));
  }

  return (
    <div className="grid-two">
      <section className="panel" style={{ padding: 24 }}>
        <div className="stack">
          <div>
            <a className="button secondary" href="/admin/dashboard">Back to dashboard</a>
          </div>
          <div className="field">
            <label className="label">Title</label>
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} />
          </div>
          <div className="field">
            <label className="label">Hidden article ID</label>
            <input
              className="input"
              value={hiddenArticleId}
              onChange={(event) => setHiddenArticleId(event.target.value)}
              maxLength={80}
              placeholder="Used for search only"
            />
          </div>
          <div className="field">
            <label className="label">Summary</label>
            <textarea className="textarea" style={{ minHeight: 110 }} value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={320} />
          </div>
          <div className="field">
            <label className="label">Content</label>
            <textarea className="textarea" value={content} onChange={(event) => setContent(event.target.value)} />
          </div>
        </div>
      </section>

      <aside className="panel" style={{ padding: 24 }}>
        <div className="stack">
          <div className="field">
            <label className="label">Category</label>
            <select className="select" value={categoryId} onChange={(event) => setCategoryId(Number(event.target.value))}>
              {allCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label">New category</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} />
              <button className="button secondary" onClick={handleCreateCategory} type="button">Add</button>
            </div>
          </div>

          <div className="field">
            <label className="label">Image</label>
            <input className="input" onChange={handleUpload} type="file" accept="image/*" />
            <div className="muted">{isUploading ? "Uploading..." : "Uploads go to Vercel Blob or Cloudinary."}</div>
            {imageUrl ? <img alt="" className="preview-image" src={imageUrl} /> : null}
          </div>

          <div className="field">
            <label className="label">Bottom links</label>
            <div className="stack">
              {links.map((link, index) => (
                <div key={index} className="link-row">
                  <input
                    className="input"
                    value={link.alias}
                    onChange={(event) => updateLink(index, "alias", event.target.value)}
                    placeholder="Alias"
                  />
                  <input
                    className="input"
                    value={link.url}
                    onChange={(event) => updateLink(index, "url", event.target.value)}
                    placeholder="https://example.com"
                  />
                  <button className="button ghost" onClick={() => removeLink(index)} type="button">
                    Remove
                  </button>
                </div>
              ))}
              <button className="button secondary" onClick={addLink} type="button">Add bottom link</button>
              <div className="muted">These links appear at the bottom of the article in the Android app.</div>
            </div>
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} type="checkbox" />
            Published
          </label>

          {error ? <div className="error">{error}</div> : null}

          <button className="button" disabled={isSaving || isUploading} onClick={handleSave} type="button">
            {isSaving ? "Saving..." : isEditing ? "Update article" : "Create article"}
          </button>

          {isEditing ? (
            <button className="button ghost" onClick={handleDelete} type="button">
              Delete article
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
