import { sileo } from "sileo";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import type { NoteApiData, SubtitleItem } from "../types";
import { TOKEN_KEY, EMPTY_FORM, type View, type NoteForm, type OutputData, type TagItem } from "./constants";
import { slugify, formatDate, replaceBase64WithUploads } from "./utils";

export type { View, NoteForm, OutputData, TagItem };
export { slugify, formatDate };

export function useAdmin() {
  // ── Auth ────────────────────────────────────────────────────
  const [token, setToken] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [authError, setAuthError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  // ── Notes ───────────────────────────────────────────────────
  const [notes, setNotes] = useState<NoteApiData[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("all");

  // ── Editor form ─────────────────────────────────────────────
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NoteForm>(EMPTY_FORM);
  const [editorKey, setEditorKey] = useState(0);
  const [initialEditorData, setInitialEditorData] = useState<OutputData | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Images ──────────────────────────────────────────────────
  const [uploadedImages, setUploadedImages] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ah = () => ({ "x-admin-token": token });

  // ── Auth handlers ────────────────────────────────────────────
  const handleExpired = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthenticated(false);
    setToken("");
    sileo.error({ title: "Session expired — sign in again" });
  }, []);

  const handleLogin = async () => {
    setAuthError("");
    const t = inputToken.trim();
    if (!t) return;
    const res = await fetch("/api/admin/validate", { headers: { "x-admin-token": t } });
    if (!res.ok) { setAuthError("Invalid token"); return; }
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(""); setAuthenticated(false); setInputToken(""); setNotes([]);
  };

  // ── Auto-login from localStorage ────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) return;
    fetch("/api/admin/validate", { headers: { "x-admin-token": saved } }).then((r) => {
      if (r.ok) { setToken(saved); setAuthenticated(true); }
      else localStorage.removeItem(TOKEN_KEY);
    });
  }, []);

  // ── Notes API ───────────────────────────────────────────────
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

  // ── Images API ───────────────────────────────────────────────
  const loadImages = useCallback(async () => {
    try {
      const res = await fetch("/api/uploads", { headers: ah() });
      if (res.ok) setUploadedImages((await res.json()).files ?? []);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { if (authenticated) loadImages(); }, [authenticated, loadImages]);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: ah(),
        body: fd,
      });
      if (res.ok) { await loadImages(); sileo.success({ title: "Image uploaded" }); }
      else sileo.error({ title: "Upload failed" });
    } catch { sileo.error({ title: "Upload failed" }); }
    finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async (name: string) => {
    await fetch(`/api/uploads/${name}`, { method: "DELETE", headers: ah() });
    loadImages();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${url}`);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Editor form handlers ────────────────────────────────────
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
        sileo.error({
          title: Array.isArray(b.message)
            ? b.message.join(", ")
            : b.message ?? b.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      sileo.success({ title: isEdit ? `${form.contentType} updated` : `${form.contentType} created` });
      setShowForm(false);
      setForm(EMPTY_FORM);
      loadNotes();
    } finally { setSaving(false); }
  };

  const handleDelete = async (note: NoteApiData) => {
    if (!confirm(`Delete "${note.title}"?`)) return;
    const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE", headers: ah() });
    if (res.status === 401) { handleExpired(); return; }
    if (res.status !== 204 && !res.ok) {
      const b = await res.json().catch(() => ({}));
      sileo.error({ title: b.message ?? b.error ?? `HTTP ${res.status}` });
      return;
    }
    sileo.success({ title: "Entry deleted" });
    loadNotes();
  };

  // ── Derived ─────────────────────────────────────────────────
  const visibleNotes =
    view === "all" ? notes :
    view === "note" ? notes.filter((n) => n.contentType === "note") :
    view === "work" ? notes.filter((n) => n.contentType === "work") :
    [];

  const notesCount = notes.filter((n) => n.contentType === "note").length;
  const workCount = notes.filter((n) => n.contentType === "work").length;
  const slugFolder = form.contentType === "work" ? "work" : "notes";

  return {
    // auth
    token, inputToken, setInputToken, authError, authenticated,
    handleLogin, handleLogout,
    // notes
    notes, loading, view, setView,
    // form
    editingId, showForm, form, setForm,
    editorKey, initialEditorData, saving,
    handleEditorChange, cancelForm, openCreate, openEdit, handleSave, handleDelete,
    // images
    uploadedImages, uploading, copied, fileInputRef,
    handleUpload, handleDeleteImage, copyUrl,
    // derived
    visibleNotes, notesCount, workCount, slugFolder,
  };
}
