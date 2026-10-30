"use client";

import type { ReactNode } from "react";
import { Button, ErrorState, LoadingState } from "./ui";
import { usePantry } from "./pantry-provider";

/** Shows a loading skeleton or an error with recovery options until data is ready. */
export function DataGate({ children, label }: { children: ReactNode; label?: string }) {
  const { status, error, reload, resetLocalData, mode } = usePantry();
  if (status === "loading") return <LoadingState label={label} />;
  if (status === "error")
    return (
      <ErrorState
        title="Couldn't load your kitchen"
        message={error ?? "Unknown error"}
        onRetry={() => void reload()}
        extra={
          mode.kind === "local" ? (
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm("Erase the data saved on this device and start fresh? This cannot be undone.")) void resetLocalData();
              }}
            >
              Reset data on this device
            </Button>
          ) : null
        }
      />
    );
  return <>{children}</>;
}
