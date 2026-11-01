import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__about">
          <p className="site-footer__brand">PATHFINDER</p>
          <p>
            A career discovery project for B.Tech CSE students. Match scores show how closely your
            answers line up with a career's profile. They are not predictions of success.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="site-footer__h">Trails</h2>
          <ul>
            <li><Link to="/quiz">Find your career</Link></li>
            <li><Link to="/explore">Explore careers</Link></li>
            <li><Link to="/profile">My Career DNA</Link></li>
            <li><Link to="/nova">Ask Nova (demo)</Link></li>
          </ul>
        </nav>

        <nav aria-label="About and legal">
          <h2 className="site-footer__h">About</h2>
          <ul>
            <li><Link to="/about">About PATHFINDER</Link></li>
            <li><Link to="/privacy">Privacy &amp; your data</Link></li>
          </ul>
          <p className="site-footer__note">Contact: not set up yet. This is a college project.</p>
        </nav>
      </div>
    </footer>
  );
}
