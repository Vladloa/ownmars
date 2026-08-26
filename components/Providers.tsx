"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider position="top-left">{children}</ToastProvider>;
}
