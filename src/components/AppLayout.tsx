import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { ZigChat } from './ZigChat';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <ZigChat />
    </div>
  );
}
