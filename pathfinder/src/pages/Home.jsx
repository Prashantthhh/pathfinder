import { useRef, useState } from 'react';
import domainData from '../data/domains.json';
import { TYPES, TYPE_NAMES } from '../engine/hexmap.js';
import { TYPE_NICKNAMES } from '../data/palette.js';
import HexMap from '../components/map/HexMap.jsx';
import DomainReadout from '../components/map/DomainReadout.jsx';
import DomainIndex from '../components/map/DomainIndex.jsx';
import Nova from '../components/nova/Nova.jsx';
import NovaBubble from '../components/nova/NovaBubble.jsx';
import SignLink from '../components/common/SignLink.jsx';
import useTitle from '../hooks/useTitle.js';

const { domains, groups, meta } = domainData;

const TYPE_BLURBS = {
  R: 'Working with tools, machines, plants, animals and the outdoors. Practical, hands-on, with results you can see.',
  I: 'Working things out: research, analysis, science and maths. Asking why, and checking the answer.',
  A: 'Expressing ideas through design, writing, music or performance. Original work with room to imagine.',
  S: 'Teaching, caring, advising and helping. Work that is about people and how they get on.',
  E: 'Leading, selling, persuading and taking business risks. Making things happen through others.',
  C: 'Order, accuracy and procedure. Keeping records, rules and systems working properly.',
};

const STEPS = [
  {
    title: 'Interests draw the map',
    text: 'The psychologist John Holland found that work interests fall into six types, and that neighbouring types are alike. We use his hexagon as the shape of the map.',
  },
  {
    title: 'Careers sit where their people point',
    text: 'Each dot is a career domain. Its place comes from O*NET interest scores for real occupations inside it. The nearer the edge, the more one interest stands out.',
  },
  {
    title: 'You land on it too',
    text: 'Your answers will place you on the same map, and the domains around you are where to start looking.',
    soon: true,
  },
];

function Hero() {
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const readoutRef = useRef(null);
  const activeId = hover ?? selected;
  const shown = domains.find((d) => d.id === activeId) ?? null;

  const select = (id) => {
    setSelected((cur) => (cur === id ? null : id));
  };
  const selectFromList = (id) => {
    setSelected(id);
    readoutRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  return (
    <>
      <section className="h-hero on-night" aria-labelledby="hero-title">
        <div className="h-hero__grid">
          <div className="h-hero__copy">
            <p className="eyebrow">A career map for students in India · any stream</p>
            <h1 id="hero-title">
              Find where you fit on the <span className="h-hero__mark">career map</span>.
            </h1>
            <p className="h-lede">
              Engineering, medicine, law, design, teaching, business and more: {domains.length} career domains,
              placed by the interests of the people who do the work. Tell PATHFINDER what you enjoy and it
              shows the places worth a look, with reasons.
            </p>
            <div className="h-hero__signs">
              <SignLink to="/quiz">Find your place</SignLink>
              <SignLink to="/explore" tone="quiet">Explore careers</SignLink>
            </div>
          </div>

          <div className="h-hero__map">
            <HexMap
              domains={domains}
              activeId={activeId}
              selectedId={selected}
              onHover={setHover}
              onSelect={select}
            />
          </div>

          <div className="h-hero__readout" ref={readoutRef}>
            <DomainReadout domain={shown} groups={groups} id="domain-readout" />
          </div>
        </div>
      </section>

      <section className="h-sec" aria-labelledby="index-title">
        <h2 id="index-title" className="h-h2">All {domains.length} domains</h2>
        <p className="h-intro">The same places as on the map, as a list. Pick one and Nova points at it.</p>
        <DomainIndex domains={domains} groups={groups} selectedId={selected} onSelect={selectFromList} />
      </section>
    </>
  );
}

function HowItWorks() {
  return (
    <section className="h-sec h-sec--tint" aria-labelledby="how-title">
      <h2 id="how-title" className="h-h2">How the map works</h2>
      <ol className="h-steps">
        {STEPS.map((s, i) => (
          <li key={s.title} className={s.soon ? 'h-step h-step--soon' : 'h-step'}>
            <span className="h-step__n" aria-hidden="true">{i + 1}</span>
            <h3>
              {s.title}
              {s.soon && <span className="tag tag--soon">Coming next</span>}
            </h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
      <p className="h-axes">
        <strong>Reading the hexagon:</strong> top is hands-on <em>things</em>, bottom is <em>people</em>; the right
        leans toward <em>ideas</em>, the left toward <em>data and order</em>. Opposite corners (R and S, I and E, A and C)
        are the types least alike.
      </p>
    </section>
  );
}

function SixKinds() {
  return (
    <section className="h-sec" aria-labelledby="six-title">
      <h2 id="six-title" className="h-h2">Six kinds of work</h2>
      <p className="h-intro">
        Most people are a mix, but one kind usually stands out. Here is each corner of the map and the domains that sit nearest it.
      </p>
      <ul className="h-types">
        {TYPES.map((t) => {
          const near = domains.filter((d) => d.primary === t);
          return (
            <li key={t} className="h-type" style={{ '--t': `var(--${t.toLowerCase()}-lt)` }}>
              <span className="h-type__letter" aria-hidden="true">{t}</span>
              <div>
                <h3>{TYPE_NAMES[t]} <span className="h-type__nick">· {TYPE_NICKNAMES[t]}</span></h3>
                <p>{TYPE_BLURBS[t]}</p>
                <p className="h-type__near"><strong>Nearest domains:</strong> {near.map((d) => d.label).join(' · ')}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Honest() {
  return (
    <section className="h-honest on-night" aria-labelledby="honest-title">
      <div className="h-honest__inner">
        <h2 id="honest-title" className="h-h2">What this map is, and is not</h2>
        <div className="h-honest__cols">
          <div>
            <h3>A starting point, not a verdict</h3>
            <p>Where you land shows how closely your interests line up with a kind of work. It does not predict how well you would do in it, and no match score should make your decision for you.</p>
          </div>
          <div>
            <h3>Real data, with limits</h3>
            <p>
              Interest scores come from {meta.source} ({meta.release.replace(' Release', '')}), published by the U.S. Department of
              Labor. O*NET describes how its scores were produced as <em>{meta.interests.source}</em> (dated {meta.interests.date}),
              so treat them as estimates. They describe US occupations.
            </p>
          </div>
          <div>
            <h3>India facts are labelled</h3>
            <p>Education routes, entrance exams and licences will be given for India and marked as such. Salary and job outlook show &ldquo;data not connected yet&rdquo; until there is a cited Indian source. We do not use US figures for India.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="h-final" aria-labelledby="final-title">
      <div className="h-final__inner">
        <div className="h-final__nova">
          <NovaBubble className="bubble--side">Ready when you are. I will point the way.</NovaBubble>
          <Nova size={200} mood="happy" bearing={100} reactKey="final" />
        </div>
        <div>
          <h2 id="final-title" className="h-h2">Ready to find your bearings?</h2>
          <p className="h-intro">You can change any answer, stop and pick it up later, and your progress stays in this browser.</p>
          <div className="h-hero__signs">
            <SignLink to="/quiz">Find your place</SignLink>
            <SignLink to="/explore" tone="quiet">Explore careers</SignLink>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  useTitle('');
  return (
    <>
      <Hero />
      <HowItWorks />
      <SixKinds />
      <Honest />
      <FinalCta />
    </>
  );
}
