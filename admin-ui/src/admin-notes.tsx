import { BlockForgeEditor } from "@block-forge/block-forge-editor";
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NoteApiData, SubtitleItem } from "./types";

// Stable reference — MUST be outside component or memoized.
// Inline arrays recreate on every render → useEditor sees new deps → reloads tools → destroys EditorJS.
const EDITOR_TOOLS: string[] = ["paragraph", "list", "table", "divider", "quote", "code", "imageSingle", "imageGallery"];

// Auto-upload base64 data URLs from block-forge imageSingle/imageGallery to the server.
// block-forge has no custom uploader hook — it stores files as data:image/...;base64,...
// We intercept on save and replace them with proper /uploads/... URLs.
async function replaceBase64WithUploads(
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
        // Return absolute URL so the Astro frontend resolves it to the backend host
        return `${window.location.origin}${url}`;
      }
    } catch { /* fall through */ }
    return dataUrl; // keep original if upload fails
  };

  const blocks = await Promise.all(
    content.blocks.map(async (block) => {
      if (block.type === "imageSingle") {
        const url = block.data.url as string | undefined;
        if (url?.startsWith("data:")) {
          const uploaded = await uploadBase64(url);
          return { ...block, data: { ...block.data, url: uploaded } };
        }
      }
      if (block.type === "imageGallery") {
        type GImg = { id?: string; url: string; [k: string]: unknown };
        const images = block.data.images as GImg[] | undefined;
        if (images) {
          const processed = await Promise.all(
            images.map(async (img) => {
              if (img.url?.startsWith("data:")) {
                return { ...img, url: await uploadBase64(img.url) };
              }
              return img;
            }),
          );
          return { ...block, data: { ...block.data, images: processed } };
        }
      }
      return block;
    }),
  );

  return { ...content, blocks };
}

type OutputData = {
  time?: number;
  blocks: { id?: string; type: string; data: Record<string, unknown> }[];
  version?: string;
};

type NoteForm = {
  contentType: "note" | "work";
  slug: string;
  title: string;
  preview: string;
  tags: string;
  subtitleJson: string;
  content: OutputData | null;
  link: string;
  linkText: string;
};

const EMPTY_FORM: NoteForm = {
  contentType: "note",
  slug: "",
  title: "",
  preview: "",
  tags: "",
  subtitleJson: "",
  content: null,
  link: "",
  linkText: "",
};

const TOKEN_KEY = "admin_token";

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Shared primitives ─────────────────────────────────────────
const Field: FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-[11px] font-medium uppercase tracking-widest text-neutral-500 select-none">
      {label}
      {hint && <span className="ml-1.5 normal-case tracking-normal text-neutral-700">{hint}</span>}
    </span>
    {children}
  </label>
);

const inputBase = "w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-700 outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-700 transition-all";

export const AdminNotes: FC = () => {
  const [token, setToken] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [authError, setAuthError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [notes, setNotes] = useState<NoteApiData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NoteForm>(EMPTY_FORM);
  const [editorKey, setEditorKey] = useState(0);
  // Separate from form.content — only set when opening the form, never on onChange.
  // If initialData changes while the editor is mounted, EditorJS reinitializes → white box.
  const [initialEditorData, setInitialEditorData] = useState<OutputData | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Image upload ─────────────────────────────────────────────
  const [uploadedImages, setUploadedImages] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async () => {
    try {
      const res = await fetch("/api/uploads", { headers: { "x-admin-token": token } });
      if (res.ok) setUploadedImages((await res.json()).files ?? []);
    } catch { /* ignore */ }
  }, [token]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "x-admin-token": token },
        body: fd,
      });
      if (res.ok) { await loadImages(); }
      else setError("Upload failed");
    } catch { setError("Upload failed"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleDeleteImage = async (name: string) => {
    await fetch(`/api/uploads/${name}`, { method: "DELETE", headers: { "x-admin-token": token } });
    loadImages();
  };

  const copyUrl = (url: string) => {
    const full = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(full);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  useEffect(() => { if (authenticated) loadImages(); }, [authenticated, loadImages]);

  // Restore saved token and re-validate
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) return;
    fetch("/api/admin/validate", { headers: { "x-admin-token": saved } }).then((r) => {
      if (r.ok) { setToken(saved); setAuthenticated(true); }
      else localStorage.removeItem(TOKEN_KEY);
    });
  }, []);

  // ── Auth ──────────────────────────────────────────────────────
  const handleLogin = async () => {
    setAuthError("");
    const t = inputToken.trim();
    if (!t) return;
    const res = await fetch("/api/admin/validate", { headers: { "x-admin-token": t } });
    if (!res.ok) { setAuthError("Invalid or expired token"); return; }
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(""); setAuthenticated(false); setInputToken(""); setNotes([]);
  };

  const handleExpired = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthenticated(false); setToken("");
    setAuthError("Token expired — run `make token` to generate a new one");
  };

  // ── Data ─────────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNotes(await res.json());
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authenticated) loadNotes(); }, [authenticated, loadNotes]);

  const clearStatus = () => { setError(""); setSuccess(""); };
  const ah = () => ({ "x-admin-token": token });

  // Stable callbacks for BlockForgeEditor — new function refs on each render would
  // trigger useEditor's tool-loading useEffect, destroying and recreating EditorJS.
  const handleEditorChange = useCallback((data?: OutputData | null) => {
    setForm((f) => ({ ...f, content: data ?? null }));
  }, []);

  const cancelForm = useCallback(() => {
    setShowForm(false);
    setForm(EMPTY_FORM);
  }, []);

  const openCreate = () => {
    clearStatus();
    setEditingId(null);
    setForm(EMPTY_FORM);
    setInitialEditorData(null);
    setEditorKey((k) => k + 1);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const openEdit = (note: NoteApiData) => {
    clearStatus();
    setEditingId(note.id);
    const noteContent = note.content as OutputData | null;
    setForm({ contentType: (note.contentType as "note" | "work") ?? "note", slug: note.slug, title: note.title, preview: note.preview, tags: (note.tags ?? []).join(", "), subtitleJson: note.subtitle ? JSON.stringify(note.subtitle) : "", content: noteContent, link: note.link ?? "", linkText: note.linkText ?? "" });
    setInitialEditorData(noteContent);
    setEditorKey((k) => k + 1);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  // cancelForm is defined above as useCallback

  // ── Save ──────────────────────────────────────────────────────
  // contentOverride: pass explicitly when called from BlockForgeEditor's onSave
  // (state update is async so we can't rely on form.content being current yet)
  const handleSave = async (contentOverride?: OutputData | null) => {
    clearStatus(); setSaving(true);
    let subtitle: SubtitleItem[] | null = null;
    if (form.subtitleJson.trim()) {
      try { subtitle = JSON.parse(form.subtitleJson); }
      catch { setError("Invalid subtitle JSON"); setSaving(false); return; }
    }
    // Auto-upload any base64 images before saving (block-forge stores uploaded files as data URLs)
    const rawContent = contentOverride !== undefined ? contentOverride : form.content;
    const content = await replaceBase64WithUploads(rawContent, token);
    const payload = { contentType: form.contentType, slug: form.slug, title: form.title, preview: form.preview, tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [], subtitle, content: content ?? undefined, link: form.link || null, linkText: form.linkText || null };
    const isEdit = editingId !== null;
    try {
      const res = await fetch(isEdit ? `/api/notes/${editingId}` : "/api/notes", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...ah() },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { handleExpired(); return; }
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(Array.isArray(b.message) ? b.message.join(", ") : b.message ?? b.error ?? `HTTP ${res.status}`);
        return;
      }
      setSuccess(isEdit ? "Note updated" : "Note created");
      setShowForm(false); setForm(EMPTY_FORM); loadNotes();
    } finally { setSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async (note: NoteApiData) => {
    if (!confirm(`Delete "${note.title}"?`)) return;
    clearStatus();
    const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE", headers: { ...ah() } });
    if (res.status === 401) { handleExpired(); return; }
    if (res.status !== 204 && !res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.message ?? b.error ?? `HTTP ${res.status}`);
      return;
    }
    setSuccess("Note deleted");
    loadNotes();
  };

  // ── Render: login ─────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center -mt-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo mark */}
          <div className="space-y-1">
            <div className="text-xs font-mono text-neutral-600 mb-4">sskd / admin</div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Sign in</h1>
            <p className="text-sm text-neutral-500">
              Generate a time-limited token on the server:
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-neutral-600 text-[11px] font-mono uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 inline-block" />
              terminal
            </div>
            <pre className="text-sm font-mono text-emerald-400 select-all">
              make token
            </pre>
            <p className="text-xs text-neutral-600 pt-1">
              Default 24 h &nbsp;·&nbsp; Override:{" "}
              <code className="font-mono text-neutral-500">HOURS=48 make token</code>
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="password"
              placeholder="Paste token"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={inputBase}
              autoFocus
            />
            {authError && (
              <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/40 border border-red-900/50 rounded-lg px-3.5 py-2.5">
                <span className="mt-0.5">⚠</span>
                {authError}
              </div>
            )}
            <button
              onClick={handleLogin}
              disabled={!inputToken.trim()}
              className="w-full bg-white hover:bg-neutral-100 disabled:opacity-30 text-neutral-950 text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: panel ─────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-mono text-neutral-600 mb-1">sskd / admin</div>
          <h1 className="text-lg font-semibold tracking-tight text-neutral-100">Notes</h1>
        </div>
        <div className="flex items-center gap-3">
          {!showForm && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-medium px-3.5 py-2 rounded-lg transition-colors"
            >
              <span className="text-neutral-400">+</span> New note
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors px-2"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-start gap-2.5 text-red-400 text-xs bg-red-950/40 border border-red-900/50 rounded-lg px-4 py-3">
          <span className="mt-0.5 shrink-0">⚠</span>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 text-emerald-400 text-xs bg-emerald-950/40 border border-emerald-900/50 rounded-lg px-4 py-3">
          <span>✓</span>
          {success}
        </div>
      )}

      {/* ── Image library ── */}
      {!showForm && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-neutral-600 hover:text-neutral-400 flex items-center gap-2 py-1 select-none">
            <span className="transition-transform group-open:rotate-90 inline-block">›</span>
            Image library ({uploadedImages.length})
          </summary>
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
                id="img-upload"
              />
              <label
                htmlFor="img-upload"
                className="cursor-pointer text-xs bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 px-3.5 py-2 rounded-lg transition-colors"
              >
                {uploading ? "Uploading…" : "↑ Upload image"}
              </label>
              <span className="text-xs text-neutral-700">JPG, PNG, WebP, SVG · max 10 MB</span>
            </div>
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
                {uploadedImages.map((img) => (
                  <div key={img.name} className="group/img relative rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 aspect-square">
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                      <button
                        onClick={() => copyUrl(img.url)}
                        className="text-[10px] bg-white text-neutral-900 rounded px-2 py-0.5 font-medium w-full"
                      >
                        {copied === img.url ? "Copied!" : "Copy URL"}
                      </button>
                      <button
                        onClick={() => handleDeleteImage(img.name)}
                        className="text-[10px] text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      {/* ── Form ── */}
      {showForm && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
          {/* Form header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
            <h2 className="text-sm font-medium text-neutral-200">
              {editingId ? "Edit note" : "New note"}
            </h2>
            <button onClick={cancelForm} className="text-neutral-600 hover:text-neutral-300 text-lg leading-none transition-colors" aria-label="Close">
              ×
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Type selector */}
            <div className="flex gap-2">
              {(["note", "work"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, contentType: t }))}
                  className={`text-xs px-4 py-1.5 rounded-lg border transition-colors ${
                    form.contentType === t
                      ? "bg-neutral-200 text-neutral-900 border-neutral-200 font-medium"
                      : "border-neutral-700 text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Title + Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Title" hint="*">
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: editingId ? f.slug : slugify(e.target.value) }))}
                  placeholder="My awesome note"
                  className={inputBase}
                />
              </Field>
              <Field label="Slug" hint="*">
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="my-awesome-note"
                  className={`${inputBase} font-mono text-xs`}
                />
              </Field>
            </div>

            {/* Preview */}
            <Field label="Preview">
              <textarea
                value={form.preview}
                onChange={(e) => setForm((f) => ({ ...f, preview: e.target.value }))}
                rows={2}
                placeholder="Short description shown in the notes list"
                className={`${inputBase} resize-none`}
              />
            </Field>

            {/* Tags + Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tags">
                <input
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="react, typescript, tips"
                  className={inputBase}
                />
              </Field>
              <Field label="Subtitle JSON" hint="optional">
                <input
                  value={form.subtitleJson}
                  onChange={(e) => setForm((f) => ({ ...f, subtitleJson: e.target.value }))}
                  placeholder='[{"title":"x","highlight":true}]'
                  className={`${inputBase} font-mono text-xs`}
                />
              </Field>
            </div>

            {/* Work-only: link fields */}
            {form.contentType === "work" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Link URL">
                  <input
                    value={form.link}
                    onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                    placeholder="https://github.com/you/project"
                    className={inputBase}
                  />
                </Field>
                <Field label="Link text">
                  <input
                    value={form.linkText}
                    onChange={(e) => setForm((f) => ({ ...f, linkText: e.target.value }))}
                    placeholder="view project >"
                    className={inputBase}
                  />
                </Field>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 text-neutral-800">
              <div className="flex-1 border-t border-neutral-800" />
              <span className="text-[10px] uppercase tracking-widest text-neutral-700 font-mono">content</span>
              <div className="flex-1 border-t border-neutral-800" />
            </div>

            {/* Editor */}
            <div className="rounded-xl overflow-hidden border border-neutral-700/60 bg-white text-neutral-900">
              <BlockForgeEditor
                key={editorKey}
                id={`editor-${editorKey}`}
                enabledTools={EDITOR_TOOLS}
                initialData={initialEditorData ?? undefined}
                onChange={handleEditorChange}
                onSave={(data) => {
                  handleEditorChange(data);
                  handleSave(data ?? null);
                }}
                onCancel={cancelForm}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => handleSave()}
                disabled={saving || !form.title || !form.slug}
                className="bg-white hover:bg-neutral-100 disabled:opacity-30 text-neutral-950 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                {saving ? "Saving…" : editingId ? "Update note" : "Create note"}
              </button>
              <button
                onClick={cancelForm}
                className="text-neutral-500 hover:text-neutral-300 text-sm px-4 py-2.5 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── List ── */}
      {loading && (
        <div className="py-16 text-center">
          <div className="inline-block w-4 h-4 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
        </div>
      )}

      {!loading && !showForm && (
        <div>
          {notes.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <p className="text-neutral-600 text-sm">No notes yet</p>
              <button onClick={openCreate} className="text-xs text-neutral-500 hover:text-neutral-300 underline underline-offset-4 transition-colors">
                Create your first note →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800/60">
              {notes.map((note) => (
                <div key={note.id} className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium text-neutral-100 truncate">{note.title}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${note.contentType === "work" ? "bg-blue-900/40 text-blue-400" : "bg-neutral-800 text-neutral-500"}`}>
                          {note.contentType ?? "note"}
                        </span>
                        <span className="text-xs font-mono text-neutral-600 truncate">/{note.contentType === "work" ? "work" : "notes"}/{note.slug}</span>
                      </div>
                      {note.tags && note.tags.length > 0 && (
                        <>
                          <span className="text-neutral-800 text-xs">·</span>
                          <div className="flex gap-1.5 flex-wrap">
                            {note.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500 font-mono">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <span className="text-xs text-neutral-700 tabular-nums shrink-0 hidden sm:block">
                    {formatDate(note.createdAt)}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-4 shrink-0">
                    <button
                      onClick={() => openEdit(note)}
                      className="text-xs text-neutral-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(note)}
                      className="text-xs text-neutral-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-neutral-800/80 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
