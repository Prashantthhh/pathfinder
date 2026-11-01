// Allow-list of external links. Only well-known pages whose URLs were checked
// (HTTP 200) when this file was written. Never add a link that is not verified.

export const ROADMAP_LINKS = {
  frontend:         { label: 'Frontend roadmap (roadmap.sh)',        url: 'https://roadmap.sh/frontend' },
  backend:          { label: 'Backend roadmap (roadmap.sh)',         url: 'https://roadmap.sh/backend' },
  'full-stack':     { label: 'Full Stack roadmap (roadmap.sh)',      url: 'https://roadmap.sh/full-stack' },
  android:          { label: 'Android roadmap (roadmap.sh)',         url: 'https://roadmap.sh/android' },
  ios:              { label: 'iOS roadmap (roadmap.sh)',             url: 'https://roadmap.sh/ios' },
  'data-analyst':   { label: 'Data Analyst roadmap (roadmap.sh)',    url: 'https://roadmap.sh/data-analyst' },
  'data-scientist': { label: 'AI & Data Scientist roadmap (roadmap.sh)', url: 'https://roadmap.sh/ai-data-scientist' },
  'data-engineer':  { label: 'Data Engineer roadmap (roadmap.sh)',   url: 'https://roadmap.sh/data-engineer' },
  mlops:            { label: 'MLOps roadmap (roadmap.sh)',           url: 'https://roadmap.sh/mlops' },
  'ai-engineer':    { label: 'AI Engineer roadmap (roadmap.sh)',     url: 'https://roadmap.sh/ai-engineer' },
  'cyber-security': { label: 'Cyber Security roadmap (roadmap.sh)',  url: 'https://roadmap.sh/cyber-security' },
  devops:           { label: 'DevOps roadmap (roadmap.sh)',          url: 'https://roadmap.sh/devops' },
  aws:              { label: 'AWS roadmap (roadmap.sh)',             url: 'https://roadmap.sh/aws' },
  'ux-design':      { label: 'UX Design roadmap (roadmap.sh)',       url: 'https://roadmap.sh/ux-design' },
  'game-developer': { label: 'Game Developer roadmap (roadmap.sh)',  url: 'https://roadmap.sh/game-developer' },
  qa:               { label: 'QA roadmap (roadmap.sh)',              url: 'https://roadmap.sh/qa' },
  'product-manager':{ label: 'Product Manager roadmap (roadmap.sh)', url: 'https://roadmap.sh/product-manager' },
};

export function resolveLinks(keys = []) {
  return keys.map((k) => ROADMAP_LINKS[k]).filter(Boolean);
}
