"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens the browser's print dialog; choose "Save as PDF" there for a PDF copy. */
export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} title="Print, or choose Save as PDF">
      <Printer className="size-4" aria-hidden />PDF / Print
    </Button>
  );
}
