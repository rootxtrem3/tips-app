import { env } from "@/lib/env";
import { queryRows } from "@/lib/db";
import { hashPassword } from "@/lib/security";

declare global {
  var powerTipsSchemaReady: Promise<void> | undefined;
}

type CountRow = { count: string };

async function initializeSchema() {
  await queryRows(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(64) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await queryRows(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(80) UNIQUE NOT NULL,
      slug VARCHAR(80) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await queryRows(`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title VARCHAR(180) NOT NULL,
      hidden_article_id VARCHAR(80),
      summary VARCHAR(320) NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      links_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await queryRows(`
    ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS hidden_article_id VARCHAR(80);
  `);

  await queryRows(`
    ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS links_json JSONB NOT NULL DEFAULT '[]'::jsonb;
  `);

  await queryRows(`
    ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;
  `);

  await queryRows(`
    CREATE TABLE IF NOT EXISTS push_tokens (
      id SERIAL PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create FCM subscription tables for push notification targeting
  await queryRows(`
    CREATE TABLE IF NOT EXISTS fcm_subscriptions (
      id SERIAL PRIMARY KEY,
      fcm_token VARCHAR(500) NOT NULL UNIQUE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await queryRows(`
    CREATE INDEX IF NOT EXISTS idx_fcm_subscriptions_category
      ON fcm_subscriptions(category_id);
  `);

  await queryRows(`
    CREATE INDEX IF NOT EXISTS idx_fcm_subscriptions_token
      ON fcm_subscriptions(fcm_token);
  `);

  // Table to track sent FCM notifications for deduplication
  await queryRows(`
    CREATE TABLE IF NOT EXISTS fcm_notifications_sent (
      id SERIAL PRIMARY KEY,
      article_id INTEGER NOT NULL UNIQUE REFERENCES articles(id) ON DELETE CASCADE,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      success BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);

  await queryRows(`
    CREATE INDEX IF NOT EXISTS idx_fcm_notifications_article
      ON fcm_notifications_sent(article_id);
  `);

  await queryRows(`
    CREATE INDEX IF NOT EXISTS idx_articles_created_at
      ON articles (created_at DESC);
  `);

  await queryRows(`
    CREATE INDEX IF NOT EXISTS idx_articles_published_created_at
      ON articles (is_published, created_at DESC);
  `);

  await queryRows(`
    CREATE INDEX IF NOT EXISTS idx_articles_category_id
      ON articles (category_id);
  `);

  await queryRows(`
    CREATE INDEX IF NOT EXISTS idx_articles_hidden_article_id
      ON articles (hidden_article_id);
  `);

  const categoryCount = await queryRows<CountRow>("SELECT COUNT(*)::text AS count FROM categories");
  if (Number(categoryCount[0]?.count ?? "0") === 0) {
    await queryRows(
      `INSERT INTO categories (name, slug) VALUES ($1, $2), ($3, $4), ($5, $6) ON CONFLICT DO NOTHING`,
      ["General", "general", "Tips", "tips", "Motivation", "motivation"]
    );
  }

  if (env.adminBootstrapPassword) {
    const existing = await queryRows<{ id: number }>(
      "SELECT id FROM admin_users WHERE username = $1 LIMIT 1",
      [env.adminBootstrapUsername]
    );
    if (existing.length === 0) {
      await queryRows(
        "INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)",
        [env.adminBootstrapUsername, hashPassword(env.adminBootstrapPassword)]
      );
    }
  }
}

export async function ensureSchema() {
  if (!globalThis.powerTipsSchemaReady) {
    globalThis.powerTipsSchemaReady = initializeSchema();
  }
  await globalThis.powerTipsSchemaReady;
}
