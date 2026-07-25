"use client";

import { useContext } from "react";
import type { DashboardHelp } from "../types";
import { HelpContext } from "../../dashboard";

export function HelpButton({ help }: { help: DashboardHelp }) {
  const openHelp = useContext(HelpContext);
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
