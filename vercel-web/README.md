# power tips web

Vercel-hosted admin website and API for the `power tips` platform.

## Stack

- Next.js App Router
- Vercel Route Handlers for API
- Neon PostgreSQL
- Vercel Blob or Cloudinary for images

## Required Environment Variables

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `ADMIN_BOOTSTRAP_USERNAME`
- `ADMIN_BOOTSTRAP_PASSWORD`
- `MEDIA_PROVIDER`

For uploads:

- Blob: `BLOB_READ_WRITE_TOKEN`
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## Deploy

1. Create a Neon database
2. Create a Vercel Blob store and copy its `BLOB_READ_WRITE_TOKEN`
3. Create a Vercel project using `vercel-web` as the root directory
4. Add environment variables from `.env.example`
5. Set `DATABASE_URL` to your Neon connection string and `BLOB_READ_WRITE_TOKEN` to the Blob store token
6. If your Vercel integrations expose names like `power_DATABASE_URL` or `power_READ_WRITE_TOKEN`, this app also accepts those
7. Deploy

The app lazily creates the required tables and bootstrap admin user on first request.
