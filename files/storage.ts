import { Bucket } from "encore.dev/storage/objects";

// Create an object storage bucket for uploaded files
export const filesBucket = new Bucket("files", {
  versioned: false,
});
