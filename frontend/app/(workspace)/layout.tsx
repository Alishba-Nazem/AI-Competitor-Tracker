import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/toast";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
