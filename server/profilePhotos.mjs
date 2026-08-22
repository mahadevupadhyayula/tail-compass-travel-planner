const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export function decodeProfilePhoto(photo) {
  if (!photo) return null;
  const mimeType = String(photo.type || "").toLowerCase();
  const extension = ALLOWED_TYPES.get(mimeType);
  if (!extension) throw new Error("Photos must be JPEG, PNG, or WebP files.");
  const match = String(photo.data || "").match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match || match[1].toLowerCase() !== mimeType) throw new Error("The selected photo could not be read.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw new Error("Each photo must be smaller than 10 MB.");
  return { bytes, mimeType, extension };
}

export function profilePhotoPath({ userId, petId, kind, extension }) {
  if (kind === "owner") return `users/${userId}/owner/profile.${extension}`;
  if (kind === "pet" && petId) return `users/${userId}/pets/${petId}/profile.${extension}`;
  throw new Error("Invalid profile photo destination.");
}

export async function uploadProfilePhoto({ config, userId, petId, kind, photo, fetchImpl = fetch }) {
  const decoded = decodeProfilePhoto(photo);
  if (!decoded) return null;
  if (!config?.baseUrl || !config?.apiKey) throw new Error("Supabase photo storage is not configured.");
  const objectPath = profilePhotoPath({ userId, petId, kind, extension: decoded.extension });
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetchImpl(`${config.baseUrl}/storage/v1/object/profile-images/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: config.apiKey,
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": decoded.mimeType,
      "x-upsert": "true"
    },
    body: decoded.bytes
  });
  if (!response.ok) throw new Error(`Could not upload the ${kind} photo (${response.status}).`);
  return objectPath;
}
