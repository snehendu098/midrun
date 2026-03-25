import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import WalletWrapper from "@/components/providers/wallet-wrapper";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "MidRun",
  description: "MidRun - Crash Game on Midnight",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          forcedTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <WalletWrapper>{children}</WalletWrapper>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
