import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import Header from "@/components/layouts/Header";
import { AppProvider } from "@/components/AppContext";
import { Toaster } from "react-hot-toast";
import Chatbot from "@/components/layouts/Chatbot";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: {
    template: "%s | Pokemon TCG Pocket",
    default: "Pokemon TCG Pocket",
  },
  description: "Browse and filter Pokemon TCG Pocket cards and packages.",
  openGraph: {
    title: "Pokemon TCG Pocket",
    description: "Browse and filter Pokemon TCG Pocket cards and packages.",
    type: "website",
    siteName: "Pokemon TCG Pocket",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pokemon TCG Pocket",
    description: "Browse and filter Pokemon TCG Pocket cards and packages.",
  },
};

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={roboto.className}>
        <main>
          <AppProvider>
            <Toaster />
            <Header />
            <Chatbot />
            {children}
            <Analytics />
          </AppProvider>
        </main>
      </body>
    </html>
  );
}
