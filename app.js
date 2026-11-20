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
      title: 'Seed and founding members',
      body: 'The first person of a profession to sign up in a ZIP code is a seed member. Seed members who join during the first year are founding members. Membership years begin at the northern vernal equinox, and the labels stay pending until rollout so the first year can be counted honestly.'
    },
    {
      date: '2026-11-14',
      label: 'Nov 14, 2026',
      tag: 'Academy',
      title: 'Learning now, giving back later',
      body: 'The Academy is free for pledged members. Neighbors 15 and older who are not already working in the commons may learn with basic-necessities-only access, promising part-time work for Unbought for one year after finishing — before their 25th birthday. Non-member tuition and any tuition obligation go to the Unbought donation fund.'
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
      body: 'We hope to partner with an organization for a large festival somewhere in the United States on March 20, 2028, at 4:25pm Eastern, celebrating the movement and its seed and founding members. It is an intention, not a booked event. The moment matters because we will have been fully rolled out for a full year, meaning something must be working.'
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
  const MEMBER_LABELS = Object.freeze({
    seed: 'Seed member',
    founding: 'Founding member'
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

  const REFLECTION_OPTIONS = Object.freeze([30, 90, 180]);
  const TREATMENT_STEPS = Object.freeze([
    { key: 'evaluation', label: 'Therapeutic evaluation completed (inside or outside Unbought)' },
    { key: 'plan', label: 'Recommended treatment plan documented' },
    { key: 'treatment', label: 'Treatment completed or sustained as recommended' }
  ]);

  /* ------------------------------------------------------------------------
     02. State, storage & small helpers
     ------------------------------------------------------------------------ */
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
      contributions: [],
      volunteerInterests: [],
      reports: [],
      notifications: [],
      friends: [],
      groups: [],
      socialChats: [],
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
    const entry = {
      memberId: pledge.memberId,
      profession,
      professionKey: profession.toLowerCase(),
      zip,
      signedAt: cleanString(pledge.signedAt, 40),
      standing: cleanString(pledge.status, 30) || 'active',
      track: cleanString(state.track, 30)
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

  function isFoundingMember(member) {
    if (!isSeedMember(member)) return false;
    const when = Date.parse(member.signedAt);
    return !Number.isNaN(when) && when >= Date.parse(FIRST_YEAR_START) && when < Date.parse(FIRST_YEAR_END);
  }

  function getMemberLabels(member) {
    const labels = [];
    if (isSeedMember(member)) {
      labels.push({
        key: 'seed',
        name: MEMBER_LABELS.seed,
        detail: `First ${normalizeProfession(member.profession) || 'profession'} in ZIP ${normalizeZip(member.zip || zipFromAddress(member.mailingAddress))} in this browser.`
      });
    }
    if (isFoundingMember(member)) {
      labels.push({
        key: 'founding',
        name: MEMBER_LABELS.founding,
        detail: `Signed during the first equinox year, ${formatDate(FIRST_YEAR_START)} to ${formatDate(FIRST_YEAR_END)}.`
      });
    }
    return labels;
  }

  function renderMemberLabelsHtml(member) {
    const labels = getMemberLabels(member);
    const guidelinesLink = '<p class="member-label-link"><a href="guidelines.html">Community guidelines and consequences →</a></p>';
    if (!labels.length) {
      return `<div class="member-labels" role="note"><p>No member labels yet.</p>${guidelinesLink}</div>`;
    }
    const live = labelsLive();
    const badges = labels.map((label) => `<span class="member-label member-label--${label.key}${live ? '' : ' is-pending'}">${escapeHtml(label.name)}</span>`).join('');
    const note = live
      ? labels.map((label) => escapeHtml(label.detail)).join(' ')
      : `Beta testing runs until the exact 2027 vernal equinox, March 20, 2027 at 4:25pm Eastern — the day Unbought rolls out for everyone. Until then, people can become seed members, and we log the day each one joins. The site will not roll out before that moment; it is the first day of Unbought's first official year, so your labels stay pending until then. ${labels.map((label) => escapeHtml(label.detail)).join(' ')}`;
    return `<div class="member-labels" role="note"><div class="member-label-list">${badges}</div><p>${note}</p>${guidelinesLink}</div>`;
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
    const founding = isFoundingMember(member);
    return `<details class="seed-email">
      <summary>See your seed-member thank-you message</summary>
      <div class="seed-email-body">
        <p class="seed-email-note">Prototype: in a live system this message would be emailed to you automatically as soon as you became a seed member. It is generated here only as a draft. Nothing is sent or transmitted.</p>
        <p><strong>To:</strong> ${e(firstName)} (chosen name; no email is collected)<br><strong>Subject:</strong> ${e(`Thank you for starting Unbought, ${firstName}`)}</p>
        <p>Hi ${e(firstName)},</p>
        <p>Thank you for helping to start the movement. You are the first ${e(profession)} to sign up for Unbought in ZIP ${e(zip || 'your area')} — a seed member. ${founding ? 'Because you signed during the first equinox year, you are also a founding member.' : ''} Seed members are the people who prove a new trade can take root in a place; the whole commons begins with someone willing to go first.</p>
        <p>Beta testing runs until the exact 2027 vernal equinox, March 20, 2027 at 4:25pm Eastern — the day Unbought rolls out for everyone and the first day of its first official year. Until then, people can become seed members, and we log the day each one joins. Your labels stay pending until rollout. If we are successful, we hope to partner with an organization and throw a huge festival somewhere in the United States on the following equinox, March 20, 2028 — one full year after rollout — to celebrate the movement and its seed and founding members. Nothing is booked or confirmed yet, but as a seed member you will hear about it first.</p>
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

  function setSession(signedIn) {
    if (!state.auth) state.auth = { credential: null, session: {} };
    state.auth.session = {
      signedIn: Boolean(signedIn),
      signedInAt: signedIn ? new Date().toISOString() : null
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
  function getHourTotals(memberId) {
    const id = memberId || (isMember() ? state.pledge.memberId : '');
    if (!id) return { week: 0, month: 0, year: 0, all: 0 };
    const entries = (Array.isArray(state.contributions) ? state.contributions : [])
      .filter((c) => c && c.memberId === id && c.type === 'labor' && c.mutualConfirmation === true);
    return getPeriodTotals(entries, 'createdAt', (c) => cleanHours(c.hours));
  }

  function getDonationTotals() {
    const contributions = getMemberContributions().filter((c) => c && c.type === 'donation');
    const linked = new Set(contributions.map((c) => c.sourceId));
    const extras = getMemberDonationIntents()
      .filter((intent) => intent && !linked.has(intent.id))
      .map((intent) => ({ createdAt: intent.savedAt, amount: Number(intent.amount) || 0 }));
    return getPeriodTotals([...contributions, ...extras], 'createdAt', (item) => Number(item.amount) || 0);
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
      count: donations.length + purchases.length
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
      showToast(message || 'Full access is paused during your reflection period. Basic necessities remain available.');
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
        fallback.pledge = {
          memberId: cleanString(raw.pledge.memberId, 100) || makeId('member'),
          name,
          fullName: cleanString(raw.pledge.fullName, 100),
          location: cleanString(raw.pledge.location, 80),
          mailingAddress: cleanString(raw.pledge.mailingAddress, 240),
          physicalAddress: cleanString(raw.pledge.physicalAddress, 240),
          housingStatus: normalizeHousingStatus(raw.pledge.housingStatus),
          phone: cleanString(raw.pledge.phone, 40),
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
            profession,
            professionKey: profession.toLowerCase(),
            zip: normalizeZip(item.zip),
            signedAt: cleanString(item.signedAt, 40),
            standing: cleanString(item.standing, 30) || 'active',
            track: cleanString(item.track, 30)
          };
        })
        .slice(0, 500);
    }

    const rawAuth = raw.auth && typeof raw.auth === 'object' ? raw.auth : null;
    const rawCredential = rawAuth && rawAuth.credential && typeof rawAuth.credential === 'object'
      ? rawAuth.credential
      : null;
    if (rawCredential) {
      const username = normalizeUsername(rawCredential.username);
      const salt = cleanString(rawCredential.salt, 40);
      const passwordHash = cleanString(rawCredential.passwordHash, 16);
      if (username && salt && passwordHash) {
        fallback.auth.credential = { username, salt, passwordHash };
      }
    }
    if (rawAuth && rawAuth.session && typeof rawAuth.session === 'object') {
      fallback.auth.session = {
        signedIn: Boolean(rawAuth.session.signedIn),
        signedInAt: cleanString(rawAuth.session.signedInAt, 40) || null
      };
    }
    if (!fallback.auth.credential && fallback.pledge) {
      // Legacy local pledges predate usernames; keep them signed in.
      fallback.auth.session = { signedIn: true, signedInAt: fallback.pledge.signedAt };
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
                    memberId: cleanString(vote.memberId, 100),
                    name: cleanString(vote.name, 60),
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
          thankYouEmailQueued: Boolean(item.thankYouEmailQueued)
        }))
        .filter((item) => item.amount >= 1 && ['one-time', 'monthly', 'pledge-later'].includes(item.frequency));
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
          respondentName: cleanString(item.respondentName, 80),
          respondentMemberId: cleanString(item.respondentMemberId, 100),
          type: cleanString(item.type, 40),
          typeLabel: hasOwn(REPORT_TYPES, item.type) ? REPORT_TYPES[item.type].label : cleanString(item.typeLabel, 80),
          route: item.route === 'criminal' ? 'criminal' : 'board',
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
            memberId: cleanString(vote.memberId, 100),
            name: cleanString(vote.name, 60),
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

    if (Array.isArray(raw.chats)) {
      fallback.chats = raw.chats
        .filter((item) => item && typeof item === 'object' && typeof item.body === 'string')
        .slice(0, 300)
        .map((item) => ({
          id: cleanString(item.id, 100) || makeId('chat'),
          memberId: cleanString(item.memberId, 100),
          name: cleanString(item.name, 60),
          channel: cleanString(item.channel, 40) || 'general',
          body: cleanString(item.body, 1200),
          createdAt: cleanString(item.createdAt, 40)
        }));
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

    if (Array.isArray(raw.groups)) {
      fallback.groups = raw.groups
        .filter((item) => item && typeof item === 'object')
        .slice(0, 100)
        .map((item) => {
          const kind = item.kind === 'joined' ? 'joined' : 'own';
          const count = cleanCount(item.memberCount) || 1;
          return {
            id: cleanString(item.id, 100) || makeId('group'),
            kind,
            name: cleanString(item.name, 80),
            purpose: cleanString(item.purpose, 200),
            memberCount: Math.min(SOCIAL_LIMITS.groupMembers, Math.max(1, count)),
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
          body: cleanString(item.body, 1200),
          createdAt: cleanString(item.createdAt, 40)
        }))
        .filter((item) => item.body);
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
      createdAt: new Date().toISOString(),
      read: false
    });
    state.notifications = state.notifications.slice(0, 200);
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

  function listingMatchesFilters(listing, values, scope) {
    if (values.pillar !== 'all' && listing.pillar !== values.pillar) return false;
    if (values.exchange !== 'all' && listing.exchange !== values.exchange) return false;

    if (values.query) {
      const haystack = [
        listing.title, listing.description, listing.provider, listing.location,
        listing.jobTitle, listing.brand, listing.category
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

  function buildListingCard(listing) {
    const card = createEl('article', 'listing-card');
    card.id = `listing-${domId(listing.id)}`;
    card.dataset.pillar = listing.pillar;
    card.dataset.listingId = listing.id;
    if (listing.isUser) card.classList.add('is-user');

    const photos = cleanPostPhotos(listing.photos);
    const listingNonmemberPrice = getNonmemberPrice(listing);

    // On the goods page each offer gets a product-style thumbnail and a
    // prominent free price, a small nod to a familiar catalog layout.
    const isProductCard = listing.pillar === 'goods' && getDirectoryScope() === 'goods';
    if (isProductCard) {
      card.classList.add('product-card');
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
        media.setAttribute('aria-hidden', 'true');
        media.appendChild(createEl('span', 'product-glyph', GOODS_CATEGORY_ICONS[listing.category] || '📦'));
      }
      card.appendChild(media);
      const price = createEl('div', 'product-price');
      if (!isMember() && listingNonmemberPrice) {
        price.classList.add('product-price--nonmember');
        price.appendChild(createEl('span', 'product-price-value', formatMoney(listingNonmemberPrice)));
        price.appendChild(createEl('span', 'product-price-note', 'Non-member price · all of it to the Unbought donation fund · free for members'));
      } else {
        price.appendChild(createEl('span', 'product-price-value', 'FREE'));
        price.appendChild(createEl('span', 'product-price-note', listingNonmemberPrice
          ? `Free for you · non-members pay ${formatMoney(listingNonmemberPrice)} to the fund`
          : goodsCategoryShort(listing)));
      }
      card.appendChild(price);
    } else if (photos.length) {
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

    const matchingRequests = state.requests.filter((request) => request.listingId === listing.id);
    const hasMutualRequest = matchingRequests.some((request) => request.type !== 'nonmember_purchase');
    const hasPurchaseIntent = matchingRequests.some((request) => request.type === 'nonmember_purchase');
    if (hasMutualRequest || hasPurchaseIntent) card.classList.add('is-requested');

    const badges = createEl('div', 'listing-badges');
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
      addBadge(badges, 'badge--fund', `Non-members ${formatMoney(listingNonmemberPrice)} → Unbought donation fund`);
    }
    card.appendChild(badges);

    const title = createEl('h3', 'listing-title', listing.title);
    title.id = `listing-title-${domId(listing.id)}`;
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

    if (!isProductCard && listing.pillar !== 'goods') {
      if (listing.jobTitle) details.push({ label: 'Service', value: listing.jobTitle });
      if (hasOwn(SERVICE_FORMATS, listing.format)) {
        details.push({ label: 'Format', value: SERVICE_FORMATS[listing.format] });
      }
    }

    if (isProductCard) {
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

    details.forEach((detail) => {
      if (!detail || !detail.label || !detail.value) return;
      const row = document.createElement('div');
      row.appendChild(createEl('dt', '', detail.label));
      row.appendChild(createEl('dd', '', detail.value));
      meta.appendChild(row);
    });
    card.appendChild(meta);

    const actions = createEl('div', 'listing-actions');
    const note = createEl(
      'p',
      'listing-note',
      hasMutualRequest
        ? 'Request saved locally · consent first'
        : hasPurchaseIntent
          ? 'Purchase intent recorded locally · no payment processed'
          : !isMember() && !canPurchaseAsNonmember(listing)
            ? 'Free for pledged members · non-member purchase is not enabled for this offer'
            : listing.note || 'Peer offer · consent first'
    );
    note.prepend(createIcon('check'));
    actions.appendChild(note);

    const requestButton = createEl('button', 'button button--small');
    requestButton.type = 'button';
    requestButton.dataset.requestListing = listing.id;

    if (hasMutualRequest) {
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
    commentToggle.setAttribute('aria-controls', `comment-thread-${domId(listing.id)}`);
    commentWrap.appendChild(commentToggle);

    const thread = createEl('div', 'comment-thread');
    thread.id = `comment-thread-${domId(listing.id)}`;
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
      label.htmlFor = `listing-comment-${domId(listing.id)}`;
      const input = createEl('textarea');
      input.id = `listing-comment-${domId(listing.id)}`;
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
      || kind === 'query' || kind === 'city' || kind === 'state' || kind === 'zip'
      || kind === 'nearZip') {
      const idMap = {
        category: 'category-filter',
        brand: 'brand-filter',
        pillar: 'pillar-filter',
        exchange: 'exchange-filter',
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
    const ids = ['pillar-filter', 'exchange-filter', 'category-filter'];
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

  function initDirectory() {
    const pillarFilter = document.getElementById('pillar-filter');
    const exchangeFilter = document.getElementById('exchange-filter');
    const categoryFilter = document.getElementById('category-filter');
    const brandFilter = document.getElementById('brand-filter');
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
      grid.addEventListener('click', (event) => {
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
      });

      grid.addEventListener('submit', (event) => {
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
          `Added locally to ${listing.provider}'s post. Comments stay on the Free Labor or Free Stuff listing; nothing was transmitted.`,
          { sourceId: comment.id });
        saveState();
        applyFilters();
        announce('Your comment was added locally.');
        showToast('Comment saved in this browser. Nothing was transmitted.', false);
      });
    }

    renderStaticFilterOptions();
    renderCategoryFacets();
    renderLaborFacets();
    applyFilters();
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
          <p class="dialog-note"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-shield"></use></svg> Posting is for pledged members. Listings stay in this browser; nothing is sent to a provider or published online.</p>
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
      fillProviderName();
      openDialog(dialog);
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
      const meta = createEl('p', 'account-meta', `${state.pledge.name} · ${state.pledge.location || 'Location not shared'} · Member ID ${state.pledge.memberId}`);
      card.appendChild(meta);
    }

    const stats = createEl('div', 'account-stats');
    const hourPeriods = `Week ${hours.week} hr · month ${hours.month} hr · year ${hours.year} hr · all time ${hours.all} hr`;
    const giftPeriods = `Week ${formatMoney(donated.week)} · month ${formatMoney(donated.month)} · year ${formatMoney(donated.year)} · all time ${formatMoney(donated.all)}`;
    const statDefs = signedIn ? [
      ['Hours worked', hourPeriods],
      ['Donated', giftPeriods],
      ['Your share of the fund', formatMoney(fund.entitled)],
      ['Unbought donation fund (current balance)', formatMoney(fund.balance)]
    ] : [
      ['Unbought donation fund (current balance)', formatMoney(fund.balance)],
      ['Recorded non-member purchase intents', String(fund.count)],
      ['Member benefit', 'Mutual-aid access by pledge (no purchase)'],
      ['Fund income', 'Donations, academy tuition, and non-member purchases']
    ];
    statDefs.forEach(([label, value]) => {
      const s = createEl('div', 'account-stat');
      s.appendChild(createEl('span', 'account-stat-label', label));
      s.appendChild(createEl('strong', 'account-stat-value', value));
      stats.appendChild(s);
    });
    card.appendChild(stats);

    const model = createEl('p', 'account-note', signedIn
      ? 'Prototype model (local only): your hours are shown only after both you and the receiver confirm the work, or after a three-member review vote resolves a disagreement. You cannot enter hours yourself. Giving is shown by week, month, year, and all time. Your share is a local, proportional estimate based on recorded contributions; it is not a payout, debt, or legal claim. Every cent of donations, academy tuition, and non-member purchases goes to the Unbought donation fund. Nothing is transmitted.'
      : 'Prototype model (local only): the Unbought donation fund holds locally recorded donations and non-member purchase intents. Academy tuition would join it in a live system. No money moves, no payouts are made, and nothing is transmitted.');
    card.appendChild(model);

    if (signedIn) {
      const hoursNote = createEl('div', 'account-block');
      hoursNote.appendChild(createEl('h4', '', 'How work hours are logged'));
      hoursNote.appendChild(createEl('p', 'account-note', 'You cannot log your own hours. A service or delivered product is confirmed by both the worker and the receiver, each entering the hours they believe were worked. When the two numbers match, the hours are logged. If they differ, the evidence goes to the review board and three randomly drawn active members — never care circle, students, or observers — vote on the hours to log. Use the Exchanges panel to confirm an exchange.'));
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
          <p id="volunteer-dialog-intro">Tell us where you can help. In this prototype your offer is recorded in this browser only—nothing is sent to a coordinator and no real onboarding happens yet.</p>
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
      ? `Signed in as ${memberName}. Record a volunteer offer in this pop-up—stored in this browser only.`
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
      ? `${interests.length} volunteer offer${interests.length === 1 ? '' : 's'} recorded in this browser${roles ? ` (${roles})` : ''}.`
      : 'No volunteer offers recorded yet.';

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
      announce(`Volunteer offer for ${VOLUNTEER_ROLES[role]} recorded. This prototype saved it in your browser only.`);
      showToast('Volunteer offer recorded locally. No data left this device.', false);
    });

    renderVolunteerStatus();
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
      ['Member ID', `<span class="account-id">${e(m.memberId)}</span>`],
      ['Profession', e(m.profession || 'Not shared')],
      ['Membership year', e(String(membershipYearAt(m.signedAt) ?? 'Unknown'))],
      ['Track', e(track)],
      ['Status', e(m.status || 'active')]
    ];
    return `<div class="account-summary" aria-label="Membership at a glance">
      ${summary.map(([label, value]) => `<div class="account-summary-item"><span>${label}</span><strong>${value}</strong></div>`).join('')}
    </div>`;
  }

  function renderAccountDetailGroups(m, credential, confirmedHours, reportsAgainst) {
    const e = escapeHtml;
    const picture = m.picture
      ? `<img class="profile-photo" src="${e(m.picture)}" alt="Your profile picture">`
      : 'Not added';
    const address = m.publicAddressSource === 'physical' ? m.physicalAddress : m.mailingAddress;
    const publicPlace = parseCityState(address);
    const publicCity = publicPlace?.split(',')[0]?.trim() || 'Not shared';
    const publicState = publicPlace?.split(',')[1]?.trim() || 'Not shared';

    const groups = [
      {
        title: 'Contact & address',
        hint: 'Private to you',
        open: true,
        note: 'These details support accountability and emergency contact. They never appear on your public resume.',
        rows: [
          accountDetail('Full legal name', e(m.fullName || 'Not shared')),
          accountDetail('General location', e(m.location || 'Not shared')),
          accountDetail('Mailing address', e(m.mailingAddress || 'Not shared')),
          accountDetail('Physical address', e(m.physicalAddress || 'Not shared')),
          accountDetail('City', e(publicCity)),
          accountDetail('State', e(publicState)),
          accountDetail('ZIP code', e(m.zip || 'Not shared')),
          accountDetail('Housing status', e(hasOwn(HOUSING_STATUSES, m.housingStatus) ? HOUSING_STATUSES[m.housingStatus] : 'Not shared')),
          accountDetail('Phone number', e(m.phone || 'Not shared')),
          accountDetail('Date of birth', e(m.dob || 'Not shared'))
        ]
      },
      {
        title: 'Profile & skills',
        hint: 'Public where noted',
        open: true,
        note: 'Picture, tag line, bio, profession, and skills can appear on your public resume. Group and private note stay here.',
        rows: [
          accountDetail('Picture', picture),
          accountDetail('Tag line', e(m.tagline || 'Not set')),
          accountDetail('Primary profession or trade', e(m.profession || 'Not shared')),
          accountDetail('Career / paid skills', e(m.paidSkills || 'Not listed')),
          accountDetail('Unpaid skills', e(m.unpaidSkills || 'Not listed')),
          accountDetail('Bio', e(m.bio || 'Not added')),
          accountDetail('Group / crew', e(m.group || 'Not set')),
          accountDetail('Private note', e(m.note || 'Not shared'))
        ]
      },
      {
        title: 'Privacy choices',
        hint: 'What neighbors can see',
        open: false,
        rows: [
          accountDetail('Public City, State from', m.publicAddressSource === 'physical' ? 'Physical address' : 'Mailing address'),
          accountDetail('Public phone', m.publicPhone ? 'Shown on resume' : 'Hidden from resume'),
          accountDetail('Availability', m.available === false ? 'Not available right now' : 'Available')
        ]
      },
      {
        title: 'Commons activity',
        hint: 'Confirmed locally',
        open: false,
        rows: [
          accountDetail('Donation count', String(cleanCount(m.donationCount))),
          accountDetail('Hours worked (confirmed)', e(String(confirmedHours))),
          accountDetail('Hours used on Unbought', e(String(cleanHours(m.hoursUsed)))),
          accountDetail('Items gifted', String(cleanCount(m.itemsGifted))),
          accountDetail('Items taken', String(cleanCount(m.itemsTaken))),
          accountDetail('Volunteer offers', String(getMemberVolunteerInterests().length)),
          accountDetail('Reports made against you', String(reportsAgainst)),
          accountDetail('Pledged on', e(formatDate(m.signedAt) || 'Not recorded'))
        ]
      },
      {
        title: 'Local account access',
        hint: 'Prototype only',
        open: false,
        note: 'This is a local demo credential, not a real login. Nothing is transmitted.',
        rows: [
          accountDetail('Username', e(credential && credential.username ? credential.username : 'Not set')),
          accountDetail('Password hash (local prototype)', e(credential && credential.passwordHash ? credential.passwordHash : 'Not set')),
          accountDetail('Password salt (local prototype)', e(credential && credential.salt ? credential.salt : 'Not set'))
        ]
      }
    ];

    return groups.map((group) => `<details class="account-section"${group.open ? ' open' : ''}>
      <summary><span>${group.title}</span><span class="account-section-hint">${group.hint}</span></summary>
      <div class="account-section-body">
        ${group.note ? `<p class="account-section-note">${group.note}</p>` : ''}
        <dl class="account-details">${group.rows.join('')}</dl>
      </div>
    </details>`).join('');
  }

  function renderAccountInfo() {
    const panel = document.getElementById('settings-panel');
    if (!panel || !isMember()) return;
    const m = state.pledge;
    const s = state.settings || {};
    const e = escapeHtml;
    const credential = getCredential();
    const confirmedHours = getHourTotals().all;
    const reportsAgainst = reportsAboutMember().length;
    const notice = state.settings && state.settings.showPrototypeNotices
      ? `<p class="prototype-note">Prototype: account details, your username, and a salted password hash are stored only on this device. There is no real authentication or server, and nothing is transmitted.</p>`
      : '';
    panel.innerHTML = `<section class="account-card account-panel">
      <header class="account-panel-head">
        <div>
          <p class="eyebrow">Settings</p>
          <h3>Account &amp; preferences</h3>
          <p class="account-subtitle">Your membership record and the local settings for this prototype, together in one place.</p>
        </div>
        <a class="button button--outline button--small" href="profile.html">View public resume</a>
      </header>
      ${notice}
      ${renderMemberLabelsHtml(m)}
      ${renderSeedThankYou(m)}
      ${renderAccountSummary(m)}
      ${renderAccountDetailGroups(m, credential, confirmedHours, reportsAgainst)}
      <details class="account-edit">
        <summary><span>Edit account details</span><span class="account-section-hint">Name, profile, privacy, and counts</span></summary>
        <form class="account-form" data-account-form>
          <fieldset>
            <legend>Basics</legend>
            <div class="form-row">
              <div class="field">
                <label for="account-name">Chosen name</label>
                <input type="text" id="account-name" name="name" maxlength="60" value="${e(m.name)}" required>
              </div>
              <div class="field">
                <label for="account-location">General location</label>
                <input type="text" id="account-location" name="location" maxlength="80" value="${e(m.location || '')}">
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="account-housing">Housing status</label>
                <select id="account-housing" name="housingStatus">
                  ${Object.entries(HOUSING_STATUSES).map(([value, label]) => `<option value="${value}"${m.housingStatus === value ? ' selected' : ''}>${e(label)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="account-public-address">Public City, State from</label>
                <select id="account-public-address" name="publicAddressSource">
                  <option value="mailing"${m.publicAddressSource !== 'physical' ? ' selected' : ''}>Mailing address</option>
                  <option value="physical"${m.publicAddressSource === 'physical' ? ' selected' : ''}>Physical address</option>
                </select>
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Profile &amp; skills</legend>
            <div class="form-row">
              <div class="field">
                <label for="account-paid-skills">Career / paid skills</label>
                <textarea id="account-paid-skills" name="paidSkills" rows="3" maxlength="400">${e(m.paidSkills || '')}</textarea>
              </div>
              <div class="field">
                <label for="account-unpaid-skills">Unpaid skills</label>
                <textarea id="account-unpaid-skills" name="unpaidSkills" rows="3" maxlength="400">${e(m.unpaidSkills || '')}</textarea>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="account-tagline">Tag line</label>
                <input type="text" id="account-tagline" name="tagline" maxlength="90" value="${e(m.tagline || '')}" placeholder="A few words neighbors will see">
              </div>
              <div class="field">
                <label for="account-group">Group / crew</label>
                <input type="text" id="account-group" name="group" maxlength="80" value="${e(m.group || '')}" placeholder="Private to you">
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
          <fieldset>
            <legend>Activity counts</legend>
            <div class="form-row">
              <div class="field"><label for="account-donations">Donation count</label><input type="number" id="account-donations" name="donationCount" min="0" step="1" value="${cleanCount(m.donationCount)}"></div>
              <div class="field"><label for="account-hours-used">Hours used</label><input type="number" id="account-hours-used" name="hoursUsed" min="0" step="0.25" value="${cleanHours(m.hoursUsed)}"></div>
              <div class="field"><label for="account-items-gifted">Items gifted</label><input type="number" id="account-items-gifted" name="itemsGifted" min="0" step="1" value="${cleanCount(m.itemsGifted)}"></div>
              <div class="field"><label for="account-items-taken">Items taken</label><input type="number" id="account-items-taken" name="itemsTaken" min="0" step="1" value="${cleanCount(m.itemsTaken)}"></div>
            </div>
          </fieldset>
          <fieldset class="account-privacy-options">
            <legend>Privacy</legend>
            <label class="checkbox"><input type="checkbox" name="available"${m.available !== false ? ' checked' : ''}> <span>Available for exchanges</span></label>
            <label class="checkbox"><input type="checkbox" name="publicPhone"${m.publicPhone ? ' checked' : ''}> <span>Show my phone number on my public resume</span></label>
          </fieldset>
          <div class="account-form-actions">
            <button type="submit" class="button button--primary button--small">Save account details</button>
          </div>
        </form>
      </details>
      <p class="account-note">Only you can see this full record on this device. Your public resume hides your legal name, street and mailing addresses, ZIP, housing status, birthdate, group, report count, and phone unless you opt in to show the phone. Hours worked are never typed here; they appear only after mutual confirmation or review. To withdraw your membership, use the button in the pledge section.</p>
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
  }

  function renderSettings() {
    renderAccountInfo();
  }

  function getPublicResume(member) {
    const address = member.publicAddressSource === 'physical' ? member.physicalAddress : member.mailingAddress;
    const hoursWorked = getHourTotals(member.memberId).all;
    return {
      displayName: firstName(member.name),
      cityState: parseCityState(address) || parseCityState(member.location) || 'City not shared',
      picture: safeProfileImageUrl(member.picture),
      tagline: cleanString(member.tagline, 90),
      bio: cleanString(member.bio, 600),
      profession: cleanString(member.profession, 80),
      paidSkills: cleanString(member.paidSkills, 400),
      unpaidSkills: cleanString(member.unpaidSkills, 400),
      donationCount: cleanCount(member.donationCount),
      hoursWorked,
      hoursCompleted: hoursWorked,
      hoursUsed: cleanHours(member.hoursUsed),
      itemsGifted: cleanCount(member.itemsGifted),
      itemsTaken: cleanCount(member.itemsTaken),
      available: member.available !== false,
      phone: member.publicPhone ? cleanString(member.phone, 40) : ''
    };
  }

  function renderProfile() {
    const publicPanel = document.getElementById('public-resume');
    const privatePanel = document.getElementById('private-profile');
    if (!publicPanel) return;

    const e = escapeHtml;
    const m = state.pledge;
    const credential = getCredential();
    const confirmedHours = getHourTotals(m && m.memberId).all;
    const reportsAgainst = reportsAboutMember().length;

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

    const resume = getPublicResume(m);
    const skillList = (value) => {
      const items = cleanString(value, 400)
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      return items.length
        ? `<ul class="resume-skills">${items.map((item) => `<li>${e(item)}</li>`).join('')}</ul>`
        : `<p class="resume-empty">Not listed yet.</p>`;
    };
    const metrics = [
      ['Donation count', resume.donationCount],
      ['Hours worked', resume.hoursWorked],
      ['Hours used', resume.hoursUsed],
      ['Items gifted', resume.itemsGifted],
      ['Items taken', resume.itemsTaken]
    ];

    publicPanel.innerHTML = `<section class="resume-card" aria-labelledby="resume-name">
      <div class="resume-head">
        ${resume.picture ? `<img class="resume-photo" src="${resume.picture}" alt="${e(resume.displayName || 'Member')}'s profile picture">` : ''}
        <div>
          <p class="eyebrow">Public resume</p>
          <h2 id="resume-name">${e(resume.displayName || 'Member')}</h2>
          ${resume.tagline ? `<p class="resume-tagline">${e(resume.tagline)}</p>` : ''}
          ${resume.profession ? `<p class="resume-profession">${e(resume.profession)}</p>` : ''}
          <p class="resume-location"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-pin"></use></svg> ${e(resume.cityState)}</p>
          ${resume.phone ? `<p class="resume-phone">Public phone: ${e(resume.phone)}</p>` : ''}
        </div>
        <span class="resume-availability ${resume.available ? 'is-available' : ''}">${resume.available ? 'Available' : 'Not available right now'}</span>
        ${isMember() ? `<button class="button button--ghost button--small button--report" type="button" data-report-context data-report-area="Member profile" data-report-detail="Public resume" data-report-name="${e(resume.displayName)}" data-report-member-id="${e(m.memberId || '')}" data-report-source-id="${e(m.memberId || 'profile')}" aria-label="Report a concern from ${e(resume.displayName)}'s profile">Report from this profile</button>` : ''}
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
      <p class="account-note">This resume shows only the chosen first name, picture, tag line, bio, profession, City/State, skills, commons totals, availability, and an optional public phone. Legal name, street and mailing addresses, ZIP, housing status, birthdate, group, and report count are never included.</p>
      ${isMember() ? `<p class="field-hint">This prototype stores one local member profile. Opening the report fills the name from this resume; you do not type it.</p>` : ''}
    </section>`;

    if (!privatePanel) return;
    if (!isMember()) {
      privatePanel.innerHTML = '';
      return;
    }

    privatePanel.innerHTML = `<section class="account-card private-profile" aria-labelledby="private-profile-title">
      <header class="account-panel-head">
        <div>
          <p class="eyebrow">Private to you</p>
          <h2 id="private-profile-title">Your full member record</h2>
          <p class="account-subtitle">This section appears only in your signed-in browser. It is not part of the public resume.</p>
        </div>
        <a class="button button--outline button--small" href="dashboard.html">Edit in Dashboard</a>
      </header>
      ${renderAccountSummary(m)}
      ${renderAccountDetailGroups(m, credential, confirmedHours, reportsAgainst)}
      <p class="account-note">City, State, ZIP, birthdate, group, report count, and every sensitive record stay here.</p>
    </section>`;
  }

  function renderSharedMemberViews() {
    renderMemberAccount();
    renderProfile();
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
        <label for="hours-${e(role)}-${e(domId(request.id))}">${e(roleLabel(role))} · hours worked</label>
        <input type="number" id="hours-${e(role)}-${e(domId(request.id))}" name="hours" min="0.25" step="0.25" required placeholder="2">
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
      const alreadyVoted = votes.some((vote) => vote.memberId === state.pledge.memberId);
      const seats = Array.from({ length: HOUR_REVIEWER_COUNT }, (_, index) => {
        const seat = panel[index];
        const vote = seat && votes.find((v) => v.memberId === seat.memberId);
        return `<li class="review-seat"><strong>${seat ? e(seat.name) : 'Seat pending'}</strong>
          <span class="contribution-meta">${vote ? `${e(vote.hours)} hr · ${e(vote.reason || 'No reason given')}` : 'Not voted yet'}</span></li>`;
      }).join('');
      return `<div class="hour-review">
        <p class="account-note">The numbers differ, so three randomly drawn active members decide the hours. Care circle, students, observers, and either party are excluded. In this browser-only prototype the draw uses locally stored eligible neighbors; a live system would fill all three seats.</p>
        <ul class="review-seats">${seats}</ul>
        ${panel.length < HOUR_REVIEWER_COUNT ? `<p class="field-hint">Only ${panel.length} eligible neighbor${panel.length === 1 ? '' : 's'} in this browser. The remaining ${HOUR_REVIEWER_COUNT - panel.length} seat${HOUR_REVIEWER_COUNT - panel.length === 1 ? '' : 's'} wait for a live draw.</p>` : ''}
        ${mySeat && role === 'none' && !alreadyVoted ? `<form class="account-form hour-vote-form" data-hour-vote data-id="${e(request.id)}">
          <div class="form-grid">
            <div class="field"><label for="vote-hours-${e(domId(request.id))}">Hours to log</label>
              <input type="number" id="vote-hours-${e(domId(request.id))}" name="hours" min="0.25" step="0.25" required></div>
            <div class="field"><label for="vote-reason-${e(domId(request.id))}">Why</label>
              <input type="text" id="vote-reason-${e(domId(request.id))}" name="reason" maxlength="240" required></div>
          </div>
          <button class="button button--primary button--small" type="submit">Cast review vote</button>
        </form>` : ''}
        ${role !== 'none' ? '<p class="field-hint">You are a party to this exchange and cannot vote on it.</p>' : ''}
        ${alreadyVoted && mySeat ? '<p class="field-hint">Your vote is recorded above.</p>' : ''}
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
      <h3>Confirm the work and the hours</h3>
      <p class="account-note">Members cannot log their own hours. The worker and the receiver each confirm the work and enter the hours they believe were done. Matching numbers are logged. If they differ, the evidence goes to the review board and three randomly drawn active members vote on the hours. This is stored in this browser only.</p>
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
          <a class="button button--amber button--small" href="donate.html">Support the commons <svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></a>
        </div>
      </div>` : ''}
    </section>`;
  }

  function renderCommons() {
    const panel = document.getElementById('commons-panel');
    if (!panel || !isMember()) return;
    const e = escapeHtml;
    const posts = (Array.isArray(state.listings) ? state.listings : []).filter((item) => item && item.memberId === state.pledge.memberId).slice(0, 6);
    const chats = (Array.isArray(state.chats) ? state.chats : []).slice(-12).reverse();
    panel.innerHTML = `<section class="account-card">
      <p class="eyebrow">The Commons</p>
      <h3>Everything you can take part in</h3>
      <div class="commons-links">
        <a class="commons-link" href="freelabor.html"><strong>Free Labor</strong><span>Offer or request skills and time.</span></a>
        <a class="commons-link" href="freestuff.html"><strong>Free Stuff</strong><span>Share new, homemade, used, and repairable goods.</span></a>
        <a class="commons-link" href="future.html#academy"><strong>Academy</strong><span>Learn from a neighbor. Build for the commons.</span></a>
        <a class="commons-link" href="donate.html"><strong>Donations</strong><span>Support the work. Track your giving here.</span></a>
      </div>
      <div class="account-block">
        <h4>Your postings</h4>
        ${posts.length ? `<ul class="contribution-list">${posts.map((post) => `<li class="contribution-item"><strong>${e(post.title)}</strong><span class="contribution-meta">${e(formatDate(post.createdAt))} · ${e(post.provider || '')}</span></li>`).join('')}</ul>` : `<p class="account-note">You have not posted an offering in this browser yet.</p>`}
        <p class="account-note"><a href="freelabor.html#post-trigger">Post free labor</a> · <a href="freestuff.html#post-trigger">Post free stuff</a></p>
      </div>
      <div class="account-block">
        <h4>Community chats</h4>
        <p class="account-note">Local-only channels for this prototype. Nothing is sent to other people.</p>
        <div class="chat-list">
          ${chats.length ? chats.map((chat) => `<div class="chat-message"><p class="contribution-meta"><strong>${e(chat.name)}</strong> · ${e(chat.channel)} · ${e(formatDate(chat.createdAt))}</p><p>${e(chat.body)}</p><button class="button button--ghost button--small button--report" type="button" data-report-context data-report-area="Community chat" data-report-detail="${e(chat.channel)} channel" data-report-name="${e(chat.name)}" data-report-source-id="${e(chat.id)}" aria-label="Report a concern about a message from ${e(chat.name)}">Report</button></div>`).join('') : `<p class="account-note">No chat messages yet.</p>`}
        </div>
        <form class="account-form" data-chat-form>
          <div class="form-row">
            <div class="field">
              <label for="chat-channel">Channel</label>
              <select id="chat-channel" name="channel">
                <option value="general">general</option>
                <option value="mutual-aid">mutual-aid</option>
                <option value="projects">projects</option>
              </select>
            </div>
            <div class="field">
              <label for="chat-body">Message</label>
              <input type="text" id="chat-body" name="body" maxlength="1200" required placeholder="Say something to the community…">
            </div>
          </div>
          <button type="submit" class="button button--primary button--small">Post to chat</button>
        </form>
      </div>
    </section>`;
  }

  function renderMessages() {
    const panel = document.getElementById('messages-panel');
    if (!panel || !isMember()) return;
    const e = escapeHtml;
    const messages = (Array.isArray(state.messages) ? state.messages : []).slice(-20).reverse();
    panel.innerHTML = `<section class="account-card">
      <p class="eyebrow">Messaging</p>
      <h3>Your messages</h3>
      <p class="account-note">Consent-based requests and replies would gather here in a live system. In this prototype, messages stay on this device.</p>
      ${messages.length ? `<ul class="contribution-list">${messages.map((message) => `<li class="contribution-item"><strong>${e(message.name)}${message.toName ? ` → ${e(message.toName)}` : ''}</strong><span>${e(message.body)}</span><span class="contribution-meta">${e(formatDate(message.createdAt))} · ${e(message.status || 'recorded')}</span>${message.toName ? `<button class="button button--ghost button--small button--report" type="button" data-report-context data-report-area="Dashboard messages" data-report-detail="Message to ${e(message.toName)}" data-report-name="${e(message.toName)}" data-report-source-id="${e(message.id)}" aria-label="Report a concern about the message to ${e(message.toName)}">Report</button>` : ''}</li>`).join('')}</ul>` : `<p class="account-note">No messages recorded yet.</p>`}
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
      <p class="account-note">Local drafts only. These notices are created by your own actions here; nothing is delivered to another person or device. A live system would notify neighbors about messages, requests, and comments.</p>
      <div class="notification-summary">
        <strong>${unread} unread</strong>
        <button class="button button--ghost button--small" type="button" data-mark-notifications ${unread ? '' : 'disabled'}>Mark all read</button>
      </div>
      ${items.length ? `<ul class="notification-list">${items.map((item) => `<li class="notification-item ${item.read ? '' : 'is-unread'}">
        <div>
          <p class="contribution-meta"><strong>${e(item.title)}</strong> · ${e(formatDate(item.createdAt))}</p>
          <p>${e(item.body)}</p>
        </div>
        <div class="notification-actions">
          ${item.tab ? `<button class="button button--ghost button--tiny" type="button" data-notification-tab="${e(item.tab)}">Open</button>` : ''}
          ${item.read ? '' : `<button class="button button--ghost button--tiny" type="button" data-mark-notification="${e(item.id)}">Mark read</button>`}
        </div>
      </li>`).join('')}</ul>` : '<p class="account-note">No local notifications yet. Messages, requests, and comments you record will appear here.</p>'}
    </section>`;
  }

  function socialAudienceOptions(friends, groups) {
    const e = escapeHtml;
    const options = [`<option value="friends">Friends (${friends.length}/${SOCIAL_LIMITS.friends})</option>`];
    groups.forEach((group) => {
      const label = group.kind === 'own' ? 'Your group' : 'Group';
      options.push(`<option value="${e(group.kind)}:${e(group.id)}">${label}: ${e(group.name)} (${group.memberCount}/${SOCIAL_LIMITS.groupMembers})</option>`);
    });
    return options.join('');
  }

  function renderSocial() {
    const panel = document.getElementById('social-panel');
    if (!panel || !isMember()) return;
    const e = escapeHtml;
    const friends = (Array.isArray(state.friends) ? state.friends : []).slice(0, SOCIAL_LIMITS.friends);
    const groups = (Array.isArray(state.groups) ? state.groups : []).slice(0, 100);
    const chats = (Array.isArray(state.socialChats) ? state.socialChats : []).slice(-12).reverse();
    const canAddFriend = friends.length < SOCIAL_LIMITS.friends;
    const hasOwnGroup = (Array.isArray(state.groups) ? state.groups : [])
      .some((group) => group && group.kind === 'own');

    panel.innerHTML = `<section class="account-card">
      <p class="eyebrow">Social circles</p>
      <h3>Friends &amp; groups</h3>
      <p class="account-note">This prototype has one local account. Friends, groups, and chat audiences are saved on this device only; no invitations or messages are sent, and every group is capped at ${SOCIAL_LIMITS.groupMembers} people.</p>
      <div class="social-grid">
        <div class="account-block">
          <h4>Friends (${friends.length}/${SOCIAL_LIMITS.friends})</h4>
          ${friends.length ? `<ul class="social-list">${friends.map((friend) => `<li class="social-item"><strong>${e(friend.name)}</strong><span class="contribution-meta">${e(formatDate(friend.createdAt))} · local only</span></li>`).join('')}</ul>` : '<p class="account-note">No friends added yet.</p>'}
          ${canAddFriend ? `<form class="account-form" data-friend-form>
            <div class="field">
              <label for="friend-name">Add a friend by chosen name</label>
              <input type="text" id="friend-name" name="name" maxlength="60" required placeholder="Neighbor's chosen name">
              <p class="field-hint">No account lookup happens in this prototype.</p>
            </div>
            <button type="submit" class="button button--outline button--small">Add friend locally</button>
          </form>` : `<p class="account-note">The local friend cap of ${SOCIAL_LIMITS.friends} has been reached.</p>`}
        </div>
        <div class="account-block">
          <h4>Groups (max ${SOCIAL_LIMITS.groupMembers} each)</h4>
          ${groups.length ? `<ul class="social-list">${groups.map((group) => `<li class="social-item"><strong>${e(group.name)}</strong><span class="contribution-meta">${group.kind === 'own' ? 'Your group' : 'Joined group'} · ${group.memberCount}/${SOCIAL_LIMITS.groupMembers} people</span>${group.purpose ? `<span>${e(group.purpose)}</span>` : ''}</li>`).join('')}</ul>` : '<p class="account-note">No groups yet. Create your own or record one you joined.</p>'}
          <form class="account-form" data-group-form>
            <div class="form-row">
              <div class="field">
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
              <div class="field">
                <label for="group-count">People (including you)</label>
                <input type="number" id="group-count" name="memberCount" min="1" max="${SOCIAL_LIMITS.groupMembers}" step="1" value="1" required>
              </div>
            </div>
            <div class="field">
              <label for="group-purpose">Purpose <span class="optional">(optional)</span></label>
              <input type="text" id="group-purpose" name="purpose" maxlength="200" placeholder="What this group is for">
            </div>
            <button type="submit" class="button button--outline button--small">Save group locally</button>
          </form>
        </div>
      </div>
      <div class="account-block">
        <h4>Social chat</h4>
        <p class="account-note">Choose friends, your own group, or a group you joined. Each message is a local draft with the audience written on it; nothing is delivered.</p>
        <ul class="chat-list social-chat-list">
          ${chats.length ? chats.map((chat) => `<li class="chat-message"><p class="contribution-meta"><strong>${e(chat.name)}</strong> → ${e(chat.audienceLabel)} · ${e(formatDate(chat.createdAt))}</p><p>${e(chat.body)}</p><button class="button button--ghost button--small button--report" type="button" data-report-context data-report-area="Social chat" data-report-detail="${e(chat.audienceLabel)}" data-report-name="${e(chat.name)}" data-report-source-id="${e(chat.id)}" aria-label="Report a concern about a social chat message from ${e(chat.name)}">Report</button></li>`).join('') : '<li class="account-note">No social chat drafts yet.</li>'}
        </ul>
        <form class="account-form" data-social-chat-form>
          <div class="form-row">
            <div class="field">
              <label for="social-audience">Audience</label>
              <select id="social-audience" name="audience">${socialAudienceOptions(friends, groups)}</select>
            </div>
            <div class="field">
              <label for="social-body">Message</label>
              <input type="text" id="social-body" name="body" maxlength="1200" required placeholder="Write a local chat draft…">
            </div>
          </div>
          <button type="submit" class="button button--primary button--small">Record chat draft</button>
        </form>
      </div>
    </section>`;
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
      const openTab = event.target.closest('[data-notification-tab]');
      if (openTab) {
        setDashboardTab(openTab.dataset.notificationTab);
        return;
      }
      const markOne = event.target.closest('[data-mark-notification]');
      if (markOne) {
        const notice = (Array.isArray(state.notifications) ? state.notifications : [])
          .find((item) => item && item.id === markOne.dataset.markNotification);
        if (!notice) return;
        notice.read = true;
        saveState();
        renderNotifications();
        announce('Notification marked as read.');
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
        if (!review || !review.panel.some((seat) => seat.memberId === state.pledge.memberId)) return;
        if (review.votes.some((vote) => vote.memberId === state.pledge.memberId)) return;
        const hours = cleanHours(data.get('hours'));
        const reason = cleanString(data.get('reason'), 240);
        if (!(hours > 0) || !reason) return;
        review.votes.push({
          memberId: state.pledge.memberId,
          name: state.pledge.name,
          hours,
          reason,
          votedAt: now
        });
        const finalized = finalizeHourReview(request);
        saveState();
        renderSharedMemberViews();
        renderExchanges();
        announce(finalized ? 'Three votes are in; the majority hours were logged locally.' : 'Your review vote was saved locally.');
        showToast(finalized ? 'Review resolved and hours logged locally.' : 'Review vote saved locally.', false);
        return;
      }

      if (form.matches('[data-account-form]')) {
        event.preventDefault();
        const name = cleanString(data.get('name'), 60);
        const location = cleanString(data.get('location'), 80);
        if (!name) return;
        state.pledge.name = name;
        state.pledge.location = location;
        state.pledge.housingStatus = normalizeHousingStatus(data.get('housingStatus'));
        state.pledge.paidSkills = cleanString(data.get('paidSkills'), 400);
        state.pledge.unpaidSkills = cleanString(data.get('unpaidSkills'), 400);
        state.pledge.bio = cleanString(data.get('bio'), 600);
        state.pledge.tagline = cleanString(data.get('tagline'), 90);
        state.pledge.group = cleanString(data.get('group'), 80);
        state.pledge.donationCount = cleanCount(data.get('donationCount'));
        // Hours are derived only from mutual confirmation or review votes.
        state.pledge.hoursCompleted = getHourTotals().all;
        state.pledge.hoursUsed = cleanHours(data.get('hoursUsed'));
        state.pledge.itemsGifted = cleanCount(data.get('itemsGifted'));
        state.pledge.itemsTaken = cleanCount(data.get('itemsTaken'));
        state.pledge.available = Boolean(data.get('available'));
        state.pledge.publicPhone = Boolean(data.get('publicPhone'));
        state.pledge.publicAddressSource = data.get('publicAddressSource') === 'physical' ? 'physical' : 'mailing';
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
        saveState();
        renderAccountInfo();
        renderSharedMemberViews();
        renderVolunteerStatus();
        renderAccountability();
        announce('Your account details were saved in this browser.');
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
      } else if (form.matches('[data-chat-form]')) {
        event.preventDefault();
        const body = cleanString(data.get('body'), 1200);
        if (!body) return;
        state.chats = Array.isArray(state.chats) ? state.chats : [];
        const chat = {
          id: makeId('chat'),
          memberId: state.pledge.memberId,
          name: state.pledge.name,
          channel: cleanString(data.get('channel'), 40) || 'general',
          body,
          createdAt: now
        };
        state.chats.push(chat);
        state.chats = state.chats.slice(-300);
        addNotification('comment', 'Community chat message recorded',
          `Your message in ${chat.channel} is stored locally. In a live system channel members would be notified; nothing was transmitted.`,
          { tab: 'commons', sourceId: chat.id });
        saveState();
        renderCommons();
        renderNotifications();
        form.reset();
        announce('Your message was posted to the local community chat.');
        showToast('Chat message saved locally.', false);
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
          status: 'recorded'
        };
        state.messages.push(message);
        addNotification('message', `Message recorded to ${toName}`,
          'Saved locally as a draft. In a live system the recipient would be notified; no message was delivered.',
          { tab: 'messages', sourceId: message.id });
        state.messages = state.messages.slice(-300);
        saveState();
        renderMessages();
        renderNotifications();
        form.reset();
        announce('Your message was recorded in this browser.');
        showToast('Message recorded locally.', false);
      } else if (form.matches('[data-friend-form]')) {
        event.preventDefault();
        const name = cleanString(data.get('name'), 60);
        if (!name) return;
        state.friends = Array.isArray(state.friends) ? state.friends : [];
        if (state.friends.length >= SOCIAL_LIMITS.friends) {
          showToast(`The local friend cap is ${SOCIAL_LIMITS.friends}.`, false);
          return;
        }
        const friend = {
          id: makeId('friend'),
          memberId: '',
          name,
          createdAt: now
        };
        state.friends.push(friend);
        addNotification('social', `Friend added: ${name}`,
          'Saved locally by chosen name. In a live system this would become a friend request; no account was looked up and nothing was sent.',
          { tab: 'social', sourceId: friend.id });
        saveState();
        renderSocial();
        renderNotifications();
        form.reset();
        announce(`${name} was added to your local friend list.`);
        showToast('Friend added locally. No invitation was sent.', false);
      } else if (form.matches('[data-group-form]')) {
        event.preventDefault();
        const name = cleanString(data.get('name'), 80);
        const kind = data.get('kind') === 'own' ? 'own' : 'joined';
        const memberCount = cleanCount(data.get('memberCount'));
        const purpose = cleanString(data.get('purpose'), 200);
        if (!name || !memberCount) return;
        if (memberCount > SOCIAL_LIMITS.groupMembers) {
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
          memberCount,
          createdAt: now
        };
        state.groups.push(group);
        addNotification('social', `${kind === 'own' ? 'Your group' : 'Group'} saved: ${name}`,
          `Recorded locally with ${memberCount} of ${SOCIAL_LIMITS.groupMembers} people. No invitations or membership changes were sent.`,
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
        const audience = cleanString(data.get('audience'), 40) || 'friends';
        if (!body) return;
        let audienceLabel = `Friends (${(Array.isArray(state.friends) ? state.friends : []).length}/${SOCIAL_LIMITS.friends})`;
        if (audience.startsWith('own:') || audience.startsWith('joined:')) {
          const groupId = audience.slice(audience.indexOf(':') + 1);
          const group = (Array.isArray(state.groups) ? state.groups : [])
            .find((item) => item && item.id === groupId);
          if (group) audienceLabel = `${group.kind === 'own' ? 'Your group' : 'Group'}: ${group.name}`;
        }
        const chat = {
          id: makeId('social-chat'),
          memberId: state.pledge.memberId,
          name: state.pledge.name,
          audience,
          audienceLabel,
          body,
          createdAt: now
        };
        state.socialChats = Array.isArray(state.socialChats) ? state.socialChats : [];
        state.socialChats.push(chat);
        state.socialChats = state.socialChats.slice(-300);
        addNotification('comment', 'Social chat draft recorded',
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

    const now = new Date();
    const isCriminal = meta.route === 'criminal';
    const report = {
      id: makeId('report'),
      reporterMemberId: state.pledge.memberId,
      reporterName: state.pledge.name,
      respondentName: cleanString(data.get('respondentName'), 80),
      respondentMemberId: cleanString(data.get('respondentMemberId'), 100),
      contextArea: cleanString(data.get('contextArea'), 80) || 'Dashboard',
      contextDetail: cleanString(data.get('contextDetail'), 160),
      sourceId: cleanString(data.get('sourceId'), 100),
      evidence: cleanEvidenceItems(reportEvidenceDrafts.get(form) || []),
      type,
      typeLabel: meta.label,
      route: meta.route,
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
      : `Report filed from ${report.contextArea}. Evidence stayed in this browser. The response period is open.`);
    showToast(isCriminal ? 'Police referral recorded (prototype only).' : 'Report filed. Response period is open.', false);
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
          <form class="account-form report-form" data-report-form>
            <input type="hidden" name="respondentName" value="">
            <input type="hidden" name="respondentMemberId" value="">
            <input type="hidden" name="contextArea" value="Dashboard">
            <input type="hidden" name="contextDetail" value="">
            <input type="hidden" name="sourceId" value="">
            <div class="field">
              <label for="report-dialog-type">What are you reporting? <span class="required-mark" aria-hidden="true">*</span></label>
              <select id="report-dialog-type" name="type" required>
                <option value="">Choose a type…</option>
                <optgroup label="Reviewed by members (not a crime)">
                  ${Object.keys(REPORT_TYPES).filter((key) => REPORT_TYPES[key].route === 'board').map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(REPORT_TYPES[key].label)}</option>`).join('')}
                </optgroup>
                <optgroup label="Criminal matter — police referral">
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
              <legend>Local evidence <span class="optional">(optional)</span></legend>
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

    const parts = [`Reporting from ${area}`];
    if (detail) parts.push(detail);
    if (name) parts.push(`about ${name}`);
    else parts.push('about a general concern');
    if (summary) summary.textContent = `${parts.join(' · ')}. The name was filled from this page, not typed by you.`;

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
        sourceId: trigger.dataset.reportSourceId
      }, trigger);
    });
  }

  function castAccountabilityVote(reportId, data) {
    if (!isMember()) return;
    const report = allReports().find((item) => item.id === reportId);
    if (!report || report.status !== 'board_review') return;
    if (report.votes.some((vote) => vote.memberId === state.pledge.memberId)) return;
    if (report.demoVotingClosed || (report.votingEndsAt && Date.now() > Date.parse(report.votingEndsAt))) return;

    const verdict = data.verdict === 'guilty' ? 'guilty' : data.verdict === 'not_guilty' ? 'not_guilty' : '';
    if (!verdict) return;
    const days = REFLECTION_OPTIONS.includes(Number(data.reflectionDays)) ? Number(data.reflectionDays) : REFLECTION_OPTIONS[0];

    report.votes = Array.isArray(report.votes) ? report.votes : [];
    report.votes.push({
      memberId: state.pledge.memberId,
      name: state.pledge.name,
      verdict,
      reflectionDays: verdict === 'guilty' ? days : null,
      reason: cleanString(data.reason, 600),
      votedAt: new Date().toISOString()
    });
    saveState();
    renderAccountability();
    announce(`Vote recorded: ${verdict === 'guilty' ? 'guilty' : 'not guilty'}, with your reason attached.`);
    showToast('Vote and reason recorded locally.', false);
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
        <p class="account-note">Filed under ${e(member.name)} (member ID ${e(member.memberId)}). You do not type the person's name: open <strong>Report</strong> from the listing, message, or profile where the interaction happened. The context is carried into the form automatically.</p>
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
      <p class="account-note">Each case opens with a ${RESPONSE_DAYS}-day response period so the reported member can gather evidence and plead. After that, voting is open for ${VOTING_DAYS} days—every vote counts. Vote guilty or not guilty; if guilty, choose a reflection period (30, 90, or 180 days), and always explain why. The full case file, votes, reasons, and comments are stored in this browser only for this local prototype.</p>`;
    if (!openReports.length) {
      html += `<p class="account-note">No cases are open for review right now.</p>`;
    } else {
      html += `<ul class="case-list">`;
      openReports.forEach((report) => {
        const votes = Array.isArray(report.votes) ? report.votes : [];
        const guilty = votes.filter((vote) => vote.verdict === 'guilty').length;
        const notGuilty = votes.filter((vote) => vote.verdict === 'not_guilty').length;
        const alreadyVoted = votes.some((vote) => vote.memberId === member.memberId);
        const isResponsePhase = report.status === 'response_period';
        const canVote = !isResponsePhase && !alreadyVoted && (!report.votingEndsAt || Date.now() <= Date.parse(report.votingEndsAt)) && !report.demoVotingClosed;
        html += `<li class="case-item case-item--review">
          <div class="case-item-head"><strong>${e(report.typeLabel || report.type)}</strong><span class="case-status ${isResponsePhase ? 'case-status--response' : ''}">${e(reportStatusLabel(report.status))}</span></div>
          <p class="contribution-meta">Filed ${e(formatDate(report.createdAt))} · ${e(getReportContextSummary(report))} · ${e(isResponsePhase ? responseRemaining(report) : votingRemaining(report))} · ${votes.length} vote${votes.length === 1 ? '' : 's'}</p>
          ${renderCaseFile(report, e)}
          ${isResponsePhase
            ? (isRespondent(report) ? renderResponseForm(report, e) : `<p class="account-note">The reported member has ${RESPONSE_DAYS} days to gather evidence and plead before voting opens. You can read the full case file and leave a comment now.</p>`)
            : `<p class="case-tally"><strong>Tally:</strong> guilty ${guilty} · not guilty ${notGuilty}</p>
              ${votes.length ? `<ul class="vote-reasons">${votes.map((vote) => `
                <li class="vote-reason">
                  <p class="contribution-meta"><strong>${e(vote.name || 'Member')}</strong> · voted ${e(vote.verdict === 'guilty' ? 'guilty' : 'not guilty')}${vote.verdict === 'guilty' && vote.reflectionDays ? ` · ${vote.reflectionDays} days` : ''} · ${e(formatDate(vote.votedAt))}</p>
                  <p>${e(vote.reason || 'No reason was recorded for this vote.')}</p>
                </li>`).join('')}</ul>` : ''}
              ${alreadyVoted ? `<p class="account-note">You already voted on this case. Your verdict and reason are listed above.</p>` : canVote ? `
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
                    <p class="field-hint">Your reason is recorded with your vote in this browser only. Up to 600 characters.</p>
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
          ${(report.votes || []).length ? `<details><summary>How members voted and why</summary><ul class="vote-reasons">${report.votes.map((vote) => `
            <li class="vote-reason">
              <p class="contribution-meta"><strong>${e(vote.name || 'Member')}</strong> · voted ${e(vote.verdict === 'guilty' ? 'guilty' : 'not guilty')}${vote.verdict === 'guilty' && vote.reflectionDays ? ` · ${vote.reflectionDays} days` : ''}</p>
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

    // Members must be 18+. The submit handler applies the real age check;
    // no max attribute is used so the visitor gets a clear explanation.
    const dobInput = document.getElementById('pledge-dob');

    const sameAddress = document.getElementById('pledge-same-address');
    const mailingInput = document.getElementById('pledge-mailing');
    const physicalInput = document.getElementById('pledge-physical');
    if (sameAddress && mailingInput && physicalInput) {
      const syncAddress = () => {
        if (sameAddress.checked) {
          physicalInput.value = mailingInput.value;
          physicalInput.readOnly = true;
        } else {
          physicalInput.readOnly = false;
          if (physicalInput.value === mailingInput.value) physicalInput.value = '';
        }
      };
      sameAddress.addEventListener('change', syncAddress);
      mailingInput.addEventListener('input', () => {
        if (sameAddress.checked) physicalInput.value = mailingInput.value;
      });
    }

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (errorBox) errorBox.hidden = true;

        // Check age before native validation so under-18 visitors get a clear
        // explanation instead of a generic date-range tooltip.
        const earlyAge = getAgeFromDob(dobInput ? dobInput.value : '');
        if (earlyAge === null) {
          showPledgeError('Please enter a valid date of birth.', 'pledge-dob');
          return;
        }
        if (earlyAge < 18) {
          showPledgeError('You must be 18 or older to sign the Unbought Pledge. You can keep browsing the commons and sign when you turn 18. Nothing was saved.', 'pledge-dob');
          announce('Members must be 18 or older. Your pledge was not signed.');
          return;
        }

        if (!form.reportValidity()) return;

        const data = new FormData(form);
        const fullName = cleanString(data.get('fullName'), 100);
        const name = cleanString(data.get('chosenName'), 60);
        const location = cleanString(data.get('location'), 80);
        const mailingAddress = cleanString(data.get('mailingAddress'), 240);
        const physicalAddress = sameAddress && sameAddress.checked
          ? mailingAddress
          : cleanString(data.get('physicalAddress'), 240);
        const phone = cleanString(data.get('phone'), 40);
        const dob = cleanString(data.get('dob'), 10);
        const profession = normalizeProfession(data.get('profession'));
        const zip = normalizeZip(data.get('zip'));
        const housingStatus = normalizeHousingStatus(data.get('housingStatus'));
        const paidSkills = cleanString(data.get('paidSkills'), 400);
        const unpaidSkills = cleanString(data.get('unpaidSkills'), 400);
        const note = cleanString(data.get('note'), 240);
        const username = normalizeUsername(data.get('username'));
        const password = String(data.get('password') || '');
        const passwordConfirm = String(data.get('passwordConfirm') || '');
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

        if (!fullName || !name || !location || !mailingAddress || !physicalAddress || !phone) {
          showPledgeError('Please complete your full name, chosen name, mailing address, physical address, phone number, and general location.', 'pledge-full-name');
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
        const existingCredential = getCredential();
        if (existingCredential && existingCredential.username === username) {
          showPledgeError('That username is already used by the account on this device. Sign in instead.', 'pledge-username');
          return;
        }

        const age = getAgeFromDob(dob);
        if (age === null) {
          showPledgeError('Please enter a valid date of birth.', 'pledge-dob');
          return;
        }
        if (age < 18) {
          showPledgeError('You must be 18 or older to sign the Unbought Pledge. You can keep browsing the commons and sign when you turn 18. Nothing was saved.', 'pledge-dob');
          announce('Members must be 18 or older. Your pledge was not signed.');
          return;
        }

        state.pledge = {
          memberId: makeId('member'),
          name,
          fullName,
          location,
          mailingAddress,
          physicalAddress,
          housingStatus,
          phone,
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
          publicPhone: false,
          note,
          signedAt: new Date().toISOString(),
          status: 'active'
        };
        addMemberToRoster(state.pledge);
        const salt = makeId('salt');
        state.auth = {
          credential: { username, salt, passwordHash: hashPassword(password, salt) },
          session: { signedIn: true, signedInAt: new Date().toISOString() }
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
        showConfirm({
          title: 'Withdraw your membership?',
          message: 'Your membership, username, and salted password hash will be removed from this browser. You can still browse offers, but you will need to sign the pledge again to post, request, or manage your track. Your saved track details may remain on this device.',
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
        const credential = getCredential();

        if (!credential || username !== credential.username ||
            hashPassword(password, credential.salt) !== credential.passwordHash) {
          const message = 'That username or password does not match the account stored in this browser.';
          if (errorBox) {
            errorBox.textContent = message;
            errorBox.hidden = false;
          }
          announce('Sign in failed. Check your username and password.');
          return;
        }

        setSession(true);
        announce(`Welcome back, ${state.pledge ? state.pledge.name : username}.`);
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
            <label for="contributor-hours">Weekly hours pledged <span class="required-mark" aria-hidden="true">*</span></label>
            <input type="number" id="contributor-hours" name="hours" min="1" max="40" step="1" value="1" required>
            <p class="field-hint">Phase 1 minimum: 1 hour per week. A real, sustainable number—you can change it later.</p>
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
  function init() {
    initHeader();
    initPledgePage();
    initHeaderNotifications();
    initPledgeForm();
    initSigninForm();
    initVolunteerForm();
    initDashboard();
    initDashboardMenu();
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
