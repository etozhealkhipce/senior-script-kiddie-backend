import { type ChangeEvent, type FC, type RefObject, useState } from "react";
import { Button, PageHeader, useConfirm } from "../../ui";

type ImageLibraryProps = {
  uploadedImages: { name: string; url: string }[];
  uploading: boolean;
  copied: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onDelete: (name: string) => void;
  onCopy: (url: string) => void;
};

export const ImageLibrary: FC<ImageLibraryProps> = ({
  uploadedImages,
  uploading,
  copied,
  fileInputRef,
  onUpload,
  onDelete,
  onCopy,
}) => {
  const confirm = useConfirm();
  const [active, setActive] = useState<string | null>(null);

  const remove = async (name: string) => {
    const ok = await confirm({
      title: "delete image?",
      body: name,
      confirmLabel: "delete",
      danger: true,
    });
    if (ok) onDelete(name);
  };

  return (
    <section className="page">
      <PageHeader
        title="images"
        subtitle="jpg, png, webp, svg · max 10 mb"
        actions={
          <Button
            variant="primary"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            + upload
          </Button>
        }
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onUpload}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {uploadedImages.length === 0 ? (
        <p className="text-sm text-secondary">no images yet</p>
      ) : (
        <ul className="image-grid">
          {uploadedImages.map((img) => (
            <li key={img.name}>
              <div className="image-card">
                <button
                  type="button"
                  className="image-thumb"
                  aria-expanded={active === img.name}
                  aria-label={img.name}
                  onClick={() => setActive(active === img.name ? null : img.name)}
                >
                  <img src={img.url} alt="" loading="lazy" />
                </button>
                {active === img.name && (
                  <div className="image-actions">
                    <Button block onClick={() => onCopy(img.url)}>
                      {copied === img.url ? "copied" : "copy url"}
                    </Button>
                    <Button variant="danger" block onClick={() => void remove(img.name)}>
                      delete
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
