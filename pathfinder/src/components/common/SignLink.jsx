import { Link } from 'react-router-dom';

/** A link styled as a trail signpost (arrow-ended board). tone: 'primary' | 'quiet'. */
export default function SignLink({ to, tone = 'primary', children }) {
  return (
    <Link to={to} className={`sign sign--${tone}`}>
      <span className="sign__board">
        {children}
        <span className="sign__arrow" aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
