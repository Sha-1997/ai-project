import "./globals.css";
import React from "react";

export const metadata = {
  title: "JovianeX AI Platform",
  description: "Unified AI-First digital ecosystem portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
