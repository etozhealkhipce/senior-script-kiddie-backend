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
    {/* Title + slug + tags */}
    <div className="adm-entry-main">
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
    <div className="adm-entry-type">
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
    <div className="adm-entry-when">
      <span className="adm-entry-date">{formatDate(note.createdAt)}</span>
      <button
        onClick={onDelete}
        className="adm-delete-btn"
        title="Delete"
      >
        <Trash2 size={14} />
      </button>
    </div>
  </div>
);
