"use client";
import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import TaskPaneProvider from "@/components/TaskPaneProvider";
import TaskPane from "@/components/TaskPane";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TaskPaneProvider>
        {children}
        <TaskPane /> {/* renders globally when opened */}
      </TaskPaneProvider>
    </SessionProvider>
  );
}
