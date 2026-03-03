import "./globals.css";
import SidebarLayout from "@/components/SidebarLayout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        <SidebarLayout>{children}</SidebarLayout>
      </body>
    </html>
  );
}