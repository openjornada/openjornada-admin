import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealtimeProvider } from "@/contexts/RealtimeProvider";
import { Toaster } from "react-hot-toast";
import { appConfig } from "@/lib/config";
import LocaleSync from "@/components/LocaleSync";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("title", { appName: appConfig.appName }),
    description: t("description", { appName: appConfig.appName }),
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale is resolved WITHOUT a [locale] URL segment: NEXT_LOCALE cookie
  // (mirror of the user's persisted preference) → Accept-Language → "es".
  // See src/i18n/request.ts.
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html lang={locale} className="light">
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <RealtimeProvider>
              {children}
              <Toaster position="top-right" />
              <LocaleSync />
            </RealtimeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
