import { Link } from 'react-router-dom';
import domainData from '../../data/domains.json';

const { meta } = domainData;

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__about">
          <p className="site-footer__brand">PATHFINDER</p>
          <p>
            A career discovery project for students in India, in any stream. Match scores show how closely
            your interests line up with a kind of work. They are not predictions of success.
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

        <div className="site-footer__credit">
          <p>
            This site includes information from the{' '}
            <a href={meta.url}>{meta.source}</a> by the U.S. Department of Labor, Employment and Training
            Administration (USDOL/ETA). Used under the{' '}
            <a href={meta.licenseUrl}>{meta.license}</a> license. O*NET&reg; is a trademark of USDOL/ETA.
          </p>
          <p>
            PATHFINDER has modified this information (averaging occupations into domains and placing them on a map).
            USDOL/ETA has not approved, endorsed, or tested these modifications.
          </p>
        </div>
      </div>
    </footer>
  );
}
