import { Link } from 'react-router-dom';
import Nova from '../components/nova/Nova.jsx';
import useTitle from '../hooks/useTitle.js';

/** Placeholder for trails that are not cut yet. Says so plainly. */
export default function ComingSoon({ title, children }) {
  useTitle(title);
  return (
    <section className="page page--narrow stub" aria-labelledby="stub-title">
      <Nova size={120} mood="thinking" />
      <h1 id="stub-title">{title}</h1>
      <p>{children ?? 'This part of the trail is still being cut. It is not built yet.'}</p>
      <p><Link to="/">Back to the trailhead</Link></p>
    </section>
  );
}
