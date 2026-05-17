import React from "react";

export function Btn({ loading, disabled, children }: { loading: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={loading || disabled}
      className="w-full bg-accent py-3 text-sm font-semibold tracking-wider uppercase text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors duration-200">
      {loading ? "שומר..." : children}
    </button>
  );
}
