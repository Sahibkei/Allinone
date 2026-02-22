import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { ImagesToPdfClient } from "@/app/tools/images-to-pdf/images-to-pdf-client";

export const metadata: Metadata = {
  title: "Images to PDF",
  description: "Convert one or many images into a single PDF document.",
};

export default function ImagesToPdfPage() {
  return (
    <ToolPageShell
      title="Images to PDF"
      description="Upload images, control page order, and export one clean PDF document tailored to print or digital usage."
      category="Document"
    >
      <ImagesToPdfClient />
    </ToolPageShell>
  );
}
