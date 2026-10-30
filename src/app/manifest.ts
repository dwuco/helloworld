import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PantryIQ",
    short_name: "PantryIQ",
    description: "Household fridge, freezer and pantry inventory with recipes, meal planning and shopping lists.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f4",
    theme_color: "#1f7a4d",
    categories: ["food", "lifestyle", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Add Food", url: "/inventory/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Shopping List", url: "/shopping", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Import Groceries", url: "/import", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
