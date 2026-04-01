import "normalize.css";
import "./globals.css";
import { buttonFont, textFont, logoFont } from "./fonts";
import BurgerMenu from "./ui/BurgerMenu/BurgerMenuDynamic";
import AuthProvider from "./providers/AuthProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${buttonFont.variable} ${textFont.variable} ${logoFont.variable}`}>
        <AuthProvider>
          <div className="appShell">
            <div className="appMapBg" aria-hidden="true">
              <div className="appMapBgImg" />
              <div className="appMapBgOverlay" />
            </div>
            <BurgerMenu />
            <div className="appContent">{children}</div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
