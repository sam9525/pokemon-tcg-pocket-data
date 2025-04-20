import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import Header from "@/components/layouts/Header";
import { AppProvider } from "@/components/AppContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Pokemon tcg pocket",
  description: "Pokemon tcg pocket",
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
            {children}
          </AppProvider>
        </main>
      </body>
    </html>
  );
}
