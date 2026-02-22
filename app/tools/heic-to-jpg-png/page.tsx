import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { ToolPlaceholder } from "@/components/tools/tool-placeholder";

export const metadata: Metadata = {
  title: "HEIC to JPG / PNG",
  description: "Convert HEIC images to JPG or PNG in the All In One toolkit.",
};

export default function HeicToJpgPngPage() {
  return (
    <ToolPageShell
      title="HEIC to JPG / PNG"
      description="Upload HEIC photos, choose JPG or PNG output, and export clean converted images from one page."
      category="Image"
    >
      <ToolPlaceholder
        heading="HEIC conversion workflow is queued"
        details="This page is ready and matches the main site style. In the next tool PR, this route will get drag-and-drop upload, output format selection, and bulk export."
        nextMilestone="Implement HEIC decode + conversion pipeline with multi-file output."
      />
    </ToolPageShell>
  );
}
