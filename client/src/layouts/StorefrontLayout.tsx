import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router';
import { AssistantLauncher, AssistantPanel } from '../components/assistant/AssistantPanel.tsx';
import { CartDrawer } from '../components/cart/CartDrawer.tsx';
import { FullPageSpinner } from '../components/common/Spinner.tsx';
import { Footer } from '../components/layout/Footer.tsx';
import { Header } from '../components/layout/Header.tsx';
import { SkipLink } from '../components/layout/SkipLink.tsx';
import { prefetchCommonPages } from '../routes/storefrontPages.ts';

export default function StorefrontLayout() {
  useEffect(prefetchCommonPages, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* Page chunks load inside the layout, so the header and footer never disappear. */}
        <Suspense fallback={<FullPageSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <AssistantPanel />
      <AssistantLauncher />
    </div>
  );
}
