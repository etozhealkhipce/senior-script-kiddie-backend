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
      <div className="flex justify-center py-20">
        <div className="adm-spinner" />
      </div>
    ) : visibleNotes.length === 0 ? (
      <div className="text-center py-20">
        <p className="text-muted text-sm font-medium mb-1">No entries here yet</p>
        <p className="text-faint text-[13px] mb-5">Create your first entry to get started</p>
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
