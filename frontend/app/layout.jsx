import "./globals.css";

export const metadata = {
  title: "Fake News Detector",
  description: "Evidence-aware multimodal content review workspace",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
