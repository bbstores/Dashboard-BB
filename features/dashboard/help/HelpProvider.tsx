"use client";

import { useState, type ReactNode } from "react";
import { HelpDialog } from "../components/HelpDialog";
import type { DashboardHelp } from "../model/types";
import { HelpContext } from "./HelpContext";

export function HelpProvider({ children }: { children: ReactNode }) {
  const [activeHelp, setActiveHelp] = useState<DashboardHelp | null>(null);

  return (
    <HelpContext.Provider value={setActiveHelp}>
      {children}
      {activeHelp && (
        <HelpDialog help={activeHelp} onClose={() => setActiveHelp(null)} />
      )}
    </HelpContext.Provider>
  );
}
