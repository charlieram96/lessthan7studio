export type Service = 'Web design' | 'Development' | 'SEO' | 'Brand identity' | 'E-commerce' | 'Content' | 'Web app';

export interface CaseDetail {
  title: string;
  body: string;
}

export interface Project {
  slug: string;
  name: string;
  industry: string;
  /** Filter group on the work index */
  group: 'Legal & finance' | 'Health' | 'Hospitality & real estate' | 'Media & marketing' | 'Education' | 'Beauty & photography';
  location: string;
  /** Public link shown on the site */
  liveUrl: string;
  displayUrl: string;
  services: Service[];
  /** One sentence for cards and meta descriptions */
  summary: string;
  /** Accent pulled from the client's own palette */
  accent: string;
  /** Text color that reads on the accent */
  accentInk: string;
  /** Case study body */
  brief: string;
  approach: string;
  details: CaseDetail[];
  outcomes: string[];
  stack: string[];
  keyQuote?: string;
  /** Optional copy for the phone section */
  mobileNote?: string;
  /** Optional sentence under the palette and type */
  designNote?: string;
  languages?: string;
  /** Measured with Lighthouse; filled from src/data/audit/<slug>.json when available */
  featured?: boolean;
}

export const PROJECTS: Project[] = [
  {
    slug: 'pigeon-post',
    name: 'Pigeon Post Media',
    industry: 'Social media agency',
    group: 'Media & marketing',
    location: 'Miami, FL',
    liveUrl: 'https://www.pigeonpost.media/',
    displayUrl: 'pigeonpost.media',
    services: ['Web design', 'Development', 'SEO'],
    summary:
      'An illustrated rooftop world for a Miami social media agency: seven departments on seven floors, with an elevator for a menu.',
    accent: '#cf9670',
    accentInk: '#2a1720',
    brief:
      'Pigeon Post is a Miami media house that writes, shoots, designs, posts and grows brands, with seven departments under one roof. An agency that sells attention needed a website people would remember.',
    approach:
      '<p>We built them a building. The homepage is an illustrated rooftop above a city skyline, complete with water towers, a coop and pigeons along the ledge. Each of the seven departments has its own floor, and an elevator panel, from the roof down to the lobby, works as the navigation.</p><p>The postal theme runs through every detail: stamp-edged buttons, a <strong>Send a letter</strong> contact form, typewriter and handwritten accents, and a sound toggle for the full effect. Visitors in a hurry can <strong>take the stairs</strong> instead.</p>',
    details: [
      {
        title: 'An elevator for a menu',
        body: 'Floor buttons from R to L jump straight to each department, so a long story stays easy to navigate.',
      },
      {
        title: 'Take the stairs',
        body: 'A plain, fast route through the content for anyone who would rather skip the ride.',
      },
      {
        title: 'Four typefaces, one voice',
        body: 'Fraunces, Jost, Courier Prime and a handwritten script, each with a clear job: headlines, text, postmarks and notes.',
      },
      {
        title: 'A letter, not a form',
        body: 'The contact form reads like a letter to the agency and asks which departments a brand needs before the first call.',
      },
    ],
    outcomes: [
      'Seven departments, each with its own floor and its own story.',
      'An agency site that shows its creativity instead of describing it.',
    ],
    stack: ['Vite', 'Lenis', 'Canvas', 'Vercel'],
    keyQuote: 'Social media, sent first class.',
    designNote:
      'Warm terracotta and sunset tones carry the illustration, with typography that switches voice from headline to postmark.',
  },
  {
    slug: 'bland-law',
    name: 'Bland Law',
    industry: 'Law firm',
    group: 'Legal & finance',
    location: 'Miami & Boca Raton, FL',
    liveUrl: 'https://blandlaw.legal/',
    displayUrl: 'blandlaw.legal',
    services: ['Web design', 'Development', 'SEO'],
    summary:
      'A bilingual website for a Miami family and criminal defense firm, rebuilt from a stock-photo template into a site that feels like meeting the attorney.',
    accent: '#d49563',
    accentInk: '#0f1724',
    brief:
      'Bland Law, P.A. has represented families and defendants across Miami-Dade, Broward and Palm Beach counties since 2013, in English and Spanish. Its old site looked like many law firm templates: a stock photo of a suit and a generic welcome.',
    approach:
      '<p>We built the new site around the person clients actually hire. Gerald R. Bland stands in front of the Miami skyline at dusk, with the firm’s name set behind him in an oversized serif. Navy, slate and a single copper accent replace stock imagery with a look that feels established without feeling cold.</p><p>Every page exists in English and Spanish, linked so Google shows each visitor the right version. Practice areas are written in plain language, and a consultation form asks for the topic, the office and the preferred language before anyone hits send.</p>',
    details: [
      {
        title: 'Bilingual, properly',
        body: 'English and Spanish pages connected with hreflang tags and an x-default, plus a language switch in the header.',
      },
      {
        title: 'Schema for a law firm',
        body: 'LegalService structured data names the attorney and both offices, so search engines can match the firm to local searches.',
      },
      {
        title: 'A form that sorts itself',
        body: 'Requests arrive tagged by topic, office and language, and a hidden honeypot field keeps spam bots out.',
      },
      {
        title: 'Static and fast',
        body: 'Built with Astro and served from Netlify’s global network, so pages load quickly on any phone.',
      },
    ],
    outcomes: [
      'Lighthouse scores of 99 to 100 on mobile for performance, accessibility, best practices and SEO.',
      'One site in two languages, serving clients across three counties.',
      'A consultation button in the header of every page.',
    ],
    stack: ['Astro', 'Netlify'],
    keyQuote: 'Focused on solutions. Driven by results.',
    designNote: 'Marcellus for headlines and Manrope for text, with one copper accent on deep navy.',
  },
  {
    slug: 'hungry-house-media',
    name: 'Hungry House Media',
    industry: 'Restaurant content studio',
    group: 'Media & marketing',
    location: 'Miami, FL',
    liveUrl: 'https://hungryhousemedia.com/',
    displayUrl: 'hungryhousemedia.com',
    services: ['Web design', 'Development', 'SEO'],
    summary:
      'A diner-themed site for a Miami studio that makes short-form video for restaurants, built like a menu you can order from.',
    accent: '#b3271a',
    accentInk: '#f4e9d0',
    brief:
      'Hungry House Media makes Reels and Stories for South Florida restaurants. Its customers are restaurant owners, people who think in tables, covers and menus, not marketing jargon.',
    approach:
      '<p>So the whole site speaks their language. The navigation reads <strong>The kitchen</strong>, <strong>Dining room</strong>, <strong>The menu</strong> and <strong>House rules</strong>. Monthly packages are ordered like courses: the starter, the main and the tasting menu. A hand-drawn moka pot that doubles as a house sits under the headline: We feed your feed.</p><p>The palette comes straight from a classic diner, with oxblood red, cream and a cool tile blue, and the section titles follow a night out, from <em>Pick your table</em> to <em>Your table is ready</em>.</p>',
    details: [
      {
        title: 'Packages as a menu',
        body: 'Three monthly packages, ordered like courses, with prices published in structured data as an offer catalog.',
      },
      {
        title: 'English and Spanish',
        body: 'Full Spanish pages with hreflang tags, for restaurant owners across Miami.',
      },
      {
        title: 'Type with an appetite',
        body: 'Gasoek One for headlines, Barlow Condensed for labels and Instrument Serif for flavor.',
      },
      {
        title: 'Built for phones between services',
        body: 'Restaurant owners check things on the go, so the site stays light and quick on mobile.',
      },
    ],
    outcomes: [
      'Lighthouse 96 for mobile performance and 100 for accessibility, best practices and SEO.',
      'Three packages a restaurant owner can understand at a glance.',
    ],
    stack: ['Astro', 'Netlify'],
    keyQuote: 'We feed your feed.',
    designNote: 'A diner palette of oxblood, cream and tile blue, with a hand-drawn illustration at the center.',
  },
  {
    slug: 'latin-music-mastery',
    name: 'Latin Music Mastery',
    industry: 'Online music school',
    group: 'Education',
    location: 'Online',
    liveUrl: 'https://latinmusicmastery.com/',
    displayUrl: 'latinmusicmastery.com',
    services: ['Web design', 'Development', 'SEO', 'Web app'],
    summary:
      'A launch site for an online school of Latin music, where the clave keeps time and visitors can hear the groove before they join.',
    accent: '#f2622e',
    accentInk: '#120c15',
    brief:
      'Latin Music Mastery teaches son, mambo, bolero, salsa, timba and more across twelve instruments, with lessons from working musicians and a practice app, PlaySense, that listens while students play. Before launch, it needed a site that could build a waitlist and prove the teaching is the real thing.',
    approach:
      '<p>The homepage opens on oversized piano keys and a promise: Learn from the masters of la música latina. Then the site teaches before it sells. An interactive clave lets visitors switch between son 3-2, 2-3 and rumba patterns and change the tempo, because everything in this music starts with the clave.</p><p>Four countries, Cuba, Puerto Rico, the Dominican Republic and Colombia, show where each style comes from, and the instructors are introduced by name. The page ends on the line that sells the whole idea: The band is ready. Your part is missing.</p>',
    details: [
      {
        title: 'A clave you can play',
        body: 'Son 3-2, 2-3 and rumba patterns with tempo controls, right on the homepage.',
      },
      {
        title: 'Bilingual by design',
        body: 'English and Spanish versions with a language switch in the header.',
      },
      {
        title: 'Two chances to join',
        body: 'Email capture in the hero and again at the end, with founding-member pricing stated up front.',
      },
      {
        title: 'Lessons on the page',
        body: 'Five video moments put real playing in front of visitors, on a Next.js and React build hosted on Vercel.',
      },
    ],
    outcomes: [
      'Lighthouse 98 for desktop performance and 100 for SEO and best practices.',
      'Twelve instruments and eighteen maestros introduced on one page.',
    ],
    stack: ['Next.js', 'React', 'Vercel'],
    keyQuote: 'The band is ready. Your part is missing.',
    designNote: 'Big Shoulders for poster-sized headlines, Instrument Serif for the Spanish flourishes and Hanken Grotesk for reading.',
  },
  {
    slug: 'marketink',
    name: 'Market Ink Strategies',
    industry: 'Marketing agency',
    group: 'Media & marketing',
    location: 'Doral, FL',
    liveUrl: 'https://www.marketinkstrategies.com/',
    displayUrl: 'marketinkstrategies.com',
    services: ['Web design', 'Development', 'SEO'],
    summary:
      'A marketing atelier’s website where visitors stir the ink themselves: a live WebGL hero for a Doral agency that builds brands.',
    accent: '#5b5fd0',
    accentInk: '#efebe4',
    brief:
      'Market Ink Strategies is a marketing atelier in Doral handling strategy, brand identity, websites, ads, SEO, social, content, email, events and production. Ten disciplines are a lot to explain on one homepage.',
    approach:
      '<p>We started from the name. The homepage opens on a live pool of indigo ink that moves with your cursor, under a headline that makes the same promise: Leave your mark on the market. The idea carries through the page, from the first drop to the full spread.</p><p>The ten services sit in one section under a single line, Ten disciplines. One atelier. A project form asks about services and budget up front, so every inquiry arrives ready for a real conversation.</p>',
    details: [
      {
        title: 'Ink you can stir',
        body: 'A WebGL canvas renders the ink in real time and responds to the cursor.',
      },
      {
        title: 'Calm, smooth scrolling',
        body: 'Lenis smooths the scroll so motion feels deliberate rather than floaty.',
      },
      {
        title: 'Qualified inquiries',
        body: 'The project form asks for services and budget, so the team knows what each lead needs before the first call.',
      },
      {
        title: 'Local search signals',
        body: 'ProfessionalService structured data with the Doral address helps the atelier appear in local results.',
      },
    ],
    outcomes: [
      'Lighthouse 100 for SEO and best practices.',
      'A brand promise visitors can interact with in the first second.',
    ],
    stack: ['Vite', 'WebGL', 'Lenis', 'Netlify'],
    keyQuote: 'Leave your mark on the market.',
    designNote: 'Indigo ink on warm paper, with Inter Tight for text and Instrument Serif for the flourish.',
  },
  {
    slug: 'plaza-seafood',
    name: 'Plaza Seafood Market',
    industry: 'Fish market and restaurant',
    group: 'Hospitality & real estate',
    location: 'Allapattah, Miami',
    liveUrl: 'https://plazaseafoodmarket.com/',
    displayUrl: 'plazaseafoodmarket.com',
    services: ['Web design', 'Development', 'SEO'],
    summary:
      'A new website for a family fish market that has served Allapattah since 1980: today’s catch, the walk-up kitchen and wholesale, in English and Spanish.',
    accent: '#cf9011',
    accentInk: '#112316',
    brief:
      'Plaza Seafood Market has been Allapattah’s fish market and walk-up kitchen since 1980. Regulars line up for fish cleaned at the counter or fried at the window, and restaurants buy wholesale. The old site was a standard template: one photo, small type and four tabs, all in English.',
    approach:
      '<p>The new homepage opens at sunset on the water, where the fish comes from, with the line that sums up the business: From the dock to your door. Calling, directions and online ordering are one tap away, next to today’s hours and the market’s Google rating.</p><p>Inside, the site explains the four ways they cut a fish, shows today’s catch, lays out the kitchen’s menu and gives wholesale buyers their own path. All of it is available in Spanish, for the many regulars who prefer it.</p>',
    details: [
      {
        title: 'Open now',
        body: 'A badge on the homepage says whether the market is open right now, and until when.',
      },
      {
        title: 'Cuts in both languages',
        body: 'Each cut is labeled the way it’s ordered at the counter: whole and entero, steak and rueda, filet and filete, butterfly and minuta.',
      },
      {
        title: 'Restaurant schema',
        body: 'Restaurant structured data with the address helps the market show up in map and local results.',
      },
      {
        title: 'Wholesale gets its own door',
        body: 'Restaurants and caterers have a dedicated section instead of digging through the retail menu.',
      },
    ],
    outcomes: [
      'Lighthouse 100 for accessibility, best practices and SEO.',
      'Calling, directions and online ordering from the first screen.',
      'Forty-six years of history, with a website that shows it.',
    ],
    stack: ['GSAP', 'Netlify'],
    keyQuote: 'From the dock to your door.',
    designNote: 'Deep sea greens and a golden-hour accent, with Jost for text and a vintage newspaper face for headlines.',
  },
  {
    slug: 'perez-realty',
    name: 'Perez Realty Team',
    industry: 'Real estate team',
    group: 'Hospitality & real estate',
    location: 'Miami-Dade & Broward',
    liveUrl: 'https://perezrealtyteam.com/',
    displayUrl: 'perezrealtyteam.com',
    services: ['Web design', 'Development', 'SEO'],
    summary:
      'A warm, bilingual website for a family real estate team, built around the question every buyer starts with: where in Miami?',
    accent: '#3f8aa6',
    accentInk: '#0d1a20',
    brief:
      'Perez Realty Team is a family of licensed REALTORS® who have helped buyers and sellers in Miami-Dade and Broward since 2006, growing almost entirely through referrals. The site had to feel as personal as their service and work as hard as a listing portal.',
    approach:
      '<p>The homepage asks the question every buyer starts with, Where in Miami?, in a tall Bodoni headline over a real Miami home, with a search bar for city, neighborhood, ZIP code or MLS number right underneath. Homes the team is showing now come next, then the family story: a business that grew because clients talked about it.</p><p>Buying, selling and mortgage help each get a clear path, neighborhoods are covered block by block, and the whole site is available in Spanish, with hreflang tags so search engines send every visitor to the right language.</p>',
    details: [
      {
        title: 'Search first',
        body: 'City, neighborhood, ZIP or MLS search with a price filter, right in the hero.',
      },
      {
        title: 'Real estate schema',
        body: 'RealEstateAgent structured data names the team and lists all three offices.',
      },
      {
        title: 'Ver en español',
        body: 'Spanish pages linked with hreflang, for the many families the team serves in Spanish.',
      },
      {
        title: 'Referrals as proof',
        body: 'Instead of stock testimonials, the site shows homes the team has handed over and the people who sent the next family.',
      },
    ],
    outcomes: [
      'Lighthouse 98 for desktop performance and 100 for accessibility and best practices.',
      'Three offices, two languages and one family brand.',
    ],
    stack: ['Next.js', 'React', 'Tailwind CSS', 'Vercel'],
    keyQuote: 'Where in Miami?',
    designNote: 'Bodoni Moda for headlines and Archivo for text, with deep teal accents.',
  },
  {
    slug: 'south-med-research',
    name: 'South Miami Medical & Research Group',
    industry: 'Clinical research site',
    group: 'Health',
    location: 'South Miami, FL',
    liveUrl: 'https://southmedandresearch.com/',
    displayUrl: 'southmedandresearch.com',
    services: ['Web design', 'Development'],
    summary:
      'A warm, trustworthy site for a clinical research group with two audiences: patients who might join a study, and the sponsors who run them.',
    accent: '#c9a96e',
    accentInk: '#2b241f',
    brief:
      'South Miami Medical & Research Group runs clinical studies with pharmaceutical companies, backed by physicians, nurses, a research staff and an in-house lab. Its website has two very different readers: patients deciding whether to volunteer, and sponsors deciding where to place a study.',
    approach:
      '<p>We split the paths on the first screen: <strong>See if you qualify</strong> for patients and <strong>For sponsors</strong> for the companies that fund research. Warm stone tones, gold and Cormorant Garamond make the site feel like a well-run practice rather than a lab, which matters when you’re asking someone to trust you with their health.</p><p>The facts sponsors check first, like the CLIA-certified lab, on-site sample processing and the team behind each study, are in plain view, and the site works in English and Spanish.</p>',
    details: [
      {
        title: 'Two audiences, two doors',
        body: 'Patients and sponsors each get a clear first step from the hero, without competing calls to action.',
      },
      {
        title: 'Credentials up front',
        body: 'The lab’s CLIA ID and site capabilities sit on the homepage, where sponsors look first.',
      },
      {
        title: 'English and Spanish',
        body: 'A language switch in the header for patients across South Florida.',
      },
      {
        title: 'A first visit made easy',
        body: 'The address and a directions link are on the homepage, because volunteers have to find the clinic.',
      },
    ],
    outcomes: [
      'Separate paths for patients and sponsors from the first screen.',
      'Lab credentials visible without a single click.',
    ],
    stack: ['Lenis', 'Netlify'],
    keyQuote: 'Clinical research in the heart of South Miami.',
    designNote: 'Stone, sand and gold with Cormorant Garamond and Hanken Grotesk.',
  },
  {
    slug: 'snipers-trading-academy',
    name: 'Snipers Trading Academy',
    industry: 'Trading education',
    group: 'Education',
    location: 'Online',
    liveUrl: 'https://www.sniperstradingacademy.com/',
    displayUrl: 'sniperstradingacademy.com',
    services: ['Web design', 'Development'],
    summary:
      'A sharp, dark landing page for an options trading academy that turns a complex membership into a clear path from first lesson to first team.',
    accent: '#d6a94a',
    accentInk: '#0b0e17',
    brief:
      'Snipers Trading Academy teaches options trading through a structured curriculum and live classes three times a week, inside a membership that also includes a referral program. That is a lot to explain, and trading education has to earn trust quickly.',
    approach:
      '<p>We built the page like a trading desk at night: deep navy, gold accents and a crest at the center. The headline covers the curriculum in one line, with a verb that cycles between trade, read and size the market, and the hero shows the member app with live class reminders and progress updates.</p><p>Below, six curriculum topics build on each other in order, one membership card lists everything included, and a frequently asked questions section answers the hard questions directly, including cost, live classes and how referrals work.</p>',
    details: [
      {
        title: 'A headline that changes its verb',
        body: 'Learn to trade, read and size the market: one line that covers the whole curriculum.',
      },
      {
        title: 'Six topics, in order',
        body: 'From options fundamentals to risk management, each topic builds on the last.',
      },
      {
        title: 'One membership',
        body: 'A single plan with everything included, so there are no tiers to compare.',
      },
      {
        title: 'Straight answers',
        body: 'The FAQ covers experience, live classes, cost and referrals before anyone has to ask.',
      },
    ],
    outcomes: [
      'Lighthouse 99 for desktop performance and 100 for SEO and best practices.',
      'A complex membership explained in five sections.',
    ],
    stack: ['Next.js', 'React', 'Tailwind CSS', 'Vercel'],
    keyQuote: 'Learn to read the market like a sniper.',
    designNote: 'Unbounded for headlines and Geist Mono for data, gold on midnight navy.',
  },
  {
    slug: 'air-studios',
    name: 'AIR Studios',
    industry: 'Wedding photographer',
    group: 'Beauty & photography',
    location: 'Miami & destination weddings',
    liveUrl: 'https://airstudiosexperience.com/',
    displayUrl: 'airstudiosexperience.com',
    services: ['Web design', 'Development'],
    summary:
      'A cinematic portfolio for a Miami fine-art wedding photographer, opening on film and set in classical serif type.',
    accent: '#b48a72',
    accentInk: '#1e1612',
    brief:
      'AIR Studios is the fine-art wedding and editorial photography studio of Abner Isaias Reyes in Miami. His work is light, airy and painterly, so the website had to feel like his photographs: quiet, elegant and unhurried.',
    approach:
      '<p>The homepage opens on a film, with a single line set in wide classical capitals: Luxury destination wedding and editorial photographer. The navigation stays out of the way, and the site moves through four simple chapters: about, portfolio, the experience of working together, and contact.</p><p>EB Garamond and a refined display serif give the type the same old-world finish as his film-emulation photographs, while GSAP-driven scrolling reveals each image at its own pace.</p>',
    details: [
      {
        title: 'Film first',
        body: 'An autoplaying background film sets the mood before a single word is read.',
      },
      {
        title: 'Classical type',
        body: 'EB Garamond with Orpheus and Meno, chosen to match the painterly, old-world look of the work.',
      },
      {
        title: 'Unhurried motion',
        body: 'GSAP and ScrollTrigger reveal photographs gradually, like turning the pages of an album.',
      },
      {
        title: 'The experience, explained',
        body: 'A dedicated Experience page tells couples what working together looks like before they reach out.',
      },
    ],
    outcomes: [
      'Lighthouse 100 for accessibility and SEO.',
      'A portfolio that feels like the photographs in it.',
    ],
    stack: ['GSAP', 'Netlify'],
    keyQuote: 'Luxury destination wedding & editorial photographer.',
    designNote: 'Warm browns and soft neutrals pulled from the photography, set in classical serifs.',
  },
  {
    slug: 'miami-villas',
    name: 'Miami Villas',
    industry: 'Luxury vacation rentals',
    group: 'Hospitality & real estate',
    location: 'Miami, FL',
    liveUrl: 'https://miamivillas.com/',
    displayUrl: 'miamivillas.com',
    services: ['Web design', 'Development'],
    summary:
      'A resort-style site for a collection of private Miami estates built for big groups, from eight-bedroom villas to a fifteen-bedroom compound.',
    accent: '#4a9cc9',
    accentInk: '#0b1a22',
    brief:
      'Miami Villas rents private estates across Miami, from Coral Gables to Miami Shores, for families, celebrations, weddings and retreats. Guests are booking for large groups, so they need to compare properties quickly and feel the place before they inquire.',
    approach:
      '<p>The homepage opens on the real thing: palms, a pool and lounge chairs, with the name set in thin, elegant capitals over the scene. One button leads straight to the properties, and Book Now sits in the navigation on every page.</p><p>Each estate gets its own card and page, from Villa Rio Grande and Villa Azur to the fifteen-bedroom compound, so groups can compare space and amenities before they get in touch.</p>',
    details: [
      {
        title: 'The property is the hero',
        body: 'Full-bleed photography of the estates does the selling, with typography kept light and out of the way.',
      },
      {
        title: 'Eight properties, one pattern',
        body: 'Every villa follows the same card and page layout, so comparing them is easy.',
      },
      {
        title: 'Booking one tap away',
        body: 'Book Now sits in the navigation on every page.',
      },
      {
        title: 'Light, airy type',
        body: 'Poiret One for the name, with DM Sans and Outfit for reading.',
      },
    ],
    outcomes: [
      'Lighthouse 98 for accessibility and 100 for SEO and best practices.',
      'Eight estates presented side by side for groups planning a stay.',
    ],
    stack: ['Netlify'],
    keyQuote: 'Luxury redefined.',
    designNote: 'Garden greens and pool blues taken from the estates themselves.',
  },
  {
    slug: 'newbula',
    name: 'Newbula',
    industry: 'Healthcare software',
    group: 'Health',
    location: 'United States',
    liveUrl: 'https://newbula.ai/',
    displayUrl: 'newbula.ai',
    services: ['Web design', 'Development'],
    summary:
      'A calm, clear marketing site for a healthcare operations platform, explaining AI voice agents, scribing and quality tracking to clinics and health plans.',
    accent: '#7aa7e8',
    accentInk: '#0b1221',
    brief:
      'Newbula is one platform for the operational work behind patient care: calls, faxes, visit notes, rides and quality reporting, for medical centers, health plans, pharmacies and adult day cares. The product does a lot. The website had to make it feel simple.',
    approach:
      '<p>We designed the homepage around one promise, Healthcare operations, handled, and showed the platform working instead of describing it. Small activity cards for a routed lab result, a booked ride and a drafted visit note drift across the hero.</p><p>Below, the site walks through the suite one tool at a time, shows how everything writes to the same patient record, and answers security questions directly, because healthcare buyers ask those first.</p>',
    details: [
      {
        title: 'Product moments, not stock photos',
        body: 'Activity cards show the platform at work: a lab result routed, a ride booked, a note drafted, a care gap closed.',
      },
      {
        title: 'Security up front',
        body: 'A section on protected health information answers the first question every healthcare buyer asks.',
      },
      {
        title: 'Built on Next.js',
        body: 'A React and Next.js site on Vercel with smooth scrolling and a product film.',
      },
      {
        title: 'Plain-language answers',
        body: 'The questions teams ask most are answered right on the homepage.',
      },
    ],
    outcomes: [
      'Lighthouse 100 for best practices.',
      'Five products explained on one calm, readable page.',
    ],
    stack: ['Next.js', 'React', 'Vercel'],
    keyQuote: 'Healthcare operations, handled.',
    designNote: 'Cool clinical blues on near-white, set in Geist.',
  },
  {
    slug: 'jany-did-my-hair',
    name: 'Jany Did My Hair',
    industry: 'Bridal hairstylist',
    group: 'Beauty & photography',
    location: 'Miami & destination weddings',
    liveUrl: 'https://janydidmyhair.com/',
    displayUrl: 'janydidmyhair.com',
    services: ['Web design', 'Development'],
    summary:
      'An editorial, black-and-white website for a Miami bridal hairstylist, built to feel like the pages of a wedding magazine.',
    accent: '#d8d0c4',
    accentInk: '#1a1a1a',
    brief:
      'Jany styles hair for brides in Miami and at destination weddings, and teaches other stylists her signature techniques. Brides often find her after scrolling through dozens of portfolios, so the site has to feel special in the first few seconds.',
    approach:
      '<p>We gave her portfolio the treatment of a fashion editorial: full-bleed black-and-white imagery, a background film on the homepage and large serif headlines. The headline promises an experience rather than a service, because that is what brides are buying.</p><p>The site leads with the portfolio, introduces Jany, and gives her teaching business its own Education section. Scroll-linked motion built with GSAP keeps the pages alive without competing with the photographs.</p>',
    details: [
      {
        title: 'Editorial type',
        body: 'Sauvage for headlines with Aktiv and Termina underneath, a pairing that reads like a bridal magazine.',
      },
      {
        title: 'Motion that serves the photos',
        body: 'GSAP and ScrollTrigger reveal images and words as you scroll, timed around the photography.',
      },
      {
        title: 'Two businesses, two paths',
        body: 'Classes for stylists live in their own Education section, so brides and students each find their way.',
      },
      {
        title: 'Accessible despite the drama',
        body: 'A video-led, image-heavy design that still scores 100 for accessibility in Lighthouse.',
      },
    ],
    outcomes: [
      'Lighthouse 100 for accessibility and best practices on mobile and desktop.',
      'A portfolio that puts the work first.',
    ],
    stack: ['GSAP', 'Netlify'],
    keyQuote: 'Indulge in a lavish bridal beauty experience.',
    designNote: 'A monochrome palette that lets wedding photography carry all the color.',
  },
];


export const projectBySlug = (slug: string) => PROJECTS.find((p) => p.slug === slug);

export function nextProject(slug: string): Project {
  const i = PROJECTS.findIndex((p) => p.slug === slug);
  return PROJECTS[(i + 1) % PROJECTS.length];
}

export const img = (slug: string, file: string) => `/work/${slug}/${file}`;

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
/** Spelled-out count for the start of a sentence. */
export const countWord = (n: number) => WORDS[n] ?? String(n);
