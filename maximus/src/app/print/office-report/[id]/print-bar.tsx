"use client";

import { useEffect } from "react";

/** Top bar with Download/Print; opens the print dialog once so members can "Save as PDF". */
export function PrintBar() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="print-bar" style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", gap: 8, justifyContent: "center", padding: 12, background: "#f4f6fb", borderBottom: "1px solid #e2e7f1" }}>
      <button type="button" onClick={() => window.print()}
        style={{ height: 40, padding: "0 18px", borderRadius: 12, border: 0, background: "#305ee6", color: "#fff", fontWeight: 600 }}>
        Download PDF
      </button>
      <button type="button" onClick={() => window.close()}
        style={{ height: 40, padding: "0 18px", borderRadius: 12, border: "1px solid #e2e7f1", background: "#fff", fontWeight: 600 }}>
        Close
      </button>
      <span style={{ alignSelf: "center", fontSize: 12, color: "#55617a" }}>In the print window, choose “Save as PDF”.</span>
    </div>
  );
}
