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

  mission: null as string | null,
  vision: null as string | null,
  story: null as string | null,

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
    vision: null as string | null,
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

  // The official registration form currently lives on Google Forms. The site form is a draft
  // until the exact questions are supplied.
  googleFormUrl: "https://forms.gle/peNoH4sLD8t12vjm9",
};

export const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/founder", label: "Founder" },
  { href: "/events", label: "Events 2026" },
  { href: "/contact", label: "Contact" },
];

export const gallery = [
  {
    src: "/images/community-white-attire.jpg",
    width: 1280,
    height: 960,
    alt: "Accelerator Community members dressed in white, gathered on the lawn in front of a large event marquee",
    caption: "Community gathering",
  },
  {
    src: "/images/community-gathering-steps.jpg",
    width: 1500,
    height: 1125,
    alt: "A large group of Accelerator Community members posing together at the foot of a staircase",
    caption: "Members together",
  },
  {
    src: "/images/community-bus-park.jpg",
    width: 2000,
    height: 1500,
    alt: "Smiling Accelerator Community members in colourful outfits standing together outdoors in front of buses",
    caption: "On the road together",
  },
];
