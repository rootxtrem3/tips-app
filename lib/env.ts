export const env = {
  databaseUrl:
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.power_DATABASE_URL ??
    process.env.power_POSTGRES_URL ??
    "",
  jwtSecretKey: process.env.JWT_SECRET_KEY ?? "",
  adminBootstrapUsername: process.env.ADMIN_BOOTSTRAP_USERNAME ?? "admin",
  adminBootstrapPassword: process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "",
  mediaProvider: process.env.MEDIA_PROVIDER ?? "vercel_blob",
  blobToken:
    process.env.BLOB_READ_WRITE_TOKEN ??
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN ??
    process.env.power_READ_WRITE_TOKEN ??
    "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  fcmServerKey: process.env.FCM_SERVER_KEY ?? "",
  FCM_SERVER_KEY: process.env.FCM_SERVER_KEY ?? "",
  fcmSenderId: process.env.FCM_SENDER_ID ?? "",
  FCM_SENDER_ID: process.env.FCM_SENDER_ID ?? "",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY ?? "",
};

export function requireEnv(value: string, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
