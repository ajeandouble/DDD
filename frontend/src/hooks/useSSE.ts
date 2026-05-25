import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const RECONNECT_DELAY = 3_000;

export function useSSE(): boolean {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function connect() {
      const token = localStorage.getItem("token");
      if (!token) return;

      const es = new EventSource(`/api/events/stream?token=${encodeURIComponent(token)}`);
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.addEventListener("transcript_ready", (e: MessageEvent) => {
        const payload = JSON.parse(e.data) as { conversation_id: string; org_id: string };
        qc.invalidateQueries({ queryKey: ["conversations"] });
        // refresh delivery logs so webhook deliveries appear without manual reload
        qc.invalidateQueries({ queryKey: ["deliveries"] });
        void payload;
      });

      es.addEventListener("transcript_failed", () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
      });

      es.addEventListener("ping", () => {
        // keep-alive, no action needed
      });

      es.onerror = () => {
        setConnected(false);
        es.close();
        esRef.current = null;
        timerRef.current = setTimeout(connect, RECONNECT_DELAY);
      };
    }

    connect();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [qc]);

  return connected;
}
