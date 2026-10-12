import type { FC } from "react";
import type { NoteApiData } from "../types";
import { AppShell, type Section } from "./components/AppShell";
import type { View } from "./constants";
import { EditorPage } from "./pages/EditorPage";
import { ImageLibrary } from "./pages/ImageLibrary";
import { type EntryFilter, ListPage } from "./pages/ListPage";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SetupPage } from "./pages/SetupPage";
import { useAdmin } from "./useAdmin";

const sectionOf = (view: View): Section =>
  view === "images" ? "images" : view === "settings" ? "settings" : "entries";

export const AdminNotes: FC = () => {
  const {
    token,
    sessionKind,
    authenticated,
    applyAuth,
    handleExpired,
    handleLogout,
    handleLogoutEverywhere,
    notes,
    loading,
    view,
    setView,
    editingId,
    showForm,
    form,
    setForm,
    editorKey,
    initialEditorData,
    saving,
    handleEditorChange,
    cancelForm,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    uploadedImages,
    uploading,
    copied,
    fileInputRef,
    handleUpload,
    handleDeleteImage,
    copyUrl,
    visibleNotes,
    notesCount,
    workCount,
  } = useAdmin();

  if (sessionKind === "setup") {
    return <SetupPage token={token} onDone={applyAuth} onExpired={handleExpired} />;
  }

  if (!authenticated) {
    return <LoginPage onAuthenticated={applyAuth} />;
  }

  const section = sectionOf(view);

  const navigate = (next: Section) => {
    cancelForm();
    setView(next === "entries" ? "all" : next);
    window.scrollTo({ top: 0 });
  };

  const title = showForm ? (editingId ? `edit ${form.contentType}` : "new entry") : section;

  return (
    <AppShell
      section={section}
      title={title}
      entriesCount={notes.length}
      imagesCount={uploadedImages.length}
      hideTabBar={showForm}
      onNavigate={navigate}
      onLogout={handleLogout}
    >
      {showForm ? (
        <EditorPage
          form={form}
          editingId={editingId}
          editorKey={editorKey}
          initialEditorData={initialEditorData}
          saving={saving}
          onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          onEditorChange={handleEditorChange}
          onSave={handleSave}
          onCancel={cancelForm}
        />
      ) : section === "entries" ? (
        <ListPage
          filter={view as EntryFilter}
          onFilterChange={setView}
          notes={visibleNotes}
          counts={{ all: notes.length, note: notesCount, work: workCount }}
          loading={loading}
          onNew={openCreate}
          onEdit={(note: NoteApiData) => openEdit(note)}
          onDelete={handleDelete}
        />
      ) : section === "images" ? (
        <ImageLibrary
          uploadedImages={uploadedImages}
          uploading={uploading}
          copied={copied}
          fileInputRef={fileInputRef}
          onUpload={handleUpload}
          onDelete={handleDeleteImage}
          onCopy={copyUrl}
        />
      ) : (
        <SettingsPage
          token={token}
          onExpired={handleExpired}
          onLogoutEverywhere={handleLogoutEverywhere}
        />
      )}
    </AppShell>
  );
};
