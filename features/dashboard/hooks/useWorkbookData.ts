import { useRef, useState } from "react";
import { readDashboardWorkbookInWorker } from "../data/excel/readWorkbookInWorker";
import type { DashboardData } from "../model/types";

export function useWorkbookData(onWorkbookLoaded: () => void) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadWorkbook(file: File) {
    setLoading(true);
    setError("");
    try {
      setData(await readDashboardWorkbookInWorker(file));
      onWorkbookLoaded();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể đọc file Excel này.",
      );
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return { fileRef, data, loading, error, loadWorkbook };
}
