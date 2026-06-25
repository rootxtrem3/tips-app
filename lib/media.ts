import { put } from "@vercel/blob";
import { env, requireEnv } from "@/lib/env";
import { sha1 } from "@/lib/security";

function safeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
}

async function uploadToCloudinary(file: File) {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new Error("Cloudinary configuration is incomplete.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sha1(`timestamp=${timestamp}${env.cloudinaryApiSecret}`);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", env.cloudinaryApiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!response.ok) {
    throw new Error("Cloudinary upload failed.");
  }
  const payload = await response.json();
  return payload.secure_url as string;
}

async function uploadToVercelBlob(file: File) {
  const token = requireEnv(env.blobToken, "BLOB_READ_WRITE_TOKEN");
  const result = await put(`articles/${Date.now()}-${safeFileName(file.name)}`, file, {
    access: "public",
    addRandomSuffix: true,
    token
  });
  return result.url;
}

export async function uploadImage(file: File) {
  if (env.mediaProvider === "cloudinary") {
    return uploadToCloudinary(file);
  }
  return uploadToVercelBlob(file);
}
