import type { ReactNode } from "react";
import { Logo } from "../../ui";

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="auth-stage">
      <div className="app-noise" aria-hidden="true" />
      <div className="auth-panel">
        <div className="mb-6 flex items-center gap-4">
          <Logo animate className="w-16 shrink-0" />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-medium">{title}</h1>
            {subtitle && <p className="text-sm text-secondary">{subtitle}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}
