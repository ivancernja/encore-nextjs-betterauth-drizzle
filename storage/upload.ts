import { api, APIError } from "encore.dev/api";
import { photos } from "./bucket.js";
import { randomBytes } from "crypto";

interface UploadPhotoRequest {
  fileName: string;
  contentType: string;
  data: string; // Base64 encoded image data
}

interface UploadPhotoResponse {
  photoId: string;
  url: string;
}

/**
 * Upload a photo to the storage bucket
 */
export const uploadPhoto = api(
  { expose: true, method: "POST", path: "/photos/upload", auth: false },
  async ({ fileName, contentType, data }: UploadPhotoRequest): Promise<UploadPhotoResponse> => {
    // Validate content type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(contentType)) {
      throw APIError.invalidArgument("Invalid content type. Only JPEG, PNG, GIF, and WebP are allowed.");
    }

    // Generate unique photo ID with timestamp
    const timestamp = Date.now();
    const randomId = randomBytes(8).toString("hex");
    const extension = contentType.split("/")[1];
    const photoId = `${timestamp}-${randomId}.${extension}`;

    // Decode base64 data
    const buffer = Buffer.from(data, "base64");

    // Upload to bucket
    await photos.upload(photoId, buffer, {
      contentType,
    });

    // Get public URL
    const url = photos.publicUrl(photoId);

    return {
      photoId,
      url,
    };
  }
);

/**
 * List all photos
 */
interface PhotoInfo {
  name: string;
  url: string;
  size: number;
  uploadedAt: Date;
}

interface ListPhotosResponse {
  photos: PhotoInfo[];
}

export const listPhotos = api(
  { expose: true, method: "GET", path: "/photos", auth: false },
  async (): Promise<ListPhotosResponse> => {
    const photosList: PhotoInfo[] = [];

    for await (const entry of photos.list({})) {
      const attrs = await photos.attrs(entry.name);
      photosList.push({
        name: entry.name,
        url: photos.publicUrl(entry.name),
        size: attrs.size,
        uploadedAt: attrs.lastModified,
      });
    }

    // Sort by upload date, newest first
    photosList.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

    return { photos: photosList };
  }
);

/**
 * Delete a photo
 */
interface DeletePhotoRequest {
  photoId: string;
}

export const deletePhoto = api(
  { expose: true, method: "DELETE", path: "/photos/:photoId", auth: false },
  async ({ photoId }: DeletePhotoRequest): Promise<void> => {
    try {
      await photos.remove(photoId);
    } catch (err) {
      throw APIError.notFound(`Photo ${photoId} not found`);
    }
  }
);

