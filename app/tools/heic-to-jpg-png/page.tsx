import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { HeicConverterClient } from "@/app/tools/heic-to-jpg-png/heic-converter-client";

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
      <HeicConverterClient />
    </ToolPageShell>
  );
}
