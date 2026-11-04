import { lazy, Suspense, useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import Home from './pages/Home.jsx';
const About = lazy(() => import('./pages/About.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
import NotFound from './pages/NotFound.jsx';
import Quiz from './pages/Quiz.jsx';
import Results from './pages/Results.jsx';
const Profile = lazy(() => import('./pages/Profile.jsx'));
import Explore from './pages/Explore.jsx';
import CareerDetail from './pages/CareerDetail.jsx';
const Compare = lazy(() => import('./pages/Compare.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const NovaChat = lazy(() => import('./pages/NovaChat.jsx'));

export default function App() {
  const { pathname, hash } = useLocation();
  const mainRef = useRef(null);
  const first = useRef(true);

  // On client-side navigation, reset scroll and move focus to <main> so
  // keyboard and screen-reader users start at the top of the new page.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) {
      target.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname, hash]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <Header />
      <main id="main" tabIndex={-1} ref={mainRef}>
        <Suspense fallback={<p className="page route-loading" role="status">Loading…</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/results" element={<Results />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/careers/:id" element={<CareerDetail />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/nova" element={<NovaChat />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
