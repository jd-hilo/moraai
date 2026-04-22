import type { Metadata } from "next";
import { ClerkProvider, Show, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mora",
  description: "The AI that knows you.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
