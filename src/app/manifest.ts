import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gym Planner",
    short_name: "Gym",
    description: "Rutinas, plan semanal, calendario y analítica",
    start_url: "/boot",
    scope: "/",
    display: "standalone",
    background_color: "#f8f9fd",
    theme_color: "#f8f9fd",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg?v=3", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
