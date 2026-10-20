export interface Milestone {
  /** Seconds on the stopwatch */
  t: number;
  label: string;
  title: string;
  body: string;
  source?: string;
  answer: string;
  link: { href: string; label: string };
}

/** The first seven seconds of a visit, with the research behind each moment. */
export const MILESTONES: Milestone[] = [
  {
    t: 0.05,
    label: '0.05s',
    title: 'They’ve already judged the look.',
    body: 'In a 2006 study, people rated a website’s visual appeal after seeing it for 50 milliseconds. Those snap ratings closely matched how they rated it with more time.',
    source: 'Lindgaard et al., Behaviour & Information Technology, 2006',
    answer: 'Art direction and visual design that earn trust at a glance.',
    link: { href: '/services/#design', label: 'Design' },
  },
  {
    t: 1,
    label: '1s',
    title: 'Any slower and the spell breaks.',
    body: 'About one second is the limit for a person’s flow of thought to stay uninterrupted while they wait on a screen.',
    source: 'Jakob Nielsen, Usability Engineering, 1993',
    answer: 'Lean, hand-built code. No bloated themes, no plugin pile-ups.',
    link: { href: '/services/#development', label: 'Development' },
  },
  {
    t: 2.5,
    label: '2.5s',
    title: 'Google is timing you too.',
    body: 'Largest Contentful Paint marks when your main content appears. Google rates 2.5 seconds or less as good, and Core Web Vitals feed into how pages rank.',
    source: 'Google Search Central, Core Web Vitals',
    answer: 'Core Web Vitals in the green, measured before every launch.',
    link: { href: '/services/#search', label: 'SEO' },
  },
  {
    t: 3,
    label: '3s',
    title: 'Half of mobile visitors are gone.',
    body: '53% of mobile site visits are abandoned when a page takes longer than three seconds to load.',
    source: 'Google / DoubleClick, The Need for Mobile Speed, 2016',
    answer: 'Performance budgets, modern image formats and edge hosting on every build.',
    link: { href: '/services/#development', label: 'Performance' },
  },
  {
    t: 5,
    label: '5s',
    title: 'Can they say what you do?',
    body: 'The five-second test is a classic usability method: show a page for five seconds, then ask what it was about. If people can’t answer, the message isn’t landing.',
    source: 'Five-second testing, a standard UX research method',
    answer: 'Clear messaging and page structure, written for your customers.',
    link: { href: '/services/#design', label: 'Content & UX' },
  },
  {
    t: 7,
    label: '7s',
    title: 'Stay or leave.',
    body: 'Seven seconds in, the first impression is set. How it looks, how fast it loads and how clearly it speaks have all been counted.',
    answer: 'That’s the window we design for, every time.',
    link: { href: '/work/', label: 'See the work' },
  },
];
