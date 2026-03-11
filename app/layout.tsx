import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FallingNoise",
  description: "Colorful animated dots falling with musical notes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
