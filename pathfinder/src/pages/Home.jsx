import { Link } from 'react-router-dom';
import careers from '../data/careers.json';
import quiz from '../data/quiz.json';
import { DIMENSIONS, DIMENSION_BY_ID } from '../data/dimensions.js';
import { buildProfile } from '../engine/vector.js';
import { recommend } from '../engine/recommend.js';
import { PERSONAS } from '../engine/fixtures.js';
import Nova from '../components/nova/Nova.jsx';
import NovaBubble from '../components/nova/NovaBubble.jsx';
import TrailMap from '../components/map/TrailMap.jsx';
import RadarChart from '../components/profile/RadarChart.jsx';
import SignLink from '../components/common/SignLink.jsx';
import Illustrative from '../components/common/Illustrative.jsx';
import useTitle from '../hooks/useTitle.js';

// The sample student is run through the real engine, so the preview shows what
// the product actually does. It is labelled illustrative, not a real user.
const SAMPLE = PERSONAS.find((p) => p.id === 'security-tinkerer');
const sampleProfile = buildProfile(SAMPLE.answers, quiz);
const sampleMatches = recommend(sampleProfile, careers).matches.slice(0, 3);

const STEPS = [
  { title: 'Answer a short quiz', text: `${quiz.questions.length} questions about what you enjoy, what you can already do and how you like to work. Your answers are saved as you go, so you can stop and resume.` },
  { title: 'See your matches', text: 'Every career is scored against your answers. You get a ranked shortlist, some alternatives from other areas, and the reasons behind each match.' },
  { title: 'Explore the destinations', text: 'Browse careers by area, search, or hit Surprise Me. Each career page lays out the work, skills and beginner projects.' },
  { title: 'Plan your skills', text: 'Skill-gap analysis and learning roadmaps are planned but not built yet.', soon: true },
];

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__copy">
        <p className="eyebrow">Trailhead · for B.Tech CSE students</p>
        <h1 id="hero-title">
          Not sure which way to go in tech? <span className="hero__em">Read the map.</span>
        </h1>
        <p className="lede">
          PATHFINDER turns a short quiz about what you enjoy, what you can do and how you like to
          work into a map of careers that fit, with the reasons shown.
        </p>
        <div className="hero__signs">
          <SignLink to="/quiz">Find your career</SignLink>
          <SignLink to="/explore" tone="quiet">Explore careers</SignLink>
        </div>
        <p className="fine">
          {quiz.questions.length} questions · {careers.length} careers on the map · no sign-up · your answers stay in this browser
        </p>
      </div>

      <div className="hero__nova">
        <NovaBubble className="bubble--hero">
          Hi, I&rsquo;m Nova. I&rsquo;m a compass: I point out directions, you pick the trail.
        </NovaBubble>
        <Nova size={220} mood="happy" label="Nova, a friendly star-compass character, waving hello" />
      </div>
    </section>
  );
}

function MeetNova() {
  return (
    <section className="band" aria-labelledby="nova-title">
      <div className="band__inner meet">
        <Nova size={150} mood="curious" className="meet__nova" />
        <div>
          <h2 id="nova-title">Meet Nova, your trail companion</h2>
          <p>
            Nova is the star-compass who walks the quiz with you. Nova answers each choice you make
            with a note about what it says about your profile, and later explains the reasoning behind
            your matches.
          </p>
          <ul className="meet__list">
            <li><strong>Reacts to your actual answers</strong> during the quiz, not with random cheerleading.</li>
            <li><strong>Explains matches</strong> by pointing to the answers that produced them.</li>
            <li>
              <strong>Chats in demo mode:</strong> the chat page uses preset answers and is clearly marked as
              not live AI.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="section" aria-labelledby="how-title">
      <h2 id="how-title" className="section__title">How the trail works</h2>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s.title} className={s.soon ? 'step step--soon' : 'step'}>
            <span className="step__marker" aria-hidden="true">{i + 1}</span>
            <div>
              <h3>
                {s.title}
                {s.soon && <span className="tag tag--soon">Coming next</span>}
              </h3>
              <p>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Destinations() {
  return (
    <section className="section section--map" aria-labelledby="map-title">
      <h2 id="map-title" className="section__title">Pick a destination</h2>
      <p className="section__intro">
        Careers are grouped into areas, drawn here as places on a map. Follow the trail or jump to
        any destination to see its roles. The coloured marks on each pin show the dimensions it
        draws on most.
      </p>
      <TrailMap careers={careers} />
    </section>
  );
}

function DnaPreview() {
  return (
    <section className="band band--lo" aria-labelledby="dna-title">
      <div className="band__inner dna">
        <div className="dna__copy">
          <h2 id="dna-title">Your Career DNA</h2>
          <p>
            After the quiz you get a profile across eight dimensions. It is the shape the engine
            compares with every career, and you can edit it as you learn more about yourself.
          </p>
          <p><Illustrative>Illustrative sample, not a real student</Illustrative></p>
          <ul className="legend">
            {DIMENSIONS.map((d) => (
              <li key={d.id}>
                <span className="legend__blaze" style={{ background: d.color }} aria-hidden="true" />
                <span><strong>{d.label}</strong> <span className="legend__blurb">{d.blurb}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <RadarChart
          values={sampleProfile.display}
          title="Sample Career DNA"
          className="dna__chart"
        />
      </div>
    </section>
  );
}

function SampleMatches() {
  return (
    <section className="section" aria-labelledby="sample-title">
      <h2 id="sample-title" className="section__title">What matches look like</h2>
      <p className="section__intro">
        <Illustrative>Illustrative sample</Illustrative> This is a made-up student who likes CTF puzzles and home labs,
        run through the real matching engine.
      </p>
      <ol className="matches">
        {sampleMatches.map((m) => {
          const lead = m.why.drivers[0] && DIMENSION_BY_ID[m.why.drivers[0].dim];
          return (
            <li key={m.career.id} className="match">
              <div className="match__head">
                <span className="match__rank" aria-hidden="true">{m.rank}</span>
                <h3>{m.career.title}</h3>
                <span className="match__score">
                  <span className="match__pct">{m.percent}%</span> match score
                </span>
              </div>
              <div className="match__bar" aria-hidden="true">
                <span style={{ width: `${m.percent}%`, background: lead?.color }} />
              </div>
              <p className="match__why">{m.why.sentence}</p>
            </li>
          );
        })}
      </ol>
      <p className="note">
        A match score shows how closely your answers line up with a career&rsquo;s profile. It is
        not a prediction of how well you would do in the career.
      </p>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="final" aria-labelledby="final-title">
      <Nova size={130} mood="idle" />
      <h2 id="final-title">Ready to find your bearings?</h2>
      <p>Start at the trailhead. You can go back and change any answer, or stop and pick it up later.</p>
      <div className="hero__signs hero__signs--center">
        <SignLink to="/quiz">Find your career</SignLink>
        <SignLink to="/explore" tone="quiet">Explore careers</SignLink>
      </div>
      <p className="fine">
        Curious how scoring works? Read <Link to="/about">About PATHFINDER</Link>.
      </p>
    </section>
  );
}

export default function Home() {
  useTitle('');
  return (
    <>
      <Hero />
      <MeetNova />
      <HowItWorks />
      <Destinations />
      <DnaPreview />
      <SampleMatches />
      <FinalCta />
    </>
  );
}
