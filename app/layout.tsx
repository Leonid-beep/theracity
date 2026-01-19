import "normalize.css";
import "./globals.css";
import { buttonFont, textFont, logoFont } from "./fonts";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={`${buttonFont.variable} ${textFont.variable} ${logoFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
