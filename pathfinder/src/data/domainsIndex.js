import domainData from './domains.json';
import careers from './careers.json';

export const DOMAINS = domainData.domains;
export const DOMAIN_GROUPS = domainData.groups;
export const DOMAIN_BY_ID = Object.fromEntries(DOMAINS.map((d) => [d.id, d]));
export const domainLabel = (id) => DOMAIN_BY_ID[id]?.label ?? id;

/** Number of careers in each domain (0 for domains with no career yet). */
export const CAREER_COUNT_BY_DOMAIN = Object.fromEntries(
  DOMAINS.map((d) => [d.id, careers.filter((c) => c.domain === d.id).length]),
);
