import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ProductTour } from "@/components/guide/product-tour";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen overflow-hidden w-full relative bg-background text-foreground antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-20">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:pl-64 h-full w-full max-w-full overflow-hidden">
        {/* Mobile Nav Header */}
        <MobileNav>
          <Sidebar />
        </MobileNav>

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          {children}
        </main>
      </div>

      {/* Interactive Website Guide / Product Tour */}
      <ProductTour />
    </div>
  );
}
