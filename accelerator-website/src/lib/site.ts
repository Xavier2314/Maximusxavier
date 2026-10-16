/**
 * Central content configuration.
 *
 * Anything marked `null` is information we have NOT received yet. Components render a
 * clearly labelled placeholder for null values, so nothing is invented. Replace a value
 * here (or through the admin dashboard where available) once it is officially confirmed.
 */

export const site = {
  name: "Accelerator Community",
  legacyName: "Accelerators Billionaires",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://accelerator-community.vercel.app",
  // Working tagline from the brief. Not yet an approved slogan.
  tagline: "Accelerating people. Building leaders. Celebrating excellence.",
  shortDescription:
    "Accelerator Community brings ambitious people together to grow, develop leadership and celebrate excellence.",

  // Official organisational information (from CAC documents) — awaiting.
  legal: {
    registeredName: null as string | null,
    rcNumber: null as string | null,
    registeredAddress: null as string | null,
  },

  // Source: "Vision & Mission Statement", Official Charter AB/VM/001, Office of the Founder & CEO, October 2026.
  // `mission` and `vision` are the charter's own short "website versions".
  mission: "We equip young people with mastery of tech skills and monetisation, connect them to a network of proven leaders, and build the infrastructure for meaningful, purpose-driven work." as string | null,
  vision: "To raise generations of skilled, purposeful leaders — from Africa to the world — who master technology and enterprise to solve real human problems, for the glory of God." as string | null,
  story: null as string | null,
  charter: {
    pdf: "/downloads/Accelerators_Billionaires_Vision_Mission_Charter.pdf",
    reference: "AB/VM/001",
    edition: "October 2026",
    fullVision:
      "To become the world’s foremost youth-development ecosystem — raising generations of skilled, resourceful and purposeful leaders, from Africa to every nation, who master technology and enterprise to solve real human problems with excellence, and whose work builds a legacy that blesses generation after generation, for the revelation of the glory and wisdom of God.",
    fullMission:
      "To equip young people across Africa and beyond with mastery of technology skills and the art of monetisation; to connect them into a global network of resourceful leaders and business builders; and to build the infrastructure that enables them to do meaningful work, scale enterprises, and still make time to live out their God-given passions.",
    horizons: [
      { n: "I", term: "Short-term vision", title: "The Snowball", stat: "1,000,000", statLabel: "young Africans", text: "Grow into a gigantic technology and entrepreneurship development engine that impacts no fewer than one million young people across Africa — equipping them to pick up tech skills, become masters of those skills, and become masters of monetisation." },
      { n: "II", term: "Mid- to long-term vision", title: "The Global Ecosystem", text: "Become the largest youth-impacting ecosystem and company in the world — building and teaching excellence and mastery of skills, applying technology across every field to solve real human problems at the highest level, and forming a strong, interconnected network of valuable, resourceful leaders who have built and scaled network-marketing and serial businesses across the world." },
      { n: "III", term: "Long-term vision", title: "The Infrastructure", text: "Spearhead infrastructure for technology development — starting with Africa and expanding across the world. Help people grow, find purpose in their work and do meaningful work; and raise them to be so resourceful that they scale businesses while making time to live out their righteous, God-given passions." },
      { n: "IV", term: "Transgenerational vision", title: "The Legacy", text: "Ensure that the impact created and the infrastructure built in one generation carries into the next — an enduring blessing passed from generation to generation, for the revelation of the glory of God and the wisdom of God." },
    ] as { n: string; term: string; title: string; stat?: string; statLabel?: string; text: string }[],
    storyIntro: "Talent is spread evenly across Africa. Opportunity is not. Accelerators Billionaires exists to close that gap — and then to build something far bigger than the gap itself.",
    story: [
      { title: "A conviction", text: "Across the continent, millions of young people are bright, hungry and capable. Many have never been shown how to turn a skill into a livelihood, or a livelihood into a legacy. Our founder, Chukwuemeka (Peter) Muoneke, saw this first-hand while leading teams that deliver automation, marketing, design and software for brands — and he set out to change it." },
      { title: "It starts as a snowball", text: "Every movement begins small. Ours begins like a snowball: deliberate, gathering momentum with every turn. Our first horizon is clear and measurable — one million young Africans equipped with technology skills, mastering them, and mastering the art of monetisation. We do not stop at teaching people to code, design, automate or market. We teach them to earn, to build and to lead." },
      { title: "Then it becomes an ecosystem", text: "As the momentum grows, so does the ambition. We are building toward the largest youth-impacting ecosystem in the world: a place where excellence is taught as a discipline, mastery is the standard, and technology is applied across every field to solve real human problems at the highest level. Around that work we are forming a network of resourceful leaders — people who have built and scaled network-marketing organisations and serial businesses across the world — so that no young person has to grow alone." },
      { title: "Then it becomes infrastructure", text: "Programmes change lives; infrastructure changes nations. Our long-term horizon is to spearhead the infrastructure for technology development, beginning in Africa and extending to the world. Infrastructure that helps people find purpose in their work and do work that matters. We want people to become so resourceful that they can scale their businesses and still have time to live out their righteous, God-given passions — because success that consumes the whole person is not the success we teach." },
      { title: "And it outlives us", text: "What one generation builds should lift the next. The skills we teach, the leaders we raise and the infrastructure we lay are designed to compound — to bless children and their children after them." },
      { title: "Why we do it", text: "Underneath every horizon is a single purpose. This work is for the revelation of the glory of God and the wisdom of God. We believe excellence honours Him, that resourcefulness is stewardship, and that a life of purposeful work is one of the clearest ways His wisdom is seen in the world." },
    ],
    storyClose: "We are not building for a season. We are building for generations.",
    commitments: [
      { title: "Excellence", text: "We teach and deliver at the highest standard, in every field we touch." },
      { title: "Mastery", text: "Not exposure to skills, but command of them — deep, practised and proven." },
      { title: "Monetisation", text: "Skill must become income. We teach people to earn, build and scale." },
      { title: "Network", text: "A strong, interconnected community of resourceful leaders and builders." },
      { title: "Purpose", text: "Meaningful work, with time left to live out righteous, God-given passions." },
      { title: "Legacy", text: "What we build in one generation is designed to bless the next." },
    ],
    closing: "All of this is for the revelation of the glory and the wisdom of God — an eternal work, and a blessing from one generation to another.",
  },

  // Pillars as they appear on the official brand materials (roll-up banner).
  pillars: [
    { title: "People", text: "We grow through relationships. Members come first in every story we tell." },
    { title: "Growth", text: "We celebrate progress: personal, professional and financial." },
    { title: "Opportunity", text: "We open doors, make introductions and create room for new leaders." },
    { title: "Impact", text: "We measure success by what our members build and give back." },
  ],

  // Source: the founder's LinkedIn profile, supplied by Accelerator Community (October 2026).
  founder: {
    name: "Chukwuemeka (Peter) Muoneke" as string | null,
    title: "Founder & CEO",
    photo: "/images/founder-chukwuemeka-muoneke.jpg" as string | null,
    photoCredit: "Emperor Sam Photography",
    shortIntro:
      "Chukwuemeka (Peter) Muoneke is the founder and CEO of the Accelerator Billionaires Team, where he leads a team of freelancers providing business automation, email marketing, copywriting, website design, software development and marketing for brands." as string | null,
    biography: [
      "Chukwuemeka (Peter) Muoneke is the founder and CEO of the Accelerator Billionaires Team. He leads a team of 100 freelancers who provide digital marketing and virtual assistant services to clients across various industries, specialising in business automation, email marketing, copywriting, website design, software development and marketing for brands.",
      "He holds a Bachelor of Science degree in Agricultural Extension from Obafemi Awolowo University, where he learned the fundamentals of communication ethics, presentations and Zoho CRM.",
      "Since January 2020 he has also served as Director and Team Leader at Faith Heroic Generation. His work draws on tools such as HubSpot, Salesforce and Zoho CRM.",
    ] as string[] | null,
    // Source: Vision & Mission charter AB/VM/001, "Meet the founder".
    vision: "The vision set out in the Accelerators Billionaires charter is his: a conviction that Africa’s young people can become masters of skill, technology and enterprise — and that what they build in this generation can bless the next." as string | null,
    philosophy:
      "I am passionate about learning new skills, engaging with entrepreneurs, and delivering high-quality results. My goal is to build long-term relationships with clients who can trust us to take some burden off their shoulders by outsourcing parts of their process tasks to us." as string | null,
    message: null as string | null,
    quote: "Set your goals." as string | null,
    achievements: [
      "Founder & CEO, Accelerator Billionaires Team",
      "Director and Team Leader, Faith Heroic Generation (since January 2020)",
      "B.Sc. Agricultural and Extension Education, Obafemi Awolowo University",
      "LinkedIn certification: Marketing Tools: Automation (March 2023)",
      "LinkedIn certification: Influence versus Manipulation: The Ethics of Persuasion (February 2022)",
    ] as string[] | null,
    links: [
      { name: "LinkedIn", href: "https://www.linkedin.com/in/chukwuemeka-muoneke/" },
      { name: "TikTok", href: "https://www.tiktok.com/@chukwuemekamuonek" },
    ],
  },

  // Only verified figures. Leave value null until confirmed.
  impact: [
    { label: "Community members", value: null as string | null },
    { label: "Leaders developed", value: null as string | null },
    { label: "Programmes delivered", value: null as string | null },
    { label: "Years of community", value: null as string | null },
  ],

  contact: {
    email: null as string | null,
    phone: null as string | null,
    whatsapp: null as string | null,
    address: null as string | null,
  },

  social: [
    { name: "Instagram", href: null as string | null },
    { name: "Facebook", href: null as string | null },
    { name: "X", href: null as string | null },
    { name: "LinkedIn", href: null as string | null },
    { name: "YouTube", href: null as string | null },
  ],

  // Official registration form (Google Forms). All "submit registration" buttons open this link.
  registrationFormUrl: "https://forms.gle/q4Ah1D8sQVtc8uwA9",
};

// Sponsorship contact, supplied by Accelerator Community (October 2026).
export const sponsorship = {
  contactName: "Aluele Valentine",
  contactOrg: "Accelerators Community",
  whatsappDisplay: "08115774517",
  whatsappUrl: "https://wa.me/2348115774517?text=" + encodeURIComponent("Hello, I'm interested in sponsoring Accelerators Events 2026."),
  email: "xavierlevi485@gmail.com",
  proposalPdf: "/downloads/Accelerators_Events_2026_Sponsorship_Proposal.pdf",
};

export const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/founder", label: "Founder" },
  { href: "/events", label: "Events 2026" },
  { href: "/sponsorship", label: "Sponsorship" },
  { href: "/contact", label: "Contact" },
];

export const gallery = [
  { src: "/images/community-white-attire.jpg", width: 1280, height: 960, alt: "Accelerator Community members dressed in white, gathered on the lawn in front of a large event marquee", caption: "Community gathering" },
  { src: "/images/speaker-addressing-audience.jpg", width: 2000, height: 1333, alt: "A speaker in a cream suit addresses a seated audience of young members taking notes", caption: "Leadership training" },
  { src: "/images/changemakers-session.jpg", width: 2000, height: 1333, alt: "Members in blue and white Changemaker T-shirts and caps cheering during a session", caption: "Changemakers session" },
  { src: "/images/recognition-medal-winners.jpg", width: 2000, height: 1333, alt: "Award winners wearing medals stand on stage with hosts in front of a balloon arch", caption: "Recognition and awards" },
  { src: "/images/community-yellow-jerseys.jpg", width: 2000, height: 1506, alt: "A large group of Accelerator Community members in matching yellow jerseys posing together in a hall", caption: "One team" },
  { src: "/images/changemakers-group.jpg", width: 2000, height: 1333, alt: "Group photo of members in Changemaker T-shirts and caps posing on stage", caption: "Changemakers" },
  { src: "/images/team-burgundy-attire.jpg", width: 1506, height: 2000, alt: "Six smiling members in matching burgundy and white outfits standing together outdoors", caption: "Dressed for the occasion" },
  { src: "/images/seminar-audience.jpg", width: 2000, height: 1333, alt: "View from above of a full hall of attendees seated in rows facing a presentation screen", caption: "Learning together" },
  { src: "/images/community-gathering-steps.jpg", width: 1500, height: 1125, alt: "A large group of Accelerator Community members posing together at the foot of a staircase", caption: "Members together" },
  { src: "/images/community-bus-park.jpg", width: 2000, height: 1500, alt: "Smiling Accelerator Community members in colourful outfits standing together outdoors in front of buses", caption: "On the road together" },
];
