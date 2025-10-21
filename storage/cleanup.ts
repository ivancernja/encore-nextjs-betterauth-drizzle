import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import log from "encore.dev/log";
import { photos } from "./bucket.js";

/**
 * Cleanup old photos (older than 30 days)
 * This runs daily at 2 AM UTC
 */
const _ = new CronJob("cleanup-old-photos", {
  title: "Clean up photos older than 30 days",
  schedule: "0 2 * * *", // Daily at 2 AM UTC
  endpoint: cleanupOldPhotos,
});

interface CleanupResult {
  deletedCount: number;
  deletedPhotos: string[];
}

export const cleanupOldPhotos = api(
  { expose: true, method: "POST", path: "/photos/cleanup" },
  async (): Promise<CleanupResult> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedPhotos: string[] = [];

    // List all photos
    for await (const entry of photos.list({})) {
      try {
        // Get photo attributes
        const attrs = await photos.attrs(entry.name);

        // Check if older than 30 days
        if (attrs.lastModified < thirtyDaysAgo) {
          await photos.remove(entry.name);
          deletedPhotos.push(entry.name);
          log.info("Deleted old photo", { photoId: entry.name, uploadedAt: attrs.lastModified });
        }
      } catch (err) {
        log.error("Error processing photo for cleanup", { photoId: entry.name, error: err });
      }
    }

    log.info("Photo cleanup completed", { deletedCount: deletedPhotos.length });

    return {
      deletedCount: deletedPhotos.length,
      deletedPhotos,
    };
  }
);

