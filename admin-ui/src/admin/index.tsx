import { type FC, useState } from "react";
import type { NoteApiData } from "../types";
import { type View } from "./constants";
import { useAdmin } from "./useAdmin";
import { Sidebar } from "./components/Sidebar";
import { MobileBar } from "./components/MobileBar";
import { LoginPage } from "./pages/LoginPage";
import { ListPage } from "./pages/ListPage";
import { ImageLibrary } from "./pages/ImageLibrary";
import { EditorPage } from "./pages/EditorPage";

export const AdminNotes: FC = () => {
  const admin = useAdmin();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    inputToken, setInputToken, authError, authenticated,
    handleLogin, handleLogout,
    notes, loading, view, setView,
    editingId, showForm, form, setForm,
    editorKey, initialEditorData, saving,
    handleEditorChange, cancelForm, openCreate, openEdit, handleSave, handleDelete,
    uploadedImages, uploading, copied, fileInputRef,
    handleUpload, handleDeleteImage, copyUrl,
    visibleNotes, notesCount, workCount,
  } = admin;

  if (!authenticated) {
    return (
      <LoginPage
        inputToken={inputToken}
        authError={authError}
        onTokenChange={setInputToken}
        onLogin={handleLogin}
      />
    );
  }

  const handleNavigate = (v: View) => {
    setView(v);
    cancelForm();
    setDrawerOpen(false);
  };

  const mobileTitle = showForm
    ? (editingId ? `Edit ${form.contentType}` : "New entry")
    : view === "all" ? "All entries"
    : view === "note" ? "Notes"
    : view === "work" ? "Work"
    : "Images";

  return (
    <div className="adm-device-shell">
      <div className="adm-app" data-drawer={drawerOpen ? "true" : undefined}>

        <div className="adm-scrim" onClick={() => setDrawerOpen(false)} />

        <Sidebar
          view={view}
          showForm={showForm}
          notes={notes}
          uploadedImages={uploadedImages}
          notesCount={notesCount}
          workCount={workCount}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />

        <main className="adm-main">
          <MobileBar title={mobileTitle} onMenuClick={() => setDrawerOpen(true)} />

          <div className="adm-main-scroll">
            {showForm && (
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
            )}

            {!showForm && view !== "images" && (
              <ListPage
                view={view}
                visibleNotes={visibleNotes}
                loading={loading}
                onNew={openCreate}
                onEdit={(note: NoteApiData) => openEdit(note)}
                onDelete={handleDelete}
              />
            )}

            {!showForm && view === "images" && (
              <ImageLibrary
                uploadedImages={uploadedImages}
                uploading={uploading}
                copied={copied}
                fileInputRef={fileInputRef}
                onUpload={handleUpload}
                onDelete={handleDeleteImage}
                onCopy={copyUrl}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
