import useTitle from '../hooks/useTitle.js';
import meta from '../data/careersMeta.json';

export default function About() {
  useTitle('About');
  return (
    <article className="page page--narrow prose" aria-labelledby="about-title">
      <h1 id="about-title">About PATHFINDER</h1>
      <p>
        PATHFINDER is a college project that helps students in India, in any stream, see the range of
        careers open to them and which of those line up with what they enjoy and how they like to work.
      </p>
      <h2>How matching works</h2>
      <p>
        Your answers become an interest profile across the six types in Holland&rsquo;s RIASEC model:
        Realistic, Investigative, Artistic, Social, Enterprising and Conventional. Every career has its own
        interest profile on the same six types, taken from O*NET. The match score is the cosine similarity of the two
        shapes (each with its own average removed), shown as a percentage. A smaller part comes from how the
        day-to-day work feels (time with people, pace, freedom, being hands-on, routine) compared with what you said you like.
      </p>
      <p>
        It tells you how closely the <em>shape</em> of your interests lines up with a career. It is not a
        prediction of how well you would do in it.
      </p>
      <h2>Strong fits and Explore further</h2>
      <p>
        Your stream and your answers about study length and earning soon never change a score and never hide a
        career. They only decide the grouping: a strong match whose usual route suits you is a <em>strong fit</em>;
        everything else that is still a match goes to <em>explore further</em>, with the reason shown.
      </p>
      <h2>Where the data comes from, and its limits</h2>
      <ul>
        <li>
          Interest profiles, tasks, skills and knowledge areas come from the {meta.source} ({meta.release.replace(' Release', '')}), published by the
          U.S. Department of Labor, Employment and Training Administration and used under {meta.license}. O*NET labels its
          interest scores as <em>{meta.interests.sources.join(' and ')}</em>, so they are estimates, and they describe US occupations.
        </li>
        <li>The six work settings are derived by us from O*NET Work Context. They are not O*NET scores.</li>
        <li>Education routes, exams and governing bodies are for India and are written separately. Each is shown with a link only if its official site loaded and mentioned the name when last checked; otherwise we say &ldquo;Check with the official body&rdquo;.</li>
        <li>Nova&rsquo;s live answers come from a language model and are labelled <em>AI-generated</em>. It is told to answer only from PATHFINDER&rsquo;s own data and to say &ldquo;check with the official body&rdquo; for anything that changes, but it can still be wrong. When live AI is off, busy or out of its free limit, Nova answers from preset demo answers, labelled <em>Demo</em>.</li>
        <li>The typical-route fields (starting stream, study length) are our general reading, not eligibility rules.</li>
        <li>Armed-forces careers are not included because O*NET has no interest data for them.</li>
      </ul>
      <h2>Nova, and what is not connected yet</h2>
      <ul>
        <li>Salary and job outlook. Pages say &ldquo;data not connected yet&rdquo; rather than guess; US figures are not used for India.</li>
        <li>Accounts. There are no accounts; your progress stays in your browser.</li>
      </ul>
    </article>
  );
}
