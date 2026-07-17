import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SariHub",
    short_name: "SariHub",
    description: "Palengke-on-Wheels para sa mga sari-sari store.",
    start_url: "/home",
    display: "standalone",
    background_color: "#FAF7F2",
    theme_color: "#FAF7F2",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
