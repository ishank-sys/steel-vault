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