import type { Metadata } from "next";
import "./globals.css";
import HoloNav from "../components/HoloNav";

export const metadata: Metadata = {
  title: "SENTINEL // MULTIMODAL SURVEILLANCE AI",
  description: "AI-powered real-time multi-camera surveillance intelligence system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Full-viewport spatial workspace — no sidebar offset */}
        <main
          style={{
            minHeight: "100vh",
            padding: "1.5rem 1.5rem 5.5rem 1.5rem", // bottom padding for orbital nav
            position: "relative",
            maxWidth: "1600px",
            margin: "0 auto",
          }}
        >
          {children}
        </main>

        {/* Orbital bottom navigation instead of sidebar */}
        <HoloNav />

      </body>
    </html>
  );
}
