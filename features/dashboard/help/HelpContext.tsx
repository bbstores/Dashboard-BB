"use client";

import { createContext, useContext } from "react";
import type { DashboardHelp } from "../model/types";

type OpenHelp = (help: DashboardHelp) => void;

export const HelpContext = createContext<OpenHelp>(() => {});

export function useOpenHelp() {
  return useContext(HelpContext);
}
