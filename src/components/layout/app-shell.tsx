import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { CreateSheetProvider } from "./create-sheet";
import { AssistantFab } from "./assistant-fab";
import type { ProfileRow } from "@/types/database";

export function AppShell({
  profile,
  unread,
  aiEnabled,
  children,
}: {
  profile: ProfileRow | null;
  unread: number;
  aiEnabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <CreateSheetProvider>
      <div className="flex min-h-dvh">
        {profile && <Sidebar username={profile.username} isAdmin={profile.role === "admin"} unread={unread} aiEnabled={aiEnabled} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header profile={profile} unread={unread} />
          <main id="main" className={profile ? "w-full flex-1 px-4 pb-28 pt-5 md:px-6 md:pb-12 md:pt-6 lg:px-8" : "mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 md:px-6"}>
            {children}
          </main>
        </div>
      </div>
      {profile && (
        <BottomNav
          username={profile.username}
          avatarUrl={profile.avatar_url}
          displayName={profile.display_name ?? profile.username}
        />
      )}
      {profile && aiEnabled && <AssistantFab />}
    </CreateSheetProvider>
  );
}
