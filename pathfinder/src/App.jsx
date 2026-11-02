import { useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Privacy from './pages/Privacy.jsx';
import NotFound from './pages/NotFound.jsx';
import Quiz from './pages/Quiz.jsx';
import Results from './pages/Results.jsx';
import Profile from './pages/Profile.jsx';
import Explore from './pages/Explore.jsx';
import CareerDetail from './pages/CareerDetail.jsx';
import NovaChat from './pages/NovaChat.jsx';

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
      <a className="skip-link" href="#main">Skip to main content</a>
      <Header />
      <main id="main" tabIndex={-1} ref={mainRef}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/results" element={<Results />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/careers/:id" element={<CareerDetail />} />
          <Route path="/nova" element={<NovaChat />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
