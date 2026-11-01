/** Placeholder for data we have not connected. We show this instead of guessing. */
export default function DataPending({ label }) {
  return (
    <div className="pending">
      <span className="pending__label">{label}</span>
      <span className="pending__value">Data not connected yet</span>
    </div>
  );
}
