import { Bucket } from "encore.dev/storage/objects";

// Photo storage bucket
export const photos = new Bucket("photos", {
  versioned: false,
  public: true, // Allow public access for photo URLs
});

