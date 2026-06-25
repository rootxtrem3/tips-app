export type AdminUser = {
  id: number;
  username: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
};

export type ArticleLink = {
  alias: string;
  url: string;
};

export type Article = {
  id: number;
  title: string;
  hidden_article_id: string | null;
  summary: string;
  content: string;
  image_url: string | null;
  links: ArticleLink[];
  is_published: boolean;
  category_id: number;
  category_name: string;
  category_slug: string;
  created_at: string;
  updated_at: string;
  views?: number;
};

export type ArticleResponse = {
  id: number;
  title: string;
  hidden_article_id: string | null;
  summary: string;
  content: string;
  image_url: string | null;
  links: ArticleLink[];
  is_published: boolean;
  category: Category;
  created_at: string;
  updated_at: string;
};
