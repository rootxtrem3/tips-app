import { z } from "zod";
import { queryRows } from "@/lib/db";
import { messaging } from "@/lib/firebase";
import { ensureSchema } from "@/lib/schema";
import type { Article, ArticleLink, ArticleResponse, Category } from "@/lib/types";

const articleLinkSchema = z.object({
  alias: z.string().trim().min(1).max(80),
  url: z.string().trim().url().max(2048)
});

export const articleInputSchema = z.object({
  title: z.string().trim().min(4).max(180),
  hidden_article_id: z.string().trim().min(1).max(80).nullable().optional(),
  summary: z.string().trim().min(8).max(320),
  content: z.string().trim().min(20),
  image_url: z.string().url().nullable().optional(),
  links: z.array(articleLinkSchema).max(12).default([]),
  category_id: z.coerce.number().int().positive(),
  is_published: z.boolean().default(true)
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(80)
});

type ArticleRow = Article;

type ArticleDbRow = Omit<Article, "links"> & {
  links_json: unknown;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toArticleResponse(row: ArticleRow): ArticleResponse {
  return {
    id: row.id,
    title: row.title,
    hidden_article_id: row.hidden_article_id,
    summary: row.summary,
    content: row.content,
    image_url: row.image_url,
    links: row.links,
    is_published: row.is_published,
    category: {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug
    },
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function parseArticleLinks(value: unknown): ArticleLink[] {
  const parsed = z.array(articleLinkSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

function toArticleRow(row: ArticleDbRow): ArticleRow {
  return {
    ...row,
    links: parseArticleLinks(row.links_json)
  };
}

export async function listCategories(): Promise<Category[]> {
  await ensureSchema();
  return queryRows<Category>("SELECT id, name, slug FROM categories ORDER BY name ASC");
}

export async function createCategory(name: string): Promise<Category> {
  await ensureSchema();
  const slug = slugify(name);
  const rows = await queryRows<Category>(
    `
      INSERT INTO categories (name, slug)
      VALUES ($1, $2)
      RETURNING id, name, slug
    `,
    [name, slug]
  );
  return rows[0];
}

export async function listPublicArticles(input: {
  page: number;
  pageSize: number;
  categoryId?: number | null;
  query?: string | null;
}) {
  await ensureSchema();
  const conditions = ["a.is_published = TRUE"];
  const params: unknown[] = [];
  if (input.categoryId) {
    params.push(input.categoryId);
    conditions.push(`a.category_id = $${params.length}`);
  }
  if (input.query) {
    params.push(`%${input.query}%`);
    conditions.push(
      `(a.title ILIKE $${params.length} OR a.summary ILIKE $${params.length} OR a.content ILIKE $${params.length} OR COALESCE(a.hidden_article_id, '') ILIKE $${params.length})`
    );
  }
  const whereClause = conditions.join(" AND ");
  params.push(input.pageSize, (input.page - 1) * input.pageSize);
  const rows = await queryRows<ArticleDbRow>(
    `
      SELECT
        a.id, a.title, a.hidden_article_id, a.summary, a.content, a.image_url, a.links_json, a.is_published,
        a.category_id, c.name AS category_name, c.slug AS category_slug,
        a.created_at::text, a.updated_at::text
      FROM articles a
      JOIN categories c ON c.id = a.category_id
      WHERE ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `,
    params
  );

  const countRows = await queryRows<{ total: string }>(
    `
      SELECT COUNT(*)::text AS total
      FROM articles a
      WHERE ${whereClause}
    `,
    params.slice(0, params.length - 2)
  );

  const total = Number(countRows[0]?.total ?? "0");
  return {
    items: rows.map(toArticleRow).map(toArticleResponse),
    page: input.page,
    page_size: input.pageSize,
    total,
    has_next: input.page * input.pageSize < total
  };
}

export async function getPublicArticle(id: number) {
  await ensureSchema();
  const rows = await queryRows<ArticleDbRow>(
    `
      SELECT
        a.id, a.title, a.hidden_article_id, a.summary, a.content, a.image_url, a.links_json, a.is_published,
        a.category_id, c.name AS category_name, c.slug AS category_slug,
        a.created_at::text, a.updated_at::text
      FROM articles a
      JOIN categories c ON c.id = a.category_id
      WHERE a.id = $1 AND a.is_published = TRUE
      LIMIT 1
    `,
    [id]
  );
  return rows[0] ? toArticleResponse(toArticleRow(rows[0])) : null;
}

export async function listAdminArticles(page: number, pageSize: number, query?: string | null) {
  await ensureSchema();
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (query) {
    params.push(`%${query}%`);
    conditions.push(
      `(a.title ILIKE $${params.length} OR a.summary ILIKE $${params.length} OR a.content ILIKE $${params.length} OR COALESCE(a.hidden_article_id, '') ILIKE $${params.length})`
    );
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(pageSize, (page - 1) * pageSize);
  const rows = await queryRows<ArticleDbRow>(
    `
      SELECT
        a.id, a.title, a.hidden_article_id, a.summary, a.content, a.image_url, a.links_json, a.is_published,
        a.category_id, c.name AS category_name, c.slug AS category_slug,
        a.created_at::text, a.updated_at::text
      FROM articles a
      JOIN categories c ON c.id = a.category_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );
  const totalRows = await queryRows<{ total: string }>(
    `
      SELECT COUNT(*)::text AS total
      FROM articles a
      ${whereClause}
    `,
    params.slice(0, params.length - 2)
  );
  const total = Number(totalRows[0]?.total ?? "0");
  return {
    items: rows.map(toArticleRow).map(toArticleResponse),
    page,
    page_size: pageSize,
    total,
    has_next: page * pageSize < total
  };
}

export async function getAdminArticle(id: number) {
  await ensureSchema();
  const rows = await queryRows<ArticleDbRow>(
    `
      SELECT
        a.id, a.title, a.hidden_article_id, a.summary, a.content, a.image_url, a.links_json, a.is_published,
        a.category_id, c.name AS category_name, c.slug AS category_slug,
        a.created_at::text, a.updated_at::text
      FROM articles a
      JOIN categories c ON c.id = a.category_id
      WHERE a.id = $1
      LIMIT 1
    `,
    [id]
  );
  return rows[0] ? toArticleResponse(toArticleRow(rows[0])) : null;
}

type PushTokenRow = {
  token: string;
};

async function sendArticlePushNotifications(article: ArticleResponse) {
  const rows = await queryRows<PushTokenRow>("SELECT token FROM push_tokens");
  const tokens = rows.map((row) => row.token);
  if (tokens.length === 0) {
    return;
  }

  const invalidTokens = new Set<string>();

  for (let index = 0; index < tokens.length; index += 500) {
    const batch = tokens.slice(index, index + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      data: {
        article_id: String(article.id),
        title: article.title,
        summary: article.summary,
        category_id: String(article.category.id),
        category_slug: article.category.slug,
        created_at: article.created_at,
      },
      android: {
        priority: "high",
      },
    });

    response.responses.forEach((result, batchIndex) => {
      if (result.success) {
        return;
      }

      if (result.error?.code === "messaging/registration-token-not-registered") {
        invalidTokens.add(batch[batchIndex]);
      }
    });
  }

  if (invalidTokens.size > 0) {
    await queryRows("DELETE FROM push_tokens WHERE token = ANY($1::text[])", [[...invalidTokens]]);
  }
}

export async function createArticle(payload: z.infer<typeof articleInputSchema>) {
  await ensureSchema();
  const rows = await queryRows<ArticleDbRow>(
    `
      INSERT INTO articles (title, hidden_article_id, summary, content, image_url, links_json, category_id, is_published)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      RETURNING
        id, title, hidden_article_id, summary, content, image_url, links_json, is_published,
        category_id, '' AS category_name, '' AS category_slug,
        created_at::text, updated_at::text
    `,
    [
      payload.title,
      payload.hidden_article_id?.trim() || null,
      payload.summary,
      payload.content,
      payload.image_url ?? null,
      JSON.stringify(payload.links),
      payload.category_id,
      payload.is_published
    ]
  );
  const articleRow = rows[0];
  const article = await getAdminArticle(articleRow.id);

  if (article?.is_published) {
    await sendArticlePushNotifications(article);
  }

  return article;
}

export async function updateArticle(id: number, payload: z.infer<typeof articleInputSchema>) {
  await ensureSchema();

  // Get existing article to check if it's being published
  const existingRows = await queryRows<{ id: number; is_published: boolean }>(
    "SELECT id, is_published FROM articles WHERE id = $1",
    [id]
  );
  const existing = existingRows[0];

  await queryRows(
    `
      UPDATE articles
      SET
        title = $1,
        hidden_article_id = $2,
        summary = $3,
        content = $4,
        image_url = $5,
        links_json = $6::jsonb,
        category_id = $7,
        is_published = $8,
        updated_at = NOW()
      WHERE id = $9
    `,
    [
      payload.title,
      payload.hidden_article_id?.trim() || null,
      payload.summary,
      payload.content,
      payload.image_url ?? null,
      JSON.stringify(payload.links),
      payload.category_id,
      payload.is_published,
      id
    ]
  );
  const article = await getAdminArticle(id);

  if (article && article.is_published && (!existing || !existing.is_published)) {
    await sendArticlePushNotifications(article);
  }

  return article;
}

export async function deleteArticle(id: number) {
  await ensureSchema();
  await queryRows("DELETE FROM articles WHERE id = $1", [id]);
}

export async function getDashboardStats() {
  await ensureSchema();

  const stats = await queryRows<{
    article_count: string;
    category_count: string;
    total_views: string;
    draft_count: string;
    published_count: string;
  }>(
    `
      SELECT
        COUNT(*) FILTER (WHERE a.id IS NOT NULL) AS article_count,
        (SELECT COUNT(*) FROM categories) AS category_count,
        COALESCE(SUM(a.views), 0)::text AS total_views,
        COUNT(*) FILTER (WHERE a.is_published = FALSE) AS draft_count,
        COUNT(*) FILTER (WHERE a.is_published = TRUE) AS published_count
      FROM articles a
    `
  );

  return {
    articleCount: Number(stats[0]?.article_count ?? "0"),
    categoryCount: Number(stats[0]?.category_count ?? "0"),
    totalViews: Number(stats[0]?.total_views ?? "0"),
    draftCount: Number(stats[0]?.draft_count ?? "0"),
    publishedCount: Number(stats[0]?.published_count ?? "0"),
  };
}

export async function getRecentArticles(limit: number = 5) {
  await ensureSchema();
  const rows = await queryRows<ArticleDbRow>(
    `
      SELECT
        a.id, a.title, a.hidden_article_id, a.summary, a.content, a.image_url, a.links_json, a.is_published,
        a.category_id, c.name AS category_name, c.slug AS category_slug,
        a.created_at::text, a.updated_at::text
      FROM articles a
      JOIN categories c ON c.id = a.category_id
      ORDER BY a.created_at DESC
      LIMIT $1
    `,
    [limit]
  );
  return rows.map(toArticleRow).map(toArticleResponse);
}

export async function addViewToArticle(id: number) {
  await ensureSchema();
  await queryRows(
    `
      UPDATE articles
      SET views = COALESCE(views, 0) + 1
      WHERE id = $1
    `,
    [id]
  );
}
