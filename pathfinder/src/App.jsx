import { useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import ContourBackground from './components/map/ContourBackground.jsx';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Privacy from './pages/Privacy.jsx';
import NotFound from './pages/NotFound.jsx';
import ComingSoon from './pages/ComingSoon.jsx';

export default function App() {
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  const first = useRef(true);

  // On client-side navigation, reset scroll and move focus to <main> so
  // keyboard and screen-reader users start at the top of the new page.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <>
      <ContourBackground />
      <a className="skip-link" href="#main">Skip to main content</a>
      <Header />
      <main id="main" tabIndex={-1} ref={mainRef}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<ComingSoon title="Career quiz">The quiz is the next stage of the build.</ComingSoon>} />
          <Route path="/results" element={<ComingSoon title="Your matches">Matches appear here once the quiz is built.</ComingSoon>} />
          <Route path="/profile" element={<ComingSoon title="My Career DNA">Your Career DNA profile is coming in a later stage.</ComingSoon>} />
          <Route path="/explore" element={<ComingSoon title="Explore careers">The career explorer is coming in a later stage.</ComingSoon>} />
          <Route path="/careers/:id" element={<ComingSoon title="Career details">Career detail pages are coming in a later stage.</ComingSoon>} />
          <Route path="/nova" element={<ComingSoon title="Ask Nova (demo)">Nova&rsquo;s demo chat is coming in a later stage. It will use preset answers, not live AI.</ComingSoon>} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
