import { BlockForgeEditor } from "@block-forge/block-forge-editor";
import { ChevronLeft, FileText } from "lucide-react";
import { type FC } from "react";
import { EDITOR_TOOLS, EDITOR_INLINE_TOOLS, type NoteForm, type OutputData } from "../constants";
import { slugify } from "../utils";
import { TagEditor } from "../components/TagEditor";

interface EditorPageProps {
  form: NoteForm;
  editingId: number | null;
  editorKey: number;
  initialEditorData: OutputData | null;
  saving: boolean;
  onFormChange: (patch: Partial<NoteForm>) => void;
  onEditorChange: (data?: OutputData | null) => void;
  onSave: (data?: OutputData | null) => void;
  onCancel: () => void;
}

export const EditorPage: FC<EditorPageProps> = ({
  form, editingId, editorKey, initialEditorData, saving,
  onFormChange, onEditorChange, onSave, onCancel,
}) => {
  const slugFolder = form.contentType === "work" ? "work" : "notes";

  return (
    <div className="adm-main-inner">
      <div className="adm-editor-wrap text-content">

        <button className="adm-back-link" onClick={onCancel}>
          <ChevronLeft size={15} />
          Back to entries
        </button>

        <input
          value={form.title}
          onChange={(e) =>
            onFormChange({
              title: e.target.value,
              slug: editingId ? form.slug : slugify(e.target.value),
            })
          }
          placeholder="Untitled"
          className="adm-doc-title"
        />

        <div className="adm-meta">
          {/* Type */}
          <div className="adm-meta-row">
            <div className="adm-meta-label">
              <span className="adm-meta-label-ico"><FileText size={15} /></span>
              Type
            </div>
            <div className="adm-meta-field">
              <div className="adm-seg">
                {(["note", "work"] as const).map((t) => (
                  <button
                    key={t}
                    className={`adm-seg-opt ${form.contentType === t ? "on" : ""}`}
                    onClick={() => onFormChange({ contentType: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Slug */}
          <div className="adm-meta-row">
            <div className="adm-meta-label">
              <span className="adm-meta-label-ico font-mono text-[13px]">/</span>
              Slug
            </div>
            <div className="adm-meta-field flex-nowrap">
              <span className="adm-slug-prefix">/{slugFolder}/</span>
              <input
                value={form.slug}
                onChange={(e) => onFormChange({ slug: e.target.value })}
                placeholder="my-entry-slug"
                className="adm-meta-input mono"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="adm-meta-row">
            <div className="adm-meta-label">
              <span className="adm-meta-label-ico text-sm">≡</span>
              Preview
            </div>
            <div className="adm-meta-field items-start">
              <textarea
                value={form.preview}
                onChange={(e) => onFormChange({ preview: e.target.value })}
                placeholder="Short description…"
                rows={2}
                className="adm-meta-textarea"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="adm-meta-row items-start">
            <div className="adm-meta-label">
              <span className="adm-meta-label-ico text-[13px] font-semibold">#</span>
              Tags
            </div>
            <div className="adm-meta-field pt-[6px]">
              <TagEditor
                items={form.tagItems}
                onChange={(tagItems) => onFormChange({ tagItems })}
              />
            </div>
          </div>

          {/* Work-only fields */}
          {form.contentType === "work" && (
            <>
              <div className="adm-meta-row">
                <div className="adm-meta-label">
                  <span className="adm-meta-label-ico text-[13px]">↗</span>
                  Link URL
                </div>
                <div className="adm-meta-field">
                  <input
                    value={form.link}
                    onChange={(e) => onFormChange({ link: e.target.value })}
                    placeholder="https://…"
                    className="adm-meta-input"
                  />
                </div>
              </div>
              <div className="adm-meta-row">
                <div className="adm-meta-label">
                  <span className="adm-meta-label-ico text-[13px] font-semibold">T</span>
                  Link text
                </div>
                <div className="adm-meta-field">
                  <input
                    value={form.linkText}
                    onChange={(e) => onFormChange({ linkText: e.target.value })}
                    placeholder="view project >"
                    className="adm-meta-input"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="adm-content-divider"><span>Content</span></div>

        <div className="rounded-lg overflow-hidden mb-6 border border-line shadow-sm">
          <BlockForgeEditor
            key={editorKey}
            id={`editor-${editorKey}`}
            enabledTools={EDITOR_TOOLS}
            tools={EDITOR_INLINE_TOOLS}
            initialData={initialEditorData ?? undefined}
            onChange={onEditorChange}
            onSave={(data) => { onEditorChange(data); onSave(data ?? null); }}
            onCancel={onCancel}
          />
        </div>

        <div className="flex items-center gap-2 pt-5 border-t border-line">
          <button
            onClick={() => onSave()}
            disabled={saving || !form.title || !form.slug}
            className="adm-btn-save"
          >
            {saving ? "Saving…" : editingId ? `Update ${form.contentType}` : `Publish ${form.contentType}`}
          </button>
          <button onClick={onCancel} className="adm-btn-discard">Discard</button>
        </div>

      </div>
    </div>
  );
};
