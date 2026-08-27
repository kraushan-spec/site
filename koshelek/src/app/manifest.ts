import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Кошелёк Онлайн",
    short_name: "Кошелёк",
    description:
      "Семейный финансовый помощник и контроль тендеров/договоров",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f4f6fb",
    theme_color: "#4f46e5",
    lang: "ru",
    categories: ["finance", "business", "productivity"],
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Добавить расход", url: "/expenses?new=1" },
      { name: "Добавить доход", url: "/income?new=1" },
      { name: "Тендеры", url: "/tenders" },
    ],
  };
}
