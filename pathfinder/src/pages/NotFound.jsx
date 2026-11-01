import { Link } from 'react-router-dom';
import Nova from '../components/nova/Nova.jsx';
import useTitle from '../hooks/useTitle.js';

export default function NotFound() {
  useTitle('Off the map');
  return (
    <section className="page page--narrow stub" aria-labelledby="nf-title">
      <Nova size={120} mood="curious" />
      <h1 id="nf-title">This spot is off the map</h1>
      <p>We couldn&rsquo;t find that page. The link may be wrong or out of date.</p>
      <p><Link to="/">Back to the trailhead</Link> · <Link to="/explore">Explore careers</Link></p>
    </section>
  );
}
