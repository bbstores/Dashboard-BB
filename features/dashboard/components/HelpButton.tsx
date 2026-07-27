"use client";

import type { DashboardHelp } from "../model/types";
import { useOpenHelp } from "../help/HelpContext";

export function HelpButton({ help }: { help: DashboardHelp }) {
  const openHelp = useOpenHelp();
  return (
    <span
      className="helpButton"
      role="button"
      tabIndex={0}
      aria-label={`Giải thích ${help.title}`}
      title="Xem cách tính"
      onClick={(event) => {
        event.stopPropagation();
        openHelp(help);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          openHelp(help);
        }
      }}
    >
      ?
    </span>
  );
}
