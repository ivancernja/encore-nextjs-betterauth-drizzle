import { CronJob } from "encore.dev/cron";
import { filesDb } from "./db";
import { uploadedFiles } from "./schema";
import { filesBucket } from "./storage";
import { lt, and, isNotNull, eq } from "drizzle-orm";

// Cronjob that runs daily at 2 AM to clean up expired files
const cleanupExpiredFiles = new CronJob("cleanup-expired-files", {
  title: "Clean up expired files",
  schedule: "0 2 * * *", // Run at 2:00 AM every day
  endpoint: async () => {
    const now = new Date();

    // Find all files that have expired
    const expiredFiles = await filesDb.query.uploadedFiles.findMany({
      where: and(
        isNotNull(uploadedFiles.expiresAt),
        lt(uploadedFiles.expiresAt, now)
      ),
    });

    let deletedCount = 0;
    let errorCount = 0;

    // Delete each expired file
    for (const file of expiredFiles) {
      try {
        // Delete from object storage
        await filesBucket.remove(file.storageKey);

        // Delete from database
        await filesDb
          .delete(uploadedFiles)
          .where(eq(uploadedFiles.id, file.id));

        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete file ${file.id}:`, error);
        errorCount++;
      }
    }

    console.log(
      `Cleanup completed: ${deletedCount} files deleted, ${errorCount} errors`
    );
  },
});

export default cleanupExpiredFiles;
