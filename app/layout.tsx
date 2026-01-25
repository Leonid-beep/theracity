import "normalize.css";
import "./globals.css";
import { buttonFont, textFont, logoFont } from "./fonts";
import BurgerMenu from "./ui/BurgerMenu/BurgerMenu";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${buttonFont.variable} ${textFont.variable} ${logoFont.variable}`}>
        <div className="appShell">
          <div className="appMapBg" aria-hidden="true" />
          <BurgerMenu />
          <div className="appContent">{children}</div>
        </div>
      </body>
    </html>
  );
}
