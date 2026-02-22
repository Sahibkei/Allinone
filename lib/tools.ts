export type ToolItem = {
  slug: string;
  name: string;
  description: string;
  category: "Image" | "Document";
  status: "Planned" | "Ready";
};

export const tools: ToolItem[] = [
  {
    slug: "image-compressor",
    name: "Image Compressor",
    description: "Compress one or many images with quick quality profiles and target size presets.",
    category: "Image",
    status: "Ready",
  },
  {
    slug: "heic-to-jpg-png",
    name: "HEIC to JPG / PNG",
    description: "Convert HEIC photos to JPG or PNG with options for quality and transparency.",
    category: "Image",
    status: "Planned",
  },
  {
    slug: "pdf-merge-split",
    name: "PDF Merge + Split",
    description: "Combine PDFs into one file or split pages into separate PDF outputs.",
    category: "Document",
    status: "Planned",
  },
  {
    slug: "images-to-pdf",
    name: "Images to PDF",
    description: "Turn one or multiple images into a single ordered PDF document.",
    category: "Document",
    status: "Planned",
  },
  {
    slug: "pdf-rotate-reorder",
    name: "PDF Rotate + Reorder",
    description: "Rotate selected PDF pages and reorder page sequence before export.",
    category: "Document",
    status: "Ready",
  },
];
