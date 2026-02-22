export type ToolItem = {
  slug: string;
  name: string;
  description: string;
  category: "Video" | "Image" | "Document" | "Data";
  status: "Planned" | "In Progress";
};

export const tools: ToolItem[] = [
  {
    slug: "youtube-video-downloader",
    name: "YouTube Video Downloader",
    description: "Download YouTube videos using a URL with multiple quality choices.",
    category: "Video",
    status: "In Progress",
  },
  {
    slug: "youtube-audio-downloader",
    name: "YouTube Audio Downloader",
    description: "Extract audio-only downloads for podcasts, talks, and music references.",
    category: "Video",
    status: "Planned",
  },
  {
    slug: "instagram-reel-downloader",
    name: "Instagram Reel Downloader",
    description: "Save Instagram reel videos from a shared reel link.",
    category: "Video",
    status: "Planned",
  },
  {
    slug: "tiktok-downloader",
    name: "TikTok Downloader",
    description: "Download TikTok clips from a URL for offline access.",
    category: "Video",
    status: "Planned",
  },
  {
    slug: "video-compressor",
    name: "Video Compressor",
    description: "Reduce video file size while keeping practical visual quality.",
    category: "Video",
    status: "Planned",
  },
  {
    slug: "word-to-pdf",
    name: "Word to PDF",
    description: "Convert DOCX files into clean and shareable PDF documents.",
    category: "Document",
    status: "In Progress",
  },
  {
    slug: "pdf-to-word",
    name: "PDF to Word",
    description: "Convert PDF files back to editable Word format.",
    category: "Document",
    status: "Planned",
  },
  {
    slug: "excel-to-csv",
    name: "Excel to CSV",
    description: "Convert spreadsheet files into CSV for data workflows.",
    category: "Data",
    status: "Planned",
  },
  {
    slug: "image-compressor",
    name: "Image Compressor",
    description: "Compress JPG, PNG, and WebP images to save bandwidth and storage.",
    category: "Image",
    status: "In Progress",
  },
  {
    slug: "file-compressor",
    name: "File Compressor",
    description: "Compress common files for easier sharing and faster uploads.",
    category: "Document",
    status: "Planned",
  },
  {
    slug: "image-upscaler",
    name: "Image Upscaler",
    description: "Upscale low-resolution images for cleaner social and web assets.",
    category: "Image",
    status: "Planned",
  },
  {
    slug: "background-remover",
    name: "Background Remover",
    description: "Remove image backgrounds automatically for product and profile shots.",
    category: "Image",
    status: "Planned",
  },
];
