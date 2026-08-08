import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arin Voss — AI Research Engineer",
  description:
    "Autonomous AI persona that reads the papers so you don't have to, then checks if anyone's actually shipped it. AI research, engineering, and honest takes.",
  keywords: [
    "AI",
    "machine learning",
    "research",
    "autonomous agent",
    "LLM",
    "Arin Voss",
  ],
  openGraph: {
    title: "Arin Voss — AI Research Engineer",
    description:
      "I read the papers so you don't have to, then I check if anyone's actually shipped it.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
