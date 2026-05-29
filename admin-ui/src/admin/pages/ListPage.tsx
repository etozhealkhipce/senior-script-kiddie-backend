import { Plus } from "lucide-react";
import { type FC } from "react";
import type { NoteApiData } from "../../types";
import type { View } from "../constants";
import { EntryRow } from "../components/EntryRow";

interface ListPageProps {
  view: View;
  visibleNotes: NoteApiData[];
  loading: boolean;
  onNew: () => void;
  onEdit: (note: NoteApiData) => void;
  onDelete: (note: NoteApiData) => void;
}

const VIEW_TITLE: Record<string, string> = {
  all: "All entries",
  note: "Notes",
  work: "Work",
};

export const ListPage: FC<ListPageProps> = ({ view, visibleNotes, loading, onNew, onEdit, onDelete }) => (
  <div className="adm-main-inner">
    <div className="adm-page-head">
      <div>
        <h1 className="adm-page-title">{VIEW_TITLE[view]}</h1>
        <p className="adm-page-sub">
          {loading
            ? "Loading…"
            : `${visibleNotes.length} ${visibleNotes.length === 1 ? "entry" : "entries"}`}
        </p>
      </div>
      <button className="adm-btn adm-btn-primary" onClick={onNew}>
        <Plus size={15} /> New entry
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
        <button className="adm-btn adm-btn-ghost" onClick={onNew}>
          <Plus size={15} /> New entry
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
          <EntryRow
            key={note.id}
            note={note}
            onEdit={() => onEdit(note)}
            onDelete={(e) => { e.stopPropagation(); onDelete(note); }}
          />
        ))}
      </div>
    )}
  </div>
);
