import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface ShellProps {
  role: "manager" | "recruiter";
  userName: string;
  pageTitle: string;
  pageSubtitle?: string;
  children: React.ReactNode;
}

export function Shell({ role, userName, pageTitle, pageSubtitle, children }: ShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={role} userName={userName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={pageTitle} subtitle={pageSubtitle} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
