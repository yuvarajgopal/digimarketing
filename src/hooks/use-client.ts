"use client";

import { useState, useCallback } from "react";

export function useSelectedClient() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const selectClient = useCallback((clientId: string | null) => {
    setSelectedClientId(clientId);
    if (clientId) {
      localStorage.setItem("selectedClientId", clientId);
    } else {
      localStorage.removeItem("selectedClientId");
    }
  }, []);

  return { selectedClientId, selectClient };
}
