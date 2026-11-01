import useTitle from '../hooks/useTitle.js';

export default function About() {
  useTitle('About');
  return (
    <article className="page page--narrow prose" aria-labelledby="about-title">
      <h1 id="about-title">About PATHFINDER</h1>
      <p>
        PATHFINDER is a college project that helps B.Tech CSE students see the range of careers
        open to them and which of those line up with what they enjoy and can already do.
      </p>
      <h2>How matching works</h2>
      <p>
        Your answers are turned into a profile across eight dimensions: Build, Data, AI, Design,
        Security, Systems, People and Play. Each career has its own profile on the same eight
        dimensions. The match score is the cosine similarity between the two, shown as a percentage.
      </p>
      <p>
        It tells you how closely the <em>shape</em> of your answers lines up with a career. It is
        not a prediction of how well you would do in it, and the career profiles were set by hand
        for this project, so treat them as a starting point for exploring, not as a verdict.
      </p>
      <h2>What is not connected yet</h2>
      <ul>
        <li>Salary and demand data. Pages say &ldquo;data not connected yet&rdquo; rather than guess.</li>
        <li>Live AI. Nova&rsquo;s chat uses preset answers and is labelled as a demo.</li>
        <li>Accounts. There is no backend; everything stays in your browser.</li>
      </ul>
    </article>
  );
}
