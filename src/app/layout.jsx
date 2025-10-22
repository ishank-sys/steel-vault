import { Geist, Geist_Mono } from "next/font/google";
import "../app/globals.css";
import Providers from './Providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Login - Steel Docs",
  description: "Login to Steel Docs",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "250x250" },
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest",
};

// Move themeColor to viewport per Next.js guidance
export const viewport = {
  themeColor: "#ffffff",
};

export default function LoginLayout({ children }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased  `} suppressHydrationWarning>
        <Providers>
          <div className="h-full">{children}</div>
        </Providers>
      </body>
    </html>
  );
}