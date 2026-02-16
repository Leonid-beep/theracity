import "normalize.css";
import "./globals.css";
import { buttonFont, textFont, logoFont } from "./fonts";
import Image from "next/image";
import BurgerMenu from "./ui/BurgerMenu/BurgerMenuDynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${buttonFont.variable} ${textFont.variable} ${logoFont.variable}`}>
        <div className="appShell">
          <div className="appMapBg" aria-hidden="true">
            <div className="appMapBgImg">
              <Image
                src="/images/map-bg.jpg"
                alt=""
                fill
                sizes="100vw"
                priority
                className="object-cover object-center"
              />
            </div>
            <div className="appMapBgOverlay" />
          </div>
          <BurgerMenu />
          <div className="appContent">{children}</div>
        </div>
      </body>
    </html>
  );
}
