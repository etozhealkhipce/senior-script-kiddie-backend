import type { OutputData } from "./constants";

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function replaceBase64WithUploads(
  content: OutputData | null,
  token: string,
): Promise<OutputData | null> {
  if (!content) return content;

  const uploadBase64 = async (dataUrl: string): Promise<string> => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const ext = blob.type.split("/")[1] || "png";
      const fd = new FormData();
      fd.append("file", blob, `upload.${ext}`);
      const up = await fetch("/api/uploads", {
        method: "POST",
        headers: { "x-admin-token": token },
        body: fd,
      });
      if (up.ok) {
        const { url } = await up.json();
        return `${window.location.origin}${url}`;
      }
    } catch { /* fall through */ }
    return dataUrl;
  };

  const blocks = await Promise.all(
    content.blocks.map(async (block) => {
      if (block.type === "imageSingle") {
        const url = block.data.url as string | undefined;
        if (url?.startsWith("data:"))
          return { ...block, data: { ...block.data, url: await uploadBase64(url) } };
      }
      if (block.type === "imageGallery") {
        type GImg = { id?: string; url: string; [k: string]: unknown };
        const images = block.data.images as GImg[] | undefined;
        if (images) {
          const processed = await Promise.all(
            images.map(async (img) =>
              img.url?.startsWith("data:")
                ? { ...img, url: await uploadBase64(img.url) }
                : img,
            ),
          );
          return { ...block, data: { ...block.data, images: processed } };
        }
      }
      return block;
    }),
  );

  return { ...content, blocks };
}
