export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadResult {
  assets: Array<{
    id: string;
    name: string;
    type: string;
    mimeType: string;
    size: number;
    url: string;
  }>;
}

export async function uploadFiles(
  files: File[],
  folder?: string,
  onProgress?: (progress: UploadProgress) => void,
  clientId?: string
): Promise<UploadResult> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  if (folder) formData.append("folder", folder);
  if (clientId) formData.append("clientId", clientId);

  onProgress?.({ loaded: 0, total: 1, percent: 10 });

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  onProgress?.({ loaded: 1, total: 1, percent: 90 });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  onProgress?.({ loaded: 1, total: 1, percent: 100 });
  return data;
}
