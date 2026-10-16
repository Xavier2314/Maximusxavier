# Project log

## Completed (v0.1)
- Design system from the 2026 brand guidelines (navy / royal / red / cream, Playfair Display + Montserrat, facet graphics).
- Home, About, Founder, Events 2026, Register, Status, Contact, Privacy, Terms, Refunds, 404, sitemap, robots, Open Graph image, favicons.
- Ticket windows with automatic Early Bird → Late switch (server-enforced).
- Registration → review → Paystack checkout → server verification → webhook → idempotent confirmation → email (Resend, optional).
- Admin dashboard (password + signed cookie, owner role): stats, search, filters, CSV export, ticket prices/windows/benefits, event details, speakers, awards, video contests, messages, audit log.
- Supabase schema with RLS.

## Update: 16 Oct 2026
- Event confirmed: Saturday 5 December 2026, Ibadan (start time and exact venue to be announced).
- Founder profile: Chukwuemeka (Peter) Muoneke, from his LinkedIn profile; portrait by Emperor Sam Photography; quote "Set your goals."
- Registration fees by membership position (Member N2,000 to Ruby Director N100,000), from the official flyer.
- Payment by bank transfer to the official Moniepoint account (from the flyer). Each registration gets a unique reference for the narration; attendees report the transfer; admins verify and confirm in /admin/registrations (confirmation email sent on approval). Paystack card payment stays available as an option once keys are added.
- Without a database, the form shows the bank details and sends people to the official Google Form to submit proof.
- Accelerator Inter-Office N100K Content Challenge page (/events/content-challenge): prizes N50k/N30k/N20k, 12-31 Oct 2026; status follows the dates.

## Waiting for (from Accelerator Community)
- Official registration form questions (Google Form requires sign-in, so it could not be read).
- Whether Late Registration (from 1 Nov) uses the same fees.
- Content challenge submission link, rules and judging criteria.
- Event start time, exact venue and theme.
- Paystack account (test + live secret keys).
- Supabase project (or approval to create one).
- Mission, vision, story, CAC details (registered name, RC number, address).
- Founder vision statement and message to the community.
- Official email, phone, address, social media links.
- Verified impact figures; more community and event photos.
- Speakers, award categories, contest details.

## Decisions
- Draft registration fields are used until the official form is supplied.
- Pillars (People, Growth, Opportunity, Impact) come from the brand's roll-up banner.
- Headline "Accelerating people. Building leaders. Celebrating excellence." is the brief's working direction, not an approved slogan.
