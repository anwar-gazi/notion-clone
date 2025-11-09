import "@/app/globals.css";
import type { ReactNode } from "react";
import Providers from "@/components/Providers";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>
          <div className="max-w-7xl mx-auto p-6">
            <header className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold">Kanban</h1>
              <nav className="space-x-4">
                <a href="/" className="hover:underline">Board</a>
                <a href="/reports" className="hover:underline">Reports</a>
              </nav>
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
