// Legal + support copy for academy.automatos.app/privacy and /support — the
// URLs the App Store / Play listings and the mobile app's privacy screen link
// to. Pure data (no DOM) so tests/legal.test.mjs can check it in Node.
//
// Every claim here was traced to code (2026-10-01): the Spine schema
// (migrations/), the telemetry whitelist (server/spine/validate.js), the
// funnel beacon (public/js/analytics.js, server/events.js), the tutor proxy
// (server/tutor.js), the digest (server/digest/), deletion
// (server/spine/me-routes.js) and the mobile app's own flows. When one of
// those changes what is collected or where it goes, change this text in the
// same PR and move POLICY_UPDATED.

export const SUPPORT_EMAIL = "support@automatos.app";
export const POLICY_UPDATED = "1 October 2026";

export const PRIVACY_MD = `
This policy covers **Automatos AI Academy**: the website at academy.automatos.app and the Automatos AI Academy app for iPhone and Android. It explains what we collect, why, who helps us run the service, and the controls you have. Questions go to **${SUPPORT_EMAIL}**.

## The short version

- The Academy is free. There are no ads, we never sell your data, and we use no third-party advertising or analytics trackers.
- On the website you can learn without an account: your progress stays in your browser.
- If you sign in (required in the app), we store your learning progress against your account so it syncs across devices. You can export it or delete it, or delete your whole account, at any time.
- Questions you ask the AI tutor are processed by the Automatos platform using AI models from Anthropic.

## Who we are

Automatos AI Academy is run by Automatos, which is the data controller for the personal data described here. Contact: **${SUPPORT_EMAIL}**.

## What we collect

### Your account

Sign-in is handled by **Clerk**, our authentication provider. When you create an account with an email address or with Apple, Google or GitHub, Clerk holds your sign-in details: your email address, and the name and profile picture your sign-in provider shares, if any. Our own database stores only your Clerk user ID, your plan and your role. It holds no email, name or picture.

### Your learning data (when you are signed in)

To sync progress and personalise your study plan, we store against your account:

- your answers (which question, whether it was correct, how long it took) and your spaced-repetition schedule
- your mastery map, mock-exam scores and scenario results
- which videos, podcasts and narrations you have completed
- study activity events: a fixed list of structured events such as "session started" or "card reviewed". The server rejects free text, so nothing you type ends up here.
- your preferences: exam dates you set on the website, and whether you want the weekly email
- a daily count of tutor questions, used to apply the fair-use limit

### Using the website without an account

Your progress is saved in your browser's local storage on your device and is not sent to us. To understand how the site is used, the site sends us anonymous usage events: the event name (for example a page view or a button press), the page path and a random number that changes on every page load. We do not store your IP address with these events, they carry no account identifier, and we set no cookies of our own.

### The AI tutor

When you ask the tutor a question, the text of your question goes to the **Automatos platform**, which runs the tutor using AI models from **Anthropic**. The platform keeps conversation history so the tutor can follow the thread. On the website you can choose to share a short summary of your progress with the tutor (your track, readiness, weakest areas, mock scores and streak) so its answers fit where you are; this is off unless you turn it on. Please don't put personal information in tutor questions.

### Voice (app)

If you ask the tutor by voice, speech recognition runs **on your device**; the audio is not sent to us. Only the resulting text is sent, as a tutor question. Read-aloud uses your device's voice or pre-recorded audio we host.

### Notifications (app)

Study reminders are scheduled locally on your device. We do not collect push-notification tokens.

### Email

- **Weekly progress email:** sent only if you turn it on. It goes to the email address on your Clerk account, which we fetch at sending time and do not store. Every email has a one-click unsubscribe link.
- **"Notify me" requests:** if you ask to be told when a track launches, we pass your email address and the track to the tool we use to send that notice.

### Certificates

When you claim a certificate, the name you type is written into the certificate link and signed by our server; we don't store it. Anyone you share the link with can see that name.

### Security logs

Our servers briefly use IP addresses, in memory only, to rate-limit requests and prevent abuse. Our hosting provider keeps standard server logs.

## Why we use it

- **To provide the Academy** (performance of our agreement with you): accounts, sync, the tutor, progress, certificates.
- **To improve the content** (legitimate interests): spotting questions that confuse people or lessons that need work, using study events and anonymous usage events.
- **To email you** (consent): the weekly email and launch notices, only when you ask for them.
- **To keep the service secure** (legitimate interests): rate limiting and abuse prevention.

We do not use your data for advertising, and we do not make automated decisions with legal or similarly significant effects about you. Your readiness grade is a study aid, not a decision about you.

## Who helps us run it

We share data only with providers that run parts of the service for us:

- **Clerk**: sign-in and account management
- **Railway**: hosting for the website, API and database
- **Amazon Web Services**: storage and delivery of course media (video, audio)
- **Automatos platform and Anthropic**: the AI tutor
- **Our email provider**: sending the emails you have asked for
- **Google Fonts**: the website loads its fonts from Google, which receives your IP address when your browser requests them
- **Apple and Google**: if you install the app, the App Store or Google Play handles the download under their own privacy policies

Some of these providers are in the United States. Where data leaves the UK or EEA, it is protected by the providers' standard contractual clauses or an equivalent safeguard.

## How long we keep it

- **Account and learning data:** for as long as you have an account. Deleting your data or your account removes it from our database straight away.
- **Anonymous usage events:** kept to understand how the site is used. They cannot be linked back to you.
- **Tutor conversations:** kept on the Automatos platform. Email us to have yours deleted.
- **Administrative records:** if we take an administrative action on an account, a record of that action is kept for security and accountability.

## Your choices and rights

- **Export:** download everything we hold about your learning, from Settings in the app or from your profile page on the website.
- **Delete your learning data:** this keeps your sign-in. It is in the app's Settings, under Account & data, and on your profile page.
- **Delete your account:** this removes your sign-in and all your learning data, in the app and on the website. It is in the same places.
- **Stop emails:** use the unsubscribe link in any email, or turn the weekly email off on your profile page.
- **Everything else:** you can ask us to access, correct, delete, restrict or port your data, or object to how we use it, by emailing **${SUPPORT_EMAIL}**. We reply within one month. You can also complain to your local data protection authority.

## Children

The Academy is for people aged **16 and over**. The app asks your age and does not let anyone under 16 create an account. If you believe someone under 16 has given us personal data, email us and we will delete it.

## Security

All traffic is encrypted in transit (HTTPS). Access to our database and admin tools is restricted and logged. No system is perfectly secure, but we collect as little as we can, which limits what could be exposed.

## Changes

If this policy changes, we update it here and change the date below. If the change is significant, we will tell signed-in users in the app or by email before it takes effect.

**Last updated: ${POLICY_UPDATED}**
`;

export const SUPPORT_MD = `
Need help with Automatos AI Academy, on the website or in the app? Email **${SUPPORT_EMAIL}**. We read every message.

## Common questions

### Is it really free?

Yes. Every track, quiz, mock exam and the tutor are free to use.

### Do I need an account?

Not on the website: everything works signed out, and your progress stays in your browser. The app needs an account so your progress can sync. Signing in on the website syncs it there too.

### Something in a question or lesson is wrong

In the app, use **Report an issue** in Settings or on the lesson page. On the website, email us with the track and question. Corrections are how the content gets better, so thank you.

### How do I delete my data or my account?

In the app: **Settings → Account & data**. On the website: your **profile page**. Deleting your learning data keeps your sign-in; deleting your account removes both. See the privacy policy for what each one removes.

### I can't sign in

Check that you are using the same method you signed up with (email, Apple, Google or GitHub). If you are still stuck, email us from the address on your account.

### Is this official certification training?

No. The Academy is independent training. It is not affiliated with or endorsed by any certification body, and passing our mock exams does not certify you.
`;
