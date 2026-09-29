import { Outlet } from 'react-router';
import { Footer } from '../components/layout/Footer.tsx';
import { Header } from '../components/layout/Header.tsx';
import { SkipLink } from '../components/layout/SkipLink.tsx';

export default function StorefrontLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
