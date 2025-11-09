"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";

function initialsFrom(email?: string | null, name?: string | null) {
  const src = (name || email || "").trim();
  if (!src) return "U";
  const [a, b] = src.replace(/@.*/, "").split(/[.\s_-]+/);
  return (a?.[0] || "") + (b?.[0] || "");
}

function formatDuration(ms: number) {
  if (ms <= 0) return "just now";
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const hr = h % 24;
    return `${d}d ${hr}h`;
  }
  if (h > 0) return `${h}h ${r}m`;
  return `${m}m`;
}

export default function ProfileMenu() {
  const { data } = useSession();
  const email = data?.user?.email ?? "";
  const name = data?.user?.name ?? "";
  const loginAt = (data as any)?.loginAt as number | undefined;

  // live duration ticker
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const since = useMemo(() => {
    if (!loginAt) return "—";
    return formatDuration(now - loginAt);
  }, [now, loginAt]);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // click outside to close
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="User menu"
        className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-semibold shadow hover:bg-gray-300"
        title={email || "User"}
      >
        {initialsFrom(email, name)}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border bg-white shadow-xl p-3 z-50">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold">
              {initialsFrom(email, name)}
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{name || "User"}</div>
              <div className="text-xs text-gray-600 truncate">{email}</div>
            </div>
          </div>

          <div className="border-t my-2" />

          <div className="px-2 py-1 text-sm flex items-center justify-between">
            <span className="text-gray-600">Logged in for</span>
            <span className="font-medium">{since}</span>
          </div>

          <div className="mt-3">
            <button
              className="w-full px-3 py-2 text-sm rounded-xl bg-black text-white hover:opacity-90"
              onClick={() => signOut({ callbackUrl: "/api/auth/signin" })}
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
