"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Upload, Trash2, Image as ImageIcon } from "lucide-react";

interface Photo {
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
}

export default function PhotosPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const res = await fetch("/api/photos");
      const data = await res.json();
      setPhotos(data.photos || []);
    } catch (err) {
      console.error("Failed to load photos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      setError("");
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError("");

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      
      await new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64Data = (reader.result as string).split(",")[1];

            const res = await fetch("/api/photos/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: selectedFile.name,
                contentType: selectedFile.type,
                data: base64Data,
              }),
            });

            if (!res.ok) {
              throw new Error("Upload failed");
            }

            // Reload photos list
            await loadPhotos();
            setSelectedFile(null);
            
            // Reset file input
            const fileInput = document.getElementById("photo-upload") as HTMLInputElement;
            if (fileInput) fileInput.value = "";

            resolve(null);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
      });
    } catch (err) {
      setError("Failed to upload photo. Please try again.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    try {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      // Reload photos list
      await loadPhotos();
    } catch (err) {
      console.error("Failed to delete photo:", err);
    }
  };

  if (isPending || !session?.user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="size-5" />
            <span className="font-semibold">Photos</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard" className="inline-flex items-center gap-2">
              <Home className="size-4" />
              <span>Dashboard</span>
            </Link>
          </Button>
        </div>
      </header>

      <div className="container py-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <div>
            <h1 className="mb-2 text-3xl font-semibold tracking-tight">
              Photo Storage
            </h1>
            <p className="text-muted-foreground">
              Upload and manage your photos. Photos are automatically deleted after 30 days.
            </p>
          </div>

          {/* Upload Section */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Upload Photo</h2>
            
            {error && (
              <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="photo-upload">Select Image</Label>
                <Input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mt-2"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Accepted formats: JPEG, PNG, GIF, WebP. Max size: 5MB
                </p>
              </div>

              {selectedFile && (
                <div className="rounded-md border p-3">
                  <p className="text-sm">
                    <span className="font-medium">Selected:</span> {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Size: {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="gap-2"
              >
                <Upload className="size-4" />
                <span>{isUploading ? "Uploading..." : "Upload Photo"}</span>
              </Button>
            </div>
          </div>

          {/* Photos Grid */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Photos</h2>
              <p className="text-sm text-muted-foreground">
                {photos.length} {photos.length === 1 ? "photo" : "photos"}
              </p>
            </div>

            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground">
                Loading photos...
              </div>
            ) : photos.length === 0 ? (
              <div className="rounded-lg border bg-card p-12 text-center">
                <ImageIcon className="mx-auto mb-4 size-12 text-muted-foreground" />
                <p className="text-muted-foreground">No photos yet. Upload your first photo!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo) => (
                  <div key={photo.name} className="group relative overflow-hidden rounded-lg border bg-card">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <p className="mb-1 truncate text-sm font-medium">{photo.name}</p>
                      <p className="mb-3 text-xs text-muted-foreground">
                        {new Date(photo.uploadedAt).toLocaleDateString()} • {(photo.size / 1024).toFixed(2)} KB
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(photo.name)}
                        className="w-full gap-2"
                      >
                        <Trash2 className="size-4" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

