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
    <div
      className="flex flex-wrap gap-1.5 min-h-[30px] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {items.map((item, i) => (
        <span
          key={`${item.title}-${i}`}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-sm select-none"
          style={{
            background: item.highlight ? "var(--n-amber-bg)" : "var(--n-gray-bg)",
            color: "var(--n-text)",
          }}
        >
          <button
            type="button"
            title={item.highlight ? "Remove highlight" : "Highlight"}
            onClick={() => onChange(items.map((t, j) => j === i ? { ...t, highlight: !t.highlight } : t))}
          >
            {item.title}
          </button>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label={`Remove ${item.title}`}
            className="opacity-40 hover:opacity-80 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (input.trim()) { commit(input); setInput(""); } }}
        placeholder={items.length === 0 ? "Add a tag…" : ""}
        className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none"
        style={{ color: "var(--n-text)", caretColor: "var(--n-text)" }}
      />
    </div>
  );
};

// ── Notion-style property row ─────────────────────────────────────────────────
const Prop: FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({
  icon, label, children,
}) => (
  <div className="flex items-start min-h-[34px] rounded-md transition-colors" style={{ color: "var(--n-text)" }}>
    <div
      className="flex items-center gap-2 w-36 shrink-0 pt-[7px] text-sm"
      style={{ color: "var(--n-text-s)" }}
    >
      <span className="opacity-70">{icon}</span>
      <span>{label}</span>
    </div>
    <div className="flex-1 pt-[5px]">{children}</div>
  </div>
);

// ── Inline input (Notion property value style) ────────────────────────────────
const propInputCls =
  "w-full bg-transparent text-sm outline-none px-1.5 py-0.5 rounded transition-colors hover:bg-[var(--n-hover)] focus:bg-[var(--n-hover)]";

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
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--n-sidebar)" }}
      >
        <div
          className="w-full max-w-[360px] rounded-xl border p-8 shadow-sm bg-white"
          style={{ borderColor: "var(--n-border)" }}
        >
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#37352f] text-sm font-bold text-white select-none">
              S
            </div>
            <div>
              <p className="text-base font-semibold" style={{ color: "var(--n-text)" }}>sskd / admin</p>
              <p className="text-xs" style={{ color: "var(--n-text-m)" }}>Sign in to continue</p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="password"
              placeholder="Paste your token…"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoFocus
              className="w-full rounded-md border px-3.5 py-2.5 text-sm outline-none transition"
              style={{
                borderColor: "var(--n-border-m)",
                color: "var(--n-text)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#37352f")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--n-border-m)")}
            />
            {authError && (
              <p className="text-xs text-red-500">{authError}</p>
            )}
            <button
              onClick={handleLogin}
              disabled={!inputToken.trim()}
              className="w-full rounded-md py-2.5 text-sm font-medium transition"
              style={{ background: "#37352f", color: "#fff" }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#000"; }}
              onMouseLeave={(e) => (e.currentTarget.style.background = e.currentTarget.disabled ? "rgba(55,53,47,0.12)" : "#37352f")}
              onMouseDown={(e) => e.currentTarget.disabled && e.preventDefault()}
              {...(!inputToken.trim() && { style: { background: "rgba(55,53,47,0.12)", color: "rgba(55,53,47,0.4)", cursor: "not-allowed" } })}
            >
              Continue →
            </button>
          </div>
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

  // ── Sidebar nav item ──────────────────────────────────────────────────────
  const NavItem: FC<{
    icon: React.ReactNode;
    label: string;
    count?: number;
    active: boolean;
    onClick: () => void;
  }> = ({ icon, label, count, active, onClick }) => (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors text-left"
      style={{
        background: active ? "var(--n-active)" : "transparent",
        color: active ? "var(--n-text)" : "var(--n-text-s)",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--n-hover)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span className="opacity-60 shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className="text-xs shrink-0" style={{ color: "var(--n-text-m)" }}>{count}</span>
      )}
    </button>
  );

  // ── Full layout ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden select-none" style={{ color: "var(--n-text)" }}>

      {/* ── Sidebar ── */}
      <aside
        className="flex w-60 shrink-0 flex-col border-r"
        style={{ background: "var(--n-sidebar)", borderColor: "var(--n-border)" }}
      >
        {/* Workspace header */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#37352f] text-[10px] font-bold" style={{ color: "#fff" }}>
              S
            </div>
            <span className="truncate text-sm font-semibold" style={{ color: "var(--n-text)" }}>
              sskd
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
          <NavItem
            icon={<LayoutList className="w-4 h-4" />}
            label="All entries"
            count={notes.length}
            active={!showForm && view === "all"}
            onClick={() => { setView("all"); cancelForm(); }}
          />
          <NavItem
            icon={<FileText className="w-4 h-4" />}
            label="Notes"
            count={notesCount}
            active={!showForm && view === "note"}
            onClick={() => { setView("note"); cancelForm(); }}
          />
          <NavItem
            icon={<Briefcase className="w-4 h-4" />}
            label="Work"
            count={workCount}
            active={!showForm && view === "work"}
            onClick={() => { setView("work"); cancelForm(); }}
          />

          <div className="my-2 border-t" style={{ borderColor: "var(--n-border)" }} />

          <NavItem
            icon={<ImageIcon className="w-4 h-4" />}
            label="Images"
            count={uploadedImages.length}
            active={!showForm && view === "images"}
            onClick={() => { setView("images"); cancelForm(); }}
          />
        </nav>

        {/* Sign out */}
        <div className="border-t px-3 py-4" style={{ borderColor: "var(--n-border)" }}>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
            style={{ color: "var(--n-text-s)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--n-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut className="w-4 h-4 opacity-60" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex flex-1 min-w-0 flex-col overflow-y-auto bg-white">

        {/* ── Form view ── */}
        {showForm && (
          <div className="mx-auto w-full max-w-3xl px-16 py-10 select-text">

            {/* Back */}
            <button
              onClick={cancelForm}
              className="mb-6 flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: "var(--n-text-s)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--n-text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--n-text-s)")}
            >
              <ChevronLeft className="w-4 h-4" />
              Back to entries
            </button>

            {/* Page title area */}
            <div className="mb-8">
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
                className="w-full bg-transparent text-[36px] font-bold leading-tight outline-none"
                style={{ color: "var(--n-text)", caretColor: "var(--n-text)" }}
              />
            </div>

            {/* Properties */}
            <div
              className="rounded-lg border p-1 mb-8 space-y-0.5"
              style={{ borderColor: "var(--n-border)" }}
            >
              {/* Type */}
              <Prop icon={<FileText className="w-3.5 h-3.5" />} label="Type">
                <div className="flex gap-1 pt-1">
                  {(["note", "work"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, contentType: t }))}
                      className="rounded px-2.5 py-0.5 text-sm transition-colors"
                      style={{
                        background: form.contentType === t
                          ? (t === "work" ? "var(--n-blue-bg)" : "var(--n-gray-bg)")
                          : "transparent",
                        color: form.contentType === t
                          ? (t === "work" ? "var(--n-blue-text)" : "var(--n-text)")
                          : "var(--n-text-m)",
                        fontWeight: form.contentType === t ? 500 : 400,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Prop>

              {/* Slug */}
              <Prop icon={<span className="font-mono text-xs">/</span>} label="Slug">
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="my-entry-slug"
                  className={`${propInputCls} font-mono text-xs`}
                  style={{ color: "var(--n-text)" }}
                />
              </Prop>

              {/* Preview */}
              <Prop icon={<span className="text-xs">≡</span>} label="Preview">
                <textarea
                  value={form.preview}
                  onChange={(e) => setForm((f) => ({ ...f, preview: e.target.value }))}
                  placeholder="Short description…"
                  rows={2}
                  className={`${propInputCls} resize-none leading-relaxed`}
                  style={{ color: "var(--n-text)" }}
                />
              </Prop>

              {/* Tags */}
              <Prop icon={<span className="text-xs">#</span>} label="Tags">
                <div className="px-1.5 py-0.5">
                  <TagEditor
                    items={form.tagItems}
                    onChange={(tagItems) => setForm((f) => ({ ...f, tagItems }))}
                  />
                </div>
              </Prop>

              {/* Work-only fields */}
              {form.contentType === "work" && (
                <>
                  <Prop icon={<span className="text-xs">↗</span>} label="Link URL">
                    <input
                      value={form.link}
                      onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                      placeholder="https://…"
                      className={propInputCls}
                      style={{ color: "var(--n-text)" }}
                    />
                  </Prop>
                  <Prop icon={<span className="text-xs">T</span>} label="Link text">
                    <input
                      value={form.linkText}
                      onChange={(e) => setForm((f) => ({ ...f, linkText: e.target.value }))}
                      placeholder="view project >"
                      className={propInputCls}
                      style={{ color: "var(--n-text)" }}
                    />
                  </Prop>
                </>
              )}
            </div>

            {/* Content divider */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1 border-t" style={{ borderColor: "var(--n-border)" }} />
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--n-text-m)" }}>
                Content
              </span>
              <div className="flex-1 border-t" style={{ borderColor: "var(--n-border)" }} />
            </div>

            {/* Editor */}
            <div className="rounded-lg border overflow-hidden mb-8" style={{ borderColor: "var(--n-border)" }}>
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
            <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--n-border)" }}>
              <button
                onClick={() => handleSave()}
                disabled={saving || !form.title || !form.slug}
                className="rounded-md px-4 py-2 text-sm font-medium transition"
                style={
                  saving || !form.title || !form.slug
                    ? { background: "rgba(55,53,47,0.12)", color: "rgba(55,53,47,0.4)", cursor: "not-allowed" }
                    : { background: "#37352f", color: "#fff" }
                }
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#000"; }}
                onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#37352f"; }}
              >
                {saving ? "Saving…" : editingId ? `Update ${form.contentType}` : `Publish ${form.contentType}`}
              </button>
              <button
                onClick={cancelForm}
                className="rounded-md px-4 py-2 text-sm transition-colors"
                style={{ color: "var(--n-text-s)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--n-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* ── List / Images view ── */}
        {!showForm && (
          <>
            {/* Page header */}
            <div className="flex items-center justify-between border-b px-8 py-5" style={{ borderColor: "var(--n-border)" }}>
              <div>
                <h1 className="text-xl font-bold" style={{ color: "var(--n-text)" }}>
                  {view === "all" ? "All entries" :
                   view === "note" ? "Notes" :
                   view === "work" ? "Work" :
                   "Image library"}
                </h1>
                {view !== "images" && (
                  <p className="mt-0.5 text-sm" style={{ color: "var(--n-text-m)" }}>
                    {loading ? "Loading…" : `${visibleNotes.length} ${visibleNotes.length === 1 ? "entry" : "entries"}`}
                  </p>
                )}
              </div>
              {view !== "images" && (
                <button
                  onClick={openCreate}
                  className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    borderColor: "var(--n-border-m)",
                    color: "var(--n-text)",
                    background: "white",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--n-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                >
                  <Plus className="w-4 h-4" style={{ color: "var(--n-text-s)" }} />
                  New entry
                </button>
              )}
            </div>

            {/* ── Entries list ── */}
            {view !== "images" && (
              <>
                {loading ? (
                  <div className="flex items-center justify-center py-24">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[rgba(55,53,47,0.15)] border-t-[rgba(55,53,47,0.5)]" />
                  </div>
                ) : visibleNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center px-8">
                    <p className="text-base font-medium mb-1" style={{ color: "var(--n-text-s)" }}>No entries here yet</p>
                    <p className="text-sm mb-6" style={{ color: "var(--n-text-m)" }}>
                      Create your first entry to get started
                    </p>
                    <button
                      onClick={openCreate}
                      className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
                      style={{ borderColor: "var(--n-border-m)", color: "var(--n-text)", background: "white" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--n-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                    >
                      <Plus className="w-4 h-4" style={{ color: "var(--n-text-s)" }} />
                      New entry
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Column headers */}
                    <div
                      className="grid grid-cols-[1fr_88px_116px_40px] gap-6 px-8 py-2.5 border-b text-xs font-semibold uppercase tracking-wide"
                      style={{ borderColor: "var(--n-border)", color: "var(--n-text-m)" }}
                    >
                      <span>Title</span>
                      <span>Type</span>
                      <span>Date</span>
                      <span />
                    </div>

                    {visibleNotes.map((note) => (
                      <div
                        key={note.id}
                        className="group grid grid-cols-[1fr_88px_116px_40px] gap-6 items-center px-8 py-4 border-b transition-colors cursor-pointer"
                        style={{ borderColor: "var(--n-border)" }}
                        onClick={() => openEdit(note)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--n-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {/* Title cell */}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--n-text)" }}>
                            {note.title}
                          </p>
                          <p className="mt-0.5 truncate font-mono text-xs" style={{ color: "var(--n-text-m)" }}>
                            /{note.contentType === "work" ? "work" : "notes"}/{note.slug}
                          </p>
                          {note.tags && note.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {note.tags.slice(0, 4).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded px-1.5 py-0.5 text-xs"
                                  style={{ background: "var(--n-gray-bg)", color: "var(--n-text-s)" }}
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
                            className="rounded px-2 py-1 text-xs font-medium"
                            style={
                              note.contentType === "work"
                                ? { background: "var(--n-blue-bg)", color: "var(--n-blue-text)" }
                                : { background: "var(--n-gray-bg)", color: "var(--n-text-s)" }
                            }
                          >
                            {note.contentType ?? "note"}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="text-sm" style={{ color: "var(--n-text-m)" }}>
                          {formatDate(note.createdAt)}
                        </div>

                        {/* Delete — appears on row hover */}
                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(note); }}
                            className="rounded p-1.5 transition-colors"
                            title="Delete"
                            style={{ color: "var(--n-text-m)" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(235,87,87,0.08)";
                              e.currentTarget.style.color = "#eb5757";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "var(--n-text-m)";
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Image library ── */}
            {view === "images" && (
              <div className="px-8 py-6 space-y-5">
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
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-medium transition-colors"
                    style={{
                      borderColor: "var(--n-border-m)",
                      color: "var(--n-text-s)",
                      background: "white",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--n-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                  >
                    <Plus className="w-4 h-4" />
                    {uploading ? "Uploading…" : "Upload image"}
                  </label>
                  <span className="text-xs" style={{ color: "var(--n-text-m)" }}>
                    JPG, PNG, WebP, SVG · max 10 MB
                  </span>
                </div>

                {uploadedImages.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--n-text-m)" }}>No images uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {uploadedImages.map((img) => (
                      <div
                        key={img.name}
                        className="group/img relative aspect-square overflow-hidden rounded-lg border"
                        style={{ borderColor: "var(--n-border)" }}
                      >
                        <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 p-1.5 opacity-0 transition-opacity group-hover/img:opacity-100">
                          <button
                            onClick={() => copyUrl(img.url)}
                            className="w-full rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-900 transition-colors hover:bg-gray-100"
                          >
                            {copied === img.url ? "Copied!" : "Copy URL"}
                          </button>
                          <button
                            onClick={() => handleDeleteImage(img.name)}
                            className="text-[10px] text-red-300 hover:text-red-200 transition-colors"
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
