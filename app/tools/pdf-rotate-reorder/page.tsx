import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { PdfRotateReorderClient } from "@/app/tools/pdf-rotate-reorder/pdf-rotate-reorder-client";

export const metadata: Metadata = {
  title: "PDF Rotate + Reorder",
  description: "Rotate PDF pages and reorder them before exporting a new file.",
};

export default function PdfRotateReorderPage() {
  return (
    <ToolPageShell
      title="PDF Rotate + Reorder"
      description="Adjust page orientation and page order from one focused editor before downloading the updated PDF."
      category="Document"
    >
      <PdfRotateReorderClient />
    </ToolPageShell>
  );
}
