import Marker from "@editorjs/marker";
import { BlockForgeEditor } from "@block-forge/block-forge-editor";
import { sileo } from "sileo";
import {
  Briefcase,
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  LayoutList,
  LogOut,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import type { NoteApiData, SubtitleItem } from "./types";

// ── Stable module-level constants ─────────────────────────────────────────────
const EDITOR_TOOLS: string[] = [
  "paragraph", "list", "table", "divider", "quote", "code", "imageSingle", "imageGallery",
];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EDITOR_INLINE_TOOLS: Record<string, any> = { marker: { class: Marker } };

// ── Auto-upload base64 images ─────────────────────────────────────────────────
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
              img.url?.startsWith("data:") ? { ...img, url: await uploadBase64(img.url) } : img,
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

// ── Types ─────────────────────────────────────────────────────────────────────
type OutputData = {
  time?: number;
  blocks: { id?: string; type: string; data: Record<string, unknown> }[];
  version?: string;
};

type TagItem = { title: string; highlight: boolean };

type NoteForm = {
  contentType: "note" | "work";
  slug: string;
  title: string;
  preview: string;
  tagItems: TagItem[];
  content: OutputData | null;
  link: string;
  linkText: string;
};

const EMPTY_FORM: NoteForm = {
  contentType: "note",
  slug: "",
  title: "",
  preview: "",
  tagItems: [],
  content: null,
  link: "",
  linkText: "",
};

type View = "all" | "note" | "work" | "images";

const TOKEN_KEY = "admin_token";

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Tag chip editor ───────────────────────────────────────────────────────────
const TagEditor: FC<{ items: TagItem[]; onChange: (items: TagItem[]) => void }> = ({ items, onChange }) => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const titles = raw.split(",").map((t) => t.trim()).filter(Boolean);
    const fresh = titles.filter((t) => !items.some((i) => i.title === t));
    if (fresh.length) onChange([...items, ...fresh.map((t) => ({ title: t, highlight: false }))]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) { commit(input); setInput(""); }
    } else if (e.key === "Backspace" && !input && items.length) {
      onChange(items.slice(0, -1));
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {items.map((item, i) => (
        <span
          key={`${item.title}-${i}`}
          className="adm-tag"
          style={{
            background: item.highlight ? "var(--tag-amber-bg)" : "var(--tag-gray-bg)",
            color: item.highlight ? "var(--tag-amber-tx)" : "var(--tag-gray-tx)",
            borderColor: item.highlight ? "var(--tag-amber-bd)" : "var(--tag-gray-bd)",
          }}
        >
          <button
            type="button"
            title={item.highlight ? "Remove highlight" : "Highlight"}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: "inherit" }}
            onClick={() => onChange(items.map((t, j) => j === i ? { ...t, highlight: !t.highlight } : t))}
          >
            {item.title}
          </button>
          <button
            type="button"
            className="adm-tag-x"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label={`Remove ${item.title}`}
          >
            <X style={{ width: 9, height: 9 }} />
          </button>
        </span>
      ))}
      <span
        className="adm-tag-add"
        onClick={() => inputRef.current?.focus()}
      >
        <Plus style={{ width: 11, height: 11 }} />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => { if (input.trim()) { commit(input); setInput(""); } }}
          placeholder="add tag"
          className="adm-tag-input-inline"
        />
      </span>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const AdminNotes: FC = () => {
  const [token, setToken] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [authError, setAuthError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [notes, setNotes] = useState<NoteApiData[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("all");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NoteForm>(EMPTY_FORM);
  const [editorKey, setEditorKey] = useState(0);
  const [initialEditorData, setInitialEditorData] = useState<OutputData | null>(null);
  const [saving, setSaving] = useState(false);

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
      if (res.ok) { await loadImages(); sileo.success({ title: "Image uploaded" }); }
      else sileo.error({ title: "Upload failed" });
    } catch { sileo.error({ title: "Upload failed" }); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleDeleteImage = async (name: string) => {
    await fetch(`/api/uploads/${name}`, { method: "DELETE", headers: { "x-admin-token": token } });
    loadImages();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${url}`);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  useEffect(() => { if (authenticated) { loadImages(); } }, [authenticated, loadImages]);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) return;
    fetch("/api/admin/validate", { headers: { "x-admin-token": saved } }).then((r) => {
      if (r.ok) { setToken(saved); setAuthenticated(true); }
      else localStorage.removeItem(TOKEN_KEY);
    });
  }, []);

  const handleLogin = async () => {
    setAuthError("");
    const t = inputToken.trim();
    if (!t) return;
    const res = await fetch("/api/admin/validate", { headers: { "x-admin-token": t } });
    if (!res.ok) { setAuthError("Invalid token"); return; }
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t); setAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(""); setAuthenticated(false); setInputToken(""); setNotes([]);
  };

  const handleExpired = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthenticated(false); setToken("");
    sileo.error({ title: "Session expired — sign in again" });
  };

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNotes(await res.json());
    } catch (e) {
      sileo.error({ title: "Failed to load entries", description: String(e) });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authenticated) loadNotes(); }, [authenticated, loadNotes]);

  const ah = () => ({ "x-admin-token": token });

  const handleEditorChange = useCallback((data?: OutputData | null) => {
    setForm((f) => ({ ...f, content: data ?? null }));
  }, []);

  const cancelForm = useCallback(() => {
    setShowForm(false);
    setForm(EMPTY_FORM);
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setInitialEditorData(null);
    setEditorKey((k) => k + 1);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const openEdit = (note: NoteApiData) => {
    setEditingId(note.id);
    const noteContent = note.content as OutputData | null;
    const tagItems: TagItem[] = note.subtitle?.length
      ? note.subtitle
      : (note.tags ?? []).map((t) => ({ title: t, highlight: false }));
    setForm({
      contentType: (note.contentType as "note" | "work") ?? "note",
      slug: note.slug,
      title: note.title,
      preview: note.preview,
      tagItems,
      content: noteContent,
      link: note.link ?? "",
      linkText: note.linkText ?? "",
    });
    setInitialEditorData(noteContent);
    setEditorKey((k) => k + 1);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const handleSave = async (contentOverride?: OutputData | null) => {
    setSaving(true);
    const rawContent = contentOverride !== undefined ? contentOverride : form.content;
    const content = await replaceBase64WithUploads(rawContent, token);
    const tags = form.tagItems.map((i) => i.title);
    const subtitle: SubtitleItem[] | null = form.tagItems.length ? form.tagItems : null;
    const payload = {
      contentType: form.contentType,
      slug: form.slug,
      title: form.title,
      preview: form.preview,
      tags,
      subtitle,
      content: content ?? undefined,
      link: form.link || null,
      linkText: form.linkText || null,
    };
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
        sileo.error({ title: Array.isArray(b.message) ? b.message.join(", ") : b.message ?? b.error ?? `HTTP ${res.status}` });
        return;
      }
      sileo.success({ title: isEdit ? `${form.contentType} updated` : `${form.contentType} created` });
      setShowForm(false); setForm(EMPTY_FORM); loadNotes();
    } finally { setSaving(false); }
  };

  const handleDelete = async (note: NoteApiData) => {
    if (!confirm(`Delete "${note.title}"?`)) return;
    const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE", headers: { ...ah() } });
    if (res.status === 401) { handleExpired(); return; }
    if (res.status !== 204 && !res.ok) {
      const b = await res.json().catch(() => ({}));
      sileo.error({ title: b.message ?? b.error ?? `HTTP ${res.status}` });
      return;
    }
    sileo.success({ title: "Entry deleted" });
    loadNotes();
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="adm-login-stage">
        <div className="adm-login-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div
              className="adm-brand-mark"
              style={{ width: 38, height: 38, borderRadius: 9, fontSize: 17 }}
            >
              s
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em", color: "var(--text)" }}>
                <b>sskd</b>
                <span style={{ color: "var(--text-ghost)", margin: "0 5px", fontWeight: 400 }}>/</span>
                <b>admin</b>
              </p>
              <p style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>Sign in to continue</p>
            </div>
          </div>

          <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 7, display: "block" }}>
            Access token
          </label>
          <input
            type="password"
            placeholder="Paste your token…"
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoFocus
            className="adm-token-input"
          />
          {authError && (
            <p style={{ fontSize: 12, color: "oklch(0.55 0.18 25)", marginBottom: 8 }}>{authError}</p>
          )}
          <button
            onClick={handleLogin}
            disabled={!inputToken.trim()}
            className="adm-login-btn"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const visibleNotes =
    view === "all" ? notes :
    view === "note" ? notes.filter((n) => n.contentType === "note") :
    view === "work" ? notes.filter((n) => n.contentType === "work") :
    [];

  const notesCount = notes.filter((n) => n.contentType === "note").length;
  const workCount = notes.filter((n) => n.contentType === "work").length;

  const slugFolder = form.contentType === "work" ? "work" : "notes";

  // ── Full layout ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: "grid", gridTemplateColumns: "244px 1fr", height: "100vh", overflow: "hidden", color: "var(--text)" }}>

      {/* ── Sidebar ── */}
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <div className="adm-brand-mark" style={{ width: 28, height: 28, fontSize: 14 }}>s</div>
          <span style={{ fontWeight: 600, fontSize: 14.5, letterSpacing: "-0.01em" }}>sskd</span>
        </div>

        <nav className="adm-nav">
          <button
            className={`adm-nav-item ${!showForm && view === "all" ? "active" : ""}`}
            onClick={() => { setView("all"); cancelForm(); }}
          >
            <span className="adm-nav-ico"><LayoutList size={16} /></span>
            <span className="adm-nav-label">All entries</span>
            <span className="adm-nav-count">{notes.length}</span>
          </button>
          <button
            className={`adm-nav-item ${!showForm && view === "note" ? "active" : ""}`}
            onClick={() => { setView("note"); cancelForm(); }}
          >
            <span className="adm-nav-ico"><FileText size={16} /></span>
            <span className="adm-nav-label">Notes</span>
            <span className="adm-nav-count">{notesCount}</span>
          </button>
          <button
            className={`adm-nav-item ${!showForm && view === "work" ? "active" : ""}`}
            onClick={() => { setView("work"); cancelForm(); }}
          >
            <span className="adm-nav-ico"><Briefcase size={16} /></span>
            <span className="adm-nav-label">Work</span>
            <span className="adm-nav-count">{workCount}</span>
          </button>

          <div style={{ height: 1, background: "var(--border-soft)", margin: "8px 4px" }} />

          <button
            className={`adm-nav-item ${!showForm && view === "images" ? "active" : ""}`}
            onClick={() => { setView("images"); cancelForm(); }}
          >
            <span className="adm-nav-ico"><ImageIcon size={16} /></span>
            <span className="adm-nav-label">Images</span>
            <span className="adm-nav-count">{uploadedImages.length}</span>
          </button>
        </nav>

        <div style={{ flex: 1 }} />

        <button className="adm-signout" onClick={handleLogout}>
          <span className="adm-nav-ico" style={{ display: "grid", placeItems: "center" }}>
            <LogOut size={16} />
          </span>
          Sign out
        </button>
      </aside>

      {/* ── Main content ── */}
      <main style={{ overflowY: "auto", background: "var(--surface)" }}>

        {/* ── Form view ── */}
        {showForm && (
          <div style={{ padding: "40px 48px 80px" }}>
            <div className="adm-editor-wrap" style={{ color: "var(--text)" }}>

              <button className="adm-back-link" onClick={cancelForm}>
                <ChevronLeft size={15} />
                Back to entries
              </button>

              <input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                    slug: editingId ? f.slug : slugify(e.target.value),
                  }))
                }
                placeholder="Untitled"
                className="adm-doc-title"
              />

              {/* Meta block */}
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
                          onClick={() => setForm((f) => ({ ...f, contentType: t }))}
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
                    <span className="adm-meta-label-ico" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}>/</span>
                    Slug
                  </div>
                  <div className="adm-meta-field" style={{ flexWrap: "nowrap" }}>
                    <span className="adm-slug-prefix">/{slugFolder}/</span>
                    <input
                      value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                      placeholder="my-entry-slug"
                      className="adm-meta-input mono"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="adm-meta-row">
                  <div className="adm-meta-label">
                    <span className="adm-meta-label-ico" style={{ fontSize: 14 }}>≡</span>
                    Preview
                  </div>
                  <div className="adm-meta-field" style={{ alignItems: "flex-start" }}>
                    <textarea
                      value={form.preview}
                      onChange={(e) => setForm((f) => ({ ...f, preview: e.target.value }))}
                      placeholder="Short description…"
                      rows={2}
                      className="adm-meta-textarea"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="adm-meta-row" style={{ alignItems: "start" }}>
                  <div className="adm-meta-label">
                    <span className="adm-meta-label-ico" style={{ fontSize: 13, fontWeight: 600 }}>#</span>
                    Tags
                  </div>
                  <div className="adm-meta-field" style={{ paddingTop: 6 }}>
                    <TagEditor
                      items={form.tagItems}
                      onChange={(tagItems) => setForm((f) => ({ ...f, tagItems }))}
                    />
                  </div>
                </div>

                {/* Work-only fields */}
                {form.contentType === "work" && (
                  <>
                    <div className="adm-meta-row">
                      <div className="adm-meta-label">
                        <span className="adm-meta-label-ico" style={{ fontSize: 13 }}>↗</span>
                        Link URL
                      </div>
                      <div className="adm-meta-field">
                        <input
                          value={form.link}
                          onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                          placeholder="https://…"
                          className="adm-meta-input"
                        />
                      </div>
                    </div>
                    <div className="adm-meta-row">
                      <div className="adm-meta-label">
                        <span className="adm-meta-label-ico" style={{ fontSize: 13, fontWeight: 600 }}>T</span>
                        Link text
                      </div>
                      <div className="adm-meta-field">
                        <input
                          value={form.linkText}
                          onChange={(e) => setForm((f) => ({ ...f, linkText: e.target.value }))}
                          placeholder="view project >"
                          className="adm-meta-input"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Content divider */}
              <div className="adm-content-divider"><span>Content</span></div>

              {/* Editor wrapper */}
              <div
                style={{
                  borderRadius: "var(--r-lg)",
                  overflow: "hidden",
                  marginBottom: 24,
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <BlockForgeEditor
                  key={editorKey}
                  id={`editor-${editorKey}`}
                  enabledTools={EDITOR_TOOLS}
                  tools={EDITOR_INLINE_TOOLS}
                  initialData={initialEditorData ?? undefined}
                  onChange={handleEditorChange}
                  onSave={(data) => { handleEditorChange(data); handleSave(data ?? null); }}
                  onCancel={cancelForm}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={() => handleSave()}
                  disabled={saving || !form.title || !form.slug}
                  className="adm-btn-save"
                >
                  {saving ? "Saving…" : editingId ? `Update ${form.contentType}` : `Publish ${form.contentType}`}
                </button>
                <button onClick={cancelForm} className="adm-btn-discard">
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── List / Images view ── */}
        {!showForm && (
          <>
            {/* ── Entries list ── */}
            {view !== "images" && (
              <div style={{ padding: "40px 48px 80px" }}>
                <div className="adm-page-head">
                  <div>
                    <h1 className="adm-page-title">
                      {view === "all" ? "All entries" :
                       view === "note" ? "Notes" : "Work"}
                    </h1>
                    <p className="adm-page-sub">
                      {loading ? "Loading…" : `${visibleNotes.length} ${visibleNotes.length === 1 ? "entry" : "entries"}`}
                    </p>
                  </div>
                  <button className="adm-btn adm-btn-primary" onClick={openCreate}>
                    <Plus size={15} />
                    New entry
                  </button>
                </div>

                {loading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
                    <div className="adm-spinner" />
                  </div>
                ) : visibleNotes.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                      No entries here yet
                    </p>
                    <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 20 }}>
                      Create your first entry to get started
                    </p>
                    <button className="adm-btn adm-btn-ghost" onClick={openCreate}>
                      <Plus size={15} />
                      New entry
                    </button>
                  </div>
                ) : (
                  <div className="adm-entries">
                    <div className="adm-entries-head">
                      <span>Title</span>
                      <span>Type</span>
                      <span>Date</span>
                    </div>

                    {visibleNotes.map((note) => (
                      <div
                        key={note.id}
                        className="adm-entry-row"
                        onClick={() => openEdit(note)}
                      >
                        {/* Title cell */}
                        <div>
                          <p className="adm-entry-title">{note.title}</p>
                          <p className="adm-entry-slug">
                            /{note.contentType === "work" ? "work" : "notes"}/{note.slug}
                          </p>
                          {note.tags && note.tags.length > 0 && (
                            <div className="adm-entry-tags">
                              {note.tags.slice(0, 4).map((tag) => (
                                <span
                                  key={tag}
                                  className="adm-tag"
                                  style={{
                                    background: "var(--tag-gray-bg)",
                                    color: "var(--tag-gray-tx)",
                                    borderColor: "var(--tag-gray-bd)",
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Type badge */}
                        <div>
                          <span
                            className="adm-type-badge"
                            style={
                              note.contentType === "work"
                                ? { background: "var(--badge-work-bg)", color: "var(--badge-work-tx)" }
                                : { background: "var(--badge-note-bg)", color: "var(--badge-note-tx)" }
                            }
                          >
                            {note.contentType ?? "note"}
                          </span>
                        </div>

                        {/* Date + delete */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span className="adm-entry-date">{formatDate(note.createdAt)}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(note); }}
                            className="adm-delete-btn"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Image library ── */}
            {view === "images" && (
              <div style={{ padding: "40px 48px 80px" }}>
                <div className="adm-page-head">
                  <h1 className="adm-page-title">Image library</h1>
                </div>

                <div className="adm-lib-toolbar">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
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
                      <div key={img.name} className="adm-lib-card">
                        <img src={img.url} alt={img.name} />
                        <div className="adm-lib-overlay">
                          <button
                            onClick={() => copyUrl(img.url)}
                            className="adm-lib-action"
                          >
                            {copied === img.url ? "Copied ✓" : "Copy URL"}
                          </button>
                          <button
                            onClick={() => handleDeleteImage(img.name)}
                            className="adm-lib-action danger"
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
          </>
        )}
      </main>
    </div>
  );
};
