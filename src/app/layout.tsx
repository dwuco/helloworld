import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { PantryProvider } from "@/components/pantry-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: { default: "PantryIQ", template: "%s · PantryIQ" },
  description: "Track your fridge, freezer and pantry, import groceries, find recipes from what you own, plan meals and shop smarter.",
  applicationName: "PantryIQ",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PantryIQ", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1f7a4d" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1411" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <PantryProvider>
            <AppShell>{children}</AppShell>
          </PantryProvider>
        </ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
