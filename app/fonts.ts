import localFont from "next/font/local";

export const logoFont = localFont({
  src: "../public/fonts/NewTegomin-Regular.ttf",
  variable: "--font-logo",
  display: "swap",
  preload: false,
});

export const textFont = localFont({
  src: "../public/fonts/Belarus.otf",
  variable: "--font-text",
  display: "swap",
});

export const buttonFont = localFont({
  src: "../public/fonts/RubikMonoOne-Regular.ttf",
  variable: "--font-button",
  display: "swap",
});

