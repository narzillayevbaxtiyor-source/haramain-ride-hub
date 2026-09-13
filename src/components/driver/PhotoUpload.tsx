import { useEffect, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDriverText } from "@/lib/i18n-driver";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/** Uploads a vehicle photo into the private bucket under the driver's own folder. */
export function PhotoUpload({
  label, kind, userId, path, onUploaded, onError,
}: {
  label: string;
  kind: "exterior" | "interior";
  userId: string;
  path: string | null;
  onUploaded: (path: string) => void;
  onError: (message: string | null) => void;
}) {
  const d = useDriverText();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setPreview(null);
      return;
    }
    supabase.storage
      .from("vehicle-photos")
      .createSignedUrl(path, 600)
      .then(({ data }) => {
        if (active) setPreview(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [path]);

  async function handleFile(file: File) {
    onError(null);
    if (!ALLOWED.includes(file.type)) return onError(d.fileType);
    if (file.size > MAX_BYTES) return onError(d.fileSize);
    setBusy(true);
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const objectPath = `${userId}/${kind}-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("vehicle-photos").upload(objectPath, file, { upsert: true });
    setBusy(false);
    if (error) return onError(d.error);
    onUploaded(objectPath);
  }

  return (
    <div className="rounded-md border border-input bg-card p-4">
      <p className="text-sm font-bold text-card-foreground">{label}</p>
      <div className="mt-3 grid min-h-40 place-items-center overflow-hidden rounded-md bg-secondary">
        {preview ? (
          <img src={preview} alt={label} className="h-40 w-full object-cover" />
        ) : (
          <Camera className="size-8 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <label className="mt-3 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {busy ? d.uploading : path ? d.replace : d.upload}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
