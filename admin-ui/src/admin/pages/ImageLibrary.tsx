import { Plus } from "lucide-react";
import { type ChangeEvent, type FC, type RefObject, useState } from "react";

interface ImageLibraryProps {
  uploadedImages: { name: string; url: string }[];
  uploading: boolean;
  copied: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onDelete: (name: string) => void;
  onCopy: (url: string) => void;
}

export const ImageLibrary: FC<ImageLibraryProps> = ({
  uploadedImages, uploading, copied, fileInputRef,
  onUpload, onDelete, onCopy,
}) => {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const toggleActive = (name: string) =>
    setActiveCard((prev) => (prev === name ? null : name));

  return (
    <div className="adm-main-inner">
      <div className="adm-page-head">
        <h1 className="adm-page-title">Image library</h1>
      </div>

      <div className="adm-lib-toolbar">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onUpload}
          className="hidden"
          id="img-upload"
        />
        <label htmlFor="img-upload" className="adm-upload-btn">
          <Plus size={16} />
          {uploading ? "Uploading…" : "Upload image"}
        </label>
        <span className="adm-lib-hint">JPG, PNG, WebP, SVG · max 10 MB</span>
      </div>

      {uploadedImages.length === 0 ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>No images uploaded yet.</p>
      ) : (
        <div className="adm-lib-grid">
          {uploadedImages.map((img) => (
            <div
              key={img.name}
              className={`adm-lib-card ${activeCard === img.name ? "active" : ""}`}
              onClick={() => toggleActive(img.name)}
            >
              <img src={img.url} alt={img.name} />
              <div className="adm-lib-overlay">
                <button
                  className="adm-lib-action"
                  onClick={(e) => { e.stopPropagation(); onCopy(img.url); }}
                >
                  {copied === img.url ? "Copied ✓" : "Copy URL"}
                </button>
                <button
                  className="adm-lib-action danger"
                  onClick={(e) => { e.stopPropagation(); onDelete(img.name); }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
