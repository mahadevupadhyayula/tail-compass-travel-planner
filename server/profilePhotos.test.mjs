import assert from "node:assert/strict";
import { decodeProfilePhoto, profilePhotoPath, uploadProfilePhoto } from "./profilePhotos.mjs";

const sample = { type: "image/png", data: "data:image/png;base64,aGVsbG8=" };
assert.equal(decodeProfilePhoto(sample).bytes.toString(), "hello");
assert.equal(profilePhotoPath({ userId: "user-1", kind: "owner", extension: "png" }), "users/user-1/owner/profile.png");
assert.equal(profilePhotoPath({ userId: "user-1", petId: "pet-1", kind: "pet", extension: "jpg" }), "users/user-1/pets/pet-1/profile.jpg");
assert.throws(() => decodeProfilePhoto({ type: "image/gif", data: "data:image/gif;base64,aA==" }), /JPEG, PNG, or WebP/);

let request;
const path = await uploadProfilePhoto({
  config: { baseUrl: "https://example.supabase.co", apiKey: "secret" },
  userId: "user-1",
  kind: "owner",
  photo: sample,
  fetchImpl: async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200 };
  }
});
assert.equal(path, "users/user-1/owner/profile.png");
assert.match(request.url, /profile-images\/users\/user-1\/owner\/profile\.png$/);
assert.equal(request.options.headers["x-upsert"], "true");
assert.equal(request.options.body.toString(), "hello");

console.log("Profile photo storage tests passed.");
