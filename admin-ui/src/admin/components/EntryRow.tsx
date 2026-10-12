import type { FC } from "react";
import type { NoteApiData } from "../../types";
import { Badge, Button, type TagItem, Tags } from "../../ui";
import { formatDate } from "../utils";

type EntryRowProps = {
  note: NoteApiData;
  onEdit: () => void;
  onDelete: () => void;
};

const tagsOf = (note: NoteApiData): TagItem[] =>
  note.subtitle?.length
    ? note.subtitle
    : (note.tags ?? []).map((title) => ({ title, highlight: false }));

export const EntryRow: FC<EntryRowProps> = ({ note, onEdit, onDelete }) => {
  const folder = note.contentType === "work" ? "work" : "notes";
  return (
    <article className="entry">
      <button type="button" className="entry-open" onClick={onEdit}>
        <span className="entry-bullet" aria-hidden="true" />
        <span className="entry-title">{note.title}</span>
      </button>
      <Tags items={tagsOf(note)} />
      {note.preview && <p className="text-sm text-secondary">{note.preview}</p>}
      <p className="entry-path">
        /{folder}/{note.slug}
      </p>
      <div className="entry-footer">
        <span className="flex items-center gap-3">
          <Badge>{note.contentType || "note"}</Badge>
          <time className="text-xs text-neutral-500" dateTime={note.createdAt}>
            {formatDate(note.createdAt)}
          </time>
        </span>
        <Button variant="link-danger" onClick={onDelete}>
          delete
        </Button>
      </div>
    </article>
  );
};
