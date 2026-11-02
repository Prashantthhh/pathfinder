// Work settings: six preferences about HOW the work feels day to day.
//
// O*NET 31.0 publishes no "work values" file, so these are DERIVED BY US from
// published O*NET Work Context items (scale CX, 1-5). Each setting is the mean of
// its items rescaled to 0-1; `sign: -1` reverses an item (e.g. "Spend Time Sitting"
// counts against "hands-on"). They are NOT O*NET scores and are labelled as derived
// wherever they appear.
//
// scripts/build-careers.mjs uses `items` to compute each career's settings.

export const SETTINGS = [
  {
    id: 'people',
    label: 'Time with people',
    low: 'Mostly on my own',
    high: 'Mostly with people',
    items: [
      { id: '4.C.1.a.4', name: 'Contact With Others', sign: 1 },
      { id: '4.C.1.b.1.f', name: 'Deal With External Customers or the Public in General', sign: 1 },
      { id: '4.C.1.a.2.l', name: 'Face-to-Face Discussions with Individuals and Within Teams', sign: 1 },
    ],
  },
  {
    id: 'team',
    label: 'Team and leading',
    low: 'Working independently',
    high: 'Working in and leading teams',
    items: [
      { id: '4.C.1.b.1.e', name: 'Work With or Contribute to a Work Group or Team', sign: 1 },
      { id: '4.C.1.b.1.g', name: 'Coordinate or Lead Others in Accomplishing Work Activities', sign: 1 },
    ],
  },
  {
    id: 'autonomy',
    label: 'Freedom to decide',
    low: 'Clear instructions',
    high: 'Setting my own priorities',
    items: [
      { id: '4.C.3.a.4', name: 'Freedom to Make Decisions', sign: 1 },
      { id: '4.C.3.b.8', name: 'Determine Tasks, Priorities and Goals', sign: 1 },
    ],
  },
  {
    id: 'pace',
    label: 'Pace and pressure',
    low: 'Calm and steady',
    high: 'Fast, competitive, high stakes',
    items: [
      { id: '4.C.3.d.1', name: 'Time Pressure', sign: 1 },
      { id: '4.C.3.c.1', name: 'Level of Competition', sign: 1 },
      { id: '4.C.3.a.1', name: 'Consequence of Error', sign: 1 },
    ],
  },
  {
    id: 'hands',
    label: 'Hands-on and on your feet',
    low: 'At a desk',
    high: 'Hands-on, moving, often outdoors',
    items: [
      { id: '4.C.2.d.1.g', name: 'Spend Time Using Your Hands to Handle, Control, or Feel Objects, Tools, or Controls', sign: 1 },
      { id: '4.C.2.d.1.b', name: 'Spend Time Standing', sign: 1 },
      { id: '4.C.2.d.1.d', name: 'Spend Time Walking or Running', sign: 1 },
      { id: '4.C.2.d.1.a', name: 'Spend Time Sitting', sign: -1 },
      { id: '4.C.2.a.1.c', name: 'Outdoors, Exposed to All Weather Conditions', sign: 1 },
    ],
  },
  {
    id: 'routine',
    label: 'Routine and precision',
    low: 'Variety and flexibility',
    high: 'Routine and exactness',
    items: [
      { id: '4.C.3.b.7', name: 'Importance of Repeating Same Tasks', sign: 1 },
      { id: '4.C.3.b.4', name: 'Importance of Being Exact or Accurate', sign: 1 },
    ],
  },
];

export const SETTING_IDS = SETTINGS.map((s) => s.id);
export const SETTING_BY_ID = Object.fromEntries(SETTINGS.map((s) => [s.id, s]));

/** Rescale an O*NET Context value (1-5) to 0-1, reversing it when sign is -1. */
export const normaliseContext = (value, sign = 1) => {
  const n = Math.min(1, Math.max(0, (Number(value) - 1) / 4));
  return sign < 0 ? 1 - n : n;
};
