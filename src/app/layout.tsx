import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { BasketProvider } from "@/components/basket-context";

export const metadata: Metadata = {
  title: "Zygenic",
  description: "Your AI workforce, visualized.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">
        <BasketProvider>
          <AppShell>{children}</AppShell>
        </BasketProvider>
      </body>
    </html>
  );
}
