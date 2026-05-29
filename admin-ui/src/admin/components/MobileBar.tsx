import { Menu } from "lucide-react";
import { type FC } from "react";

interface MobileBarProps {
  title: string;
  onMenuClick: () => void;
}

export const MobileBar: FC<MobileBarProps> = ({ title, onMenuClick }) => (
  <div className="adm-mobile-bar">
    <button className="adm-mb-menu" onClick={onMenuClick} aria-label="Open menu">
      <Menu size={20} />
    </button>
    <div className="adm-mb-brand">
      <div className="adm-brand-mark w-6 h-6 text-xs">s</div>
      <span className="adm-mb-title">{title}</span>
    </div>
    <div className="w-[38px]" />
  </div>
);
