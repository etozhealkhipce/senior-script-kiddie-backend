import type { FC } from "react";
import type { NoteApiData } from "../../types";
import { Button, Divider, PageHeader, Tabs, useConfirm } from "../../ui";
import { EntryRow } from "../components/EntryRow";

export type EntryFilter = "all" | "note" | "work";

type ListPageProps = {
  filter: EntryFilter;
  onFilterChange: (filter: EntryFilter) => void;
  notes: NoteApiData[];
  counts: Record<EntryFilter, number>;
  loading: boolean;
  onNew: () => void;
  onEdit: (note: NoteApiData) => void;
  onDelete: (note: NoteApiData) => void;
};

export const ListPage: FC<ListPageProps> = ({
  filter,
  onFilterChange,
  notes,
  counts,
  loading,
  onNew,
  onEdit,
  onDelete,
}) => {
  const confirm = useConfirm();

  const remove = async (note: NoteApiData) => {
    const ok = await confirm({
      title: `delete “${note.title}”?`,
      body: "this can't be undone.",
      confirmLabel: "delete",
      danger: true,
    });
    if (ok) onDelete(note);
  };

  const count = counts[filter];

  return (
    <section className="page">
      <PageHeader
        title="entries"
        subtitle={loading ? "loading…" : `${count} ${count === 1 ? "entry" : "entries"}`}
        actions={
          <Button variant="primary" onClick={onNew}>
            + new
          </Button>
        }
      />
      <Tabs
        label="filter entries"
        value={filter}
        onChange={onFilterChange}
        items={[
          { value: "all", label: "all", count: counts.all },
          { value: "note", label: "notes", count: counts.note },
          { value: "work", label: "work", count: counts.work },
        ]}
      />

      {loading ? (
        <p className="text-sm text-secondary">loading…</p>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-10">
          <p className="text-sm text-secondary">nothing here yet</p>
          <Button onClick={onNew}>+ new entry</Button>
        </div>
      ) : (
        <ul className="flex flex-col">
          {notes.map((note, i) => (
            <li key={note.id}>
              {i > 0 && <Divider className="my-8" />}
              <EntryRow note={note} onEdit={() => onEdit(note)} onDelete={() => remove(note)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
