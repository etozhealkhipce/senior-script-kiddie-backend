import { BlockForgeEditor } from "@block-forge/block-forge-editor";
import type { FC } from "react";
import { Button, Card, Field, Tabs, TextArea } from "../../ui";
import { TagEditor } from "../components/TagEditor";
import { EDITOR_INLINE_TOOLS, EDITOR_TOOLS, type NoteForm, type OutputData } from "../constants";
import { slugDraft, slugify } from "../utils";

type EditorPageProps = {
  form: NoteForm;
  editingId: number | null;
  editorKey: number;
  initialEditorData: OutputData | null;
  saving: boolean;
  onFormChange: (patch: Partial<NoteForm>) => void;
  onEditorChange: (data?: OutputData | null) => void;
  onSave: (data?: OutputData | null) => void;
  onCancel: () => void;
};

export const EditorPage: FC<EditorPageProps> = ({
  form,
  editingId,
  editorKey,
  initialEditorData,
  saving,
  onFormChange,
  onEditorChange,
  onSave,
  onCancel,
}) => {
  const folder = form.contentType === "work" ? "work" : "notes";
  const action = editingId ? `update ${form.contentType}` : `publish ${form.contentType}`;

  return (
    <section className="page">
      <Button variant="link" className="self-start" onClick={onCancel}>
        ‹ entries
      </Button>

      <Field
        aria-label="title"
        large
        placeholder="untitled"
        value={form.title}
        onChange={(e) =>
          onFormChange({
            title: e.target.value,
            slug: editingId ? form.slug : slugify(e.target.value),
          })
        }
      />

      <Tabs
        label="entry type"
        value={form.contentType}
        onChange={(contentType) => onFormChange({ contentType })}
        items={[
          { value: "note", label: "note" },
          { value: "work", label: "work" },
        ]}
      />

      <Field
        label="slug"
        prefix={`/${folder}/`}
        placeholder="my-entry-slug"
        value={form.slug}
        onChange={(e) => onFormChange({ slug: slugDraft(e.target.value) })}
        onBlur={() => {
          const clean = slugify(form.slug);
          if (clean !== form.slug) onFormChange({ slug: clean });
        }}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />

      <TextArea
        label="preview"
        rows={3}
        placeholder="short description…"
        value={form.preview}
        onChange={(e) => onFormChange({ preview: e.target.value })}
      />

      <div className="ui-field">
        <span className="ui-label">tags</span>
        <TagEditor items={form.tagItems} onChange={(tagItems) => onFormChange({ tagItems })} />
      </div>

      {form.contentType === "work" && (
        <>
          <Field
            label="link url"
            type="url"
            inputMode="url"
            placeholder="https://…"
            autoCapitalize="none"
            value={form.link}
            onChange={(e) => onFormChange({ link: e.target.value })}
          />
          <Field
            label="link text"
            placeholder="view project >"
            value={form.linkText}
            onChange={(e) => onFormChange({ linkText: e.target.value })}
          />
        </>
      )}

      <Card className="editor-card">
        <BlockForgeEditor
          key={editorKey}
          id={`editor-${editorKey}`}
          enabledTools={EDITOR_TOOLS}
          tools={EDITOR_INLINE_TOOLS}
          initialData={initialEditorData ?? undefined}
          onChange={onEditorChange}
          onSave={(data) => {
            onEditorChange(data);
            onSave(data ?? null);
          }}
          onCancel={onCancel}
        />
      </Card>

      <div className="app-actionbar">
        <Button
          variant="primary"
          loading={saving}
          disabled={!form.title || !form.slug}
          onClick={() => onSave()}
        >
          {action}
        </Button>
        <Button onClick={onCancel}>discard</Button>
      </div>
    </section>
  );
};
