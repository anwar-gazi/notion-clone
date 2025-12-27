import "@/app/globals.css";
import type { ReactNode } from "react";
import Providers from "@/components/Providers";
import ProfileMenu from "@/components/ProfileMenu"; // ← add

export const metadata = {
  title: 'Notion-Clone: Notion-Like Kanban Board',
  description: 'Production-ready, Notion-style Kanban built with Next.js (App Router, TypeScript), PostgreSQL (Prisma), and NextAuth. It supports drag & drop, subtasks, time tracking, Excel/CSV import & export, reporting, multi-user, and a right-side details pane—all wired for local dev or Docker (with Nginx and mounted logs).',
  icons: {
    icon: '/icon.png',
    shortcut: '/shortcut.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>
          <div className="max-w-7xl mx-auto p-6">
            <header className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                <h1 className="text-2xl font-semibold">Kanban</h1>
                <nav className="space-x-4">
                  <a href="/" className="hover:underline">Board</a>
                  <a href="/reports" className="hover:underline">Reports</a>
                </nav>
              </div>
              <ProfileMenu /> {/* ← avatar at top-right */}
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
