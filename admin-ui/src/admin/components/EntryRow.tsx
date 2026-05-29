import { Trash2 } from "lucide-react";
import { type FC } from "react";
import type { NoteApiData } from "../../types";
import { formatDate } from "../utils";

interface EntryRowProps {
  note: NoteApiData;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const EntryRow: FC<EntryRowProps> = ({ note, onEdit, onDelete }) => (
  <div className="adm-entry-row" onClick={onEdit}>
    <div className="adm-entry-main">
      <p className="adm-entry-title">{note.title}</p>
      <p className="adm-entry-slug">
        /{note.contentType === "work" ? "work" : "notes"}/{note.slug}
      </p>
      {note.tags && note.tags.length > 0 && (
        <div className="adm-entry-tags">
          {note.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="adm-tag bg-tag-base text-tag-base-text border-tag-base-border">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>

    <div className="adm-entry-type">
      <span
        className={`adm-type-badge ${
          note.contentType === "work"
            ? "bg-badge-work text-badge-work-text"
            : "bg-badge-note text-badge-note-text"
        }`}
      >
        {note.contentType ?? "note"}
      </span>
    </div>

    <div className="adm-entry-when">
      <span className="adm-entry-date">{formatDate(note.createdAt)}</span>
      <button onClick={onDelete} className="adm-delete-btn" title="Delete">
        <Trash2 size={14} />
      </button>
    </div>
  </div>
);
