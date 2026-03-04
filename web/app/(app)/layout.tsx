import SidebarLayout from "@/components/SidebarLayout";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarLayout>
      <main className="app-main">
        {children}
      </main>
    </SidebarLayout>
  );
}