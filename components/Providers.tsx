"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider position="top-left">
      <div className="flex h-full min-h-0 flex-1 flex-col">{children}</div>
    </ToastProvider>
  );
}
