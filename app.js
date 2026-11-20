/* ==========================================================================
   UNBOUGHT — app.js
   Vanilla JavaScript for the Unbought community prototype.

   Everything is stored in one versioned localStorage key. No network calls,
   no analytics, no third-party code. All user-generated text is inserted with
   textContent / value assignments rather than HTML strings, so a saved listing
   can never inject markup into the page.

   Contents:
     01. Data & constants
     02. State, storage & small helpers
     03. Services & goods directory
     04. Posting a listing
     05. Pledge & digital signature
     06. Membership tracks
     07. Tabs, navigation & page polish
     08. Dialogs, land inquiries & reset
     09. Initialization
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     01. Data & constants
     ------------------------------------------------------------------------ */
  const STORAGE_KEY = 'unbought:v1';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const reportEvidenceDrafts = new WeakMap();
  const reportEvidencePending = new WeakMap();
  const postPhotoDrafts = new WeakMap();
  const postPhotoPending = new WeakMap();
  let reportDialog = null;

  // Basic Necessities are a closed list for limited-access tracks and safety
  // limits. Groups may choose how mutual aid happens, not what counts as a
  // luxury or nice to have.
  const BASIC_NECESSITIES_COPY = 'Food, Health Care, Dental, Mental Health, Shelter, Clothing, Gas Cards, Uber Gift cards, spot on the waitlist for land, access to the Academy.';
  const BASIC_NECESSITIES_NOTE = `${BASIC_NECESSITIES_COPY} No luxury items or nice to haves. Groups can decide how mutual aid will work.`;

  // An alliance is a voluntary link between other groups in the Unbought
  // network. The groups themselves decide whether to accept the alliance.
  const ALLIANCE_COPY = 'Alliances are other groups within the Unbought network. Groups decide whether to accept an alliance between them.';

  // Sample newsboard posts shared by the public site and the member dashboard.
  // A blog service will replace this list in the live site.
  const NEWS_POSTS = Object.freeze([
    {
      date: '2026-11-19',
      label: 'Nov 19, 2026',
      tag: 'Rollout update',
      title: 'Where Unbought stands, and what comes next',
      body: 'We are finalizing the structure of Unbought and the way the movement will work. Once that is settled, we will set up the Unbought donation fund, server, blog service, and mailing service so we can roll out the beta version starting in the Poconos. If you live in the Poconos, you will be free to use Unbought and will be asked to submit feedback and send pictures for the social media campaign. We will roll out the full site on the vernal equinox, March 20, 2027, at 4:25pm.'
    },
    {
      date: '2026-11-18',
      label: 'Nov 18, 2026',
      tag: 'The beta',
      title: 'Why we are beginning in the Poconos',
      body: 'Unbought will begin where neighbors can meet, trade skills, share goods, and tell us plainly what is working. The beta is a chance to learn together before the full rollout, not a finished product. Poconos neighbors will be invited to use it freely, send feedback, and share photos for the social media campaign.'
    },
    {
      date: '2026-11-17',
      label: 'Nov 17, 2026',
      tag: 'The fund',
      title: 'What the Unbought donation fund is for',
      body: 'The Unbought donation fund is meant to hold every cent that comes to the initiative: donations, Academy tuition where it applies, and fixed non-member prices for goods or labor. Members always receive the commons free. No money moves in this prototype; the fund is part of the plan for the live beta.'
    },
    {
      date: '2026-11-16',
      label: 'Nov 16, 2026',
      tag: 'Membership',
      title: 'Membership begins with a pledge',
      body: 'Unbought is built on consent. The pledge is how neighbors choose to join, offer what they can, and ask for help without turning survival into a transaction. Browsing stays open to everyone; participation in the commons belongs to pledged members.'
    },
    {
      date: '2026-11-15',
      label: 'Nov 15, 2026',
      tag: 'Membership',
      title: 'Seed, Beta Founder, and first-year badges',
      body: 'The first person of a profession to sign up in a ZIP code gets a profession Seed badge, such as Dancer Seed or Cleaning Seed. Everyone who signs from the database build until the 2027 vernal equinox is a Beta Founder. After rollout, non-seeds in the first official year get a 1st Year badge, and seeds in that year get a First year Founder badge. Beta labels stay pending until rollout so the first official year can be counted honestly.'
    },
    {
      date: '2026-11-14',
      label: 'Nov 14, 2026',
      tag: 'Academy',
      title: 'Learning now, giving back later',
      body: `The Academy is free for pledged members. Neighbors 15 and older who are not already working in the commons may learn with basic-necessities-only access. ${BASIC_NECESSITIES_NOTE} They promise part-time work for Unbought for one year after finishing, before their 25th birthday. Non-member tuition and any tuition obligation go to the Unbought donation fund.`
    },
    {
      date: '2026-11-13',
      label: 'Nov 13, 2026',
      tag: 'Community',
      title: 'Guidelines keep consent at the center',
      body: 'The Ten Consent Commandments set the tone: clear agreement, honest scope, and the right to stop. Concerns move through monthly review, care-circle support where it fits, and community decisions that never treat one person as judge and jury. Basic necessities stay protected, and serious or repeated harm can lead to exile and revocation after a member vote.'
    },
    {
      date: '2026-11-12',
      label: 'Nov 12, 2026',
      tag: 'The equinox',
      title: 'A gathering we hope to build',
      body: 'We hope to partner with an organization for a large festival somewhere in the United States on March 20, 2028, at 4:25pm Eastern, celebrating the movement and its Seed, Beta Founder, 1st Year, and First year Founder members. It is an intention, not a booked event. The moment matters because we will have been fully rolled out for a full year, meaning something must be working.'
    },
    {
      date: '2026-11-11',
      label: 'Nov 11, 2026',
      tag: 'Privacy',
      title: 'Personal details stay private',
      body: 'The pledge asks for the information a real community needs to know its members, but the public resume shows only chosen details. Legal name, addresses, birthdate, housing status, group, and report count are not part of that public picture. Until the live services are connected, this prototype keeps everything on the device.'
    },
    {
      date: '2026-11-10',
      label: 'Nov 10, 2026',
      tag: 'Getting involved',
      title: 'How neighbors can help before rollout',
      body: 'Talk to people in your profession, volunteer a skill, help find donated space or supplies, or simply tell neighbors what Unbought is trying to do. The first communities will be shaped by the people who show up early and stay honest with feedback.'
    }
  ]);

  const PILLARS = Object.freeze({
    building: {
      label: 'Building, Repair & Infrastructure',
      short: 'Building & Repair'
    },
    health: {
      label: 'Health, Wellness & Care',
      short: 'Health & Care'
    },
    daily: {
      label: 'Daily Life & Sustenance',
      short: 'Daily Life'
    },
    arts: {
      label: 'Arts, Culture & Education',
      short: 'Arts & Education'
    },
    civic: {
      label: 'Civic, Legal & Digital Support',
      short: 'Civic & Digital'
    },
    goods: {
      label: 'Free Physical Goods & Production',
      short: 'Free Goods'
    }
  });

  const EXCHANGES = Object.freeze({
    free: {
      label: '100% Free',
      short: '100% Free'
    },
    atcost: {
      label: 'Labor free · requester covers materials',
      short: 'Requester covers materials'
    }
  });

  // Goods are described by what they are (category), their condition, color and
  // brand, plus a few category-specific attributes. These definitions drive both
  // the directory filters and the posting form so the two stay in sync.
  const GOODS_CATEGORIES = Object.freeze({
    groceries: {
      label: 'Groceries & food',
      short: 'Groceries',
      note: 'Food must be within date, properly stored, and free of recalls.',
      facets: ['foodType', 'diet'],
      color: false,
      brand: false
    },
    household: {
      label: 'Household & cleaning',
      short: 'Household',
      note: 'Unopened or gently used household supplies are welcome.',
      facets: ['householdType'],
      color: false,
      brand: true
    },
    clothing: {
      label: 'Clothing & textiles',
      short: 'Clothing',
      note: 'Clean clothing, shoes, and fabric in any size.',
      facets: ['clothingSize', 'season'],
      color: true,
      brand: true
    },
    furniture: {
      label: 'Furniture',
      short: 'Furniture',
      note: 'Clean, sturdy furniture. Say whether pickup or delivery is available.',
      facets: ['room', 'material'],
      color: true,
      brand: true
    },
    tech: {
      label: 'Tech & electronics',
      short: 'Tech',
      note: 'Working devices, parts, and accessories. Clear personal data before gifting.',
      facets: ['deviceType'],
      color: true,
      brand: true
    },
    tools: {
      label: 'Tools & equipment',
      short: 'Tools',
      note: 'Hand tools, power tools, and garden gear in safe working order.',
      facets: ['toolType'],
      color: true,
      brand: true
    },
    solar: {
      label: 'Solar panels & energy',
      short: 'Solar',
      note: 'Panels, inverters, and mounting gear. State the wattage and whether the set is complete.',
      facets: ['panelType', 'wattage'],
      color: false,
      brand: true
    },
    materials: {
      label: 'Raw materials',
      short: 'Materials',
      note: 'Lumber, metal, fabric, plastic, paper, and other building or craft inputs.',
      facets: ['materialType'],
      color: false,
      brand: false
    },
    vehicles: {
      label: 'Vehicles',
      short: 'Vehicles',
      note: 'The item is free; the receiving neighbor covers registration and titling fees.',
      facets: ['vehicleType', 'fuel', 'titleStatus'],
      color: true,
      brand: true
    },
    'gift-cards': {
      label: 'Gift cards & vouchers',
      short: 'Gift cards',
      note: 'Independent small businesses and local co-ops only, never major corporations.',
      facets: ['cardType', 'businessType'],
      color: false,
      brand: false
    },
    other: {
      label: 'Other legal goods',
      short: 'Other',
      note: 'Anything else that is legal, safe, and free to give.',
      facets: [],
      color: true,
      brand: true
    }
  });

  const GOOD_CONDITIONS = Object.freeze({
    new: 'New / unopened',
    homemade: 'Homemade or grown',
    used: 'Used / gently used',
    refurbished: 'Refurbished or repaired',
    parts: 'For parts or restoration'
  });

  const GOOD_COLORS = Object.freeze([
    'Black', 'White', 'Gray', 'Silver', 'Red', 'Blue', 'Green', 'Yellow',
    'Orange', 'Purple', 'Pink', 'Brown / tan', 'Multicolor', 'Other'
  ]);

  // Category-specific fields. Keys are stored on listing.attributes so the
  // record stays structured for a future database instead of free-form text.
  const GOOD_FACETS = Object.freeze({
    foodType: { label: 'Food type', options: ['Produce', 'Pantry staples', 'Dairy & eggs', 'Frozen', 'Baked goods', 'Baby food'] },
    diet: { label: 'Diet', options: ['Standard', 'Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher'] },
    householdType: { label: 'Item type', options: ['Cleaning', 'Hygiene', 'Kitchen', 'Bedding', 'Laundry', 'Other'] },
    clothingSize: { label: 'Size', options: ['Adult', 'Child', 'Baby', 'Mixed / assorted'] },
    season: { label: 'Season', options: ['All season', 'Warm weather', 'Cold weather'] },
    room: { label: 'Room', options: ['Living room', 'Bedroom', 'Kitchen & dining', 'Office', 'Outdoor', 'Other'] },
    material: { label: 'Material', options: ['Wood', 'Metal', 'Fabric / upholstery', 'Plastic', 'Glass', 'Other'] },
    deviceType: { label: 'Device type', options: ['Computer & tablet', 'Phone', 'Audio', 'Camera & video', 'Gaming', 'Parts & accessories', 'Other'] },
    toolType: { label: 'Tool type', options: ['Hand tools', 'Power tools', 'Garden', 'Kitchen', 'Automotive', 'Other'] },
    panelType: { label: 'Panel type', options: ['Monocrystalline', 'Polycrystalline', 'Thin-film', 'Inverter / parts'] },
    wattage: { label: 'Wattage', options: ['Under 100 W', '100-300 W', 'Over 300 W', 'Not specified'] },
    materialType: { label: 'Material', options: ['Lumber & wood', 'Metal', 'Fabric & fiber', 'Plastic', 'Paper & cardboard', 'Building supplies', 'Other'] },
    vehicleType: { label: 'Vehicle type', options: ['Car', 'Truck', 'Van', 'Motorcycle', 'Trailer', 'Other'] },
    fuel: { label: 'Fuel', options: ['Gasoline', 'Diesel', 'Hybrid', 'Electric', 'Not applicable'] },
    titleStatus: { label: 'Title', options: ['Clear title in hand', 'Title available', 'Paperwork needed', 'Not specified'] },
    cardType: { label: 'Card for', options: ['Groceries', 'Gas', 'Hardware & supplies', 'Restaurant & cafe', 'Local services', 'Other small business'] },
    businessType: { label: 'Business', options: ['Independent small business', 'Local co-op', 'Neighbor-run'] }
  });

  // Labor uses the five pillars as its umbrella categories. Each pillar has its
  // own listed service titles; members can write in a title that is missing and
  // the prototype queues it locally for the site maintainer.
  const LABOR_CATEGORIES = Object.freeze({
    building: {
      short: 'Building & Repair',
      titles: ['Home repair', 'Carpentry', 'Plumbing help', 'Electrical help', 'Auto repair', 'Appliance repair', 'Painting', 'Moving & hauling', 'Tool sharing']
    },
    health: {
      short: 'Health & Care',
      titles: ['Peer wellness support', 'First aid education', 'Movement & exercise', 'Caregiving support', 'Hygiene & grooming help', 'Accessibility help', 'Medication reminder support']
    },
    daily: {
      short: 'Daily Life',
      titles: ['Childcare', 'Cooking & meal prep', 'Cleaning', 'Laundry', 'Gardening', 'Pet care', 'Rides & errands', 'Home organization']
    },
    arts: {
      short: 'Arts & Education',
      titles: ['Music instruction', 'Dance & movement', 'Visual art', 'Tutoring', 'Writing & editing', 'Photography', 'Language practice']
    },
    civic: {
      short: 'Civic & Digital',
      titles: ['Web design & coding', 'Graphic design', 'Legal literacy', 'Benefits & paperwork help', 'Tenant rights education', 'Digital access help', 'Community organizing']
    }
  });

  const SERVICE_FORMATS = Object.freeze({
    inperson: 'In person',
    online: 'Online',
    hybrid: 'In person + online'
  });

  const LOCATION_MODES = Object.freeze({
    cityStateZip: { label: 'City, state & ZIP', format: 'inperson' },
    cityState: { label: 'City & state', format: 'inperson' },
    zip: { label: 'ZIP code only', format: 'inperson' },
    online: { label: 'Online', format: 'online' }
  });

  // Small product-style thumbnails and color chips for the goods directory.
  // These are decorative: the text details always carry the same information.
  const GOODS_CATEGORY_ICONS = Object.freeze({
    groceries: '🥬',
    household: '🧼',
    clothing: '🧥',
    furniture: '🪑',
    tech: '💻',
    tools: '🔧',
    solar: '☀️',
    materials: '🪵',
    vehicles: '🚗',
    'gift-cards': '🎁',
    other: '📦'
  });

  const COLOR_SWATCHES = Object.freeze({
    Black: '#1F2937',
    White: '#FFFFFF',
    Gray: '#9CA3AF',
    Silver: '#C0C4CC',
    Red: '#B44332',
    Blue: '#1E3A8A',
    Green: '#2F6B4F',
    Yellow: '#D99B26',
    Orange: '#C96A22',
    Purple: '#6D4FA3',
    Pink: '#D47CA0',
    'Brown / tan': '#A67C52',
    Multicolor: 'conic-gradient(#B44332, #D99B26, #2F6B4F, #1E3A8A, #B44332)',
    Other: '#7C8798'
  });

  const SCOPE_LABELS = Object.freeze({
    peer: 'General Peer Education',
    licensed: 'Licensed Clinical/Legal Service'
  });

  const TRACKS = Object.freeze({
    contributor: 'Active Contributor',
    apprentice: 'Apprentice (Skill-Builder)',
    care: 'Care Circle Member',
    observer: 'Observer'
  });

  const HOUSING_STATUSES = Object.freeze({
    own: 'Own',
    rent: 'Rent',
    transient: 'Transient',
    'live with family': 'Live with family',
    'intentional community': 'Intentional community',
    homeless: 'Homeless'
  });

  /* Six realistic seed listings. User-created listings are prepended at runtime. */
  const SEED_LISTINGS = Object.freeze([
    {
      id: 'seed-dance',
      pillar: 'arts',
      exchange: 'free',
      title: 'Community Dance & Movement Workshops',
      provider: 'Amara Okafor',
      location: 'Stroudsburg · community hall + online',
      city: 'Stroudsburg',
      state: 'PA',
      zip: '18360',
      jobTitle: 'Dance & movement',
      format: 'hybrid',
      description: 'A joyful, all-bodies movement circle for people who danced once, never danced, or just want to move without being watched. No experience, no mirrors, no performance pressure. Paid-level facilitation, offered freely.',
      details: [
        { label: 'Where', value: 'Stroudsburg · community hall + online' },
        { label: 'Rhythm', value: '2nd & 4th Saturday · 90 min' },
        { label: 'Access', value: 'Chairs · scent-free room · captions' }
      ],
      note: 'All ages and bodies welcome.'
    },
    {
      id: 'seed-web',
      pillar: 'civic',
      exchange: 'free',
      title: 'Web Coding & Graphic Design Studio Hours',
      provider: 'Devin Reyes',
      location: 'East Stroudsburg · remote + library drop-in',
      city: 'East Stroudsburg',
      state: 'PA',
      zip: '18301',
      jobTitle: 'Web design & coding',
      format: 'hybrid',
      description: 'Two-hour studio for neighbors, small nonprofits, and co-ops. Bring a website, a flyer, an accessibility question, or just curiosity. We work on semantic HTML, CSS, vanilla JavaScript, and print design together—no hourly invoice.',
      details: [
        { label: 'Format', value: 'East Stroudsburg · remote + library drop-in' },
        { label: 'Good for', value: 'Neighbors & small community groups' },
        { label: 'Bring', value: 'A project or a question' }
      ],
      note: 'Accessibility reviewed with every build.'
    },
    {
      id: 'seed-brakes',
      pillar: 'building',
      exchange: 'atcost',
      title: 'Free Auto Brake Repair — You Cover the Parts',
      provider: 'Marcus Bell',
      location: 'Stroudsburg · garage by appointment',
      city: 'Stroudsburg',
      state: 'PA',
      zip: '18360',
      jobTitle: 'Auto repair',
      format: 'inperson',
      description: 'Brake pads, rotors, fluid checks, and honest safety inspections. The labor is free for both of us. If the parts cannot be found free on Unbought, you buy them at the exact receipt price, or I order them and show you the receipt. Zero markup, ever. I will say no when a job is outside my scope or needs a licensed specialist.',
      details: [
        { label: 'Rhythm', value: 'Weekends · 2–4 hrs' },
        { label: 'Materials', value: 'Requester covers pads, rotors, fluid — receipt shown' },
        { label: 'Good for', value: 'Older cars & tight budgets' }
      ],
      note: 'Labor free. Requester covers materials at exact receipt price.'
    },
    {
      id: 'seed-garden',
      pillar: 'daily',
      exchange: 'atcost',
      title: 'Organic Backyard Gardening & Seed Share',
      provider: 'Rosa Jiménez',
      location: 'Mount Pocono · garden plots + home visits',
      city: 'Mount Pocono',
      state: 'PA',
      zip: '18344',
      jobTitle: 'Gardening',
      format: 'inperson',
      description: 'Garden planning, planting, pruning, compost setup, and seasonal coaching. The teaching and labor are free. Seedlings and compost are free when the share has them; if they must be bought, the person requesting the work covers the exact receipt price, never a markup. Harvest is shared with everyone who tends the plot.',
      details: [
        { label: 'Season', value: 'Spring–fall · flexible' },
        { label: 'Materials', value: 'Free from the share, or requester covers receipt' },
        { label: 'Capacity', value: '4 households per month' }
      ],
      note: 'No plot fee. Harvest shared.'
    },
    {
      id: 'seed-childcare',
      pillar: 'daily',
      exchange: 'free',
      title: 'Childcare & Laundry Support',
      provider: 'Nia Brooks',
      location: 'East Stroudsburg · neighborhood',
      city: 'East Stroudsburg',
      state: 'PA',
      zip: '18301',
      jobTitle: 'Childcare',
      format: 'inperson',
      description: 'After-school care, bedtime routines, laundry folding, and pickup help for families in a hard week. Free and consent-based. We meet first, references are available, and a background check can be requested. Parents are always welcome to stay.',
      details: [
        { label: 'Rhythm', value: 'Weekday afternoons' },
        { label: 'Capacity', value: '2 families at a time' },
        { label: 'Safety', value: 'Meet first · references available' }
      ],
      note: 'No unvetted one-on-one time.'
    },
    {
      id: 'seed-legal',
      pillar: 'civic',
      exchange: 'free',
      title: 'Peer Legal Literacy Circles',
      provider: 'Samir Haddad',
      location: 'Stroudsburg · online + library',
      city: 'Stroudsburg',
      state: 'PA',
      zip: '18360',
      jobTitle: 'Legal literacy',
      format: 'hybrid',
      description: 'Plain-language sessions on tenants’ rights, small claims, benefits appeals, and how to find a licensed lawyer. This is peer education, not legal representation or individualized advice. We clarify scope at the start of every circle.',
      details: [
        { label: 'Rhythm', value: 'First Thursday · 60 min' },
        { label: 'Where', value: 'Stroudsburg · online + library' },
        { label: 'Scope', value: 'General Peer Education' },
        { label: 'Not', value: 'Legal representation or advice' }
      ],
      scope: 'peer',
      note: 'Licensed referrals available.'
    },
    {
      id: 'seed-pantry',
      pillar: 'goods',
      exchange: 'free',
      category: 'groceries',
      condition: 'new',
      attributes: { foodType: 'Pantry staples', diet: 'Standard' },
      title: 'Neighborhood Pantry & Fresh Produce Share',
      provider: 'Community Pantry Crew',
      location: 'St. Aiden’s basement · Wed & Sat',
      description: 'Shelf-stable staples, fresh produce, bread, and baby supplies, free to anyone who needs them. No proof of income, no forms, no questions. Take what you need and leave what you can. Delivery is available for neighbors who cannot travel.',
      details: [
        { label: 'Open', value: 'Wed 4–7pm · Sat 10am–1pm' },
        { label: 'Cost', value: 'Always free' },
        { label: 'Access', value: 'Step-free entrance · delivery available' }
      ],
      note: 'No eligibility test. No means test.'
    },
    {
      id: 'seed-tools',
      pillar: 'goods',
      exchange: 'free',
      category: 'tools',
      condition: 'used',
      color: 'Multicolor',
      attributes: { toolType: 'Hand tools' },
      title: 'Tool Library: Borrow, Don’t Buy',
      provider: 'Westside Tool Library',
      location: 'Westside workshop · Thursdays 4–7pm',
      description: 'Drills, saws, ladders, sanders, garden tools, and basic repair kits available to borrow for a week at a time. A short safety walkthrough is offered for tools you have not used before. Bring nothing but a name—no deposit, no fee.',
      details: [
        { label: 'Borrow', value: 'Up to 7 days · renew by message' },
        { label: 'Cost', value: 'Free · no deposit' },
        { label: 'Good for', value: 'Repairs, gardens, small builds' }
      ],
      note: 'Return clean and working, or tell us what broke.'
    },
    {
      id: 'seed-clothing',
      pillar: 'goods',
      exchange: 'free',
      category: 'clothing',
      condition: 'used',
      color: 'Multicolor',
      attributes: { clothingSize: 'Adult', season: 'All season' },
      title: 'Clothing, Bedding & Housewares Swap',
      provider: 'Maple Street Neighbors',
      location: 'Maple Street Hall · first Sunday',
      description: 'Free clothing in all sizes, coats, bedding, dishes, and small housewares. Everything is cleaned and sorted before it hits the tables. No swap is required—take what fits your household and leave the rest for a neighbor.',
      details: [
        { label: 'When', value: 'First Sunday · 11am–3pm' },
        { label: 'Cost', value: 'Free · no swap required' },
        { label: 'Access', value: 'Step-free hall · private changing room' }
      ],
      note: 'Sizes and seasons vary. Ask and we will look.'
    },
    {
      id: 'seed-hygiene',
      pillar: 'goods',
      exchange: 'free',
      category: 'household',
      condition: 'new',
      attributes: { householdType: 'Hygiene' },
      title: 'Bulk Cleaning & Hygiene Supplies — Free',
      provider: 'Nia Brooks',
      location: 'Westside neighborhood · pickup or delivery',
      description: 'Laundry soap, dish soap, toothpaste, period supplies, and cleaning basics bought in bulk and shared freely. No price, no split, no minimum, and no membership fee. Take what your household needs; tell us what ran out so the next bulk run covers it.',
      details: [
        { label: 'Order', value: 'Monthly bulk run · posted when ready' },
        { label: 'Cost', value: 'Free · no split, no minimum' },
        { label: 'Access', value: 'Porch pickup or local delivery' }
      ],
      note: 'Free supplies. Nothing to repay.'
    },
    {
      id: 'seed-furniture',
      pillar: 'goods',
      exchange: 'free',
      category: 'furniture',
      condition: 'used',
      color: 'Brown / tan',
      attributes: { room: 'Living room', material: 'Wood' },
      title: 'Solid Wood Bookshelves & Side Tables',
      provider: 'Rosa Jiménez',
      location: 'Maple Street · porch pickup',
      description: 'Sturdy solid-wood shelves and side tables, cleaned and sanded. Pickup from the porch, or delivery within a few miles if we can arrange it. Free for pledged members—no payment or swap. Non-members may record a $25 purchase intent, which goes entirely to the Unbought donation fund.',
      details: [
        { label: 'Pickup', value: 'Porch pickup · local delivery possible' },
        { label: 'Cost', value: 'Free for members · non-members $25 to the fund' },
        { label: 'Condition', value: 'Clean, sturdy, gently used' }
      ],
      note: 'Furniture is free to members. You arrange transport.',
      nonmemberPurchase: { enabled: true, price: 25 }
    },
    {
      id: 'seed-laptop',
      pillar: 'goods',
      exchange: 'free',
      category: 'tech',
      condition: 'refurbished',
      color: 'Silver',
      brand: 'Dell',
      attributes: { deviceType: 'Computer & tablet' },
      title: 'Refurbished Laptops for Students & Neighbors',
      provider: 'Devin Reyes',
      location: 'Downtown library · Tuesday drop-in',
      description: 'Refurbished laptops wiped clean, with a fresh operating system and a charger. Free to a neighbor who needs one for school, work, or getting online. We help set up a mail account and basic security on arrival.',
      details: [
        { label: 'Where', value: 'Tuesday library drop-in' },
        { label: 'Cost', value: 'Free · no deposit' },
        { label: 'Note', value: 'Data wiped before handoff' }
      ],
      note: 'One per household while they last.'
    },
    {
      id: 'seed-solar',
      pillar: 'goods',
      exchange: 'free',
      category: 'solar',
      condition: 'new',
      brand: '',
      attributes: { panelType: 'Monocrystalline', wattage: '100-300 W' },
      title: 'Solar Panel Starter Kits & Inverters',
      provider: 'Solar Mutual Aid Crew',
      location: 'Westside workshop · by appointment',
      description: 'Unused monocrystalline panels, charge controllers, and inverters donated by a local installer. Free for a neighborhood project or a household getting started. We will help you check that the pieces fit before you take them.',
      details: [
        { label: 'Pickup', value: 'By appointment · Westside workshop' },
        { label: 'Cost', value: 'Free · no deposit' },
        { label: 'Support', value: 'Compatibility check offered' }
      ],
      note: 'Installation is your responsibility; ask a peer first.'
    },
    {
      id: 'seed-lumber',
      pillar: 'goods',
      exchange: 'free',
      category: 'materials',
      condition: 'used',
      attributes: { materialType: 'Lumber & wood' },
      title: 'Clean Scrap Lumber & Building Supplies',
      provider: 'Marcus Bell',
      location: 'Northside garage · weekends',
      description: 'Offcuts of clean, untreated lumber, plus a few boxes of fasteners and insulation left over from community builds. Sorted by size. Take what your project needs; nothing is priced and nothing is owed.',
      details: [
        { label: 'Pickup', value: 'Weekends · Northside garage' },
        { label: 'Cost', value: 'Free · no swap required' },
        { label: 'Condition', value: 'Clean, dry, untreated' }
      ],
      note: 'Sorted by size. Take only what you can use.'
    },
    {
      id: 'seed-car',
      pillar: 'goods',
      exchange: 'free',
      category: 'vehicles',
      condition: 'used',
      color: 'Blue',
      brand: 'Toyota',
      attributes: { vehicleType: 'Car', fuel: 'Gasoline', titleStatus: 'Clear title in hand' },
      title: 'Compact Car — Free; Recipient Covers Title & Registration',
      provider: 'Amara Okafor',
      location: 'Eastside · by appointment',
      description: 'A reliable compact car with a clean title in hand, free to a neighbor who needs it. The car itself costs nothing: the receiving person covers the registration and titling fees. We meet first, go over the paperwork together, and you can have a mechanic inspect it.',
      details: [
        { label: 'Cost', value: 'Free · recipient covers title & registration fees' },
        { label: 'Title', value: 'Clear title in hand' },
        { label: 'Safety', value: 'Meet first · inspection welcome' }
      ],
      note: 'Fees are paid to the state, not to Unbought.'
    },
    {
      id: 'seed-giftcard',
      pillar: 'goods',
      exchange: 'free',
      category: 'gift-cards',
      condition: 'new',
      attributes: { cardType: 'Groceries', businessType: 'Independent small business' },
      title: 'Gift Cards for Independent Local Grocers',
      provider: 'Maple Street Neighbors',
      location: 'Maple Street Hall · first Sunday',
      description: 'Unused gift cards for independent, neighborhood-owned grocers and co-ops—never a major corporation. Cards are handed over with the balance shown, and we help you find the store if you are new to the area.',
      details: [
        { label: 'Where', value: 'First Sunday · Maple Street Hall' },
        { label: 'Business', value: 'Independent small business or co-op only' },
        { label: 'Cost', value: 'Free · no swap required' }
      ],
      note: 'Balance shown at handoff. No major chains.'
    }
  ]);

  const MULTI_VALUE_FIELDS = new Set(['support', 'capacity', 'interests']);

  const VOLUNTEER_ROLES = Object.freeze({
    'project-management': 'Project management',
    legal: 'Legal counsel & compliance',
    administrative: 'Administration & records',
    web: 'Web development',
    hr: 'HR & people operations',
    'volunteer-intake': 'Volunteer intake & onboarding',
    finance: 'Finance & bookkeeping',
    communications: 'Communications & accessibility'
  });

  // Report categories are triaged to either the member review board or a
  // police referral. Criminal matters are never decided by member vote.
  const REPORT_TYPES = Object.freeze({
    consent: { label: 'Violation of consent or boundaries', route: 'board' },
    harassment: { label: 'Harassment or intimidation (non-criminal)', route: 'board' },
    bias: { label: 'Bias, discrimination, or hateful conduct', route: 'board' },
    exploitation: { label: 'Exploitation of the commons or members', route: 'board' },
    safety: { label: 'Unsafe conduct in a shared space or project', route: 'board' },
    'other-board': { label: 'Other concern that is not a crime', route: 'board' },
    assault: { label: 'Assault or threat of violence', route: 'criminal' },
    theft: { label: 'Theft, fraud, or property crime', route: 'criminal' },
    'sexual-offense': { label: 'Sexual assault or abuse', route: 'criminal' },
    'other-criminal': { label: 'Other suspected criminal activity', route: 'criminal' }
  });

  const RESPONSE_DAYS = 3;   // time for the reported member to gather evidence and plead
  const VOTING_DAYS = 3;     // time for all members to review the case file and vote
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Membership years start at the exact moment of the northern vernal
  // equinox, not on January 1. Times are published UTC instants, rounded to
  // the minute. The 2027 equinox (20:25 UTC / 4:25pm Eastern) ends the beta
  // period, rolls out labels, and begins Unbought's first official year.
  const VERNAL_EQUINOXES = Object.freeze([
    { year: 2026, at: '2026-03-20T14:46:00.000Z' },
    { year: 2027, at: '2027-03-20T20:25:00.000Z' },
    { year: 2028, at: '2028-03-20T02:17:00.000Z' },
    { year: 2029, at: '2029-03-20T08:02:00.000Z' },
    { year: 2030, at: '2030-03-20T13:52:00.000Z' },
    { year: 2031, at: '2031-03-20T19:41:00.000Z' }
  ]);
  const FIRST_YEAR_START = VERNAL_EQUINOXES[0].at;
  const FIRST_YEAR_END = VERNAL_EQUINOXES[1].at;
  const LABEL_ROLLOUT_AT = VERNAL_EQUINOXES[1].at;
  const FIRST_OFFICIAL_YEAR = VERNAL_EQUINOXES[1].year;
  const MEMBER_LABELS = Object.freeze({
    betaFounder: 'Beta Founder',
    firstYear: '1st Year',
    firstYearFounder: 'First year Founder',
    volunteer: 'Volunteer'
  });
  const MEMBER_LABEL_ICONS = Object.freeze({
    seed: '🌱',
    'beta-founder': '✨',
    'first-year': '🌟',
    'first-year-founder': '🌿',
    volunteer: '💙'
  });
  const VOLUNTEER_ACCESS_COPY = 'Volunteers run Unbought: keeping the website updated, paying the bills, accepting new volunteers, legal work, and the rest of the operating team.';
  const SEED_LABEL_WORDS = Object.freeze({
    law: 'Law',
    lawyer: 'Law',
    legal: 'Law',
    attorney: 'Law',
    doctor: 'Doctor',
    physician: 'Doctor',
    cleaning: 'Cleaning',
    cleaner: 'Cleaning',
    housekeeping: 'Cleaning',
    dancer: 'Dancer',
    dance: 'Dancer'
  });

  const MEDIA_TYPES = Object.freeze({
    video: 'Video link',
    audio: 'Audio link',
    image: 'Image link',
    document: 'Document link'
  });

  const REPORT_EVIDENCE = Object.freeze({
    maxItems: 4,
    maxFileBytes: 8 * 1024 * 1024,
    maxDataLength: 500000,
    maxTextLength: 20000,
    imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    accepted: 'image/jpeg,image/png,image/webp,image/gif,text/*,.txt,.csv,.json,.md,.log,.pdf,audio/*,video/*'
  });

  // Post photos are local previews in this prototype. Each record has a
  // storageRef field so a future database can hold the real image while the
  // other fields (name, type, size, dimensions, addedAt) stay the same.
  const POST_PHOTOS = Object.freeze({
    maxItems: 3,
    maxFileBytes: 8 * 1024 * 1024,
    maxEdge: 800,
    maxDataLength: 140000,
    imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    accepted: 'image/jpeg,image/png,image/webp,image/gif'
  });

  // Local social circles mirror a future membership cap. Nothing is sent to
  // other people in this prototype; the cap is enforced on stored records.
  const SOCIAL_LIMITS = Object.freeze({
    friends: 150,
    groupMembers: 150
  });

  // Admin duty is shared by seven staggered seats. Seat 1 changes every week,
  // seat 2 every two weeks, and so on, so a group with seven or more members
  // always has seven admins with overlapping terms.
  const GROUP_ADMIN_SEATS = 7;
  const WEEK_MS = 7 * DAY_MS;

  // Group brands and co-op businesses arrive in Phase 2, on the same 2027
  // vernal equinox that rolls out the full site and member labels.
  const GROUP_BRAND_ROLLOUT_AT = LABEL_ROLLOUT_AT;
  const GROUP_BRAND_ROLLOUT_COPY = 'March 20, 2027 at 4:25pm Eastern';

  // Phase 1 is labor, goods, and the commons. Academy navigation and group
  // business settings stay hidden until Phase 2; the roadmap page still
  // explains what is coming.
  const SITE_PHASE = 1;

  const PROFILE_THEME_DEFAULTS = Object.freeze({
    public: { background: '#ffffff', content: '#1f2937' },
    private: { background: '#f8fafc', content: '#1f2937' }
  });

  function validThemeColor(value, fallback) {
    const color = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
  }

  function getProfileTheme(member, scope) {
    const defaults = PROFILE_THEME_DEFAULTS[scope] || PROFILE_THEME_DEFAULTS.public;
    const stored = member && member.profileTheme && member.profileTheme[scope];
    return {
      background: validThemeColor(stored && stored.background, defaults.background),
      content: validThemeColor(stored && stored.content, defaults.content)
    };
  }

  function profileThemeStyle(theme) {
    return `--profile-bg:${theme.background};--profile-fg:${theme.content}`;
  }

  // A small local sample directory so the prototype can demonstrate member
  // search and the request flow. These are not real accounts; nothing is sent.
  const LOCAL_MEMBER_DIRECTORY = Object.freeze([
    { id: 'sample-member-maya', name: 'Maya Torres', profession: 'Baker', cityState: 'Stroudsburg, PA', physicalCounty: 'Monroe', physicalState: 'PA' },
    { id: 'sample-member-jordan', name: 'Jordan Lee', profession: 'Electrician', cityState: 'East Stroudsburg, PA', physicalCounty: 'Monroe', physicalState: 'PA' },
    { id: 'sample-member-sam', name: 'Sam Rivera', profession: 'Care worker', cityState: 'Scranton, PA', physicalCounty: 'Lackawanna', physicalState: 'PA' },
    { id: 'sample-member-ana', name: 'Ana Patel', profession: 'Teacher', cityState: 'Stroudsburg, PA', physicalCounty: 'Monroe', physicalState: 'PA' }
  ]);

  const SKILL_OPTIONS = Object.freeze({
    paid: Object.freeze([
      'Carpentry', 'Plumbing', 'Electrical work', 'Painting', 'Roofing', 'Landscaping',
      'Auto repair', 'Bicycle repair', 'Welding', 'Mechanics', 'Cleaning', 'Cooking',
      'Baking', 'Childcare', 'Elder care', 'Nursing', 'Medical assisting', 'Counseling',
      'Social work', 'Teaching', 'Tutoring', 'Music instruction', 'Dance instruction',
      'Fitness training', 'Hairdressing', 'Sewing', 'Tailoring', 'Graphic design',
      'Web development', 'Coding', 'Writing', 'Editing', 'Photography', 'Translation',
      'Bookkeeping', 'Accounting', 'Event planning', 'Community organizing',
      'Delivery driving', 'Customer service', 'Farming', 'Gardening', 'Food preservation',
      'Legal aid', 'Library work', 'Accessibility support'
    ]),
    unpaid: Object.freeze([
      'Caregiving', 'Listening', 'Emotional support', 'Peer support', 'Care circle support',
      'Accompanying to appointments', 'Home repair', 'Gardening', 'Seed saving', 'Cooking',
      'Cleaning', 'Childcare', 'Elder care', 'Tutoring', 'Teaching', 'Community organizing',
      'Mutual aid', 'First aid', 'Conflict mediation', 'Translating', 'Interpreting',
      'Bicycle repair', 'Clothing repair', 'Mending', 'Canning', 'Food distribution',
      'Tenant organizing', 'Digital literacy', 'Accessibility support', 'Transportation',
      'Pet care', 'Storytelling', 'Music', 'Art', 'Crafts', 'Repair café', 'Neighborhood care',
      'Reading support', 'Meal sharing', 'Composting', 'Housing support', 'Grocery sharing'
    ])
  });

  const HEADER_SEARCH_PAGES = Object.freeze([
    { title: 'How It Works', area: 'Page', href: 'index.html', terms: 'home newsboard tracks volunteers consent rollout' },
    { title: 'The Pledge', area: 'Page', href: 'pledge.html', terms: 'join sign up membership commitments' },
    { title: 'Free Labor', area: 'Directory', href: 'freelabor.html', terms: 'services skills work offers jobs posts' },
    { title: 'Free Stuff', area: 'Directory', href: 'freestuff.html', terms: 'goods items offers products posts' },
    { title: 'Donate', area: 'Page', href: 'donate.html', terms: 'fund donation money contribution' },
    { title: 'What’s to Come', area: 'Page', href: 'future.html', terms: 'roadmap academy festival land waiting list phase' },
    { title: 'Community Guidelines', area: 'Page', href: 'guidelines.html', terms: 'consent rules standing care circle review exile' },
    { title: 'FAQ', area: 'Page', href: 'faq.html', terms: 'help questions answers privacy' },
    { title: 'Member Profile', area: 'Member area', href: 'profile.html', terms: 'resume public private view as colors privacy' },
    { title: 'Dashboard', area: 'Member area', href: 'dashboard.html', terms: 'account settings notifications messages exchanges review board' }
  ]);

  const REFLECTION_OPTIONS = Object.freeze([30, 90, 180]);
  const TREATMENT_STEPS = Object.freeze([
    { key: 'evaluation', label: 'Therapeutic evaluation completed (inside or outside Unbought)' },
    { key: 'plan', label: 'Recommended treatment plan documented' },
    { key: 'treatment', label: 'Treatment completed or sustained as recommended' }
  ]);

  /* ------------------------------------------------------------------------
     02. State, storage & small helpers
     ------------------------------------------------------------------------ */
  function defaultCommunityChannels() {
    const createdAt = new Date().toISOString();
    return [
      { id: 'channel-general', name: 'general', purpose: 'Open local conversation', createdBy: '', createdAt },
      { id: 'channel-mutual-aid', name: 'mutual-aid', purpose: 'Requests and offers of help', createdBy: '', createdAt },
      { id: 'channel-projects', name: 'projects', purpose: 'Working projects and ideas', createdBy: '', createdAt }
    ];
  }

  function communityChannelSlug(value) {
    return cleanString(value, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'general';
  }

  function findCommunityChannel(channelId, fallbackName = '') {
    const id = cleanString(channelId, 100);
    const channel = (Array.isArray(state.communityChannels) ? state.communityChannels : [])
      .find((item) => item && item.id === id);
    if (channel) return channel;
    const name = cleanString(fallbackName, 60);
    return {
      id: id || `channel-${communityChannelSlug(name)}`,
      name: name || 'general',
      purpose: '',
      createdBy: '',
      createdAt: ''
    };
  }

  function findCommunityThread(threadId) {
    const id = cleanString(threadId, 100);
    return id
      ? (Array.isArray(state.communityThreads) ? state.communityThreads : []).find((item) => item && item.id === id)
      : null;
  }

  function communityChatChannelName(chat) {
    if (!chat) return 'general';
    const saved = findCommunityChannel(chat.channelId, chat.channel);
    return saved.name || 'general';
  }

  function communityChatSubject(chat) {
    if (!chat) return 'Community post';
    const subject = cleanString(chat.subject, 120);
    if (subject) return subject;
    const thread = findCommunityThread(chat.threadId);
    return thread ? thread.subject : 'Community post';
  }

  function createDefaultState() {
    return {
      pledge: null,
      memberRoster: [],
      auth: {
        credential: null,
        session: { signedIn: false, signedInAt: null }
      },
      track: null,
      trackDetails: {},
      listings: [],
      listingComments: {},
      requests: [],
      inquiries: [],
      donationIntents: [],
      wishlistItems: [],
      contributions: [],
      volunteerInterests: [],
      reports: [],
      anonymousVotes: [],
      notifications: [],
      friends: [],
      friendRequests: [{
        id: 'sample-friend-request-maya',
        memberId: 'sample-member-maya',
        name: 'Maya Torres',
        profession: 'Baker',
        cityState: 'Stroudsburg, PA',
        direction: 'incoming',
        status: 'pending',
        createdAt: new Date().toISOString(),
        sample: true
      }],
      groupJoinRequests: [],
      groups: [],
      groupPosts: [],
      socialChats: [],
      communityChannels: defaultCommunityChannels(),
      communityThreads: [],
      settings: {
        compactDashboard: false,
        showPrototypeNotices: true
      },
      messages: [],
      chats: [],
      suggestions: [],
      severanceFund: {
        balance: 0,
        contributions: []
      }
    };
  }

  function getCredential() {
    return state.auth && state.auth.credential ? state.auth.credential : null;
  }

  function getCredentials() {
    if (!state.auth || typeof state.auth !== 'object') state.auth = { credential: null, session: {} };
    if (!Array.isArray(state.auth.credentials)) state.auth.credentials = [];
    return state.auth.credentials;
  }

  function getActiveCredential() {
    const credentials = getCredentials();
    const session = state.auth && state.auth.session ? state.auth.session : {};
    const id = cleanString(session.credentialId, 100);
    return credentials.find((credential) => credential && (credential.id === id || credential.username === id))
      || getCredential()
      || credentials[0]
      || null;
  }

  function isSignedIn() {
    return Boolean(state.auth && state.auth.session && state.auth.session.signedIn);
  }

  function isMember() {
    return isSignedIn() && Boolean(state.pledge && state.pledge.memberId);
  }

  // Non-intake forms reuse the signed-in member's chosen name so people do not
  // have to retype it. The initial intake (pledge.html) still asks for the full
  // legal name, and the chosen-name setting stays editable in the dashboard.
  // Private fields (legal name, address, DOB, housing, phone) are never used here.
  function memberChosenName() {
    return isMember() ? cleanString(state.pledge.name, 60) : '';
  }

  function fillOwnNameField(input) {
    if (!input || cleanString(input.value, 120)) return;
    const name = memberChosenName();
    if (name) input.value = name;
  }

  function normalizeProfession(value) {
    return cleanString(value, 80).replace(/\s+/g, ' ').trim();
  }

  function normalizeZip(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 5 ? digits.slice(0, 5) : '';
  }

  function zipFromAddress(address) {
    return normalizeZip((String(address || '').match(/\b\d{5}(?:-\d{4})?\b/) || [''])[0]);
  }

  const NAME_SUFFIXES = Object.freeze(['jr', 'sr', 'ii', 'iii', 'iv', 'v', 'vi']);

  function normalizeStateCode(value) {
    return cleanString(value, 2).toUpperCase();
  }

  function parseFullNameParts(value) {
    const tokens = cleanString(value, 100).split(/\s+/).filter(Boolean);
    if (!tokens.length) return { firstName: '', middleInitial: '', lastName: '', suffix: '' };
    let suffix = '';
    const lastToken = tokens[tokens.length - 1].replace(/\./g, '').toLowerCase();
    if (tokens.length > 1 && NAME_SUFFIXES.includes(lastToken)) suffix = tokens.pop();
    const firstName = tokens.shift() || '';
    const lastName = tokens.length > 1 ? tokens.pop() : tokens.pop() || '';
    const middleInitial = tokens.length ? tokens[0].slice(0, 1).toUpperCase() : '';
    return { firstName, middleInitial, lastName, suffix };
  }

  function composeFullName(parts) {
    return [parts.firstName, parts.middleInitial, parts.lastName, parts.suffix]
      .map((part) => cleanString(part, 60))
      .filter(Boolean)
      .join(' ')
      .slice(0, 100);
  }

  function parseMailingParts(value) {
    const parts = cleanString(value, 240)
      .split(/[\n,]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    let city = '';
    let state = '';
    let cityIndex = -1;
    for (let index = parts.length - 1; index > 0; index -= 1) {
      const match = parts[index].match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/);
      if (!match) continue;
      const candidate = safeCity(parts[index - 1]);
      if (!candidate) continue;
      city = candidate;
      state = match[1].toUpperCase();
      cityIndex = index - 1;
      break;
    }
    const streetParts = cityIndex >= 0 ? parts.slice(0, cityIndex) : parts;
    return {
      address1: streetParts[0] || '',
      address2: streetParts.slice(1).join(', '),
      city,
      state,
      zip: zipFromAddress(value)
    };
  }

  function composeMailingAddress(parts) {
    const street = [cleanString(parts.address1, 100), cleanString(parts.address2, 100)].filter(Boolean);
    const city = safeCity(parts.city);
    const state = normalizeStateCode(parts.state);
    const zip = normalizeZip(parts.zip);
    const locality = city || state || zip
      ? [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
      : '';
    return [...street, locality].filter(Boolean).join(', ').slice(0, 240);
  }

  // Counties are private eligibility data, never part of a public resume.
  // "Monroe County" and "Monroe" are treated as the same county.
  function normalizeCounty(value) {
    return cleanString(value, 80).trim().replace(/\s+county\s*$/i, '').trim();
  }

  function countyKey(county, stateCode) {
    const name = normalizeCounty(county).toLowerCase();
    const code = normalizeStateCode(stateCode);
    return name && code ? `${name}|${code}` : '';
  }

  function splitSkillList(value) {
    return cleanString(value, 400)
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function refreshSkillPicker(picker) {
    if (!(picker instanceof HTMLElement)) return;
    const input = picker.querySelector('input[type="hidden"]');
    const chips = picker.querySelector('[data-skill-chips]');
    if (!input || !chips) return;
    const items = splitSkillList(input.value);
    chips.innerHTML = items.length
      ? items.map((skill) => `<span class="skill-chip">${escapeHtml(skill)}<button type="button" data-skill-remove="${escapeHtml(skill)}" aria-label="Remove ${escapeHtml(skill)}">×</button></span>`).join('')
      : '<span class="skill-empty">No skills added yet.</span>';
  }

  function refreshSkillPickers(root = document) {
    const pickers = root instanceof HTMLElement
      ? [root, ...root.querySelectorAll('.skill-picker')]
      : Array.from(root.querySelectorAll('.skill-picker'));
    pickers.filter((picker) => picker.classList.contains('skill-picker')).forEach(refreshSkillPicker);
  }

  function updateSkillResults(picker) {
    if (!(picker instanceof HTMLElement)) return;
    const search = picker.querySelector('[data-skill-search]');
    const results = picker.querySelector('[data-skill-results]');
    const input = picker.querySelector('input[type="hidden"]');
    if (!search || !results || !input) return;
    const query = cleanString(search.value, 80).trim();
    const lowerQuery = query.toLowerCase();
    if (!lowerQuery) {
      results.innerHTML = '';
      return;
    }
    const kind = picker.dataset.skillPicker === 'unpaid' ? 'unpaid' : 'paid';
    const selected = splitSkillList(input.value).map((item) => item.toLowerCase());
    const matches = SKILL_OPTIONS[kind]
      .filter((option) => option.toLowerCase().includes(lowerQuery) && !selected.includes(option.toLowerCase()))
      .slice(0, 8);
    const custom = !SKILL_OPTIONS[kind].some((option) => option.toLowerCase() === lowerQuery)
      ? [query.slice(0, 60)] : [];
    const options = [...matches, ...custom]
      .filter((option, index, all) => all.findIndex((item) => item.toLowerCase() === option.toLowerCase()) === index);
    results.innerHTML = options.length
      ? options.map((option) => `<button type="button" class="skill-result-button" data-skill-add="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join('')
      : '<span class="skill-empty">No matches. Type your own and press Enter.</span>';
  }

  function addSkill(picker, value) {
    if (!(picker instanceof HTMLElement)) return;
    const input = picker.querySelector('input[type="hidden"]');
    const search = picker.querySelector('[data-skill-search]');
    const results = picker.querySelector('[data-skill-results]');
    const skill = cleanString(value, 60);
    if (!input || !skill) return;
    const items = splitSkillList(input.value);
    if (!items.some((item) => item.toLowerCase() === skill.toLowerCase())) items.push(skill);
    input.value = items.join(', ').slice(0, 400);
    if (search) search.value = '';
    if (results) results.innerHTML = '';
    refreshSkillPicker(picker);
  }

  function removeSkill(picker, value) {
    if (!(picker instanceof HTMLElement)) return;
    const input = picker.querySelector('input[type="hidden"]');
    if (!input) return;
    const skill = cleanString(value, 60).toLowerCase();
    input.value = splitSkillList(input.value)
      .filter((item) => item.toLowerCase() !== skill)
      .join(', ')
      .slice(0, 400);
    refreshSkillPicker(picker);
  }

  let skillPickersBound = false;
  function initSkillPickers() {
    if (skillPickersBound) {
      refreshSkillPickers();
      return;
    }
    skillPickersBound = true;
    document.addEventListener('input', (event) => {
      const search = event.target.closest('[data-skill-search]');
      if (search) updateSkillResults(search.closest('.skill-picker'));
    });
    document.addEventListener('click', (event) => {
      const add = event.target.closest('[data-skill-add]');
      if (add) {
        event.preventDefault();
        addSkill(add.closest('.skill-picker'), add.dataset.skillAdd);
        return;
      }
      const remove = event.target.closest('[data-skill-remove]');
      if (remove) {
        event.preventDefault();
        removeSkill(remove.closest('.skill-picker'), remove.dataset.skillRemove);
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const search = event.target.closest('[data-skill-search]');
      if (!search) return;
      event.preventDefault();
      const picker = search.closest('.skill-picker');
      const first = picker.querySelector('[data-skill-add]');
      addSkill(picker, first ? first.dataset.skillAdd : search.value);
    });
    refreshSkillPickers();
  }

  function getMemberRoster() {
    if (!Array.isArray(state.memberRoster)) state.memberRoster = [];
    return state.memberRoster;
  }

  function addMemberToRoster(pledge) {
    if (!pledge || !pledge.memberId) return;
    const roster = getMemberRoster();
    const profession = normalizeProfession(pledge.profession
      || String(pledge.paidSkills || '').split(/[\n,;]/)[0]);
    const zip = normalizeZip(pledge.zip || zipFromAddress(pledge.mailingAddress));
    const cityState = parseCityState(pledge.mailingAddress)
      || cleanString(pledge.location, 100)
      || (zip ? `ZIP ${zip}` : '');
    const entry = {
      memberId: pledge.memberId,
      name: cleanString(pledge.name, 60),
      profession,
      professionKey: profession.toLowerCase(),
      cityState,
      zip,
      signedAt: cleanString(pledge.signedAt, 40),
      standing: cleanString(pledge.status, 30) || 'active',
      track: cleanString(state.track, 30),
      available: pledge.available !== false
    };
    const index = roster.findIndex((item) => item && item.memberId === entry.memberId);
    if (index >= 0) roster[index] = entry;
    else roster.push(entry);
    state.memberRoster = roster.slice(0, 500);
  }

  function labelsLive() {
    return Date.now() >= Date.parse(LABEL_ROLLOUT_AT);
  }

  function membershipYearAt(value) {
    const when = Date.parse(value);
    if (Number.isNaN(when)) return null;
    let year = VERNAL_EQUINOXES[0].year - 1;
    for (const equinox of VERNAL_EQUINOXES) {
      if (when < Date.parse(equinox.at)) break;
      year = equinox.year;
    }
    return year;
  }

  function isSeedMember(member) {
    if (!member || !member.memberId) return false;
    const profession = normalizeProfession(member.profession
      || String(member.paidSkills || '').split(/[\n,;]/)[0]).toLowerCase();
    const zip = normalizeZip(member.zip || zipFromAddress(member.mailingAddress));
    if (!profession || !zip) return false;
    const first = getMemberRoster()
      .filter((item) => item && item.professionKey === profession && item.zip === zip)
      .sort((a, b) => String(a.signedAt).localeCompare(String(b.signedAt))
        || String(a.memberId).localeCompare(String(b.memberId)))[0];
    return Boolean(first && first.memberId === member.memberId);
  }

  function isBetaFounder(member) {
    if (!member || !member.signedAt) return false;
    const when = Date.parse(member.signedAt);
    return !Number.isNaN(when) && when >= Date.parse(FIRST_YEAR_START) && when < Date.parse(FIRST_YEAR_END);
  }

  function isFirstOfficialYear(member) {
    return membershipYearAt(member && member.signedAt) === FIRST_OFFICIAL_YEAR;
  }

  function seedBadgeLabel(member) {
    const profession = normalizeProfession(member.profession
      || String(member.paidSkills || '').split(/[\n,;]/)[0]);
    const known = profession.split(/\s+/)
      .map((word) => SEED_LABEL_WORDS[word.toLowerCase().replace(/[^a-z]/g, '')])
      .find(Boolean);
    return `${known || profession || 'Profession'} Seed`;
  }

  function hasRecordedVolunteerOffer(member) {
    const id = member && cleanString(member.memberId, 100);
    if (!id) return false;
    return (Array.isArray(state.volunteerInterests) ? state.volunteerInterests : [])
      .some((item) => item && item.memberId === id && item.status !== 'withdrawn');
  }

  function isVolunteerMember(member) {
    return Boolean(member && member.memberId
      && (member.volunteer === true || member.volunteerStatus === 'active' || hasRecordedVolunteerOffer(member)));
  }

  function isCurrentVolunteer() {
    return isMember() && isVolunteerMember(state.pledge);
  }

  function getMemberLabels(member) {
    const labels = [];
    const seed = isSeedMember(member);
    if (seed) {
      labels.push({
        key: 'seed',
        name: seedBadgeLabel(member),
        detail: `First ${normalizeProfession(member.profession) || 'profession'} in ZIP ${normalizeZip(member.zip || zipFromAddress(member.mailingAddress))} in this browser.`,
        pending: true
      });
    }
    if (isBetaFounder(member)) {
      labels.push({
        key: 'beta-founder',
        name: MEMBER_LABELS.betaFounder,
        detail: `Signed during the beta build period, ${formatDate(FIRST_YEAR_START)} to ${formatDate(FIRST_YEAR_END)}.`,
        pending: true
      });
    }
    if (isFirstOfficialYear(member)) {
      labels.push(seed
        ? {
          key: 'first-year-founder',
          name: MEMBER_LABELS.firstYearFounder,
          detail: `Seed member who signed in the first official year, ${formatDate(FIRST_YEAR_END)} to ${formatDate(VERNAL_EQUINOXES[2].at)}.`,
          pending: false
        }
        : {
          key: 'first-year',
          name: MEMBER_LABELS.firstYear,
          detail: `Signed in the first official year, ${formatDate(FIRST_YEAR_END)} to ${formatDate(VERNAL_EQUINOXES[2].at)}.`,
          pending: false
        });
    }
    if (isVolunteerMember(member)) {
      labels.push({
        key: 'volunteer',
        name: MEMBER_LABELS.volunteer,
        detail: VOLUNTEER_ACCESS_COPY,
        pending: false
      });
    }
    return labels;
  }

  function labelIsPending(label, live) {
    return !live && label.pending !== false;
  }

  function renderMemberLabelsHtml(member) {
    const labels = getMemberLabels(member);
    const guidelinesLink = '<p class="member-label-link"><a href="guidelines.html">Community guidelines and consequences →</a></p>';
    if (!labels.length) {
      return `<div class="member-labels" role="note"><p>No member labels yet.</p>${guidelinesLink}</div>`;
    }
    const live = labelsLive();
    const badges = labels.map((label) => `<span class="member-label member-label--${label.key}${labelIsPending(label, live) ? ' is-pending' : ''}"><span class="member-label-icon" aria-hidden="true">${MEMBER_LABEL_ICONS[label.key] || '✦'}</span>${escapeHtml(label.name)}</span>`).join('');
    const details = labels.map((label) => escapeHtml(label.detail)).join(' ');
    const note = live
      ? details
      : `Beta testing runs until the exact 2027 vernal equinox, March 20, 2027 at 4:25pm Eastern — the day Unbought rolls out for everyone. Until then, people who sign from the database build are Beta Founders, people can become Seed members, and we log the day each one joins. The site will not roll out before that moment; it is the first day of Unbought's first official year, so Seed and Beta Founder labels stay pending until then. In the first official year, non-seeds get a 1st Year badge and seeds get a First year Founder badge. ${details}`;
    return `<div class="member-labels" role="note"><div class="member-label-list">${badges}</div><p>${note}</p>${guidelinesLink}</div>`;
  }

  // A compact status badge for the resume card. It carries no ZIP, date, or
  // other private detail; beta-era badges are visibly marked as pending.
  function renderPublicStatusTags(member) {
    const labels = getMemberLabels(member);
    if (!labels.length) return '';
    const live = labelsLive();
    return `<div class="resume-labels" aria-label="Member status">${labels.map((label) => {
      const pending = labelIsPending(label, live);
      return `<span class="member-label member-label--${label.key}${pending ? ' is-pending' : ''}"><span class="member-label-icon" aria-hidden="true">${MEMBER_LABEL_ICONS[label.key] || '✦'}</span>${escapeHtml(label.name)}${pending ? ' · pending' : ''}</span>`;
    }).join('')}</div>`;
  }

  // In a live system this would be emailed automatically when someone became a
  // seed member. Here it is generated locally and shown as a draft only: no
  // email address is collected for it and nothing is transmitted.
  function renderSeedThankYou(member) {
    if (!isSeedMember(member)) return '';
    const e = escapeHtml;
    const firstName = cleanString(member.name, 60).trim().split(/\s+/)[0] || 'neighbor';
    const profession = normalizeProfession(member.profession) || 'your trade';
    const zip = normalizeZip(member.zip || zipFromAddress(member.mailingAddress));
    const badgeName = seedBadgeLabel(member);
    const beta = isBetaFounder(member);
    const firstYearFounder = isFirstOfficialYear(member);
    return `<details class="seed-email">
      <summary>See your seed-member thank-you message</summary>
      <div class="seed-email-body">
        <p class="seed-email-note">Prototype: in a live system this message would be emailed to you automatically as soon as you became a seed member. It is generated here only as a draft. Nothing is sent or transmitted.</p>
        <p><strong>To:</strong> ${e(firstName)} (chosen name; no email is collected)<br><strong>Subject:</strong> ${e(`Thank you for starting Unbought, ${firstName}`)}</p>
        <p>Hi ${e(firstName)},</p>
        <p>Thank you for helping to start the movement. You are the first ${e(profession)} to sign up for Unbought in ZIP ${e(zip || 'your area')} — a seed member. Your badge is <strong>${e(badgeName)}</strong>. ${beta ? 'Because you signed during the beta build period, you are also a Beta Founder.' : ''}${firstYearFounder ? 'Because you signed in the first official year, you are also a First year Founder.' : ''} Seed members are the people who prove a new trade can take root in a place; the whole commons begins with someone willing to go first.</p>
        <p>Beta testing runs until the exact 2027 vernal equinox, March 20, 2027 at 4:25pm Eastern — the day Unbought rolls out for everyone and the first day of its first official year. Until then, people who sign from the database build are Beta Founders, people can become Seed members, and we log the day each one joins. Your Seed and Beta Founder labels stay pending until rollout. After rollout, non-seeds in the first official year get a 1st Year badge, and seeds in that year get a First year Founder badge. If we are successful, we hope to partner with an organization and throw a huge festival somewhere in the United States on the following equinox, March 20, 2028 — one full year after rollout — to celebrate the movement and its Seed, Beta Founder, 1st Year, and First year Founder members. Nothing is booked or confirmed yet, but as a seed member you will hear about it first.</p>
        <p>Ways to get the ball rolling:</p>
        <ul>
          <li>Talk to other professionals in your area and invite them to take the pledge.</li>
          <li>Post on social media about why a currency-free commons is worth trying.</li>
          <li>Scout for cheap or donated housing and bring leads to the land circle.</li>
          <li>Start an Unbought business whose revenue is donated to the commons.</li>
          <li>Donate what you can, and point other donors toward the trust.</li>
          <li>Volunteer your services to help develop the community — organizing, outreach, repairs, mentoring, or whatever your trade can offer.</li>
          <li>Offer your skill on Free Labor, list goods on Free Stuff, or mentor in the Academy.</li>
        </ul>
        <p>We can only grow if people get involved. None of this is a demand — it is an invitation to help something small become something real. Thank you again for going first.</p>
        <p>With gratitude,<br>The Unbought commons</p>
      </div>
    </details>`;
  }

  function normalizeUsername(value) {
    return cleanString(value, 40).toLowerCase();
  }

  // Prototype-only local credential check. This is NOT real cryptography and
  // must never be used for a live account system.
  function hashPassword(password, salt) {
    let hash = 2166136261;
    const input = `${salt}:${password}`;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function setSession(signedIn, credential) {
    if (!state.auth) state.auth = { credential: null, session: {} };
    const active = credential || null;
    state.auth.session = {
      signedIn: Boolean(signedIn),
      signedInAt: signedIn ? new Date().toISOString() : null,
      credentialId: active ? cleanString(active.id || active.username, 100) : null,
      actingAs: active ? (active.role === 'representative' ? 'representative' : 'member') : null
    };
    saveState();
  }

  function updateHeaderNotificationBadge() {
    const btn = document.querySelector('[data-notifications-cta]');
    if (!btn) return;
    const unread = unreadNotificationCount();
    const badge = btn.querySelector('.notification-badge');
    if (badge) {
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.hidden = !unread;
    }
    btn.setAttribute('aria-label', unread ? `Notifications, ${unread} unread` : 'Notifications');
  }

  function headerSearchEntries() {
    const entries = HEADER_SEARCH_PAGES.map((item) => ({ ...item }));
    getAllListings().forEach((listing) => {
      if (!listing || !listing.title) return;
      const page = listing.pillar === 'goods' ? 'freestuff.html' : 'freelabor.html';
      entries.push({
        title: cleanString(listing.title, 80) || 'Untitled post',
        area: listing.pillar === 'goods' ? 'Free Stuff' : 'Free Labor',
        href: `${page}?listing=${encodeURIComponent(listing.id)}`,
        terms: [listing.jobTitle, listing.description, listing.location].filter(Boolean).join(' ')
      });
    });
    if (isMember()) {
      memberDirectory().forEach((member) => {
        if (!member || !member.name) return;
        entries.push({
          title: member.name,
          area: 'Member',
          href: memberProfileUrl(member.memberId),
          terms: [member.profession, member.cityState].filter(Boolean).join(' ')
        });
      });
      getMemberGroups().forEach((group) => {
        if (!group || !group.name) return;
        entries.push({
          title: group.name,
          area: 'Group',
          href: groupProfileUrl(group.id),
          terms: group.purpose || groupKindLabel(group)
        });
      });
    }
    return entries;
  }

  function renderHeaderSearchResults(input, results) {
    if (!results) return;
    const query = cleanString(input.value, 80).toLowerCase();
    if (!query) {
      results.innerHTML = '<p class="header-search-empty">Search pages, posts, members, and groups on this device.</p>';
      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }
    const matches = headerSearchEntries()
      .map((entry) => {
        const haystack = `${entry.title} ${entry.area} ${entry.terms || ''}`.toLowerCase();
        const title = entry.title.toLowerCase();
        const score = title.startsWith(query) ? 0 : title.includes(query) ? 1 : haystack.includes(query) ? 2 : -1;
        return { entry, score };
      })
      .filter((item) => item.score >= 0)
      .sort((a, b) => a.score - b.score || a.entry.title.localeCompare(b.entry.title))
      .slice(0, 8)
      .map((item) => item.entry);
    if (!matches.length) {
      results.innerHTML = `<p class="header-search-empty">No local matches for “${escapeHtml(cleanString(input.value, 80))}”.</p>`;
    } else {
      const e = escapeHtml;
      results.innerHTML = `<ul class="header-search-list">${matches.map((entry, index) => `<li>
        <a href="${e(entry.href)}" data-header-search-result>
          <span class="header-search-area">${e(entry.area)}</span>
          <span class="header-search-title">${e(entry.title)}</span>
        </a>
      </li>`).join('')}</ul>`;
    }
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function initHeaderSearch() {
    const header = document.querySelector('.header-inner');
    if (!header || document.getElementById('site-search-form')) return;
    const form = document.createElement('form');
    form.className = 'header-search';
    form.id = 'site-search-form';
    form.setAttribute('role', 'search');
    form.innerHTML = `<label class="sr-only" for="site-search">Search Unbought</label>
      <svg class="icon header-search-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m16 16 5 5"></path></svg>
      <input type="search" id="site-search" name="q" maxlength="80" autocomplete="off" placeholder="Search" aria-controls="site-search-results" aria-expanded="false">
      <div class="header-search-results" id="site-search-results" hidden></div>`;
    const cta = header.querySelector('[data-auth-cta]');
    if (cta) header.insertBefore(form, cta);
    else header.appendChild(form);

    const input = form.querySelector('#site-search');
    const results = form.querySelector('#site-search-results');
    const hide = () => {
      results.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    };
    input.addEventListener('input', () => renderHeaderSearchResults(input, results));
    input.addEventListener('focus', () => renderHeaderSearchResults(input, results));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hide();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const first = results.querySelector('[data-header-search-result]');
      if (first) window.location.href = first.href;
      else renderHeaderSearchResults(input, results);
    });
    results.addEventListener('click', (event) => {
      if (event.target.closest('[data-header-search-result]')) hide();
    });
    document.addEventListener('click', (event) => {
      if (!form.contains(event.target)) hide();
    });
  }

  function initHeaderNotifications() {
    const cta = document.querySelector('.header-inner [data-auth-cta]');
    if (!cta || document.querySelector('[data-notifications-cta]')) return;
    const btn = document.createElement('a');
    btn.className = 'header-notifications';
    btn.setAttribute('data-notifications-cta', '');
    btn.setAttribute('aria-label', 'Notifications');
    btn.setAttribute('href', 'dashboard.html#notifications');
    btn.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg><span class="notification-badge" hidden></span>';
    cta.insertAdjacentElement('afterend', btn);
    btn.addEventListener('click', (event) => {
      if (window.location.pathname.split('/').pop() === 'dashboard.html') {
        event.preventDefault();
        setDashboardTab('notifications');
      }
    });
  }

  let profilePreviewPublic = false;

  function profileMemberParam() {
    try {
      return cleanString(new URLSearchParams(window.location.search).get('member'), 100);
    } catch (error) {
      return '';
    }
  }

  // Signed-in members start in their full, private profile. The limited public
  // resume appears only while they choose "View as: Neighbor". Signed-out
  // visitors and links to another member always get the limited public view.
  function applyProfileView() {
    if (!document.body.classList.contains('profile-page')) return;
    const param = profileMemberParam();
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    const viewingOther = Boolean(param && param !== selfId);
    const signedIn = isMember();
    const publicView = viewingOther || !signedIn || profilePreviewPublic;

    document.body.classList.toggle('profile-page--member-view', signedIn && !viewingOther && !publicView);
    document.body.classList.toggle('profile-page--public-only', publicView);
    document.body.classList.toggle('profile-page--other-member', viewingOther);

    const note = document.getElementById('profile-view-note');
    const toggle = document.getElementById('view-as-toggle');
    const edit = document.querySelector('.profile-toolbar a[href="dashboard.html#settings"]');
    if (viewingOther) {
      if (note) note.textContent = 'This is a limited public resume from the local member directory. Private fields, comments, and interactions stay out of it.';
      if (toggle) toggle.hidden = true;
      if (edit) edit.hidden = true;
      return;
    }
    if (toggle) {
      toggle.hidden = false;
      toggle.textContent = profilePreviewPublic ? 'View as: Member' : 'View as: Neighbor';
      toggle.setAttribute('aria-pressed', String(profilePreviewPublic));
    }
    if (edit) edit.hidden = false;
    if (note) {
      note.textContent = profilePreviewPublic
        ? 'Neighbor view: this is the limited public resume neighbors see. Your private record is hidden.'
        : 'Member view: your full record is shown first. Use View as to see the limited public resume neighbors see.';
    }
  }

  function initProfileThemeForm() {
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.matches('[data-profile-theme-form]')) return;
      event.preventDefault();
      if (!requireMembership() || !form.reportValidity()) return;
      const data = new FormData(form);
      state.pledge.profileTheme = state.pledge.profileTheme || {};
      state.pledge.profileTheme.public = {
        background: validThemeColor(data.get('publicBackground'), PROFILE_THEME_DEFAULTS.public.background),
        content: validThemeColor(data.get('publicContent'), PROFILE_THEME_DEFAULTS.public.content)
      };
      state.pledge.profileTheme.private = {
        background: validThemeColor(data.get('privateBackground'), PROFILE_THEME_DEFAULTS.private.background),
        content: validThemeColor(data.get('privateContent'), PROFILE_THEME_DEFAULTS.private.content)
      };
      saveState();
      renderProfile();
      announce('Profile colors saved in this browser.');
      showToast('Profile colors saved locally.', false);
    });
    document.addEventListener('click', (event) => {
      const reset = event.target.closest('[data-profile-theme-reset]');
      if (!reset) return;
      const form = reset.closest('form');
      if (!form) return;
      const values = {
        publicBackground: PROFILE_THEME_DEFAULTS.public.background,
        publicContent: PROFILE_THEME_DEFAULTS.public.content,
        privateBackground: PROFILE_THEME_DEFAULTS.private.background,
        privateContent: PROFILE_THEME_DEFAULTS.private.content
      };
      Object.keys(values).forEach((name) => {
        const input = form.querySelector(`[name="${name}"]`);
        if (input) input.value = values[name];
      });
      announce('Default colors selected. Save to apply them.');
    });
  }

  function initGroupPostActions() {
    const panel = document.getElementById('group-profile');
    if (!panel) return;
    panel.addEventListener('submit', async (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const submit = form.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        if (form.matches('[data-group-post-form]')) {
          event.preventDefault();
          if (!requireMembership() || !form.reportValidity()) return;
          const group = getGroupById(form.dataset.groupId);
          if (!canPostInGroup(group)) {
            showToast('Only current members can post in this group.', false);
            return;
          }
          const data = new FormData(form);
          const body = cleanString(data.get('body'), 1200);
          if (!body) return;
          const pictureInput = form.querySelector('input[name="picture"]');
          const pictureFile = pictureInput && pictureInput.files ? pictureInput.files[0] : null;
          let picture = [];
          if (pictureFile) {
            const photo = await preparePostPhoto(pictureFile);
            if (!photo) {
              showToast('That image could not be resized locally. Try a smaller JPEG, PNG, WebP, or GIF.', false);
              return;
            }
            picture = [photo];
          }
          state.groupPosts = Array.isArray(state.groupPosts) ? state.groupPosts : [];
          const post = {
            id: makeId('group-post'),
            groupId: group.id,
            memberId: state.pledge.memberId,
            name: state.pledge.name || 'Member',
            title: cleanString(data.get('title'), 90),
            body,
            nsfw: Boolean(data.get('nsfw')),
            picture,
            createdAt: new Date().toISOString(),
            comments: []
          };
          state.groupPosts.push(post);
          state.groupPosts = state.groupPosts.slice(-500);
          addNotification('groupPost', `Group post: ${post.title || 'Untitled'}`,
            `Saved locally for ${groupDisplayLabel(group)}. In a live system the group would see it; nothing was delivered.`,
            { tab: '', sourceId: group.id });
          saveState();
          renderGroupProfile();
          renderNotifications();
          announce('Your post was saved in this group locally.');
          showToast('Group post saved locally.', false);
          return;
        }
        if (form.matches('[data-group-comment-form]')) {
          event.preventDefault();
          if (!requireMembership() || !form.reportValidity()) return;
          const data = new FormData(form);
          const body = cleanString(data.get('body'), 600);
          const post = (Array.isArray(state.groupPosts) ? state.groupPosts : [])
            .find((item) => item && item.id === form.dataset.groupPostId);
          if (!body || !post) return;
          const group = getGroupById(post.groupId);
          if (!canPostInGroup(group)) {
            showToast('Only current members can reply in this group.', false);
            return;
          }
          const isVoteReply = Boolean(post.guidelineVote);
          const voteTarget = `group-vote:${post.id}`;
          if (isVoteReply && hasAnonymousVote(voteTarget)) {
            showToast('You already voted in this group chat. Votes stay anonymous.', false);
            return;
          }
          post.comments = Array.isArray(post.comments) ? post.comments : [];
          post.comments.push(isVoteReply ? {
            id: makeId('group-reply'),
            anonymous: true,
            memberId: '',
            name: '',
            body,
            createdAt: new Date().toISOString()
          } : {
            id: makeId('group-reply'),
            memberId: state.pledge.memberId,
            name: state.pledge.name || 'Member',
            body,
            createdAt: new Date().toISOString()
          });
          if (isVoteReply) recordAnonymousVote(voteTarget);
          post.comments = post.comments.slice(-100);
          addNotification('groupComment', `Group reply: ${post.title || 'Untitled'}`,
            `Saved locally for ${groupDisplayLabel(group)}. In a live system the group would see it; nothing was delivered.`,
            { tab: '', sourceId: group.id });
          saveState();
          renderGroupProfile();
          renderNotifications();
          announce('Your reply was saved on this post locally.');
          showToast('Reply saved locally.', false);
        }
        if (form.matches('[data-group-guidelines-form]')) {
          event.preventDefault();
          if (!requireMembership() || !form.reportValidity()) return;
          const group = getGroupById(form.dataset.groupId);
          if (!group || !isGroupAdmin(group, state.pledge.memberId)) {
            showToast('Only a current admin can change group community guidelines.', false);
            return;
          }
          group.guidelines = cleanString(new FormData(form).get('guidelines'), 1200);
          addNotification('groupGuidelines', `Group guidelines updated: ${groupDisplayLabel(group)}`,
            'Recorded locally by a current admin. No other device or member was changed.',
            { tab: 'social', sourceId: group.id });
          saveState();
          renderGroupProfile();
          renderNotifications();
          announce('Group community guidelines saved locally.');
          showToast('Guidelines saved locally.', false);
          return;
        }
        if (form.matches('[data-group-review-vote-form]')) {
          event.preventDefault();
          if (!requireMembership() || !form.reportValidity()) return;
          const group = getGroupById(form.dataset.groupId);
          if (!group || !isGroupAdmin(group, state.pledge.memberId)) {
            showToast('Only a current admin can run a review board vote.', false);
            return;
          }
          const proposal = cleanString(new FormData(form).get('proposal'), 800);
          if (!proposal) return;
          state.groupPosts = Array.isArray(state.groupPosts) ? state.groupPosts : [];
          state.groupPosts.push({
            id: makeId('group-review-vote'),
            groupId: group.id,
            memberId: state.pledge.memberId,
            name: state.pledge.name || 'Member',
            title: 'Review board vote',
            body: `Proposed review board change: ${proposal}\n\nReply "Agree" or "Disagree" in this chat. An Agreed outcome closes this group's review board to alliances outside its ZIP code only.`,
            picture: [],
            createdAt: new Date().toISOString(),
            comments: [],
            guidelineVote: true,
            reviewBoardVote: true,
            proposal
          });
          state.groupPosts = state.groupPosts.slice(-500);
          addNotification('groupPost', `Review board vote opened: ${groupDisplayLabel(group)}`,
            'Opened in group chat locally by a current admin. Members reply on this device only.',
            { tab: '', sourceId: group.id });
          saveState();
          renderGroupProfile();
          renderNotifications();
          form.reset();
          announce('Review board vote opened in group chat locally.');
          showToast('Review board vote opened in group chat.', false);
          return;
        }
        if (form.matches('[data-group-guideline-vote-form]')) {
          event.preventDefault();
          if (!requireMembership() || !form.reportValidity()) return;
          const group = getGroupById(form.dataset.groupId);
          if (!group || !isGroupAdmin(group, state.pledge.memberId)) {
            showToast('Only a current admin can run a guideline vote.', false);
            return;
          }
          const proposal = cleanString(new FormData(form).get('proposal'), 800);
          if (!proposal) return;
          state.groupPosts = Array.isArray(state.groupPosts) ? state.groupPosts : [];
          const vote = {
            id: makeId('group-guideline-vote'),
            groupId: group.id,
            memberId: state.pledge.memberId,
            name: state.pledge.name || 'Member',
            title: 'Guideline vote',
            body: `Proposed guideline: ${proposal}\n\nReply "Agree" or "Disagree" in this chat.`,
            picture: [],
            createdAt: new Date().toISOString(),
            comments: [],
            guidelineVote: true,
            proposal
          };
          state.groupPosts.push(vote);
          state.groupPosts = state.groupPosts.slice(-500);
          addNotification('groupPost', `Guideline vote opened: ${groupDisplayLabel(group)}`,
            'Opened in group chat locally by a current admin. Members reply on this device only.',
            { tab: '', sourceId: group.id });
          saveState();
          renderGroupProfile();
          renderNotifications();
          form.reset();
          announce('Guideline vote opened in group chat locally.');
          showToast('Guideline vote opened in group chat.', false);
          return;
        }
        if (form.matches('[data-group-outcome-form]')) {
          event.preventDefault();
          if (!requireMembership() || !form.reportValidity()) return;
          const group = getGroupById(form.dataset.groupId);
          const post = (Array.isArray(state.groupPosts) ? state.groupPosts : [])
            .find((item) => item && item.id === form.dataset.groupPostId && item.guidelineVote);
          if (!group || !post || !isGroupAdmin(group, state.pledge.memberId)) {
            showToast('Only a current admin can record the outcome.', false);
            return;
          }
          const data = new FormData(form);
          const outcome = cleanString(data.get('outcome'), 40);
          if (!['Agreed', 'Not agreed', 'More discussion needed'].includes(outcome)) return;
          post.outcome = outcome;
          post.outcomeNote = cleanString(data.get('note'), 600);
          post.outcomeBy = state.pledge.name || 'Admin';
          post.outcomeById = state.pledge.memberId;
          post.outcomeAt = new Date().toISOString();
          if (post.reviewBoardVote && outcome === 'Agreed') {
            group.settings = normalizeGroupSettings(group.settings);
            group.settings.reviewBoard.openToAlliance = false;
            group.settings.reviewBoard.optOutOutcome = outcome;
            group.settings.reviewBoard.optOutAt = post.outcomeAt;
          }
          addNotification('groupPost', `${post.reviewBoardVote ? 'Review board' : 'Guideline'} outcome recorded: ${groupDisplayLabel(group)}`,
            `Recorded locally as “${outcome}” by ${post.outcomeBy}.`,
            { tab: '', sourceId: group.id });
          saveState();
          renderGroupProfile();
          renderNotifications();
          announce(`Outcome recorded locally: ${outcome}.`);
          showToast('Outcome recorded locally.', false);
          return;
        }
      } finally {
        if (submit && submit.isConnected) submit.disabled = false;
      }
    });

    panel.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-group-delete]');
      if (remove) {
        event.preventDefault();
        deleteGroupContent(remove.dataset.groupDelete, remove.dataset.groupId,
          remove.dataset.groupPostId, remove.dataset.groupReplyId, remove);
        return;
      }
      const review = event.target.closest('[data-group-review]');
      if (review) {
        event.preventDefault();
        requireGroupImpartialReview(review.dataset.groupReview, review.dataset.groupMemberId, review);
      }
    });
  }

  function deleteGroupContent(kind, groupId, postId, replyId, trigger) {
    if (!requireMembership()) return;
    const group = getGroupById(groupId);
    if (!group || !isGroupAdmin(group, state.pledge.memberId)) {
      showToast('Only a current admin can delete group chat comments.', false);
      return;
    }
    const label = kind === 'reply' ? 'reply' : 'post';
    showConfirm({
      title: `Delete this group ${label}?`,
      message: `This removes the ${label} from this browser's local record. Nothing is sent to another device and the action cannot be undone here.`,
      confirmLabel: `Delete ${label}`,
      tone: 'danger',
      onConfirm: () => {
        const post = (Array.isArray(state.groupPosts) ? state.groupPosts : [])
          .find((item) => item && item.id === postId && item.groupId === group.id);
        if (!post) return;
        if (kind === 'reply') {
          post.comments = (Array.isArray(post.comments) ? post.comments : [])
            .filter((comment) => comment && comment.id !== replyId);
        } else {
          state.groupPosts = (Array.isArray(state.groupPosts) ? state.groupPosts : [])
            .filter((item) => item && item.id !== postId);
        }
        addNotification('groupModeration', `Group ${label} deleted: ${groupDisplayLabel(group)}`,
          'Removed locally by a current admin. No other member or device was changed.',
          { tab: 'social', sourceId: group.id });
        saveState();
        renderGroupProfile();
        renderNotifications();
        announce(`Group ${label} deleted locally.`);
        showToast(`${label === 'reply' ? 'Reply' : 'Post'} deleted locally.`, false);
        if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
      }
    });
  }

  function requireGroupImpartialReview(groupId, memberId, trigger) {
    if (!requireMembership()) return;
    const group = getGroupById(groupId);
    if (!group || !isGroupAdmin(group, state.pledge.memberId)) {
      showToast('Only a current admin can require an impartial review.', false);
      return;
    }
    const member = (Array.isArray(group.members) ? group.members : [])
      .find((entry) => entry && entry.memberId === memberId);
    if (!member || memberId === state.pledge.memberId) return;
    const rotation = groupAdminRotation(group);
    openReportDialog({
      area: 'Group admin review',
      detail: `${groupDisplayLabel(group)} · ${rotation.seats.length} staggered admin seats`,
      name: member.name,
      memberId,
      sourceId: group.id,
      groupId: group.id,
      adminReview: true,
      temporaryAdmin: isRotationAdmin(group, state.pledge.memberId)
    }, trigger);
  }

  function initProfileFriendActions() {
    const panel = document.getElementById('public-resume');
    if (!panel) return;
    panel.addEventListener('click', (event) => {
      const send = event.target.closest('[data-friend-request-send]');
      if (send) {
        event.preventDefault();
        sendFriendRequest(send.dataset.friendRequestSend, send);
        return;
      }
      const action = event.target.closest('[data-friend-request-action]');
      if (action) {
        event.preventDefault();
        respondToFriendRequest(action.dataset.friendRequestId, action.dataset.friendRequestAction, action);
      }
    });
  }

  function initGroupAdminForm() {
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.matches('[data-group-admin-form]')) return;
      event.preventDefault();
      if (!requireMembership() || !form.reportValidity()) return;
      const data = new FormData(form);
      addGroupAdmin(form.dataset.groupId, cleanString(data.get('memberId'), 100), form);
    });
  }

  function publicPhoneFor(member) {
    if (!member) return '';
    return cleanString(member.publicPhoneNumber, 40)
      || (member.samePhone ? cleanString(member.cellPhone || member.phone, 40) : '');
  }

  function syncPhoneFields(scope) {
    const root = scope || document;
    root.querySelectorAll('form').forEach((form) => {
      const cell = form.querySelector('[data-cell-phone]');
      const publicLine = form.querySelector('[data-public-phone]');
      const same = form.querySelector('[data-same-phone]');
      if (!cell || !publicLine || !same) return;
      publicLine.readOnly = Boolean(same.checked);
      if (same.checked && publicLine.value !== cell.value) publicLine.value = cell.value;
    });
  }

  function initPhoneFields() {
    syncPhoneFields(document);
    document.addEventListener('change', (event) => {
      const same = event.target && event.target.closest && event.target.closest('[data-same-phone]');
      if (!same) return;
      const form = same.closest('form') || document;
      const cell = form.querySelector('[data-cell-phone]');
      const publicLine = form.querySelector('[data-public-phone]');
      if (!cell || !publicLine) return;
      if (same.checked) publicLine.value = cell.value;
      else if (publicLine.value === cell.value) publicLine.value = '';
      publicLine.readOnly = Boolean(same.checked);
    });
    document.addEventListener('input', (event) => {
      const cell = event.target && event.target.closest && event.target.closest('[data-cell-phone]');
      if (!cell) return;
      const form = cell.closest('form') || document;
      const same = form.querySelector('[data-same-phone]');
      const publicLine = form.querySelector('[data-public-phone]');
      if (same && same.checked && publicLine) publicLine.value = cell.value;
    });
  }

  function initProfilePrivacyForm() {
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.matches('[data-profile-privacy-form]')) return;
      event.preventDefault();
      if (!requireMembership() || !form.reportValidity()) return;
      const data = new FormData(form);
      const cell = cleanString(data.get('cellPhone'), 40);
      const same = Boolean(data.get('samePhone'));
      const publicLine = same ? cell : cleanString(data.get('publicPhoneNumber'), 40);
      state.pledge.publicAddressSource = data.get('publicAddressSource') === 'physical' ? 'physical' : 'mailing';
      if (cell) {
        state.pledge.cellPhone = cell;
        state.pledge.phone = cell;
        state.pledge.samePhone = same;
        state.pledge.publicPhoneNumber = publicLine;
        state.pledge.receiveTexts = Boolean(data.get('receiveTexts'));
      }
      state.pledge.publicPhone = Boolean(data.get('publicPhone')) && Boolean(publicPhoneFor(state.pledge));
      state.pledge.available = Boolean(data.get('available'));
      addMemberToRoster(state.pledge);
      saveState();
      renderSharedMemberViews();
      announce('Phone choices and privacy settings saved in this browser.');
      showToast('Phone choices and privacy saved locally.', false);
    });
  }

  function initProfileViewToggle() {
    const btn = document.getElementById('view-as-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      profilePreviewPublic = !profilePreviewPublic;
      applyProfileView();
      announce(profilePreviewPublic ? 'Viewing the limited public resume.' : 'Viewing your full member profile.');
    });
  }

  // The signed pledge is the sign-in. Members land on the dashboard; everyone
  // else is invited to "Take the Pledge" on its dedicated page.
  function renderAuthUi() {
    const signedIn = isMember();
    const href = signedIn ? 'dashboard.html' : 'pledge.html';
    const label = signedIn ? 'Dashboard' : 'Take the Pledge';

    document.querySelectorAll('[data-auth-cta]').forEach((element) => {
      const labelNode = element.querySelector('[data-auth-label]') || element;
      labelNode.textContent = label;
      element.setAttribute('href', href);
      element.setAttribute('aria-label', label);
    });

    const headerNotifications = document.querySelector('[data-notifications-cta]');
    if (headerNotifications) headerNotifications.hidden = !signedIn;
    updateHeaderNotificationBadge();

    // Profile-only member controls are hidden from signed-out visitors.
    document.querySelectorAll('[data-member-only]').forEach((item) => {
      item.hidden = !signedIn;
    });

    // Members do not need the pledge page, so retire pledge-only nav links.
    document.querySelectorAll('[data-pledge-nav]').forEach((item) => {
      item.hidden = signedIn;
    });

    const topButton = document.getElementById('signin-top');
    const form = document.getElementById('pledge-form');
    const signinTriggers = document.querySelectorAll('[data-signin-trigger]');
    const signedPanel = document.getElementById('pledge-already-signed');
    const dashboardLink = document.getElementById('pledge-to-dashboard-link');
    const alreadyName = document.getElementById('already-signed-name');
    const signoutButton = document.getElementById('signout-account');
    const hasCredential = Boolean(getCredential());

    if (topButton) {
      const labelNode = topButton.querySelector('[data-auth-label]') || topButton;
      labelNode.textContent = signedIn ? 'Dashboard' : 'Sign in';
    }
    // An existing local account signs in through the pop-up; no account yet
    // means the pledge form is the account setup.
    if (form) form.hidden = signedIn || hasCredential;
    signinTriggers.forEach((trigger) => {
      trigger.hidden = signedIn || !hasCredential;
    });
    if (signedPanel) signedPanel.hidden = !signedIn;
    if (dashboardLink) dashboardLink.hidden = !signedIn;
    if (signoutButton) signoutButton.hidden = !signedIn;
    if (alreadyName && signedIn) alreadyName.textContent = `Signed in as ${state.pledge.name}`;
  }

  function formatMoney(value) {
    const amount = Number(value) || 0;
    return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }

  function getMemberContributions() {
    if (!isMember()) return [];
    return (Array.isArray(state.contributions) ? state.contributions : []).filter((item) => item && item.memberId === state.pledge.memberId);
  }

  function getMemberDonationIntents() {
    if (!isMember()) return [];
    return (Array.isArray(state.donationIntents) ? state.donationIntents : []).filter((item) => item && item.memberId === state.pledge.memberId);
  }

  function getPeriodTotals(entries, dateField, valueFn) {
    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7; // Monday-based week
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayIndex).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
    const result = { week: 0, month: 0, year: 0, all: 0 };
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      const value = valueFn(entry);
      if (!(value > 0)) return;
      result.all += value;
      const when = Date.parse(entry && entry[dateField]);
      if (Number.isNaN(when)) return;
      if (when >= weekStart) result.week += value;
      if (when >= monthStart) result.month += value;
      if (when >= yearStart) result.year += value;
    });
    Object.keys(result).forEach((key) => { result[key] = Math.round(result[key] * 100) / 100; });
    return result;
  }

  // Only hours logged through a mutual worker + receiver confirmation (or the
  // three-member review vote) count. Members cannot enter hours by hand.
  function getHourTotalsFrom(contributions, memberId) {
    const id = cleanString(memberId, 100);
    if (!id) return { week: 0, month: 0, year: 0, all: 0 };
    const entries = (Array.isArray(contributions) ? contributions : [])
      .filter((c) => c && c.memberId === id && c.type === 'labor' && c.mutualConfirmation === true);
    return getPeriodTotals(entries, 'createdAt', (c) => cleanHours(c.hours));
  }

  function getHourTotals(memberId) {
    const id = memberId || (isMember() ? state.pledge.memberId : '');
    return getHourTotalsFrom(state.contributions, id);
  }

  // Hours used and item totals come from the same confirmed exchanges. The
  // source argument lets loadState recompute legacy counters without reading
  // the global state variable before it is initialized.
  function getConfirmedExchangeTotals(memberId, source) {
    const id = cleanString(memberId, 100);
    const empty = { hoursWorked: 0, hoursUsed: 0, itemsGifted: 0, itemsTaken: 0 };
    if (!id) return empty;
    const data = source && typeof source === 'object' ? source : state;
    const requests = Array.isArray(data.requests) ? data.requests : [];
    const listings = Array.isArray(data.listings) ? data.listings : [];
    const confirmed = requests.filter((request) => request
      && request.type === 'mutual_aid_request'
      && cleanHours(request.loggedHours) > 0
      && (request.logSource === 'mutual' || request.logSource === 'review' || Boolean(request.confirmedAt)));
    const findListing = (request) => listings.find((listing) => listing && listing.id === request.listingId);
    const workerId = (request) => {
      if (request.workerId) return cleanString(request.workerId, 100);
      const listing = findListing(request);
      return listing && listing.isUser ? cleanString(listing.memberId, 100) : '';
    };
    const isProduct = (request) => {
      const listing = findListing(request);
      return (request.pillar || (listing && listing.pillar)) === 'goods';
    };
    const hoursUsed = confirmed
      .filter((request) => request.memberId === id)
      .reduce((sum, request) => sum + cleanHours(request.loggedHours), 0);
    return {
      hoursWorked: getHourTotalsFrom(data.contributions, id).all,
      hoursUsed: cleanHours(hoursUsed),
      itemsGifted: confirmed.filter((request) => isProduct(request) && workerId(request) === id).length,
      itemsTaken: confirmed.filter((request) => isProduct(request) && request.memberId === id).length
    };
  }

  function getDonationTotals() {
    const contributions = getMemberContributions().filter((c) => c && c.type === 'donation');
    const linked = new Set(contributions.map((c) => c.sourceId));
    const extras = getMemberDonationIntents()
      .filter((intent) => intent && !linked.has(intent.id))
      .map((intent) => ({ createdAt: intent.savedAt, amount: Number(intent.amount) || 0 }));
    return getPeriodTotals([...contributions, ...extras], 'createdAt', (item) => Number(item.amount) || 0);
  }

  const CANCELLATION_CAP = 4000;

  // A cancellation estimate is a local prototype calculation, never a payout.
  // It uses the member's share of contributions credited to their groups and
  // alliances, multiplied by those groups' share of the donation fund, capped
  // at $4,000. Contributions must carry a groupId or allianceId to count.
  function getCancellationEstimate(fundBalance) {
    const empty = {
      estimate: 0,
      cap: CANCELLATION_CAP,
      capped: false,
      memberPercent: 0,
      groupFundPercent: 0,
      memberGroupAmount: 0,
      groupFundAmount: 0,
      fundBalance: Number(fundBalance) || 0,
      groupCount: 0,
      allianceCount: 0
    };
    const member = state.pledge && state.pledge.memberId ? state.pledge : null;
    if (!member) return empty;

    const groups = Array.isArray(state.groups) ? state.groups : [];
    const memberGroups = groups.filter((group) => group && !group.left && Array.isArray(group.members)
      && group.members.some((entry) => entry && entry.memberId === member.memberId));
    const groupIds = new Set(memberGroups.map((group) => cleanString(group.id, 120)).filter(Boolean));
    const allianceIds = new Set();
    memberGroups.forEach((group) => {
      const settings = group.settings && typeof group.settings === 'object' ? group.settings : {};
      const alliances = Array.isArray(settings.alliances) ? settings.alliances : [];
      alliances.forEach((id) => {
        const clean = cleanString(id, 120);
        if (clean) allianceIds.add(clean);
      });
    });

    const inScope = (entry) => entry && entry.fund === 'unbought'
      && (groupIds.has(cleanString(entry.groupId, 120)) || allianceIds.has(cleanString(entry.allianceId, 120)));
    const scoped = (Array.isArray(state.contributions) ? state.contributions : []).filter(inScope);
    const groupFundAmount = scoped.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const memberGroupAmount = scoped
      .filter((entry) => entry.memberId === member.memberId)
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const memberRatio = groupFundAmount > 0 ? memberGroupAmount / groupFundAmount : 0;
    const fundRatio = fundBalance > 0 ? groupFundAmount / fundBalance : 0;
    const rawEstimate = Math.max(0, Number(fundBalance) || 0) * fundRatio * memberRatio;
    const estimate = Math.round(Math.min(CANCELLATION_CAP, rawEstimate) * 100) / 100;

    return {
      estimate,
      cap: CANCELLATION_CAP,
      capped: rawEstimate > CANCELLATION_CAP,
      memberPercent: Math.round(memberRatio * 1000) / 10,
      groupFundPercent: Math.round(fundRatio * 1000) / 10,
      memberGroupAmount: Math.round(memberGroupAmount * 100) / 100,
      groupFundAmount: Math.round(groupFundAmount * 100) / 100,
      fundBalance: Math.round((Number(fundBalance) || 0) * 100) / 100,
      groupCount: groupIds.size,
      allianceCount: allianceIds.size
    };
  }

  function getSeveranceSummary() {
    // `severanceFund` is the legacy local-storage key. It now holds the
    // Unbought donation fund balance; the severance figure is the member's
    // proportional entitled share of that balance, calculated locally.
    const contributions = Array.isArray(state.contributions) ? state.contributions : [];
    const donations = contributions.filter((c) => c && c.type === 'donation');
    const purchases = contributions.filter((c) => c && c.type === 'severance_purchase');
    const stored = Number(state.severanceFund && state.severanceFund.balance) || 0;
    const purchaseTotal = purchases.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const donationTotal = donations.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    // Older browsers may carry a stored balance that predates the ledger;
    // treat only the part not already explained by purchases as legacy cash.
    const legacy = Math.max(0, stored - purchaseTotal);
    const balance = Math.round((legacy + purchaseTotal + donationTotal) * 100) / 100;
    const valueOf = (c) => (c && c.type === 'labor' ? Number(c.stockValue) || 0 : Number(c.amount) || 0);
    const memberValue = getMemberContributions().reduce((sum, c) => sum + valueOf(c), 0);
    const totalValue = contributions.reduce((sum, c) => sum + valueOf(c), 0);
    const entitled = totalValue > 0 ? Math.round(balance * (memberValue / totalValue) * 100) / 100 : 0;
    return {
      balance,
      entitled,
      donationTotal,
      purchaseTotal,
      donationCount: donations.length,
      purchaseCount: purchases.length,
      count: donations.length + purchases.length,
      cancellation: getCancellationEstimate(balance)
    };
  }

  // Each group gets a local, uncapped estimate of what it could spend from the
  // surplus. It is based on the group's share of all locally credited
  // contributions to Unbought, applied to the current local fund balance as a
  // surplus proxy. No cap is applied and no money moves in the prototype.
  function getGroupSurplusAllowance(groupId) {
    const id = cleanString(groupId, 120);
    const contributions = (Array.isArray(state.contributions) ? state.contributions : [])
      .filter((entry) => entry && entry.fund === 'unbought');
    const total = contributions.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const groupAmount = contributions
      .filter((entry) => cleanString(entry.groupId, 120) === id)
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const percent = total > 0 ? groupAmount / total : 0;
    const fundBalance = getSeveranceSummary().balance;
    return {
      amount: Math.round(percent * fundBalance * 100) / 100,
      percent: Math.round(percent * 1000) / 10,
      groupAmount: Math.round(groupAmount * 100) / 100,
      fundBalance: Math.round(fundBalance * 100) / 100
    };
  }

  // Members always receive listings free. Providers may opt in to a fixed
  // non-member price; the whole amount is recorded locally for the Unbought
  // fund. Non-members never enter their own price.
  function normalizeNonmemberPurchase(value) {
    if (!value || typeof value !== 'object') return { enabled: false, price: 0 };
    const price = Math.max(0, Math.round(Number(value.price) || 0));
    const enabled = Boolean(value.enabled) && price > 0;
    return { enabled, price: enabled ? price : 0 };
  }

  function getNonmemberPrice(listing) {
    return normalizeNonmemberPurchase(listing && listing.nonmemberPurchase).price;
  }

  function canPurchaseAsNonmember(listing) {
    return getNonmemberPrice(listing) > 0;
  }

  function allReports() {
    return Array.isArray(state.reports) ? state.reports : [];
  }

  function getMemberReports() {
    if (!isMember()) return [];
    return allReports().filter((report) => report && report.reporterMemberId === state.pledge.memberId);
  }

  function isRespondent(report) {
    if (!isMember() || !report) return false;
    if (report.respondentMemberId && report.respondentMemberId === state.pledge.memberId) return true;
    const name = String(state.pledge.name || '').trim().toLowerCase();
    const respondent = String(report.respondentName || '').trim().toLowerCase();
    return Boolean(respondent && respondent === name);
  }

  function reportsAboutMember() {
    if (!isMember()) return [];
    return allReports().filter((report) => isRespondent(report));
  }

  // Review board eligibility. Voters must be impartial and geographically
  // connected to the case: no parties, friends of parties, observers, or care
  // circle members, and the voter's physical-address county must match the
  // physical-address county of at least one involved party.
  function reviewMemberStatus(memberId) {
    const id = cleanString(memberId, 100);
    if (!id) return { track: '', standing: '' };
    if (state.pledge && state.pledge.memberId === id) {
      return {
        track: cleanString(state.track, 30).toLowerCase(),
        standing: cleanString(state.pledge.status, 30).toLowerCase()
      };
    }
    const rosterEntry = getMemberRoster().find((item) => item && item.memberId === id);
    if (rosterEntry) {
      return {
        track: cleanString(rosterEntry.track, 30).toLowerCase(),
        standing: cleanString(rosterEntry.standing, 30).toLowerCase()
      };
    }
    const member = memberDirectory().find((item) => item && item.memberId === id);
    return {
      track: cleanString(member && member.track, 30).toLowerCase(),
      standing: cleanString(member && member.standing, 30).toLowerCase()
    };
  }

  function reviewPartyMemberIds(report) {
    if (!report) return [];
    const ids = [report.reporterMemberId, report.respondentMemberId]
      .map((id) => cleanString(id, 100))
      .filter(Boolean);
    const selfName = cleanString(state.pledge && state.pledge.name, 60).trim().toLowerCase();
    if (selfName && state.pledge && state.pledge.memberId) {
      [report.reporterName, report.respondentName].forEach((name) => {
        if (cleanString(name, 80).trim().toLowerCase() === selfName) ids.push(state.pledge.memberId);
      });
    }
    return [...new Set(ids)];
  }

  function reviewMemberLocation(memberId, snapshotCounty, snapshotState) {
    const member = findMemberById(cleanString(memberId, 100));
    const county = normalizeCounty(member && member.physicalCounty) || normalizeCounty(snapshotCounty);
    const stateCode = normalizeStateCode(member && member.physicalState) || normalizeStateCode(snapshotState);
    return { county, state: stateCode, key: countyKey(county, stateCode) };
  }

  function groupsContainingMember(memberId) {
    const id = cleanString(memberId, 100);
    if (!id) return [];
    return (Array.isArray(state.groups) ? state.groups : [])
      .filter((group) => group && group.name && !group.left)
      .map(normalizeGroup)
      .filter((group) => group.members.some((member) => member && member.memberId === id));
  }

  function hasRecentReportAgainst(memberId) {
    const id = cleanString(memberId, 100);
    if (!id) return false;
    const member = findMemberById(id);
    const name = cleanString(member && member.name, 80).trim().toLowerCase();
    const cutoff = Date.now() - (365 * DAY_MS);
    return allReports().some((report) => {
      if (!report) return false;
      const created = Date.parse(report.createdAt);
      if (Number.isNaN(created) || created < cutoff) return false;
      if (cleanString(report.respondentMemberId, 100) === id) return true;
      return Boolean(name && cleanString(report.respondentName, 80).trim().toLowerCase() === name);
    });
  }

  function groupZipCode(group) {
    const settings = normalizeGroupSettings(group && group.settings);
    if (settings.online) return '';
    return zipFromAddress(settings.location || (group && group.location) || '');
  }

  function reviewVoteBlockReason(report, memberId) {
    if (!isMember() || !report) return 'Only signed-in pledged members can vote on review board cases.';
    const id = cleanString(memberId, 100);
    if (!id) return 'Only pledged members can vote on review board cases.';

    const partyIds = reviewPartyMemberIds(report);
    if (partyIds.includes(id)) return 'Involved parties do not vote on their own case.';

    const friends = Array.isArray(state.friends) ? state.friends : [];
    if (friends.some((friend) => partyIds.includes(cleanString(friend && friend.memberId, 100)))) {
      return 'Friends of involved parties do not vote on the case.';
    }

    const standing = reviewMemberStatus(id);
    if (standing.track === 'care' || standing.standing === 'care') {
      return 'Care Circle members do not vote on review board cases.';
    }
    if (['observer', 'observe_only'].includes(standing.track) || ['observer', 'observe_only'].includes(standing.standing)) {
      return 'Observers do not vote on review board cases.';
    }

    // Group and alliance membership are additional routes into the same review
    // board. A group member with a recent report against them cannot use the
    // group route, and a group may vote to close its board to outside-ZIP
    // alliances only.
    const voterGroups = groupsContainingMember(id);
    const voterGroupIds = voterGroups.map((group) => group.id);
    const partyGroups = partyIds.flatMap((partyId) => groupsContainingMember(partyId));
    if (partyGroups.some((group) => voterGroupIds.includes(group.id))) {
      if (hasRecentReportAgainst(id)) {
        return 'Group members with a report against them in the last year do not vote on review board cases.';
      }
      return '';
    }
    for (const partyGroup of partyGroups) {
      const settings = normalizeGroupSettings(partyGroup.settings);
      const ally = voterGroups.find((group) => settings.alliances.includes(group.id));
      if (!ally) continue;
      const groupZip = groupZipCode(partyGroup);
      const allyZip = groupZipCode(ally);
      const outsideZip = Boolean(groupZip && allyZip && groupZip !== allyZip);
      if (!settings.reviewBoard.openToAlliance && outsideZip) {
        return 'This group voted to keep its review board closed to alliances outside its ZIP code.';
      }
      return '';
    }

    const voter = reviewMemberLocation(id);
    if (!voter.key) return 'Your physical-address county is not on file, so county eligibility cannot be confirmed.';
    const partyKeys = [
      reviewMemberLocation(report.reporterMemberId, report.reporterCounty, report.reporterState).key,
      reviewMemberLocation(report.respondentMemberId, report.respondentCounty, report.respondentState).key
    ].filter(Boolean);
    if (!partyKeys.length) return 'The involved parties’ physical-address counties are not on file.';
    if (!partyKeys.includes(voter.key)) {
      return 'Voting is open only to members whose physical address is in the same county as one of the involved parties.';
    }
    return '';
  }

  // A local notice is created once per member per case when voting opens and
  // that member is actually eligible to cast a ballot.
  function notifyEligibleVoters(report) {
    if (!isMember() || !report || report.status !== 'board_review') return;
    const memberId = cleanString(state.pledge.memberId, 100);
    if (!memberId || reviewVoteBlockReason(report, memberId)) return;
    const sent = Array.isArray(report.votingNotices) ? report.votingNotices : [];
    if (sent.includes(memberId)) return;
    report.votingNotices = [...sent, memberId].slice(-50);
    addNotification(
      'review',
      'You are eligible to vote in a review board case',
      `${cleanString(report.typeLabel || report.type, 80) || 'A case'} is open for member review. Read the case file and cast your vote in the Review Board. Nothing was transmitted.`,
      { tab: 'review', sourceId: cleanString(report.id, 100) }
    );
    saveState();
    renderNotifications();
    updateHeaderNotificationBadge();
  }

  // Move cases whose evidence-gathering window has ended into voting. This is
  // called on load and on render so the demo stays consistent across reloads.
  function syncReportPhases() {
    let changed = false;
    const now = Date.now();
    allReports().forEach((report) => {
      if (report.status !== 'response_period') return;
      const deadline = Date.parse(report.responseDeadlineAt);
      if (report.responseDeadlineAt && !Number.isNaN(deadline) && now < deadline) return;
      report.status = 'board_review';
      report.votingEndsAt = new Date(now + (VOTING_DAYS * DAY_MS)).toISOString();
      notifyEligibleVoters(report);
      changed = true;
    });
    if (changed) saveState();
  }

  function isRestrictionComplete(report) {
    const steps = report.treatmentSteps || {};
    const periodDone = !report.restrictionEnd || Date.now() >= Date.parse(report.restrictionEnd);
    return Boolean(periodDone && steps.evaluation && steps.plan && steps.treatment);
  }

  function getActiveRestriction() {
    return reportsAboutMember().find((report) => report.status === 'restriction_active') || null;
  }

  function hasActiveRestriction() {
    const report = getActiveRestriction();
    return Boolean(report && !isRestrictionComplete(report));
  }

  function requireMembership(message) {
    if (isMember()) return true;
    showToast(message || 'Sign the Unbought Pledge to become a member and participate.');
    const pledgeLink = document.querySelector('a[data-auth-cta], a[href="pledge.html"]');
    if (pledgeLink) {
      pledgeLink.focus({ preventScroll: true });
    }
    return false;
  }

  function requireFullAccess(message) {
    if (!requireMembership()) return false;
    if (hasActiveRestriction()) {
      showToast(message || 'Full access is paused during your reflection period. Basic necessities remain available under the Community Guidelines definition.');
      return false;
    }
    return true;
  }

  function cleanString(value, maxLength = 400) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
  }

  function cleanCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function cleanHours(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : 0;
  }

  function normalizeHousingStatus(value) {
    const status = cleanString(value, 30);
    if (hasOwn(HOUSING_STATUSES, status)) return status;
    if (status === 'family') return 'live with family';
    if (status === 'intentional') return 'intentional community';
    return '';
  }

  function firstName(value) {
    return cleanString(value, 60).split(/\s+/)[0] || '';
  }

  function safeCity(value) {
    const city = cleanString(value, 80).replace(/[.,\s]+$/, '');
    if (!city || /^\d/.test(city)) return '';
    // A street line is never a safe public City value.
    if (/\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|ct|court|way|ter|terrace|pkwy|parkway)\b/i.test(city)) return '';
    return city;
  }

  // Public resumes show City, State only. If the address cannot be parsed
  // safely, the caller falls back to the member's general location.
  function parseCityState(address) {
    const parts = cleanString(address, 240)
      .split(/[\n,]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    for (let index = 0; index < parts.length; index += 1) {
      const match = parts[index].match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/);
      if (!match || index === 0) continue;
      const city = safeCity(parts[index - 1]);
      if (city) return `${city}, ${match[1].toUpperCase()}`;
    }
    return '';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  // Only http(s) links become clickable; anything else is shown as plain text.
  function safeMediaUrl(value) {
    const url = cleanString(value, 500);
    return /^https?:\/\//i.test(url) ? url : '';
  }

  // Evidence images are stored as small local data URLs. SVG and other
  // scriptable formats are rejected so case files cannot execute markup.
  function safeEvidenceImageUrl(value) {
    const url = cleanString(value, REPORT_EVIDENCE.maxDataLength);
    return /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(url) ? url : '';
  }

  // Profile pictures use the same local-only, resized data URL shape as post
  // photos. Nothing is uploaded in the prototype.
  function safeProfileImageUrl(value) {
    const url = cleanString(value, POST_PHOTOS.maxDataLength);
    return /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(url) ? url : '';
  }

  function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return '0 KB';
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function cleanEvidenceItem(item) {
    if (!item || typeof item !== 'object') return null;
    const kind = cleanString(item.kind, 20);
    const name = cleanString(item.name, 120) || 'Evidence';
    const mime = cleanString(item.mime, 80);
    const size = Number.isFinite(Number(item.size)) ? Math.max(0, Number(item.size)) : 0;
    const caption = cleanString(item.caption, 200);
    const submittedBy = cleanString(item.submittedBy, 60);

    if (kind === 'image') {
      const dataUrl = safeEvidenceImageUrl(item.dataUrl);
      if (!dataUrl) return null;
      return { kind, name, mime, size, caption, submittedBy, dataUrl };
    }
    if (kind === 'text') {
      const text = cleanString(item.text, REPORT_EVIDENCE.maxTextLength);
      if (!text) return null;
      return { kind, name, mime: mime || 'text/plain', size, caption, submittedBy, text };
    }
    if (kind === 'file') {
      return { kind, name, mime, size, caption, submittedBy };
    }
    return null;
  }

  function cleanEvidenceItems(items) {
    return (Array.isArray(items) ? items : [])
      .slice(0, REPORT_EVIDENCE.maxItems)
      .map(cleanEvidenceItem)
      .filter(Boolean);
  }

  // Listing conversations use the same small comment shape as case files. A
  // reply is just a comment whose text starts with @Name.
  function cleanThreadComments(items) {
    return (Array.isArray(items) ? items : [])
      .slice(-200)
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: cleanString(item.id, 100) || makeId('comment'),
        memberId: cleanString(item.memberId, 100),
        name: cleanString(item.name, 60) || 'Member',
        text: cleanString(item.text, 800),
        createdAt: cleanString(item.createdAt, 40)
      }))
      .filter((item) => item.text);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read-failed'));
      reader.readAsDataURL(file);
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read-failed'));
      reader.readAsText(file);
    });
  }

  // Photo records are shaped like a future database row: an id, metadata, and
  // a local-only dataUrl. A later backend can fill storageRef and drop the
  // dataUrl without changing any of the listing code.
  async function preparePostPhoto(file) {
    if (!file || !POST_PHOTOS.imageTypes.includes(file.type)) return null;
    if (Number(file.size) > POST_PHOTOS.maxFileBytes) return null;
    try {
      const sourceUrl = await readFileAsDataUrl(file);
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('image-failed'));
        element.src = sourceUrl;
      });
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) return null;
      const scale = Math.min(1, POST_PHOTOS.maxEdge / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.68);
      if (dataUrl.length > POST_PHOTOS.maxDataLength) return null;
      return {
        id: makeId('photo'),
        name: cleanString(file.name, 120) || 'Photo',
        mime: 'image/jpeg',
        size: Number(file.size) || 0,
        width: canvas.width,
        height: canvas.height,
        dataUrl,
        storageRef: '',
        addedAt: new Date().toISOString()
      };
    } catch (error) {
      return null;
    }
  }

  async function preparePostPhotos(files) {
    const photos = [];
    for (const file of files) {
      if (photos.length >= POST_PHOTOS.maxItems) break;
      const photo = await preparePostPhoto(file);
      if (photo) photos.push(photo);
    }
    return photos;
  }

  function cleanPostPhotos(items) {
    return (Array.isArray(items) ? items : [])
      .slice(0, POST_PHOTOS.maxItems)
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const dataUrl = typeof item.dataUrl === 'string'
          && item.dataUrl.startsWith('data:image/jpeg;base64,')
          && item.dataUrl.length <= POST_PHOTOS.maxDataLength
          ? item.dataUrl
          : '';
        if (!dataUrl) return null;
        return {
          id: cleanString(item.id, 100) || makeId('photo'),
          name: cleanString(item.name, 120) || 'Photo',
          mime: 'image/jpeg',
          size: Number(item.size) || 0,
          width: Number(item.width) || 0,
          height: Number(item.height) || 0,
          dataUrl,
          storageRef: cleanString(item.storageRef, 160),
          addedAt: cleanString(item.addedAt, 40)
        };
      })
      .filter(Boolean);
  }

  // Returns [] when no file was chosen and null when a chosen image could not be
  // resized locally. Callers can tell a normal empty photo field from a failure.
  async function prepareFormPostPhoto(form, inputName = 'picture') {
    const input = form && typeof form.querySelector === 'function' ? form.querySelector(`input[name="${inputName}"]`) : null;
    const file = input && input.files ? input.files[0] : null;
    if (!file) return [];
    const photo = await preparePostPhoto(file);
    return photo ? [photo] : null;
  }

  function renderPostPhotos(form, photos) {
    const preview = $('#post-photos-preview', form);
    const count = $('#post-photo-count', form);
    if (count) count.textContent = `${photos.length} of ${POST_PHOTOS.maxItems} photos selected.`;
    if (!preview) return;
    preview.replaceChildren();
    photos.forEach((photo, index) => {
      const figure = createEl('figure', 'post-photo');
      const image = createEl('img');
      image.src = photo.dataUrl;
      image.alt = `Selected photo: ${photo.name}`;
      image.loading = 'lazy';
      figure.appendChild(image);
      const remove = createEl('button', 'post-photo-remove', 'Remove');
      remove.type = 'button';
      remove.dataset.removePostPhoto = String(index);
      remove.setAttribute('aria-label', `Remove photo ${photo.name}`);
      figure.appendChild(remove);
      preview.appendChild(figure);
    });
  }

  function getReportContextSummary(report) {
    const area = cleanString(report && report.contextArea, 80) || 'Dashboard';
    const detail = cleanString(report && report.contextDetail, 160);
    const target = cleanString(report && report.respondentName, 80);
    const parts = [area];
    if (target) parts.push(`about ${target}`);
    if (detail) parts.push(detail);
    return parts.join(' · ');
  }

  function renderEvidenceList(items, e) {
    const evidence = cleanEvidenceItems(items);
    if (!evidence.length) return `<p class="account-note">No uploaded evidence was attached.</p>`;
    return `<ul class="evidence-list">${evidence.map((item) => {
      if (item.kind === 'image' && item.dataUrl) {
        return `<li class="evidence-item evidence-item--image"><figure><img src="${item.dataUrl}" alt="${e(item.caption || item.name)}" loading="lazy"><figcaption><strong>${e(item.name)}</strong>${item.caption ? ` · ${e(item.caption)}` : ''}<span class="contribution-meta">${e(formatBytes(item.size))} · stored locally as an image preview</span></figcaption></figure></li>`;
      }
      if (item.kind === 'text' && item.text) {
        const preview = item.text.length > 1200 ? `${item.text.slice(0, 1200)}\n…` : item.text;
        return `<li class="evidence-item"><strong>${e(item.name)}</strong>${item.caption ? `<p>${e(item.caption)}</p>` : ''}<p class="contribution-meta">${e(formatBytes(item.size))} · text stored locally in this browser</p><pre class="evidence-text">${e(preview)}</pre></li>`;
      }
      return `<li class="evidence-item"><strong>${e(item.name)}</strong>${item.caption ? `<p>${e(item.caption)}</p>` : ''}<p class="contribution-meta">${e([item.mime, formatBytes(item.size)].filter(Boolean).join(' · '))} · file selected from this device; this prototype stored details only, not the file contents or transmission.</p></li>`;
    }).join('')}</ul>`;
  }

  // Only accept keys that belong to the object itself. This keeps stray
  // prototype names (for example "constructor") from passing as valid data.
  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function isValidListing(item) {
    return Boolean(
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      hasOwn(PILLARS, item.pillar) &&
      hasOwn(EXCHANGES, item.exchange) &&
      typeof item.provider === 'string' &&
      typeof item.location === 'string' &&
      typeof item.description === 'string'
    );
  }

  function normalizeStoredListing(item) {
    const isGoods = item.pillar === 'goods';
    // Listings saved before the goods taxonomy changed used condition words as
    // their category. Keep them usable by moving the old value to condition.
    const legacyCategories = { new: 'new', homemade: 'homemade', used: 'used', parts: 'parts' };
    let category = isGoods && hasOwn(GOODS_CATEGORIES, item.category) ? item.category : '';
    let condition = isGoods && hasOwn(GOOD_CONDITIONS, item.condition) ? item.condition : '';
    if (isGoods && !category && hasOwn(legacyCategories, item.category)) {
      category = 'other';
      condition = legacyCategories[item.category];
    }
    const attributes = {};
    if (isGoods && item.attributes && typeof item.attributes === 'object') {
      Object.keys(GOOD_FACETS).forEach((key) => {
        const value = cleanString(item.attributes[key], 60);
        if (value && GOOD_FACETS[key].options.includes(value)) attributes[key] = value;
      });
    }
    // Keep a structured location on every listing so filters can use city,
    // state, and ZIP without relying on the human-readable label alone.
    const place = locationOf(item);
    return {
      id: cleanString(item.id, 100) || `listing-${Date.now().toString(36)}`,
      memberId: cleanString(item.memberId, 100),
      title: cleanString(item.title, 80),
      pillar: item.pillar,
      exchange: item.exchange,
      category,
      ...(isGoods ? {} : {
        jobTitle: cleanString(item.jobTitle, 80),
        format: hasOwn(SERVICE_FORMATS, item.format) ? item.format : 'inperson',
        locationMode: hasOwn(LOCATION_MODES, item.locationMode) ? item.locationMode : 'cityStateZip'
      }),
      ...(isGoods ? {
        condition,
        color: GOOD_COLORS.includes(item.color) ? item.color : '',
        brand: cleanString(item.brand, 60),
        attributes
      } : {}),
      photos: cleanPostPhotos(item.photos),
      comments: cleanThreadComments(item.comments),
      nonmemberPurchase: normalizeNonmemberPurchase(item.nonmemberPurchase),
      provider: cleanString(item.provider, 60),
      location: cleanString(item.location, 80),
      city: place.city,
      state: place.state,
      zip: place.zip,
      description: cleanString(item.description, 400),
      nsfw: Boolean(item.nsfw),
      note: cleanString(item.note, 120) || 'Added by a neighbor · consent first',
      scope: hasOwn(SCOPE_LABELS, item.scope) ? item.scope : '',
      details: Array.isArray(item.details)
        ? item.details
            .filter((detail) => detail && typeof detail === 'object')
            .slice(0, 4)
            .map((detail) => ({
              label: cleanString(detail.label, 40),
              value: cleanString(detail.value, 120)
            }))
            .filter((detail) => detail.label && detail.value)
        : [],
      isUser: true,
      createdAt: cleanString(item.createdAt, 40),
      status: cleanString(item.status, 30) || 'active'
    };
  }

  function loadState() {
    const fallback = createDefaultState();
    let raw = null;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      raw = saved ? JSON.parse(saved) : null;
    } catch (error) {
      return fallback;
    }

    if (!raw || typeof raw !== 'object') return fallback;

    if (raw.pledge && typeof raw.pledge === 'object') {
      const name = cleanString(raw.pledge.name, 60);
      if (name) {
        const signedAt = cleanString(raw.pledge.signedAt, 40) || new Date().toISOString();
        const parsedName = parseFullNameParts(raw.pledge.fullName);
        const firstName = cleanString(raw.pledge.firstName, 40) || parsedName.firstName;
        const middleInitial = cleanString(raw.pledge.middleInitial, 2) || parsedName.middleInitial;
        const lastName = cleanString(raw.pledge.lastName, 60) || parsedName.lastName;
        const suffix = cleanString(raw.pledge.suffix, 12) || parsedName.suffix;
        const fullName = cleanString(raw.pledge.fullName, 100)
          || composeFullName({ firstName, middleInitial, lastName, suffix });
        const parsedAddress = parseMailingParts(raw.pledge.mailingAddress);
        const address1 = cleanString(raw.pledge.address1, 100) || parsedAddress.address1;
        const address2 = cleanString(raw.pledge.address2, 100) || parsedAddress.address2;
        const city = cleanString(raw.pledge.city, 80) || parsedAddress.city;
        const stateCode = normalizeStateCode(raw.pledge.state) || parsedAddress.state;
        const mailingAddress = cleanString(raw.pledge.mailingAddress, 240)
          || composeMailingAddress({ address1, address2, city, state: stateCode, zip: raw.pledge.zip });
        const parsedPhysicalAddress = parseMailingParts(raw.pledge.physicalAddress);
        const cellPhone = cleanString(raw.pledge.cellPhone || raw.pledge.phone, 40);
        const storedPublicPhone = cleanString(raw.pledge.publicPhoneNumber, 40);
        const samePhone = typeof raw.pledge.samePhone === 'boolean'
          ? raw.pledge.samePhone
          : !storedPublicPhone;
        const publicPhoneNumber = samePhone ? cellPhone : storedPublicPhone;
        fallback.pledge = {
          memberId: cleanString(raw.pledge.memberId, 100) || makeId('member'),
          name,
          fullName,
          firstName,
          middleInitial,
          lastName,
          suffix,
          location: cleanString(raw.pledge.location, 80),
          address1,
          address2,
          city,
          county: normalizeCounty(raw.pledge.county),
          state: stateCode,
          mailingAddress,
          physicalAddress: cleanString(raw.pledge.physicalAddress, 240),
          physicalAddress1: cleanString(raw.pledge.physicalAddress1, 100) || parsedPhysicalAddress.address1,
          physicalAddress2: cleanString(raw.pledge.physicalAddress2, 100) || parsedPhysicalAddress.address2,
          physicalCity: cleanString(raw.pledge.physicalCity, 80) || parsedPhysicalAddress.city,
          physicalCounty: normalizeCounty(raw.pledge.physicalCounty),
          physicalState: normalizeStateCode(raw.pledge.physicalState) || parsedPhysicalAddress.state,
          physicalZip: normalizeZip(raw.pledge.physicalZip || parsedPhysicalAddress.zip),
          housingStatus: normalizeHousingStatus(raw.pledge.housingStatus),
          phone: cellPhone,
          cellPhone,
          publicPhoneNumber,
          samePhone,
          receiveTexts: Boolean(raw.pledge.receiveTexts),
          dob: cleanString(raw.pledge.dob, 10),
          profession: normalizeProfession(raw.pledge.profession
            || String(raw.pledge.paidSkills || '').split(/[\n,;]/)[0]),
          zip: normalizeZip(raw.pledge.zip || zipFromAddress(raw.pledge.mailingAddress)),
          paidSkills: cleanString(raw.pledge.paidSkills, 400),
          unpaidSkills: cleanString(raw.pledge.unpaidSkills, 400),
          bio: cleanString(raw.pledge.bio, 600),
          picture: safeProfileImageUrl(raw.pledge.picture),
          tagline: cleanString(raw.pledge.tagline, 90),
          group: cleanString(raw.pledge.group, 80),
          donationCount: cleanCount(raw.pledge.donationCount),
          hoursCompleted: cleanHours(raw.pledge.hoursCompleted),
          hoursUsed: cleanHours(raw.pledge.hoursUsed),
          itemsGifted: cleanCount(raw.pledge.itemsGifted),
          itemsTaken: cleanCount(raw.pledge.itemsTaken),
          available: raw.pledge.available !== false,
          publicAddressSource: raw.pledge.publicAddressSource === 'physical' ? 'physical' : 'mailing',
          publicPhone: Boolean(raw.pledge.publicPhone),
          powerOfAttorney: raw.pledge.powerOfAttorney && typeof raw.pledge.powerOfAttorney === 'object'
            ? {
              enabled: Boolean(raw.pledge.powerOfAttorney.enabled),
              representativeName: cleanString(raw.pledge.powerOfAttorney.representativeName, 80),
              relationship: cleanString(raw.pledge.powerOfAttorney.relationship, 80),
              username: normalizeUsername(raw.pledge.powerOfAttorney.username)
            }
            : null,
          profileTheme: {
            public: {
              background: validThemeColor(raw.pledge.profileTheme && raw.pledge.profileTheme.public && raw.pledge.profileTheme.public.background, PROFILE_THEME_DEFAULTS.public.background),
              content: validThemeColor(raw.pledge.profileTheme && raw.pledge.profileTheme.public && raw.pledge.profileTheme.public.content, PROFILE_THEME_DEFAULTS.public.content)
            },
            private: {
              background: validThemeColor(raw.pledge.profileTheme && raw.pledge.profileTheme.private && raw.pledge.profileTheme.private.background, PROFILE_THEME_DEFAULTS.private.background),
              content: validThemeColor(raw.pledge.profileTheme && raw.pledge.profileTheme.private && raw.pledge.profileTheme.private.content, PROFILE_THEME_DEFAULTS.private.content)
            }
          },
          note: cleanString(raw.pledge.note, 240),
          signedAt,
          status: 'active'
        };
      }
    }

    if (Array.isArray(raw.memberRoster)) {
      fallback.memberRoster = raw.memberRoster
        .filter((item) => item && typeof item === 'object' && cleanString(item.memberId, 100))
        .map((item) => {
          const profession = normalizeProfession(item.profession);
          return {
            memberId: cleanString(item.memberId, 100),
            name: cleanString(item.name, 60),
            profession,
            professionKey: profession.toLowerCase(),
            cityState: cleanString(item.cityState, 100),
            zip: normalizeZip(item.zip),
            county: normalizeCounty(item.county),
            physicalCounty: normalizeCounty(item.physicalCounty),
            physicalState: normalizeStateCode(item.physicalState),
            signedAt: cleanString(item.signedAt, 40),
            standing: cleanString(item.standing, 30) || 'active',
            track: cleanString(item.track, 30),
            available: item.available !== false
          };
        })
        .slice(0, 500);
    }

    const rawAuth = raw.auth && typeof raw.auth === 'object' ? raw.auth : null;
    const normalizeCredential = (item, defaultRole) => {
      if (!item || typeof item !== 'object') return null;
      const username = normalizeUsername(item.username);
      const salt = cleanString(item.salt, 40);
      const passwordHash = cleanString(item.passwordHash, 16);
      if (!username || !salt || !passwordHash) return null;
      const role = item.role === 'representative' ? 'representative' : defaultRole;
      return {
        id: cleanString(item.id, 100) || username,
        username,
        salt,
        passwordHash,
        role,
        label: cleanString(item.label, 80) || (role === 'representative' ? 'Authorized representative' : 'Member'),
        representativeName: cleanString(item.representativeName, 80),
        relationship: cleanString(item.relationship, 80)
      };
    };
    const rawCredential = rawAuth && rawAuth.credential && typeof rawAuth.credential === 'object'
      ? rawAuth.credential
      : null;
    const primaryCredential = normalizeCredential(rawCredential, 'member');
    const credentials = [];
    if (primaryCredential) {
      credentials.push(primaryCredential);
      fallback.auth.credential = {
        username: primaryCredential.username,
        salt: primaryCredential.salt,
        passwordHash: primaryCredential.passwordHash
      };
    }
    if (rawAuth && Array.isArray(rawAuth.credentials)) {
      rawAuth.credentials.forEach((item) => {
        const credential = normalizeCredential(item, 'member');
        if (!credential || credentials.some((entry) => entry.username === credential.username)) return;
        credentials.push(credential);
      });
    }
    fallback.auth.credentials = credentials;
    if (!fallback.auth.credential && credentials.length) {
      fallback.auth.credential = {
        username: credentials[0].username,
        salt: credentials[0].salt,
        passwordHash: credentials[0].passwordHash
      };
    }
    if (rawAuth && rawAuth.session && typeof rawAuth.session === 'object') {
      fallback.auth.session = {
        signedIn: Boolean(rawAuth.session.signedIn),
        signedInAt: cleanString(rawAuth.session.signedInAt, 40) || null,
        credentialId: cleanString(rawAuth.session.credentialId, 100)
          || (fallback.auth.credential ? fallback.auth.credential.username : ''),
        actingAs: rawAuth.session.actingAs === 'representative' ? 'representative' : 'member'
      };
    }
    if (!fallback.auth.credential && fallback.pledge) {
      // Legacy local pledges predate usernames; keep them signed in.
      fallback.auth.session = { signedIn: true, signedInAt: fallback.pledge.signedAt, credentialId: '', actingAs: 'member' };
    }

    if (typeof raw.track === 'string' && hasOwn(TRACKS, raw.track)) {
      fallback.track = raw.track;
    }

    if (raw.trackDetails && typeof raw.trackDetails === 'object' && !Array.isArray(raw.trackDetails)) {
      fallback.trackDetails = raw.trackDetails;
    }

    if (Array.isArray(raw.listings)) {
      fallback.listings = raw.listings
        .filter(isValidListing)
        .slice(0, 60)
        .map(normalizeStoredListing);
    }

    if (Array.isArray(raw.requests)) {
      fallback.requests = raw.requests
        .filter((request) => request && typeof request === 'object' && typeof request.listingId === 'string')
        .slice(0, 100)
        .map((request) => ({
          id: cleanString(request.id, 100) || makeId('request'),
          type: cleanString(request.type, 40) || 'mutual_aid_request',
          memberId: cleanString(request.memberId, 100),
          listingId: cleanString(request.listingId, 100),
          listingTitle: cleanString(request.listingTitle, 80),
          provider: cleanString(request.provider, 60),
          memberName: cleanString(request.memberName, 60),
          note: cleanString(request.note, 280),
          pillar: cleanString(request.pillar, 40),
          workerId: cleanString(request.workerId, 100),
          workerHours: cleanHours(request.workerHours),
          workerConfirmedAt: cleanString(request.workerConfirmedAt, 40),
          receiverHours: cleanHours(request.receiverHours),
          receiverConfirmedAt: cleanString(request.receiverConfirmedAt, 40),
          loggedHours: cleanHours(request.loggedHours),
          logSource: cleanString(request.logSource, 20),
          loggedAt: cleanString(request.loggedAt, 40),
          evidence: cleanEvidenceItems(request.evidence),
          review: request.review && typeof request.review === 'object' && !Array.isArray(request.review)
            ? {
                panel: (Array.isArray(request.review.panel) ? request.review.panel : [])
                  .filter((seat) => seat && typeof seat === 'object')
                  .slice(0, 3)
                  .map((seat) => ({
                    memberId: cleanString(seat.memberId, 100),
                    name: cleanString(seat.name, 60)
                  })),
                votes: (Array.isArray(request.review.votes) ? request.review.votes : [])
                  .filter((vote) => vote && typeof vote === 'object')
                  .slice(0, 3)
                  .map((vote) => ({
                    seatIndex: Number.isInteger(Number(vote.seatIndex)) ? Number(vote.seatIndex) : null,
                    hours: cleanHours(vote.hours),
                    reason: cleanString(vote.reason, 240),
                    votedAt: cleanString(vote.votedAt, 40)
                  })),
                resolvedHours: cleanHours(request.review.resolvedHours),
                resolvedAt: cleanString(request.review.resolvedAt, 40)
              }
            : null,
          requestedAt: cleanString(request.requestedAt, 40),
          confirmedAt: cleanString(request.confirmedAt, 40),
          status: cleanString(request.status, 30) || 'requested'
        }));
    }

    if (Array.isArray(raw.inquiries)) {
      fallback.inquiries = raw.inquiries
        .filter((inquiry) => inquiry && typeof inquiry === 'object' && typeof inquiry.type === 'string')
        .slice(0, 100)
        .map((inquiry) => ({
          ...inquiry,
          id: cleanString(inquiry.id, 100) || makeId('inquiry'),
          memberId: cleanString(inquiry.memberId, 100),
          type: cleanString(inquiry.type, 40),
          createdAt: cleanString(inquiry.createdAt, 40),
          status: cleanString(inquiry.status, 30) || 'open'
        }));
    }

    if (Array.isArray(raw.donationIntents)) {
      fallback.donationIntents = raw.donationIntents
        .filter((item) => item && typeof item === 'object')
        .slice(0, 100)
        .map((item) => ({
          id: cleanString(item.id, 40) || makeId('donation'),
          memberId: cleanString(item.memberId, 100),
          amount: Number.isFinite(Number(item.amount)) ? Math.max(0, Math.round(Number(item.amount))) : 0,
          frequency: cleanString(item.frequency, 30),
          name: cleanString(item.name, 60),
          email: cleanString(item.email, 120),
          note: cleanString(item.note, 280),
          savedAt: cleanString(item.savedAt, 40),
          status: cleanString(item.status, 30) || 'intent',
          stockValue: Number.isFinite(Number(item.stockValue)) ? Math.max(0, Number(item.stockValue)) : (Number.isFinite(Number(item.amount)) ? Math.max(0, Number(item.amount)) : 0),
          groupId: cleanString(item.groupId, 120),
          allianceId: cleanString(item.allianceId, 120),
          thankYouEmailQueued: Boolean(item.thankYouEmailQueued)
        }))
        .filter((item) => item.amount >= 1 && ['one-time', 'monthly', 'pledge-later'].includes(item.frequency));
    }

    // The surplus wishlist is a local prototype catalog. It is normalized here
    // so donate.js additions survive the next loadState() on any page.
    if (Array.isArray(raw.wishlistItems)) {
      const wishlistCategory = (value) => {
        if (value === 'need' || value === 'high') return 'high';
        if (value === 'want' || value === 'medium') return 'medium';
        return 'nice';
      };
      fallback.wishlistItems = raw.wishlistItems
        .filter((item) => item && typeof item === 'object')
        .slice(0, 200)
        .map((item) => {
          const category = wishlistCategory(item.category);
          return {
            id: cleanString(item.id, 100) || makeId('wish'),
            memberId: cleanString(item.memberId, 100),
            memberName: cleanString(item.memberName, 60),
            title: cleanString(item.title, 120),
            category,
            wishlistGroup: ['active', 'disabled', 'over65', 'homeless', 'under25', 'report'].includes(item.wishlistGroup) ? item.wishlistGroup : 'active',
            points: ({ high: 3, medium: 2, nice: 1 })[category],
            exampleUrl: /^https?:\/\//i.test(cleanString(item.exampleUrl, 500)) ? cleanString(item.exampleUrl, 500) : '',
            perishable: Boolean(item.perishable),
            createdAt: cleanString(item.createdAt, 40) || new Date().toISOString(),
            status: cleanString(item.status, 30) || 'active'
          };
        })
        .filter((item) => item.memberId && item.title);
    }

    // Back-compat: migrate legacy donation intents stored by donate.js
    if (!fallback.donationIntents.length) {
      try {
        const legacyRaw = localStorage.getItem('unbought:donation-intents:v1');
        const legacy = legacyRaw ? JSON.parse(legacyRaw) : null;
        if (Array.isArray(legacy)) {
          fallback.donationIntents = legacy
            .filter((item) => item && typeof item === 'object' && Number.isFinite(Number(item.amount)) && ['one-time', 'monthly', 'pledge-later'].includes(item.frequency))
            .slice(0, 100)
            .map((item) => ({
              id: cleanString(item.id, 40) || makeId('donation'),
              memberId: '',
              amount: Math.max(1, Math.round(Number(item.amount))),
              frequency: cleanString(item.frequency, 30),
              name: cleanString(item.name, 60),
              email: '',
              note: cleanString(item.note, 280),
              savedAt: cleanString(item.savedAt, 40),
              status: 'intent',
              stockValue: Math.max(1, Math.round(Number(item.amount))),
              thankYouEmailQueued: false
            }));
        }
      } catch (error) {
        // Ignore legacy migration errors.
      }
    }

    if (Array.isArray(raw.volunteerInterests)) {
      fallback.volunteerInterests = raw.volunteerInterests
        .filter((item) => item && typeof item === 'object' && typeof item.role === 'string')
        .slice(0, 100)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('volunteer'),
          memberId: cleanString(item.memberId, 100),
          name: cleanString(item.name, 60),
          role: cleanString(item.role, 40),
          note: cleanString(item.note, 280),
          createdAt: cleanString(item.createdAt, 40),
          status: cleanString(item.status, 30) || 'interest_recorded'
        }));
    }

    if (Array.isArray(raw.reports)) {
      fallback.reports = raw.reports
        .filter((item) => item && typeof item === 'object' && typeof item.type === 'string')
        .slice(0, 200)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('report'),
          reporterMemberId: cleanString(item.reporterMemberId, 100),
          reporterName: cleanString(item.reporterName, 60),
          reporterCounty: normalizeCounty(item.reporterCounty),
          reporterState: normalizeStateCode(item.reporterState),
          respondentName: cleanString(item.respondentName, 80),
          respondentMemberId: cleanString(item.respondentMemberId, 100),
          respondentCounty: normalizeCounty(item.respondentCounty),
          respondentState: normalizeStateCode(item.respondentState),
          type: cleanString(item.type, 40),
          typeLabel: hasOwn(REPORT_TYPES, item.type) ? REPORT_TYPES[item.type].label : cleanString(item.typeLabel, 80),
          route: item.route === 'criminal' ? 'criminal' : 'board',
          adminReview: Boolean(item.adminReview),
          temporaryAdmin: Boolean(item.temporaryAdmin),
          groupId: cleanString(item.groupId, 100),
          reviewBasis: item.adminReview ? 'impartial member review' : (item.route === 'criminal' ? 'criminal' : 'board'),
          description: cleanString(item.description, 1200),
          occurredAt: cleanString(item.occurredAt, 20),
          contextArea: cleanString(item.contextArea, 80) || 'Dashboard',
          contextDetail: cleanString(item.contextDetail, 160),
          sourceId: cleanString(item.sourceId, 100),
          evidence: Array.isArray(item.evidence) ? item.evidence.slice(0, REPORT_EVIDENCE.maxItems).map(cleanEvidenceItem).filter(Boolean) : [],
          createdAt: cleanString(item.createdAt, 40),
          status: ['response_period', 'board_review', 'police_referral', 'restriction_active', 'not_guilty', 'access_restored'].includes(item.status) ? item.status : 'board_review',
          responseDeadlineAt: cleanString(item.responseDeadlineAt, 40),
          response: item.response && typeof item.response === 'object' ? {
            plea: item.response.plea === 'guilty' || item.response.plea === 'not_guilty' ? item.response.plea : '',
            explanation: cleanString(item.response.explanation, 2000),
            media: Array.isArray(item.response.media) ? item.response.media.slice(0, 6).map((media) => ({
              type: hasOwn(MEDIA_TYPES, media.type) ? media.type : 'document',
              url: cleanString(media.url, 500),
              caption: cleanString(media.caption, 200)
            })).filter((media) => media.url || media.caption) : [],
            submittedAt: cleanString(item.response.submittedAt, 40)
          } : null,
          votes: Array.isArray(item.votes) ? item.votes.slice(0, 500).map((vote) => ({
            verdict: vote.verdict === 'guilty' || vote.verdict === 'not_guilty' ? vote.verdict : '',
            reflectionDays: REFLECTION_OPTIONS.includes(Number(vote.reflectionDays)) ? Number(vote.reflectionDays) : null,
            reason: cleanString(vote.reason, 600),
            votedAt: cleanString(vote.votedAt, 40)
          })) : [],
          comments: Array.isArray(item.comments) ? item.comments.slice(0, 200).map((comment) => ({
            id: cleanString(comment.id, 100) || makeId('comment'),
            memberId: cleanString(comment.memberId, 100),
            name: cleanString(comment.name, 60),
            text: cleanString(comment.text, 800),
            createdAt: cleanString(comment.createdAt, 40)
          })) : [],
          votingEndsAt: cleanString(item.votingEndsAt, 40),
          demoVotingClosed: Boolean(item.demoVotingClosed),
          votingNotices: Array.isArray(item.votingNotices)
            ? item.votingNotices.map((id) => cleanString(id, 100)).filter(Boolean).slice(0, 50)
            : [],
          reflectionDays: REFLECTION_OPTIONS.includes(Number(item.reflectionDays)) ? Number(item.reflectionDays) : null,
          restrictionStart: cleanString(item.restrictionStart, 40),
          restrictionEnd: cleanString(item.restrictionEnd, 40),
          treatmentSteps: {
            evaluation: Boolean(item.treatmentSteps && item.treatmentSteps.evaluation),
            plan: Boolean(item.treatmentSteps && item.treatmentSteps.plan),
            treatment: Boolean(item.treatmentSteps && item.treatmentSteps.treatment)
          },
          resolutionAt: cleanString(item.resolutionAt, 40),
          policeReferral: item.policeReferral && typeof item.policeReferral === 'object' ? {
            createdAt: cleanString(item.policeReferral.createdAt, 40),
            status: cleanString(item.policeReferral.status, 30) || 'referral_recorded',
            note: cleanString(item.policeReferral.note, 280)
          } : null
        }));
    }

    if (Array.isArray(raw.anonymousVotes)) {
      fallback.anonymousVotes = raw.anonymousVotes
        .filter((item) => item && typeof item === 'object')
        .slice(-500)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('ballot'),
          targetId: cleanString(item.targetId, 120),
          votedAt: cleanString(item.votedAt, 40)
        }))
        .filter((item) => item.targetId);
    }

    if (Array.isArray(raw.contributions)) {
      fallback.contributions = raw.contributions
        .filter((item) => item && typeof item === 'object' && typeof item.type === 'string')
        .slice(0, 200)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('contribution'),
          memberId: cleanString(item.memberId, 100),
          type: cleanString(item.type, 30), // donation | labor | severance_purchase
          fund: cleanString(item.fund, 30) || (item.type === 'donation' || item.type === 'severance_purchase' ? 'unbought' : ''),
          amount: Number.isFinite(Number(item.amount)) ? Math.max(0, Number(item.amount)) : 0,
          hours: Number.isFinite(Number(item.hours)) ? Math.max(0, Number(item.hours)) : 0,
          profession: cleanString(item.profession, 80),
          stateRegion: cleanString(item.stateRegion, 40),
          hourlyRate: Number.isFinite(Number(item.hourlyRate)) ? Math.max(0, Number(item.hourlyRate)) : 0,
          stockValue: Number.isFinite(Number(item.stockValue)) ? Math.max(0, Number(item.stockValue)) : 0,
          sourceId: cleanString(item.sourceId, 100),
          groupId: cleanString(item.groupId, 120),
          allianceId: cleanString(item.allianceId, 120),
          mutualConfirmation: Boolean(item.mutualConfirmation),
          note: cleanString(item.note, 280),
          createdAt: cleanString(item.createdAt, 40),
          status: cleanString(item.status, 30) || 'recorded',
          purchaserEmail: cleanString(item.purchaserEmail, 120),
          purchaserName: cleanString(item.purchaserName, 60)
        }));
    }

    if (fallback.pledge) {
      // Legacy profiles did not store counters explicitly. Seed them from
      // existing local records so the resume is useful without re-entry.
      if (!raw.pledge || !hasOwn(raw.pledge, 'donationCount')) {
        fallback.pledge.donationCount = fallback.donationIntents.length;
      }
      if (!raw.pledge || !hasOwn(raw.pledge, 'hoursCompleted')) {
        fallback.pledge.hoursCompleted = cleanHours(
          fallback.contributions
            .filter((item) => item.type === 'labor' && item.mutualConfirmation === true)
            .reduce((sum, item) => sum + (Number(item.hours) || 0), 0)
        );
      }
    }

    if (raw.settings && typeof raw.settings === 'object' && !Array.isArray(raw.settings)) {
      fallback.settings = {
        compactDashboard: Boolean(raw.settings.compactDashboard),
        showPrototypeNotices: raw.settings.showPrototypeNotices !== false
      };
    }

    if (Array.isArray(raw.messages)) {
      fallback.messages = raw.messages
        .filter((item) => item && typeof item === 'object' && typeof item.body === 'string')
        .slice(0, 300)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('message'),
          memberId: cleanString(item.memberId, 100),
          name: cleanString(item.name, 60),
          toName: cleanString(item.toName, 80),
          body: cleanString(item.body, 1200),
          createdAt: cleanString(item.createdAt, 40),
          status: cleanString(item.status, 30) || 'recorded'
        }));
    }

    if (Array.isArray(raw.communityChannels)) {
      const saved = raw.communityChannels
        .filter((item) => item && typeof item === 'object')
        .slice(0, 100)
        .map((item) => ({
          id: cleanString(item.id, 100) || `channel-${communityChannelSlug(item.name)}`,
          name: cleanString(item.name, 60),
          purpose: cleanString(item.purpose, 200),
          createdBy: cleanString(item.createdBy, 60),
          createdAt: cleanString(item.createdAt, 40)
        }))
        .filter((item) => item.name);
      const ids = new Set(saved.map((item) => item.id));
      fallback.communityChannels = defaultCommunityChannels().filter((item) => !ids.has(item.id)).concat(saved);
    }

    if (Array.isArray(raw.communityThreads)) {
      fallback.communityThreads = raw.communityThreads
        .filter((item) => item && typeof item === 'object')
        .slice(-300)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('thread'),
          channelId: cleanString(item.channelId, 100) || 'channel-general',
          subject: cleanString(item.subject, 120),
          createdBy: cleanString(item.createdBy, 60),
          createdAt: cleanString(item.createdAt, 40)
        }))
        .filter((item) => item.subject);
    }

    if (Array.isArray(raw.chats)) {
      fallback.chats = raw.chats
        .filter((item) => item && typeof item === 'object' && typeof item.body === 'string')
        .slice(-300)
        .map((item) => {
          const channel = cleanString(item.channel, 40) || 'general';
          return {
            id: cleanString(item.id, 100) || makeId('chat'),
            memberId: cleanString(item.memberId, 100),
            name: cleanString(item.name, 60),
            channel,
            channelId: cleanString(item.channelId, 100) || `channel-${communityChannelSlug(channel)}`,
            threadId: cleanString(item.threadId, 100),
            subject: cleanString(item.subject, 120),
            nsfw: Boolean(item.nsfw),
            picture: cleanPostPhotos(item.picture).slice(0, 1),
            body: cleanString(item.body, 1200),
            createdAt: cleanString(item.createdAt, 40)
          };
        });
    }

    if (Array.isArray(raw.suggestions)) {
      fallback.suggestions = raw.suggestions
        .filter((item) => item && typeof item === 'object' && typeof item.text === 'string')
        .slice(0, 200)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('suggestion'),
          memberId: cleanString(item.memberId, 100),
          name: cleanString(item.name, 60),
          category: cleanString(item.category, 40) || 'general',
          text: cleanString(item.text, 1200),
          createdAt: cleanString(item.createdAt, 40),
          status: cleanString(item.status, 30) || 'submitted'
        }));
    }

    // Seed listings are static, so their conversations are stored by listing
    // id instead of on the listing object itself.
    if (raw.listingComments && typeof raw.listingComments === 'object') {
      fallback.listingComments = {};
      Object.keys(raw.listingComments).slice(0, 200).forEach((id) => {
        const comments = cleanThreadComments(raw.listingComments[id]);
        if (comments.length) fallback.listingComments[cleanString(id, 100)] = comments;
      });
    }

    if (Array.isArray(raw.notifications)) {
      fallback.notifications = raw.notifications
        .filter((item) => item && typeof item === 'object')
        .slice(0, 200)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('notice'),
          type: cleanString(item.type, 30) || 'activity',
          title: cleanString(item.title, 120),
          body: cleanString(item.body, 300),
          tab: cleanString(item.tab, 30),
          sourceId: cleanString(item.sourceId, 100),
          createdAt: cleanString(item.createdAt, 40),
          read: Boolean(item.read)
        }))
        .filter((item) => item.title);
    }

    if (Array.isArray(raw.friends)) {
      fallback.friends = raw.friends
        .filter((item) => item && typeof item === 'object')
        .slice(0, SOCIAL_LIMITS.friends)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('friend'),
          memberId: cleanString(item.memberId, 100),
          name: cleanString(item.name, 60),
          createdAt: cleanString(item.createdAt, 40)
        }))
        .filter((item) => item.name);
    }

    if (Array.isArray(raw.friendRequests)) {
      fallback.friendRequests = raw.friendRequests
        .filter((item) => item && typeof item === 'object')
        .slice(0, 150)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('friend-request'),
          memberId: cleanString(item.memberId, 100),
          name: cleanString(item.name, 60),
          profession: cleanString(item.profession, 80),
          cityState: cleanString(item.cityState, 100),
          direction: item.direction === 'outgoing' ? 'outgoing' : 'incoming',
          status: ['accepted', 'declined'].includes(item.status) ? item.status : 'pending',
          createdAt: cleanString(item.createdAt, 40) || new Date().toISOString(),
          respondedAt: cleanString(item.respondedAt, 40),
          sample: Boolean(item.sample)
        }))
        .filter((item) => item.memberId && item.name);
    }

    if (Array.isArray(raw.groupJoinRequests)) {
      fallback.groupJoinRequests = raw.groupJoinRequests
        .filter((item) => item && typeof item === 'object')
        .slice(0, 150)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('group-join'),
          groupId: cleanString(item.groupId, 120),
          groupName: cleanString(item.groupName, 120),
          groupLabel: cleanString(item.groupLabel, 120),
          memberId: cleanString(item.memberId, 100),
          name: cleanString(item.name, 60),
          status: ['accepted', 'declined'].includes(item.status) ? item.status : 'pending',
          createdAt: cleanString(item.createdAt, 40) || new Date().toISOString()
        }))
        .filter((item) => item.groupId && item.memberId && item.name);
    }

    if (Array.isArray(raw.groups)) {
      fallback.groups = raw.groups
        .filter((item) => item && typeof item === 'object')
        .slice(0, 100)
        .map((item) => {
          const kind = item.kind === 'joined' || item.kind === 'town' ? item.kind : 'own';
          const members = (Array.isArray(item.members) ? item.members : [])
            .map((entry) => entry && typeof entry === 'object' ? {
              memberId: cleanString(entry.memberId || entry.id, 100),
              name: cleanString(entry.name, 60),
              profession: cleanString(entry.profession, 80),
              track: cleanString(entry.track, 30),
              worker: Boolean(entry.worker)
            } : null)
            .filter((entry) => entry && entry.memberId)
            .slice(0, SOCIAL_LIMITS.groupMembers);
          const admins = (Array.isArray(item.admins) ? item.admins : [])
            .map((entry) => cleanString(entry && typeof entry === 'object' ? (entry.memberId || entry.id) : entry, 100))
            .filter(Boolean)
            .slice(0, SOCIAL_LIMITS.groupMembers);
          return {
            id: cleanString(item.id, 100) || makeId('group'),
            kind,
            name: cleanString(item.name, 120),
            baseName: cleanString(item.baseName, 120),
            roman: cleanString(item.roman, 12).toUpperCase(),
            ordinal: Number.isFinite(Number(item.ordinal)) && Number(item.ordinal) > 0 ? Math.floor(Number(item.ordinal)) : 0,
            overflow: Boolean(item.overflow),
            seedEligible: typeof item.seedEligible === 'boolean' ? item.seedEligible : true,
            purpose: cleanString(item.purpose, 200),
            guidelines: cleanString(item.guidelines, 1200),
            settings: normalizeGroupSettings(item.settings),
            members,
            admins,
            left: Boolean(item.left),
            createdAt: cleanString(item.createdAt, 40)
          };
        })
        .filter((item) => item.name);
    }

    if (Array.isArray(raw.socialChats)) {
      fallback.socialChats = raw.socialChats
        .filter((item) => item && typeof item === 'object')
        .slice(-300)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('social-chat'),
          memberId: cleanString(item.memberId, 100),
          name: cleanString(item.name, 60),
          audience: cleanString(item.audience, 40) || 'friends',
          audienceLabel: cleanString(item.audienceLabel, 80) || 'Friends',
          title: cleanString(item.title, 90),
          body: cleanString(item.body, 1200),
          picture: cleanPostPhotos(item.picture).slice(0, 1),
          createdAt: cleanString(item.createdAt, 40)
        }))
        .filter((item) => item.body);
    }

    if (Array.isArray(raw.groupPosts)) {
      fallback.groupPosts = raw.groupPosts
        .filter((item) => item && typeof item === 'object')
        .slice(-500)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('group-post'),
          groupId: cleanString(item.groupId, 100),
          memberId: cleanString(item.memberId, 100),
          name: cleanString(item.name, 60),
          title: cleanString(item.title, 90),
          body: cleanString(item.body, 1200),
          nsfw: Boolean(item.nsfw),
          picture: cleanPostPhotos(item.picture).slice(0, 1),
          createdAt: cleanString(item.createdAt, 40),
          guidelineVote: Boolean(item.guidelineVote),
          proposal: cleanString(item.proposal, 800),
          outcome: ['Agreed', 'Not agreed', 'More discussion needed'].includes(item.outcome) ? item.outcome : '',
          outcomeNote: cleanString(item.outcomeNote, 600),
          outcomeBy: cleanString(item.outcomeBy, 60),
          outcomeById: cleanString(item.outcomeById, 100),
          outcomeAt: cleanString(item.outcomeAt, 40),
          comments: (Array.isArray(item.comments) ? item.comments : [])
            .filter((comment) => comment && typeof comment === 'object')
            .slice(-100)
            .map((comment) => {
              const anonymous = Boolean(comment.anonymous);
              return {
                id: cleanString(comment.id, 100) || makeId('group-reply'),
                anonymous,
                memberId: anonymous ? '' : cleanString(comment.memberId, 100),
                name: anonymous ? '' : cleanString(comment.name, 60),
                body: cleanString(comment.body, 600),
                createdAt: cleanString(comment.createdAt, 40)
              };
            })
            .filter((comment) => comment.body)
        }))
        .filter((item) => item.groupId && item.body);
    }

    if (raw.severanceFund && typeof raw.severanceFund === 'object') {
      fallback.severanceFund = {
        balance: Number.isFinite(Number(raw.severanceFund.balance)) ? Math.max(0, Number(raw.severanceFund.balance)) : 0,
        contributions: Array.isArray(raw.severanceFund.contributions) ? raw.severanceFund.contributions.slice(0, 200) : []
      };
    } else {
      // Recompute from contributions if needed
      const purchases = fallback.contributions.filter((c) => c.type === 'severance_purchase');
      fallback.severanceFund = {
        balance: purchases.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
        contributions: purchases.map((c) => c.id)
      };
    }

    if (fallback.pledge) {
      // Example counters and older records are never trusted for these totals.
      // Only mutually confirmed or review-decided exchanges count.
      const totals = getConfirmedExchangeTotals(fallback.pledge.memberId, fallback);
      fallback.pledge.hoursCompleted = totals.hoursWorked;
      fallback.pledge.hoursUsed = totals.hoursUsed;
      fallback.pledge.itemsGifted = totals.itemsGifted;
      fallback.pledge.itemsTaken = totals.itemsTaken;
    }

    return fallback;
  }

  let state = loadState();
  // Older local pledges predate the roster. Keep them in the in-memory list so
  // seed-member checks still work without forcing a storage write on load.
  if (state.pledge) addMemberToRoster(state.pledge);
  let storageWarningShown = false;
  let toastTimer = null;
  let currentListingId = null;
  let currentRequestMode = 'mutual';
  let confirmAction = null;
  let currentInquiryType = 'waitlist';

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      if (!storageWarningShown) {
        storageWarningShown = true;
        showToast('Local storage is full or blocked. Changes will last only for this visit.');
      }
    }
  }

  // Notifications are local drafts of what a live service would deliver. They
  // are created only by the signed-in member's own actions in this prototype.
  function addNotification(type, title, body, options = {}) {
    if (!isMember()) return;
    state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
    state.notifications.unshift({
      id: makeId('notice'),
      type: cleanString(type, 30) || 'activity',
      title: cleanString(title, 120),
      body: cleanString(body, 300),
      tab: cleanString(options.tab, 30),
      sourceId: cleanString(options.sourceId, 100),
      memberId: cleanString(options.memberId, 100),
      createdAt: new Date().toISOString(),
      read: false
    });
    state.notifications = state.notifications.slice(0, 200);
  }

  // Friend notices carry a member id so the name inside the title can be a
  // link to that member's limited public profile, just like the social panel.
  function renderNotificationTitle(item) {
    const raw = cleanString(item && item.title, 120);
    const id = cleanString(item && item.memberId, 100);
    if (!id) return escapeHtml(raw);
    const member = findMemberById(id);
    const name = member && cleanString(member.name, 60);
    if (!name || !raw.includes(name)) return escapeHtml(raw);
    const at = raw.indexOf(name);
    return `${escapeHtml(raw.slice(0, at))}${memberNameLink(name, id)}${escapeHtml(raw.slice(at + name.length))}`;
  }

  function unreadNotificationCount() {
    return (Array.isArray(state.notifications) ? state.notifications : [])
      .filter((item) => item && !item.read).length;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function createEl(tagName, className = '', text = '') {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function createIcon(name) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#icon-${name}`);
    svg.appendChild(use);
    return svg;
  }

  function makeId(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // Ballot receipts record only that a vote was cast on this device. They never
  // store a member id, name, or choice, so a vote cannot be traced back to a
  // member from the saved prototype data.
  function hasAnonymousVote(targetId) {
    const id = cleanString(targetId, 120);
    return Boolean(id) && (Array.isArray(state.anonymousVotes) ? state.anonymousVotes : [])
      .some((vote) => vote && cleanString(vote.targetId, 120) === id);
  }

  function recordAnonymousVote(targetId) {
    const id = cleanString(targetId, 120);
    if (!id) return;
    state.anonymousVotes = Array.isArray(state.anonymousVotes) ? state.anonymousVotes : [];
    state.anonymousVotes.push({ id: makeId('ballot'), targetId: id, votedAt: new Date().toISOString() });
    state.anonymousVotes = state.anonymousVotes.slice(-500);
  }

  function domId(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function initials(name) {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('') || '?';
  }

  function scrollBehavior() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  function announce(message) {
    const region = document.getElementById('live-region');
    if (!region) return;
    region.textContent = '';
    window.setTimeout(() => {
      region.textContent = message;
    }, 30);
  }

  function showToast(message, announceMessage = true) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.hidden = false;
    window.requestAnimationFrame(() => toast.classList.add('is-visible'));

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => {
        toast.hidden = true;
      }, 220);
    }, 4200);

    if (announceMessage) announce(message);
  }

  function getDirectoryScope() {
    const scope = document.body.dataset.directoryScope;
    return scope === 'goods' || scope === 'labor' ? scope : 'all';
  }

  function getAllListings() {
    // User posts appear first; seed listings remain available underneath.
    const all = [...state.listings, ...SEED_LISTINGS];
    const scope = getDirectoryScope();
    if (scope === 'goods') return all.filter((listing) => listing.pillar === 'goods');
    if (scope === 'labor') return all.filter((listing) => listing.pillar !== 'goods');
    return all;
  }

  function findListing(id) {
    return getAllListings().find((listing) => listing.id === id) || null;
  }

  // Availability is a local profile choice. An "Unavailable" member's offers
  // stay visible, but neighbors cannot send labor or product requests.
  function isListingProviderAvailable(listing) {
    if (!listing) return true;
    const memberId = cleanString(listing.memberId, 100);
    const ownId = cleanString(state.pledge && state.pledge.memberId, 100);
    if (memberId && memberId === ownId) {
      return !state.pledge || state.pledge.available !== false;
    }
    const roster = Array.isArray(state.memberRoster) ? state.memberRoster : [];
    const byId = memberId ? roster.find((entry) => entry && entry.memberId === memberId) : null;
    if (byId && typeof byId.available === 'boolean') return byId.available;
    const provider = cleanString(listing.provider, 60).toLowerCase();
    const byName = provider
      ? roster.find((entry) => entry && cleanString(entry.name, 60).toLowerCase() === provider)
      : null;
    if (byName && typeof byName.available === 'boolean') return byName.available;
    const sample = LOCAL_MEMBER_DIRECTORY.find((entry) => entry.name.toLowerCase() === provider);
    if (sample) {
      const sampleEntry = roster.find((entry) => entry && entry.memberId === sample.id);
      if (sampleEntry && typeof sampleEntry.available === 'boolean') return sampleEntry.available;
    }
    // Seeded community offers and sample neighbors are available by default.
    return true;
  }

  // Comments on static seed listings cannot live on the seed object, so the
  // local map is the source of truth whenever it has entries for a listing.
  function getListingComments(listing) {
    if (!listing) return [];
    const map = state.listingComments && typeof state.listingComments === 'object'
      ? state.listingComments : {};
    const stored = cleanThreadComments(map[listing.id]);
    return stored.length ? stored : cleanThreadComments(listing.comments);
  }

  function focusListingTitle(id, preventScroll = false) {
    const card = document.getElementById(`listing-${domId(id)}`);
    const title = card ? $('.listing-title', card) : null;
    if (!title) return;
    title.tabIndex = -1;
    title.focus({ preventScroll });
  }

  /* ------------------------------------------------------------------------
     03. Services & goods directory
     ------------------------------------------------------------------------ */
  function checkedFilterValues(selector) {
    return $$(selector).map((input) => input.value).filter(Boolean);
  }

  function getFilterValues() {
    const attributes = {};
    $$('[data-filter-facet]:checked').forEach((input) => {
      const key = input.dataset.filterFacet;
      if (!key || !hasOwn(GOOD_FACETS, key)) return;
      if (!attributes[key]) attributes[key] = [];
      attributes[key].push(input.value);
    });
    return {
      pillar: $('#pillar-filter') ? $('#pillar-filter').value : 'all',
      exchange: $('#exchange-filter') ? $('#exchange-filter').value : 'all',
      category: $('#category-filter') ? $('#category-filter').value : 'all',
      conditions: checkedFilterValues('[data-filter-condition]:checked'),
      colors: checkedFilterValues('[data-filter-color]:checked'),
      jobTitles: checkedFilterValues('[data-filter-job-title]:checked'),
      formats: checkedFilterValues('[data-filter-format]:checked'),
      brand: $('#brand-filter') ? $('#brand-filter').value.trim() : '',
      price: $('#price-filter') ? $('#price-filter').value : 'all',
      query: $('#search-filter') ? $('#search-filter').value.trim().toLowerCase() : '',
      city: $('#city-filter') ? $('#city-filter').value.trim() : '',
      state: $('#state-filter') ? $('#state-filter').value.trim().toUpperCase() : '',
      zip: $('#zip-filter') ? $('#zip-filter').value.replace(/\D/g, '').slice(0, 5) : '',
      nearZip: $('#distance-zip') ? $('#distance-zip').value.replace(/\D/g, '').slice(0, 5) : '',
      attributes,
      sort: $('#sort-filter') ? $('#sort-filter').value : 'featured'
    };
  }

  function goodsCategoryShort(listing) {
    return hasOwn(GOODS_CATEGORIES, listing.category) ? GOODS_CATEGORIES[listing.category].short : '';
  }

  // New listings store city/state/ZIP separately. Seed listings only have a
  // readable location label, so derive the same fields from that label.
  function locationOf(listing) {
    const text = String((listing && listing.location) || '');
    const city = cleanString(listing && listing.city, 60) || text.split(/[·+,]/)[0].trim();
    const state = cleanString(listing && listing.state, 2).toUpperCase()
      || (text.match(/\b[A-Z]{2}\b/) || [''])[0];
    const zip = cleanString(listing && listing.zip, 10)
      || (text.match(/\b\d{5}(?:-\d{4})?\b/) || [''])[0];
    return { city, state, zip, text };
  }

  function formatOf(listing) {
    return hasOwn(SERVICE_FORMATS, listing && listing.format) ? listing.format : 'inperson';
  }

  const DONATION_PRICE_LABELS = {
    free: 'Free to everyone',
    priced: 'Has a suggested donation',
    under25: 'Under $25',
    '25to49': '$25 – $49',
    '50plus': '$50 and up'
  };

  function listingMatchesPrice(listing, band) {
    if (band === 'all') return true;
    const price = getNonmemberPrice(listing);
    if (band === 'free') return !(price > 0);
    if (band === 'priced') return price > 0;
    if (band === 'under25') return price > 0 && price < 25;
    if (band === '25to49') return price >= 25 && price < 50;
    if (band === '50plus') return price >= 50;
    return true;
  }

  function listingMatchesFilters(listing, values, scope) {
    if (values.pillar !== 'all' && listing.pillar !== values.pillar) return false;
    if (values.exchange !== 'all' && listing.exchange !== values.exchange) return false;
    if (!listingMatchesPrice(listing, values.price)) return false;

    if (values.query) {
      const price = getNonmemberPrice(listing);
      const haystack = [
        listing.title, listing.description, listing.provider, listing.location,
        listing.jobTitle, listing.brand, listing.category,
        price > 0 ? `${formatMoney(price)} ${price} suggested donation price` : ''
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(values.query)) return false;
    }

    const place = locationOf(listing);
    if (values.city) {
      const cityQuery = values.city.toLowerCase();
      if (!place.city.toLowerCase().includes(cityQuery) && !place.text.toLowerCase().includes(cityQuery)) return false;
    }
    if (values.state && place.state !== values.state) return false;
    if (values.zip && !place.zip.replace(/\D/g, '').startsWith(values.zip)) return false;

    if (scope !== 'goods') {
      if (values.jobTitles.length && !values.jobTitles.includes(cleanString(listing.jobTitle, 80))) return false;
      if (values.formats.length && !values.formats.includes(formatOf(listing))) return false;
      return true;
    }

    if (values.category !== 'all' && listing.category !== values.category) return false;
    if (values.conditions.length && !values.conditions.includes(listing.condition)) return false;
    if (values.colors.length && !values.colors.includes(listing.color)) return false;
    if (values.brand) {
      const brand = String(listing.brand || '').toLowerCase();
      if (!brand.includes(values.brand.toLowerCase())) return false;
    }

    const attributes = listing.attributes && typeof listing.attributes === 'object' ? listing.attributes : {};
    return Object.keys(values.attributes).every((key) => {
      const selected = values.attributes[key];
      return !selected.length || selected.includes(attributes[key]);
    });
  }

  function getFilteredListings() {
    const values = getFilterValues();
    const scope = getDirectoryScope();
    const filtered = getAllListings().filter((listing) => listingMatchesFilters(listing, values, scope));
    const sorted = [...filtered];
    if (values.sort === 'title') {
      sorted.sort((a, b) => String(a.title).localeCompare(String(b.title)));
    } else if (values.sort === 'newest') {
      sorted.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    } else if (values.sort === 'service') {
      sorted.sort((a, b) => String(a.jobTitle || '').localeCompare(String(b.jobTitle || ''))
        || String(a.title).localeCompare(String(b.title)));
    } else if (scope === 'goods' && values.sort === 'category') {
      sorted.sort((a, b) => goodsCategoryShort(a).localeCompare(goodsCategoryShort(b)) || String(a.title).localeCompare(String(b.title)));
    } else if (values.sort === 'location') {
      sorted.sort((a, b) => {
        const first = locationOf(a);
        const second = locationOf(b);
        return first.state.localeCompare(second.state)
          || first.city.localeCompare(second.city)
          || String(a.title).localeCompare(String(b.title));
      });
    } else if (values.sort === 'distance' && values.nearZip) {
      // Prototype approximation: compare the first five ZIP digits. It is a
      // simple local sort, not a map or a real distance calculation.
      const origin = Number(values.nearZip);
      const distance = (item) => {
        const zip = locationOf(item).zip.replace(/\D/g, '').slice(0, 5);
        return /^\d{5}$/.test(zip) ? Math.abs(Number(zip) - origin) : Number.MAX_SAFE_INTEGER;
      };
      sorted.sort((a, b) => distance(a) - distance(b) || String(a.title).localeCompare(String(b.title)));
    }
    return sorted;
  }

  function addBadge(container, className, text) {
    const badge = createEl('span', `badge ${className}`, text);
    container.appendChild(badge);
    return badge;
  }

  function buildListingBadges(listing, listingNonmemberPrice) {
    const badges = createEl('div', 'listing-badges');
    if (listing.nsfw) addBadge(badges, 'badge--nsfw', 'NSFW');
    addBadge(badges, 'badge--pillar', PILLARS[listing.pillar].short);
    const isGoods = listing.pillar === 'goods';
    if (isGoods && hasOwn(GOODS_CATEGORIES, listing.category)) {
      addBadge(badges, 'badge--soft', GOODS_CATEGORIES[listing.category].label);
    }
    if (isGoods || listing.exchange === 'free') {
      addBadge(badges, 'badge--free', isGoods
        ? (listingNonmemberPrice ? 'Free for members' : '100% Free')
        : '100% Free · no materials');
    } else {
      addBadge(badges, 'badge--atcost', 'Labor free · requester covers materials');
    }
    if (listing.isUser) addBadge(badges, 'badge--soft', 'Posted by you');
    if (hasOwn(SCOPE_LABELS, listing.scope)) addBadge(badges, 'badge--soft', SCOPE_LABELS[listing.scope]);
    if (listingNonmemberPrice) {
      addBadge(badges, 'badge--fund', `Donation ${formatMoney(listingNonmemberPrice)} → Unbought donation fund`);
    }
    return badges;
  }

  function buildListingCard(listing, options = {}) {
    const idPrefix = options.idPrefix || 'listing';
    const card = createEl(options.modal ? 'article' : 'a', 'listing-card');
    card.id = `${idPrefix}-${domId(listing.id)}`;
    card.dataset.pillar = listing.pillar;
    card.dataset.listingId = listing.id;
    if (listing.isUser) card.classList.add('is-user');
    if (!options.modal) {
      card.classList.add('listing-card--link');
      card.href = `#listing-${domId(listing.id)}`;
      card.dataset.listingOpen = listing.id;
      card.setAttribute('aria-label', `View details for ${listing.title}`);
    }

    const photos = cleanPostPhotos(listing.photos);
    const listingNonmemberPrice = getNonmemberPrice(listing);
    const matchingRequests = state.requests.filter((request) => request.listingId === listing.id);
    const hasMutualRequest = matchingRequests.some((request) => request.type !== 'nonmember_purchase');
    const hasPurchaseIntent = matchingRequests.some((request) => request.type === 'nonmember_purchase');
    if (hasMutualRequest || hasPurchaseIntent) card.classList.add('is-requested');

    // Directory cards stay compact: photos, tags, title, description, and location.
    // The full record opens in a details dialog.
    if (!options.modal) {
      const media = createEl('div', 'product-media');
      if (photos.length) {
        const image = createEl('img', 'product-photo');
        image.src = photos[0].dataUrl;
        image.alt = `Photo of ${listing.title}`;
        image.loading = 'lazy';
        media.appendChild(image);
        if (photos.length > 1) {
          media.appendChild(createEl('span', 'product-photo-count', `+${photos.length - 1}`));
        }
      } else {
        const glyphs = { building: '🛠️', health: '💚', daily: '🥬', arts: '🎨', civic: '🤝', goods: '📦' };
        media.setAttribute('aria-hidden', 'true');
        media.appendChild(createEl('span', 'product-glyph',
          GOODS_CATEGORY_ICONS[listing.category] || glyphs[listing.pillar] || '📦'));
      }
      card.appendChild(media);
      card.appendChild(buildListingBadges(listing, listingNonmemberPrice));

      const title = createEl('h3', 'listing-title', listing.title);
      title.id = `${idPrefix}-title-${domId(listing.id)}`;
      card.appendChild(title);
      card.appendChild(createEl('p', 'listing-desc', listing.description));
      card.appendChild(createEl('p', 'listing-location', listing.location || 'Location not listed'));
      return card;
    }

    // Inside the details dialog the full record is shown, including all
    // photos, tags, details, actions, and local comments.
    if (photos.length) {
      const strip = createEl('div', 'listing-photos');
      photos.forEach((photo) => {
        const image = createEl('img');
        image.src = photo.dataUrl;
        image.alt = `Photo of ${listing.title}`;
        image.loading = 'lazy';
        strip.appendChild(image);
      });
      card.appendChild(strip);
    }
    card.appendChild(buildListingBadges(listing, listingNonmemberPrice));

    const title = createEl('h3', 'listing-title', listing.title);
    title.id = `${idPrefix}-title-${domId(listing.id)}`;
    card.appendChild(title);

    const provider = createEl('p', 'listing-provider');
    const avatar = createEl('span', 'avatar', initials(listing.provider));
    avatar.setAttribute('aria-hidden', 'true');
    provider.append(avatar, document.createTextNode('Offered by '));
    const providerName = createEl('strong', '', listing.provider);
    provider.appendChild(providerName);
    card.appendChild(provider);

    card.appendChild(createEl('p', 'listing-desc', listing.description));

    const meta = createEl('dl', 'listing-meta');
    const details = Array.isArray(listing.details) && listing.details.length
      ? [...listing.details]
      : [{ label: 'Where', value: listing.location }];

    if (listing.pillar !== 'goods') {
      if (listing.jobTitle) details.push({ label: 'Service', value: listing.jobTitle });
      if (hasOwn(SERVICE_FORMATS, listing.format)) {
        details.push({ label: 'Format', value: SERVICE_FORMATS[listing.format] });
      }
    }

    if (listing.pillar === 'goods') {
      if (hasOwn(GOOD_CONDITIONS, listing.condition)) {
        details.push({ label: 'Condition', value: GOOD_CONDITIONS[listing.condition] });
      }
      if (listing.color) details.push({ label: 'Color', value: listing.color });
      if (listing.brand) details.push({ label: 'Brand', value: listing.brand });
      const attributes = listing.attributes && typeof listing.attributes === 'object' ? listing.attributes : {};
      Object.keys(attributes).forEach((key) => {
        if (hasOwn(GOOD_FACETS, key) && attributes[key]) {
          details.push({ label: GOOD_FACETS[key].label, value: attributes[key] });
        }
      });
    }

    if (listingNonmemberPrice > 0) {
      details.push({
        label: 'Donation price',
        value: `${formatMoney(listingNonmemberPrice)} for non-members → Unbought donation fund · members free`
      });
    }

    details.forEach((detail) => {
      if (!detail || !detail.label || !detail.value) return;
      const row = document.createElement('div');
      row.appendChild(createEl('dt', '', detail.label));
      row.appendChild(createEl('dd', '', detail.value));
      meta.appendChild(row);
    });
    card.appendChild(meta);

    const providerAvailable = isListingProviderAvailable(listing);
    const actions = createEl('div', 'listing-actions');
    const note = createEl(
      'p',
      'listing-note',
      !providerAvailable
        ? 'Unavailable right now · this member is not receiving labor or product requests'
        : hasMutualRequest
          ? 'Request saved locally · consent first'
          : hasPurchaseIntent
            ? 'Purchase intent recorded locally · no payment processed'
            : !isMember() && !canPurchaseAsNonmember(listing)
              ? 'Free for pledged members · non-member purchase is not enabled for this offer'
              : listing.note || 'Peer offer · consent first'
    );
    note.prepend(createIcon(!providerAvailable && document.getElementById('icon-clock') ? 'clock' : 'check'));
    actions.appendChild(note);

    const requestButton = createEl('button', 'button button--small');
    requestButton.type = 'button';
    requestButton.dataset.requestListing = listing.id;

    if (!providerAvailable) {
      requestButton.classList.add('button--ghost');
      requestButton.disabled = true;
      requestButton.textContent = 'Unavailable for requests';
      requestButton.setAttribute('aria-label',
        `${listing.provider} is unavailable and cannot receive labor or product requests right now.`);
    } else if (hasMutualRequest) {
      requestButton.classList.add('button--ghost');
      requestButton.disabled = true;
      requestButton.append(createIcon('check'), document.createTextNode('Request recorded'));
      requestButton.setAttribute('aria-label', `Request recorded: ${listing.title}`);
    } else if (!isMember()) {
      if (!canPurchaseAsNonmember(listing)) {
        requestButton.classList.add('button--ghost');
        requestButton.disabled = true;
        requestButton.append(createIcon('check'), document.createTextNode('For pledged members'));
        requestButton.setAttribute('aria-label', `Pledged members can request ${listing.title} free. Non-member purchase is not enabled for this offer.`);
      } else if (hasPurchaseIntent) {
        requestButton.classList.add('button--ghost');
        requestButton.disabled = true;
        requestButton.append(createIcon('check'), document.createTextNode('Purchase intent recorded'));
        requestButton.setAttribute('aria-label', `Purchase intent recorded locally for ${listing.title}`);
      } else {
        const buttonPrice = formatMoney(getNonmemberPrice(listing));
        requestButton.classList.add('button--outline');
        requestButton.textContent = `Buy for ${buttonPrice} → Unbought donation fund`;
        requestButton.dataset.requestMode = 'purchase';
        requestButton.setAttribute('aria-label', `Buy ${listing.title} as a non-member for ${buttonPrice}. The full amount is recorded locally for the Unbought donation fund; no payment is processed.`);
      }
    } else {
      requestButton.dataset.requestMode = 'mutual';
      requestButton.classList.add('button--outline');
      requestButton.textContent = 'Request with Mutual Consent';
      requestButton.setAttribute('aria-label', `Request with Mutual Consent: ${listing.title}`);
    }
    actions.appendChild(requestButton);

    const reportButton = createEl('button', 'button button--ghost button--small button--report', 'Report');
    reportButton.type = 'button';
    reportButton.dataset.reportContext = '';
    reportButton.dataset.reportArea = getDirectoryScope() === 'goods' ? 'Free Stuff listing' : 'Free Labor listing';
    reportButton.dataset.reportDetail = listing.title;
    reportButton.dataset.reportName = listing.provider;
    reportButton.dataset.reportMemberId = listing.memberId || '';
    reportButton.dataset.reportSourceId = listing.id;
    reportButton.setAttribute('aria-label', `Report a concern about ${listing.provider}'s listing: ${listing.title}`);
    actions.appendChild(reportButton);

    if (listing.isUser) {
      const removeWrap = createEl('div', 'listing-remove');
      const removeButton = createEl('button');
      removeButton.type = 'button';
      removeButton.dataset.removeListing = listing.id;
      removeButton.append(createIcon('trash'), document.createTextNode('Remove my listing'));
      removeButton.setAttribute('aria-label', `Remove my listing: ${listing.title}`);
      removeWrap.appendChild(removeButton);
      actions.appendChild(removeWrap);
    }

    card.appendChild(actions);

    // Listing conversations stay local. Replies simply quote the prior name,
    // and every comment carries its own contextual report trigger.
    const comments = getListingComments(listing);
    const commentWrap = createEl('div', 'listing-comments');
    const commentToggle = createEl(
      'button',
      'button button--ghost button--small comment-toggle',
      `${comments.length} comment${comments.length === 1 ? '' : 's'}`
    );
    commentToggle.type = 'button';
    commentToggle.dataset.toggleComments = listing.id;
    commentToggle.setAttribute('aria-expanded', 'false');
    commentToggle.setAttribute('aria-controls', `${idPrefix}-comment-thread-${domId(listing.id)}`);
    commentWrap.appendChild(commentToggle);

    const thread = createEl('div', 'comment-thread');
    thread.id = `${idPrefix}-comment-thread-${domId(listing.id)}`;
    thread.hidden = true;
    thread.dataset.commentThread = listing.id;
    if (comments.length) {
      const list = createEl('ul', 'comment-list');
      comments.forEach((comment) => {
        const item = createEl('li', 'comment-item');
        item.appendChild(createEl('p', 'contribution-meta', `${comment.name || 'Member'} · ${formatDate(comment.createdAt)}`));
        item.appendChild(createEl('p', '', comment.text));
        const commentActions = createEl('div', 'comment-actions');
        if (isMember()) {
          const reply = createEl('button', 'button button--ghost button--tiny', 'Reply');
          reply.type = 'button';
          reply.dataset.replyComment = comment.name || 'Member';
          commentActions.appendChild(reply);
        }
        const report = createEl('button', 'button button--ghost button--tiny button--report', 'Report');
        report.type = 'button';
        report.dataset.reportContext = '';
        report.dataset.reportArea = getDirectoryScope() === 'goods' ? 'Free Stuff listing comment' : 'Free Labor listing comment';
        report.dataset.reportDetail = `${listing.title} · ${comment.name || 'Member'}`;
        report.dataset.reportName = comment.name || 'Member';
        report.dataset.reportMemberId = comment.memberId || '';
        report.dataset.reportSourceId = comment.id;
        report.setAttribute('aria-label', `Report a concern about a comment from ${comment.name || 'Member'}`);
        commentActions.appendChild(report);
        item.appendChild(commentActions);
        list.appendChild(item);
      });
      thread.appendChild(list);
    } else {
      thread.appendChild(createEl('p', 'account-note', 'No comments yet. Ask a question or leave a note.'));
    }

    if (isMember()) {
      const form = createEl('form', 'account-form listing-comment-form');
      form.dataset.listingCommentForm = listing.id;
      const label = createEl('label', '', 'Add a comment');
      label.htmlFor = `${idPrefix}-comment-${domId(listing.id)}`;
      const input = createEl('textarea');
      input.id = `${idPrefix}-comment-${domId(listing.id)}`;
      input.name = 'text';
      input.rows = 2;
      input.maxLength = 800;
      input.required = true;
      input.placeholder = 'Ask a question or reply to a neighbor…';
      const submit = createEl('button', 'button button--outline button--small', 'Post comment');
      submit.type = 'submit';
      form.append(label, input, submit);
      thread.appendChild(form);
    } else {
      thread.appendChild(createEl('p', 'account-note', 'Sign the pledge to join the conversation.'));
    }
    commentWrap.appendChild(thread);
    card.appendChild(commentWrap);

    return card;
  }

  function renderListings(listings) {
    const grid = document.getElementById('listings-grid');
    if (!grid) return;

    grid.replaceChildren();
    if (!listings.length) {
      const empty = createEl('div', 'no-results');
      empty.appendChild(createEl('h3', '', 'No offerings match those filters yet.'));
      empty.appendChild(createEl('p', '', getDirectoryScope() === 'goods'
        ? 'Try another category, condition, color, brand, or item detail—or post the first free offer here.'
        : 'Try another pillar, service title, format, search term, or location—or post the first free offer here.'));
      const reset = createEl('button', 'button button--outline button--small', 'Reset filters');
      reset.type = 'button';
      reset.dataset.clearFilters = '';
      empty.appendChild(reset);
      grid.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    listings.forEach((listing) => fragment.appendChild(buildListingCard(listing)));
    grid.appendChild(fragment);
  }

  function updateResultsStatus(shown, total) {
    const status = document.getElementById('results-status');
    if (!status) return;

    const values = getFilterValues();
    const scope = getDirectoryScope();
    const detail = [];
    if (values.pillar !== 'all' && hasOwn(PILLARS, values.pillar)) detail.push(PILLARS[values.pillar].label);
    if (values.exchange !== 'all' && hasOwn(EXCHANGES, values.exchange)) detail.push(EXCHANGES[values.exchange].label);
    if (values.query) detail.push(`Search: ${values.query}`);
    if (values.city) detail.push(`City: ${values.city}`);
    if (values.state) detail.push(`State: ${values.state}`);
    if (values.zip) detail.push(`ZIP near: ${values.zip}`);
    if (values.nearZip) detail.push(`Near ${values.nearZip}`);
    if (scope !== 'goods') {
      values.jobTitles.forEach((title) => detail.push(title));
      values.formats.forEach((value) => {
        if (hasOwn(SERVICE_FORMATS, value)) detail.push(SERVICE_FORMATS[value]);
      });
    }
    if (scope === 'goods') {
      if (values.category !== 'all' && hasOwn(GOODS_CATEGORIES, values.category)) {
        detail.push(GOODS_CATEGORIES[values.category].label);
      }
      values.conditions.forEach((value) => {
        if (hasOwn(GOOD_CONDITIONS, value)) detail.push(GOOD_CONDITIONS[value]);
      });
      values.colors.forEach((value) => detail.push(value));
      if (values.brand) detail.push(`Brand: ${values.brand}`);
      Object.keys(values.attributes).forEach((key) => {
        if (!hasOwn(GOOD_FACETS, key)) return;
        values.attributes[key].forEach((value) => detail.push(`${GOOD_FACETS[key].label}: ${value}`));
      });
    }
    const offeringText = scope === 'goods' ? 'free goods' : scope === 'labor' ? 'free labor offers' : 'community offerings';

    if (!shown) {
      status.textContent = `No ${offeringText} match those filters. Try resetting the filters.`;
    } else if (!detail.length) {
      status.textContent = `Showing all ${total} ${offeringText}.`;
    } else {
      status.textContent = `Showing ${shown} of ${total} ${offeringText} · ${detail.join(' · ')}.`;
    }
  }

  function renderActiveFilters() {
    const container = document.getElementById('active-filters');
    if (!container) return;

    const values = getFilterValues();
    const chips = [];
    const addChip = (label, attrs) => chips.push({ label, attrs });

    if (values.query) addChip(`Search: ${values.query}`, { clearFilter: 'query' });
    if (values.price !== 'all') {
      addChip(`Price: ${DONATION_PRICE_LABELS[values.price] || values.price}`, { clearFilter: 'price' });
    }
    if (values.city) addChip(`City: ${values.city}`, { clearFilter: 'city' });
    if (values.state) addChip(`State: ${values.state}`, { clearFilter: 'state' });
    if (values.zip) addChip(`ZIP near: ${values.zip}`, { clearFilter: 'zip' });
    if (values.nearZip) addChip(`Near ZIP: ${values.nearZip}`, { clearFilter: 'nearZip' });

    if (getDirectoryScope() === 'goods') {
      if (values.category !== 'all' && hasOwn(GOODS_CATEGORIES, values.category)) {
        addChip(`Category: ${GOODS_CATEGORIES[values.category].label}`, { clearFilter: 'category' });
      }
      values.conditions.forEach((value) => {
        if (hasOwn(GOOD_CONDITIONS, value)) {
          addChip(GOOD_CONDITIONS[value], { clearFilter: 'condition', clearValue: value });
        }
      });
      values.colors.forEach((value) => {
        addChip(value, { clearFilter: 'color', clearValue: value });
      });
      if (values.brand) addChip(`Brand: ${values.brand}`, { clearFilter: 'brand' });
      Object.keys(values.attributes).forEach((key) => {
        if (!hasOwn(GOOD_FACETS, key)) return;
        values.attributes[key].forEach((value) => {
          addChip(`${GOOD_FACETS[key].label}: ${value}`, { clearFilter: 'facet', clearKey: key, clearValue: value });
        });
      });
    } else {
      if (values.pillar !== 'all' && hasOwn(PILLARS, values.pillar)) {
        addChip(PILLARS[values.pillar].label, { clearFilter: 'pillar' });
      }
      if (values.exchange !== 'all' && hasOwn(EXCHANGES, values.exchange)) {
        addChip(EXCHANGES[values.exchange].label, { clearFilter: 'exchange' });
      }
      values.jobTitles.forEach((title) => addChip(title, { clearFilter: 'jobTitle', clearValue: title }));
      values.formats.forEach((value) => {
        if (hasOwn(SERVICE_FORMATS, value)) {
          addChip(SERVICE_FORMATS[value], { clearFilter: 'format', clearValue: value });
        }
      });
    }

    container.replaceChildren();
    if (!chips.length) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    container.appendChild(createEl('span', 'active-filters-label', 'Active filters:'));
    chips.forEach((chip) => {
      const button = createEl('button', 'filter-chip');
      button.type = 'button';
      Object.keys(chip.attrs).forEach((key) => {
        button.dataset[key] = chip.attrs[key];
      });
      button.append(document.createTextNode(chip.label), document.createTextNode(' ×'));
      button.setAttribute('aria-label', `Remove filter: ${chip.label}`);
      container.appendChild(button);
    });
    const clearAll = createEl('button', 'filter-chip-clear', 'Clear all');
    clearAll.type = 'button';
    clearAll.dataset.clearFilter = 'all';
    container.appendChild(clearAll);
  }

  function clearActiveFilter(button) {
    const kind = button.dataset.clearFilter;
    const value = button.dataset.clearValue || '';
    if (kind === 'all') {
      resetFilters();
      return;
    }
    if (kind === 'category' || kind === 'brand' || kind === 'pillar' || kind === 'exchange'
      || kind === 'price' || kind === 'query' || kind === 'city' || kind === 'state' || kind === 'zip'
      || kind === 'nearZip') {
      const idMap = {
        category: 'category-filter',
        brand: 'brand-filter',
        pillar: 'pillar-filter',
        exchange: 'exchange-filter',
        price: 'price-filter',
        query: 'search-filter',
        city: 'city-filter',
        state: 'state-filter',
        zip: 'zip-filter',
        nearZip: 'distance-zip'
      };
      const control = document.getElementById(idMap[kind]);
      if (control) control.value = ['brand', 'query', 'city', 'state', 'zip', 'nearZip'].includes(kind) ? '' : 'all';
      if (kind === 'pillar') renderLaborFacets();
    } else if (kind === 'condition' || kind === 'color' || kind === 'facet' || kind === 'jobTitle' || kind === 'format') {
      const attr = kind === 'condition' ? 'data-filter-condition'
        : kind === 'color' ? 'data-filter-color'
          : kind === 'facet' ? 'data-filter-facet'
            : kind === 'jobTitle' ? 'data-filter-job-title' : 'data-filter-format';
      const key = kind === 'facet' && button.dataset.clearKey
        ? `[data-filter-facet="${button.dataset.clearKey}"]`
        : `[${attr}]`;
      $$(key).forEach((input) => {
        if (input.value === value) input.checked = false;
      });
    }
    applyFilters();
  }

  function renderStaticFilterOptions() {
    const categorySelect = document.getElementById('category-filter');
    if (categorySelect) {
      const current = categorySelect.value || 'all';
      categorySelect.replaceChildren();
      const all = document.createElement('option');
      all.value = 'all';
      all.textContent = 'All categories';
      categorySelect.appendChild(all);
      Object.keys(GOODS_CATEGORIES).forEach((key) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = GOODS_CATEGORIES[key].label;
        categorySelect.appendChild(option);
      });
      categorySelect.value = hasOwn(GOODS_CATEGORIES, current) ? current : 'all';
    }

    const conditionBox = document.getElementById('condition-options');
    if (conditionBox) {
      conditionBox.replaceChildren();
      Object.keys(GOOD_CONDITIONS).forEach((key) => {
        const label = createEl('label', 'facet-check');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = key;
        input.dataset.filterCondition = '';
        label.append(input, document.createTextNode(GOOD_CONDITIONS[key]));
        conditionBox.appendChild(label);
      });
    }

    const colorBox = document.getElementById('color-options');
    if (colorBox) {
      colorBox.replaceChildren();
      GOOD_COLORS.forEach((color) => {
        const label = createEl('label', 'facet-check facet-check--color');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = color;
        input.dataset.filterColor = '';
        const swatch = createEl('span', 'color-dot');
        swatch.style.background = COLOR_SWATCHES[color] || '#7C8798';
        label.append(input, swatch, createEl('span', 'color-name', color));
        colorBox.appendChild(label);
      });
    }

    const datalist = document.getElementById('brand-options');
    if (datalist) {
      datalist.replaceChildren();
      const brands = new Set();
      getAllListings().forEach((listing) => {
        if (listing.pillar === 'goods' && listing.brand) brands.add(listing.brand);
      });
      Array.from(brands).sort().forEach((brand) => {
        const option = document.createElement('option');
        option.value = brand;
        datalist.appendChild(option);
      });
    }
  }

  function renderCategoryFacets() {
    const group = document.getElementById('facet-filter-group');
    const container = document.getElementById('facet-options');
    const title = document.getElementById('facet-filter-title');
    const categorySelect = document.getElementById('category-filter');
    if (!group || !container) return;

    const category = categorySelect ? categorySelect.value : 'all';
    const definition = hasOwn(GOODS_CATEGORIES, category) ? GOODS_CATEGORIES[category] : null;
    if (!definition || !definition.facets.length) {
      group.hidden = true;
      container.replaceChildren();
      return;
    }

    const checked = {};
    $$('[data-filter-facet]:checked').forEach((input) => {
      if (!checked[input.dataset.filterFacet]) checked[input.dataset.filterFacet] = [];
      checked[input.dataset.filterFacet].push(input.value);
    });

    group.hidden = false;
    if (title) title.textContent = `${definition.short} details`;
    container.replaceChildren();
    definition.facets.forEach((key) => {
      const facet = GOOD_FACETS[key];
      if (!facet) return;
      const row = createEl('div', 'facet-row');
      row.appendChild(createEl('span', 'facet-row-label', facet.label));
      const options = createEl('div', 'facet-options');
      facet.options.forEach((option) => {
        const label = createEl('label', 'facet-check');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = option;
        input.dataset.filterFacet = key;
        if (checked[key] && checked[key].includes(option)) input.checked = true;
        label.append(input, document.createTextNode(option));
        options.appendChild(label);
      });
      row.appendChild(options);
      container.appendChild(row);
    });
  }

  // Service titles follow the chosen pillar. Member-written titles from local
  // posts are included so a title can be filtered even before it joins the list.
  function renderLaborFacets() {
    const container = document.getElementById('labor-job-options');
    const title = document.getElementById('labor-job-filter-title');
    if (!container) return;

    const pillar = $('#pillar-filter') ? $('#pillar-filter').value : 'all';
    const checked = checkedFilterValues('[data-filter-job-title]:checked');
    const groups = [];
    const customTitlesFor = (key) => Array.from(new Set(getAllListings()
      .filter((listing) => listing.pillar === key && listing.jobTitle)
      .map((listing) => cleanString(listing.jobTitle, 80))
      .filter((value) => value && !LABOR_CATEGORIES[key].titles.includes(value)))).sort();

    if (pillar === 'all') {
      Object.keys(LABOR_CATEGORIES).forEach((key) => {
        const extras = customTitlesFor(key);
        groups.push({
          label: LABOR_CATEGORIES[key].short,
          titles: extras.length ? [...LABOR_CATEGORIES[key].titles, ...extras] : LABOR_CATEGORIES[key].titles
        });
      });
    } else if (hasOwn(LABOR_CATEGORIES, pillar)) {
      const definition = LABOR_CATEGORIES[pillar];
      const extras = customTitlesFor(pillar);
      groups.push({
        label: definition.short,
        titles: extras.length ? [...definition.titles, ...extras] : definition.titles
      });
    }

    if (title) {
      title.textContent = pillar === 'all'
        ? 'Service titles by pillar'
        : `Service titles · ${LABOR_CATEGORIES[pillar] ? LABOR_CATEGORIES[pillar].short : 'all pillars'}`;
    }

    container.replaceChildren();
    if (!groups.length) {
      container.appendChild(createEl('p', 'field-hint', 'Choose a pillar to see its listed service titles.'));
      return;
    }

    groups.forEach((group) => {
      const row = createEl('div', 'facet-row');
      row.appendChild(createEl('span', 'facet-row-label', group.label));
      const options = createEl('div', 'facet-list');
      group.titles.forEach((value) => {
        const label = createEl('label', 'facet-check');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = value;
        input.dataset.filterJobTitle = '';
        input.checked = checked.includes(value);
        label.append(input, document.createTextNode(value));
        options.appendChild(label);
      });
      row.appendChild(options);
      container.appendChild(row);
    });
  }

  function applyFilters() {
    const all = getAllListings();
    const filtered = getFilteredListings();
    renderListings(filtered);
    updateResultsStatus(filtered.length, all.length);
    renderActiveFilters();
  }

  function resetFilters() {
    const ids = ['pillar-filter', 'exchange-filter', 'category-filter', 'price-filter'];
    ids.forEach((id) => {
      const control = document.getElementById(id);
      if (control) control.value = 'all';
    });
    ['search-filter', 'brand-filter', 'city-filter', 'state-filter', 'zip-filter', 'distance-zip'].forEach((id) => {
      const control = document.getElementById(id);
      if (control) control.value = '';
    });
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) sortFilter.value = 'featured';
    $$('[data-filter-condition], [data-filter-color], [data-filter-facet], [data-filter-job-title], [data-filter-format]').forEach((input) => {
      input.checked = false;
    });
    renderCategoryFacets();
    renderLaborFacets();
    applyFilters();
  }

  function createListingDialog() {
    const existing = document.getElementById('listing-dialog');
    if (existing) return existing;
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog dialog--listing';
    dialog.id = 'listing-dialog';
    dialog.setAttribute('aria-labelledby', 'listing-dialog-title');
    dialog.innerHTML = `
      <div class="dialog-shell">
        <div class="dialog-top">
          <div><p class="eyebrow">Listing details</p><h2 id="listing-dialog-title">More about this offer</h2></div>
          <button class="icon-button" type="button" data-dialog-close aria-label="Close listing details">
            <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-close"></use></svg>
          </button>
        </div>
        <div class="dialog-content" id="listing-dialog-content"></div>
      </div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', handleListingCardClick);
    dialog.addEventListener('submit', handleListingCommentSubmit);
    return dialog;
  }

  function openListingModal(id, trigger) {
    const listing = findListing(id);
    if (!listing) return;
    const dialog = createListingDialog();
    const content = document.getElementById('listing-dialog-content');
    const detail = buildListingCard(listing, { modal: true, idPrefix: 'detail' });
    detail.classList.add('listing-detail-card');
    content.replaceChildren(detail);
    dialog._returnFocus = trigger instanceof HTMLElement ? trigger : null;
    openDialog(dialog);
  }

  function handleListingCardClick(event) {
    const openButton = event.target.closest('[data-listing-open]');
    if (openButton) {
      event.preventDefault();
      openListingModal(openButton.dataset.listingOpen, openButton);
      return;
    }
    const commentButton = event.target.closest('[data-toggle-comments]');
    if (commentButton) {
      const card = commentButton.closest('.listing-card');
      const thread = card && card.querySelector('.comment-thread');
      if (!thread) return;
      thread.hidden = !thread.hidden;
      commentButton.setAttribute('aria-expanded', String(!thread.hidden));
      if (!thread.hidden) {
        const input = thread.querySelector('textarea');
        if (input) input.focus({ preventScroll: true });
      }
      return;
    }

    const replyButton = event.target.closest('[data-reply-comment]');
    if (replyButton) {
      const thread = replyButton.closest('.comment-thread');
      const input = thread && thread.querySelector('textarea');
      if (!input) return;
      input.value = `@${replyButton.dataset.replyComment} `;
      input.focus({ preventScroll: true });
      return;
    }

    const requestButton = event.target.closest('[data-request-listing]');
    if (requestButton) {
      openConsentDialog(requestButton.dataset.requestListing, requestButton);
      return;
    }

    const removeButton = event.target.closest('[data-remove-listing]');
    if (removeButton) {
      confirmRemoveListing(removeButton.dataset.removeListing, removeButton);
      return;
    }

    const resetButton = event.target.closest('[data-clear-filters]');
    if (resetButton) resetFilters();
  }

  function handleListingCommentSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-listing-comment-form]')) return;
    event.preventDefault();
    if (!requireMembership()) return;
    if (!form.reportValidity()) return;
    const listing = findListing(form.dataset.listingCommentForm);
    if (!listing) return;
    const text = cleanString(new FormData(form).get('text'), 800);
    if (!text) return;
    const comment = {
      id: makeId('comment'),
      memberId: state.pledge.memberId,
      name: state.pledge.name,
      text,
      createdAt: new Date().toISOString()
    };
    const comments = getListingComments(listing);
    comments.push(comment);
    const savedComments = cleanThreadComments(comments);
    state.listingComments = state.listingComments && typeof state.listingComments === 'object'
      ? state.listingComments : {};
    state.listingComments[listing.id] = savedComments;
    if (Array.isArray(state.listings) && state.listings.includes(listing)) {
      listing.comments = savedComments;
    }
    addNotification('comment', `Comment on ${listing.title}`,
      `Added locally to ${listing.provider}'s post. Comments stay on the listing; nothing was transmitted.`,
      { sourceId: comment.id });
    saveState();
    if (form.closest('#listing-dialog')) {
      const content = document.getElementById('listing-dialog-content');
      if (content) {
        const detail = buildListingCard(listing, { modal: true, idPrefix: 'detail' });
        detail.classList.add('listing-detail-card');
        content.replaceChildren(detail);
      }
    } else {
      applyFilters();
    }
    announce('Your comment was added locally.');
    showToast('Comment saved in this browser. Nothing was transmitted.', false);
  }

  function initDirectory() {
    const pillarFilter = document.getElementById('pillar-filter');
    const exchangeFilter = document.getElementById('exchange-filter');
    const categoryFilter = document.getElementById('category-filter');
    const brandFilter = document.getElementById('brand-filter');
    const priceFilter = document.getElementById('price-filter');
    const searchFilter = document.getElementById('search-filter');
    const cityFilter = document.getElementById('city-filter');
    const stateFilter = document.getElementById('state-filter');
    const zipFilter = document.getElementById('zip-filter');
    const distanceZip = document.getElementById('distance-zip');
    const sortFilter = document.getElementById('sort-filter');
    const clearButton = document.getElementById('clear-filters');
    const grid = document.getElementById('listings-grid');
    const activeFilters = document.getElementById('active-filters');

    if (exchangeFilter) exchangeFilter.addEventListener('change', applyFilters);
    if (priceFilter) priceFilter.addEventListener('change', applyFilters);
    if (brandFilter) brandFilter.addEventListener('input', applyFilters);
    if (searchFilter) searchFilter.addEventListener('input', applyFilters);
    if (cityFilter) cityFilter.addEventListener('input', applyFilters);
    if (stateFilter) stateFilter.addEventListener('input', applyFilters);
    if (zipFilter) zipFilter.addEventListener('input', applyFilters);
    if (distanceZip) distanceZip.addEventListener('input', applyFilters);
    if (sortFilter) sortFilter.addEventListener('change', applyFilters);
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => {
        renderCategoryFacets();
        applyFilters();
      });
    }
    if (pillarFilter) {
      pillarFilter.addEventListener('change', () => {
        renderLaborFacets();
        applyFilters();
      });
    }
    if (clearButton) clearButton.addEventListener('click', resetFilters);

    ['condition-options', 'color-options', 'facet-options', 'labor-job-options', 'labor-format-options'].forEach((id) => {
      const box = document.getElementById(id);
      if (box) box.addEventListener('change', applyFilters);
    });
    if (activeFilters) {
      activeFilters.addEventListener('click', (event) => {
        const button = event.target.closest('[data-clear-filter]');
        if (button) clearActiveFilter(button);
      });
    }

    if (grid) {
      grid.addEventListener('click', handleListingCardClick);
      grid.addEventListener('submit', handleListingCommentSubmit);
      createListingDialog();
    }

    renderStaticFilterOptions();
    renderCategoryFacets();
    renderLaborFacets();
    applyFilters();

    // Links from member and group profiles open the offering directly.
    try {
      const listingId = cleanString(new URLSearchParams(window.location.search).get('listing'), 120);
      if (listingId) openListingModal(listingId);
    } catch (error) {
      // Ignore malformed links and leave the directory in its normal state.
    }
  }

  /* ------------------------------------------------------------------------
     04. Posting a listing
     ------------------------------------------------------------------------ */
  function requireNonBlank(control) {
    if (!control) return true;
    if (control.value.trim()) return true;
    control.setCustomValidity('Please fill out this field.');
    control.reportValidity();
    control.setCustomValidity('');
    control.focus();
    return false;
  }

  // The posting form lives in a dialog on both directory pages. It stays in
  // the hidden source card until this runs, then moves into the pop-up.
  function buildPostDialog(form) {
    const existing = document.getElementById('post-dialog');
    if (existing) return existing;

    const card = form.closest('.post-card');
    const isGoods = getDirectoryScope() === 'goods';
    const heading = isGoods ? 'Post Free Stuff' : 'Post a Free Service';
    const intro = isGoods
      ? 'Offer groceries, furniture, tech, tools, solar gear, raw materials, vehicles, gift cards for independent businesses, or anything else legal and safe to give. Everything posted here is free: no price, no deposit, and no swap required.'
      : 'Offer a skill, a repair, a class, or a care task. Keep the exchange honest: labor is free for you and the person requesting it. If materials cannot be found free on Unbought, the requester pays their exact receipt price.';

    const dialog = document.createElement('dialog');
    dialog.className = 'dialog dialog--post';
    dialog.id = 'post-dialog';
    dialog.setAttribute('aria-labelledby', 'post-dialog-title');
    dialog.setAttribute('aria-describedby', 'post-dialog-intro');
    dialog.innerHTML = `
      <div class="dialog-shell">
        <div class="dialog-top">
          <p class="eyebrow">Add to the commons</p>
          <button class="icon-button" type="button" data-dialog-close aria-label="Close the posting form">
            <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-close"></use></svg>
          </button>
        </div>
        <div class="dialog-content">
          <h2 id="post-dialog-title">${escapeHtml(heading)}</h2>
          <p id="post-dialog-intro">${escapeHtml(intro)}</p>
          <p class="dialog-note"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-shield"></use></svg> Posting is for pledged members. No porn and no prostitution; there are free websites that can serve you outside of Unbought. Tag anything else unsuitable for minors as NSFW. Listings stay in this browser; nothing is sent to a provider or published online.</p>
          <div id="post-form-mount"></div>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('#post-form-mount').appendChild(form);
    if (card) card.hidden = true;
    return dialog;
  }

  function flagInvalidField(input, message) {
    if (!input) return;
    input.setCustomValidity(message);
    input.reportValidity();
    input.focus();
    input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
  }

  function makePostSelect(labelText, id, name, options, placeholder, required) {
    const field = createEl('div', 'field');
    const label = createEl('label', '', labelText);
    label.htmlFor = id;
    field.appendChild(label);
    const select = document.createElement('select');
    select.id = id;
    select.name = name;
    if (required) select.required = true;
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = placeholder;
    select.appendChild(empty);
    options.forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });
    field.appendChild(select);
    return field;
  }

  function buildLaborJobTitleOptions() {
    const select = document.getElementById('post-job-title');
    const pillarSelect = document.getElementById('post-pillar');
    if (!select || !pillarSelect) return;

    const pillar = pillarSelect.value;
    const previous = select.value;
    const definition = hasOwn(LABOR_CATEGORIES, pillar) ? LABOR_CATEGORIES[pillar] : null;
    select.replaceChildren();

    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = definition ? 'Choose a service title' : 'Choose a pillar first';
    select.appendChild(empty);

    if (definition) {
      definition.titles.forEach((title) => {
        const option = document.createElement('option');
        option.value = title;
        option.textContent = title;
        select.appendChild(option);
      });
    }
    const custom = document.createElement('option');
    custom.value = '__custom';
    custom.textContent = 'Write my own title';
    select.appendChild(custom);

    if (previous && Array.from(select.options).some((option) => option.value === previous)) {
      select.value = previous;
    }
    syncCustomJobTitleField();
  }

  function syncCustomJobTitleField() {
    const select = document.getElementById('post-job-title');
    const field = document.getElementById('post-custom-title-field');
    const input = document.getElementById('post-job-title-custom');
    if (!select || !field || !input) return;
    const custom = select.value === '__custom';
    field.hidden = !custom;
    input.required = custom;
    if (!custom) input.value = '';
  }

  function syncPostLocationMode() {
    const modeSelect = document.getElementById('post-location-mode');
    const form = document.getElementById('post-form');
    if (!modeSelect || !form) return;

    const mode = hasOwn(LOCATION_MODES, modeSelect.value) ? modeSelect.value : 'cityStateZip';
    const cityField = document.getElementById('post-location-city-field');
    const stateField = document.getElementById('post-location-state-field');
    const zipField = document.getElementById('post-location-zip-field');
    const city = document.getElementById('post-city');
    const state = document.getElementById('post-state');
    const zip = document.getElementById('post-zip');
    const hint = document.getElementById('post-location-hint');
    const showCity = mode === 'cityStateZip' || mode === 'cityState';
    const showState = showCity;
    const showZip = mode === 'cityStateZip' || mode === 'zip';

    if (cityField) cityField.hidden = !showCity;
    if (stateField) stateField.hidden = !showState;
    if (zipField) zipField.hidden = !showZip;
    if (city) city.required = showCity;
    if (state) state.required = showState;
    if (zip) zip.required = showZip;

    const messages = {
      cityStateZip: 'Neighbors can filter by city, two-letter state, or ZIP prefix. Online offers do not need a street-level location.',
      cityState: 'City and state are enough for nearby neighbors. ZIP filtering will not apply to this offer.',
      zip: 'A ZIP code is enough for nearby neighbors. City and state filtering will not apply to this offer.',
      online: 'This service is online only. No city, state, or ZIP is needed, and the listing will appear in Online filters.'
    };
    if (hint) hint.textContent = messages[mode];
  }

  // Goods get structured attributes (condition, color, brand, and a few
  // category-specific details) so the filter sidebar and the listing stay in
  // sync. The same helpers are inert on the labor page.
  function buildGoodsPostFields(populateCategories = false) {
    const mount = document.getElementById('goods-attributes');
    const categorySelect = document.getElementById('post-category');
    if (!mount || !categorySelect) return;

    if (populateCategories) {
      categorySelect.replaceChildren();
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Choose a category';
      categorySelect.appendChild(empty);
      Object.keys(GOODS_CATEGORIES).forEach((key) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = GOODS_CATEGORIES[key].label;
        categorySelect.appendChild(option);
      });
    }

    const previous = {};
    ['post-condition', 'post-color', 'post-brand'].forEach((id) => {
      const control = document.getElementById(id);
      if (control) previous[id] = control.value;
    });
    $$('[data-post-facet]', mount).forEach((control) => {
      previous[`facet:${control.dataset.postFacet}`] = control.value;
    });

    const category = categorySelect.value;
    const definition = hasOwn(GOODS_CATEGORIES, category) ? GOODS_CATEGORIES[category] : null;
    const hint = document.getElementById('goods-category-hint');
    if (hint) {
      hint.textContent = definition
        ? definition.note
        : 'Choose a category to see the details that help neighbors find this item.';
    }

    mount.replaceChildren();
    if (!definition) return;

    const grid = createEl('div', 'form-grid');
    grid.appendChild(makePostSelect('Condition *', 'post-condition', 'condition',
      Object.keys(GOOD_CONDITIONS).map((key) => [key, GOOD_CONDITIONS[key]]),
      'Choose a condition', true));

    if (definition.color) {
      grid.appendChild(makePostSelect('Color', 'post-color', 'color',
        GOOD_COLORS.map((color) => [color, color]), 'Choose a color (optional)', false));
    }
    if (definition.brand) {
      const field = createEl('div', 'field');
      const label = createEl('label', '', 'Brand or maker (optional)');
      label.htmlFor = 'post-brand';
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'post-brand';
      input.name = 'brand';
      input.maxLength = 60;
      input.placeholder = 'e.g., Dell, handmade, unknown';
      field.append(label, input);
      grid.appendChild(field);
    }
    definition.facets.forEach((key) => {
      const facet = GOOD_FACETS[key];
      if (!facet) return;
      const field = makePostSelect(`${facet.label} (optional)`, `post-facet-${key}`, `facet-${key}`,
        facet.options.map((option) => [option, option]),
        `Choose ${facet.label.toLowerCase()} (optional)`, false);
      $('select', field).dataset.postFacet = key;
      grid.appendChild(field);
    });
    mount.appendChild(grid);

    Object.keys(previous).forEach((key) => {
      const control = key.indexOf('facet:') === 0
        ? $(`[data-post-facet="${key.slice(6)}"]`, mount)
        : document.getElementById(key);
      if (control) control.value = previous[key];
    });
  }

  function initPostForm() {
    const form = document.getElementById('post-form');
    if (!form) return;
    const dialog = buildPostDialog(form);

    // The provider is the signed-in member, so carry their chosen name over
    // instead of asking them to type it again.
    const fillProviderName = () => fillOwnNameField(document.getElementById('post-provider'));
    fillProviderName();
    buildGoodsPostFields(true);
    buildLaborJobTitleOptions();
    syncPostLocationMode();

    const postPillar = document.getElementById('post-pillar');
    if (postPillar) postPillar.addEventListener('change', buildLaborJobTitleOptions);
    const postJobTitle = document.getElementById('post-job-title');
    if (postJobTitle) postJobTitle.addEventListener('change', syncCustomJobTitleField);
    const postLocationMode = document.getElementById('post-location-mode');
    if (postLocationMode) postLocationMode.addEventListener('change', syncPostLocationMode);

    // A provider decides whether non-members may buy, and sets the price.
    // Members always receive the same listing free through mutual consent.
    const purchaseToggle = document.getElementById('post-nonmember-enabled');
    const purchasePriceField = document.getElementById('post-nonmember-price-field');
    const purchasePriceInput = document.getElementById('post-nonmember-price');
    const syncPurchaseFields = () => {
      const enabled = Boolean(purchaseToggle && purchaseToggle.checked);
      if (purchasePriceField) purchasePriceField.hidden = !enabled;
      if (purchasePriceInput) {
        purchasePriceInput.disabled = !enabled;
        purchasePriceInput.required = enabled;
      }
    };
    if (purchaseToggle) purchaseToggle.addEventListener('change', syncPurchaseFields);
    syncPurchaseFields();

    const postCategory = document.getElementById('post-category');
    if (postCategory) postCategory.addEventListener('change', () => buildGoodsPostFields(false));

    // Photos are prepared when selected, so submitting can stay synchronous.
    postPhotoDrafts.set(form, []);
    postPhotoPending.set(form, false);
    const photoInput = document.getElementById('post-photos');
    const photoPreview = document.getElementById('post-photos-preview');
    const postStatus = document.getElementById('post-status');
    const defaultStatus = postStatus ? postStatus.textContent : '';

    if (photoInput) {
      photoInput.addEventListener('change', async () => {
        const files = Array.from(photoInput.files || []).slice(0, POST_PHOTOS.maxItems);
        const submitButton = $('button[type="submit"]', form);
        postPhotoPending.set(form, true);
        if (submitButton) submitButton.disabled = true;
        if (postStatus) postStatus.textContent = files.length ? 'Resizing photos for local storage…' : defaultStatus;
        const photos = await preparePostPhotos(files);
        postPhotoDrafts.set(form, photos);
        renderPostPhotos(form, photos);
        postPhotoPending.set(form, false);
        if (submitButton) submitButton.disabled = false;
        if (postStatus && files.length) {
          postStatus.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} ready. Stored only on this device; nothing is transmitted.`;
        }
      });
    }
    if (photoPreview) {
      photoPreview.addEventListener('click', (event) => {
        const button = event.target.closest('[data-remove-post-photo]');
        if (!button) return;
        const photos = postPhotoDrafts.get(form) || [];
        photos.splice(Number(button.dataset.removePostPhoto), 1);
        if (photoInput) photoInput.value = '';
        renderPostPhotos(form, photos);
        if (postStatus) postStatus.textContent = defaultStatus;
      });
    }
    renderPostPhotos(form, []);

    $$('[data-post-trigger]').forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        if (!requireMembership('Sign the Unbought Pledge to become a member before posting to the commons.')) return;
        if (!requireFullAccess('Full access is paused during your reflection period. Posting is unavailable until you complete the reflection and treatment requirements.')) return;
        fillProviderName();
        openDialog(dialog);
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (postPhotoPending.get(form)) return;
      if (!requireFullAccess('Full access is paused during your reflection period. Posting is unavailable until you complete the reflection and treatment requirements.')) return;
      if (!form.reportValidity()) return;

      const titleInput = document.getElementById('post-title-input');
      const providerInput = document.getElementById('post-provider');
      const cityInput = document.getElementById('post-city');
      const stateInput = document.getElementById('post-state');
      const zipInput = document.getElementById('post-zip');
      const descriptionInput = document.getElementById('post-description');
      const modeSelect = document.getElementById('post-location-mode');
      const locationMode = hasOwn(LOCATION_MODES, modeSelect && modeSelect.value) ? modeSelect.value : 'cityStateZip';
      const wantsCity = locationMode === 'cityStateZip' || locationMode === 'cityState';
      const wantsState = wantsCity;
      const wantsZip = locationMode === 'cityStateZip' || locationMode === 'zip';

      const requiredFields = [titleInput, providerInput, descriptionInput];
      if (wantsCity) requiredFields.push(cityInput);
      if (wantsState) requiredFields.push(stateInput);
      if (wantsZip) requiredFields.push(zipInput);
      if (!requiredFields.every(requireNonBlank)) return;

      const data = new FormData(form);
      const title = cleanString(data.get('title'), 80);
      const provider = cleanString(data.get('provider'), 60);
      const city = wantsCity ? cleanString(data.get('city'), 60) : '';
      const stateCode = wantsState ? cleanString(data.get('state'), 2).toUpperCase() : '';
      const zip = wantsZip ? cleanString(data.get('zip'), 10) : '';
      const description = cleanString(data.get('description'), 400);
      const pillar = getDirectoryScope() === 'goods' ? 'goods' : String(data.get('pillar') || '');
      const exchange = pillar === 'goods' ? 'free' : String(data.get('exchange') || '');
      const category = pillar === 'goods' ? String(data.get('category') || '') : '';
      const scope = String(data.get('scope') || '');
      const jobTitleChoice = pillar === 'goods' ? '' : String(data.get('jobTitle') || '');
      const customJobTitle = cleanString(data.get('customJobTitle'), 80);
      const jobTitle = jobTitleChoice === '__custom' ? customJobTitle : jobTitleChoice;
      const condition = pillar === 'goods' ? String(data.get('condition') || '') : '';
      const color = pillar === 'goods' ? String(data.get('color') || '') : '';
      const brand = pillar === 'goods' ? cleanString(data.get('brand'), 60) : '';
      const attributes = {};
      if (pillar === 'goods' && hasOwn(GOODS_CATEGORIES, category)) {
        GOODS_CATEGORIES[category].facets.forEach((key) => {
          const value = cleanString(data.get(`facet-${key}`), 60);
          if (value) attributes[key] = value;
        });
      }

      if (pillar === 'goods' && !hasOwn(GOOD_CONDITIONS, condition)) {
        flagInvalidField(document.getElementById('post-condition'), 'Choose a condition for this item.');
        return;
      }
      if (pillar === 'goods' && color && !GOOD_COLORS.includes(color)) return;
      if (pillar !== 'goods' && !jobTitle) {
        flagInvalidField(document.getElementById('post-job-title'), 'Choose a listed service title or write your own.');
        return;
      }
      if (pillar !== 'goods' && jobTitleChoice === '__custom' && !customJobTitle) {
        flagInvalidField(document.getElementById('post-job-title-custom'), 'Write the service title you want the maintainer to see.');
        return;
      }

      if (wantsState && !/^[A-Z]{2}$/.test(stateCode)) {
        flagInvalidField(stateInput, 'Use the two-letter state code, such as PA.');
        return;
      }
      if (wantsZip && !/^\d{5}(?:-\d{4})?$/.test(zip)) {
        flagInvalidField(zipInput, 'Use a 5-digit ZIP code, or ZIP+4 such as 18360-1234.');
        return;
      }

      const purchaseEnabled = Boolean(data.get('nonmemberPurchaseEnabled'));
      const purchasePrice = Math.max(0, Math.round(Number(data.get('nonmemberPurchasePrice') || 0)));
      if (purchaseEnabled && !(purchasePrice > 0)) {
        flagInvalidField(document.getElementById('post-nonmember-price'), 'Set a whole-dollar price for non-members, or turn the option off.');
        return;
      }

      const location = locationMode === 'online'
        ? 'Online'
        : locationMode === 'zip'
          ? zip
          : `${city}, ${stateCode}${zip ? ` ${zip}` : ''}`;
      const format = LOCATION_MODES[locationMode].format;
      const locationInput = document.getElementById('post-location');
      if (locationInput) locationInput.value = location;

      if (!hasOwn(PILLARS, pillar) || !hasOwn(EXCHANGES, exchange)) return;
      if (pillar === 'goods' && !hasOwn(GOODS_CATEGORIES, category)) return;
      if (pillar !== 'goods' && !hasOwn(LABOR_CATEGORIES, pillar)) return;
      if (pillar !== 'goods' && !hasOwn(SERVICE_FORMATS, format)) return;
      if (scope && !hasOwn(SCOPE_LABELS, scope)) return;

      const photos = cleanPostPhotos(postPhotoDrafts.get(form) || []);
      const listing = {
        id: makeId('user-listing'),
        memberId: state.pledge.memberId,
        title,
        provider,
        location,
        city,
        state: stateCode,
        zip,
        description,
        nsfw: Boolean(data.get('nsfw')),
        pillar,
        exchange,
        category,
        scope,
        ...(pillar === 'goods' ? { condition, color, brand, attributes } : { jobTitle, format, locationMode }),
        photos,
        comments: [],
        nonmemberPurchase: { enabled: purchaseEnabled, price: purchaseEnabled ? purchasePrice : 0 },
        details: [
          { label: 'Where', value: location },
          ...(pillar === 'goods' ? [{ label: 'Category', value: GOODS_CATEGORIES[category].label }] : []),
          {
            label: pillar === 'goods' ? 'Cost' : 'Materials',
            value: purchaseEnabled
              ? `Free for members · non-members ${formatMoney(purchasePrice)} to the Unbought donation fund`
              : EXCHANGES[exchange].label
          },
          { label: 'Contact', value: 'Through a consent request' }
        ],
        note: 'Posted by a member · consent first',
        isUser: true,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      // A written-in title is a note for whoever maintains the live site. The
      // prototype cannot send it anywhere, so it lands in the local suggestion
      // box with the context needed to add the title to the list later.
      const customTitleForMaintainer = pillar !== 'goods' && jobTitleChoice === '__custom';
      if (customTitleForMaintainer) {
        state.suggestions = Array.isArray(state.suggestions) ? state.suggestions : [];
        state.suggestions.unshift({
          id: makeId('suggestion'),
          memberId: state.pledge.memberId,
          name: state.pledge.name,
          category: 'Job title',
          text: `Add “${jobTitle}” to the Free Labor list for ${PILLARS[pillar].label}. Listing: ${title}. Location: ${location}. In a live site this note goes to the site maintainer; the prototype saved it locally only.`,
          createdAt: new Date().toISOString(),
          status: 'for site maintainer'
        });
        state.suggestions = state.suggestions.slice(0, 200);
        addNotification('suggestion', 'Custom job title saved for the maintainer',
          `“${jobTitle}” was saved in Dashboard → Suggestions locally. In a live site it would be delivered to the site maintainer; nothing was transmitted.`,
          { tab: 'suggestions', sourceId: listing.id });
      }

      state.listings.unshift(listing);
      saveState();

      resetFilters();
      form.reset();
      fillProviderName();
      buildGoodsPostFields(false);
      buildLaborJobTitleOptions();
      syncCustomJobTitleField();
      syncPostLocationMode();
      syncPurchaseFields();
      postPhotoDrafts.set(form, []);
      if (photoInput) photoInput.value = '';
      renderPostPhotos(form, []);
      closeDialog(dialog, { restoreFocus: false });
      const postStatus = document.getElementById('post-status');
      if (postStatus) {
        postStatus.textContent = customTitleForMaintainer
          ? 'Published. Your custom title was saved locally in Dashboard → Suggestions for the site maintainer. Nothing was transmitted.'
          : 'Published. Your listing is now in the directory above.';
      }
      showToast(customTitleForMaintainer
        ? 'Listing published; custom title saved locally for the maintainer.'
        : 'Listing published to this browser.', false);
      announce(`Your listing “${listing.title}” was published. It is at the top of the directory.`);
      focusListingTitle(listing.id);
    });

    if (window.location.hash === '#post-trigger' || window.location.hash === '#post-form') {
      if (requireMembership('Sign the Unbought Pledge to become a member before posting to the commons.') &&
          requireFullAccess('Full access is paused during your reflection period. Posting is unavailable until you complete the reflection and treatment requirements.')) {
        fillProviderName();
        openDialog(dialog);
      }
    }
  }

  function confirmRemoveListing(id, trigger) {
    const listing = state.listings.find((item) => item.id === id);
    if (!listing) return;

    showConfirm({
      title: 'Remove your listing?',
      message: `“${listing.title}” will be removed from this browser. This cannot be undone.`,
      confirmLabel: 'Remove listing',
      tone: 'danger',
      onConfirm: () => {
        state.listings = state.listings.filter((item) => item.id !== id);
        saveState();
        applyFilters();
        announce('Your listing was removed.');
        showToast('Listing removed.', false);
        const status = document.getElementById('results-status');
        if (status) {
          status.tabIndex = -1;
          status.focus({ preventScroll: true });
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     05. Member account, contributions, stock & Unbought donation fund (prototype)
     ------------------------------------------------------------------------ */
  function renderMemberAccount() {
    const container = document.getElementById('member-account');
    if (!container) return;

    const signedIn = isMember();
    const fund = getSeveranceSummary();
    const hours = getHourTotals();
    const donated = getDonationTotals();

    container.replaceChildren();

    const card = createEl('section', 'account-card');
    const head = createEl('div', 'account-head');
    head.appendChild(createEl('p', 'eyebrow', signedIn ? 'Your account' : 'Participation & Unbought donation fund'));
    head.appendChild(createEl('h3', '', signedIn ? 'Your hours, giving, and fund share' : 'Members join by pledge; non-members may record purchase intents'));
    card.appendChild(head);

    if (!signedIn) {
      const intro = createEl('p', '', 'Anyone can browse. To participate in the commons (post offers/needs, request mutual-aid connections, and manage your track), sign the Unbought Pledge to become a member. Where a provider has opted in, people who do not take the pledge can record a purchase intent at the provider’s price; every cent is tracked locally for the Unbought donation fund and no real payment is processed. Members receive those same offers free.');
      card.appendChild(intro);
    } else {
      const meta = createEl('p', 'account-meta', `${state.pledge.name} · ${state.pledge.location || 'Location not shared'}`);
      card.appendChild(meta);
    }

    const stats = createEl('div', 'account-stats');
    const hourPeriods = `Week ${hours.week} hr · month ${hours.month} hr · year ${hours.year} hr`;
    const giftPeriods = `Week ${formatMoney(donated.week)} · month ${formatMoney(donated.month)} · year ${formatMoney(donated.year)}`;
    const statDefs = signedIn ? [
      ['Hours worked (all time)', `${hours.all} hr`, hourPeriods],
      ['Donated (all time)', formatMoney(donated.all), giftPeriods],
      ['Your share of the fund', formatMoney(fund.entitled), 'Local estimate · not a payout'],
      ['Cancellation estimate', formatMoney(fund.cancellation.estimate), `Up to ${formatMoney(fund.cancellation.cap)} · local only`],
      ['Unbought donation fund', formatMoney(fund.balance), 'Current local balance']
    ] : [
      ['Unbought donation fund', formatMoney(fund.balance), 'Current local balance'],
      ['Recorded non-member purchase intents', String(fund.count), 'Local records only'],
      ['Member benefit', 'Free mutual-aid access', 'By pledge · no purchase'],
      ['Fund income', 'Three sources', 'Donations, academy tuition, and non-member purchases']
    ];
    statDefs.forEach(([label, value, detail]) => {
      const s = createEl('div', 'account-stat');
      s.appendChild(createEl('span', 'account-stat-label', label));
      s.appendChild(createEl('strong', 'account-stat-value', value));
      if (detail) s.appendChild(createEl('span', 'account-stat-detail', detail));
      stats.appendChild(s);
    });
    card.appendChild(stats);

    const model = createEl('p', 'account-note', signedIn
      ? 'Prototype model (local only): your hours are shown only after both you and the receiver confirm the work, or after a three-member review vote resolves a disagreement. No one can add hours unilaterally. Giving is shown by week, month, year, and all time. Your share is a local, proportional estimate based on recorded contributions; it is not a payout, debt, or legal claim. Every cent of donations, academy tuition, and non-member purchases goes to the Unbought donation fund. Nothing is transmitted.'
      : 'Prototype model (local only): the Unbought donation fund holds locally recorded donations and non-member purchase intents. Academy tuition would join it in a live system. No money moves, no payouts are made, and nothing is transmitted.');
    card.appendChild(model);

    if (signedIn) {
      const cancel = fund.cancellation;
      const cancelBlock = createEl('div', 'account-block');
      cancelBlock.appendChild(createEl('h4', '', 'If you cancel'));
      cancelBlock.appendChild(createEl('p', 'account-note',
        `Local estimate: ${formatMoney(cancel.estimate)}. Unbought will cap any cancellation severance at ${formatMoney(cancel.cap)}. The estimate multiplies your share of contributions credited to your groups and alliances (${cancel.memberPercent}%, ${formatMoney(cancel.memberGroupAmount)} of ${formatMoney(cancel.groupFundAmount)}) by those groups' share of the donation fund (${cancel.groupFundPercent}%). This severance check is separate from your group's uncapped slice of unspoken-for money shown on the group profile, so the two numbers can be different. It is a calculation on this device only: no payout, debt, legal claim, or transmission.`));
      if (!cancel.groupFundAmount) {
        cancelBlock.appendChild(createEl('p', 'account-note',
          `No group- or alliance-credited contributions are recorded yet across your ${cancel.groupCount} group${cancel.groupCount === 1 ? '' : 's'} and ${cancel.allianceCount} alliance${cancel.allianceCount === 1 ? '' : 's'}, so the local estimate is ${formatMoney(0)}. Credit a donation to a group or alliance on the Donate page to test the calculation.`));
      }
      if (cancel.capped) {
        cancelBlock.appendChild(createEl('p', 'account-note', 'This estimate reached the local $4,000 cap.'));
      }
      card.appendChild(cancelBlock);
    }

    if (signedIn) {
      const hoursNote = createEl('div', 'account-block');
      hoursNote.appendChild(createEl('h4', '', 'How work hours are logged'));
      hoursNote.appendChild(createEl('p', 'account-note', 'No one can add hours unilaterally. For a service or delivered product, the worker and the receiver each choose the same agreed time from fixed options in the Exchanges panel. Matching confirmations log that time. If the choices differ, evidence goes to a three-member review; care circle members, students, observers, and either party cannot serve. Reviewers choose one of the two confirmed times. No hours are typed into a counter.'));
      card.appendChild(hoursNote);

      // Ledger
      const memberContribs = getMemberContributions();
      const ledger = createEl('div', 'account-block');
      ledger.appendChild(createEl('h4', '', 'Contribution ledger'));
      if (!memberContribs.length) {
        ledger.appendChild(createEl('p', 'account-note', 'No contributions recorded yet. Donations you make while signed in and hours confirmed by both sides will appear here.'));
      } else {
        const list = createEl('ul', 'contribution-list');
        memberContribs.slice(0, 10).forEach((c) => {
          const item = createEl('li', 'contribution-item');
          const title = c.type === 'labor'
            ? `${c.hours} hr ${c.profession} (${c.stateRegion} @ ${formatMoney(c.hourlyRate)}/hr)`
            : c.type === 'donation'
              ? `Donation ${formatMoney(c.amount || c.stockValue)}`
              : `${c.type} ${formatMoney(c.amount || c.stockValue)}`;
          item.appendChild(createEl('strong', '', title));
          const sub = `${formatMoney(c.stockValue)} stock value · ${formatDate(c.createdAt) || 'recorded'}${c.note ? ' · ' + c.note : ''}`;
          item.appendChild(createEl('span', 'contribution-meta', sub));
          list.appendChild(item);
        });
        ledger.appendChild(list);
        if (memberContribs.length > 10) {
          ledger.appendChild(createEl('p', 'account-note', `Showing 10 of ${memberContribs.length} contributions.`));
        }
      }
      card.appendChild(ledger);
    }

    container.appendChild(card);
  }

  /* ------------------------------------------------------------------------
     05a. Volunteer operating team
     ------------------------------------------------------------------------ */
  function getMemberVolunteerInterests() {
    if (!isMember()) return [];
    return (Array.isArray(state.volunteerInterests) ? state.volunteerInterests : []).filter((item) => item && item.memberId === state.pledge.memberId);
  }

  // One shared pop-up form, built once from app.js so every page that loads
  // this script can open it from a [data-volunteer-trigger] button.
  function buildVolunteerDialog() {
    if (document.getElementById('volunteer-dialog')) return;

    const roleOptions = Object.entries(VOLUNTEER_ROLES)
      .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
      .join('');

    const dialog = document.createElement('dialog');
    dialog.className = 'dialog dialog--volunteer';
    dialog.id = 'volunteer-dialog';
    dialog.setAttribute('aria-labelledby', 'volunteer-dialog-title');
    dialog.setAttribute('aria-describedby', 'volunteer-dialog-intro');
    dialog.innerHTML = `
      <div class="dialog-shell">
        <div class="dialog-top">
          <p class="eyebrow">Offer your time</p>
          <button class="icon-button" type="button" data-dialog-close aria-label="Close the volunteer form">
            <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-close"></use></svg>
          </button>
        </div>
        <div class="dialog-content">
          <h2 id="volunteer-dialog-title">Join the operating team.</h2>
          <p id="volunteer-dialog-intro">${escapeHtml(VOLUNTEER_ACCESS_COPY)} Volunteers get a Volunteer badge and access to the member tools on this device. In this prototype the offer is recorded locally only—nothing is sent to a coordinator, and no real website or server access is granted.</p>
          <div class="volunteer-gate" id="volunteer-dialog-gate" data-volunteer-gate role="status">
            <p data-volunteer-gate-text></p>
          </div>
          <div class="volunteer-guest-note" id="volunteer-guest-note" hidden>
            <p><strong>Members only.</strong> Sign the Unbought Pledge to become a member before recording a volunteer offer. Browsing the roles is open to everyone.</p>
            <a class="button button--primary button--small" href="pledge.html">Take the Pledge <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></a>
          </div>
          <form class="volunteer-form" id="volunteer-form">
            <div class="field">
              <label for="volunteer-name">Chosen name <span class="required-mark" aria-hidden="true">*</span></label>
              <input type="text" id="volunteer-name" name="name" maxlength="60" autocomplete="nickname" placeholder="What should we call you?">
            </div>
            <div class="field">
              <label for="volunteer-role">Role you can help with <span class="required-mark" aria-hidden="true">*</span></label>
              <select id="volunteer-role" name="role" required>
                <option value="">Choose a role…</option>
                ${roleOptions}
              </select>
            </div>
            <div class="field">
              <label for="volunteer-note">How can you help? <span class="optional">(optional)</span></label>
              <textarea id="volunteer-note" name="note" rows="3" maxlength="280" placeholder="Hours you can offer, skills, or anything we should know."></textarea>
            </div>
            <label class="checkbox">
              <input type="checkbox" name="volunteerAgreement" required>
              <span>I understand this is a local prototype offer, not a job, employment relationship, or background-checked position, and that no one is obligated to contact me from this browser.</span>
            </label>
            <div class="volunteer-form-actions">
              <button class="button button--primary" type="submit">Record volunteer offer</button>
              <p class="form-hint">Members only · no data leaves this device</p>
            </div>
          </form>
          <p class="account-note">Recording an offer adds the Volunteer badge and local operating-team access in this browser. It is not a job, a background check, or real administrative access.</p>
          <p class="volunteer-join-status" id="volunteer-dialog-status" data-volunteer-status role="status">No volunteer offers recorded yet.</p>
        </div>
      </div>`;
    document.body.appendChild(dialog);
  }

  function openVolunteerDialog() {
    const dialog = document.getElementById('volunteer-dialog');
    if (!dialog) return;
    renderVolunteerStatus();
    openDialog(dialog);
  }

  function renderVolunteerStatus() {
    const signedIn = isMember();
    const memberName = signedIn ? (state.pledge.name || '') : '';

    const gateText = signedIn
      ? `Signed in as ${memberName}. Recording a role here adds the Volunteer badge and local member-area access. Stored in this browser only.`
      : 'Browsing these roles is open to everyone. Sign the Unbought Pledge to become a member and record a volunteer offer.';

    $$('[data-volunteer-gate-text]').forEach((node) => {
      node.textContent = gateText;
    });
    $$('[data-volunteer-gate], #volunteer-gate').forEach((gate) => {
      gate.classList.toggle('is-signed', signedIn);
    });

    const form = document.getElementById('volunteer-form');
    if (form) form.hidden = !signedIn;

    const guestNote = document.getElementById('volunteer-guest-note');
    if (guestNote) guestNote.hidden = signedIn;

    const nameInput = document.getElementById('volunteer-name');
    if (nameInput && signedIn && !nameInput.value.trim()) nameInput.value = memberName;

    const interests = getMemberVolunteerInterests();
    const roles = interests
      .map((item) => (hasOwn(VOLUNTEER_ROLES, item.role) ? VOLUNTEER_ROLES[item.role] : item.role))
      .join(', ');
    const statusText = interests.length
      ? `${interests.length} volunteer offer${interests.length === 1 ? '' : 's'} recorded in this browser${roles ? ` (${roles})` : ''}. Volunteer badge and local access are active.`
      : 'No volunteer offers recorded yet. No Volunteer badge or local volunteer access yet.';

    $$('[data-volunteer-status], #volunteer-status').forEach((status) => {
      status.textContent = statusText;
    });
  }

  function initVolunteerForm() {
    buildVolunteerDialog();

    $$('[data-volunteer-trigger]').forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        openVolunteerDialog();
      });
    });

    const form = document.getElementById('volunteer-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!requireMembership('Sign the Unbought Pledge to become a member before recording a volunteer offer.')) return;
      if (!requireFullAccess('Full access is paused during your reflection period. Volunteering is unavailable until you complete the reflection and treatment requirements.')) return;
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const role = cleanString(data.get('role'), 40);
      if (!hasOwn(VOLUNTEER_ROLES, role)) return;
      const name = cleanString(data.get('name'), 60) || state.pledge.name || '';
      const note = cleanString(data.get('note'), 280);

      if (getMemberVolunteerInterests().some((item) => item.role === role)) {
        announce('You already recorded an offer for that role in this browser.');
        showToast('That volunteer role is already recorded for your account.', false);
        return;
      }

      const interest = {
        id: makeId('volunteer'),
        memberId: state.pledge.memberId,
        name,
        role,
        note,
        createdAt: new Date().toISOString(),
        status: 'interest_recorded'
      };

      state.volunteerInterests = Array.isArray(state.volunteerInterests) ? state.volunteerInterests : [];
      state.volunteerInterests.unshift(interest);
      state.volunteerInterests = state.volunteerInterests.slice(0, 100);
      saveState();

      form.reset();
      renderVolunteerStatus();
      renderSharedMemberViews();
      announce(`Volunteer offer for ${VOLUNTEER_ROLES[role]} recorded. Your Volunteer badge and local member-area access are active in this browser.`);
      showToast('Volunteer offer, badge, and local access recorded here. No data left this device.', false);
    });

    renderVolunteerStatus();
  }

  // Volunteers see this operating-team card in Dashboard → Overview. It is
  // local prototype access, not real website, server, or administrative access.
  function renderVolunteerAccess() {
    const panel = document.getElementById('volunteer-access-panel');
    if (!panel) return;
    if (!isCurrentVolunteer()) {
      panel.hidden = true;
      panel.innerHTML = '';
      return;
    }
    const e = escapeHtml;
    const roles = getMemberVolunteerInterests()
      .map((item) => (hasOwn(VOLUNTEER_ROLES, item.role) ? VOLUNTEER_ROLES[item.role] : item.role))
      .filter(Boolean)
      .join(', ') || 'Operating team';
    const duties = [
      'Keeping the website updated',
      'Paying the bills',
      'Accepting new volunteers',
      'Legal and compliance work',
      'Records, communications, and accessibility'
    ];
    panel.hidden = false;
    panel.innerHTML = `<section class="account-card volunteer-access-card">
      <header class="account-panel-head">
        <div>
          <p class="eyebrow">Operating team</p>
          <h3><span class="member-label member-label--volunteer"><span class="member-label-icon" aria-hidden="true">💙</span>Volunteer</span> access is active</h3>
          <p class="account-subtitle">${e(VOLUNTEER_ACCESS_COPY)}</p>
        </div>
      </header>
      <p class="account-note">Your recorded role${roles ? `: <strong>${e(roles)}</strong>` : ''} gives you local access to the member-area tools on this device. No real website, server, or admin access is granted, and nothing is transmitted.</p>
      <ul class="volunteer-duty-list">${duties.map((duty) => `<li>${e(duty)}</li>`).join('')}</ul>
    </section>`;
  }

  /* ------------------------------------------------------------------------
     05a-1. Member dashboard shell & panels
     ------------------------------------------------------------------------ */
  function renderDashboardGate() {
    const gate = document.getElementById('dashboard-gate');
    const dash = document.getElementById('member-dashboard');
    if (!gate || !dash) return;
    if (isMember()) {
      gate.hidden = true;
      dash.hidden = false;
      document.body.classList.toggle('dashboard-compact', Boolean(state.settings && state.settings.compactDashboard));
    } else {
      gate.hidden = false;
      dash.hidden = true;
      document.body.classList.remove('dashboard-compact');
    }
  }

  // Panels that belong to The Commons. Only these reveal the vertical left nav.
  const COMMONS_PANELS = ['commons', 'exchanges', 'messages', 'review', 'social', 'suggestions'];

  function setDashboardTab(name) {
    const tabs = Array.from(document.querySelectorAll('[data-dashboard-tab]'));
    const panels = Array.from(document.querySelectorAll('[data-dashboard-panel]'));
    const tab = tabs.find((item) => item.dataset.dashboardTab === name);

    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.dashboardPanel !== name;
    });

    // The first menu has four views. The Commons owns the second, vertical nav;
    // Account and preferences now live together under Settings.
    const view = name === 'settings' ? 'settings'
      : COMMONS_PANELS.includes(name) ? 'commons'
        : name === 'overview' ? 'overview' : '';
    const menuItems = Array.from(document.querySelectorAll('[data-dashboard-view]'));
    const menuItem = menuItems.find((item) => item.dataset.dashboardView === view);
    menuItems.forEach((item) => {
      const active = item === menuItem;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    const commonsNav = document.querySelector('.dashboard-tabs');
    if (commonsNav) commonsNav.hidden = view !== 'commons';
    const body = document.querySelector('.dashboard-body');
    if (body) body.classList.toggle('has-commons-nav', view === 'commons');

    const focusTarget = tab || menuItem;
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  function initDashboardMenu() {
    const menu = document.querySelector('.dashboard-menu');
    if (!menu) return;
    menu.addEventListener('click', (event) => {
      const item = event.target.closest('[data-dashboard-view]');
      if (!item) return;
      event.preventDefault();
      setDashboardTab(item.dataset.dashboardView);
    });
  }

  function renderNewsFeeds() {
    document.querySelectorAll('[data-news-feed]').forEach((feed) => {
      if (feed.children.length) return;
      feed.innerHTML = NEWS_POSTS.map((post) => {
        const e = escapeHtml;
        return `<article class="news-item">
          <p class="news-meta"><time datetime="${e(post.date)}">${e(post.label)}</time> · <span class="news-tag">${e(post.tag)}</span></p>
          <h3>${e(post.title)}</h3>
          <p>${e(post.body)}</p>
        </article>`;
      }).join('');
    });
  }

  function initDashboardTabs() {
    const nav = document.querySelector('.dashboard-tabs');
    if (!nav) return;
    nav.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-dashboard-tab]');
      if (tab) setDashboardTab(tab.dataset.dashboardTab);
    });
    nav.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const tabs = Array.from(nav.querySelectorAll('[data-dashboard-tab]'));
      const current = event.target.closest('[data-dashboard-tab]');
      if (!current || !tabs.length) return;
      const index = tabs.indexOf(current);
      const next = event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : (index - 1 + tabs.length) % tabs.length;
      event.preventDefault();
      setDashboardTab(tabs[next].dataset.dashboardTab);
    });
  }

  function accountDetail(label, value) {
    return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  }

  function renderAccountSummary(m) {
    const e = escapeHtml;
    const track = state.track && hasOwn(TRACKS, state.track) ? TRACKS[state.track] : 'Not chosen';
    const summary = [
      ['Chosen name', e(m.name)],
      ['Profession', e(m.profession || 'Not shared')],
      ['Membership year', e(String(membershipYearAt(m.signedAt) ?? 'Unknown'))],
      ['Track', e(track)],
      ['Status', e(m.status || 'active')],
      ['Pledged on', e(formatDate(m.signedAt) || 'Not recorded')]
    ];
    return `<dl class="resume-metrics resume-metrics--summary" aria-label="Membership at a glance">
      ${summary.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}
    </dl>`;
  }

  function renderAccountDetailGroups(m, credential, guiltyReportsAgainst) {
    const e = escapeHtml;
    const skillChips = (value) => {
      const items = cleanString(value, 400).split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
      return items.length
        ? `<ul class="resume-skills">${items.map((item) => `<li>${e(item)}</li>`).join('')}</ul>`
        : `<p class="resume-empty">Not listed yet.</p>`;
    };
    const section = (title, body) => `<div class="resume-section"><h3>${title}</h3>${body}</div>`;
    const rows = (items) => `<dl class="account-details">${items.join('')}</dl>`;
    const address = m.publicAddressSource === 'physical' ? m.physicalAddress : m.mailingAddress;
    const publicPlace = parseCityState(address);
    const publicCity = publicPlace?.split(',')[0]?.trim() || 'Not shared';
    const publicState = publicPlace?.split(',')[1]?.trim() || 'Not shared';
    const totals = getConfirmedExchangeTotals(m.memberId);

    return [
      section('Identity &amp; contact', rows([
        accountDetail('Full legal name', e(m.fullName || 'Not shared')),
        accountDetail('General location', e(m.location || 'Not shared')),
        accountDetail('Mailing address', e(m.mailingAddress || 'Not shared')),
        accountDetail('Mailing county', e(m.county || 'Not shared')),
        accountDetail('Physical address', e(m.physicalAddress || 'Not shared')),
        accountDetail('Physical county, State', e([m.physicalCounty, m.physicalState].filter(Boolean).join(', ') || 'Not shared')),
        accountDetail('Public City, State', e(`${publicCity}, ${publicState}`)),
        accountDetail('ZIP code', e(m.zip || 'Not shared')),
        accountDetail('Housing status', e(hasOwn(HOUSING_STATUSES, m.housingStatus) ? HOUSING_STATUSES[m.housingStatus] : 'Not shared')),
        accountDetail('Cell phone', e(m.cellPhone || m.phone || 'Not shared')),
        accountDetail('Public phone', e(publicPhoneFor(m) || 'Not shared')),
        accountDetail('Public phone same as cell', m.samePhone ? 'Yes' : 'No'),
        accountDetail('Show public phone on resume', m.publicPhone ? 'Yes' : 'No'),
        accountDetail('Text messages', m.receiveTexts ? 'Opted in locally; no texts are sent' : 'Not opted in'),
        accountDetail('Date of birth', e(m.dob || 'Not shared'))
      ])),
      section('Profile &amp; skills', `
        ${m.tagline ? `<p class="resume-tagline">${e(m.tagline)}</p>` : ''}
        ${m.bio ? `<p class="resume-bio">${e(m.bio)}</p>` : '<p class="resume-empty">No bio added yet.</p>'}
        <h4>Career / paid skills</h4>
        ${skillChips(m.paidSkills)}
        <h4>Unpaid skills</h4>
        ${skillChips(m.unpaidSkills)}
        ${rows([accountDetail('Private note', e(m.note || 'Not shared'))])}`),
      section('Groups', renderGroupMembership(false)),
      section('Commons activity', `<div class="resume-metric-groups">
        <dl class="resume-metrics">
          <div><dt>Pledged on</dt><dd>${e(formatDate(m.signedAt) || 'Not recorded')}</dd></div>
          <div><dt>Amount Donated</dt><dd>${e(formatMoney(getDonationTotals().all))}</dd></div>
          <div><dt>Volunteer Offers</dt><dd>${getMemberVolunteerInterests().length}</dd></div>
          <div><dt>Reports (Guilty)</dt><dd>${guiltyReportsAgainst}</dd></div>
        </dl>
        <dl class="resume-metrics">
          <div><dt>Hours Worked</dt><dd>${e(String(totals.hoursWorked))}</dd></div>
          <div><dt>Hours Used</dt><dd>${e(String(totals.hoursUsed))}</dd></div>
          <div><dt>Items Gifted</dt><dd>${e(String(totals.itemsGifted))}</dd></div>
          <div><dt>Items Taken</dt><dd>${e(String(totals.itemsTaken))}</dd></div>
        </dl>
      </div>`),
      section('Local account access', `
        ${rows([
          accountDetail('Signed in as', state.auth && state.auth.session && state.auth.session.actingAs === 'representative' ? 'Authorized representative' : 'Member'),
          accountDetail('Username', e(credential && credential.username ? credential.username : 'Not set')),
          ...(isVolunteerMember(m) ? [accountDetail('Volunteer access', 'Local operating-team access · badge active')] : []),
          ...(m.powerOfAttorney && m.powerOfAttorney.enabled ? [
            accountDetail('Power of attorney', e([m.powerOfAttorney.representativeName, m.powerOfAttorney.relationship].filter(Boolean).join(' · ') || 'Recorded locally')),
            accountDetail('Representative user', e(m.powerOfAttorney.username || 'Not set'))
          ] : [])
        ])}
        <p class="account-note">These are local demo sign-ins, not real logins. Salted password hashes are stored only on this device; nothing is transmitted. A representative sign-in can manage this member’s record locally on their behalf.</p>`)
    ].join('');
  }

  function initAccountDob(scope) {
    const hidden = scope && scope.querySelector('input[name="dob"][type="hidden"]');
    const month = scope && scope.querySelector('[data-account-dob-part="month"]');
    const day = scope && scope.querySelector('[data-account-dob-part="day"]');
    const year = scope && scope.querySelector('[data-account-dob-part="year"]');
    if (!hidden || !month || !day || !year) return;
    const pad2 = (value) => String(value).padStart(2, '0');

    function syncDob() {
      hidden.value = year.value && month.value && day.value
        ? `${year.value}-${month.value}-${day.value}`
        : '';
    }

    function refreshDays() {
      const yearValue = Number(year.value);
      const monthValue = Number(month.value);
      const days = yearValue && monthValue ? new Date(yearValue, monthValue, 0).getDate() : 31;
      const previous = day.value;
      let options = '<option value="">Day</option>';
      for (let value = 1; value <= days; value += 1) {
        options += `<option value="${pad2(value)}">${value}</option>`;
      }
      day.innerHTML = options;
      day.value = Number(previous) <= days ? previous : '';
      syncDob();
    }

    [month, day, year].forEach((part) => {
      part.addEventListener('change', () => {
        if (part === month || part === year) refreshDays();
        else syncDob();
      });
    });
    refreshDays();
  }

  function initAccountAddressSync(scope) {
    const form = scope && scope.querySelector('[data-account-form]');
    if (!form) return;
    const same = form.querySelector('[data-same-address]');
    if (!same) return;
    const keys = ['address1', 'address2', 'city', 'county', 'state', 'zip'];
    const mailing = {};
    const physical = {};
    keys.forEach((key) => {
      mailing[key] = form.querySelector(`[data-mailing-address="${key}"]`);
      physical[key] = form.querySelector(`[data-physical-address="${key}"]`);
    });
    const physicalFields = Object.values(physical).filter(Boolean);

    function setPhysicalLocked(locked) {
      physicalFields.forEach((input) => {
        input.readOnly = locked;
        if (input.tagName === 'SELECT') input.disabled = locked;
      });
    }

    function copyPhysical() {
      keys.forEach((key) => {
        if (mailing[key] && physical[key]) physical[key].value = mailing[key].value;
      });
    }

    same.addEventListener('change', () => {
      if (same.checked) copyPhysical();
      setPhysicalLocked(same.checked);
    });
    Object.values(mailing).filter(Boolean).forEach((input) => {
      ['input', 'change'].forEach((eventName) => {
        input.addEventListener(eventName, () => {
          if (same.checked) copyPhysical();
        });
      });
    });
    if (same.checked) copyPhysical();
    setPhysicalLocked(same.checked);
  }

  function renderAccountInfo() {
    const panel = document.getElementById('settings-panel');
    if (!panel || !isMember()) return;
    const m = state.pledge;
    const s = state.settings || {};
    const e = escapeHtml;
    const notice = state.settings && state.settings.showPrototypeNotices
      ? `<p class="prototype-note">Prototype: account details, local usernames, and salted password hashes are stored only on this device. There is no real authentication or server, and nothing is transmitted.</p>`
      : '';
    const dobMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(m.dob || ''));
    const dobYearValue = dobMatch ? dobMatch[1] : '';
    const dobMonthValue = dobMatch ? dobMatch[2] : '';
    const dobDayValue = dobMatch ? dobMatch[3] : '';
    const dobMonths = [
      ['01', 'January'], ['02', 'February'], ['03', 'March'], ['04', 'April'],
      ['05', 'May'], ['06', 'June'], ['07', 'July'], ['08', 'August'],
      ['09', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December']
    ];
    const minDobYear = dobYearValue && Number(dobYearValue) < 1900 ? Number(dobYearValue) : 1900;
    let dobYearOptions = '<option value="">Year</option>';
    for (let year = new Date().getFullYear(); year >= minDobYear; year -= 1) {
      dobYearOptions += `<option value="${year}"${dobYearValue === String(year) ? ' selected' : ''}>${year}</option>`;
    }
    let dobMonthOptions = '<option value="">Month</option>';
    dobMonths.forEach(([value, label]) => {
      dobMonthOptions += `<option value="${value}"${dobMonthValue === value ? ' selected' : ''}>${label}</option>`;
    });
    const dobMaxDays = dobYearValue && dobMonthValue
      ? new Date(Number(dobYearValue), Number(dobMonthValue), 0).getDate()
      : 31;
    let dobDayOptions = '<option value="">Day</option>';
    for (let day = 1; day <= dobMaxDays; day += 1) {
      const value = String(day).padStart(2, '0');
      dobDayOptions += `<option value="${value}"${dobDayValue === value ? ' selected' : ''}>${day}</option>`;
    }
    const sameAddress = Boolean(m.mailingAddress && m.physicalAddress === m.mailingAddress);
    panel.innerHTML = `<section class="account-card account-panel">
      <header class="account-panel-head">
        <div>
          <p class="eyebrow">Settings</p>
          <h3>Account &amp; preferences</h3>
          <p class="account-subtitle">Edit what neighbors see, choose what stays private, and set how this prototype behaves on this device.</p>
        </div>
        <a class="button button--outline button--small" href="profile.html">View member profile</a>
      </header>
      ${notice}
      ${renderMemberLabelsHtml(m)}
      ${renderSeedThankYou(m)}
      <details class="account-edit" open>
        <summary><span>Edit profile &amp; account details</span><span class="account-section-hint">What neighbors see, privacy, and local counts</span></summary>
        <form class="account-form" data-account-form>
          <fieldset>
            <legend>Identity &amp; contact</legend>
            <div class="form-row">
              <div class="field">
                <label for="account-name">Chosen name <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-name" name="name" maxlength="60" value="${e(m.name)}" required>
              </div>
              <div class="field">
                <label for="account-location">General location <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-location" name="location" maxlength="80" value="${e(m.location || '')}" required>
              </div>
            </div>
            <p class="account-subhead">Full legal name</p>
            <div class="form-row">
              <div class="field">
                <label for="account-first-name">First name <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-first-name" name="firstName" autocomplete="given-name" maxlength="40" value="${e(m.firstName || '')}" required>
              </div>
              <div class="field">
                <label for="account-middle-initial">Middle initial <span class="optional">(optional)</span></label>
                <input type="text" id="account-middle-initial" name="middleInitial" maxlength="2" value="${e(m.middleInitial || '')}">
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="account-last-name">Last name <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-last-name" name="lastName" autocomplete="family-name" maxlength="60" value="${e(m.lastName || '')}" required>
              </div>
              <div class="field">
                <label for="account-suffix">Suffix <span class="optional">(optional)</span></label>
                <input type="text" id="account-suffix" name="suffix" maxlength="12" value="${e(m.suffix || '')}" placeholder="Jr., Sr., III, etc.">
              </div>
            </div>
            <p class="account-subhead">Mailing address</p>
            <div class="form-row">
              <div class="field">
                <label for="account-address1">Address 1 <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-address1" name="address1" data-mailing-address="address1" autocomplete="address-line1" maxlength="100" value="${e(m.address1 || '')}" required>
              </div>
              <div class="field">
                <label for="account-address2">Address 2 <span class="optional">(optional)</span></label>
                <input type="text" id="account-address2" name="address2" data-mailing-address="address2" autocomplete="address-line2" maxlength="100" value="${e(m.address2 || '')}">
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="account-city">City <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-city" name="city" data-mailing-address="city" autocomplete="address-level2" maxlength="80" value="${e(m.city || '')}" required>
              </div>
              <div class="field">
                <label for="account-state">State <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-state" name="state" data-mailing-address="state" autocomplete="address-level1" maxlength="2" value="${e(m.state || '')}" required>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="account-county">Mailing county <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-county" name="county" data-mailing-address="county" maxlength="80" value="${e(m.county || '')}" placeholder="Monroe" required>
                <p class="field-hint">Private. Used only to identify your area for review board eligibility.</p>
              </div>
              <div class="field">
                <label for="account-zip">ZIP code <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-zip" name="zip" data-mailing-address="zip" maxlength="10" inputmode="numeric" autocomplete="postal-code" value="${e(m.zip || '')}" required>
              </div>
            </div>
            <label class="checkbox"><input type="checkbox" name="sameAddress" data-same-address${sameAddress ? ' checked' : ''}> <span>My physical address is the same as my mailing address</span></label>
            <p class="account-subhead">Physical address</p>
            <div class="form-row">
              <div class="field">
                <label for="account-physical-address1">Address 1 <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-physical-address1" name="physicalAddress1" data-physical-address="address1" autocomplete="address-line1" maxlength="100" value="${e(m.physicalAddress1 || '')}" required>
              </div>
              <div class="field">
                <label for="account-physical-address2">Address 2 <span class="optional">(optional)</span></label>
                <input type="text" id="account-physical-address2" name="physicalAddress2" data-physical-address="address2" autocomplete="address-line2" maxlength="100" value="${e(m.physicalAddress2 || '')}">
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="account-physical-city">City <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-physical-city" name="physicalCity" data-physical-address="city" autocomplete="address-level2" maxlength="80" value="${e(m.physicalCity || '')}" required>
              </div>
              <div class="field">
                <label for="account-physical-state">State <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-physical-state" name="physicalState" data-physical-address="state" autocomplete="address-level1" maxlength="2" value="${e(m.physicalState || '')}" required>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="account-physical-county">Physical county <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-physical-county" name="physicalCounty" data-physical-address="county" maxlength="80" value="${e(m.physicalCounty || '')}" placeholder="Monroe" required>
                <p class="field-hint">Your physical county decides which review board votes you can cast.</p>
              </div>
              <div class="field">
                <label for="account-physical-zip">ZIP code <span class="required-mark" aria-hidden="true">*</span></label>
                <input type="text" id="account-physical-zip" name="physicalZip" data-physical-address="zip" maxlength="10" inputmode="numeric" autocomplete="postal-code" value="${e(m.physicalZip || '')}" required>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="account-public-address">Public City, State from</label>
                <select id="account-public-address" name="publicAddressSource">
                  <option value="mailing"${m.publicAddressSource !== 'physical' ? ' selected' : ''}>Mailing address</option>
                  <option value="physical"${m.publicAddressSource === 'physical' ? ' selected' : ''}>Physical address</option>
                </select>
                <p class="field-hint">Only the city and state from this address appear on your public resume.</p>
              </div>
              <div class="field">
                <label for="account-housing">Housing status</label>
                <select id="account-housing" name="housingStatus">
                  ${Object.entries(HOUSING_STATUSES).map(([value, label]) => `<option value="${value}"${m.housingStatus === value ? ' selected' : ''}>${e(label)}</option>`).join('')}
                </select>
                <p class="field-hint">Private. Never shown on your public resume.</p>
              </div>
            </div>
            <p class="account-subhead">Date of birth</p>
            <div class="form-row dob-fields">
              <div class="field">
                <label for="account-dob-month">Month</label>
                <select id="account-dob-month" data-account-dob-part="month" autocomplete="bday-month" required>${dobMonthOptions}</select>
              </div>
              <div class="field">
                <label for="account-dob-day">Day</label>
                <select id="account-dob-day" data-account-dob-part="day" autocomplete="bday-day" required>${dobDayOptions}</select>
              </div>
              <div class="field">
                <label for="account-dob-year">Year</label>
                <select id="account-dob-year" data-account-dob-part="year" autocomplete="bday-year" required>${dobYearOptions}</select>
              </div>
            </div>
            <input type="hidden" name="dob" value="${e(m.dob || '')}">
            <p class="field-hint">Private and stored only on this device. Members must be 18 or older.</p>
          </fieldset>
          <fieldset>
            <legend>Phone &amp; texts</legend>
            <div class="form-row">
              <div class="field">
                <label for="account-cell-phone">Cell phone</label>
                <input type="tel" id="account-cell-phone" name="cellPhone" data-cell-phone autocomplete="tel" maxlength="40" value="${e(m.cellPhone || m.phone || '')}">
                <p class="field-hint">Private. Stored only on this device.</p>
              </div>
              <div class="field">
                <label for="account-public-phone">Public phone <span class="optional">(optional)</span></label>
                <input type="tel" id="account-public-phone" name="publicPhoneNumber" data-public-phone autocomplete="off" maxlength="40" value="${e(publicPhoneFor(m))}" placeholder="A different number neighbors may use">
                <p class="field-hint">Shown on your public resume only if you opt in below.</p>
              </div>
            </div>
            <label class="checkbox"><input type="checkbox" name="samePhone" data-same-phone${m.samePhone !== false ? ' checked' : ''}> <span>Public phone is the same as my cell phone</span></label>
            <label class="checkbox"><input type="checkbox" name="publicPhone"${m.publicPhone ? ' checked' : ''}> <span>Show my public phone number on my public resume</span></label>
            <label class="checkbox"><input type="checkbox" name="receiveTexts"${m.receiveTexts ? ' checked' : ''}> <span>I want to receive texts at my cell number</span></label>
            <p class="field-hint">In this prototype no texts are sent and nothing is transmitted. The text choice is recorded locally only.</p>
          </fieldset>
          <fieldset>
            <legend>Profile &amp; skills</legend>
            <div class="form-row">
              <div class="field skill-picker" data-skill-picker="paid">
                <label for="account-paid-skills-search">Career / paid skills</label>
                <input type="search" id="account-paid-skills-search" data-skill-search="paid" maxlength="80" placeholder="Search carpentry, nursing, design…" autocomplete="off">
                <p class="field-hint">Search listed skills, or type your own and press Enter.</p>
                <div class="skill-results" data-skill-results></div>
                <div class="skill-chips" data-skill-chips></div>
                <input type="hidden" id="account-paid-skills" name="paidSkills" value="${e(m.paidSkills || '')}">
              </div>
              <div class="field skill-picker" data-skill-picker="unpaid">
                <label for="account-unpaid-skills-search">Unpaid skills</label>
                <input type="search" id="account-unpaid-skills-search" data-skill-search="unpaid" maxlength="80" placeholder="Search care, repair, tutoring…" autocomplete="off">
                <p class="field-hint">Search listed skills, or type your own and press Enter.</p>
                <div class="skill-results" data-skill-results></div>
                <div class="skill-chips" data-skill-chips></div>
                <input type="hidden" id="account-unpaid-skills" name="unpaidSkills" value="${e(m.unpaidSkills || '')}">
              </div>
            </div>
            <div class="field">
              <label for="account-tagline">Tag line</label>
              <input type="text" id="account-tagline" name="tagline" maxlength="90" value="${e(m.tagline || '')}" placeholder="A few words neighbors will see">
            </div>
            <div class="field account-groups-field">
              <p class="field-label">Groups</p>
              <p class="field-hint">Set by the groups you join or start. Your town group is automatic; this field cannot be typed.</p>
              ${renderGroupMembership(true)}
              <div class="account-form-actions account-group-actions">
                <button type="button" class="button button--outline button--small" data-open-group-form="joined">Join a group</button>
                <button type="button" class="button button--primary button--small" data-open-group-form="own">Create group</button>
              </div>
            </div>
            <div class="field">
              <label for="account-bio">Bio</label>
              <textarea id="account-bio" name="bio" rows="3" maxlength="600" placeholder="What you enjoy sharing with neighbors">${e(m.bio || '')}</textarea>
            </div>
            <div class="field">
              <label for="account-picture">Profile picture <span class="optional">(local only)</span></label>
              <input type="file" id="account-picture" name="picture" accept="image/jpeg,image/png,image/webp,image/gif">
              <p class="field-hint">Resized in this browser and never uploaded.</p>
              <label class="checkbox"><input type="checkbox" name="removePicture"> <span>Remove current picture</span></label>
            </div>
          </fieldset>
          <fieldset class="account-privacy-options">
            <legend>Privacy</legend>
            <label class="checkbox"><input type="checkbox" name="available"${m.available !== false ? ' checked' : ''}> <span>Available for labor and product requests</span></label>
            <p class="field-hint">When this is off, neighbors can still see your offers but cannot send labor or product requests.</p>
          </fieldset>
          <div class="account-form-actions">
            <button type="submit" class="button button--primary button--small">Save account details</button>
          </div>
        </form>
      </details>
      <p class="account-note">Changes are saved only on this device; nothing is transmitted. Your resume hides your legal name, street and mailing addresses, ZIP, housing status, birthdate, group, report count, and amounts donated, and shows your phone only if you opt in. Hours and item counts are never typed here; they appear only after mutual confirmation or review. To withdraw your membership, use the button in the pledge section.</p>
      <div class="settings-block">
        <h4>Local preferences</h4>
        <p class="account-note">These settings only change how this prototype behaves on this device. Nothing is sent anywhere.</p>
        <form class="account-form" data-settings-form>
          <label class="checkbox"><input type="checkbox" name="compactDashboard" ${s.compactDashboard ? 'checked' : ''}> <span>Use compact spacing on the dashboard</span></label>
          <label class="checkbox"><input type="checkbox" name="showPrototypeNotices" ${s.showPrototypeNotices ? 'checked' : ''}> <span>Show prototype notices</span></label>
          <div class="account-form-actions">
            <button type="submit" class="button button--primary button--small">Save settings</button>
          </div>
        </form>
      </div>
    </section>`;
    refreshSkillPickers(panel);
    syncPhoneFields(panel);
    initAccountDob(panel);
    initAccountAddressSync(panel);
  }

  function renderSettings() {
    renderAccountInfo();
  }

  function getPublicResume(member) {
    const address = member.publicAddressSource === 'physical' ? member.physicalAddress : member.mailingAddress;
    const totals = getConfirmedExchangeTotals(member.memberId);
    const hoursWorked = totals.hoursWorked;
    return {
      displayName: firstName(member.name),
      cityState: parseCityState(address) || parseCityState(member.location) || 'City not shared',
      picture: safeProfileImageUrl(member.picture),
      tagline: cleanString(member.tagline, 90),
      bio: cleanString(member.bio, 600),
      profession: cleanString(member.profession, 80),
      paidSkills: cleanString(member.paidSkills, 400),
      unpaidSkills: cleanString(member.unpaidSkills, 400),
      hoursWorked,
      hoursCompleted: hoursWorked,
      hoursUsed: totals.hoursUsed,
      itemsGifted: totals.itemsGifted,
      itemsTaken: totals.itemsTaken,
      available: member.available !== false,
      phone: member.publicPhone ? publicPhoneFor(member) : ''
    };
  }

  function getMemberPosts(memberId) {
    const id = cleanString(memberId, 100);
    if (!id) return [];
    return getAllListings()
      .filter((listing) => listing && listing.memberId === id)
      .map((listing) => ({
        id: listing.id,
        title: cleanString(listing.title, 80) || 'Untitled post',
        area: listing.pillar === 'goods' ? 'Free Stuff' : 'Free Labor',
        page: listing.pillar === 'goods' ? 'freestuff.html' : 'freelabor.html',
        location: cleanString(listing.location, 80),
        createdAt: cleanString(listing.createdAt, 40),
        comments: getListingComments(listing).length
      }));
  }

  // Public-resume chat posts come only from the Commons community chat. Group
  // posts, replies, social drafts, and private messages stay out of this view.
  function getMemberCommunityPosts(memberId) {
    const id = cleanString(memberId, 100);
    if (!id) return [];
    return (Array.isArray(state.chats) ? state.chats : [])
      .filter((chat) => chat && chat.memberId === id && cleanString(chat.body, 1200))
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 12)
      .map((chat) => {
        const photo = cleanPostPhotos(chat.picture)[0];
        return {
          id: chat.id,
          channel: communityChatChannelName(chat),
          subject: communityChatSubject(chat),
          body: cleanString(chat.body, 1200),
          nsfw: Boolean(chat.nsfw),
          picture: photo ? photo.dataUrl : '',
          createdAt: cleanString(chat.createdAt, 40)
        };
      });
  }

  function getMemberListingComments(memberId) {
    const id = cleanString(memberId, 100);
    if (!id) return [];
    const found = new Map();
    const add = (listing, comment) => {
      if (!listing || !comment || comment.memberId !== id || !comment.text) return;
      const key = comment.id || `${listing.id}-${comment.createdAt}`;
      found.set(key, {
        ...comment,
        listingId: listing.id,
        listingTitle: cleanString(listing.title, 80) || 'Untitled post'
      });
    };
    const map = state.listingComments && typeof state.listingComments === 'object' ? state.listingComments : {};
    Object.keys(map).forEach((listingId) => {
      const listing = findListing(listingId);
      if (listing) cleanThreadComments(map[listingId]).forEach((comment) => add(listing, comment));
    });
    getAllListings().filter((listing) => listing && listing.memberId === id).forEach((listing) => {
      cleanThreadComments(listing.comments).forEach((comment) => add(listing, comment));
    });
    return [...found.values()]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 20);
  }

  function getMemberInteractions(memberId) {
    const id = cleanString(memberId, 100);
    if (!id) return [];
    const items = [];
    (Array.isArray(state.requests) ? state.requests : []).forEach((request) => {
      if (!request || (request.memberId !== id && workerIdFor(request) !== id)) return;
      const role = request.memberId === id ? 'Requested' : 'Provided';
      items.push({
        kind: 'Exchange',
        title: cleanString(request.listingTitle, 80) || 'Commons request',
        detail: `${role} · ${getHourState(request) === 'logged' || getHourState(request) === 'resolved'
          ? `${cleanHours(request.loggedHours)} hr logged`
          : getHourState(request) === 'disputed' ? 'Hours in review' : 'Local request'}`,
        createdAt: cleanString(request.requestedAt, 40)
      });
    });
    (Array.isArray(state.socialChats) ? state.socialChats : []).forEach((chat) => {
      if (!chat || chat.memberId !== id) return;
      items.push({
        kind: 'Chat draft',
        title: cleanString(chat.title, 90) || 'Social chat draft',
        detail: cleanString(chat.audienceLabel, 80) || 'Friends',
        createdAt: cleanString(chat.createdAt, 40)
      });
    });
    (Array.isArray(state.messages) ? state.messages : []).forEach((message) => {
      if (!message || message.memberId !== id) return;
      items.push({
        kind: 'Message',
        title: cleanString(message.toName, 80) || 'Neighbor',
        detail: cleanString(message.body, 120),
        createdAt: cleanString(message.createdAt, 40)
      });
    });
    (Array.isArray(state.volunteerInterests) ? state.volunteerInterests : []).forEach((interest) => {
      if (!interest || interest.memberId !== id) return;
      items.push({
        kind: 'Volunteer offer',
        title: cleanString(interest.role, 80) || 'Volunteer role',
        detail: cleanString(interest.note, 120) || 'Local offer',
        createdAt: cleanString(interest.createdAt, 40)
      });
    });
    getFriendRequests().forEach((request) => {
      if (!request || request.memberId !== id || request.direction !== 'outgoing') return;
      items.push({
        kind: 'Friend request',
        title: cleanString(request.name, 60) || 'Neighbor',
        detail: cleanString(request.status, 30) || 'pending',
        createdAt: cleanString(request.createdAt, 40)
      });
    });
    return items
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 20);
  }

  function renderProfilePosts(posts) {
    if (!posts.length) return '<p class="resume-empty">No posts yet.</p>';
    const e = escapeHtml;
    return `<ul class="profile-post-list">${posts.map((post) => {
      const href = post.page ? `${post.page}?listing=${encodeURIComponent(post.id)}` : '#top';
      return `<li>
        <strong><a class="post-link" href="${e(href)}">${e(post.title)}</a></strong>
        <span class="contribution-meta">${e(post.area)}${post.location ? ` · ${e(post.location)}` : ''} · ${e(formatDate(post.createdAt) || 'Date not recorded')}${post.comments ? ` · ${post.comments} comment${post.comments === 1 ? '' : 's'}` : ''}</span>
      </li>`;
    }).join('')}</ul>`;
  }

  function renderCommunityPosts(posts) {
    if (!posts.length) return '<p class="resume-empty">No community chat posts yet.</p>';
    const e = escapeHtml;
    return `<ul class="profile-activity-list">${posts.map((post) => `<li>
      <strong>#${e(post.channel)} · ${e(post.subject)}</strong>${post.nsfw ? ' <span class="badge badge--nsfw">NSFW</span>' : ''}
      ${post.picture ? `<img class="chat-picture" src="${e(safeProfileImageUrl(post.picture))}" alt="Local picture for ${e(post.subject)}">` : ''}
      <p>${e(post.body)}</p>
      <span class="contribution-meta">${e(formatDate(post.createdAt) || 'Date not recorded')} · community chat post</span>
    </li>`).join('')}</ul>`;
  }

  function renderProfileComments(comments) {
    if (!comments.length) return '<p class="resume-empty">No comments yet.</p>';
    const e = escapeHtml;
    return `<ul class="profile-activity-list">${comments.map((comment) => `<li>
      <strong>${e(comment.listingTitle)}</strong>
      <p>${e(comment.text)}</p>
      <span class="contribution-meta">${e(formatDate(comment.createdAt) || 'Date not recorded')} · local comment</span>
    </li>`).join('')}</ul>`;
  }

  function renderProfileInteractions(items) {
    if (!items.length) return '<p class="resume-empty">No interactions yet.</p>';
    const e = escapeHtml;
    return `<ul class="profile-activity-list">${items.map((item) => `<li>
      <strong>${e(item.kind)}: ${e(item.title)}</strong>
      ${item.detail ? `<p>${e(item.detail)}</p>` : ''}
      <span class="contribution-meta">${e(formatDate(item.createdAt) || 'Date not recorded')}</span>
    </li>`).join('')}</ul>`;
  }

  // A neighbor's limited profile can start the same local friend request used
  // by the Friends & Groups member search. Nothing is delivered to the neighbor.
  function renderProfileFriendAction(member) {
    if (!isMember() || !member || !member.memberId) return '';
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    if (member.memberId === selfId) return '';
    const e = escapeHtml;
    const id = cleanString(member.memberId, 100);
    const requests = getFriendRequests();
    const friends = Array.isArray(state.friends) ? state.friends : [];
    const alreadyFriend = friends.some((friend) => friend && (friend.memberId === id
      || friend.name === cleanString(member.name, 60)));
    const pendingOut = requests.find((request) => request && request.memberId === id
      && request.direction === 'outgoing' && request.status === 'pending');
    const pendingIn = requests.find((request) => request && request.memberId === id
      && request.direction === 'incoming' && request.status === 'pending');
    if (alreadyFriend) return '<button class="button button--outline button--tiny" type="button" disabled>Already a friend</button>';
    if (pendingOut) return '<button class="button button--outline button--tiny" type="button" disabled>Request pending</button>';
    if (pendingIn) {
      return `<div class="notification-actions">
        <button class="button button--primary button--tiny" type="button" data-friend-request-action="accept" data-friend-request-id="${e(pendingIn.id)}">Accept request</button>
        <button class="button button--ghost button--tiny" type="button" data-friend-request-action="decline" data-friend-request-id="${e(pendingIn.id)}">Decline</button>
      </div>`;
    }
    return `<button class="button button--outline button--tiny" type="button" data-friend-request-send="${e(id)}" aria-label="Send a local friend request to ${e(member.name || 'this member')}">Add friend</button>`;
  }

  // The public resume is the limited projection of a member record. The same
  // card is used for the signed-in member's "View as: Neighbor" preview and for
  // a neighbor reached through a member link.
  function renderPublicResumeCard(member, options = {}) {
    const e = escapeHtml;
    const other = Boolean(options.other);
    const resume = getPublicResume(member);
    const posts = getMemberPosts(member.memberId);
    const communityPosts = getMemberCommunityPosts(member.memberId);
    const skillList = (value) => {
      const items = cleanString(value, 400)
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      return items.length
        ? `<ul class="resume-skills">${items.map((item) => `<li>${e(item)}</li>`).join('')}</ul>`
        : '<p class="resume-empty">Not listed yet.</p>';
    };
    const metrics = [
      ['Hours worked', resume.hoursWorked],
      ['Hours used', resume.hoursUsed],
      ['Items gifted', resume.itemsGifted],
      ['Items taken', resume.itemsTaken]
    ];
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    const canReport = isMember() && other && member.memberId !== selfId;

    return `<section class="resume-card profile-themed" style="${e(profileThemeStyle(getProfileTheme(member, 'public')))}" aria-labelledby="resume-name">
      <div class="resume-head">
        ${resume.picture ? `<img class="resume-photo" src="${e(resume.picture)}" alt="${e(resume.displayName || 'Member')}'s profile picture">` : ''}
        <div>
          <p class="eyebrow">Resume</p>
          <h2 id="resume-name">${e(resume.displayName || 'Member')}</h2>
          ${resume.tagline ? `<p class="resume-tagline">${e(resume.tagline)}</p>` : ''}
          ${resume.profession ? `<p class="resume-profession">${e(resume.profession)}</p>` : ''}
          <p class="resume-location"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-pin"></use></svg> ${e(resume.cityState)}</p>
          ${resume.phone ? `<p class="resume-phone">Public phone: ${e(resume.phone)}</p>` : ''}
          ${renderPublicStatusTags(member)}
        </div>
        <span class="resume-availability ${resume.available ? 'is-available' : ''}">${resume.available ? 'Available for requests' : 'Unavailable · not receiving requests'}</span>
        <div class="profile-card-actions">
          ${renderProfileFriendAction(member)}
          ${canReport ? `<button class="button button--ghost button--small button--report" type="button" data-report-context data-report-area="Member profile" data-report-detail="Public resume" data-report-name="${e(member.name || resume.displayName)}" data-report-member-id="${e(member.memberId || '')}" data-report-source-id="${e(member.memberId || 'profile')}" aria-label="Report a concern from ${e(resume.displayName)}'s profile">Report from this profile</button>` : ''}
        </div>
      </div>
      ${resume.bio ? `<div class="resume-section">
        <h3>About</h3>
        <p class="resume-bio">${e(resume.bio)}</p>
      </div>` : ''}
      <div class="resume-section">
        <h3>Career / paid skills</h3>
        ${skillList(resume.paidSkills)}
      </div>
      <div class="resume-section">
        <h3>Unpaid skills</h3>
        ${skillList(resume.unpaidSkills)}
      </div>
      <div class="resume-section">
        <h3>Commons record</h3>
        <dl class="resume-metrics">
          ${metrics.map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}
        </dl>
      </div>
      <div class="resume-section">
        <h3>Offers in Free Stuff &amp; Free Labor</h3>
        ${renderProfilePosts(posts)}
      </div>
      <div class="resume-section">
        <h3>Community chat posts</h3>
        ${renderCommunityPosts(communityPosts)}
      </div>
      <p class="account-note">${other
        ? 'This is the limited public profile from the local directory. It shows only the chosen first name, picture, tag line, bio, profession, City/State, skills, confirmed commons totals, membership badges (Seed, Beta Founder, 1st Year, First year Founder, Volunteer), availability, an optional public phone, Free Stuff and Free Labor posts, and community chat posts.'
        : 'This resume shows only the chosen first name, picture, tag line, bio, profession, City/State, skills, confirmed hours and item totals, membership badges (Seed, Beta Founder, 1st Year, First year Founder, Volunteer), availability, an optional public phone, Free Stuff and Free Labor posts, and community chat posts.'} Group chats and group interactions stay only on the group profile for group members. Legal name, street and mailing addresses, ZIP, housing status, birthdate, group, report count, amounts donated, listing comment text, and private interactions are never included.</p>
    </section>`;
  }

  function renderProfile() {
    const publicPanel = document.getElementById('public-resume');
    const privatePanel = document.getElementById('private-profile');
    if (!publicPanel) return;

    const e = escapeHtml;
    const param = profileMemberParam();
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    const viewingOther = Boolean(param && param !== selfId);
    applyProfileView();

    if (viewingOther) {
      const member = findMemberById(param);
      publicPanel.innerHTML = member
        ? renderPublicResumeCard(member, { other: true })
        : `<section class="resume-card"><p class="eyebrow">Member profile</p><h2>Member not found</h2><p>This member is not in the local directory saved on this device.</p><a class="button button--outline" href="dashboard.html#social">Back to Friends &amp; Groups</a></section>`;
      if (privatePanel) privatePanel.innerHTML = '';
      return;
    }

    const m = state.pledge;
    if (!m) {
      publicPanel.innerHTML = `<section class="resume-card">
        <p class="eyebrow">Member profile</p>
        <h2>No public resume yet</h2>
        <p>When someone signs the pledge on this device, their public resume will appear here.</p>
        <a class="button button--primary" href="pledge.html">Take the Pledge <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></a>
      </section>`;
      if (privatePanel) privatePanel.innerHTML = '';
      return;
    }

    const credential = getActiveCredential();
    const guiltyReportsAgainst = reportsAboutMember()
      .filter((report) => report && ['restriction_active', 'access_restored'].includes(report.status)).length;

    publicPanel.innerHTML = renderPublicResumeCard(m);

    if (!privatePanel || !isMember()) {
      if (privatePanel) privatePanel.innerHTML = '';
      return;
    }

    privatePanel.innerHTML = `<section class="resume-card private-profile profile-themed" style="${e(profileThemeStyle(getProfileTheme(m, 'private')))}" aria-labelledby="private-profile-title">
      <div class="resume-head">
        ${m.picture ? `<img class="resume-photo" src="${e(safeProfileImageUrl(m.picture))}" alt="Your profile picture">` : ''}
        <div>
          <p class="eyebrow">Private to you</p>
          <h2 id="private-profile-title">Your full member record</h2>
          ${m.tagline ? `<p class="resume-tagline">${e(m.tagline)}</p>` : ''}
          ${m.profession ? `<p class="resume-profession">${e(m.profession)}</p>` : ''}
          <p class="resume-location"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-pin"></use></svg> ${e(m.location || 'Location not shared')}</p>
        </div>
        <span class="resume-availability ${m.available === false ? '' : 'is-available'}">${m.available === false ? 'Unavailable · not receiving requests' : 'Available for requests'}</span>
        <a class="button button--outline button--small" href="dashboard.html#settings">Edit profile</a>
      </div>
      <p class="private-notice"><strong>This is your full member record.</strong> Everything below stays in your signed-in browser on this device. Neighbors see only the limited public resume; use <strong>View as: Neighbor</strong> above to see exactly what they see.</p>
      <div class="resume-section">
        <h3>Membership at a glance</h3>
        ${renderAccountSummary(m)}
      </div>
      ${renderAccountDetailGroups(m, credential, guiltyReportsAgainst)}
      <div class="resume-section">
        <h3>Your posts in Free Stuff &amp; Free Labor</h3>
        ${renderProfilePosts(getMemberPosts(m.memberId))}
      </div>
      <div class="resume-section">
        <h3>Comments you left</h3>
        ${renderProfileComments(getMemberListingComments(m.memberId))}
      </div>
      <div class="resume-section">
        <h3>Interactions</h3>
        ${renderProfileInteractions(getMemberInteractions(m.memberId))}
      </div>
      <div class="resume-section">
        <h3>Privacy choices</h3>
        <p class="account-note">Choose what appears on your limited public resume. Save here or in Settings; both use the same local record.</p>
        <form class="account-form profile-privacy-form" data-profile-privacy-form>
          <div class="field">
            <label for="profile-public-address">Public City, State from</label>
            <select id="profile-public-address" name="publicAddressSource">
              <option value="mailing"${m.publicAddressSource !== 'physical' ? ' selected' : ''}>Mailing address</option>
              <option value="physical"${m.publicAddressSource === 'physical' ? ' selected' : ''}>Physical address</option>
            </select>
            <p class="field-hint">Only the city and state from that address are shown; the street and ZIP stay private.</p>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="profile-cell-phone">Cell phone</label>
              <input type="tel" id="profile-cell-phone" name="cellPhone" data-cell-phone autocomplete="tel" maxlength="40" value="${e(m.cellPhone || m.phone || '')}">
              <p class="field-hint">Private. Stored only on this device.</p>
            </div>
            <div class="field">
              <label for="profile-public-phone">Public phone <span class="optional">(optional)</span></label>
              <input type="tel" id="profile-public-phone" name="publicPhoneNumber" data-public-phone autocomplete="off" maxlength="40" value="${e(publicPhoneFor(m))}" placeholder="A different number neighbors may use">
              <p class="field-hint">Shown only if you opt in below.</p>
            </div>
          </div>
          <label class="checkbox"><input type="checkbox" name="samePhone" data-same-phone${m.samePhone !== false ? ' checked' : ''}> <span>Public phone is the same as my cell phone</span></label>
          <fieldset class="account-privacy-options">
            <legend>Show on public resume</legend>
            <label class="checkbox"><input type="checkbox" name="publicPhone"${m.publicPhone ? ' checked' : ''}> <span>Public phone number</span></label>
            <label class="checkbox"><input type="checkbox" name="receiveTexts"${m.receiveTexts ? ' checked' : ''}> <span>Receive texts at my cell number (local choice only)</span></label>
            <label class="checkbox"><input type="checkbox" name="available"${m.available !== false ? ' checked' : ''}> <span>Available for labor and product requests</span></label>
            <p class="field-hint">When this is off, neighbors can still see your offers but cannot send labor or product requests.</p>
          </fieldset>
          <p class="field-hint">In this prototype no texts are sent and nothing is transmitted. Always private: legal name, street and mailing addresses, ZIP, housing status, birthdate, group, report count, amounts donated, listing comment text, group chats, group interactions, and other private interactions.</p>
          <div class="account-form-actions">
            <button type="submit" class="button button--primary button--small">Save privacy choices</button>
          </div>
        </form>
      </div>
      <div class="resume-section">
        <h3>Profile colors</h3>
        <p class="account-note">Pick a background and content color for each view. The public colors appear on your limited resume for neighbors; the private colors apply only to this full record. Nothing leaves this browser.</p>
        <form class="account-form profile-theme-form" data-profile-theme-form>
          <fieldset>
            <legend>Public resume colors</legend>
            <div class="form-row">
              <div class="field">
                <label for="theme-public-bg">Background</label>
                <input type="color" id="theme-public-bg" name="publicBackground" value="${e(getProfileTheme(m, 'public').background)}">
              </div>
              <div class="field">
                <label for="theme-public-fg">Content</label>
                <input type="color" id="theme-public-fg" name="publicContent" value="${e(getProfileTheme(m, 'public').content)}">
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Private record colors</legend>
            <div class="form-row">
              <div class="field">
                <label for="theme-private-bg">Background</label>
                <input type="color" id="theme-private-bg" name="privateBackground" value="${e(getProfileTheme(m, 'private').background)}">
              </div>
              <div class="field">
                <label for="theme-private-fg">Content</label>
                <input type="color" id="theme-private-fg" name="privateContent" value="${e(getProfileTheme(m, 'private').content)}">
              </div>
            </div>
          </fieldset>
          <div class="account-form-actions">
            <button type="submit" class="button button--primary button--small">Save profile colors</button>
            <button type="button" class="button button--ghost button--small" data-profile-theme-reset>Reset to defaults</button>
          </div>
        </form>
      </div>
      <p class="account-note">City, State, ZIP, birthdate, group, report count, amounts donated, and every sensitive record stay here. Hours and item counts are never typed by hand; they appear only after mutual confirmation or review.</p>
    </section>`;
    syncPhoneFields(privatePanel);
  }

  function canPostInGroup(group) {
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    return Boolean(isMember() && group && !group.left
      && (Array.isArray(group.members) ? group.members : [])
        .some((member) => member && member.memberId === selfId));
  }

  function getGroupPosts(groupId) {
    const id = cleanString(groupId, 100);
    return (Array.isArray(state.groupPosts) ? state.groupPosts : [])
      .filter((post) => post && post.groupId === id)
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function renderGroupPosts(group, posts, canPost, canModerate) {
    if (!posts.length) {
      return '<p class="account-note">No group posts yet. Members can start the conversation below.</p>';
    }
    const e = escapeHtml;
    return `<ul class="group-post-list">${posts.map((post) => {
      const picture = cleanPostPhotos(post.picture)[0];
      const comments = Array.isArray(post.comments) ? post.comments : [];
      const agreeVotes = comments.filter((comment) => /^\s*agree\b/i.test(cleanString(comment && comment.body, 600))).length;
      const disagreeVotes = comments.filter((comment) => /^\s*disagree\b/i.test(cleanString(comment && comment.body, 600))).length;
      return `<li class="group-post">
        <p class="contribution-meta"><strong>${memberNameLink(post.name, post.memberId)}</strong> · ${e(formatDate(post.createdAt) || 'Date not recorded')}${post.nsfw ? ' · <span class="badge badge--nsfw">NSFW</span>' : ''}</p>
        ${post.title ? `<h4>${e(post.title)}</h4>` : ''}
        ${picture ? `<img class="chat-picture" src="${e(safeProfileImageUrl(picture.dataUrl))}" alt="Local picture for ${e(post.title || 'this group post')}">` : ''}
        <p>${e(post.body)}</p>
        ${post.guidelineVote ? `<p class="contribution-meta guideline-vote-tally">${post.reviewBoardVote ? 'Review board vote' : 'Guideline vote'} · ${agreeVotes} agree · ${disagreeVotes} disagree · opened by an admin · votes are anonymous</p>` : ''}
        ${post.guidelineVote && post.outcome ? `<p class="contribution-meta guideline-outcome">Admin outcome: ${e(post.outcome)} · chosen by ${e(post.outcomeBy || 'an admin')}${post.outcomeNote ? ` · ${e(post.outcomeNote)}` : ''}</p>` : ''}
        <div class="notification-actions">
          <button class="button button--ghost button--tiny button--report" type="button" data-report-context data-report-area="Group chat" data-report-detail="${e(post.title ? `${post.title} · ` : '')}${e(groupDisplayLabel(group))}" data-report-name="${e(post.name)}" data-report-member-id="${e(post.memberId || '')}" data-report-source-id="${e(post.id)}" aria-label="Report a concern about a post from ${e(post.name)}">Report</button>
          ${canModerate ? `<button class="button button--ghost button--tiny" type="button" data-group-delete="post" data-group-id="${e(group.id)}" data-group-post-id="${e(post.id)}" aria-label="Delete this group post locally">Delete post</button>` : ''}
        </div>
        <div class="group-post-comments">
          <p class="contribution-meta">${comments.length} ${comments.length === 1 ? 'reply' : 'replies'} attached to this post</p>
          ${comments.length ? `<ul class="profile-activity-list">${comments.map((comment) => `<li>
            <strong>${comment.anonymous ? 'Anonymous member' : memberNameLink(comment.name, comment.memberId)}</strong>
            <p>${e(comment.body)}</p>
            <span class="contribution-meta">${e(formatDate(comment.createdAt) || 'Date not recorded')}${comment.anonymous ? ' · anonymous vote' : ''}</span>
            <div class="notification-actions">
              <button class="button button--ghost button--tiny button--report" type="button" data-report-context data-report-area="Group chat reply" data-report-detail="${e(post.title ? `${post.title} · ` : '')}${e(groupDisplayLabel(group))}" data-report-name="${e(comment.anonymous ? 'Anonymous member' : comment.name)}" data-report-member-id="${e(comment.anonymous ? '' : (comment.memberId || ''))}" data-report-source-id="${e(comment.id)}" aria-label="Report a concern about a reply from ${e(comment.anonymous ? 'an anonymous member' : comment.name)}">Report</button>
              ${canModerate ? `<button class="button button--ghost button--tiny" type="button" data-group-delete="reply" data-group-id="${e(group.id)}" data-group-post-id="${e(post.id)}" data-group-reply-id="${e(comment.id)}" aria-label="Delete this reply locally">Delete reply</button>` : ''}
            </div>
          </li>`).join('')}</ul>` : ''}
          ${canPost ? `<form class="account-form group-comment-form" data-group-comment-form data-group-post-id="${e(post.id)}">
            <div class="field">
              <label for="group-reply-${e(domId(post.id))}">Reply to this post</label>
              <input type="text" id="group-reply-${e(domId(post.id))}" name="body" maxlength="600" required placeholder="${post.guidelineVote ? 'Reply Agree or Disagree…' : 'Add to the conversation…'}">
            </div>
            <button type="submit" class="button button--ghost button--tiny">Add reply</button>
          </form>` : ''}
          ${post.guidelineVote && canModerate ? `<form class="account-form group-outcome-form" data-group-outcome-form data-group-id="${e(group.id)}" data-group-post-id="${e(post.id)}">
            <div class="field">
              <label for="group-outcome-${e(domId(post.id))}">Admin outcome of this conversation</label>
              <select id="group-outcome-${e(domId(post.id))}" name="outcome" required>
                <option value="">Choose an outcome…</option>
                ${['Agreed', 'Not agreed', 'More discussion needed'].map((outcome) => `<option value="${e(outcome)}"${post.outcome === outcome ? ' selected' : ''}>${e(outcome)}</option>`).join('')}
              </select>
              <input type="text" name="note" maxlength="600" value="${e(post.outcomeNote || '')}" placeholder="Why this outcome? (optional)">
              <p class="field-hint">Admins must record what they think the conversation decided. Stored locally with your name.</p>
            </div>
            <button type="submit" class="button button--outline button--tiny">${post.outcome ? 'Update outcome' : 'Record outcome'}</button>
          </form>` : ''}
          ${post.guidelineVote && !canModerate ? '<p class="account-note">The admins will record what they think the outcome of this conversation was.</p>' : ''}
        </div>
      </li>`;
    }).join('')}</ul>`;
  }

  function renderGroupProfile() {
    const panel = document.getElementById('group-profile');
    if (!panel) return;
    const e = escapeHtml;
    let id = '';
    try {
      id = cleanString(new URLSearchParams(window.location.search).get('group'), 120);
    } catch (error) {
      id = '';
    }
    if (!isMember()) {
      panel.innerHTML = `<section class="resume-card"><p class="eyebrow">Group profile</p><h2>Sign in to see groups</h2><p>Group profiles are part of the member area. Take the pledge on this device to see the local directory.</p><a class="button button--primary" href="pledge.html">Take the Pledge</a></section>`;
      return;
    }
    const group = getGroupById(id);
    if (!group) {
      panel.innerHTML = `<section class="resume-card"><p class="eyebrow">Group profile</p><h2>Group not found</h2><p>This group is not saved in this browser. It may have been left, canceled, or created on another device.</p><a class="button button--outline" href="dashboard.html#social">Back to Friends &amp; Groups</a></section>`;
      return;
    }
    const members = Array.isArray(group.members) ? group.members : [];
    const memberIds = members.map((member) => member && member.memberId).filter(Boolean);
    const postMap = new Map();
    memberIds.forEach((memberId) => getMemberPosts(memberId).forEach((post) => postMap.set(post.id, post)));
    const listingPosts = [...postMap.values()];
    const groupPosts = getGroupPosts(group.id);
    const canPost = canPostInGroup(group);
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    const canModerate = isGroupAdmin(group, selfId);
    const rotation = groupAdminRotation(group);
    const surplus = getGroupSurplusAllowance(group.id);
    const settings = normalizeGroupSettings(group.settings);
    const configuredLocation = cleanString(settings.location, 120);
    const location = settings.online
      ? 'Online'
      : (configuredLocation || (group.kind === 'town' ? townLocationLabel() : ''));
    const business = settings.business;
    const brandOffers = groupBrandOfferings(settings);
    panel.innerHTML = `<section class="resume-card group-profile" aria-labelledby="group-profile-title">
      <div class="resume-head">
        <div>
          <p class="eyebrow">Group profile</p>
          <h2 id="group-profile-title">${e(groupDisplayLabel(group))}</h2>
          <p class="group-kind">${e(groupKindLabel(group))}</p>
          ${location ? `<p class="group-location">${e(location)}</p>` : ''}
          ${group.left ? '<p class="private-notice">You left this group. It stays here only so this local record can still be opened; it is no longer in your group list.</p>' : ''}
          ${group.purpose ? `<p class="resume-bio">${e(group.purpose)}</p>` : '<p class="resume-empty">No purpose added yet.</p>'}
        </div>
        <div class="group-profile-actions">
          ${canModerate && SITE_PHASE >= 2 ? `<button class="button button--outline button--small" type="button" data-group-settings="${e(group.id)}">Group settings</button>` : ''}
          <a class="button button--outline button--small" href="dashboard.html#social">Back to groups</a>
        </div>
      </div>
      <div class="resume-section">
        <h3>Members</h3>
        <p class="contribution-meta">${members.length}/${SOCIAL_LIMITS.groupMembers} people · counted from the group’s member list, not typed by hand.</p>
        <ul class="profile-post-list">${members.map((member) => {
          const adminSeat = rotation.seats.find((seat) => seat.member && seat.member.memberId === member.memberId);
          return `<li>
            ${memberNameLink(member.name, member.memberId)}
            ${member.memberId === selfId ? '<span class="badge badge--soft">You</span>' : ''}
            ${adminSeat ? `<span class="badge badge--amber">Admin · seat ${adminSeat.seat}</span>` : ''}
            ${canModerate && member.memberId !== selfId ? `<div class="notification-actions"><button class="button button--ghost button--tiny" type="button" data-group-review="${e(group.id)}" data-group-member-id="${e(member.memberId)}" aria-label="Require an impartial review of ${e(member.name)}">Require impartial review</button></div>` : ''}
          </li>`;
        }).join('')}</ul>
      </div>
      <div class="resume-section">
        <h3>Admins</h3>
        <p class="contribution-meta">Seven admin seats rotate each week for workers. Seat 1 changes every week, seat 2 every two weeks, and so on, so the group has staggered admin terms. Only workers can hold a seat or be added as a standing admin.</p>
        ${rotation.seats.length ? `<ul class="profile-post-list admin-seat-list">${rotation.seats.map((seat) => `<li>
          <span class="badge badge--amber">Seat ${seat.seat}</span>
          ${memberNameLink(seat.member.name, seat.member.memberId)}
          ${seat.member.memberId === selfId ? '<span class="badge badge--soft">You</span>' : ''}
          <span class="contribution-meta">Rotates every ${seat.cycleWeeks} week${seat.cycleWeeks === 1 ? '' : 's'}</span>
        </li>`).join('')}</ul>` : '<p class="account-note">No admin seats are recorded until members are added to this group.</p>'}
        ${(() => {
          const standing = (Array.isArray(group.admins) ? group.admins : [])
            .filter((id) => id && !rotation.memberIds.includes(id));
          if (!standing.length) return '';
          return `<p class="contribution-meta">Standing admins recorded: ${standing.map((id) => {
            const member = members.find((entry) => entry.memberId === id);
            return member ? memberNameLink(member.name, member.memberId) : e(id);
          }).join(', ')}</p>`;
        })()}
        ${group.guidelines ? `<p class="group-guidelines"><strong>Group community guidelines</strong><span>${e(group.guidelines)}</span></p>` : ''}
        <p class="account-note">Current admins can cancel a group, delete group chat posts and replies, require an impartial review of a member, change this group’s community guidelines, and run a chat vote on a guideline. You can leave when another member is recorded in the admin rotation. Reports made by a temporary admin still require evidence and an impartial member review.</p>
        ${canModerate ? `<form class="account-form group-guidelines-form" data-group-guidelines-form data-group-id="${e(group.id)}">
          <div class="field">
            <label for="group-guidelines-${e(domId(group.id))}">Group community guidelines</label>
            <textarea id="group-guidelines-${e(domId(group.id))}" name="guidelines" rows="3" maxlength="1200" placeholder="Consent, scope, how mutual aid handles Basic Necessities, and how this group makes decisions…">${e(group.guidelines || '')}</textarea>
            <p class="field-hint">Only current admins can change this. Basic Necessities are fixed across Unbought; this group decides how mutual aid works within them. Stored locally in this browser; nothing is published to another device.</p>
          </div>
          <button type="submit" class="button button--outline button--small">Save guidelines locally</button>
        </form>
        <form class="account-form group-guideline-vote-form" data-group-guideline-vote-form data-group-id="${e(group.id)}">
          <div class="field">
            <label for="group-vote-${e(domId(group.id))}">Guideline change to vote on</label>
            <textarea id="group-vote-${e(domId(group.id))}" name="proposal" rows="2" maxlength="800" required placeholder="Write the guideline change members should vote on…"></textarea>
            <p class="field-hint">Opens a group chat post where members reply “Agree” or “Disagree”. Votes are anonymous: replies show “Anonymous member,” and the vote stays on this device.</p>
          </div>
          <button type="submit" class="button button--primary button--small">Start guideline vote in chat</button>
        </form>
        <form class="account-form group-review-vote-form" data-group-review-vote-form data-group-id="${e(group.id)}">
          <div class="field">
            <label for="group-review-vote-${e(domId(group.id))}">Review board alliance vote</label>
            <textarea id="group-review-vote-${e(domId(group.id))}" name="proposal" rows="2" maxlength="800" required placeholder="Why should this group close its review board to outside alliances?"></textarea>
            <p class="field-hint">Opens a group chat post where working members reply “Agree” or “Disagree”. An Agreed outcome closes this group’s review board to alliances outside its ZIP code only. Allied groups in the same ZIP code are always included.</p>
          </div>
          <button type="submit" class="button button--outline button--small">Start review board vote in chat</button>
        </form>` : '<p class="account-note">Only a current admin can change group community guidelines or run a guideline vote.</p>'}
        ${(() => {
          if (!canModerate) {
            return '<p class="account-note">Only a current admin can add another standing admin.</p>';
          }
          const eligible = members.filter((member) => member.memberId !== selfId
            && isGroupWorker(member)
            && !(Array.isArray(group.admins) ? group.admins : []).includes(member.memberId));
          if (!eligible.length) {
            return '<p class="account-note">Only workers can be admins. Add another worker to this group first, or switch to an eligible member.</p>';
          }
          return `<form class="account-form group-admin-form" data-group-admin-form data-group-id="${e(group.id)}">
            <div class="field">
              <label for="group-admin-select">Add a standing admin</label>
              <select id="group-admin-select" name="memberId" required>
                ${eligible.map((member) => `<option value="${e(member.memberId)}">${e(member.name)}</option>`).join('')}
              </select>
              <p class="field-hint">Recorded locally in this browser. Weekly seats still rotate; no invitation or account change is sent.</p>
            </div>
            <div class="account-form-actions"><button type="submit" class="button button--primary button--small">Add admin locally</button></div>
          </form>`;
        })()}
      </div>
      <div class="resume-section">
        <h3>Group chat</h3>
        <p class="account-note">This is the place for members of this group to post and talk. Replies stay attached to the post they answer. Group interaction is only available to the Group; it never appears on a public resume.</p>
        ${renderGroupPosts(group, groupPosts, canPost, canModerate)}
        ${canPost ? `<form class="account-form group-post-form" data-group-post-form data-group-id="${e(group.id)}">
          <div class="form-row">
            <div class="field">
              <label for="group-post-audience">Audience</label>
              <select id="group-post-audience" name="audience" disabled><option selected>${e(groupDisplayLabel(group))}</option></select>
              <p class="field-hint">Only members of this group see this local draft.</p>
            </div>
            <div class="field">
              <label for="group-post-title">Title <span class="optional">(optional)</span></label>
              <input type="text" id="group-post-title" name="title" maxlength="90" placeholder="What is this about?">
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="group-post-message">Message</label>
              <textarea id="group-post-message" name="body" rows="3" maxlength="1200" required placeholder="Share something with this group…"></textarea>
            </div>
            <div class="field">
              <label for="group-post-picture">Picture <span class="optional">(optional)</span></label>
              <input type="file" id="group-post-picture" name="picture" accept="image/jpeg,image/png,image/webp,image/gif">
              <p class="field-hint">Resized locally and kept only in this browser. Nothing is uploaded.</p>
            </div>
          </div>
          <div class="field">
            <label class="checkbox">
              <input type="checkbox" name="nsfw" value="1">
              <span>Mark this post NSFW if it is unsuitable for minors. No porn and no prostitution on Unbought.</span>
            </label>
          </div>
          <button type="submit" class="button button--primary button--small">Post to group</button>
        </form>` : '<p class="account-note">Only current members can post in this group.</p>'}
      </div>
      <div class="resume-section">
        <h3>Offers in Free Stuff &amp; Free Labor</h3>
        ${SITE_PHASE >= 2 && business.enabled ? `<div class="group-brand-banner">
          <p class="eyebrow">${e(groupBrandLabel(settings))}</p>
          <h4>${e(business.brandName || groupDisplayLabel(group))}</h4>
          ${business.description ? `<p>${e(business.description)}</p>` : ''}
          ${brandOffers.length ? `<p class="contribution-meta">Known for: ${brandOffers.map((offer) => e(offer)).join(' · ')}</p>` : ''}
          <p class="account-note">A collection of related services and goods offered by this group. Members still receive everything free through mutual consent.</p>
        </div>` : ''}
        ${renderProfilePosts(listingPosts)}
      </div>
      <div class="resume-section">
        <h3>Group details</h3>
        <dl class="resume-metrics">
          <div><dt>Type</dt><dd>${e(groupKindLabel(group))}</dd></div>
          <div><dt>People</dt><dd>${members.length}/${SOCIAL_LIMITS.groupMembers}</dd></div>
          <div><dt>Admin seats</dt><dd>${rotation.seats.length}/${GROUP_ADMIN_SEATS} · staggered weekly</dd></div>
          <div><dt>Surplus allowance</dt><dd>${e(formatMoney(surplus.amount))} · uncapped local estimate</dd></div>
          ${location ? `<div><dt>Location</dt><dd>${e(location)}</dd></div>` : ''}
          ${SITE_PHASE >= 2 && business.enabled ? `<div><dt>Business</dt><dd>${e(business.brandName || groupDisplayLabel(group))} · ${e(groupBrandLabel(settings))}</dd></div>` : ''}
          <div><dt>Added</dt><dd>${e(formatDate(group.createdAt) || 'Not recorded')}</dd></div>
        </dl>
        <p class="account-note"><strong>Basic Necessities:</strong> ${e(BASIC_NECESSITIES_NOTE)}</p>
        <p class="account-note"><strong>Alliances:</strong> ${e(ALLIANCE_COPY)} Working members vote on alliance terms and guidelines.</p>
        <p class="account-note"><strong>Surplus spending:</strong> This group has ${e(formatMoney(surplus.groupAmount))} credited locally to Unbought, ${e(String(surplus.percent))}% of the recorded fund. Its uncapped slice of unspoken-for money is ${e(formatMoney(surplus.amount))}. This group surplus slice is separate from any member's capped severance check, so the two amounts can be different. Eventually, admins from all the groups will come together to figure out Unbought spending. This is a planning estimate only; no money moves, is spent, or is transmitted in this prototype.</p>
        <p class="account-note"><strong>Land search:</strong> Each group is in charge of finding land in their area that they want to collectively buy. The first house will be in the place where the most Unbought members live; as we scale, groups keep scouting locally while the first purchase follows the densest membership. Once a group picks a house, they will get in touch with the Unbought housing team — real estate, lawyers, and others, all volunteer — if it is available to buy a house. The local allowance is a guide for that discussion, not a purchase, offer, or commitment, and nothing is transmitted from this prototype.</p>
        ${SITE_PHASE >= 2 && business.enabled ? `<div class="group-business-details">
          <h4>Group business</h4>
          <p class="account-note">${business.brandChoice === 'unbought' ? 'This group records the Unbought Brand' : 'This group records its own brand'} for a collection of related services and goods. It creates industry inside a moneyless society: neighbors trade through mutual consent, not prices. Group brands arrive in Phase 2 on the vernal equinox, ${e(GROUP_BRAND_ROLLOUT_COPY)}.</p>
          ${business.coop.legalName || business.coop.entityType || business.coop.registration || business.coop.notes ? `<div class="group-coop-details">
            <h5>Co-op legal information</h5>
            <p class="contribution-meta">${[
              business.coop.legalName ? `Legal name: ${e(business.coop.legalName)}` : '',
              business.coop.entityType ? `Entity type: ${e(business.coop.entityType)}` : '',
              business.coop.registration ? `Registration: ${e(business.coop.registration)}` : ''
            ].filter(Boolean).join(' · ')}</p>
            ${business.coop.notes ? `<p>${e(business.coop.notes)}</p>` : ''}
            <p class="account-note">A co-op is optional and is formed legally outside Unbought. These details stay in this browser; nothing is filed or transmitted.</p>
          </div>` : ''}
          ${business.brandChoice === 'unbought' ? `<p class="account-note">Because this group chose the Unbought Brand, the Unbought legal guild and administrative guild will work with you to ensure safety. No request leaves this browser in the prototype.</p>` : `<p class="account-note">This group uses its own brand. Using the Unbought Brand is optional.</p>`}
        </div>` : ''}
      </div>
      <p class="account-note">This is a local prototype group. Membership, names, and the count are stored only in this browser; nothing was sent, and no invitations were delivered.</p>
    </section>`;
  }

  function openGroupSettingsDialog(groupId) {
    const group = getGroupById(groupId);
    if (!group || !isGroupAdmin(group, state.pledge.memberId)) {
      showToast('Only a current admin can change group settings.', false);
      return;
    }
    const existing = document.getElementById('group-settings-dialog');
    if (existing) existing.remove();
    const settings = normalizeGroupSettings(group.settings);
    const business = settings.business;
    const e = escapeHtml;
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog dialog--settings';
    dialog.id = 'group-settings-dialog';
    dialog.setAttribute('aria-labelledby', 'group-settings-title');
    dialog.innerHTML = `
      <div class="dialog-shell">
        <div class="dialog-top">
          <p class="eyebrow">Group settings</p>
          <button class="icon-button" type="button" data-dialog-close aria-label="Close group settings">
            <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-close"></use></svg>
          </button>
        </div>
        <div class="dialog-content">
          <h2 id="group-settings-title">${e(groupDisplayLabel(group))}</h2>
          <p class="dialog-note">Only current admins can change these details. Group brands arrive in Phase 2 on the vernal equinox, ${e(GROUP_BRAND_ROLLOUT_COPY)}. Everything stays in this browser; nothing is transmitted.</p>
          <form class="account-form" data-group-settings-form data-group-id="${e(group.id)}">
            <fieldset class="field">
              <legend>Where this group meets</legend>
              <div class="field">
                <label for="group-settings-location">Physical location</label>
                <input type="text" id="group-settings-location" name="location" maxlength="120" value="${e(settings.location)}" placeholder="Stroudsburg, PA">
              </div>
              <label class="checkbox">
                <input type="checkbox" id="group-settings-online" name="online" ${settings.online ? 'checked' : ''}>
                <span>Online group with no physical location</span>
              </label>
              <p class="field-hint">When Online is checked, the group profile shows “Online” instead of an address.</p>
            </fieldset>
            <fieldset class="field">
              <legend>Alliances &amp; review board <span class="badge badge--amber">Phase 2</span></legend>
              <div class="field">
                <label for="group-alliances">Allied group IDs</label>
                <input type="text" id="group-alliances" name="alliances" maxlength="500" value="${e(settings.alliances.join(', '))}" placeholder="group-id-one, group-id-two">
                <p class="field-hint">${e(ALLIANCE_COPY)} Separate allied group IDs with commas. The groups decide whether to accept the alliance, and working members vote on alliance terms and guidelines; members of allied groups may vote on this group’s review board cases.</p>
              </div>
              <label class="checkbox">
                <input type="checkbox" id="group-review-open-alliance" name="reviewOpenToAlliance" ${settings.reviewBoard.openToAlliance ? 'checked' : ''}>
                <span>Open this group’s review board votes to allied groups</span>
              </label>
              <p class="field-hint">Closing this requires a group vote by working members and only applies to alliances outside this group’s ZIP code. Allied groups within the ZIP code are always included. ${e(settings.reviewBoard.optOutOutcome ? `Recorded outcome: ${settings.reviewBoard.optOutOutcome}.` : '')}</p>
            </fieldset>
            <fieldset class="field">
              <legend>Group business <span class="badge badge--amber">Phase 2</span></legend>
              <label class="checkbox">
                <input type="checkbox" id="group-business-enabled" name="businessEnabled" ${business.enabled ? 'checked' : ''}>
                <span>Offer this group as a business with its own brand</span>
              </label>
              <div id="group-business-fields" ${business.enabled ? '' : 'hidden'}>
                <div class="field">
                  <label for="group-brand-name">Brand name</label>
                  <input type="text" id="group-brand-name" name="brandName" maxlength="80" value="${e(business.brandName)}" placeholder="e.g., Stroudsburg Repair Guild">
                </div>
                <div class="field">
                  <label for="group-brand-choice">Brand</label>
                  <select id="group-brand-choice" name="brandChoice">
                    <option value="group" ${business.brandChoice === 'group' ? 'selected' : ''}>Our own group brand</option>
                    <option value="unbought" ${business.brandChoice === 'unbought' ? 'selected' : ''}>Use the Unbought Brand</option>
                  </select>
                  <p class="field-hint">The Unbought Brand is optional. If you choose it, the Unbought legal guild and administrative guild will work with you to ensure safety.</p>
                </div>
                <div class="field">
                  <label for="group-brand-offerings">Related services and products</label>
                  <input type="text" id="group-brand-offerings" name="offerings" maxlength="500" value="${e(business.offerings)}" placeholder="Bike repair, tutoring, seed starting">
                  <p class="field-hint">Separate each offer with a comma. This is the collection that makes up the group brand.</p>
                </div>
                <div class="field">
                  <label for="group-brand-description">Description</label>
                  <textarea id="group-brand-description" name="description" rows="3" maxlength="500" placeholder="What this group makes or does together…">${e(business.description)}</textarea>
                </div>
                <fieldset class="field group-coop-fields">
                  <legend>Co-op legal information <span class="optional">(optional)</span></legend>
                  <p class="field-hint">You are welcome to form a co-op legally and record its details here. Unbought does not form or register co-ops in this prototype.</p>
                  <div class="field">
                    <label for="group-coop-legal-name">Legal name</label>
                    <input type="text" id="group-coop-legal-name" name="coopLegalName" maxlength="120" value="${e(business.coop.legalName)}">
                  </div>
                  <div class="form-row">
                    <div class="field">
                      <label for="group-coop-entity-type">Entity type</label>
                      <input type="text" id="group-coop-entity-type" name="coopEntityType" maxlength="80" value="${e(business.coop.entityType)}" placeholder="e.g., Worker cooperative">
                    </div>
                    <div class="field">
                      <label for="group-coop-registration">Registration number</label>
                      <input type="text" id="group-coop-registration" name="coopRegistration" maxlength="80" value="${e(business.coop.registration)}">
                    </div>
                  </div>
                  <div class="field">
                    <label for="group-coop-notes">Notes</label>
                    <textarea id="group-coop-notes" name="coopNotes" rows="2" maxlength="500">${e(business.coop.notes)}</textarea>
                  </div>
                </fieldset>
              </div>
            </fieldset>
            <div class="account-form-actions">
              <button type="submit" class="button button--primary button--small">Save group settings locally</button>
              <button type="button" class="button button--ghost button--small" data-dialog-close>Cancel</button>
            </div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-dialog-close]').forEach((button) => {
      button.addEventListener('click', () => closeDialog(dialog));
    });
    const enabled = dialog.querySelector('#group-business-enabled');
    const fields = dialog.querySelector('#group-business-fields');
    if (enabled && fields) {
      enabled.addEventListener('change', () => { fields.hidden = !enabled.checked; });
    }
    openDialog(dialog);
  }

  function initGroupSettings() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-group-settings]');
      if (!button) return;
      event.preventDefault();
      if (SITE_PHASE < 2) return;
      openGroupSettingsDialog(button.dataset.groupSettings);
    });
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.matches('[data-group-settings-form]')) return;
      event.preventDefault();
      if (SITE_PHASE < 2 || !requireMembership() || !form.reportValidity()) return;
      const group = getGroupById(form.dataset.groupId);
      if (!group || !isGroupAdmin(group, state.pledge.memberId)) {
        showToast('Only a current admin can change group settings.', false);
        return;
      }
      const data = new FormData(form);
      const current = normalizeGroupSettings(group.settings);
      const enabled = Boolean(data.get('businessEnabled'));
      group.settings = {
        location: cleanString(data.get('location'), 120),
        online: Boolean(data.get('online')),
        alliances: cleanString(data.get('alliances'), 500).split(',').map((id) => cleanString(id, 120)).filter(Boolean).slice(0, 50),
        reviewBoard: {
          openToAlliance: Boolean(data.get('reviewOpenToAlliance')),
          optOutOutcome: current.reviewBoard.optOutOutcome,
          optOutAt: current.reviewBoard.optOutAt
        },
        business: {
          enabled,
          brandName: cleanString(data.get('brandName'), 80),
          brandChoice: data.get('brandChoice') === 'unbought' ? 'unbought' : 'group',
          description: cleanString(data.get('description'), 500),
          offerings: cleanString(data.get('offerings'), 500),
          coop: {
            legalName: cleanString(data.get('coopLegalName'), 120),
            entityType: cleanString(data.get('coopEntityType'), 80),
            registration: cleanString(data.get('coopRegistration'), 80),
            notes: cleanString(data.get('coopNotes'), 500)
          },
          createdAt: current.business.enabled ? current.business.createdAt : new Date().toISOString()
        }
      };
      saveState();
      const dialog = form.closest('dialog');
      if (dialog) closeDialog(dialog);
      addNotification('groupSettings', `Group settings updated: ${groupDisplayLabel(group)}`,
        'Recorded locally by a current admin. Nothing was transmitted.',
        { tab: 'social', sourceId: group.id });
      renderGroupProfile();
      announce('Group settings saved locally.');
      showToast(enabled ? 'Group brand saved locally.' : 'Group settings saved locally.', false);
    });
  }

  function renderSharedMemberViews() {
    renderMemberAccount();
    renderProfile();
    renderGroupProfile();
    renderVolunteerAccess();
    // The dashboard's account panel shows confirmed hours, which change when
    // an exchange is logged or a review vote resolves it.
    renderAccountInfo();
  }

  function getExchangeType(request) {
    const listing = findListing(request && request.listingId);
    const pillar = (request && request.pillar) || (listing ? listing.pillar : '');
    return pillar === 'goods' ? 'product' : 'service';
  }

  const HOUR_REVIEWER_COUNT = 3;

  // Hours are never typed into a counter. Both sides choose the same agreed
  // time from fixed options; a disagreement is resolved by choosing one of
  // those confirmed options in a three-member review.
  const HOUR_CHOICES = [0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8];

  function hourChoiceLabel(value) {
    const hours = cleanHours(value);
    if (!hours) return 'Choose agreed time';
    if (hours === 1) return '1 hour';
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    return `${hours} hours`;
  }

  function hourChoiceOptions(values, selected, placeholder) {
    const e = escapeHtml;
    const options = (Array.isArray(values) ? values : HOUR_CHOICES)
      .map(cleanHours)
      .filter((value) => value > 0)
      .filter((value, index, list) => list.indexOf(value) === index)
      .sort((a, b) => a - b);
    return `<option value="">${e(placeholder || 'Choose agreed time')}</option>`
      + options.map((value) => `<option value="${e(value)}"${cleanHours(selected) === value ? ' selected' : ''}>${e(hourChoiceLabel(value))}</option>`).join('');
  }

  // A request has two sides: the member who received it and the member who
  // provided it. Only those two may confirm the work and the hours.
  function requestRole(request) {
    if (!isMember() || !request) return 'none';
    const id = state.pledge.memberId;
    if (request.memberId === id) return 'receiver';
    if (request.workerId === id) return 'worker';
    const listing = findListing(request.listingId);
    if (listing && listing.isUser && listing.memberId === id) return 'worker';
    return 'none';
  }

  function workerIdFor(request) {
    if (!request) return '';
    if (request.workerId) return request.workerId;
    const listing = findListing(request.listingId);
    return listing && listing.isUser ? cleanString(listing.memberId, 100) : '';
  }

  // Reviewers are drawn from active neighbors who are not parties to the
  // exchange. They need to see the dispute in their own Exchanges panel.
  function isHourReviewer(request) {
    if (!isMember() || !request || requestRole(request) !== 'none') return false;
    const panel = request.review && Array.isArray(request.review.panel) && request.review.panel.length
      ? request.review.panel
      : getEligibleHourReviewers(request);
    return panel.some((seat) => seat && seat.memberId === state.pledge.memberId);
  }

  function getHourState(request) {
    if (!request) return 'pending';
    if (cleanHours(request.loggedHours) > 0) return 'logged';
    const worker = cleanHours(request.workerHours);
    const receiver = cleanHours(request.receiverHours);
    const both = Boolean(request.workerConfirmedAt && request.receiverConfirmedAt && worker > 0 && receiver > 0);
    if (!both) return 'pending';
    if (Math.abs(worker - receiver) < 0.001) return 'agreed';
    if (cleanHours(request.review && request.review.resolvedHours) > 0) return 'resolved';
    return 'disputed';
  }

  // Three randomly drawn active members decide a disputed hour count. Care
  // circle members, students, observers, and either party are never eligible.
  function getEligibleHourReviewers(request) {
    const excluded = new Set([request && request.memberId, workerIdFor(request)].filter(Boolean));
    const blocked = ['student', 'care', 'observer', 'limited', 'exiled', 'inactive', 'observe_only'];
    const pool = getMemberRoster().filter((entry) => {
      if (!entry || !entry.memberId || excluded.has(entry.memberId)) return false;
      const standing = cleanString(entry.standing, 30).toLowerCase();
      const track = cleanString(entry.track, 30).toLowerCase();
      return !blocked.includes(standing) && !blocked.includes(track) && track !== 'apprentice';
    });
    const seed = String(request && request.id || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return pool
      .map((entry, index) => ({ entry, order: ((seed + 1) * (index + 7) * 2654435761) >>> 0 }))
      .sort((a, b) => a.order - b.order)
      .slice(0, HOUR_REVIEWER_COUNT)
      .map((item) => ({
        memberId: item.entry.memberId,
        name: cleanString(item.entry.name, 60) || cleanString(item.entry.profession, 60) || 'Neighbor'
      }));
  }

  function ensureHourReview(request) {
    if (!request || typeof request !== 'object') return null;
    if (!request.review || typeof request.review !== 'object') {
      request.review = { panel: [], votes: [], resolvedHours: 0, resolvedAt: '' };
    }
    if (!Array.isArray(request.review.panel) || !request.review.panel.length) {
      request.review.panel = getEligibleHourReviewers(request);
    }
    if (!Array.isArray(request.review.votes)) request.review.votes = [];
    return request.review;
  }

  function pickMajorityHours(values) {
    const valid = values.filter((value) => Number.isFinite(Number(value)) && Number(value) > 0).map(Number);
    if (!valid.length) return 0;
    const counts = {};
    valid.forEach((value) => { counts[value] = (counts[value] || 0) + 1; });
    return Object.keys(counts).map(Number).sort((a, b) => a - b)
      .reduce((best, value) => (counts[value] > counts[best] ? value : best));
  }

  function logMutualHours(request, hours, source) {
    const amount = cleanHours(hours);
    if (!(amount > 0) || cleanHours(request.loggedHours) > 0) return false;
    const workerId = workerIdFor(request);
    const listing = findListing(request.listingId);
    const rosterMember = getMemberRoster().find((m) => m && m.memberId === workerId);
    const member = workerId === state.pledge.memberId ? state.pledge : rosterMember;
    const profession = cleanString((member && member.profession)
      || (listing && listing.category) || 'Commons work', 80);
    const zip = normalizeZip((member && member.zip)
      || (member && zipFromAddress(member.mailingAddress))
      || (state.pledge && state.pledge.zip));
    const entry = {
      id: makeId('contribution'),
      memberId: workerId,
      type: 'labor',
      amount: 0,
      hours: amount,
      profession,
      stateRegion: zip,
      hourlyRate: 0,
      stockValue: 0,
      sourceId: request.id,
      note: `${getExchangeType(request) === 'product' ? 'Product' : 'Service'} confirmed by worker and receiver${source === 'review' ? ' · three-member review vote' : ''}: ${cleanString(request.listingTitle, 80)}`,
      createdAt: new Date().toISOString(),
      status: 'recorded',
      mutualConfirmation: true,
      fund: ''
    };
    state.contributions = Array.isArray(state.contributions) ? state.contributions : [];
    state.contributions.unshift(entry);
    state.contributions = state.contributions.slice(0, 200);
    request.loggedHours = amount;
    request.logSource = source;
    request.loggedAt = entry.createdAt;
    request.status = getExchangeType(request) === 'product' ? 'product_delivered' : 'service_completed';
    request.confirmedAt = entry.createdAt;
    return true;
  }

  function finalizeHourReview(request) {
    const review = request.review;
    if (!review || !Array.isArray(review.panel) || !Array.isArray(review.votes)) return false;
    if (review.panel.length < HOUR_REVIEWER_COUNT || review.votes.length < HOUR_REVIEWER_COUNT) return false;
    const hours = pickMajorityHours(review.votes.map((vote) => vote.hours));
    if (!(hours > 0)) return false;
    review.resolvedHours = hours;
    review.resolvedAt = new Date().toISOString();
    return logMutualHours(request, hours, 'review');
  }

  function renderExchanges() {
    const panel = document.getElementById('exchanges-panel');
    if (!panel || !isMember()) return;
    const e = escapeHtml;
    const requests = (Array.isArray(state.requests) ? state.requests : [])
      .filter((request) => request && request.type === 'mutual_aid_request'
        && (requestRole(request) !== 'none' || isHourReviewer(request)))
      .slice(0, 30);
    const byState = (stateName) => requests.filter((request) => getHourState(request) === stateName);
    const pending = byState('pending');
    const agreed = requests.filter((request) => ['agreed', 'logged', 'resolved'].includes(getHourState(request)));
    const logged = requests.filter((request) => ['logged', 'resolved'].includes(getHourState(request)));
    const disputed = byState('disputed');

    const roleLabel = (role) => role === 'worker' ? 'You provided this' : 'You received this';

    const sideMarkup = (request, role) => {
      const hoursKey = role === 'worker' ? 'workerHours' : 'receiverHours';
      const atKey = role === 'worker' ? 'workerConfirmedAt' : 'receiverConfirmedAt';
      const sideLabel = requestRole(request) === role ? roleLabel(role) : (role === 'worker' ? 'Worker' : 'Receiver');
      if (request[atKey]) {
        return `<span class="badge badge--green">${e(sideLabel)} · ${e(cleanHours(request[hoursKey]))} hr confirmed ${e(formatDate(request[atKey]))}</span>`;
      }
      if (requestRole(request) !== role) {
        return `<span class="badge badge--soft">${e(sideLabel)} · waiting for confirmation</span>`;
      }
      return `<form class="exchange-confirm" data-confirm-hours data-id="${e(request.id)}" data-role="${e(role)}">
        <label for="hours-${e(role)}-${e(domId(request.id))}">${e(roleLabel(role))} · agreed time</label>
        <select id="hours-${e(role)}-${e(domId(request.id))}" name="hours" required>${hourChoiceOptions(HOUR_CHOICES, request[hoursKey], 'Choose agreed time')}</select>
        <p class="field-hint">No one can log hours alone. Matching confirmations record the time.</p>
        <button class="button button--outline button--small" type="submit">Confirm hours</button>
      </form>`;
    };

    const evidenceMarkup = (request) => {
      const items = cleanEvidenceItems(request.evidence);
      if (!items.length) return '<p class="account-note">No evidence attached yet. Both sides may add local notes or images.</p>';
      return `<ul class="evidence-list">${items.map((item) => `<li class="evidence-item">
        ${item.kind === 'image' && item.dataUrl ? `<img class="evidence-thumb" src="${item.dataUrl}" alt="Preview of ${e(item.name)}">` : ''}
        <strong>${e(item.name)}</strong>
        <span class="contribution-meta">${e(item.caption || (item.kind === 'image' ? 'Image' : item.kind === 'text' ? 'Text' : 'File details'))}${item.submittedBy ? ` · ${e(item.submittedBy)}` : ''}</span>
      </li>`).join('')}</ul>`;
    };

    const reviewMarkup = (request) => {
      const review = request.review && typeof request.review === 'object' ? request.review : {};
      const panel = Array.isArray(review.panel) && review.panel.length ? review.panel : getEligibleHourReviewers(request);
      const votes = Array.isArray(review.votes) ? review.votes : [];
      const role = requestRole(request);
      const mySeat = panel.find((seat) => seat.memberId === state.pledge.memberId);
      const alreadyVoted = hasAnonymousVote(`hours:${request.id}`);
      const seats = Array.from({ length: HOUR_REVIEWER_COUNT }, (_, index) => {
        const seat = panel[index];
        const vote = votes.find((item) => item.seatIndex === index) || votes[index];
        return `<li class="review-seat"><strong>Review seat ${index + 1}${seat ? ' · filled' : ' · pending'}</strong>
          <span class="contribution-meta">${vote ? `${e(vote.hours)} hr · ${e(vote.reason || 'No reason given')} · anonymous` : 'Not voted yet'}</span></li>`;
      }).join('');
      return `<div class="hour-review">
        <p class="account-note">The confirmed times differ, so three randomly drawn active members choose one of those times. Care circle, students, observers, and either party are excluded. Votes are anonymous: ballots show only the chosen time and reason, never the reviewer’s name. In this browser-only prototype the draw uses locally stored eligible neighbors; a live system would fill all three seats.</p>
        <ul class="review-seats">${seats}</ul>
        ${panel.length < HOUR_REVIEWER_COUNT ? `<p class="field-hint">Only ${panel.length} eligible neighbor${panel.length === 1 ? '' : 's'} in this browser. The remaining ${HOUR_REVIEWER_COUNT - panel.length} seat${HOUR_REVIEWER_COUNT - panel.length === 1 ? '' : 's'} wait for a live draw.</p>` : ''}
        ${mySeat && role === 'none' && !alreadyVoted ? `<form class="account-form hour-vote-form" data-hour-vote data-id="${e(request.id)}">
          <div class="form-grid">
            <div class="field"><label for="vote-hours-${e(domId(request.id))}">Confirmed time to log</label>
              <select id="vote-hours-${e(domId(request.id))}" name="hours" required>${hourChoiceOptions([request.workerHours, request.receiverHours], '', 'Choose a confirmed time')}</select></div>
            <div class="field"><label for="vote-reason-${e(domId(request.id))}">Why</label>
              <input type="text" id="vote-reason-${e(domId(request.id))}" name="reason" maxlength="240" required></div>
          </div>
          <button class="button button--primary button--small" type="submit">Cast review vote</button>
        </form>` : ''}
        ${role !== 'none' ? '<p class="field-hint">You are a party to this exchange and cannot vote on it.</p>' : ''}
        ${alreadyVoted && mySeat ? '<p class="field-hint">Your anonymous vote is recorded above.</p>' : ''}
      </div>`;
    };

    const itemMarkup = (request) => {
      const stateName = getHourState(request);
      const role = requestRole(request);
      const type = getExchangeType(request);
      const badge = stateName === 'logged' || stateName === 'resolved'
        ? `<span class="badge badge--green">${e(cleanHours(request.loggedHours))} hr logged</span>`
        : stateName === 'disputed'
          ? '<span class="badge badge--amber">Hours differ · in review</span>'
          : `<span class="badge badge--soft">${e(roleLabel(role))}</span>`;
      const bothSides = (['worker', 'receiver'].map((side) => sideMarkup(request, side)).join(''));
      const dispute = stateName === 'disputed' || stateName === 'resolved' ? `<div class="hour-dispute">
        <p class="contribution-meta">Worker ${e(cleanHours(request.workerHours))} hr · receiver ${e(cleanHours(request.receiverHours))} hr</p>
        ${evidenceMarkup(request)}
        <form class="account-form hour-evidence-form" data-hour-evidence data-id="${e(request.id)}">
          <label for="evidence-note-${e(domId(request.id))}">Add an evidence note</label>
          <input type="text" id="evidence-note-${e(domId(request.id))}" name="note" maxlength="200" placeholder="Times, messages, or receipts (stored locally)">
          <button class="button button--ghost button--small" type="submit">Attach note</button>
        </form>
        ${reviewMarkup(request)}
      </div>` : '';
      return `<li class="exchange-item exchange-item--hours">
        <div class="exchange-copy">
          <strong>${e(request.listingTitle || 'Commons request')}</strong>
          <span class="contribution-meta">${e(type === 'product' ? 'Product' : 'Service')} · ${role === 'worker' ? `for ${e(request.memberName || 'a neighbor')}` : `offered by ${e(request.provider || 'a neighbor')}`} · requested ${e(formatDate(request.requestedAt))}</span>
        </div>
        ${badge}
        ${['pending', 'agreed'].includes(stateName) ? `<div class="exchange-sides">${bothSides}</div>` : ''}
        ${dispute}
      </li>`;
    };

    panel.innerHTML = `<section class="account-card">
      <p class="eyebrow">Exchanges</p>
      <h3>Confirm the work and the agreed time</h3>
      <p class="account-note">No one can add hours unilaterally. The worker and the receiver each choose the same agreed time from fixed options; matching confirmations log it. If the choices differ, evidence goes to a three-member review, and the reviewers choose one of the confirmed times. Nothing is typed into an hours counter. This is stored in this browser only.</p>
      <div class="account-block">
        <h4>Awaiting mutual confirmation</h4>
        ${pending.length ? `<ul class="exchange-list">${pending.map(itemMarkup).join('')}</ul>` : '<p class="account-note">No exchanges are waiting for confirmation.</p>'}
      </div>
      <div class="account-block">
        <h4>Hours agreed or logged</h4>
        ${agreed.length ? `<ul class="exchange-list">${agreed.map(itemMarkup).join('')}</ul>` : '<p class="account-note">Nothing confirmed yet. The thank-you note appears after the first logged exchange.</p>'}
      </div>
      <div class="account-block">
        <h4>Disagreements in review</h4>
        ${disputed.length ? `<ul class="exchange-list">${disputed.map(itemMarkup).join('')}</ul>` : '<p class="account-note">No hour disagreements are under review.</p>'}
      </div>
      ${logged.length ? `<div class="donate-nudge donate-nudge--dashboard">
        <span class="donate-nudge-icon" aria-hidden="true"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-heart"></use></svg></span>
        <div>
          <p><strong>A small way to say thanks.</strong> If you have received goods or services you would have otherwise paid for, consider leaving a small donation. Every bit helps to fund this initiative.</p>
          <a class="button button--amber button--small" href="donate.html">Read the fund plan <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></a>
          <p class="account-note">Giving is not open yet. The fund plan explains the bank account and legal steps.</p>
        </div>
      </div>` : ''}
    </section>`;
  }

  function renderCommons() {
    const panel = document.getElementById('commons-panel');
    if (!panel || !isMember()) return;
    const e = escapeHtml;
    const posts = (Array.isArray(state.listings) ? state.listings : [])
      .filter((item) => item && item.memberId === state.pledge.memberId).slice(0, 6);
    const channels = Array.isArray(state.communityChannels) && state.communityChannels.length
      ? state.communityChannels
      : defaultCommunityChannels();
    const threads = Array.isArray(state.communityThreads) ? state.communityThreads : [];
    const chats = Array.isArray(state.chats) ? state.chats : [];

    const chatMessageMarkup = (chat) => {
      const photo = cleanPostPhotos(chat.picture)[0];
      const subject = communityChatSubject(chat);
      const channelName = communityChatChannelName(chat);
      return `<div class="chat-message community-chat-message">
        <p class="contribution-meta"><strong>${e(chat.name || 'Member')}</strong> · #${e(channelName)} · ${e(subject)} · ${e(formatDate(chat.createdAt) || 'Date not recorded')}${chat.nsfw ? ' · <span class="badge badge--nsfw">NSFW</span>' : ''}</p>
        ${photo ? `<img class="chat-picture" src="${e(safeProfileImageUrl(photo.dataUrl))}" alt="Local picture for ${e(subject)}">` : ''}
        <p class="chat-title">${e(subject)}</p>
        <p>${e(chat.body)}</p>
        <button class="button button--ghost button--tiny button--report" type="button" data-report-context data-report-area="Community chat" data-report-detail="${e(`#${channelName} · ${subject}`)}" data-report-name="${e(chat.name || 'Member')}" data-report-source-id="${e(chat.id)}" aria-label="Report a concern about a community chat message from ${e(chat.name || 'a member')}">Report</button>
      </div>`;
    };

    const threadMarkup = (thread, channel) => {
      const threadId = cleanString(thread.id, 100);
      const threadMessages = chats
        .filter((chat) => chat && cleanString(chat.threadId, 100) === threadId)
        .slice(-8);
      const threadFormId = `community-reply-${domId(threadId)}`;
      const subjectFieldId = `${threadFormId}-subject`;
      const bodyFieldId = `${threadFormId}-body`;
      const pictureFieldId = `${threadFormId}-picture`;
      return `<div class="community-thread">
        <h5>${e(thread.subject)}</h5>
        <p class="contribution-meta">Started by ${e(thread.createdBy || 'a member')} · ${e(formatDate(thread.createdAt) || 'Date not recorded')}</p>
        <div class="chat-list">${threadMessages.length
          ? threadMessages.map(chatMessageMarkup).join('')
          : '<p class="account-note">No replies yet.</p>'}</div>
        <form class="account-form community-form" data-community-reply-form data-thread-id="${e(threadId)}" data-channel-id="${e(channel.id)}">
          <div class="community-form-head"><strong>Reply in this thread</strong><span>Keep the subject with your reply.</span></div>
          <div class="form-row">
            <div class="field">
              <label for="${e(subjectFieldId)}">Subject</label>
              <input type="text" id="${e(subjectFieldId)}" name="subject" maxlength="120" required value="${e(thread.subject)}">
            </div>
            <div class="field">
              <label for="${e(bodyFieldId)}">Reply</label>
              <textarea id="${e(bodyFieldId)}" name="body" rows="2" maxlength="1200" required placeholder="Reply in this thread…"></textarea>
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="${e(pictureFieldId)}">Picture <span class="optional">(optional)</span></label>
              <input type="file" id="${e(pictureFieldId)}" name="picture" accept="image/jpeg,image/png,image/webp,image/gif">
            </div>
            <div class="field">
              <label class="checkbox"><input type="checkbox" name="nsfw" value="1"> <span>NSFW if unsuitable for minors</span></label>
            </div>
          </div>
          <button type="submit" class="button button--outline button--small">Reply in thread</button>
        </form>
      </div>`;
    };

    const channelMarkup = (channel, index) => {
      const channelId = cleanString(channel.id, 100);
      const channelName = cleanString(channel.name, 60) || 'general';
      const channelThreads = threads.filter((thread) => thread && cleanString(thread.channelId, 100) === channelId);
      const generalMessages = chats.filter((chat) => chat && !cleanString(chat.threadId, 100)
        && (cleanString(chat.channelId, 100) === channelId
          || (!cleanString(chat.channelId, 100) && communityChannelSlug(chat.channel) === communityChannelSlug(channelName))))
        .slice(-8);
      const threadFormId = `community-thread-${domId(channelId)}`;
      const subjectFieldId = `${threadFormId}-subject`;
      const bodyFieldId = `${threadFormId}-body`;
      const pictureFieldId = `${threadFormId}-picture`;
      const isOpen = index === 0 || channelThreads.length > 0;
      return `<details class="community-channel"${isOpen ? ' open' : ''}>
        <summary>
          <span class="community-channel-name"><span class="community-channel-hash" aria-hidden="true">#</span><strong>${e(channelName)}</strong></span>
          <span class="community-channel-summary">${channelThreads.length} thread${channelThreads.length === 1 ? '' : 's'} <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></span>
        </summary>
        ${channel.purpose ? `<p class="account-note">${e(channel.purpose)}</p>` : ''}
        <form class="account-form community-form" data-community-thread-form data-channel-id="${e(channelId)}">
          <div class="community-form-head"><strong>Start a thread</strong><span>Every message needs a subject.</span></div>
          <div class="form-row">
            <div class="field">
              <label for="${e(subjectFieldId)}">Thread subject</label>
              <input type="text" id="${e(subjectFieldId)}" name="subject" maxlength="120" required placeholder="What is this thread about?">
            </div>
            <div class="field">
              <label for="${e(bodyFieldId)}">Message</label>
              <textarea id="${e(bodyFieldId)}" name="body" rows="2" maxlength="1200" required placeholder="Start the conversation…"></textarea>
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="${e(pictureFieldId)}">Picture <span class="optional">(optional)</span></label>
              <input type="file" id="${e(pictureFieldId)}" name="picture" accept="image/jpeg,image/png,image/webp,image/gif">
            </div>
            <div class="field">
              <label class="checkbox"><input type="checkbox" name="nsfw" value="1"> <span>NSFW if unsuitable for minors</span></label>
            </div>
          </div>
          <button type="submit" class="button button--primary button--small">Start thread</button>
        </form>
        ${generalMessages.length ? `<div class="chat-list">${generalMessages.map(chatMessageMarkup).join('')}</div>` : ''}
        ${channelThreads.length ? channelThreads.map((thread) => threadMarkup(thread, channel)).join('') : '<p class="account-note">No threads in this channel yet. Start one above.</p>'}
      </details>`;
    };

    panel.innerHTML = `<div class="commons-workspace">
      <section class="account-card commons-intro-card" aria-labelledby="commons-title">
        <div class="commons-intro-head">
          <div>
            <p class="eyebrow">The Commons</p>
            <h3 id="commons-title">Everything you can take part in</h3>
          </div>
          <p class="commons-intro-copy">Pick a doorway from the menu, or use these shortcuts. Everything you write here stays in this browser; nothing is sent to other people.</p>
        </div>
        <nav class="commons-links" aria-label="Commons shortcuts">
          <a class="commons-link" href="freelabor.html">
            <span class="commons-link-icon" aria-hidden="true"><svg class="icon" focusable="false"><use href="#icon-hammer"></use></svg></span>
            <span class="commons-link-copy"><strong>Free Labor</strong><small>Offer or request skills and time.</small></span>
          </a>
          <a class="commons-link" href="freestuff.html">
            <span class="commons-link-icon" aria-hidden="true"><svg class="icon" focusable="false"><use href="#icon-basket"></use></svg></span>
            <span class="commons-link-copy"><strong>Free Stuff</strong><small>Share new, homemade, used, and repairable goods.</small></span>
          </a>
          <a class="commons-link" href="future.html#academy"${SITE_PHASE < 2 ? ' hidden' : ''}>
            <span class="commons-link-icon" aria-hidden="true"><svg class="icon" focusable="false"><use href="#icon-spark"></use></svg></span>
            <span class="commons-link-copy"><strong>Academy</strong><small>Learn from a neighbor. Build for the commons.</small></span>
          </a>
          <a class="commons-link" href="donate.html">
            <span class="commons-link-icon" aria-hidden="true"><svg class="icon" focusable="false"><use href="#icon-heart"></use></svg></span>
            <span class="commons-link-copy"><strong>Donations</strong><small>Read the fund plan. Giving is not open yet.</small></span>
          </a>
        </nav>
      </section>

      <div class="commons-grid">
        <section class="account-card commons-activity-card" aria-labelledby="commons-postings-title">
          <div class="commons-card-head">
            <span class="badge badge--green">Your corner</span>
            <h3 id="commons-postings-title">Your postings</h3>
            <span class="commons-count">${posts.length}</span>
          </div>
          <p class="account-note">Offers you have saved in this browser appear here.</p>
          ${posts.length ? `<ul class="contribution-list">${posts.map((post) => `<li class="contribution-item"><strong>${e(post.title)}</strong><span class="contribution-meta">${e(formatDate(post.createdAt))} · ${e(post.provider || '')}</span></li>`).join('')}</ul>` : `<p class="account-note">You have not posted an offering in this browser yet.</p>`}
          <div class="commons-action-links"><a href="freelabor.html#post-trigger">Post free labor</a><a href="freestuff.html#post-trigger">Post free stuff</a></div>
        </section>

        <section class="account-card commons-chat-card" aria-labelledby="commons-chat-title">
          <div class="commons-card-head">
            <span class="badge badge--soft">Local conversation</span>
            <h3 id="commons-chat-title">Community chat</h3>
          </div>
          <p class="account-note">Create channels, then start threads inside them with a subject. Add a picture to any post and mark anything unsuitable for minors as NSFW. No porn and no prostitution. There are free websites that can serve you outside of Unbought.</p>
          <form class="account-form community-form" data-community-channel-form>
            <div class="community-form-head"><strong>Create a channel</strong><span>Keep each conversation easy to find.</span></div>
            <div class="form-row">
              <div class="field">
                <label for="community-channel-name">New channel</label>
                <input type="text" id="community-channel-name" name="name" maxlength="60" required placeholder="Channel name">
              </div>
              <div class="field">
                <label for="community-channel-purpose">Purpose <span class="optional">(optional)</span></label>
                <input type="text" id="community-channel-purpose" name="purpose" maxlength="200" placeholder="What belongs here?">
              </div>
            </div>
            <button type="submit" class="button button--outline button--small">Create channel</button>
          </form>
          <div class="community-channels">${channels.map(channelMarkup).join('')}</div>
        </section>
      </div>
    </div>`;
  }

  const MESSAGE_FOLDERS = {
    inbox: 'Inbox',
    sent: 'Sent',
    archive: 'Archive',
    trash: 'Trash',
    starred: 'Starred'
  };
  let activeMessageFolder = 'inbox';

  function messageFolder(message) {
    if (message && hasOwn(MESSAGE_FOLDERS, message.folder)) return message.folder;
    return message && message.toName ? 'sent' : 'inbox';
  }

  function renderMessages() {
    const panel = document.getElementById('messages-panel');
    if (!panel || !isMember()) return;
    const e = escapeHtml;
    const messages = (Array.isArray(state.messages) ? state.messages : []).slice().reverse();
    const counts = {
      inbox: messages.filter((message) => messageFolder(message) === 'inbox').length,
      sent: messages.filter((message) => messageFolder(message) === 'sent').length,
      archive: messages.filter((message) => messageFolder(message) === 'archive').length,
      trash: messages.filter((message) => messageFolder(message) === 'trash').length,
      starred: messages.filter((message) => message.starred && messageFolder(message) !== 'trash').length
    };
    const visible = activeMessageFolder === 'starred'
      ? messages.filter((message) => message.starred && messageFolder(message) !== 'trash')
      : messages.filter((message) => messageFolder(message) === activeMessageFolder);
    const emptyCopy = {
      inbox: 'No incoming messages in this local prototype. Messages you record appear in Sent.',
      sent: 'No messages recorded yet.',
      archive: 'No archived messages.',
      trash: 'Trash is empty.',
      starred: 'No starred messages.'
    };
    const folderButtons = Object.entries(MESSAGE_FOLDERS).map(([key, label]) => `<button
      class="mailbox-tab" type="button" role="tab" data-message-folder="${key}"
      aria-selected="${key === activeMessageFolder}">${label} <span class="mailbox-count">${counts[key]}</span></button>`).join('');

    panel.innerHTML = `<section class="account-card">
      <nav class="mailbox-tabs" role="tablist" aria-label="Message folders">${folderButtons}</nav>
      <p class="eyebrow">Messaging</p>
      <h3>Your messages</h3>
      <p class="account-note">Consent-based requests and replies would gather here in a live system. In this prototype, folders, stars, and messages stay on this device; nothing is sent.</p>
      ${visible.length ? `<ul class="contribution-list">${visible.map((message) => {
        const folder = messageFolder(message);
        const actions = [
          `<button class="button button--ghost button--tiny" type="button" data-message-action="star" data-message-id="${e(message.id)}" aria-label="${message.starred ? 'Remove star from' : 'Star'} this message">${message.starred ? 'Unstar' : 'Star'}</button>`,
          folder === 'archive' || folder === 'trash' ? '' : `<button class="button button--ghost button--tiny" type="button" data-message-action="archive" data-message-id="${e(message.id)}" aria-label="Archive this message">Archive</button>`,
          folder === 'trash' ? `<button class="button button--ghost button--tiny" type="button" data-message-action="restore" data-message-id="${e(message.id)}" aria-label="Restore this message">Restore</button>` : `<button class="button button--ghost button--tiny" type="button" data-message-action="trash" data-message-id="${e(message.id)}" aria-label="Move this message to trash">Trash</button>`,
          message.toName ? `<button class="button button--ghost button--small button--report" type="button" data-report-context data-report-area="Dashboard messages" data-report-detail="Message to ${e(message.toName)}" data-report-name="${e(message.toName)}" data-report-source-id="${e(message.id)}" aria-label="Report a concern about the message to ${e(message.toName)}">Report</button>` : ''
        ].filter(Boolean).join('');
        return `<li class="contribution-item">
          <strong>${e(message.name)}${message.toName ? ` → ${e(message.toName)}` : ''}</strong>
          <span>${e(message.body)}</span>
          <span class="contribution-meta">${e(formatDate(message.createdAt))} · ${e(message.status || 'recorded')}${message.starred ? ' · Starred' : ''}</span>
          <span class="message-actions">${actions}</span>
        </li>`;
      }).join('')}</ul>` : `<p class="account-note">${e(emptyCopy[activeMessageFolder])}</p>`}
      <form class="account-form" data-message-form>
        <div class="field">
          <label for="message-to">To (chosen name)</label>
          <input type="text" id="message-to" name="toName" maxlength="80" required placeholder="Neighbor's chosen name">
        </div>
        <div class="field">
          <label for="message-body">Message</label>
          <textarea id="message-body" name="body" rows="3" maxlength="1200" required placeholder="Write a consent-based message…"></textarea>
        </div>
        <button type="submit" class="button button--primary button--small">Record message</button>
      </form>
    </section>`;
  }

  function notificationTarget(item) {
    const tab = cleanString(item && item.tab, 30);
    if (tab) return { tab, href: `dashboard.html#${encodeURIComponent(tab)}` };
    if (item && (item.type === 'groupPost' || item.type === 'groupComment')) {
      const groupId = cleanString(item.sourceId, 100);
      if (groupId) return { tab: '', href: groupProfileUrl(groupId) };
    }
    if (item && item.type === 'comment') {
      const sourceId = cleanString(item.sourceId, 100);
      const listing = getAllListings().find((entry) => entry && cleanThreadComments(getListingComments(entry))
        .some((comment) => comment.id === sourceId));
      if (listing) {
        const page = listing.pillar === 'goods' ? 'freestuff.html' : 'freelabor.html';
        return { tab: '', href: `${page}#listing-${domId(listing.id)}` };
      }
    }
    return { tab: 'notifications', href: 'dashboard.html#notifications' };
  }

  function renderNotifications() {
    const panel = document.getElementById('notifications-panel');
    if (!panel || !isMember()) return;
    const e = escapeHtml;
    const items = (Array.isArray(state.notifications) ? state.notifications : []).slice(0, 50);
    const unread = unreadNotificationCount();
    updateHeaderNotificationBadge();

    panel.innerHTML = `<section class="account-card">
      <p class="eyebrow">Activity</p>
      <h3>Notifications</h3>
      <p class="account-note">Local drafts only. These notices are created by your own actions here; nothing is delivered to another person or device. Click a whole notice to mark it read and open where it happened.</p>
      <div class="notification-summary">
        <strong>${unread} unread</strong>
        <button class="button button--ghost button--small" type="button" data-mark-notifications ${unread ? '' : 'disabled'}>Mark all read</button>
      </div>
      ${items.length ? `<ul class="notification-list">${items.map((item) => {
        const target = notificationTarget(item);
        return `<li class="notification-item ${item.read ? '' : 'is-unread'}" data-notification-link data-notification-id="${e(item.id)}" data-notification-href="${e(target.href)}" ${target.tab ? `data-notification-tab="${e(target.tab)}"` : ''} role="link" tabindex="0" aria-label="Open this notice and mark it read: ${e(item.title)}">
          <div>
            <p class="contribution-meta"><strong>${renderNotificationTitle(item)}</strong> · ${e(formatDate(item.createdAt))}</p>
            <p>${e(item.body)}</p>
          </div>
          <span class="notification-open">Open <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></span>
        </li>`;
      }).join('')}</ul>` : '<p class="account-note">No local notifications yet. Messages, requests, and comments you record will appear here.</p>'}
    </section>`;
  }

  // Town groups are capped at 150 people. When one fills, the next group keeps
  // the town name and gains a Roman numeral (II, III, ... XI). The first group
  // is implicitly I; overflow groups do not create seed members.
  function romanToInt(value) {
    const text = cleanString(value, 12).toUpperCase();
    if (!/^[IVXLCDM]+$/.test(text)) return 1;
    const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let total = 0;
    for (let index = 0; index < text.length; index += 1) {
      const current = values[text[index]];
      const next = values[text[index + 1]] || 0;
      total += current < next ? -current : current;
    }
    return total > 0 ? total : 1;
  }

  function toRomanNumeral(value) {
    let remaining = Math.max(1, Math.floor(Number(value) || 1));
    const pairs = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let text = '';
    pairs.forEach(([amount, numeral]) => {
      while (remaining >= amount) {
        text += numeral;
        remaining -= amount;
      }
    });
    return text;
  }

  function groupBaseName(group) {
    return cleanString(group && group.name, 120).replace(/\s+[IVXLCDM]+$/, '');
  }

  function groupRoman(group) {
    if (!group || group.kind !== 'town') return '';
    const stored = cleanString(group.roman, 12).toUpperCase();
    if (/^[IVXLCDM]+$/.test(stored)) return stored;
    const match = cleanString(group.name, 120).match(/\s+([IVXLCDM]+)$/);
    return match ? match[1].toUpperCase() : 'I';
  }

  function groupOrdinal(group) {
    const stored = Number(group && group.ordinal);
    return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : romanToInt(groupRoman(group));
  }

  function groupDisplayLabel(group) {
    if (!group) return 'Group';
    if (group.kind !== 'town') return cleanString(group.name, 120) || 'Group';
    return `${groupBaseName(group)} ${groupRoman(group)}`.trim();
  }

  function nextTownRoman(baseName) {
    const base = cleanString(baseName, 120).replace(/\s+[IVXLCDM]+$/, '');
    let highest = 0;
    (Array.isArray(state.groups) ? state.groups : []).forEach((group) => {
      if (!group || group.kind !== 'town' || groupBaseName(group) !== base) return;
      highest = Math.max(highest, groupOrdinal(group));
    });
    return toRomanNumeral(highest + 1);
  }

  function townLocationLabel() {
    const m = state.pledge;
    if (!m) return '';
    const parsed = parseCityState(m.cityState) || parseCityState(m.mailingAddress);
    const city = safeCity(m.city) || (parsed ? safeCity(parsed.split(',')[0]) : '') || safeCity(m.location);
    const stateCode = normalizeStateCode(m.state) || (parsed && parsed.includes(',') ? parsed.split(',')[1].trim() : '');
    const zip = normalizeZip(m.zip || zipFromAddress(m.mailingAddress));
    if (!city && !stateCode && !zip) return '';
    return `${[city, stateCode].filter(Boolean).join(', ')}${zip ? ` ${zip}` : ''}`;
  }

  function getAvailableTownGroups() {
    const joinedIds = new Set(getMemberGroups().map((group) => group && group.id));
    return (Array.isArray(state.groups) ? state.groups : [])
      .filter((group) => group && group.kind === 'town' && !group.left && !joinedIds.has(group.id))
      .map(normalizeGroup)
      .sort((a, b) => groupOrdinal(a) - groupOrdinal(b));
  }

  function townGroupName() {
    const m = state.pledge;
    if (!m) return '';
    const address = m.publicAddressSource === 'physical' ? m.physicalAddress : m.mailingAddress;
    const place = parseCityState(address) || parseCityState(m.location) || safeCity(m.location)
      || safeCity(m.physicalAddress) || safeCity(m.mailingAddress);
    return place ? `${place.split(',')[0].trim()} Group` : '';
  }

  function syncTownGroup() {
    if (!isMember()) return;
    const name = townGroupName();
    if (!name) return;
    state.groups = Array.isArray(state.groups) ? state.groups : [];
    const selfEntry = { memberId: state.pledge.memberId, name: state.pledge.name || 'You' };
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const towns = state.groups.filter((group) => group && group.kind === 'town' && !group.left);
    const town = towns[0];
    if (!town) {
      state.groups.unshift({
        id: `town-${slug || 'main'}`,
        kind: 'town',
        name,
        baseName: name,
        roman: 'I',
        ordinal: 1,
        overflow: false,
        seedEligible: true,
        purpose: 'Your main local group. Everyone in your town belongs here; other groups are social or support circles.',
        members: [selfEntry],
        memberCount: 1,
        admins: [selfEntry.memberId],
        createdAt: new Date().toISOString()
      });
    } else {
      if (town.name !== name) {
        town.name = name;
        town.baseName = name;
      }
      if (!cleanString(town.roman, 12)) {
        town.roman = 'I';
        town.ordinal = 1;
        town.overflow = false;
        town.seedEligible = true;
      }
      let last = towns[towns.length - 1];
      while (last && normalizeGroup(last).members.length >= SOCIAL_LIMITS.groupMembers) {
        const roman = nextTownRoman(name);
        const overflow = {
          id: `town-${slug || 'main'}-${roman.toLowerCase()}`,
          kind: 'town',
          name: `${name} ${roman}`,
          baseName: name,
          roman,
          ordinal: romanToInt(roman),
          overflow: true,
          seedEligible: false,
          purpose: `Opened because ${groupDisplayLabel(last)} reached ${SOCIAL_LIMITS.groupMembers} people. Neighbors in this area can choose which numbered group to join. Seed and other membership badges stay with the member's sign-up record, not the group.`,
          members: [],
          memberCount: 0,
          admins: [],
          createdAt: new Date().toISOString()
        };
        state.groups.push(overflow);
        addNotification('social', `Town group opened: ${overflow.name}`,
          `Recorded locally when ${groupDisplayLabel(last)} reached ${SOCIAL_LIMITS.groupMembers} people. No invitations or membership changes were sent.`,
          { tab: 'social', sourceId: overflow.id });
        last = overflow;
      }
    }
    if (state.pledge) {
      state.pledge.group = getMemberGroups().map(groupDisplayLabel).filter(Boolean).join(', ');
    }
    saveState();
  }

  function hasTownGroupMembership() {
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    if (!selfId) return false;
    return (Array.isArray(state.groups) ? state.groups : []).some((group) => group
      && group.kind === 'town' && !group.left
      && (Array.isArray(group.members) ? group.members : [])
        .some((member) => member && (member.memberId || member.id) === selfId));
  }

  // Group settings are local-only. Admins can set a physical location or mark
  // the group Online, and in Phase 2 they can record a group brand and the
  // legal details of a co-op they chose to form outside Unbought.
  function normalizeGroupSettings(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const business = src.business && typeof src.business === 'object' ? src.business : {};
    const coop = business.coop && typeof business.coop === 'object' ? business.coop : {};
    const reviewBoard = src.reviewBoard && typeof src.reviewBoard === 'object' ? src.reviewBoard : {};
    return {
      location: cleanString(src.location, 120),
      online: Boolean(src.online),
      alliances: Array.isArray(src.alliances)
        ? src.alliances.map((id) => cleanString(id, 120)).filter(Boolean).slice(0, 50)
        : [],
      reviewBoard: {
        openToAlliance: reviewBoard.openToAlliance !== false,
        optOutOutcome: cleanString(reviewBoard.optOutOutcome, 40),
        optOutAt: cleanString(reviewBoard.optOutAt, 40)
      },
      business: {
        enabled: Boolean(business.enabled),
        brandName: cleanString(business.brandName, 80),
        brandChoice: business.brandChoice === 'unbought' ? 'unbought' : 'group',
        description: cleanString(business.description, 500),
        offerings: cleanString(business.offerings, 500),
        coop: {
          legalName: cleanString(coop.legalName, 120),
          entityType: cleanString(coop.entityType, 80),
          registration: cleanString(coop.registration, 80),
          notes: cleanString(coop.notes, 500)
        },
        createdAt: cleanString(business.createdAt, 40)
      }
    };
  }

  function groupBrandOfferings(settings) {
    const offerings = cleanString(settings && settings.business
      ? settings.business.offerings : '', 500);
    return offerings.split(',').map((item) => cleanString(item, 80)).filter(Boolean).slice(0, 12);
  }

  function groupBrandLabel(settings) {
    const business = settings && settings.business;
    if (!business || business.brandChoice !== 'unbought') return 'Group brand';
    return 'Unbought Brand';
  }

  function normalizeGroup(group) {
    if (!group) return group;
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    const selfName = state.pledge && state.pledge.name ? state.pledge.name : 'You';
    const members = [];
    (Array.isArray(group.members) ? group.members : []).forEach((entry) => {
      if (!entry) return;
      const id = cleanString(entry.memberId || entry.id, 100);
      const name = cleanString(entry.name, 60);
      if (!id || members.some((item) => item.memberId === id)) return;
      members.push({
        memberId: id,
        name: name || (id === selfId ? selfName : 'Member'),
        profession: cleanString(entry.profession, 80),
        track: cleanString(entry.track, 30),
        worker: Boolean(entry.worker)
      });
    });
    // Groups the member starts always include them. A town group is automatic
    // only until the member chooses a numbered group; after that they belong
    // to exactly one of I, II, III, XI, and so on.
    const autoAddSelf = group.kind === 'own'
      || (group.kind === 'town' && !group.overflow && !hasTownGroupMembership());
    if (selfId && !group.left && autoAddSelf && !members.some((item) => item.memberId === selfId)) {
      members.unshift({ memberId: selfId, name: selfName });
    }
    if (group.kind === 'town') {
      if (!cleanString(group.roman, 12)) group.roman = 'I';
      if (!Number.isFinite(Number(group.ordinal)) || Number(group.ordinal) <= 0) group.ordinal = romanToInt(group.roman);
      group.seedEligible = !group.overflow;
    }
    group.members = members.slice(0, SOCIAL_LIMITS.groupMembers);
    group.memberCount = group.members.length;
    const admins = [];
    (Array.isArray(group.admins) ? group.admins : []).forEach((entry) => {
      const id = cleanString(entry && typeof entry === 'object' ? (entry.memberId || entry.id) : entry, 100);
      if (id && !admins.includes(id)) admins.push(id);
    });
    if (!group.left && !admins.length && (group.kind === 'own' || group.kind === 'town')
      && selfId && isGroupWorkerId(selfId) && members.some((item) => item.memberId === selfId)) admins.push(selfId);
    group.admins = admins;
    group.settings = normalizeGroupSettings(group.settings);
    return group;
  }

  // Admin duty is for workers only. Care Circle, Observer, and Apprentice
  // members may take part in group chat, but they cannot hold an admin seat or
  // be added as a standing admin.
  function resolveGroupMemberInfo(entry) {
    const id = cleanString(entry && (entry.memberId || entry.id), 100);
    if (!id) return null;
    if (state.pledge && state.pledge.memberId === id) return state.pledge;
    const found = findMemberById(id);
    const entryTrack = entry && typeof entry === 'object' ? cleanString(entry.track, 30) : '';
    if (found && entryTrack) return { ...found, track: entryTrack };
    return found || (typeof entry === 'object' ? entry : null);
  }

  function isGroupWorker(entry) {
    const member = resolveGroupMemberInfo(entry);
    if (!member) return false;
    const track = cleanString(member.track, 30).toLowerCase();
    if (['care', 'observer', 'apprentice', 'student', 'limited', 'exiled', 'inactive', 'observe_only'].includes(track)) return false;
    if (track === 'contributor' || member.worker === true) return true;
    const profession = normalizeProfession(member.profession || String(member.paidSkills || '').split(/[\n,;]/)[0]);
    const confirmed = getConfirmedExchangeTotals(member.memberId || member.id).hoursWorked > 0;
    return Boolean(profession || confirmed || cleanString(member.unpaidSkills, 20));
  }

  function isGroupWorkerId(memberId) {
    const id = cleanString(memberId, 100);
    return Boolean(id && isGroupWorker({ memberId: id }));
  }

  // The seven seats change on different cycles (1–7 weeks), so admin duty is
  // staggered instead of all changing on the same Monday.
  function groupWeekStart(value) {
    const date = value instanceof Date ? value : new Date();
    const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    return monday.getTime();
  }

  function groupAdminRotation(group, value) {
    const members = (group && Array.isArray(group.members) ? group.members : [])
      .filter((member) => member && cleanString(member.memberId, 100) && isGroupWorker(member));
    const start = groupWeekStart(value);
    const weekNumber = Math.floor(start / WEEK_MS);
    const groupId = cleanString(group && group.id, 120);
    let hash = 0;
    for (let index = 0; index < groupId.length; index += 1) {
      hash = ((hash * 31) + groupId.charCodeAt(index)) | 0;
    }
    const seats = [];
    const used = new Set();
    for (let seat = 0; seat < Math.min(GROUP_ADMIN_SEATS, members.length); seat += 1) {
      const cycleWeeks = seat + 1;
      let index = Math.abs(Math.floor(weekNumber / cycleWeeks) + hash + seat) % members.length;
      let attempts = 0;
      while (used.has(index) && attempts < members.length) {
        index = (index + 1) % members.length;
        attempts += 1;
      }
      used.add(index);
      seats.push({ seat: seat + 1, member: members[index], cycleWeeks });
    }
    return {
      weekStart: new Date(start).toISOString(),
      weekEnd: new Date(start + WEEK_MS).toISOString(),
      seats,
      memberIds: seats.map((seat) => cleanString(seat.member && seat.member.memberId, 100)).filter(Boolean)
    };
  }

  function isRotationAdmin(group, memberId) {
    const id = cleanString(memberId, 100);
    return Boolean(id && groupAdminRotation(group).memberIds.includes(id));
  }

  function isGroupAdmin(group, memberId) {
    const id = cleanString(memberId, 100);
    if (!id || !group) return false;
    const stored = Array.isArray(group.admins) && group.admins.includes(id) && isGroupWorkerId(id);
    return Boolean(stored || isRotationAdmin(group, id));
  }

  function otherGroupAdmins(group) {
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    const ids = new Set();
    (group && Array.isArray(group.admins) ? group.admins : [])
      .filter((id) => id && id !== selfId && isGroupWorkerId(id))
      .forEach((id) => ids.add(id));
    // Every other worker will hold one of the staggered seats, so they count
    // as another admin for the rule that blocks a sole admin from leaving.
    (group && Array.isArray(group.members) ? group.members : []).forEach((member) => {
      const id = member && cleanString(member.memberId, 100);
      if (id && id !== selfId && isGroupWorkerId(id)) ids.add(id);
    });
    return [...ids];
  }

  function getMemberGroups() {
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    return (Array.isArray(state.groups) ? state.groups : [])
      .filter((group) => group && group.name && !group.left)
      .map(normalizeGroup)
      .filter((group) => !selfId || group.members.some((member) => member && member.memberId === selfId));
  }

  function getGroupById(groupId) {
    const id = cleanString(groupId, 120);
    return (Array.isArray(state.groups) ? state.groups : [])
      .filter((group) => group && group.name)
      .map(normalizeGroup)
      .find((group) => group.id === id) || null;
  }

  function groupProfileUrl(groupId) {
    const id = cleanString(groupId, 120);
    return id ? `group.html?group=${encodeURIComponent(id)}` : 'dashboard.html#social';
  }

  function groupNameLink(group, extraClass) {
    const e = escapeHtml;
    const name = e(cleanString(groupDisplayLabel(group), 120) || 'Group');
    if (!group || !group.id) return name;
    const className = ['group-link', extraClass].filter(Boolean).join(' ');
    return `<a class="${e(className)}" href="${e(groupProfileUrl(group.id))}">${name}</a>`;
  }

  // The headcount is derived from the selected members, never typed. Your main
  // town group is automatic; numbered town groups are opt-in, and every social
  // or support circle you join or start includes you.
  function renderGroupMemberOptions() {
    const entries = memberDirectory();
    if (!entries.length) {
      return '<p class="account-note">You are the only member recorded on this device right now, so the count stays at 1.</p>';
    }
    const e = escapeHtml;
    return `<div class="group-member-options">${entries.map((member) => {
      const meta = [member.profession, member.cityState].filter(Boolean).join(' · ');
      return `<div class="group-member-option">
        ${memberNameLink(member.name, member.memberId)}
        <label class="checkbox"><input type="checkbox" name="members" value="${e(member.memberId)}" data-group-member> <span>Include · ${e(meta || 'Current member')}</span></label>
      </div>`;
    }).join('')}</div>`;
  }

  function groupKindLabel(group) {
    if (group && group.kind === 'town') {
      return `Main group · Group ${groupRoman(group)}${group.overflow ? ' · overflow' : ''}`;
    }
    return group && group.kind === 'own' ? 'Your group' : 'Joined group';
  }

  function renderGroupMembership(includeActions) {
    const joined = getMemberGroups();
    const available = getAvailableTownGroups();
    const groups = [...joined, ...available].sort((a, b) => {
      if (a.kind === 'town' && b.kind === 'town') return groupOrdinal(a) - groupOrdinal(b);
      return Number(b && b.kind === 'town') - Number(a && a.kind === 'town');
    });
    if (!groups.length) {
      return '<p class="account-note">No groups yet. Join or create one in Friends &amp; Groups.</p>';
    }
    const e = escapeHtml;
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    const joinedIds = new Set(joined.map((group) => group && group.id));
    return `<ul class="social-list">${groups.map((group) => {
      const isJoined = joinedIds.has(group.id);
      const admin = isGroupAdmin(group, selfId);
      const otherAdmins = otherGroupAdmins(group);
      let action = '';
      if (includeActions && group.kind === 'town' && !isJoined) {
        action = `<div class="social-item-actions"><button type="button" class="button button--outline button--tiny" data-group-action="join-town" data-group-id="${e(group.id)}">Join this group</button></div>`;
      } else if (includeActions && group.kind !== 'town') {
        const leave = otherAdmins.length
          ? `<button type="button" class="button button--ghost button--tiny" data-group-action="leave" data-group-id="${e(group.id)}">Leave group</button>`
          : `<span class="contribution-meta">${admin ? 'Add another admin before leaving' : 'No other admin can take over yet'}</span>`;
        action = `<div class="social-item-actions">
          ${admin ? `<button type="button" class="button button--ghost button--tiny" data-group-action="cancel" data-group-id="${e(group.id)}">Cancel group</button>` : ''}
          ${leave}
          ${admin ? `<a class="button button--ghost button--tiny" href="${e(groupProfileUrl(group.id))}">Add admin</a>` : ''}
        </div>`;
      }
      return `<li class="social-item ${group.kind === 'town' && isJoined ? 'social-item--main' : ''}">
        <strong>${groupNameLink(group)}</strong>
        <span class="contribution-meta">${e(groupKindLabel(group))} · ${group.memberCount}/${SOCIAL_LIMITS.groupMembers} people${isJoined ? '' : ' · available'}${admin ? ' · you are an admin' : ''}</span>
        ${group.purpose ? `<span>${e(group.purpose)}</span>` : ''}
        ${action}
      </li>`;
    }).join('')}</ul>`;
  }

  function changeGroupMembership(groupId, action, trigger) {
    if (!requireMembership()) return;
    const selfId = state.pledge.memberId;
    const group = getGroupById(groupId);
    if (!group) return;
    let title;
    if (action === 'join-town') {
      if (group.kind !== 'town' || !group.overflow) {
        showToast('Your main town group is already added. Choose a numbered group.', false);
        return;
      }
      if (getMemberGroups().some((item) => item && item.id === group.id)) return;
      if (group.members.length >= SOCIAL_LIMITS.groupMembers) {
        showToast('This numbered group is full. Another one will open locally.', false);
        return;
      }
      title = 'Joined town group';
      // A member belongs to one numbered town group at a time. Joining a new
      // number moves them out of the previous one, including Group I.
      (Array.isArray(state.groups) ? state.groups : []).forEach((item) => {
        if (!item || item.id === group.id || item.kind !== 'town' || item.left) return;
        item.members = (Array.isArray(item.members) ? item.members : [])
          .filter((member) => member && member.memberId !== selfId);
        item.memberCount = item.members.length;
        if (Array.isArray(item.admins)) item.admins = item.admins.filter((id) => id !== selfId);
      });
      group.members = Array.isArray(group.members) ? group.members : [];
      if (!group.members.some((member) => member && member.memberId === selfId)) {
        group.members.push({ memberId: selfId, name: state.pledge.name || 'You' });
      }
      group.memberCount = group.members.length;
      group.left = false;
    } else if (action === 'cancel') {
      if (group.kind === 'town') {
        showToast('A town group cannot be canceled from a member profile.', false);
        return;
      }
      if (!isGroupAdmin(group, selfId)) {
        showToast('Only an admin can cancel a group.', false);
        return;
      }
      title = 'Group canceled';
      state.groups = (Array.isArray(state.groups) ? state.groups : [])
        .filter((item) => item && item.id !== group.id);
    } else if (action === 'leave') {
      if (group.kind === 'town') {
        showToast('Your town group is automatic and cannot be left.', false);
        return;
      }
      if (!otherGroupAdmins(group).length) {
        showToast('Add another admin before leaving this group.', false);
        return;
      }
      title = 'Left group';
      group.members = (Array.isArray(group.members) ? group.members : [])
        .filter((member) => member && member.memberId !== selfId);
      group.admins = (Array.isArray(group.admins) ? group.admins : [])
        .filter((id) => id !== selfId);
      group.memberCount = group.members.length;
      group.left = true;
      if (group.kind === 'own') group.kind = 'joined';
    } else {
      return;
    }
    if (state.pledge) {
      state.pledge.group = getMemberGroups().map(groupDisplayLabel).filter(Boolean).join(', ');
    }
    addNotification('social', `${title}: ${groupDisplayLabel(group)}`,
      'Changed locally in this browser. No other account, invitation, or device was changed.',
      { tab: 'social', sourceId: group.id });
    saveState();
    renderSocial();
    renderAccountInfo();
    renderProfile();
    renderGroupProfile();
    renderNotifications();
    announce(`${groupDisplayLabel(group)}: ${title.toLowerCase()} locally.`);
    showToast(`${title} locally.`, false);
    if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
  }

  function addGroupAdmin(groupId, memberId, trigger) {
    if (!requireMembership()) return;
    const selfId = state.pledge.memberId;
    const group = getGroupById(groupId);
    if (!group || !isGroupAdmin(group, selfId)) {
      showToast('Only an admin can add another admin.', false);
      return;
    }
    const member = (Array.isArray(group.members) ? group.members : [])
      .find((entry) => entry && entry.memberId === memberId);
    if (!member || isGroupAdmin(group, memberId)) return;
    if (!isGroupWorkerId(memberId)) {
      showToast('Only workers can be admins.', false);
      return;
    }
    group.admins = Array.isArray(group.admins) ? group.admins : [];
    group.admins.push(memberId);
    if (state.pledge) state.pledge.group = getMemberGroups().map(groupDisplayLabel).filter(Boolean).join(', ');
    addNotification('social', `Admin added: ${member.name}`,
      `You can now leave ${groupDisplayLabel(group)} because another admin is recorded in this browser. No invitation was sent.`,
      { tab: 'social', sourceId: group.id, memberId });
    saveState();
    renderSocial();
    renderProfile();
    renderGroupProfile();
    renderNotifications();
    announce(`${member.name} is now an admin of ${groupDisplayLabel(group)}.`);
    showToast('Admin added locally.', false);
    if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
  }

  function openGroupForm(kind, trigger) {
    if (!requireMembership()) return;
    setDashboardTab('social');
    const form = document.querySelector('[data-group-form]');
    if (form) {
      const kindSelect = form.querySelector('select[name="kind"]');
      if (kindSelect) kindSelect.value = kind === 'own' ? 'own' : 'joined';
      if (kind === 'own') {
        const ownOption = kindSelect && Array.from(kindSelect.options).find((option) => option.value === 'own');
        if (ownOption) ownOption.disabled = getMemberGroups().some((group) => group.kind === 'own');
      }
      const nameInput = form.querySelector('input[name="name"]');
      if (nameInput) nameInput.focus({ preventScroll: false });
    }
    if (trigger instanceof HTMLElement) trigger.setAttribute('aria-expanded', 'true');
  }

  function socialAudienceOptions(friends, groups) {
    const e = escapeHtml;
    const options = [`<option value="friends">Friends (${friends.length}/${SOCIAL_LIMITS.friends})</option>`];
    groups.forEach((group) => {
      const label = group.kind === 'town' ? 'Main group' : group.kind === 'own' ? 'Your group' : 'Group';
      options.push(`<option value="${e(group.kind)}:${e(group.id)}">${label}: ${e(groupDisplayLabel(group))} (${group.memberCount}/${SOCIAL_LIMITS.groupMembers})</option>`);
    });
    return options.join('');
  }

  function getFriendRequests() {
    if (!Array.isArray(state.friendRequests)) state.friendRequests = [];
    return state.friendRequests;
  }

  // Names of directory members are links to their limited public profile. The
  // profile page reads only the public projection, never the private record.
  function findMemberById(memberId) {
    const id = cleanString(memberId, 100);
    if (!id) return null;
    if (state.pledge && state.pledge.memberId === id) return state.pledge;
    return memberDirectory().find((member) => member && member.memberId === id) || null;
  }

  function memberProfileUrl(memberId) {
    const id = cleanString(memberId, 100);
    return id ? `profile.html?member=${encodeURIComponent(id)}` : 'profile.html';
  }

  function memberNameLink(name, memberId, extraClass) {
    const label = escapeHtml(cleanString(name, 60) || 'Member');
    const id = cleanString(memberId, 100);
    if (!id) return label;
    const className = ['member-link', extraClass].filter(Boolean).join(' ');
    return `<a class="${escapeHtml(className)}" href="${escapeHtml(memberProfileUrl(id))}">${label}</a>`;
  }

  function memberNameLinkByName(name) {
    const member = memberDirectory().find((item) => item && item.name === name);
    return memberNameLink(name, member && member.memberId);
  }

  function memberDirectory() {
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    const entries = LOCAL_MEMBER_DIRECTORY.map((member) => ({ ...member, memberId: member.id, sample: true }));
    getMemberRoster().forEach((item) => {
      if (!item || !item.memberId || item.memberId === selfId || !item.name) return;
      if (item.standing && item.standing !== 'active') return;
      if (entries.some((entry) => entry.memberId === item.memberId)) return;
      entries.push({
        id: item.memberId,
        memberId: item.memberId,
        name: item.name,
        profession: item.profession || '',
        cityState: item.cityState || (item.zip ? `ZIP ${item.zip}` : ''),
        track: cleanString(item.track, 30),
        sample: false
      });
    });
    return entries;
  }

  function renderFriendSearchResults(query, results) {
    if (!results) return;
    const e = escapeHtml;
    const q = cleanString(query, 80).toLowerCase();
    if (!q) {
      results.innerHTML = '<p class="account-note">Start typing to see current members recorded on this device.</p>';
      return;
    }
    const matches = memberDirectory()
      .filter((member) => [member.name, member.profession, member.cityState]
        .some((value) => cleanString(value, 100).toLowerCase().includes(q)))
      .slice(0, 12);
    if (!matches.length) {
      results.innerHTML = `<p class="account-note">No current members match “${e(cleanString(query, 80))}”. This prototype only searches its sample directory and members recorded here; nothing was contacted.</p>`;
      return;
    }
    const requests = getFriendRequests();
    const friends = Array.isArray(state.friends) ? state.friends : [];
    results.innerHTML = `<ul class="friend-result-list">${matches.map((member) => {
      const alreadyFriend = friends.some((friend) => friend && (friend.memberId === member.memberId
        || (member.sample && friend.name === member.name)));
      const pendingOut = requests.some((request) => request && request.memberId === member.memberId
        && request.direction === 'outgoing' && request.status === 'pending');
      const pendingIn = requests.some((request) => request && request.memberId === member.memberId
        && request.direction === 'incoming' && request.status === 'pending');
      const disabled = alreadyFriend || pendingOut || pendingIn;
      const label = alreadyFriend ? 'Already a friend'
        : pendingOut ? 'Request pending'
          : pendingIn ? 'Request received' : 'Send request';
      const meta = [member.profession, member.cityState].filter(Boolean).map(e).join(' · ');
      return `<li class="friend-result">
        <div><strong>${memberNameLink(member.name, member.memberId)}</strong>${member.sample ? '<span class="badge badge--soft">Sample member</span>' : ''}<span class="contribution-meta">${meta || 'Current member'}</span></div>
        <button class="button button--outline button--tiny" type="button" data-friend-request-send="${e(member.memberId)}"${disabled ? ' disabled' : ''}>${label}</button>
      </li>`;
    }).join('')}</ul>`;
  }

  function renderFriendRequestList(direction) {
    const e = escapeHtml;
    const pending = getFriendRequests()
      .filter((request) => request && request.direction === direction && request.status === 'pending')
      .slice(0, 20);
    if (!pending.length) {
      return `<p class="account-note">No ${direction === 'incoming' ? 'incoming' : 'sent'} friend requests.</p>`;
    }
    return `<ul class="friend-request-list">${pending.map((request) => {
      const meta = [request.profession, request.cityState].filter(Boolean).map(e).join(' · ');
      return `<li class="friend-request-item">
        <div><strong>${memberNameLink(request.name, request.memberId)}</strong>${request.sample ? '<span class="badge badge--soft">Sample request</span>' : ''}<span class="contribution-meta">${meta || 'Current member'} · ${e(formatDate(request.createdAt))}</span></div>
        ${direction === 'incoming'
          ? `<div class="notification-actions">
              <button class="button button--primary button--tiny" type="button" data-friend-request-action="accept" data-friend-request-id="${e(request.id)}">Accept</button>
              <button class="button button--ghost button--tiny" type="button" data-friend-request-action="decline" data-friend-request-id="${e(request.id)}">Decline</button>
            </div>`
          : '<span class="contribution-meta">Pending locally · nothing was delivered</span>'}
      </li>`;
    }).join('')}</ul>`;
  }

  function getGroupJoinRequests() {
    if (!Array.isArray(state.groupJoinRequests)) state.groupJoinRequests = [];
    return state.groupJoinRequests;
  }

  // Search uses the stored group record directly. normalizeGroup() would add the
  // signed-in member to an "own" group for display, which would make every local
  // circle look already joined and hide the request button.
  function joinableGroups() {
    return (Array.isArray(state.groups) ? state.groups : [])
      .filter((group) => group && group.name && !group.left)
      .map((group) => ({
        id: cleanString(group.id, 120),
        name: cleanString(group.name, 120),
        baseName: cleanString(group.baseName, 120),
        roman: cleanString(group.roman, 12),
        kind: cleanString(group.kind, 30),
        purpose: cleanString(group.purpose, 200),
        members: Array.isArray(group.members) ? group.members : []
      }))
      .filter((group) => group.id);
  }

  function renderGroupSearchResults(query, results) {
    if (!results) return;
    const e = escapeHtml;
    const q = cleanString(query, 80).toLowerCase();
    if (!q) {
      results.innerHTML = '<p class="account-note">Start typing to see group names saved on this device.</p>';
      return;
    }
    const matches = joinableGroups()
      .filter((group) => [group.name, group.purpose, groupKindLabel(group)]
        .some((value) => cleanString(value, 120).toLowerCase().includes(q)))
      .slice(0, 12);
    if (!matches.length) {
      results.innerHTML = `<p class="account-note">No saved group matches “${e(cleanString(query, 80))}”. This prototype only searches groups stored here; nothing was contacted.</p>`;
      return;
    }
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    const requests = getGroupJoinRequests();
    results.innerHTML = `<ul class="friend-result-list">${matches.map((group) => {
      const members = Array.isArray(group.members) ? group.members : [];
      const memberCount = members.length;
      const alreadyMember = members.some((member) => member && member.memberId === selfId);
      const full = memberCount >= SOCIAL_LIMITS.groupMembers;
      const pending = requests.some((request) => request && request.groupId === group.id
        && request.memberId === selfId && request.status === 'pending');
      const disabled = alreadyMember || full || pending;
      const label = alreadyMember ? 'Already a member'
        : pending ? 'Request pending'
          : full ? 'Group full' : 'Request to join';
      const meta = [groupKindLabel(group), `${memberCount}/${SOCIAL_LIMITS.groupMembers} people`]
        .filter(Boolean).map(e).join(' · ');
      return `<li class="friend-result">
        <div><strong><a class="member-link" href="${e(groupProfileUrl(group.id))}">${e(groupDisplayLabel(group))}</a></strong><span class="contribution-meta">${meta}${group.purpose ? ` · ${e(group.purpose)}` : ''}</span></div>
        <button class="button button--outline button--tiny" type="button" data-group-join-send="${e(group.id)}"${disabled ? ' disabled' : ''}>${label}</button>
      </li>`;
    }).join('')}</ul>`;
  }

  function renderGroupJoinRequestList() {
    const e = escapeHtml;
    const selfId = state.pledge && state.pledge.memberId ? state.pledge.memberId : '';
    const pending = getGroupJoinRequests()
      .filter((request) => request && request.memberId === selfId && request.status === 'pending')
      .slice(0, 20);
    if (!pending.length) return '<p class="account-note">No join requests recorded.</p>';
    return `<ul class="friend-request-list">${pending.map((request) => `<li class="friend-request-item">
      <div><strong><a class="member-link" href="${e(groupProfileUrl(request.groupId))}">${e(request.groupLabel || request.groupName)}</a></strong><span class="contribution-meta">${e(formatDate(request.createdAt))}</span></div>
      <span class="contribution-meta">Pending locally · nothing was delivered</span>
    </li>`).join('')}</ul>`;
  }

  function sendGroupJoinRequest(groupId, trigger) {
    if (!requireMembership()) return;
    const group = (Array.isArray(state.groups) ? state.groups : [])
      .find((item) => item && item.id === groupId && item.name && !item.left);
    if (!group) return;
    const selfId = state.pledge.memberId;
    const members = Array.isArray(group.members) ? group.members : [];
    if (members.some((member) => member && member.memberId === selfId)) {
      showToast('You are already in that group.', false);
      return;
    }
    if (members.length >= SOCIAL_LIMITS.groupMembers) {
      showToast(`That group is at its ${SOCIAL_LIMITS.groupMembers}-person limit.`, false);
      return;
    }
    const requests = getGroupJoinRequests();
    if (requests.some((request) => request && request.groupId === group.id
      && request.memberId === selfId && request.status === 'pending')) {
      showToast('That join request is already pending locally.', false);
      return;
    }
    const request = {
      id: makeId('group-join'),
      groupId: group.id,
      groupName: cleanString(group.name, 120),
      groupLabel: groupDisplayLabel(group),
      memberId: selfId,
      name: cleanString(state.pledge.name, 60) || 'Member',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    requests.unshift(request);
    addNotification('social', `Join request: ${request.groupLabel}`,
      'Recorded locally for the signed-in member only. In a live system the group admins would review it; no request was delivered.',
      { tab: 'social', sourceId: request.id, groupId: request.groupId });
    saveState();
    renderSocial();
    renderNotifications();
    announce(`Your request to join ${request.groupLabel} is recorded locally.`);
    showToast('Join request recorded locally. Nothing was sent.', false);
    if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
  }

  function sendFriendRequest(memberId, trigger) {
    if (!requireMembership()) return;
    const member = memberDirectory().find((entry) => entry.memberId === memberId);
    if (!member) return;
    const requests = getFriendRequests();
    const friends = Array.isArray(state.friends) ? state.friends : [];
    if (requests.some((request) => request && request.memberId === memberId && request.status === 'pending')) {
      showToast('That friend request is already pending locally.', false);
      return;
    }
    if (friends.length >= SOCIAL_LIMITS.friends) {
      showToast(`The local friend cap is ${SOCIAL_LIMITS.friends}.`, false);
      return;
    }
    const request = {
      id: makeId('friend-request'),
      memberId: member.memberId,
      name: member.name,
      profession: member.profession || '',
      cityState: member.cityState || '',
      direction: 'outgoing',
      status: 'pending',
      createdAt: new Date().toISOString(),
      sample: Boolean(member.sample)
    };
    requests.unshift(request);
    addNotification('social', `Friend request: ${member.name}`,
      'Saved locally as a request draft. In a live system this would be delivered; no request was sent.',
      { tab: 'social', sourceId: request.id, memberId: member.memberId });
    saveState();
    renderSocial();
    renderProfile();
    renderNotifications();
    announce(`${member.name}'s friend request is pending locally.`);
    showToast('Friend request recorded locally. Nothing was sent.', false);
    if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
  }

  function respondToFriendRequest(requestId, action, trigger) {
    if (!requireMembership()) return;
    const request = getFriendRequests().find((item) => item && item.id === requestId
      && item.direction === 'incoming' && item.status === 'pending');
    if (!request || !['accept', 'decline'].includes(action)) return;
    const now = new Date().toISOString();
    request.respondedAt = now;
    if (action === 'accept') {
      const friends = Array.isArray(state.friends) ? state.friends : [];
      if (friends.length >= SOCIAL_LIMITS.friends) {
        showToast(`The local friend cap is ${SOCIAL_LIMITS.friends}.`, false);
        return;
      }
      state.friends = friends;
      state.friends.push({
        id: makeId('friend'),
        memberId: request.memberId,
        name: request.name,
        createdAt: now
      });
      request.status = 'accepted';
      addNotification('social', `Friend request accepted: ${request.name}`,
        'Accepted locally in this prototype. No other account or device was changed.',
        { tab: 'social', sourceId: request.id, memberId: request.memberId });
      announce(`${request.name} was added to your local friend list.`);
      showToast('Friend added locally. No invitation was sent.', false);
    } else {
      request.status = 'declined';
      addNotification('social', `Friend request declined: ${request.name}`,
        'Declined locally in this prototype. No other account or device was notified.',
        { tab: 'social', sourceId: request.id, memberId: request.memberId });
      announce(`${request.name}'s friend request was declined locally.`);
      showToast('Request declined locally. Nothing was sent.', false);
    }
    saveState();
    renderSocial();
    renderProfile();
    renderNotifications();
    if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
  }

  function renderSocial() {
    const panel = document.getElementById('social-panel');
    if (!panel || !isMember()) return;
    const e = escapeHtml;
    const friends = (Array.isArray(state.friends) ? state.friends : []).slice(0, SOCIAL_LIMITS.friends);
    const groups = (Array.isArray(state.groups) ? state.groups : [])
      .slice()
      .sort((a, b) => Number(b && b.kind === 'town') - Number(a && a.kind === 'town'))
      .slice(0, 100);
    const chats = (Array.isArray(state.socialChats) ? state.socialChats : []).slice(-12).reverse();
    const hasOwnGroup = (Array.isArray(state.groups) ? state.groups : [])
      .some((group) => group && group.kind === 'own');

    panel.innerHTML = `<section class="account-card">
      <p class="eyebrow">Social circles</p>
      <h3>Friends &amp; groups</h3>
      <p class="account-note">Your town group is added automatically as the main group. When it reaches the local limit, another Stroudsburg group opens with a Roman numeral; neighbors may choose Group I, II, III, XI, and so on. A numbered group has no seed status, and the first member of a new group is not a seed member. Every other group is a social or support circle. Seven admin seats rotate each week for workers only, staggered across one-to-seven-week cycles. This prototype has one local account, so friends, groups, and chat audiences are saved only on this device; no invitations or messages are sent, and each group stays capped at ${SOCIAL_LIMITS.groupMembers} people.</p>
      <div class="social-grid">
        <div class="account-block">
          <h4>Friends (${friends.length}/${SOCIAL_LIMITS.friends})</h4>
          ${friends.length ? `<ul class="social-list">${friends.map((friend) => `<li class="social-item"><strong>${memberNameLink(friend.name, friend.memberId)}</strong><span class="contribution-meta">${e(formatDate(friend.createdAt))} · local only</span></li>`).join('')}</ul>` : '<p class="account-note">No friends added yet.</p>'}
          <div class="friend-finder">
            <h5>Find current members</h5>
            <p class="account-note">Search by chosen name, profession, or town, then send a local friend request. Accept or decline incoming requests here. This prototype has one account, so no request is delivered and no one else’s data changes.</p>
            <div class="field">
              <label for="friend-search">Search members</label>
              <input type="search" id="friend-search" data-friend-search maxlength="80" placeholder="Maya, baker, or Stroudsburg" autocomplete="off">
              <p class="field-hint">Try “Maya”, “baker”, or “Stroudsburg”.</p>
            </div>
            <div class="friend-results" data-friend-results></div>
          </div>
          <h5>Incoming friend requests</h5>
          ${renderFriendRequestList('incoming')}
          <h5>Sent friend requests</h5>
          ${renderFriendRequestList('outgoing')}
        </div>
        <div class="account-block">
          <h4>Groups (max ${SOCIAL_LIMITS.groupMembers} each)</h4>
          ${renderGroupMembership(true)}
          <p class="field-hint">Town groups split automatically at the cap; the create option makes a social or support circle only. Only workers can be admins.</p>
          <h5>Sent join requests</h5>
          ${renderGroupJoinRequestList()}
          <form class="account-form" data-group-form>
            <div class="form-row">
              <div class="field" data-group-name-field>
                <label for="group-name">Group name</label>
                <input type="text" id="group-name" name="name" maxlength="80" required placeholder="Crew, circle, or class">
              </div>
              <div class="field">
                <label for="group-kind">Type</label>
                <select id="group-kind" name="kind">
                  <option value="joined">Group I joined</option>
                  <option value="own" ${hasOwnGroup ? 'disabled' : ''}>My own group</option>
                </select>
              </div>
            </div>
            <div class="field" data-group-search-field hidden>
              <label for="group-search">Search groups</label>
              <input type="search" id="group-search" data-group-search maxlength="80" placeholder="Stroudsburg, circle, or class" autocomplete="off">
              <p class="field-hint">Search group names saved on this device. Request to join is recorded only for the signed-in member; no one else is added and nothing is delivered.</p>
              <div class="group-search-results" data-group-search-results></div>
            </div>
            <div class="field group-member-picker" data-group-member-field>
              <p class="field-label">People in this group</p>
              <p class="field-hint">You are always counted in a social or support circle. Choose current members to include locally; the count comes from this list, not a typed number. Town groups split into Group II, III, XI, and so on at 150 people, and numbered groups are opt-in.</p>
              ${renderGroupMemberOptions()}
              <p class="field-hint" data-group-count-preview>1/${SOCIAL_LIMITS.groupMembers} people · you</p>
            </div>
            <div class="field" data-group-purpose-field>
              <label for="group-purpose">Purpose <span class="optional">(optional)</span></label>
              <input type="text" id="group-purpose" name="purpose" maxlength="200" placeholder="What this group is for">
            </div>
            <div class="account-form-actions" data-group-form-actions>
              <button type="submit" class="button button--outline button--small" data-group-submit>Save group locally</button>
            </div>
          </form>
        </div>
      </div>
      <div class="account-block">
        <h4>Social chat</h4>
        <p class="account-note">Choose friends, your automatic town group, your own group, or a group you joined. Each message is a local draft with the audience written on it; nothing is delivered.</p>
        <ul class="chat-list social-chat-list">
          ${chats.length ? chats.map((chat) => {
            const chatPhoto = Array.isArray(chat.picture) ? cleanPostPhotos(chat.picture)[0] : null;
            return `<li class="chat-message">
              <p class="contribution-meta"><strong>${e(chat.name)}</strong> → ${e(chat.audienceLabel)} · ${e(formatDate(chat.createdAt))}</p>
              ${chat.title ? `<p class="chat-title">${e(chat.title)}</p>` : ''}
              ${chatPhoto ? `<img class="chat-picture" src="${e(safeProfileImageUrl(chatPhoto.dataUrl))}" alt="Local picture for ${e(chat.title || 'this chat draft')}">` : ''}
              <p>${e(chat.body)}</p>
              <button class="button button--ghost button--small button--report" type="button" data-report-context data-report-area="Social chat" data-report-detail="${e(chat.title ? `${chat.title} · ` : '')}${e(chat.audienceLabel)}" data-report-name="${e(chat.name)}" data-report-source-id="${e(chat.id)}" aria-label="Report a concern about a social chat message from ${e(chat.name)}">Report</button>
            </li>`;
          }).join('') : '<li class="account-note">No social chat drafts yet.</li>'}
        </ul>
        <form class="account-form" data-social-chat-form>
          <div class="form-row">
            <div class="field">
              <label for="social-audience">Audience</label>
              <select id="social-audience" name="audience">${socialAudienceOptions(friends, groups)}</select>
            </div>
            <div class="field">
              <label for="social-title">Title</label>
              <input type="text" id="social-title" name="title" maxlength="90" placeholder="What is this draft about?">
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="social-body">Message</label>
              <textarea id="social-body" name="body" rows="3" maxlength="1200" required placeholder="Write a local chat draft…"></textarea>
            </div>
            <div class="field">
              <label for="social-picture">Picture <span class="optional">(optional)</span></label>
              <input type="file" id="social-picture" name="picture" accept="image/jpeg,image/png,image/webp,image/gif">
              <p class="field-hint">Resized locally and kept only in this browser. Nothing is uploaded.</p>
            </div>
          </div>
          <button type="submit" class="button button--primary button--small">Record chat draft</button>
        </form>
      </div>
    </section>`;

    const friendSearch = panel.querySelector('[data-friend-search]');
    if (friendSearch) {
      const results = panel.querySelector('[data-friend-results]');
      const updateResults = () => renderFriendSearchResults(friendSearch.value, results);
      friendSearch.addEventListener('input', updateResults);
      updateResults();
    }

    const groupForm = panel.querySelector('[data-group-form]');
    if (groupForm) {
      const countPreview = groupForm.querySelector('[data-group-count-preview]');
      if (countPreview) {
        const updateCount = () => {
          const selected = groupForm.querySelectorAll('[data-group-member]:checked').length;
          const total = Math.min(SOCIAL_LIMITS.groupMembers, 1 + selected);
          countPreview.textContent = `${total}/${SOCIAL_LIMITS.groupMembers} people · ${selected ? `you + ${selected} neighbor${selected === 1 ? '' : 's'}` : 'you'}`;
        };
        groupForm.querySelectorAll('[data-group-member]').forEach((input) => input.addEventListener('change', updateCount));
        updateCount();
      }

      const kindSelect = groupForm.querySelector('[name="kind"]');
      const nameField = groupForm.querySelector('[data-group-name-field]');
      const searchField = groupForm.querySelector('[data-group-search-field]');
      const searchInput = groupForm.querySelector('[data-group-search]');
      const searchResults = groupForm.querySelector('[data-group-search-results]');
      const memberField = groupForm.querySelector('[data-group-member-field]');
      const purposeField = groupForm.querySelector('[data-group-purpose-field]');
      const actions = groupForm.querySelector('[data-group-form-actions]');
      const nameInput = groupForm.querySelector('input[name="name"]');
      const submit = groupForm.querySelector('[data-group-submit]');

      const updateMode = () => {
        const joining = kindSelect && kindSelect.value === 'joined';
        if (nameField) nameField.hidden = Boolean(joining);
        if (searchField) searchField.hidden = !joining;
        if (memberField) memberField.hidden = Boolean(joining);
        if (purposeField) purposeField.hidden = Boolean(joining);
        if (actions) actions.hidden = Boolean(joining);
        if (nameInput) nameInput.required = !joining;
        if (submit) submit.textContent = joining ? 'Request to join below' : 'Save group locally';
        if (joining) renderGroupSearchResults(searchInput ? searchInput.value : '', searchResults);
      };

      if (kindSelect) kindSelect.addEventListener('change', updateMode);
      if (searchInput) {
        searchInput.addEventListener('input', () => renderGroupSearchResults(searchInput.value, searchResults));
      }
      updateMode();
    }
  }

  function renderSuggestions() {
    const panel = document.getElementById('suggestions-panel');
    if (!panel || !isMember()) return;
    const e = escapeHtml;
    const items = (Array.isArray(state.suggestions) ? state.suggestions : []).slice(0, 20);
    panel.innerHTML = `<section class="account-card">
      <p class="eyebrow">Suggestion box</p>
      <h3>Help shape the commons</h3>
      <p class="account-note">Ideas, concerns, and improvements are welcome. This prototype stores suggestions locally only—nothing is sent to a coordinator.</p>
      <form class="account-form" data-suggestion-form>
        <div class="field">
          <label for="suggestion-category">Category</label>
          <select id="suggestion-category" name="category">
            <option value="general">General idea</option>
            <option value="site">Site or accessibility</option>
            <option value="events">Events &amp; workdays</option>
            <option value="policy">Policy &amp; governance</option>
            <option value="safety">Safety &amp; accountability</option>
          </select>
        </div>
        <div class="field">
          <label for="suggestion-text">Your suggestion <span class="required-mark" aria-hidden="true">*</span></label>
          <textarea id="suggestion-text" name="text" rows="4" maxlength="1200" required placeholder="What would make Unbought better?"></textarea>
        </div>
        <button type="submit" class="button button--primary button--small">Submit suggestion</button>
      </form>
      <div class="account-block">
        <h4>Suggestions you recorded</h4>
        ${items.length ? `<ul class="contribution-list">${items.map((item) => `<li class="contribution-item"><strong>${e(item.category)}</strong><span>${e(item.text)}</span><span class="contribution-meta">${e(formatDate(item.createdAt))} · ${e(item.status || 'submitted')}</span></li>`).join('')}</ul>` : `<p class="account-note">No suggestions recorded in this browser yet.</p>`}
      </div>
    </section>`;
  }

  function renderDashboard() {
    renderDashboardGate();
    if (!isMember()) return;
    renderVolunteerAccess();
    renderAccountInfo();
    renderCommons();
    renderExchanges();
    renderMessages();
    renderNotifications();
    renderSocial();
    renderSuggestions();
  }

  function initDashboard() {
    const dash = document.getElementById('member-dashboard');
    if (!dash) return;
    initDashboardTabs();

    dash.addEventListener('click', (event) => {
      const requestSend = event.target.closest('[data-friend-request-send]');
      if (requestSend) {
        event.preventDefault();
        sendFriendRequest(requestSend.dataset.friendRequestSend, requestSend);
        return;
      }
      const requestAction = event.target.closest('[data-friend-request-action]');
      if (requestAction) {
        event.preventDefault();
        respondToFriendRequest(requestAction.dataset.friendRequestId, requestAction.dataset.friendRequestAction, requestAction);
        return;
      }
      const groupJoinSend = event.target.closest('[data-group-join-send]');
      if (groupJoinSend) {
        event.preventDefault();
        sendGroupJoinRequest(groupJoinSend.dataset.groupJoinSend, groupJoinSend);
        return;
      }
      const groupAction = event.target.closest('[data-group-action]');
      if (groupAction) {
        event.preventDefault();
        changeGroupMembership(groupAction.dataset.groupId, groupAction.dataset.groupAction, groupAction);
        return;
      }
      const groupFormOpen = event.target.closest('[data-open-group-form]');
      if (groupFormOpen) {
        event.preventDefault();
        openGroupForm(groupFormOpen.dataset.openGroupForm, groupFormOpen);
        return;
      }
      const folderTab = event.target.closest('[data-message-folder]');
      if (folderTab) {
        activeMessageFolder = folderTab.dataset.messageFolder;
        renderMessages();
        return;
      }
      const messageAction = event.target.closest('[data-message-action]');
      if (messageAction) {
        const message = (Array.isArray(state.messages) ? state.messages : [])
          .find((item) => item && item.id === messageAction.dataset.messageId);
        if (!message) return;
        const action = messageAction.dataset.messageAction;
        if (action === 'star') {
          message.starred = !message.starred;
        } else if (action === 'archive') {
          message.folder = 'archive';
          activeMessageFolder = 'archive';
        } else if (action === 'trash') {
          message.folder = 'trash';
          activeMessageFolder = 'trash';
        } else if (action === 'restore') {
          message.folder = message.toName ? 'sent' : 'inbox';
          activeMessageFolder = message.folder;
        } else {
          return;
        }
        saveState();
        renderMessages();
        announce(`Message ${action} recorded locally.`);
        showToast(action === 'star' ? 'Star updated locally.' : 'Message folder updated locally.', false);
        return;
      }
      const noticeLink = event.target.closest('li[data-notification-link]');
      if (noticeLink) {
        event.preventDefault();
        const notice = (Array.isArray(state.notifications) ? state.notifications : [])
          .find((item) => item && item.id === noticeLink.dataset.notificationId);
        if (notice && !notice.read) {
          notice.read = true;
          saveState();
          updateHeaderNotificationBadge();
        }
        const tab = cleanString(noticeLink.dataset.notificationTab, 30);
        if (tab) {
          setDashboardTab(tab);
          renderNotifications();
          announce('Notification marked as read and opened.');
          return;
        }
        const href = cleanString(noticeLink.dataset.notificationHref, 500) || 'dashboard.html#notifications';
        window.location.href = href;
        return;
      }
      const markAll = event.target.closest('[data-mark-notifications]');
      if (markAll) {
        (Array.isArray(state.notifications) ? state.notifications : []).forEach((item) => {
          if (item) item.read = true;
        });
        saveState();
        renderNotifications();
        announce('All notifications marked as read.');
      }
    });

    dash.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const noticeLink = event.target.closest('li[data-notification-link]');
      if (!noticeLink) return;
      event.preventDefault();
      noticeLink.click();
    });

    dash.addEventListener('submit', async (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!requireMembership()) return;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const now = new Date().toISOString();

      if (form.matches('[data-confirm-hours]')) {
        event.preventDefault();
        const request = state.requests.find((item) => item && item.id === form.dataset.id
          && item.type === 'mutual_aid_request' && requestRole(item) !== 'none');
        const role = form.dataset.role;
        if (!request || requestRole(request) !== role) return;
        const hours = cleanHours(data.get('hours'));
        if (!(hours > 0)) return;
        if (!request.workerId) request.workerId = workerIdFor(request);
        if (role === 'worker') {
          request.workerHours = hours;
          request.workerConfirmedAt = now;
        } else {
          request.receiverHours = hours;
          request.receiverConfirmedAt = now;
        }
        const outcome = getHourState(request);
        if (outcome === 'agreed') logMutualHours(request, hours, 'mutual');
        if (outcome === 'disputed') ensureHourReview(request);
        saveState();
        renderSharedMemberViews();
        renderExchanges();
        announce(outcome === 'agreed'
          ? `${hours} hours matched and were logged locally.`
          : outcome === 'disputed'
            ? 'The hour amounts differ. Evidence and a three-member review are now available.'
            : 'Your hours were saved locally. Waiting for the other side.');
        showToast(outcome === 'disputed' ? 'Hour difference sent to local review.' : 'Confirmation saved locally.', false);
        return;
      }

      if (form.matches('[data-hour-evidence]')) {
        event.preventDefault();
        const request = state.requests.find((item) => item && item.id === form.dataset.id
          && item.type === 'mutual_aid_request' && requestRole(item) !== 'none');
        if (!request) return;
        const note = cleanString(data.get('note'), 200);
        if (!note) return;
        const items = cleanEvidenceItems(request.evidence);
        if (items.length >= REPORT_EVIDENCE.maxItems) {
          showToast(`You can attach up to ${REPORT_EVIDENCE.maxItems} local evidence items.`, false);
          return;
        }
        items.push({
          kind: 'text',
          name: 'Exchange evidence note',
          mime: 'text/plain',
          size: note.length,
          caption: 'Local exchange note',
          submittedBy: state.pledge.name,
          text: note
        });
        request.evidence = cleanEvidenceItems(items);
        saveState();
        renderExchanges();
        announce('Evidence note attached locally.');
        showToast('Evidence note saved in this browser.', false);
        return;
      }

      if (form.matches('[data-hour-vote]')) {
        event.preventDefault();
        const request = state.requests.find((item) => item && item.id === form.dataset.id
          && item.type === 'mutual_aid_request' && requestRole(item) === 'none');
        if (!request) return;
        const review = ensureHourReview(request);
        const seatIndex = review && review.panel.findIndex((seat) => seat && seat.memberId === state.pledge.memberId);
        if (!review || seatIndex < 0) return;
        if (hasAnonymousVote(`hours:${request.id}`)) return;
        const hours = cleanHours(data.get('hours'));
        const reason = cleanString(data.get('reason'), 240);
        if (!(hours > 0) || !reason) return;
        review.votes.push({
          seatIndex,
          hours,
          reason,
          votedAt: now
        });
        recordAnonymousVote(`hours:${request.id}`);
        const finalized = finalizeHourReview(request);
        saveState();
        renderSharedMemberViews();
        renderExchanges();
        announce(finalized ? 'Three anonymous votes are in; the majority hours were logged locally.' : 'Your anonymous review vote was saved locally.');
        showToast(finalized ? 'Review resolved and hours logged locally.' : 'Review vote saved locally.', false);
        return;
      }

      if (form.matches('[data-account-form]')) {
        event.preventDefault();
        const data = new FormData(form);
        const sameAddress = Boolean(data.get('sameAddress'));
        const firstName = cleanString(data.get('firstName'), 40);
        const middleInitial = cleanString(data.get('middleInitial'), 2);
        const lastName = cleanString(data.get('lastName'), 60);
        const suffix = cleanString(data.get('suffix'), 12);
        const fullName = composeFullName({ firstName, middleInitial, lastName, suffix });
        const name = cleanString(data.get('name'), 60);
        const location = cleanString(data.get('location'), 80);
        if (!name || !location || !firstName || !lastName || !fullName) return;

        const address1 = cleanString(data.get('address1'), 100);
        const address2 = cleanString(data.get('address2'), 100);
        const city = cleanString(data.get('city'), 80);
        const county = normalizeCounty(data.get('county'));
        const stateCode = normalizeStateCode(data.get('state'));
        const zip = normalizeZip(data.get('zip'));
        if (!address1 || !city || !county || !stateCode || !zip) {
          announce('Complete every mailing address field before saving.');
          showToast('Complete every mailing address field before saving.', false);
          return;
        }
        const mailingAddress = composeMailingAddress({ address1, address2, city, state: stateCode, zip });

        const physicalAddress1 = sameAddress ? address1 : cleanString(data.get('physicalAddress1'), 100);
        const physicalAddress2 = sameAddress ? address2 : cleanString(data.get('physicalAddress2'), 100);
        const physicalCity = sameAddress ? city : cleanString(data.get('physicalCity'), 80);
        const physicalCounty = sameAddress ? county : normalizeCounty(data.get('physicalCounty'));
        const physicalState = sameAddress ? stateCode : normalizeStateCode(data.get('physicalState'));
        const physicalZip = sameAddress ? zip : normalizeZip(data.get('physicalZip'));
        if (!physicalAddress1 || !physicalCity || !physicalCounty || !physicalState || !physicalZip) {
          announce('Complete every physical address field before saving.');
          showToast('Complete every physical address field before saving.', false);
          return;
        }
        const physicalAddress = sameAddress
          ? mailingAddress
          : composeMailingAddress({
            address1: physicalAddress1,
            address2: physicalAddress2,
            city: physicalCity,
            state: physicalState,
            zip: physicalZip
          });

        const cell = cleanString(data.get('cellPhone'), 40);
        const samePhone = Boolean(data.get('samePhone'));
        const publicLine = samePhone ? cell : cleanString(data.get('publicPhoneNumber'), 40);
        const dob = cleanString(data.get('dob'), 10);
        const age = getAgeFromDob(dob);
        if (age === null || age < 18) {
          announce('Enter a valid date of birth. Members must be 18 or older.');
          showToast('Enter a valid date of birth. Members must be 18 or older.', false);
          return;
        }
        if (data.get('publicPhone') && !publicLine) {
          announce('Enter a public phone or choose the same as your cell before showing it on your resume.');
          showToast('Enter a public phone or choose the same as your cell before showing it on your resume.', false);
          return;
        }

        state.pledge.name = name;
        state.pledge.location = location;
        state.pledge.firstName = firstName;
        state.pledge.middleInitial = middleInitial;
        state.pledge.lastName = lastName;
        state.pledge.suffix = suffix;
        state.pledge.fullName = fullName;
        state.pledge.address1 = address1;
        state.pledge.address2 = address2;
        state.pledge.city = city;
        state.pledge.state = stateCode;
        state.pledge.zip = zip;
        state.pledge.county = county;
        state.pledge.mailingAddress = mailingAddress;
        state.pledge.physicalAddress1 = physicalAddress1;
        state.pledge.physicalAddress2 = physicalAddress2;
        state.pledge.physicalCity = physicalCity;
        state.pledge.physicalState = physicalState;
        state.pledge.physicalZip = physicalZip;
        state.pledge.physicalCounty = physicalCounty;
        state.pledge.physicalAddress = physicalAddress;
        state.pledge.dob = dob;
        state.pledge.housingStatus = normalizeHousingStatus(data.get('housingStatus'));
        state.pledge.paidSkills = cleanString(data.get('paidSkills'), 400);
        state.pledge.unpaidSkills = cleanString(data.get('unpaidSkills'), 400);
        state.pledge.bio = cleanString(data.get('bio'), 600);
        state.pledge.tagline = cleanString(data.get('tagline'), 90);
        state.pledge.cellPhone = cell;
        state.pledge.phone = cell;
        state.pledge.samePhone = samePhone;
        state.pledge.publicPhoneNumber = publicLine;
        state.pledge.receiveTexts = Boolean(data.get('receiveTexts'));
        state.pledge.publicPhone = Boolean(data.get('publicPhone')) && Boolean(publicLine);
        state.pledge.available = Boolean(data.get('available'));
        state.pledge.publicAddressSource = data.get('publicAddressSource') === 'physical' ? 'physical' : 'mailing';
        // Donation amounts are recorded through the donate flow. All commons
        // counts are derived only from mutual confirmation or review votes.
        const confirmedTotals = getConfirmedExchangeTotals(state.pledge.memberId);
        state.pledge.hoursCompleted = confirmedTotals.hoursWorked;
        state.pledge.hoursUsed = confirmedTotals.hoursUsed;
        state.pledge.itemsGifted = confirmedTotals.itemsGifted;
        state.pledge.itemsTaken = confirmedTotals.itemsTaken;
        state.pledge.group = getMemberGroups().map(groupDisplayLabel).filter(Boolean).join(', ');
        addMemberToRoster(state.pledge);
        if (data.get('removePicture')) {
          state.pledge.picture = '';
        } else {
          const pictureInput = form.querySelector('input[name="picture"]');
          const pictureFile = pictureInput && pictureInput.files ? pictureInput.files[0] : null;
          if (pictureFile) {
            const photo = await preparePostPhoto(pictureFile);
            if (!photo) {
              showToast('That image could not be resized locally. Try a smaller JPEG, PNG, WebP, or GIF.', false);
              return;
            }
            state.pledge.picture = safeProfileImageUrl(photo.dataUrl);
          }
        }
        syncTownGroup();
        saveState();
        renderAccountInfo();
        renderSharedMemberViews();
        renderVolunteerStatus();
        renderAccountability();
        announce('Your identity and contact details were saved in this browser.');
        showToast('Account details saved locally.', false);
      } else if (form.matches('[data-settings-form]')) {
        event.preventDefault();
        state.settings = {
          compactDashboard: Boolean(data.get('compactDashboard')),
          showPrototypeNotices: Boolean(data.get('showPrototypeNotices'))
        };
        saveState();
        renderSettings();
        renderDashboardGate();
        renderAccountInfo();
        announce('Your settings were saved in this browser.');
        showToast('Settings saved locally.', false);
      } else if (form.matches('[data-community-channel-form]')) {
        event.preventDefault();
        const name = cleanString(data.get('name'), 60);
        const purpose = cleanString(data.get('purpose'), 200);
        if (!name) return;
        const slug = communityChannelSlug(name);
        state.communityChannels = Array.isArray(state.communityChannels) ? state.communityChannels : defaultCommunityChannels();
        if (state.communityChannels.some((item) => item && (communityChannelSlug(item.name) === slug || item.id === `channel-${slug}`))) {
          showToast('A channel with that name already exists on this device.', false);
          return;
        }
        const channel = {
          id: `channel-${slug}`,
          name,
          purpose,
          createdBy: state.pledge.name || 'Member',
          createdAt: now
        };
        state.communityChannels.push(channel);
        addNotification('comment', `Community channel created: ${channel.name}`,
          'Saved locally. In a live system members could follow this channel; nothing was transmitted.',
          { tab: 'commons', sourceId: channel.id });
        saveState();
        renderCommons();
        renderNotifications();
        form.reset();
        announce(`Channel ${channel.name} was created locally.`);
        showToast('Channel created locally. Nothing was transmitted.', false);
      } else if (form.matches('[data-community-thread-form]')) {
        event.preventDefault();
        const channelId = cleanString(form.dataset.channelId, 100);
        const channel = findCommunityChannel(channelId);
        const subject = cleanString(data.get('subject'), 120);
        const body = cleanString(data.get('body'), 1200);
        if (!channel || !channel.name || !subject || !body) return;
        const picture = await prepareFormPostPhoto(form);
        if (picture === null) {
          showToast('That image could not be resized locally. Try a smaller JPEG, PNG, WebP, or GIF.', false);
          return;
        }
        const thread = {
          id: makeId('thread'),
          channelId: channel.id,
          subject,
          createdBy: state.pledge.name || 'Member',
          createdAt: now
        };
        const chat = {
          id: makeId('chat'),
          memberId: state.pledge.memberId,
          name: state.pledge.name || 'Member',
          channel: channel.name,
          channelId: channel.id,
          threadId: thread.id,
          subject,
          nsfw: Boolean(data.get('nsfw')),
          picture,
          body,
          createdAt: now
        };
        state.communityThreads = Array.isArray(state.communityThreads) ? state.communityThreads : [];
        state.communityThreads.push(thread);
        state.communityThreads = state.communityThreads.slice(-300);
        state.chats = Array.isArray(state.chats) ? state.chats : [];
        state.chats.push(chat);
        state.chats = state.chats.slice(-300);
        addNotification('comment', `Community thread: ${subject}`,
          `Saved locally in #${channel.name}. In a live system channel members would be notified; nothing was transmitted.`,
          { tab: 'commons', sourceId: chat.id });
        saveState();
        renderCommons();
        renderNotifications();
        form.reset();
        announce(`Thread ${subject} was started locally in ${channel.name}.`);
        showToast('Thread saved locally. Nothing was transmitted.', false);
      } else if (form.matches('[data-community-reply-form]')) {
        event.preventDefault();
        const threadId = cleanString(form.dataset.threadId, 100);
        const thread = findCommunityThread(threadId);
        if (!thread) return;
        const channel = findCommunityChannel(form.dataset.channelId || thread.channelId);
        if (!channel || !channel.name) return;
        const subject = cleanString(data.get('subject'), 120) || cleanString(thread.subject, 120);
        const body = cleanString(data.get('body'), 1200);
        if (!subject || !body) return;
        const picture = await prepareFormPostPhoto(form);
        if (picture === null) {
          showToast('That image could not be resized locally. Try a smaller JPEG, PNG, WebP, or GIF.', false);
          return;
        }
        const chat = {
          id: makeId('chat'),
          memberId: state.pledge.memberId,
          name: state.pledge.name || 'Member',
          channel: channel.name,
          channelId: channel.id,
          threadId: thread.id,
          subject,
          nsfw: Boolean(data.get('nsfw')),
          picture,
          body,
          createdAt: now
        };
        state.chats = Array.isArray(state.chats) ? state.chats : [];
        state.chats.push(chat);
        state.chats = state.chats.slice(-300);
        addNotification('comment', `Community reply: ${subject}`,
          `Saved locally in #${channel.name}. In a live system thread members would be notified; nothing was transmitted.`,
          { tab: 'commons', sourceId: chat.id });
        saveState();
        renderCommons();
        renderNotifications();
        const bodyField = form.querySelector('[name="body"]');
        if (bodyField) bodyField.value = '';
        const pictureField = form.querySelector('[name="picture"]');
        if (pictureField) pictureField.value = '';
        const nsfwField = form.querySelector('[name="nsfw"]');
        if (nsfwField) nsfwField.checked = false;
        announce(`Your reply in ${subject} was saved locally.`);
        showToast('Reply saved locally. Nothing was transmitted.', false);
      } else if (form.matches('[data-message-form]')) {
        event.preventDefault();
        const body = cleanString(data.get('body'), 1200);
        const toName = cleanString(data.get('toName'), 80);
        if (!body || !toName) return;
        state.messages = Array.isArray(state.messages) ? state.messages : [];
        const message = {
          id: makeId('message'),
          memberId: state.pledge.memberId,
          name: state.pledge.name,
          toName,
          body,
          createdAt: now,
          status: 'recorded',
          folder: 'sent',
          starred: false
        };
        state.messages.push(message);
        addNotification('message', `Message recorded to ${toName}`,
          'Saved locally as a draft. In a live system the recipient would be notified; no message was delivered.',
          { tab: 'messages', sourceId: message.id });
        state.messages = state.messages.slice(-300);
        activeMessageFolder = 'sent';
        saveState();
        renderMessages();
        renderNotifications();
        form.reset();
        announce('Your message was recorded in this browser.');
        showToast('Message recorded locally.', false);
      } else if (form.matches('[data-group-form]')) {
        event.preventDefault();
        const name = cleanString(data.get('name'), 80);
        const kind = data.get('kind') === 'own' ? 'own' : 'joined';
        const purpose = cleanString(data.get('purpose'), 200);
        if (kind !== 'own') {
          showToast('Search for a group and choose Request to join.', false);
          return;
        }
        if (!name || !state.pledge) return;
        const members = [{ memberId: state.pledge.memberId, name: state.pledge.name || 'You' }];
        data.getAll('members').forEach((value) => {
          const id = cleanString(value, 100);
          if (!id || id === state.pledge.memberId || members.some((item) => item.memberId === id)) return;
          const member = findMemberById(id);
          members.push({ memberId: id, name: member ? member.name : 'Member' });
        });
        if (members.length > SOCIAL_LIMITS.groupMembers) {
          showToast(`A group can hold up to ${SOCIAL_LIMITS.groupMembers} people.`, false);
          return;
        }
        state.groups = Array.isArray(state.groups) ? state.groups : [];
        if (kind === 'own' && state.groups.some((group) => group && group.kind === 'own')) {
          showToast('You can keep one local group as your own.', false);
          return;
        }
        const group = {
          id: makeId('group'),
          kind,
          name,
          purpose,
          members,
          memberCount: members.length,
          admins: [state.pledge.memberId],
          createdAt: now
        };
        state.groups.push(group);
        if (state.pledge) state.pledge.group = getMemberGroups().map(groupDisplayLabel).filter(Boolean).join(', ');
        addNotification('social', `${kind === 'own' ? 'Your group' : 'Group'} saved: ${name}`,
          `Recorded locally with ${group.memberCount} of ${SOCIAL_LIMITS.groupMembers} people. No invitations or membership changes were sent.`,
          { tab: 'social', sourceId: group.id });
        saveState();
        renderSocial();
        renderNotifications();
        form.reset();
        announce(`${name} was saved locally.`);
        showToast('Group saved locally with the 150-person cap.', false);
      } else if (form.matches('[data-social-chat-form]')) {
        event.preventDefault();
        const body = cleanString(data.get('body'), 1200);
        const title = cleanString(data.get('title'), 90);
        const audience = cleanString(data.get('audience'), 40) || 'friends';
        if (!body) return;
        let picture = [];
        const pictureInput = form.querySelector('input[name="picture"]');
        const pictureFile = pictureInput && pictureInput.files ? pictureInput.files[0] : null;
        if (pictureFile) {
          const photo = await preparePostPhoto(pictureFile);
          if (!photo) {
            showToast('That image could not be resized locally. Try a smaller JPEG, PNG, WebP, or GIF.', false);
            return;
          }
          picture = [photo];
        }
        let audienceLabel = `Friends (${(Array.isArray(state.friends) ? state.friends : []).length}/${SOCIAL_LIMITS.friends})`;
        if (audience.startsWith('town:') || audience.startsWith('own:') || audience.startsWith('joined:')) {
          const groupId = audience.slice(audience.indexOf(':') + 1);
          const group = (Array.isArray(state.groups) ? state.groups : [])
            .find((item) => item && item.id === groupId);
          if (group) {
            const label = group.kind === 'town' ? 'Main group' : group.kind === 'own' ? 'Your group' : 'Group';
            audienceLabel = `${label}: ${groupDisplayLabel(group)}`;
          }
        }
        const chat = {
          id: makeId('social-chat'),
          memberId: state.pledge.memberId,
          name: state.pledge.name,
          audience,
          audienceLabel,
          title,
          body,
          picture,
          createdAt: now
        };
        state.socialChats = Array.isArray(state.socialChats) ? state.socialChats : [];
        state.socialChats.push(chat);
        state.socialChats = state.socialChats.slice(-300);
        addNotification('comment', `Social chat draft: ${title || 'Untitled'}`,
          `Saved locally for ${audienceLabel}. In a live system the audience would be notified; nothing was delivered.`,
          { tab: 'social', sourceId: chat.id });
        saveState();
        renderSocial();
        renderNotifications();
        announce('Your social chat draft was recorded locally.');
        showToast('Chat draft saved locally. Nothing was delivered.', false);
      } else if (form.matches('[data-suggestion-form]')) {
        event.preventDefault();
        const text = cleanString(data.get('text'), 1200);
        if (!text) return;
        state.suggestions = Array.isArray(state.suggestions) ? state.suggestions : [];
        state.suggestions.unshift({
          id: makeId('suggestion'),
          memberId: state.pledge.memberId,
          name: state.pledge.name,
          category: cleanString(data.get('category'), 40) || 'general',
          text,
          createdAt: now,
          status: 'submitted'
        });
        state.suggestions = state.suggestions.slice(0, 200);
        saveState();
        renderSuggestions();
        form.reset();
        announce('Your suggestion was submitted in this browser.');
        showToast('Suggestion saved locally.', false);
      }
    });

    renderDashboard();

    // The header bell links here with a hash so members open notifications directly.
    const initialPanel = window.location.hash.replace('#', '');
    if (['overview', 'settings', 'commons', 'exchanges', 'messages', 'review', 'social', 'notifications', 'suggestions'].includes(initialPanel)) {
      setDashboardTab(initialPanel);
    }
  }

  /* ------------------------------------------------------------------------
     05a-2. Safety & accountability (member dashboard)
     ------------------------------------------------------------------------ */
  function reportStatusLabel(status) {
    const labels = {
      response_period: 'Response period · evidence gathering',
      board_review: 'Member review · 3-day vote',
      police_referral: 'Police referral recorded',
      restriction_active: 'Reflection · access restricted',
      not_guilty: 'Found not guilty',
      access_restored: 'Full access restored'
    };
    return labels[status] || status;
  }

  function votingRemaining(report) {
    if (report.demoVotingClosed) return 'Voting closed';
    const end = Date.parse(report.votingEndsAt);
    if (!end) return 'Voting closed';
    const ms = end - Date.now();
    if (ms <= 0) return 'Voting closed';
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    return `${days} day${days === 1 ? '' : 's'} ${hours} hour${hours === 1 ? '' : 's'} left`;
  }

  function pickMajorityValue(values) {
    if (!values.length) return REFLECTION_OPTIONS[0];
    const counts = {};
    values.forEach((value) => { counts[value] = (counts[value] || 0) + 1; });
    return Object.keys(counts).map(Number).sort((a, b) => a - b)
      .reduce((best, value) => (counts[value] > counts[best] ? value : best));
  }

  function resolveAccountabilityReport(report) {
    const votes = Array.isArray(report.votes) ? report.votes : [];
    const guilty = votes.filter((vote) => vote.verdict === 'guilty').length;
    const notGuilty = votes.filter((vote) => vote.verdict === 'not_guilty').length;
    const now = new Date();

    if (guilty > notGuilty) {
      const days = pickMajorityValue(votes.filter((vote) => vote.reflectionDays).map((vote) => vote.reflectionDays));
      report.reflectionDays = days;
      report.restrictionStart = now.toISOString();
      report.restrictionEnd = new Date(now.getTime() + (days * 86400000)).toISOString();
      report.status = 'restriction_active';
      announce(`Member found guilty. Reflection period set to ${days} days.`);
    } else {
      report.status = 'not_guilty';
      announce('Member found not guilty. No restriction applied.');
    }
    report.resolutionAt = now.toISOString();
    saveState();
    renderAccountability();
    showToast('Voting closed and case resolved locally.', false);
  }

  async function prepareReportEvidence(file) {
    const base = {
      id: makeId('evidence'),
      name: cleanString(file.name, 120) || 'Evidence',
      mime: cleanString(file.type, 80),
      size: Number(file.size) || 0,
      caption: '',
      addedAt: new Date().toISOString(),
      kind: 'file'
    };

    if (base.size > REPORT_EVIDENCE.maxFileBytes) {
      return { ...base, note: 'Too large to store locally; details only.' };
    }

    if (REPORT_EVIDENCE.imageTypes.includes(file.type)) {
      try {
        const sourceUrl = await readFileAsDataUrl(file);
        const image = await new Promise((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = () => reject(new Error('image-failed'));
          element.src = sourceUrl;
        });
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!width || !height) return { ...base, note: 'Image could not be previewed; details only.' };
        const scale = Math.min(1, 1200 / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        if (!context) return { ...base, note: 'Image preview unavailable; details only.' };
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        if (dataUrl.length > REPORT_EVIDENCE.maxDataLength) {
          return { ...base, note: 'Image too large after resizing; details only.' };
        }
        return { ...base, kind: 'image', mime: 'image/jpeg', dataUrl };
      } catch (error) {
        return { ...base, note: 'Image could not be read; details only.' };
      }
    }

    const isText = file.type.startsWith('text/') || /\.(txt|csv|json|jsonl|md|log|xml)$/i.test(file.name);
    if (isText) {
      try {
        const slice = typeof file.slice === 'function'
          ? file.slice(0, REPORT_EVIDENCE.maxTextLength * 2)
          : file;
        const text = cleanString(await readFileAsText(slice), REPORT_EVIDENCE.maxTextLength);
        if (!text) return { ...base, note: 'Text file was empty; details only.' };
        return { ...base, kind: 'text', mime: file.type || 'text/plain', text };
      } catch (error) {
        return { ...base, note: 'Text file could not be read; details only.' };
      }
    }

    return { ...base, note: 'File selected locally; this prototype stores details only, not the file itself.' };
  }

  function renderEvidenceDraft(form) {
    const list = form && form.querySelector('[data-report-evidence-list]');
    if (!list) return;
    const entries = reportEvidenceDrafts.get(form) || [];
    const e = escapeHtml;

    if (!entries.length) {
      list.innerHTML = '';
      return;
    }
    list.innerHTML = `<ul class="evidence-list evidence-list--draft">${entries.map((item) => `
      <li class="evidence-item">
        ${item.kind === 'image' && item.dataUrl ? `<img class="evidence-thumb" src="${item.dataUrl}" alt="Preview of ${e(item.name)}">` : ''}
        <strong>${e(item.name)}</strong>
        <span class="contribution-meta">${e([item.kind === 'image' ? 'Image' : item.kind === 'text' ? 'Text / messages' : 'File details', formatBytes(item.size)].join(' · '))}${item.note ? ` · ${e(item.note)}` : ''}</span>
        <button type="button" class="button button--ghost button--small" data-action="remove-report-evidence" data-evidence-id="${e(item.id)}" aria-label="Remove ${e(item.name)}">Remove</button>
      </li>`).join('')}</ul>`;
  }

  async function addReportEvidence(form, files, session) {
    if (!form || !files || !files.length) return;
    const status = form.querySelector('[data-report-evidence-status]');
    const existing = reportEvidenceDrafts.get(form) || [];
    const room = REPORT_EVIDENCE.maxItems - existing.length;
    if (room <= 0) {
      if (status) status.textContent = `You can attach up to ${REPORT_EVIDENCE.maxItems} items.`;
      return;
    }

    const selected = Array.from(files).slice(0, room);
    if (status) status.textContent = `Reading ${selected.length} item${selected.length === 1 ? '' : 's'} locally…`;
    const prepared = await Promise.all(selected.map(prepareReportEvidence));
    if (session && form.dataset.reportSession !== session) return;
    const next = [...existing, ...prepared];
    reportEvidenceDrafts.set(form, next);
    renderEvidenceDraft(form);

    const skipped = files.length - selected.length;
    const parts = [`Added ${prepared.length} local evidence item${prepared.length === 1 ? '' : 's'}.`];
    if (skipped > 0) parts.push(`Only ${REPORT_EVIDENCE.maxItems} items can be attached.`);
    parts.push('Nothing was transmitted.');
    const message = parts.join(' ');
    if (status) status.textContent = message;
    announce(message);
  }

  async function fileAccountabilityReport(form) {
    const pending = reportEvidencePending.get(form);
    if (pending) await pending;

    const data = new FormData(form);
    const type = cleanString(data.get('type'), 40);
    const meta = hasOwn(REPORT_TYPES, type) ? REPORT_TYPES[type] : null;
    const description = cleanString(data.get('description'), 1200);
    if (!meta || !description || !data.get('goodFaith')) return;

    const adminReview = data.get('adminReview') === 'true';
    const evidence = cleanEvidenceItems(reportEvidenceDrafts.get(form) || []);
    if (adminReview && meta.route === 'criminal') {
      showToast('An admin review must be a non-criminal matter. Use a police referral for suspected crimes.', false);
      return;
    }
    if (adminReview && !evidence.length) {
      showToast('A temporary admin review needs at least one evidence item.', false);
      return;
    }

    const now = new Date();
    const isCriminal = meta.route === 'criminal';
    const reporterPlace = reviewMemberLocation(state.pledge.memberId);
    const respondentPlace = reviewMemberLocation(cleanString(data.get('respondentMemberId'), 100));
    const report = {
      id: makeId('report'),
      reporterMemberId: state.pledge.memberId,
      reporterName: state.pledge.name,
      reporterCounty: reporterPlace.county,
      reporterState: reporterPlace.state,
      respondentName: cleanString(data.get('respondentName'), 80),
      respondentMemberId: cleanString(data.get('respondentMemberId'), 100),
      respondentCounty: respondentPlace.county,
      respondentState: respondentPlace.state,
      contextArea: cleanString(data.get('contextArea'), 80) || 'Dashboard',
      contextDetail: cleanString(data.get('contextDetail'), 160),
      sourceId: cleanString(data.get('sourceId'), 100),
      evidence,
      type,
      typeLabel: meta.label,
      route: meta.route,
      adminReview,
      temporaryAdmin: adminReview && data.get('temporaryAdmin') === 'true',
      groupId: cleanString(data.get('groupId'), 100),
      reviewBasis: adminReview ? 'impartial member review' : meta.route,
      description,
      occurredAt: cleanString(data.get('occurredAt'), 20),
      createdAt: now.toISOString(),
      status: isCriminal ? 'police_referral' : 'response_period',
      responseDeadlineAt: isCriminal ? '' : new Date(now.getTime() + (RESPONSE_DAYS * DAY_MS)).toISOString(),
      response: null,
      comments: [],
      votes: [],
      votingEndsAt: '',
      demoVotingClosed: false,
      votingNotices: [],
      reflectionDays: null,
      restrictionStart: '',
      restrictionEnd: '',
      treatmentSteps: { evaluation: false, plan: false, treatment: false },
      resolutionAt: '',
      policeReferral: isCriminal ? {
        createdAt: now.toISOString(),
        status: 'referral_recorded',
        note: 'Recorded as a police referral for investigation under local and federal law. This prototype does not contact authorities.'
      } : null
    };

    state.reports = Array.isArray(state.reports) ? state.reports : [];
    state.reports.unshift(report);
    state.reports = state.reports.slice(0, 200);
    saveState();
    reportEvidenceDrafts.delete(form);
    form.reset();
    renderEvidenceDraft(form);
    renderAccountability();
    if (reportDialog && reportDialog.open) closeDialog(reportDialog);
    announce(isCriminal
      ? 'Criminal matter recorded as a police referral. In a live system it would be referred to police for investigation. Nothing was transmitted in this prototype.'
      : adminReview
        ? `Temporary admin review filed from ${report.contextArea}. Evidence stayed in this browser. An impartial member review follows the response period.`
        : `Report filed from ${report.contextArea}. Evidence stayed in this browser. The response period is open.`);
    showToast(isCriminal ? 'Police referral recorded (prototype only).' : adminReview ? 'Admin review filed. Impartial review is required.' : 'Report filed. Response period is open.', false);
  }

  // One report form is shared by every contextual trigger. The person being
  // reported is supplied by the page (listing, message, or profile), never by
  // a free-text name field in the report itself.
  function buildReportDialog() {
    if (reportDialog) return reportDialog;

    const dialog = document.createElement('dialog');
    dialog.className = 'dialog dialog--report';
    dialog.id = 'report-dialog';
    dialog.setAttribute('aria-labelledby', 'report-dialog-title');
    dialog.setAttribute('aria-describedby', 'report-dialog-intro');
    dialog.innerHTML = `
      <div class="dialog-shell">
        <div class="dialog-top">
          <p class="eyebrow">Safety &amp; accountability</p>
          <button class="icon-button" type="button" data-dialog-close aria-label="Close the report form">
            <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-close"></use></svg>
          </button>
        </div>
        <div class="dialog-content">
          <h2 id="report-dialog-title">Report a concern</h2>
          <p id="report-dialog-intro">This report is tied to your member record. The person is carried over from the listing, message, or profile where you opened this form—you do not type their name.</p>
          <p class="dialog-note" data-report-context-summary role="status"></p>
          <p class="dialog-note" data-report-admin-note hidden>Temporary admin review: evidence is required, and an impartial member review follows the response period. Criminal matters are never decided by member vote.</p>
          <form class="account-form report-form" data-report-form>
            <input type="hidden" name="respondentName" value="">
            <input type="hidden" name="respondentMemberId" value="">
            <input type="hidden" name="contextArea" value="Dashboard">
            <input type="hidden" name="contextDetail" value="">
            <input type="hidden" name="sourceId" value="">
            <input type="hidden" name="adminReview" value="">
            <input type="hidden" name="temporaryAdmin" value="">
            <input type="hidden" name="groupId" value="">
            <div class="field">
              <label for="report-dialog-type">What are you reporting? <span class="required-mark" aria-hidden="true">*</span></label>
              <select id="report-dialog-type" name="type" required>
                <option value="">Choose a type…</option>
                <optgroup label="Reviewed by members (not a crime)">
                  ${Object.keys(REPORT_TYPES).filter((key) => REPORT_TYPES[key].route === 'board').map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(REPORT_TYPES[key].label)}</option>`).join('')}
                </optgroup>
                <optgroup label="Criminal matter — police referral" data-report-criminal-options>
                  ${Object.keys(REPORT_TYPES).filter((key) => REPORT_TYPES[key].route === 'criminal').map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(REPORT_TYPES[key].label)}</option>`).join('')}
                </optgroup>
              </select>
            </div>
            <div class="field">
              <label for="report-dialog-when">When did it happen? <span class="optional">(optional)</span></label>
              <input type="date" id="report-dialog-when" name="occurredAt">
            </div>
            <div class="field">
              <label for="report-dialog-description">What happened? <span class="required-mark" aria-hidden="true">*</span></label>
              <textarea id="report-dialog-description" name="description" rows="4" maxlength="1200" required placeholder="Describe what happened and where. The person or listing is already attached above."></textarea>
              <p class="field-hint">Up to 1200 characters. Stored with your member record in this browser only.</p>
            </div>
            <fieldset class="evidence-fieldset">
              <legend data-report-evidence-legend>Local evidence <span class="optional">(optional)</span></legend>
              <p class="field-hint">Select images, text or message files, or other files from this device. Images are resized and saved locally; text files are copied locally; other files are recorded by name and size only. Up to ${REPORT_EVIDENCE.maxItems} items, 8 MB each. Nothing is uploaded or transmitted.</p>
              <input type="file" id="report-evidence-input" name="evidenceFiles" multiple accept="${REPORT_EVIDENCE.accepted}">
              <p class="evidence-status" data-report-evidence-status role="status"></p>
              <div data-report-evidence-list></div>
            </fieldset>
            <label class="checkbox">
              <input type="checkbox" name="goodFaith" required>
              <span>I confirm this report is made in good faith and is true to the best of my knowledge.</span>
            </label>
            <div class="account-form-actions">
              <button type="submit" class="button button--primary button--small">File report</button>
              <button type="button" class="button button--ghost button--small" data-dialog-close>Cancel</button>
              <p class="form-hint">Named reporter · local evidence only · nothing transmitted</p>
            </div>
          </form>
        </div>
      </div>`;

    document.body.appendChild(dialog);
    reportDialog = dialog;

    const form = dialog.querySelector('[data-report-form]');
    const fileInput = dialog.querySelector('#report-evidence-input');
    const status = dialog.querySelector('[data-report-evidence-status]');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!requireMembership()) return;
      if (!form.reportValidity()) return;
      fileAccountabilityReport(form);
    });

    form.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="remove-report-evidence"]');
      if (!button || !form.contains(button)) return;
      const id = cleanString(button.dataset.evidenceId, 60);
      const entries = reportEvidenceDrafts.get(form) || [];
      const removed = entries.find((item) => item.id === id);
      reportEvidenceDrafts.set(form, entries.filter((item) => item.id !== id));
      renderEvidenceDraft(form);
      if (status) status.textContent = removed ? `Removed ${removed.name}. Nothing was transmitted.` : '';
    });

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (!fileInput.files || !fileInput.files.length) return;
        if (!form.dataset.reportSession) form.dataset.reportSession = makeId('report-session');
        const session = form.dataset.reportSession;
        const task = addReportEvidence(form, fileInput.files, session);
        reportEvidencePending.set(form, task);
        task.finally(() => {
          if (reportEvidencePending.get(form) === task) reportEvidencePending.delete(form);
          fileInput.value = '';
        });
      });
    }

    dialog.querySelectorAll('[data-dialog-close]').forEach((button) => {
      button.addEventListener('click', () => closeDialog(dialog));
    });

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });

    dialog.addEventListener('close', () => {
      form.dataset.reportSession = makeId('report-session');
      reportEvidenceDrafts.delete(form);
      reportEvidencePending.delete(form);
      form.reset();
      renderEvidenceDraft(form);
      if (status) status.textContent = '';
    });

    return dialog;
  }

  function openReportDialog(context, trigger) {
    if (!requireMembership()) return;
    const dialog = buildReportDialog();
    const form = dialog.querySelector('[data-report-form]');
    const summary = dialog.querySelector('[data-report-context-summary]');

    const area = cleanString(context && context.area, 80) || 'Dashboard';
    const detail = cleanString(context && context.detail, 160);
    const name = cleanString(context && context.name, 80);
    const memberId = cleanString(context && context.memberId, 100);
    const sourceId = cleanString(context && context.sourceId, 100);
    const adminReview = Boolean(context && context.adminReview);
    const temporaryAdmin = Boolean(context && context.temporaryAdmin);
    const groupId = cleanString(context && context.groupId, 100);

    const setField = (fieldName, value) => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (input) input.value = value;
    };

    form.dataset.reportSession = makeId('report-session');
    form.reset();
    reportEvidenceDrafts.delete(form);
    reportEvidencePending.delete(form);
    renderEvidenceDraft(form);
    const status = form.querySelector('[data-report-evidence-status]');
    if (status) status.textContent = '';

    setField('respondentName', name);
    setField('respondentMemberId', memberId);
    setField('contextArea', area);
    setField('contextDetail', detail);
    setField('sourceId', sourceId);
    setField('adminReview', adminReview ? 'true' : '');
    setField('temporaryAdmin', adminReview && temporaryAdmin ? 'true' : '');
    setField('groupId', groupId);

    const adminNote = dialog.querySelector('[data-report-admin-note]');
    if (adminNote) adminNote.hidden = !adminReview;
    const evidenceLegend = dialog.querySelector('[data-report-evidence-legend]');
    if (evidenceLegend) evidenceLegend.innerHTML = adminReview
      ? 'Local evidence <span class="required-mark" aria-hidden="true">*</span> <span class="optional">(required for admin review)</span>'
      : 'Local evidence <span class="optional">(optional)</span>';
    const criminalOptions = dialog.querySelector('[data-report-criminal-options]');
    if (criminalOptions) {
      criminalOptions.hidden = adminReview;
      Array.from(criminalOptions.querySelectorAll('option')).forEach((option) => {
        option.disabled = adminReview;
      });
    }
    const typeSelect = form.querySelector('[name="type"]');
    if (typeSelect && adminReview && hasOwn(REPORT_TYPES, typeSelect.value) && REPORT_TYPES[typeSelect.value].route === 'criminal') {
      typeSelect.value = 'other-board';
    }

    const parts = [`Reporting from ${area}`];
    if (detail) parts.push(detail);
    if (name) parts.push(`about ${name}`);
    else parts.push('about a general concern');
    if (summary) {
      summary.textContent = `${parts.join(' · ')}. The name was filled from this page, not typed by you.${adminReview
        ? ' A current admin is requiring an impartial review: evidence is required and a member review follows the response period.'
        : ''}`;
    }

    dialog._returnFocus = trigger instanceof HTMLElement ? trigger : null;
    openDialog(dialog);
  }

  function initReportDialog() {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-report-context]');
      if (!trigger) return;
      event.preventDefault();
      openReportDialog({
        area: trigger.dataset.reportArea,
        detail: trigger.dataset.reportDetail,
        name: trigger.dataset.reportName,
        memberId: trigger.dataset.reportMemberId,
        sourceId: trigger.dataset.reportSourceId,
        adminReview: trigger.dataset.reportAdminReview === 'true',
        temporaryAdmin: trigger.dataset.reportTemporaryAdmin === 'true',
        groupId: trigger.dataset.reportGroupId || ''
      }, trigger);
    });
  }

  function castAccountabilityVote(reportId, data) {
    if (!isMember()) return;
    const report = allReports().find((item) => item.id === reportId);
    if (!report || report.status !== 'board_review') return;
    if (hasAnonymousVote(`case:${report.id}`)) return;
    if (reviewVoteBlockReason(report, state.pledge.memberId)) return;
    if (report.demoVotingClosed || (report.votingEndsAt && Date.now() > Date.parse(report.votingEndsAt))) return;

    const verdict = data.verdict === 'guilty' ? 'guilty' : data.verdict === 'not_guilty' ? 'not_guilty' : '';
    if (!verdict) return;
    const days = REFLECTION_OPTIONS.includes(Number(data.reflectionDays)) ? Number(data.reflectionDays) : REFLECTION_OPTIONS[0];

    report.votes = Array.isArray(report.votes) ? report.votes : [];
    report.votes.push({
      verdict,
      reflectionDays: verdict === 'guilty' ? days : null,
      reason: cleanString(data.reason, 600),
      votedAt: new Date().toISOString()
    });
    recordAnonymousVote(`case:${report.id}`);
    saveState();
    renderAccountability();
    announce(`Anonymous vote recorded: ${verdict === 'guilty' ? 'guilty' : 'not guilty'}, with your reason attached.`);
    showToast('Anonymous vote and reason recorded locally.', false);
  }

  function submitRespondentResponse(reportId, form) {
    if (!isMember()) return;
    syncReportPhases();
    const report = allReports().find((item) => item.id === reportId);
    if (!report || report.status !== 'response_period' || !isRespondent(report)) return;

    const data = new FormData(form);
    const plea = data.get('plea') === 'guilty' ? 'guilty' : data.get('plea') === 'not_guilty' ? 'not_guilty' : '';
    if (!plea) return;

    const media = [];
    for (let i = 1; i <= 3; i += 1) {
      const url = cleanString(data.get(`mediaUrl${i}`), 500);
      const caption = cleanString(data.get(`mediaCaption${i}`), 200);
      const type = cleanString(data.get(`mediaType${i}`), 20);
      if (url || caption) {
        media.push({ type: hasOwn(MEDIA_TYPES, type) ? type : 'document', url, caption });
      }
    }

    const now = new Date();
    report.response = {
      plea,
      explanation: cleanString(data.get('explanation'), 2000),
      media,
      submittedAt: now.toISOString()
    };
    report.status = 'board_review';
    report.votingEndsAt = new Date(now.getTime() + (VOTING_DAYS * DAY_MS)).toISOString();
    notifyEligibleVoters(report);
    saveState();
    renderAccountability();
    announce('Your plea and evidence were recorded. Member voting is now open.');
    showToast('Response recorded. Voting is now open.', false);
  }

  function addAccountabilityComment(reportId, data) {
    if (!isMember()) return;
    const report = allReports().find((item) => item.id === reportId);
    if (!report || report.route !== 'board') return;
    const text = cleanString(data.get('text'), 800);
    if (!text) return;

    report.comments = Array.isArray(report.comments) ? report.comments : [];
    report.comments.unshift({
      id: makeId('comment'),
      memberId: state.pledge.memberId,
      name: state.pledge.name,
      text,
      createdAt: new Date().toISOString()
    });
    report.comments = report.comments.slice(0, 200);
    addNotification('comment', 'Case file comment recorded',
      `Your comment on ${report.title || 'a review case'} is stored locally. In a live system the case participants would be notified; nothing was transmitted.`,
      { tab: 'review', sourceId: report.comments[0] && report.comments[0].id });
    saveState();
    renderAccountability();
    renderNotifications();
    announce('Your comment was added to the case file.');
    showToast('Comment added locally.', false);
  }

  function responseRemaining(report) {
    if (report.status !== 'response_period') return '';
    const end = Date.parse(report.responseDeadlineAt);
    if (Number.isNaN(end)) return 'Response period open';
    const ms = end - Date.now();
    if (ms <= 0) return 'Response period ended';
    const days = Math.floor(ms / DAY_MS);
    const hours = Math.floor((ms % DAY_MS) / 3600000);
    return `${days} day${days === 1 ? '' : 's'} ${hours} hour${hours === 1 ? '' : 's'} to gather evidence`;
  }

  function renderCaseFile(report, e) {
    const response = report.response;
    const media = response && Array.isArray(response.media) ? response.media : [];
    let html = `<div class="case-file">
      <p class="case-file-label">Case file · stored in this browser only</p>
      <dl class="case-file-meta">
        <div><dt>Report type</dt><dd>${e(report.typeLabel || report.type)}</dd></div>
        <div><dt>Filed by</dt><dd>${e(report.reporterName || 'Member')}${report.reporterMemberId ? ` · ${e(report.reporterMemberId)}` : ''}</dd></div>
        <div><dt>Reported member</dt><dd>${e(report.respondentName || 'not specified')}</dd></div>
        <div><dt>Reported from</dt><dd>${e(getReportContextSummary(report))}</dd></div>
        ${report.occurredAt ? `<div><dt>When it happened</dt><dd>${e(report.occurredAt)}</dd></div>` : ''}
        <div><dt>Filed on</dt><dd>${e(formatDate(report.createdAt))}</dd></div>
      </dl>
      ${report.adminReview ? `<p class="case-file-section-title">Impartial review required</p>
      <p class="case-file-text">${report.temporaryAdmin ? 'Filed by a temporary admin.' : 'Filed by a current admin.'} Evidence was required, and an impartial member review follows the response period. Criminal matters are never decided by member vote.</p>` : ''}
      <p class="case-file-section-title">What was reported</p>
      <p class="case-file-text">${e(report.description)}</p>
      <p class="case-file-section-title">Evidence from the person reporting</p>
      ${renderEvidenceList(report.evidence, e)}
      <p class="case-file-section-title">Response from the reported member</p>`;

    if (response && response.plea) {
      html += `<p class="case-response-plea"><strong>Plea:</strong> ${e(response.plea === 'guilty' ? 'Guilty' : 'Not guilty')}${response.submittedAt ? ` · submitted ${e(formatDate(response.submittedAt))}` : ''}</p>
        <p class="case-file-text">${e(response.explanation || 'No written explanation was provided.')}</p>`;
      if (media.length) {
        html += `<ul class="media-list">${media.map((item) => {
          const url = safeMediaUrl(item.url);
          return `<li><span class="media-kind">${e(MEDIA_TYPES[item.type] || 'Link')}</span> ${url ? `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(url)}</a>` : e(item.url || 'No link provided')}${item.caption ? ` — ${e(item.caption)}` : ''}</li>`;
        }).join('')}</ul>`;
      } else {
        html += `<p class="account-note">No multimedia evidence was attached.</p>`;
      }
    } else {
      html += `<p class="account-note">${report.status === 'response_period'
        ? 'No response submitted yet. The reported member may still plead and add evidence during the response period.'
        : 'No response was submitted in this local record.'}</p>`;
    }
    return `${html}</div>`;
  }

  function renderCaseComments(report, e) {
    const comments = Array.isArray(report.comments) ? report.comments : [];
    return `<div class="case-comments">
      <p class="case-file-section-title">Member comments (${comments.length})</p>
      ${comments.length ? `<ul class="comment-list">${comments.map((comment) => `
        <li class="comment-item">
          <p class="contribution-meta"><strong>${e(comment.name || 'Member')}</strong> · ${e(formatDate(comment.createdAt))}</p>
          <p>${e(comment.text)}</p>
        </li>`).join('')}</ul>` : `<p class="account-note">No comments yet. Members can voice their opinions below.</p>`}
      <form class="account-form comment-form" data-comment-form data-id="${e(report.id)}">
        <div class="field">
          <label for="comment-${e(domId(report.id))}">Add a comment <span class="required-mark" aria-hidden="true">*</span></label>
          <textarea id="comment-${e(domId(report.id))}" name="text" rows="2" maxlength="800" required placeholder="Share your view on this matter. Recorded locally with your name."></textarea>
          <p class="field-hint">Comments are named and stored in this browser only. Up to 800 characters.</p>
        </div>
        <button type="submit" class="button button--outline button--small">Post comment</button>
      </form>
    </div>`;
  }

  function renderResponseForm(report, e) {
    const id = e(domId(report.id));
    return `<form class="account-form response-form" data-response-form data-id="${e(report.id)}">
      <p class="account-note">You are the reported member. You may plead guilty or not guilty, explain why if you choose, and add links to evidence. In a live system this would accept direct video, audio, and image uploads; this prototype records links and text only. The person reporting can attach local evidence in the report form; nothing is transmitted.</p>
      <fieldset class="vote-fieldset"><legend>1. Your plea</legend>
        <label class="radio-choice"><input type="radio" name="plea" value="guilty" required> Guilty</label>
        <label class="radio-choice"><input type="radio" name="plea" value="not_guilty" required> Not guilty</label>
      </fieldset>
      <div class="field">
        <label for="response-explanation-${id}">2. Explain why <span class="optional">(optional)</span></label>
        <textarea id="response-explanation-${id}" name="explanation" rows="4" maxlength="2000" placeholder="Tell the board your side of the story."></textarea>
        <p class="field-hint">Up to 2000 characters. Stored with your plea in this browser only.</p>
      </div>
      <p class="account-note"><strong>3. Evidence</strong> — add links to video, audio, images, or documents. Leave blank if you have none.</p>
      ${[1, 2, 3].map((i) => `<div class="media-row">
        <select name="mediaType${i}" aria-label="Media type ${i}">
          ${Object.keys(MEDIA_TYPES).map((key) => `<option value="${e(key)}">${e(MEDIA_TYPES[key])}</option>`).join('')}
        </select>
        <input type="url" name="mediaUrl${i}" maxlength="500" placeholder="https://…" aria-label="Media link ${i}">
        <input type="text" name="mediaCaption${i}" maxlength="200" placeholder="Caption (optional)" aria-label="Media caption ${i}">
      </div>`).join('')}
      <div class="account-form-actions">
        <button type="submit" class="button button--primary button--small">Submit plea and evidence</button>
        <button type="button" class="button button--ghost button--small" data-action="skip-response" data-id="${e(report.id)}">Skip response (open voting)</button>
      </div>
    </form>`;
  }

  function renderAccountability() {
    const panel = document.getElementById('accountability-panel');
    if (!panel) return;
    syncReportPhases();

    if (!isMember()) {
      panel.innerHTML = `
        <section class="account-card accountability-card" aria-labelledby="accountability-title">
          <p class="eyebrow">Member dashboard</p>
          <h3 id="accountability-title">Safety &amp; accountability</h3>
          <p class="account-note">Reporting, member review, and access decisions live in the member dashboard. Sign the Unbought Pledge to become a member and access them.</p>
        </section>`;
      return;
    }

    const member = state.pledge;
    const reports = allReports();
    const mine = getMemberReports();
    const aboutMe = reportsAboutMember();
    const restriction = getActiveRestriction();
    const openReports = reports.filter((report) => report && ['response_period', 'board_review'].includes(report.status));
    openReports.filter((report) => report.status === 'board_review').forEach(notifyEligibleVoters);
    const resolved = reports.filter((report) => report && ['restriction_active', 'not_guilty', 'access_restored'].includes(report.status)).slice(0, 8);
    const e = escapeHtml;

    let html = `<section class="account-card accountability-card" aria-labelledby="accountability-title">
      <p class="eyebrow">Member dashboard · Safety</p>
      <h3 id="accountability-title">Safety &amp; accountability</h3>
      <p class="account-note">Members file reports tied to their own member record; the person being reported is taken from the interaction, not typed by the reporter. Criminal matters are recorded as police referrals for investigation under local and federal law; they are never decided by a member vote. For non-criminal matters, the reported member gets ${RESPONSE_DAYS} days to gather evidence and plead guilty or not guilty with an explanation and multimedia links. Then all members get ${VOTING_DAYS} days to read the complete case file, comment, and vote on guilt, on the reflection period if guilty, and on a reason for their vote. Everything is visible on this dashboard. This prototype records it all locally—nothing is transmitted.</p>`;

    if (restriction) {
      const complete = isRestrictionComplete(restriction);
      const steps = restriction.treatmentSteps || {};
      const stepsDone = TREATMENT_STEPS.every((step) => Boolean(steps[step.key]));
      const periodDone = !restriction.restrictionEnd || Date.now() >= Date.parse(restriction.restrictionEnd);
      const remaining = Math.max(0, Math.ceil((Date.parse(restriction.restrictionEnd) - Date.now()) / 86400000));
      html += `
        <div class="restriction-banner ${complete ? 'is-complete' : ''}" role="status">
          <h4>${complete ? 'Eligible for full access' : 'Access restriction active'}</h4>
          <p>Case ${e(restriction.id)} · ${e(restriction.reflectionDays || 0)}-day reflection ${e(formatDate(restriction.restrictionStart))} – ${e(formatDate(restriction.restrictionEnd))}${complete ? '' : ` · ${remaining} day${remaining === 1 ? '' : 's'} remaining`}.</p>
          <p><strong>Allowed during reflection:</strong> health care, food, mental health care, legal services, and housing at lower priority if you are on a waiting list. Posting, requesting, track management, volunteering, and other full-access activities are paused.</p>
          <p><strong>Required to regain full access:</strong> a therapeutic evaluation (inside or outside Unbought), the recommended treatment plan, and completing or sustaining that treatment.</p>
          <ul class="treatment-list">
            ${TREATMENT_STEPS.map((step) => {
              const done = Boolean(steps[step.key]);
              return `<li><button type="button" class="treatment-step ${done ? 'is-done' : ''}" data-action="toggle-step" data-id="${e(restriction.id)}" data-step="${step.key}" aria-pressed="${done}">${done ? '✓' : '○'} ${e(step.label)}</button></li>`;
            }).join('')}
          </ul>
          ${complete ? `<button type="button" class="button button--primary button--small" data-action="restore-access" data-id="${e(restriction.id)}">Restore full access</button>` : stepsDone && !periodDone ? `<button type="button" class="button button--outline button--small" data-action="complete-period" data-id="${e(restriction.id)}">Mark reflection period complete (demo)</button>` : ''}
        </div>`;
    } else if (aboutMe.some((report) => report.status === 'access_restored')) {
      html += `<p class="account-note">Your full access has been restored after a completed reflection and treatment.</p>`;
    }

    html += `
      <div class="account-block">
        <h4>File a report</h4>
        <p class="account-note">Filed under ${e(member.name)}. You do not type the person's name: open <strong>Report</strong> from the listing, message, or profile where the interaction happened. The context is carried into the form automatically.</p>
        <button class="button button--outline button--small" type="button" data-report-context data-report-area="Dashboard" data-report-detail="Accountability panel" data-report-source-id="dashboard">Report a concern</button>
        <p class="field-hint">You can attach local images, message files, or other file details in the form. Nothing is uploaded or transmitted.</p>
      </div>`;

    html += `<div class="account-block"><h4>Your reports</h4>`;
    if (!mine.length) {
      html += `<p class="account-note">You have not filed a report in this browser.</p>`;
    } else {
      html += `<ul class="case-list">`;
      mine.forEach((report) => {
        const isCriminal = report.route === 'criminal';
        html += `<li class="case-item">
          <div class="case-item-head"><strong>${e(report.typeLabel || report.type)}</strong><span class="case-status ${isCriminal ? 'case-status--criminal' : ''}">${e(reportStatusLabel(report.status))}</span></div>
          <p class="contribution-meta">${e(formatDate(report.createdAt))} · ${e(getReportContextSummary(report))}${report.id ? ' · ' + e(report.id) : ''}</p>
          <details><summary>What was reported</summary><p>${e(report.description)}</p></details>
          ${isCriminal ? `<p class="case-referral"><strong>Police referral recorded.</strong> ${e(report.policeReferral && report.policeReferral.note ? report.policeReferral.note : 'In a live system this would be sent to local police for investigation. This prototype does not contact authorities.')}</p>` : ''}
        </li>`;
      });
      html += `</ul>`;
    }
    html += `</div>`;

    html += `<div class="account-block"><h4>Member review board · open cases</h4>
      <p class="account-note">Each case opens with a ${RESPONSE_DAYS}-day response period so the reported member can gather evidence and plead. After that, voting is open for ${VOTING_DAYS} days. To keep review impartial, involved parties, friends of involved parties, Observers, and Care Circle members do not vote; they are still encouraged to provide evidence and join the conversation below. Voting is open to members whose physical address is in the same county as an involved party; in cross-state cases, both parties’ counties are eligible. Vote guilty or not guilty; if guilty, choose a reflection period (30, 90, or 180 days), and always explain why. Voting is completely anonymous: ballots store no name, member ID, or link back to the voter, and results show only the vote, reflection choice, reason, and date. The full case file, anonymous votes, and comments are stored in this browser only for this local prototype.</p>`;
    if (!openReports.length) {
      html += `<p class="account-note">No cases are open for review right now.</p>`;
    } else {
      html += `<ul class="case-list">`;
      openReports.forEach((report) => {
        const votes = Array.isArray(report.votes) ? report.votes : [];
        const guilty = votes.filter((vote) => vote.verdict === 'guilty').length;
        const notGuilty = votes.filter((vote) => vote.verdict === 'not_guilty').length;
        const alreadyVoted = hasAnonymousVote(`case:${report.id}`);
        const isResponsePhase = report.status === 'response_period';
        const voteBlockReason = isResponsePhase ? '' : reviewVoteBlockReason(report, member.memberId);
        const votingClosed = report.demoVotingClosed || (report.votingEndsAt && Date.now() > Date.parse(report.votingEndsAt));
        const canVote = !isResponsePhase && !alreadyVoted && !voteBlockReason && !votingClosed;
        html += `<li class="case-item case-item--review">
          <div class="case-item-head"><strong>${e(report.typeLabel || report.type)}</strong><span class="case-status ${isResponsePhase ? 'case-status--response' : ''}">${e(reportStatusLabel(report.status))}</span></div>
          <p class="contribution-meta">Filed ${e(formatDate(report.createdAt))} · ${e(getReportContextSummary(report))} · ${e(isResponsePhase ? responseRemaining(report) : votingRemaining(report))} · ${votes.length} vote${votes.length === 1 ? '' : 's'}</p>
          ${renderCaseFile(report, e)}
          ${isResponsePhase
            ? (isRespondent(report) ? renderResponseForm(report, e) : `<p class="account-note">The reported member has ${RESPONSE_DAYS} days to gather evidence and plead before voting opens. You can read the full case file and leave a comment now.</p>`)
            : `<p class="case-tally"><strong>Tally:</strong> guilty ${guilty} · not guilty ${notGuilty}</p>
              ${votes.length ? `<ul class="vote-reasons">${votes.map((vote) => `
                <li class="vote-reason">
                  <p class="contribution-meta"><strong>Anonymous voter</strong> · voted ${e(vote.verdict === 'guilty' ? 'guilty' : 'not guilty')}${vote.verdict === 'guilty' && vote.reflectionDays ? ` · ${vote.reflectionDays} days` : ''} · ${e(formatDate(vote.votedAt))}</p>
                  <p>${e(vote.reason || 'No reason was recorded for this vote.')}</p>
                </li>`).join('')}</ul>` : ''}
              ${alreadyVoted ? `<p class="account-note">Your vote was recorded anonymously on this device. No name or member ID is attached to it.</p>`
                : voteBlockReason ? `<p class="account-note vote-eligibility-note"><strong>You are not eligible to vote in this case.</strong> ${e(voteBlockReason)} You are still encouraged to provide evidence and join the conversation in the review board below.</p>`
                : canVote ? `
                <form class="account-form vote-form" data-vote-form data-id="${e(report.id)}">
                  <fieldset class="vote-fieldset"><legend>1. Your verdict</legend>
                    <label class="radio-choice"><input type="radio" name="verdict" value="guilty" required> Guilty</label>
                    <label class="radio-choice"><input type="radio" name="verdict" value="not_guilty" required> Not guilty</label>
                  </fieldset>
                  <fieldset class="vote-fieldset"><legend>2. If guilty, reflection period</legend>
                    ${REFLECTION_OPTIONS.map((days) => `<label class="radio-choice"><input type="radio" name="reflectionDays" value="${days}"> ${days} days</label>`).join('')}
                  </fieldset>
                  <div class="field">
                    <label for="vote-reason-${e(domId(report.id))}">3. Why are you voting this way? <span class="required-mark" aria-hidden="true">*</span></label>
                    <textarea id="vote-reason-${e(domId(report.id))}" name="reason" rows="3" maxlength="600" required placeholder="Explain your reasoning. Stored locally with your vote."></textarea>
                    <p class="field-hint">Your reason is recorded with an anonymous ballot in this browser only. No name or member ID is stored with it. Up to 600 characters.</p>
                  </div>
                  <button type="submit" class="button button--primary button--small">Submit vote and reason</button>
                </form>
              ` : `<p class="account-note">Voting has closed for this case.</p>`}
              <button type="button" class="button button--ghost button--small" data-action="close-voting" data-id="${e(report.id)}">Close voting now (demo)</button>`}
          ${renderCaseComments(report, e)}
        </li>`;
      });
      html += `</ul>`;
    }
    html += `</div>`;

    html += `<div class="account-block"><h4>Decisions &amp; active restrictions</h4>`;
    if (!resolved.length) {
      html += `<p class="account-note">No completed decisions yet.</p>`;
    } else {
      html += `<ul class="case-list">`;
      resolved.forEach((report) => {
        html += `<li class="case-item">
          <div class="case-item-head"><strong>${e(report.typeLabel || report.type)}</strong><span class="case-status">${e(reportStatusLabel(report.status))}</span></div>
          <p class="contribution-meta">${e(formatDate(report.resolutionAt || report.createdAt))} · ${e(getReportContextSummary(report))}${report.reflectionDays ? ' · ' + report.reflectionDays + ' days' : ''}</p>
          <p class="contribution-meta">${(report.votes || []).length} member vote${(report.votes || []).length === 1 ? '' : 's'}${report.status === 'not_guilty' ? ' · no restriction applied' : ''}</p>
          <details><summary>Full case file and response</summary>${renderCaseFile(report, e)}</details>
          ${(report.votes || []).length ? `<details><summary>How anonymous votes were cast and why</summary><ul class="vote-reasons">${report.votes.map((vote) => `
            <li class="vote-reason">
              <p class="contribution-meta"><strong>Anonymous voter</strong> · voted ${e(vote.verdict === 'guilty' ? 'guilty' : 'not guilty')}${vote.verdict === 'guilty' && vote.reflectionDays ? ` · ${vote.reflectionDays} days` : ''}</p>
              <p>${e(vote.reason || 'No reason was recorded for this vote.')}</p>
            </li>`).join('')}</ul></details>` : ''}
          ${renderCaseComments(report, e)}
        </li>`;
      });
      html += `</ul>`;
    }
    html += `</div></section>`;

    panel.innerHTML = html;
  }

  function initAccountability() {
    const panel = document.getElementById('accountability-panel');
    if (!panel) return;

    panel.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.matches('[data-report-form]')) {
        event.preventDefault();
        if (!requireMembership()) return;
        if (!form.reportValidity()) return;
        fileAccountabilityReport(form);
      } else if (form.matches('[data-vote-form]')) {
        event.preventDefault();
        if (!requireMembership()) return;
        if (!form.reportValidity()) return;
        const data = new FormData(form);
        castAccountabilityVote(form.dataset.id, {
          verdict: data.get('verdict'),
          reflectionDays: data.get('reflectionDays'),
          reason: data.get('reason')
        });
      } else if (form.matches('[data-response-form]')) {
        event.preventDefault();
        if (!requireMembership()) return;
        if (!form.reportValidity()) return;
        submitRespondentResponse(form.dataset.id, form);
      } else if (form.matches('[data-comment-form]')) {
        event.preventDefault();
        if (!requireMembership()) return;
        if (!form.reportValidity()) return;
        addAccountabilityComment(form.dataset.id, new FormData(form));
      }
    });

    panel.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || !panel.contains(button)) return;
      const report = allReports().find((item) => item.id === button.dataset.id);
      if (!report) return;

      if (button.dataset.action === 'toggle-step') {
        if (!isMember() || report.status !== 'restriction_active') return;
        const stepKey = button.dataset.step;
        const step = TREATMENT_STEPS.find((item) => item.key === stepKey);
        if (!step) return;
        report.treatmentSteps = report.treatmentSteps || {};
        report.treatmentSteps[stepKey] = !report.treatmentSteps[stepKey];
        saveState();
        renderAccountability();
        announce(`${report.treatmentSteps[stepKey] ? 'Completed' : 'Marked incomplete'}: ${step.label}.`);
      } else if (button.dataset.action === 'complete-period') {
        if (!isMember() || report.status !== 'restriction_active') return;
        if (!TREATMENT_STEPS.every((step) => Boolean((report.treatmentSteps || {})[step.key]))) return;
        report.restrictionEnd = new Date(Date.now() - 1000).toISOString();
        saveState();
        renderAccountability();
        announce('Reflection period marked complete for this demo.');
        showToast('Reflection period complete (demo).', false);
      } else if (button.dataset.action === 'restore-access') {
        if (!isMember() || report.status !== 'restriction_active' || !isRestrictionComplete(report)) return;
        report.status = 'access_restored';
        report.resolutionAt = new Date().toISOString();
        saveState();
        renderAccountability();
        announce('Full access restored after reflection and treatment.');
        showToast('Full access restored (prototype).', false);
      } else if (button.dataset.action === 'skip-response') {
        if (!isMember() || report.status !== 'response_period' || !isRespondent(report)) return;
        report.status = 'board_review';
        report.votingEndsAt = new Date(Date.now() + (VOTING_DAYS * DAY_MS)).toISOString();
        notifyEligibleVoters(report);
        saveState();
        renderAccountability();
        announce('Response skipped. Member voting is now open.');
        showToast('Response skipped. Voting is open.', false);
      } else if (button.dataset.action === 'close-voting') {
        if (!isMember() || report.status !== 'board_review') return;
        report.demoVotingClosed = true;
        resolveAccountabilityReport(report);
      }
    });

    renderAccountability();
  }

  /* ------------------------------------------------------------------------
     05b. Pledge & digital signature
     ------------------------------------------------------------------------ */
  // Whole years as of today. Returns null for empty or impossible dates.
  function getAgeFromDob(dob) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
    const [year, month, day] = dob.split('-').map(Number);
    const birth = new Date(year, month - 1, day);
    if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return null;
    const now = new Date();
    let age = now.getFullYear() - year;
    const beforeBirthday = now.getMonth() < month - 1 ||
      (now.getMonth() === month - 1 && now.getDate() < day);
    if (beforeBirthday) age -= 1;
    return age;
  }

  function showPledgeError(message, focusId) {
    const box = document.getElementById('pledge-error');
    if (box) {
      box.textContent = message;
      box.hidden = false;
    }
    const field = focusId ? document.getElementById(focusId) : null;
    if (field) field.focus({ preventScroll: true });
  }

  function renderPledge() {
    const card = document.getElementById('signature-card');
    const banner = document.getElementById('signed-banner');
    const signedName = document.getElementById('signed-name');
    const signedDate = document.getElementById('signed-date');
    if (!card || !banner || !signedName || !signedDate) return;

    const pledge = state.pledge;
    const isSigned = isMember() && Boolean(pledge);
    card.classList.toggle('is-signed', isSigned);
    banner.hidden = !isSigned;

    if (isSigned) {
      const when = formatDate(pledge.signedAt);
      signedName.textContent = `Member: ${pledge.name}`;
      signedDate.textContent = [pledge.location || 'Location not shared', when ? `Member since ${when}` : 'Membership active'].filter(Boolean).join(' · ');
    } else {
      signedName.textContent = '';
      signedDate.textContent = '';
    }
  }

  function renderTrackGate() {
    const strip = document.getElementById('track-pledge-status');
    const message = document.getElementById('track-pledge-message');
    const link = strip ? $('.text-link', strip) : null;
    if (!strip || !message) return;

    const signedIn = isMember();
    strip.classList.toggle('is-signed', signedIn);

    if (signedIn) {
      const trackText = state.track
        ? ` Your current track is ${TRACKS[state.track]}. You can manage it here as your capacity changes.`
        : ' Your membership is active. Choose and manage the track that fits this season of your life.';
      message.textContent = `Signed in as ${state.pledge.name}.${trackText}`;
      if (link) {
        link.textContent = 'Dashboard';
        link.setAttribute('href', 'dashboard.html');
      }
    } else {
      message.textContent = 'You can browse labor, goods, and tracks. Sign the Unbought Pledge to become a member and participate—post offers, request connections, and manage your track and messages.';
      if (link) {
        link.textContent = 'Take the Pledge';
        link.setAttribute('href', 'pledge.html');
      }
    }
  }

  function openSigninDialog() {
    const dialog = document.getElementById('signin-dialog');
    const errorBox = document.getElementById('signin-error');
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.hidden = true;
    }
    openDialog(dialog);
  }

  function initPledgePage() {
    const button = document.getElementById('signin-top');
    if (!button) return;
    button.addEventListener('click', () => {
      if (isMember()) {
        window.location.assign('dashboard.html');
        return;
      }
      openSigninDialog();
    });
  }

  function initPledgeForm() {
    const form = document.getElementById('pledge-form');
    const errorBox = document.getElementById('pledge-error');
    const withdraw = document.getElementById('withdraw-pledge');
    const card = document.getElementById('signature-card');
    if (!form && !withdraw) return;

    // Members must be 18+. Three small selects avoid the inconsistent native
    // date control while still composing one ISO value for storage.
    const dobHidden = document.getElementById('pledge-dob');
    const dobMonth = document.getElementById('pledge-dob-month');
    const dobDay = document.getElementById('pledge-dob-day');
    const dobYear = document.getElementById('pledge-dob-year');
    const dobParts = [dobMonth, dobDay, dobYear].filter(Boolean);
    const pad2 = (value) => String(value).padStart(2, '0');

    function syncDob() {
      if (!dobHidden) return;
      dobHidden.value = dobYear && dobMonth && dobDay && dobYear.value && dobMonth.value && dobDay.value
        ? `${dobYear.value}-${dobMonth.value}-${dobDay.value}`
        : '';
    }

    function refreshDobDays() {
      if (!dobDay) return;
      const year = Number(dobYear && dobYear.value);
      const month = Number(dobMonth && dobMonth.value);
      const days = year && month ? new Date(year, month, 0).getDate() : 31;
      const previous = dobDay.value;
      let options = '<option value="">Day</option>';
      for (let day = 1; day <= days; day += 1) {
        options += `<option value="${pad2(day)}">${day}</option>`;
      }
      dobDay.innerHTML = options;
      dobDay.value = Number(previous) <= days ? previous : '';
      syncDob();
    }

    function focusDob() {
      const first = dobParts.find((part) => !part.value) || dobParts[0];
      if (first) first.focus({ preventScroll: true });
    }

    if (dobYear) {
      const thisYear = new Date().getFullYear();
      let years = '<option value="">Year</option>';
      for (let year = thisYear; year >= 1900; year -= 1) {
        years += `<option value="${year}">${year}</option>`;
      }
      dobYear.innerHTML = years;
    }
    dobParts.forEach((part) => {
      part.addEventListener('change', () => {
        if (part === dobMonth || part === dobYear) refreshDobDays();
        else syncDob();
      });
    });
    refreshDobDays();

    const sameAddress = document.getElementById('pledge-same-address');
    const mailingFields = {
      address1: document.getElementById('pledge-address1'),
      address2: document.getElementById('pledge-address2'),
      city: document.getElementById('pledge-city'),
      county: document.getElementById('pledge-county'),
      state: document.getElementById('pledge-state'),
      zip: document.getElementById('pledge-zip')
    };
    const physicalFields = {
      address1: document.getElementById('pledge-physical-address1'),
      address2: document.getElementById('pledge-physical-address2'),
      city: document.getElementById('pledge-physical-city'),
      county: document.getElementById('pledge-physical-county'),
      state: document.getElementById('pledge-physical-state'),
      zip: document.getElementById('pledge-physical-zip')
    };
    const mailingFieldList = Object.values(mailingFields).filter(Boolean);
    const physicalFieldList = Object.values(physicalFields).filter(Boolean);

    function setPhysicalLocked(locked) {
      physicalFieldList.forEach((input) => {
        input.readOnly = locked;
        if (input.tagName === 'SELECT') input.disabled = locked;
      });
    }

    function syncPhysicalAddress() {
      Object.keys(physicalFields).forEach((key) => {
        const source = mailingFields[key];
        const target = physicalFields[key];
        if (source && target) target.value = source.value;
      });
      setPhysicalLocked(true);
    }

    if (sameAddress && physicalFieldList.length && mailingFieldList.length) {
      sameAddress.addEventListener('change', () => {
        if (sameAddress.checked) syncPhysicalAddress();
        else setPhysicalLocked(false);
      });
      mailingFieldList.forEach((input) => {
        input.addEventListener('input', () => {
          if (sameAddress.checked) syncPhysicalAddress();
        });
      });
      if (sameAddress.checked) syncPhysicalAddress();
      else setPhysicalLocked(false);
    }

    const poaToggle = form && form.querySelector('[data-has-poa]');
    const poaFields = form && form.querySelector('[data-poa-fields]');
    const poaInputs = poaFields ? Array.from(poaFields.querySelectorAll('input')) : [];
    const updatePoaFields = () => {
      const enabled = Boolean(poaToggle && poaToggle.checked);
      if (poaFields) poaFields.hidden = !enabled;
      poaInputs.forEach((input) => {
        input.disabled = !enabled;
        input.required = enabled;
      });
    };
    if (poaToggle) {
      poaToggle.addEventListener('change', updatePoaFields);
      updatePoaFields();
    }

    if (form) {
      if (form.querySelector('[data-cell-phone]')) syncPhoneFields(form);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (errorBox) errorBox.hidden = true;

        // Check age before native validation so under-18 visitors get a clear
        // explanation instead of a generic browser tooltip.
        syncDob();
        const earlyAge = getAgeFromDob(dobHidden ? dobHidden.value : '');
        if (earlyAge === null) {
          showPledgeError('Please enter a valid date of birth.');
          focusDob();
          return;
        }
        if (earlyAge < 18) {
          showPledgeError('You must be 18 or older to sign the Unbought Pledge. You can keep browsing the commons and sign when you turn 18. Nothing was saved.');
          focusDob();
          announce('Members must be 18 or older. Your pledge was not signed.');
          return;
        }

        if (!form.reportValidity()) return;

        const data = new FormData(form);
        const firstName = cleanString(data.get('firstName'), 40);
        const middleInitial = cleanString(data.get('middleInitial'), 2);
        const lastName = cleanString(data.get('lastName'), 60);
        const suffix = cleanString(data.get('suffix'), 12);
        const fullName = composeFullName({ firstName, middleInitial, lastName, suffix });
        const name = cleanString(data.get('chosenName'), 60);
        const location = cleanString(data.get('location'), 80);
        const address1 = cleanString(data.get('address1'), 100);
        const address2 = cleanString(data.get('address2'), 100);
        const city = cleanString(data.get('city'), 80);
        const county = normalizeCounty(data.get('county'));
        const stateCode = normalizeStateCode(data.get('state'));
        const zip = normalizeZip(data.get('zip'));
        const mailingAddress = composeMailingAddress({ address1, address2, city, state: stateCode, zip });
        const physicalAddress1 = cleanString(data.get('physicalAddress1'), 100);
        const physicalAddress2 = cleanString(data.get('physicalAddress2'), 100);
        const physicalCity = cleanString(data.get('physicalCity'), 80);
        const physicalCounty = normalizeCounty(data.get('physicalCounty'));
        const physicalState = normalizeStateCode(data.get('physicalState'));
        const physicalZip = normalizeZip(data.get('physicalZip'));
        const physicalAddress = sameAddress && sameAddress.checked
          ? mailingAddress
          : composeMailingAddress({
            address1: physicalAddress1,
            address2: physicalAddress2,
            city: physicalCity,
            state: physicalState,
            zip: physicalZip
          });
        const cellPhone = cleanString(data.get('cellPhone'), 40);
        const samePhone = Boolean(data.get('samePhone'));
        const publicPhoneNumber = samePhone ? cellPhone : cleanString(data.get('publicPhoneNumber'), 40);
        const receiveTexts = Boolean(data.get('receiveTexts'));
        const showPublicPhone = Boolean(data.get('publicPhone')) && Boolean(publicPhoneNumber);
        const dob = cleanString(data.get('dob'), 10);
        const profession = normalizeProfession(data.get('profession'));
        const housingStatus = normalizeHousingStatus(data.get('housingStatus'));
        const paidSkills = cleanString(data.get('paidSkills'), 400);
        const unpaidSkills = cleanString(data.get('unpaidSkills'), 400);
        const note = cleanString(data.get('note'), 240);
        const username = normalizeUsername(data.get('username'));
        const password = String(data.get('password') || '');
        const passwordConfirm = String(data.get('passwordConfirm') || '');
        const hasPoa = Boolean(data.get('hasPowerOfAttorney'));
        const poaRepresentativeName = cleanString(data.get('poaRepresentativeName'), 80);
        const poaRelationship = cleanString(data.get('poaRelationship'), 80);
        const poaUsername = normalizeUsername(data.get('poaUsername'));
        const poaPassword = String(data.get('poaPassword') || '');
        const poaPasswordConfirm = String(data.get('poaPasswordConfirm') || '');
        const agreement = document.getElementById('pledge-agreement');
        const freeAtCost = document.getElementById('pledge-free-atcost');

        if (!agreement || !agreement.checked) {
          if (errorBox) {
            errorBox.textContent = 'Please confirm the five commitments before signing.';
            errorBox.hidden = false;
          }
          if (agreement) agreement.focus();
          return;
        }

        if (!freeAtCost || !freeAtCost.checked) {
          if (errorBox) {
            errorBox.textContent = 'Please confirm that labor and goods are free, and that only exact material costs may change hands.';
            errorBox.hidden = false;
          }
          if (freeAtCost) freeAtCost.focus();
          return;
        }

        if (!firstName || !lastName || !name || !location || !address1 || !city || !county || !stateCode || !physicalAddress || !physicalCounty || !cellPhone) {
          showPledgeError('Please complete your first name, last name, chosen name, mailing address and county, physical address and county, cell phone number, and general location.', 'pledge-first-name');
          return;
        }
        if (Boolean(data.get('publicPhone')) && !publicPhoneNumber) {
          showPledgeError('Enter a public phone number or choose the same as your cell phone before showing it on your public resume.', 'pledge-public-phone');
          return;
        }
        if (!hasOwn(HOUSING_STATUSES, housingStatus)) {
          showPledgeError('Please choose your housing status.', 'pledge-housing');
          return;
        }
        if (!profession) {
          showPledgeError('Please enter your primary profession or trade.', 'pledge-profession');
          return;
        }
        if (!zip) {
          showPledgeError('Please enter a 5-digit ZIP code, such as 18360.', 'pledge-zip');
          return;
        }
        if (!(sameAddress && sameAddress.checked) && !physicalZip) {
          showPledgeError('Please enter a 5-digit ZIP code for your physical address.', 'pledge-physical-zip');
          return;
        }
        if (!(sameAddress && sameAddress.checked) && !physicalCounty) {
          showPledgeError('Please enter a county for your physical address.', 'pledge-physical-county');
          return;
        }

        if (!/^[a-z0-9_.-]{3,40}$/.test(username)) {
          showPledgeError('Choose a username of 3–40 letters, numbers, periods, underscores, or hyphens.', 'pledge-username');
          return;
        }
        if (password.length < 8) {
          showPledgeError('Choose a password of at least 8 characters.', 'pledge-password');
          return;
        }
        if (password !== passwordConfirm) {
          showPledgeError('Your passwords do not match.', 'pledge-password-confirm');
          return;
        }
        const credentials = getCredentials();
        if (credentials.some((credential) => credential && credential.username === username)) {
          showPledgeError('That username is already used by the account on this device. Sign in instead.', 'pledge-username');
          return;
        }
        if (hasPoa) {
          if (!poaRepresentativeName || !poaRelationship) {
            showPledgeError('Enter the representative’s full name and relationship or authority for power of attorney.', 'pledge-poa-name');
            return;
          }
          if (!/^[a-z0-9_.-]{3,40}$/.test(poaUsername)) {
            showPledgeError('Choose a second username of 3–40 letters, numbers, periods, underscores, or hyphens.', 'pledge-poa-username');
            return;
          }
          if (poaUsername === username || credentials.some((credential) => credential && credential.username === poaUsername)) {
            showPledgeError('That second username is already used on this device. Choose another for the representative.', 'pledge-poa-username');
            return;
          }
          if (poaPassword.length < 8) {
            showPledgeError('Choose a representative password of at least 8 characters.', 'pledge-poa-password');
            return;
          }
          if (poaPassword !== poaPasswordConfirm) {
            showPledgeError('The representative passwords do not match.', 'pledge-poa-password-confirm');
            return;
          }
        }

        const age = getAgeFromDob(dob);
        if (age === null) {
          showPledgeError('Please enter a valid date of birth.');
          focusDob();
          return;
        }
        if (age < 18) {
          showPledgeError('You must be 18 or older to sign the Unbought Pledge. You can keep browsing the commons and sign when you turn 18. Nothing was saved.');
          focusDob();
          announce('Members must be 18 or older. Your pledge was not signed.');
          return;
        }

        state.pledge = {
          memberId: makeId('member'),
          name,
          fullName,
          firstName,
          middleInitial,
          lastName,
          suffix,
          location,
          address1,
          address2,
          city,
          county,
          state: stateCode,
          mailingAddress,
          physicalAddress,
          physicalAddress1,
          physicalAddress2,
          physicalCity,
          physicalCounty,
          physicalState,
          physicalZip,
          housingStatus,
          phone: cellPhone,
          cellPhone,
          publicPhoneNumber,
          samePhone,
          receiveTexts,
          dob,
          profession,
          zip,
          paidSkills,
          unpaidSkills,
          bio: '',
          picture: '',
          tagline: '',
          group: '',
          donationCount: 0,
          hoursCompleted: 0,
          hoursUsed: 0,
          itemsGifted: 0,
          itemsTaken: 0,
          available: true,
          publicAddressSource: 'mailing',
          publicPhone: showPublicPhone,
          powerOfAttorney: hasPoa ? {
            enabled: true,
            representativeName: poaRepresentativeName,
            relationship: poaRelationship,
            username: poaUsername
          } : null,
          profileTheme: {
            public: { ...PROFILE_THEME_DEFAULTS.public },
            private: { ...PROFILE_THEME_DEFAULTS.private }
          },
          note,
          signedAt: new Date().toISOString(),
          status: 'active'
        };
        addMemberToRoster(state.pledge);
        const salt = makeId('salt');
        const memberCredential = {
          id: makeId('credential'),
          username,
          salt,
          passwordHash: hashPassword(password, salt),
          role: 'member',
          label: name,
          representativeName: '',
          relationship: ''
        };
        const authCredentials = [memberCredential];
        let activeCredential = memberCredential;
        if (hasPoa) {
          const poaSalt = makeId('salt');
          const representativeCredential = {
            id: makeId('credential'),
            username: poaUsername,
            salt: poaSalt,
            passwordHash: hashPassword(poaPassword, poaSalt),
            role: 'representative',
            label: poaRepresentativeName,
            representativeName: poaRepresentativeName,
            relationship: poaRelationship
          };
          authCredentials.push(representativeCredential);
          activeCredential = representativeCredential;
        }
        state.auth = {
          credential: {
            username: memberCredential.username,
            salt: memberCredential.salt,
            passwordHash: memberCredential.passwordHash
          },
          credentials: authCredentials,
          session: {
            signedIn: true,
            signedInAt: new Date().toISOString(),
            credentialId: activeCredential.id,
            actingAs: activeCredential.role
          }
        };
        saveState();
        renderPledge();
        renderTrackGate();
        renderTrackPanel(state.track);
        renderSharedMemberViews();
        renderVolunteerStatus();
        renderDashboard();
        renderAccountability();
        applyFilters();
        renderAuthUi();

        const banner = document.getElementById('signed-banner');
        if (banner) {
          banner.tabIndex = -1;
          banner.focus({ preventScroll: true });
        }
        announce(`Welcome, ${name}. Your username ${username} is set up and your membership is active in this browser. You can now choose a track, post offers, and request connections.`);
        showToast('Membership active. You can now participate in the community.', false);
      });
    }

    if (withdraw) {
      withdraw.addEventListener('click', () => {
        const cancellation = getSeveranceSummary().cancellation;
        showConfirm({
          title: 'Withdraw your membership?',
          message: `Your membership, local usernames, and salted password hashes will be removed from this browser, including any power-of-attorney representative sign-in. You can still browse offers, but you will need to sign the pledge again to post, request, or manage your track. Your saved track details may remain on this device. A local cancellation estimate of ${formatMoney(cancellation.estimate)} is recorded for the prototype, capped at ${formatMoney(cancellation.cap)}. It is based on your group/alliance share (${cancellation.memberPercent}%) and those groups' share of the donation fund (${cancellation.groupFundPercent}%). It is separate from your group's uncapped slice of unspoken-for money, so the two amounts can be different. No payout occurs and nothing is transmitted.`,
          confirmLabel: 'Withdraw membership',
          tone: 'danger',
          onConfirm: () => {
            state.pledge = null;
            state.auth = { credential: null, session: { signedIn: false, signedInAt: null } };
            saveState();
            renderPledge();
            renderTrackGate();
            renderTrackPanel(state.track);
            renderSharedMemberViews();
            renderVolunteerStatus();
            renderDashboard();
            renderAccountability();
            applyFilters();
            renderAuthUi();

            const agreement = document.getElementById('pledge-agreement');
            if (agreement) agreement.checked = false;

            const freeAtCost = document.getElementById('pledge-free-atcost');
            if (freeAtCost) freeAtCost.checked = false;

            const firstField = document.getElementById('pledge-agreement') || (form ? form.querySelector('input, textarea, button') : null);
            if (firstField) firstField.focus({ preventScroll: true });

            announce('Your membership was withdrawn. You can sign the pledge again at any time to participate.');
            showToast('Membership withdrawn.', false);
          }
        });
      });
    }

    // Ensure clicking the signed banner's copy area doesn't accidentally submit anything.
    if (card) {
      card.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) return;
      });
    }

    renderPledge();
    renderTrackGate();
  }

  function initSigninForm() {
    const form = document.getElementById('signin-form');
    const errorBox = document.getElementById('signin-error');
    const signout = document.getElementById('signout-account');
    const triggers = document.querySelectorAll('[data-signin-trigger]');

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', openSigninDialog);
    });

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (errorBox) errorBox.hidden = true;
        if (!form.reportValidity()) return;

        const data = new FormData(form);
        const username = normalizeUsername(data.get('username'));
        const password = String(data.get('password') || '');
        const credential = getCredentials().find((item) => item
          && item.username === username
          && hashPassword(password, item.salt) === item.passwordHash);

        if (!credential) {
          const message = 'That username or password does not match a sign-in stored in this browser.';
          if (errorBox) {
            errorBox.textContent = message;
            errorBox.hidden = false;
          }
          announce('Sign in failed. Check your username and password.');
          return;
        }

        setSession(true, credential);
        const welcomeName = state.pledge ? state.pledge.name : username;
        if (credential.role === 'representative') {
          announce(`Welcome back, ${credential.label || 'authorized representative'}. You are signed in on behalf of ${welcomeName}.`);
        } else {
          announce(`Welcome back, ${welcomeName}.`);
        }
        showToast('Signed in. Opening your dashboard.', false);
        closeDialog(document.getElementById('signin-dialog'));
        window.location.assign('dashboard.html');
      });
    }

    if (signout) {
      signout.addEventListener('click', () => {
        setSession(false);
        renderAuthUi();
        renderPledge();
        renderSharedMemberViews();
        renderVolunteerStatus();
        renderDashboard();
        announce('You are signed out. Your membership details remain on this device.');
        showToast('Signed out of this browser.', false);
      });
    }
  }

  /* ------------------------------------------------------------------------
     06. Membership tracks
     ------------------------------------------------------------------------ */
  function pillarOptions(includeGoods = false) {
    return Object.entries(PILLARS)
      .filter(([key]) => includeGoods || key !== 'goods')
      .map(([key, pillar]) => `<option value="${key}">${pillar.label}</option>`)
      .join('');
  }

  const TRACK_TEMPLATES = {
    contributor: () => `
      <div class="panel-head">
        <div class="panel-head-copy">
          <p class="eyebrow">Active Contributor</p>
          <h3>What will you share?</h3>
          <p>Offer the same quality of work you would be paid for—without charging for your time. Be specific about scope, and name the pillar your offer belongs to.</p>
        </div>
        <span class="badge badge--pillar">Paid-level, freely given</span>
      </div>
      <form class="panel-form">
        <div class="form-row">
          <div class="field">
            <label for="contributor-skill">Skill, trade, or care task <span class="required-mark" aria-hidden="true">*</span></label>
            <input type="text" id="contributor-skill" name="skill" maxlength="80" required placeholder="e.g., wheelchair ramp carpentry, tax prep, haircuts">
          </div>
          <div class="field">
            <label for="contributor-pillar">Primary pillar <span class="required-mark" aria-hidden="true">*</span></label>
            <select id="contributor-pillar" name="pillar" required>
              <option value="">Choose a pillar</option>
              ${pillarOptions(false)}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="contributor-hours">Weekly time pledged <span class="required-mark" aria-hidden="true">*</span></label>
            <select id="contributor-hours" name="hours" required>
              ${[1, 2, 3, 4, 5, 6, 8, 10, 12, 20, 30, 40].map((hours) => `<option value="${hours}"${hours === 1 ? ' selected' : ''}>${hours} hour${hours === 1 ? '' : 's'} per week</option>`).join('')}
            </select>
            <p class="field-hint">Phase 1 minimum: 1 hour per week. Choose a sustainable amount; you can change it later. Logged hours still require mutual confirmation or review.</p>
          </div>
          <div class="field">
            <label for="contributor-availability">Availability <span class="optional">(optional)</span></label>
            <input type="text" id="contributor-availability" name="availability" maxlength="100" placeholder="e.g., Saturday mornings, online weeknights">
          </div>
        </div>
        <div class="field field--check">
          <label class="checkbox">
            <input type="checkbox" name="scope" value="agreed" required>
            <span>I will agree on scope, safety, and boundaries before starting—and I will refer out work outside my competence or legal scope.</span>
          </label>
        </div>
        <div class="panel-actions">
          <button class="button button--primary" type="submit">Save contributor track <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></button>
          <p class="panel-note">Saving records your track and details in this browser only.</p>
        </div>
      </form>
    `,

    apprentice: () => `
      <div class="panel-head">
        <div class="panel-head-copy">
          <p class="eyebrow">Apprentice <span class="optional">(Skill-Builder)</span></p>
          <h3>What do you want to learn?</h3>
          <p>Join a mentor and a local or online guild. You are not expected to arrive skilled—only willing to practice safely and give the craft back to the community.</p>
          <p class="panel-note">${BASIC_NECESSITIES_NOTE}</p>
        </div>
        <span class="badge badge--pillar">Learn by doing</span>
      </div>
      <form class="panel-form">
        <div class="form-row">
          <div class="field">
            <label for="apprentice-craft">Craft or guild <span class="required-mark" aria-hidden="true">*</span></label>
            <select id="apprentice-craft" name="craft" required>
              <option value="">Choose a craft or guild</option>
              <option value="home-repair">Safe home repair &amp; building</option>
              <option value="web">Community web development</option>
              <option value="garden">Organic gardening</option>
              <option value="care">Care circle &amp; listening</option>
              <option value="other">Something else</option>
            </select>
          </div>
          <div class="field">
            <label for="apprentice-format">Learning format <span class="required-mark" aria-hidden="true">*</span></label>
            <select id="apprentice-format" name="format" required>
              <option value="either">Either online or local</option>
              <option value="online">Online</option>
              <option value="local">Hands-on local guild</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="apprentice-goals">What do you hope to build or give back? <span class="optional">(optional)</span></label>
          <textarea id="apprentice-goals" name="goals" rows="3" maxlength="300" placeholder="A ramp for a neighbor, a website for a food co-op, a community garden bed…"></textarea>
        </div>
        <div class="field field--check">
          <label class="checkbox">
            <input type="checkbox" name="commitment" value="agreed" required>
            <span>I can commit to at least one guild session and will follow the mentor’s safety and scope guidance.</span>
          </label>
        </div>
        <div class="panel-actions">
          <button class="button button--primary" type="submit">Save apprentice track <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></button>
          <p class="panel-note">Unbought Academy mentorship is free. No tuition or debt is created.</p>
        </div>
      </form>
    `,

    care: () => `
      <div class="panel-head">
        <div class="panel-head-copy">
          <p class="eyebrow">Care Circle Member</p>
          <h3>You do not have to earn care.</h3>
          <p>This track is for people who cannot work right now due to age, disability, illness, or mental capacity—and for anyone whose capacity changes. No diagnosis is requested. No productivity test. A peer can meet you where you are.</p>
          <p class="panel-note">${BASIC_NECESSITIES_NOTE}</p>
        </div>
        <span class="badge badge--amber">Ubuntu welcome</span>
      </div>

      <div class="care-preview" aria-label="Preview of a Welcome and Care Circle chat">
        <div class="chat-bubble"><strong>Peer host</strong>Welcome, neighbor. No paperwork or diagnosis here. What would feel supportive this week?</div>
        <div class="chat-bubble chat-bubble--reply"><strong>You</strong>I could use a short call, and maybe help picking up groceries.</div>
        <div class="chat-bubble"><strong>Peer host</strong>We can start with a 20-minute call—or just text. You set the pace, and you can change your mind.</div>
      </div>
      <p class="ubuntu-preview-note"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-hands"></use></svg> A Welcome &amp; Care Circle chat is a peer conversation, not a clinical assessment.</p>

      <form class="panel-form">
        <fieldset>
          <legend>What would feel supportive? <span class="optional">(choose any)</span></legend>
          <div class="support-grid">
            <label class="support-choice"><input type="checkbox" name="support" value="listening"> A listening ear</label>
            <label class="support-choice"><input type="checkbox" name="support" value="grocery"> Grocery or pharmacy pickup</label>
            <label class="support-choice"><input type="checkbox" name="support" value="meals"> A meal train</label>
            <label class="support-choice"><input type="checkbox" name="support" value="rides"> Rides to appointments</label>
            <label class="support-choice"><input type="checkbox" name="support" value="tech"> Technology help</label>
            <label class="support-choice"><input type="checkbox" name="support" value="checkin"> A regular check-in</label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Functional capacity &amp; contact preferences <span class="optional">(no diagnosis)</span></legend>
          <div class="support-grid">
            <label class="support-choice"><input type="checkbox" name="capacity" value="short-chat"> I can manage a short 20-minute chat</label>
            <label class="support-choice"><input type="checkbox" name="capacity" value="text-first"> I prefer text first</label>
            <label class="support-choice"><input type="checkbox" name="capacity" value="lived-experience"> I would like a peer with lived experience</label>
            <label class="support-choice"><input type="checkbox" name="capacity" value="quiet-space"> A quiet, low-sensory space would help</label>
            <label class="support-choice"><input type="checkbox" name="capacity" value="coordinate-visit"> Please coordinate before visiting</label>
            <label class="support-choice"><input type="checkbox" name="capacity" value="interpreter"> I need an interpreter or captions</label>
          </div>
        </fieldset>

        <div class="form-row">
          <div class="field">
            <label for="care-pace">Preferred pace</label>
            <select id="care-pace" name="pace">
              <option value="one-checkin">One short check-in</option>
              <option value="weekly-month">Weekly for a month</option>
              <option value="ongoing">Ongoing, low-key support</option>
              <option value="decide-together">Let’s decide together</option>
            </select>
          </div>
          <div class="field">
            <label for="care-note">Anything you want a peer to know? <span class="optional">(optional)</span></label>
            <input type="text" id="care-note" name="note" maxlength="160" placeholder="A preference, a boundary, or a good time to reach you.">
          </div>
        </div>

        <div class="field field--check">
          <label class="checkbox">
            <input type="checkbox" name="requestChat" value="requested" required>
            <span>Please contact me to arrange a peer Welcome &amp; Care Circle chat. I can withdraw this request at any time.</span>
          </label>
        </div>

        <div class="panel-actions">
          <button class="button button--primary" type="submit">Request Welcome &amp; Care Circle chat <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-chat"></use></svg></button>
          <p class="panel-note">This prototype stores only what you enter here. No medical or diagnostic information is requested.</p>
        </div>
      </form>
    `,

    observer: () => `
      <div class="panel-head">
        <div class="panel-head-copy">
          <p class="eyebrow">Observer</p>
          <h3>Stay curious. Stay unpressured.</h3>
          <p>Reading and listening are forms of participation. You can explore the philosophy and governance before requesting or offering anything.</p>
        </div>
        <span class="badge badge--soft">No obligation</span>
      </div>
      <form class="panel-form">
        <fieldset>
          <legend>What would you like to explore? <span class="optional">(choose any)</span></legend>
          <div class="support-grid">
            <label class="support-choice"><input type="checkbox" name="interests" value="philosophy"> Ubuntu &amp; Unbought philosophy</label>
            <label class="support-choice"><input type="checkbox" name="interests" value="land"> Land trust updates</label>
            <label class="support-choice"><input type="checkbox" name="interests" value="academy"> Academy open talks</label>
            <label class="support-choice"><input type="checkbox" name="interests" value="directory"> Service &amp; goods directory</label>
            <label class="support-choice"><input type="checkbox" name="interests" value="governance"> Care Circle governance</label>
            <label class="support-choice"><input type="checkbox" name="interests" value="events"> Gatherings &amp; repair days</label>
          </div>
        </fieldset>
        <div class="form-row">
          <div class="field">
            <label for="observer-cadence">How often would you like local reminders?</label>
            <select id="observer-cadence" name="cadence">
              <option value="rarely">Only major updates</option>
              <option value="monthly">Monthly summary</option>
              <option value="events">When something is happening nearby</option>
              <option value="quiet">No reminders for now</option>
            </select>
            <p class="field-hint">This preference is saved only in this browser; nothing is sent.</p>
          </div>
          <div class="field">
            <label for="observer-note">What brought you here? <span class="optional">(optional)</span></label>
            <input type="text" id="observer-note" name="note" maxlength="140" placeholder="A question, a hope, or a reason to listen.">
          </div>
        </div>
        <div class="field field--check">
          <label class="checkbox">
            <input type="checkbox" name="consent" value="agreed" required>
            <span>I understand that observing is welcome and creates no obligation to offer or request services.</span>
          </label>
        </div>
        <div class="panel-actions">
          <button class="button button--primary" type="submit">Save observer track <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-eye"></use></svg></button>
          <p class="panel-note">You can switch tracks whenever your capacity or interest changes.</p>
        </div>
      </form>
    `
  };

  function hydrateForm(form, details) {
    if (!form || !details || typeof details !== 'object') return;

    Object.entries(details).forEach(([name, value]) => {
      if (name === 'savedAt') return;
      // Field names come from stored data, so only accept simple control names
      // before building a selector. This prevents malformed or injected selectors.
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) return;
      const controls = form.querySelectorAll(`[name="${name}"]`);
      controls.forEach((control) => {
        if (control.type === 'checkbox') {
          control.checked = Array.isArray(value) ? value.includes(control.value) : Boolean(value) && value !== 'false';
        } else if (control.type === 'radio') {
          control.checked = String(value) === control.value;
        } else {
          control.value = value;
        }
      });
    });
  }

  function collectFormDetails(form) {
    const data = new FormData(form);
    const details = {};

    MULTI_VALUE_FIELDS.forEach((fieldName) => {
      if (form.elements.namedItem(fieldName)) {
        details[fieldName] = data.getAll(fieldName).map((value) => cleanString(value, 120));
      }
    });

    for (const key of new Set(data.keys())) {
      if (MULTI_VALUE_FIELDS.has(key)) continue;
      const values = data.getAll(key).map((value) => cleanString(value, 400));
      details[key] = values.length > 1 ? values : values[0];
    }

    details.savedAt = new Date().toISOString();
    return details;
  }

  function renderTrackPanel(track, options = {}) {
    const panel = document.getElementById('track-panel');
    if (!panel) return;

    panel.replaceChildren();

    if (!track || !hasOwn(TRACK_TEMPLATES, track)) {
      const empty = createEl('div', 'track-empty');
      const iconWrap = createEl('span', 'track-empty-icon');
      iconWrap.setAttribute('aria-hidden', 'true');
      iconWrap.appendChild(createIcon('people'));
      empty.appendChild(iconWrap);
      empty.appendChild(createEl('h3', '', 'Choose a track above to see what comes next.'));
      empty.appendChild(createEl('p', '', 'Nothing is locked in. You can change tracks whenever your capacity changes.'));
      panel.appendChild(empty);
      return;
    }

    // Templates are static, trusted markup. All saved values are hydrated with
    // DOM properties below, never concatenated into HTML.
    panel.innerHTML = TRACK_TEMPLATES[track]();

    const form = $('.panel-form', panel);
    const details = state.trackDetails[track];
    hydrateForm(form, details);

    if (details && details.savedAt) {
      const when = formatDate(details.savedAt);
      const savedNote = createEl(
        'p',
        'saved-note',
        when ? ` Saved ${when}. You can update these details and save again.` : ' Saved. You can update these details and save again.'
      );
      savedNote.prepend(createIcon('check'));
      const head = $('.panel-head', panel);
      if (head) head.after(savedNote);
    }

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!requireMembership('Sign the Unbought Pledge to become a member before saving your track.')) return;
        if (!requireFullAccess('Full access is paused during your reflection period. Track management is unavailable until you complete the reflection and treatment requirements.')) return;
        if (!form.reportValidity()) return;

        const savedDetails = collectFormDetails(form);
        savedDetails.memberId = state.pledge.memberId;
        state.trackDetails[track] = savedDetails;
        saveState();

        let message = 'Your track details were saved.';
        if (track === 'contributor') {
          const hours = savedDetails.hours || '0';
          message = `Contributor track saved. You pledged ${hours} hour${Number(hours) === 1 ? '' : 's'} per week in ${hasOwn(PILLARS, savedDetails.pillar) ? PILLARS[savedDetails.pillar].label : 'the community'}.`;
        } else if (track === 'apprentice') {
          message = 'Apprentice track saved. Your guild preference is stored in this browser.';
        } else if (track === 'care') {
          message = 'Welcome & Care Circle request saved locally. No diagnosis or medical information was requested.';
        } else if (track === 'observer') {
          message = 'Observer track saved. Explore at your own pace—no obligation.';
        }

        renderTrackPanel(track);
        renderSharedMemberViews();
        const newSubmit = $('#track-panel .panel-form button[type="submit"]');
        if (newSubmit) newSubmit.focus({ preventScroll: true });

        announce(message);
        showToast(message, false);
      });
    }

    if (options.focusPanel) {
      const heading = $('.panel-head-copy h3', panel);
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
  }

  function initTracks() {
    const radios = $$('input[name="membership-track"]');

    radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        if (!isMember()) {
          radio.checked = false;
          if (state.track) {
            const savedRadio = radios.find((item) => item.value === state.track);
            if (savedRadio) savedRadio.checked = true;
          }
          requireMembership('Sign the Unbought Pledge to become a member before choosing or managing a track.');
          return;
        }
        if (hasActiveRestriction()) {
          radio.checked = false;
          if (state.track) {
            const savedRadio = radios.find((item) => item.value === state.track);
            if (savedRadio) savedRadio.checked = true;
          }
          requireFullAccess('Full access is paused during your reflection period. Track changes are unavailable until you complete the reflection and treatment requirements.');
          return;
        }
        state.track = radio.value;
        saveState();
        renderTrackPanel(radio.value);
        renderTrackGate();
        renderSharedMemberViews();
        announce(`${TRACKS[radio.value]} selected. Complete the details below and save your choice.`);
      });
    });

    if (state.track) {
      const savedRadio = radios.find((radio) => radio.value === state.track);
      if (savedRadio) savedRadio.checked = true;
      renderTrackPanel(state.track);
    } else {
      renderTrackPanel(null);
    }

    // Academy “Ask to apprentice” buttons preselect the apprentice track.
    const apprenticeshipCraftMap = {
      'Safe home repair': 'home-repair',
      'Community web development': 'web',
      'Organic gardening': 'garden'
    };

    $$('[data-apprentice]').forEach((button) => {
      button.addEventListener('click', () => {
        const apprenticeRadio = radios.find((radio) => radio.value === 'apprentice');
        if (!apprenticeRadio) return;

        apprenticeRadio.checked = true;
        state.track = 'apprentice';
        saveState();
        renderTrackPanel('apprentice', { focusPanel: true });
        renderTrackGate();

        const craft = apprenticeshipCraftMap[button.dataset.apprentice];
        const craftSelect = document.getElementById('apprentice-craft');
        if (craft && craftSelect) craftSelect.value = craft;

        announce('Apprentice track selected. Review the craft and save your details below.');
        showToast('Apprentice track selected. Finish your details in Join & Tracks.', false);

        const panel = document.getElementById('track-panel');
        if (panel) {
          panel.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     07. Tabs, navigation & page polish
     ------------------------------------------------------------------------ */
  function initTabs() {
    const tablist = document.querySelector('#care-tabs [role="tablist"]');
    if (!tablist) return;

    const tabs = $$('[role="tab"]', tablist);

    function activate(tab, shouldFocus) {
      tabs.forEach((item) => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        item.classList.toggle('is-active', selected);

        const panel = document.getElementById(item.getAttribute('aria-controls'));
        if (panel) panel.hidden = !selected;
      });
      if (shouldFocus) tab.focus();
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab, false));
      tab.addEventListener('keydown', (event) => {
        let targetIndex = null;

        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          targetIndex = (index + 1) % tabs.length;
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          targetIndex = (index - 1 + tabs.length) % tabs.length;
        } else if (event.key === 'Home') {
          targetIndex = 0;
        } else if (event.key === 'End') {
          targetIndex = tabs.length - 1;
        }

        if (targetIndex !== null) {
          event.preventDefault();
          activate(tabs[targetIndex], true);
        }
      });
    });
  }

  function initHeader() {
    const header = document.getElementById('site-header');
    const toggle = document.getElementById('nav-toggle');
    const nav = document.getElementById('primary-nav');
    if (!header || !toggle || !nav) return;

    const toggleLabel = $('.sr-only', toggle);
    const navLinks = $$('a[href^="#"]', nav).filter((link) => !link.classList.contains('nav-cta'));
    const navSections = navLinks
      .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
      .filter((item) => item.section);

    function setNavOpen(open) {
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (toggleLabel) toggleLabel.textContent = open ? 'Close navigation menu' : 'Open navigation menu';
    }

    toggle.addEventListener('click', () => {
      setNavOpen(!header.classList.contains('nav-open'));
    });

    nav.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;

      const wasOpen = header.classList.contains('nav-open');
      if (!wasOpen) return;

      setNavOpen(false);

      // On small screens the menu covers the page. Move focus to the section
      // heading so keyboard and screen-reader users land at the destination.
      if (link.hash && link.hash.length > 1) {
        window.requestAnimationFrame(() => {
          const target = document.getElementById(link.hash.slice(1));
          if (!target) return;
          const heading = target.matches('h1, h2, h3, h4')
            ? target
            : target.querySelector('h1, h2, h3, h4');
          if (!heading) return;
          if (!heading.hasAttribute('tabindex')) {
            heading.setAttribute('tabindex', '-1');
            heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
          }
          heading.focus({ preventScroll: true });
        });
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && header.classList.contains('nav-open')) {
        setNavOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (header.classList.contains('nav-open') && !header.contains(event.target)) {
        setNavOpen(false);
      }
    });

    function updateActiveNav() {
      const threshold = window.scrollY + header.offsetHeight + 120;
      let activeLink = null;

      navSections.forEach(({ link, section }) => {
        if (section.offsetTop <= threshold) activeLink = link;
      });

      navLinks.forEach((link) => {
        if (link === activeLink) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    let scrollTicking = false;
    function onScroll() {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(() => {
        header.classList.toggle('is-scrolled', window.scrollY > 8);
        updateActiveNav();
        scrollTicking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    updateActiveNav();
  }

  function initVideo() {
    const video = document.querySelector('.pledge-video');
    if (!video) return;

    let errorShown = false;
    function showVideoFallback() {
      if (errorShown) return;
      errorShown = true;
      const note = $('.video-caption p');
      if (note) {
        note.textContent = 'The placeholder clip could not load here. The full written pledge is available beside the player, and the captions file is in the project assets.';
      }
    }

    const source = video.querySelector('source');
    if (source) source.addEventListener('error', showVideoFallback);
    video.addEventListener('error', showVideoFallback);

    // A source error can fire before this deferred script attaches its listener.
    if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      showVideoFallback();
    }
  }

  function initFooterYear() {
    const year = document.getElementById('copyright-year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------------------
     08. Dialogs, land inquiries & reset
     ------------------------------------------------------------------------ */
  function openDialog(dialog) {
    if (!dialog) return;

    dialog._returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      // Minimal fallback for very old browsers without <dialog> support.
      dialog.setAttribute('open', '');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
    }

    document.body.classList.add('dialog-open');

    window.requestAnimationFrame(() => {
      const closeButton = dialog.querySelector('.icon-button');
      if (closeButton) {
        closeButton.focus();
      } else {
        const firstField = dialog.querySelector('input, select, textarea, button, a[href]');
        if (firstField) firstField.focus();
      }
    });
  }

  function closeDialog(dialog, options = {}) {
    if (!dialog) return;
    const { restoreFocus = true } = options;
    const returnFocus = dialog._returnFocus;

    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      dialog.removeAttribute('aria-modal');
    }

    dialog._returnFocus = null;

    if (!document.querySelector('dialog[open]')) {
      document.body.classList.remove('dialog-open');
    }

    if (restoreFocus && returnFocus && returnFocus.isConnected) {
      window.requestAnimationFrame(() => {
        if (returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
      });
    }
  }

  function initDialogBasics() {
    const dialogs = $$('dialog');

    dialogs.forEach((dialog) => {
      dialog.addEventListener('close', () => {
        if (!document.querySelector('dialog[open]')) {
          document.body.classList.remove('dialog-open');
        }
      });

      // Clicking the backdrop closes the dialog; clicking inside does not.
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) closeDialog(dialog);
      });

      // Native modal dialogs close on Escape, but wiring it explicitly keeps
      // the fallback path and assistive setups consistent.
      dialog.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || event.isComposing) return;
        event.preventDefault();
        closeDialog(dialog);
      });
    });

    $$('[data-dialog-close]').forEach((button) => {
      button.addEventListener('click', () => {
        const dialog = button.closest('dialog');
        if (dialog) closeDialog(dialog);
      });
    });
  }

  function openConsentDialog(listingId, trigger) {
    const dialog = document.getElementById('consent-dialog');
    const form = document.getElementById('consent-form');
    const summaryTitle = document.getElementById('request-summary-title');
    const summaryMeta = document.getElementById('request-summary-meta');
    const summaryLabel = document.querySelector('#request-summary .request-summary-label');
    const title = document.getElementById('consent-title');
    const description = document.getElementById('consent-description');
    const listing = findListing(listingId);

    if (!dialog || !form || !listing) return;

    if (!isListingProviderAvailable(listing)) {
      showToast(`${listing.provider} is unavailable and is not receiving labor or product requests right now.`);
      return;
    }

    currentRequestMode = isMember() ? 'mutual' : 'purchase';
    if (currentRequestMode === 'purchase' && !canPurchaseAsNonmember(listing)) {
      showToast('Non-member purchase is not enabled for this offer. Pledged members receive it free.');
      return;
    }
    currentListingId = listing.id;
    form.reset();

    // The price belongs to the provider, not the non-member. Lock the field so
    // the intent records the member-set amount for the Unbought donation fund.
    const nonmemberPrice = getNonmemberPrice(listing);
    const amountInput = document.getElementById('purchase-amount');
    if (amountInput) {
      amountInput.value = nonmemberPrice || '';
      amountInput.readOnly = true;
    }
    const amountLabel = document.querySelector('label[for="purchase-amount"]');
    if (amountLabel) {
      amountLabel.innerHTML = 'Price for non-members (USD) <span class="required-mark" aria-hidden="true">*</span>';
    }
    const priceHint = document.getElementById('purchase-price-hint');
    if (priceHint) {
      priceHint.textContent = `Set by the provider. Every cent goes to the Unbought donation fund; no payment is processed here. Members get this free.`;
    }

    // Members use mutual-aid mode so the purchase fields are hidden for them,
    // but fill the name field too: no non-intake form asks a member to retype it.
    fillOwnNameField(document.getElementById('purchase-name'));

    // Toggle purchase/member fields if present
    const mutualFields = document.getElementById('consent-mutual-fields');
    const purchaseFields = document.getElementById('consent-purchase-fields');
    if (mutualFields) mutualFields.hidden = currentRequestMode !== 'mutual';
    if (purchaseFields) purchaseFields.hidden = currentRequestMode !== 'purchase';
    $$('input, textarea, select', mutualFields || document).forEach((el) => {
      if (!mutualFields || !mutualFields.contains(el)) return;
      if (el.type === 'checkbox') el.required = currentRequestMode === 'mutual';
    });
    $$('input, textarea, select', purchaseFields || document).forEach((el) => {
      if (!purchaseFields || !purchaseFields.contains(el)) return;
      const requiredPurchase = ['purchaseName', 'purchaseEmail', 'purchaseAmount', 'purchaseAgreement'];
      if (requiredPurchase.includes(el.name)) el.required = currentRequestMode === 'purchase';
    });

    if (summaryTitle) summaryTitle.textContent = listing.title;
    if (summaryMeta) {
      summaryMeta.textContent = `${PILLARS[listing.pillar].label} · ${EXCHANGES[listing.exchange].label} · Offered by ${listing.provider}`;
    }
    if (summaryLabel) summaryLabel.textContent = currentRequestMode === 'purchase' ? 'Your purchase request' : 'Your request';

    if (title) title.textContent = currentRequestMode === 'purchase' ? 'Buy as a non-member' : 'Request with mutual consent';
    if (description) {
      description.textContent = currentRequestMode === 'purchase'
        ? `In this prototype, non-members can record a purchase intent at the provider's set price of ${formatMoney(nonmemberPrice)}. Every cent is recorded locally for the Unbought donation fund; no real payment is processed and nothing is transmitted. Members receive the same offer free through mutual aid.`
        : 'A request starts a conversation. It does not create a sale, a deposit, or a guarantee that an item is still available.';
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = currentRequestMode === 'purchase' ? 'Record purchase intent' : 'Confirm request';

    dialog._trigger = trigger || null;
    openDialog(dialog);
  }

  function initConsentDialog() {
    const dialog = document.getElementById('consent-dialog');
    const form = document.getElementById('consent-form');
    if (!dialog || !form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const listing = findListing(currentListingId);
      if (!listing) {
        closeDialog(dialog);
        return;
      }

      if (!isListingProviderAvailable(listing)) {
        closeDialog(dialog);
        showToast(`${listing.provider} is unavailable and cannot receive labor or product requests right now.`);
        return;
      }

      const data = new FormData(form);

      if (currentRequestMode === 'purchase') {
        if (!canPurchaseAsNonmember(listing)) {
          closeDialog(dialog);
          showToast('Non-member purchase is not enabled for this offer.');
          return;
        }
        // Always use the provider's stored price, never a value typed in the
        // dialog, so the recorded fund amount cannot be changed by a buyer.
        const amount = getNonmemberPrice(listing);
        const purchaserName = cleanString(data.get('purchaseName'), 60);
        const purchaserEmail = cleanString(data.get('purchaseEmail'), 120);
        if (!purchaserName || !purchaserEmail) return;

        const now = new Date().toISOString();
        const request = {
          id: makeId('purchase'),
          type: 'nonmember_purchase',
          memberId: '',
          listingId: listing.id,
          listingTitle: listing.title,
          provider: listing.provider,
          pillar: listing.pillar,
          note: cleanString(data.get('note'), 280),
          purchaserName,
          purchaserEmail,
          amount,
          requestedAt: now,
          status: 'purchase_intent',
          fund: 'unbought',
          unitPrice: amount
        };
        state.requests.unshift(request);
        state.requests = state.requests.slice(0, 100);

        const contribution = {
          id: makeId('contribution'),
          memberId: '',
          type: 'severance_purchase',
          fund: 'unbought',
          amount,
          hours: 0,
          profession: '',
          stateRegion: '',
          hourlyRate: 0,
          stockValue: 0,
          sourceId: request.id,
          note: `Non-member purchase intent: ${listing.title}`,
          createdAt: now,
          status: 'recorded',
          purchaserEmail,
          purchaserName
        };
        state.contributions = Array.isArray(state.contributions) ? state.contributions : [];
        state.contributions.unshift(contribution);
        state.contributions = state.contributions.slice(0, 200);

        state.severanceFund = state.severanceFund || { balance: 0, contributions: [] };
        state.severanceFund.balance = (Number(state.severanceFund.balance) || 0) + amount;
        state.severanceFund.contributions = Array.isArray(state.severanceFund.contributions) ? state.severanceFund.contributions : [];
        state.severanceFund.contributions.unshift(contribution.id);
        state.severanceFund.contributions = state.severanceFund.contributions.slice(0, 500);

        addNotification('request', `Purchase intent: ${listing.title}`,
          `Recorded locally at ${formatMoney(amount)} for the Unbought donation fund. In a live system the provider would be notified; nothing was transmitted.`,
          { tab: 'exchanges', sourceId: request.id });
        saveState();
        closeDialog(dialog, { restoreFocus: false });
        currentListingId = null;
        applyFilters();
        focusListingTitle(listing.id);
        announce(`Purchase intent recorded for ${listing.title}. ${formatMoney(amount)} is recorded locally for the Unbought donation fund in this prototype.`);
        showToast('Purchase intent recorded locally for the Unbought donation fund. No payment was processed and nothing was transmitted.', false);
        return;
      }

      if (!isMember()) {
        closeDialog(dialog);
        showToast('Sign the Unbought Pledge to make a mutual-aid request as a member.');
        return;
      }

      if (!requireFullAccess('Full access is paused during your reflection period. Mutual-aid requests are unavailable until you complete the reflection and treatment requirements.')) {
        closeDialog(dialog);
        return;
      }

      if (state.requests.some((request) => request.listingId === listing.id && request.memberId === state.pledge.memberId && request.type !== 'nonmember_purchase')) {
        closeDialog(dialog);
        announce('A request for this offering is already saved in your browser.');
        showToast('This request is already recorded locally.', false);
        return;
      }

      const request = {
        id: makeId('request'),
        type: 'mutual_aid_request',
        memberId: state.pledge.memberId,
        listingId: listing.id,
        listingTitle: listing.title,
        provider: listing.provider,
        pillar: listing.pillar,
        memberName: state.pledge.name,
        workerId: listing.isUser ? cleanString(listing.memberId, 100) : '',
        workerHours: 0,
        workerConfirmedAt: '',
        receiverHours: 0,
        receiverConfirmedAt: '',
        loggedHours: 0,
        logSource: '',
        loggedAt: '',
        evidence: [],
        review: null,
        note: cleanString(data.get('note'), 280),
        requestedAt: new Date().toISOString(),
        status: 'requested'
      };
      state.requests.unshift(request);
      state.requests = state.requests.slice(0, 100);
      addNotification('request', `Request: ${listing.title}`,
        `Recorded locally for ${listing.provider}. In a live system they would be notified; nothing was transmitted.`,
        { tab: 'exchanges', sourceId: request.id });
      saveState();

      closeDialog(dialog, { restoreFocus: false });
      currentListingId = null;
      applyFilters();
      focusListingTitle(listing.id);

      announce(`Request recorded for ${listing.title}. This prototype saved it in your browser only.`);
      showToast('Request recorded locally. No data left this device.', false);
    });
  }

  function syncInquiryFields() {
    const typeSelect = document.getElementById('inquiry-type');
    const waitlistFields = document.getElementById('waitlist-fields');
    const landFields = document.getElementById('land-fields');
    const title = document.getElementById('inquiry-title');
    const description = document.getElementById('inquiry-description');
    const agreementLabel = document.getElementById('inquiry-agreement-label');
    const noteLabel = document.getElementById('inquiry-note-label');
    if (!typeSelect) return;

    const type = typeSelect.value;
    currentInquiryType = type;

    const showWaitlist = type === 'waitlist';
    const showLand = type === 'land';

    if (waitlistFields) waitlistFields.hidden = !showWaitlist;
    if (landFields) landFields.hidden = !showLand;

    // Disable hidden fields so required validation and FormData stay clean.
    if (waitlistFields) {
      $$('input, select, textarea', waitlistFields).forEach((field) => {
        field.disabled = !showWaitlist;
      });
    }
    if (landFields) {
      $$('input, select, textarea', landFields).forEach((field) => {
        field.disabled = !showLand;
      });
    }

    if (title) {
      title.textContent = showLand
        ? 'Offer land or a building'
        : type === 'question'
          ? 'Ask the land circle'
          : 'Join the housing waitlist';
    }

    if (description) {
      description.textContent = showLand
        ? 'Tell us a little about the land or building, and how you would like it to serve the community. A conversation comes before any agreement.'
        : type === 'question'
          ? 'Ask the land circle about community land trusts, stewardship, affordability, or how decisions are made. No question is too basic.'
          : 'This is an early planning conversation, not an application for housing or credit. Share only what you are comfortable sharing.';
    }

    if (agreementLabel) {
      agreementLabel.textContent = showLand
        ? 'I understand this is an initial conversation, not a legal or financial commitment.'
        : type === 'question'
          ? 'I understand this is a planning-stage prototype and no one is obligated to respond.'
          : 'I understand this is a planning-stage waitlist, not an offer of housing or credit.';
    }

    if (noteLabel) {
      noteLabel.textContent = showLand
        ? 'What should the land circle know? (optional)'
        : 'What would you like us to know? (optional)';
    }
  }

  function openInquiryDialog(type) {
    const dialog = document.getElementById('inquiry-dialog');
    const form = document.getElementById('inquiry-form');
    const typeSelect = document.getElementById('inquiry-type');
    if (!dialog || !form || !typeSelect) return;

    form.reset();
    typeSelect.value = ['waitlist', 'land', 'question'].includes(type) ? type : 'waitlist';
    syncInquiryFields();
    openDialog(dialog);
  }

  function initInquiryDialog() {
    const dialog = document.getElementById('inquiry-dialog');
    const form = document.getElementById('inquiry-form');
    const typeSelect = document.getElementById('inquiry-type');
    if (!dialog || !form || !typeSelect) return;

    typeSelect.addEventListener('change', syncInquiryFields);

    $$('[data-inquiry]').forEach((button) => {
      button.addEventListener('click', () => openInquiryDialog(button.dataset.inquiry));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const type = String(data.get('inquiryType') || currentInquiryType);
      const inquiry = {
        id: makeId('inquiry'),
        type,
        name: cleanString(data.get('name'), 60),
        contact: cleanString(data.get('contact'), 120),
        location: cleanString(data.get('location'), 80),
        household: cleanString(data.get('household'), 20),
        access: cleanString(data.get('access'), 120),
        propertyType: cleanString(data.get('propertyType'), 40),
        tenure: cleanString(data.get('tenure'), 40),
        note: cleanString(data.get('note'), 400),
        createdAt: new Date().toISOString()
      };

      state.inquiries.unshift(inquiry);
      state.inquiries = state.inquiries.slice(0, 100);
      saveState();

      closeDialog(dialog);

      const status = document.getElementById('land-inquiry-status');
      if (status) {
        status.textContent = type === 'land'
          ? 'Your land or building inquiry is saved in this browser. A land-circle host would follow up in a real deployment.'
          : type === 'question'
            ? 'Your question is saved in this browser. A land-circle host would follow up in a real deployment.'
            : 'Your housing waitlist inquiry is saved in this browser. This is a planning-stage prototype, not a housing offer.';
      }

      showToast('Inquiry saved locally. Nothing was transmitted.', false);
    });
  }

  function showConfirm(options) {
    const dialog = document.getElementById('confirm-dialog');
    const title = document.getElementById('confirm-title');
    const message = document.getElementById('confirm-message');
    const accept = document.getElementById('confirm-accept');
    if (!dialog || !title || !message || !accept) return;

    title.textContent = options.title || 'Are you sure?';
    message.textContent = options.message || '';
    accept.textContent = options.confirmLabel || 'Confirm';
    accept.className = `button ${options.tone === 'danger' ? 'button--danger' : 'button--primary'}`;
    confirmAction = typeof options.onConfirm === 'function' ? options.onConfirm : null;

    openDialog(dialog);
  }

  function initConfirmDialog() {
    const dialog = document.getElementById('confirm-dialog');
    const accept = document.getElementById('confirm-accept');
    const cancel = document.getElementById('confirm-cancel');
    if (!dialog || !accept) return;

    accept.addEventListener('click', () => {
      const action = confirmAction;
      confirmAction = null;
      closeDialog(dialog, { restoreFocus: false });
      if (action) action();
    });

    if (cancel) {
      cancel.addEventListener('click', () => {
        confirmAction = null;
        closeDialog(dialog);
      });
    }

    $$('[data-confirm-close]', dialog).forEach((button) => {
      button.addEventListener('click', () => {
        confirmAction = null;
        closeDialog(dialog);
      });
    });

    dialog.addEventListener('close', () => {
      confirmAction = null;
    });
  }

  function initResetDemo() {
    const resetButton = document.getElementById('reset-demo');
    if (!resetButton) return;

    resetButton.addEventListener('click', () => {
      showConfirm({
        title: 'Demo Reset / Clear Local Data',
        message: 'This removes your pledge and membership, account credentials, track, listings and listing comments, requests, inquiries, donation intents, contributions, Unbought donation fund records, volunteer offers, reports and votes, notifications, friends, groups, social chat drafts, messages, suggestions, waiting-list entry, and settings from this browser. It cannot be undone.',
        confirmLabel: 'Clear local data',
        tone: 'danger',
        onConfirm: () => {
          try {
            localStorage.removeItem(STORAGE_KEY);
            Object.keys(localStorage)
              .filter((key) => key.startsWith('unbought'))
              .forEach((key) => localStorage.removeItem(key));
          } catch (error) {
            // Storage may be blocked; the in-memory reset below still applies.
          }

          state = createDefaultState();
          currentListingId = null;

          const pledgeForm = document.getElementById('pledge-form');
          if (pledgeForm) pledgeForm.reset();

          const postForm = document.getElementById('post-form');
          if (postForm) postForm.reset();

          const consentForm = document.getElementById('consent-form');
          if (consentForm) consentForm.reset();

          const inquiryForm = document.getElementById('inquiry-form');
          if (inquiryForm) inquiryForm.reset();

          const donationForm = document.getElementById('donation-form');
          if (donationForm) donationForm.reset();

          $$('input[name="membership-track"]').forEach((radio) => {
            radio.checked = false;
          });

          renderPledge();
          renderTrackGate();
          renderTrackPanel(null);
          renderSharedMemberViews();
          renderVolunteerStatus();
          renderDashboard();
          renderAccountability();
          resetFilters();
          renderAuthUi();

          const postStatus = document.getElementById('post-status');
          if (postStatus) postStatus.textContent = 'For pledged members. Stored only on this device. Nothing is transmitted.';

          const landStatus = document.getElementById('land-inquiry-status');
          if (landStatus) landStatus.textContent = '';

          document.dispatchEvent(new CustomEvent('unbought:reset'));

          resetButton.focus({ preventScroll: true });
          announce('All local demo data has been cleared. The page is back to its starting state.');
          showToast('Local demo data cleared.', false);
        }
      });
    });
  }

  // A small always-visible question mark keeps the FAQ one tap away on every
  // page, including the FAQ itself.
  function initFaqButton() {
    if (document.getElementById('faq-fab')) return;
    const link = document.createElement('a');
    link.id = 'faq-fab';
    link.className = 'faq-fab';
    link.href = 'faq.html';
    link.setAttribute('aria-label', 'Open the frequently asked questions');
    const mark = document.createElement('span');
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '?';
    link.appendChild(mark);
    document.body.appendChild(link);
  }

  function initDialogs() {
    initDialogBasics();
    initReportDialog();
    initConsentDialog();
    initInquiryDialog();
    initConfirmDialog();
    initResetDemo();
  }

  /* ------------------------------------------------------------------------
     09. Initialization
     ------------------------------------------------------------------------ */
  function initPhaseGating() {
    document.querySelectorAll('[data-phase]').forEach((item) => {
      item.hidden = Number(item.dataset.phase) > SITE_PHASE;
    });
  }

  function init() {
    initPhaseGating();
    initHeader();
    initPledgePage();
    initHeaderSearch();
    initHeaderNotifications();
    initPledgeForm();
    initSigninForm();
    initVolunteerForm();
    syncTownGroup();
    initDashboard();
    initDashboardMenu();
    initSkillPickers();
    initProfileViewToggle();
    initPhoneFields();
    initProfilePrivacyForm();
    initProfileFriendActions();
    initGroupPostActions();
    initGroupAdminForm();
    initGroupSettings();
    initProfileThemeForm();
    initAccountability();
    initTracks();
    initTabs();
    initDirectory();
    initPostForm();
    initDialogs();
    initVideo();
    initFaqButton();
    initFooterYear();
    renderSharedMemberViews();
    renderAuthUi();
    renderNewsFeeds();
    document.addEventListener('unbought:donation-recorded', () => {
      // donation.js writes to shared state; reload to reflect in account UI
      try {
        state = loadState();
        if (state.pledge) {
          const recordedDonations = getMemberDonationIntents().length;
          state.pledge.donationCount = Math.max(cleanCount(state.pledge.donationCount), recordedDonations);
          saveState();
        }
      } catch (error) {
        // ignore
      }
      renderSharedMemberViews();
      renderDashboard();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
