import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FaceAttend — Face Recognition Attendance System",
  description:
    "A modern, offline-capable face recognition attendance system. Register users, mark attendance automatically via webcam, and view logs — all in your browser.",
  keywords: ["attendance", "face recognition", "face-api.js", "biometric"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-screen flex flex-col bg-grid" style={{ backgroundColor: "var(--bg-primary)" }}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: "toast-base",
            style: {
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
            },
          }}
        />
        <Navbar />
        <main className="flex-1 page-enter">{children}</main>
        <footer className="text-center py-4 text-sm" style={{ color: "var(--text-muted)" }}>
          FaceAttend © {new Date().getFullYear()} — Powered by face-api.js
        </footer>
      </body>
    </html>
  );
}
