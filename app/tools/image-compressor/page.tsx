import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { ImageCompressorClient } from "@/app/tools/image-compressor/image-compressor-client";

export const metadata: Metadata = {
  title: "Image Compressor",
  description:
    "Compress one or many images with quality profiles and target size presets in the All In One toolkit.",
};

export default function ImageCompressorPage() {
  return (
    <ToolPageShell
      title="Image Compressor"
      description="Bulk-compress JPG, PNG, and WEBP images with quick presets. Set target file sizes for email, web, or upload limits, then download each optimized file."
      category="Image"
    >
      <ImageCompressorClient />
    </ToolPageShell>
  );
}
