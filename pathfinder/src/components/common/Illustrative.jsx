/** Honest-labelling tag for sample content that is not real user data. */
export default function Illustrative({ children = 'Illustrative sample' }) {
  return <span className="tag tag--illustrative">{children}</span>;
}
