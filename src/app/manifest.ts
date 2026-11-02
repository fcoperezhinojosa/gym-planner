import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gym Planner",
    short_name: "Gym",
    description: "Rutinas, plan semanal, calendario y analítica",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0e0d",
    theme_color: "#0e0e0d",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
