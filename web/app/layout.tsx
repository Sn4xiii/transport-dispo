import "./globals.css";
import SidebarLayout from "@/components/SidebarLayout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="app-body">
        <SidebarLayout>
          <main className="app-main">
            {children}
          </main>
        </SidebarLayout>
      </body>
    </html>
  );
}