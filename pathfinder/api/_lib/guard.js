// A last check on the model's answer before the student sees it. The rules in the system prompt ask the
// model not to give salaries, dates or links; this catches the common ways it might anyway. It is a net,
// not a guarantee: the product still labels every live reply "AI-generated".
import { MAX_ANSWER_CHARS } from './rules.js';

const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const MONEY = /(₹|\brs\.?\s*\d|\binr\b|\blakhs?\b|\blpa\b|\bcrores?\b|\$\s*\d|\busd\b|\bper\s+(?:month|annum|year)\b)/i;
const DATES = new RegExp(`\\b${MONTH}\\b\\.?\\s*(?:\\d{1,2}\\b|,?\\s*20\\d\\d)|\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}\\b|\\b20[2-3]\\d\\b`, 'i');
const LINK_MD = /\[([^\]]*)\]\((?:https?:\/\/|www\.)[^)]*\)/g;
const LINK = /(?:https?:\/\/|www\.)\S+/gi;

/** @returns {{ ok: true, text: string } | { ok: false, reason: string }} */
export function checkAnswer(raw) {
  if (typeof raw !== 'string') return { ok: false, reason: 'empty' };
  // some reasoning models put their thinking in <think> tags: never show it
  let t = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/i, '').replace(LINK_MD, '$1').replace(LINK, '').replace(/[*_`#]+/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!t) return { ok: false, reason: 'empty' };
  if (MONEY.test(t)) return { ok: false, reason: 'filtered' };
  if (DATES.test(t)) return { ok: false, reason: 'filtered' };
  if (t.length > MAX_ANSWER_CHARS) t = `${t.slice(0, MAX_ANSWER_CHARS - 1).replace(/\s+\S*$/, '')}…`;
  return { ok: true, text: t };
}
