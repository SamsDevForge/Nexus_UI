import type { ReactNode } from "react";
import "./WorkspaceChrome.css";

export function WorkspaceHeader({ eyebrow, title, description, mode, action }: {
  eyebrow: string; title: string; description: string; mode: string; action?: ReactNode;
}) {
  return <header className="workspace-header">
    <div className="workspace-heading-meta"><p>{eyebrow}</p><span className="workspace-mode"><i aria-hidden="true" />{mode}</span></div>
    <div className="workspace-heading-row"><div><h1>{title}</h1><p className="workspace-description">{description}</p></div>{action && <div className="workspace-heading-action">{action}</div>}</div>
  </header>;
}

export function WorkspaceNotice({ children }: { children: ReactNode }) {
  return <div className="workspace-notice"><span aria-hidden="true">i</span><p>{children}</p></div>;
}
