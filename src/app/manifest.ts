import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Qorpera",
    short_name: "Qorpera",
    description: "AI workforce platform",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#a855f7",
    icons: [{ src: "/logo-mark-black.png", sizes: "any", type: "image/png" }],
  };
}
