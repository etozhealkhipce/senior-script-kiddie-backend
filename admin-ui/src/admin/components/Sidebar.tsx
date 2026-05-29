import { Briefcase, FileText, Image as ImageIcon, LayoutList, LogOut } from "lucide-react";
import { type FC } from "react";
import type { NoteApiData } from "../../types";
import type { View } from "../constants";

interface SidebarProps {
  view: View;
  showForm: boolean;
  notes: NoteApiData[];
  uploadedImages: { name: string; url: string }[];
  notesCount: number;
  workCount: number;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

const NavItem: FC<NavItemProps> = ({ icon, label, count, active, onClick }) => (
  <button className={`adm-nav-item ${active ? "active" : ""}`} onClick={onClick}>
    <span className="adm-nav-ico">{icon}</span>
    <span className="adm-nav-label">{label}</span>
    <span className="adm-nav-count">{count}</span>
  </button>
);

export const Sidebar: FC<SidebarProps> = ({
  view, showForm, notes, uploadedImages,
  notesCount, workCount,
  onNavigate, onLogout,
}) => {
  const isActive = (v: View) => !showForm && view === v;

  return (
    <aside className="adm-sidebar">
      <div className="adm-brand">
        <div className="adm-brand-mark w-7 h-7 text-sm">s</div>
        <span className="font-semibold text-[14.5px] tracking-[-0.01em]">sskd</span>
      </div>

      <nav className="adm-nav">
        <NavItem icon={<LayoutList size={16} />} label="All entries" count={notes.length} active={isActive("all")} onClick={() => onNavigate("all")} />
        <NavItem icon={<FileText size={16} />} label="Notes" count={notesCount} active={isActive("note")} onClick={() => onNavigate("note")} />
        <NavItem icon={<Briefcase size={16} />} label="Work" count={workCount} active={isActive("work")} onClick={() => onNavigate("work")} />

        <div className="h-px bg-line-soft my-2 mx-1" />

        <NavItem icon={<ImageIcon size={16} />} label="Images" count={uploadedImages.length} active={isActive("images")} onClick={() => onNavigate("images")} />
      </nav>

      <div className="flex-1" />

      <button className="adm-signout" onClick={onLogout}>
        <span className="adm-nav-ico grid place-items-center"><LogOut size={16} /></span>
        Sign out
      </button>
    </aside>
  );
};
