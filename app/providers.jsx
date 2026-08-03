"use client";

import { AudityProvider } from "@/context/audity-context";

export default function Providers({ children }) {
  return (
    <AudityProvider>
      {children}
    </AudityProvider>
  );
}