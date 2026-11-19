import Sidebar from "@/components/sidebar";
import InfoBar from "@/components/infobar";
import { LayoutContent } from "@/components/composed/layout-content";
import { isAuthEnabled } from "@/lib/auth/config";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar authEnabled={isAuthEnabled()} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <InfoBar />
        <main className="flex-1 overflow-y-auto">
          <LayoutContent>{children}</LayoutContent>
        </main>
      </div>
    </div>
  );
}
