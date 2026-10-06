# Re-engagement email — educators stuck at INCOMPLETE

A one-off nudge for educators who verified their email but never finished
step 3 of signup. Sent through the existing **Admin → Mailing** campaign tool;
nothing in this document sends anything by itself.

Background: the signup log (`SIGNUP_DIAGNOSTICS.md`) showed 17 educator accounts
created Nov 2025 – Apr 2026 that are still `INCOMPLETE` with an empty profile.
They pre-date the diagnostics, so no fix can complete them — only the person can.

---

## Before sending

1. **Deploy the unsubscribe flow first, and run the migration.** The footer link
   (`/unsubscribe?token=…`) used to lead nowhere; it now opens a page that asks
   for confirmation, then opts the recipient out. That needs the new
   `mailing_suppressions` table (`pnpm db:migrate`), and the API and frontend
   deployed together. Check it end to end with the test in step 2: open the footer
   link, press the button, then open the link again — it should say you are
   already unsubscribed.
2. **Send a test to yourself first.** There is no "send test" button; create a
   separate campaign with the same subject and body whose only recipient is your
   own address under *extra emails* (no filters), send it, and tap the button on
   a phone. It must land on the login page. Do the unsubscribe check from this same
   email, then send yourself another to confirm you are no longer mailed.
3. **Confirm the base URL.** The button below uses `https://app.procrechesolutions.com`.
   Change it if production serves the app elsewhere.

## Audience

Admin → Mailing → filters:

| Filter | Value |
|---|---|
| Role | Educator |
| Profile completion | Incomplete profiles only |
| Created before (`createdTo`) | 7 days ago |
| Audience | Subscribed only (`excludeUnsubscribed`) |

"Incomplete" here means no `shortBio` and no `cvUrl` — the same definition the
platform uses for "a real application exists", so an educator an admin approved
straight out of `INCOMPLETE` with an empty profile is still included.

The 7-day cut-off keeps out anyone who signed up this week and may still be
filling in the form. Check the preview count: it should be **17** at the time of
writing. Two of them (`…@izeao.com`, `…@roastic.com`) look like disposable
addresses and will probably bounce.

## Where the button goes

`/login`, not `/signup`. A signed-out visitor on `/signup` sees the role picker
and would try to create a second account (`form_identifier_exists`). After login
the app sends an `INCOMPLETE` educator to `/educator/pending-approval`, which
detects the empty profile and offers a button straight into step 3.

## Content

The recipients' language is unknown (educators who never finished step 3 have no
canton or language on file), so this is one email in French, German and English.

No `{{firstName}}`: legacy accounts may have no first name, which renders as
"Bonjour ,". Available tokens if you add one anyway: `{{firstName}}`,
`{{lastName}}`, `{{email}}`, `{{unsubscribeUrl}}`. The tool strips `<button>`,
`<form>` and `<input>`, so the call to action is a styled link.

### Subject

```
Finalisez votre profil · Profil vervollständigen · Complete your profile
```

### HTML body

```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2B2B2B;line-height:1.5;">
  <div style="text-align:center;margin-bottom:24px;">
    <img src="{{logoUrl}}" alt="ProCrèche Solutions" style="height:48px;width:auto;">
  </div>

  <!-- FR -->
  <h2 style="font-size:20px;margin:0 0 12px;">Votre profil n'est pas encore terminé</h2>
  <p>Bonjour,</p>
  <p>Votre compte ProCrèche Solutions a bien été créé, mais votre profil d'éducateur·trice n'a pas été complété. Tant qu'il ne l'est pas, notre équipe ne peut pas l'examiner.</p>
  <p>Cela prend quelques minutes. Gardez votre CV (PDF ou Word, 5&nbsp;Mo max.) à portée de main, de préférence sur l'appareil que vous utilisez.</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="https://app.procrechesolutions.com/login" style="background:#48CFAE;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;display:inline-block;">Compléter mon profil</a>
  </p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">

  <!-- DE -->
  <h2 style="font-size:20px;margin:0 0 12px;">Ihr Profil ist noch nicht abgeschlossen</h2>
  <p>Guten Tag</p>
  <p>Ihr Konto bei ProCrèche Solutions wurde erstellt, Ihr Profil als Pädagogin bzw. Pädagoge ist aber noch nicht vollständig. Solange es das nicht ist, kann unser Team es nicht prüfen.</p>
  <p>Es dauert nur wenige Minuten. Halten Sie Ihren Lebenslauf (PDF oder Word, max.&nbsp;5&nbsp;MB) bereit, am besten auf dem Gerät, das Sie gerade benutzen.</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="https://app.procrechesolutions.com/login" style="background:#48CFAE;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;display:inline-block;">Profil vervollständigen</a>
  </p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">

  <!-- EN -->
  <h2 style="font-size:20px;margin:0 0 12px;">Your profile isn't finished yet</h2>
  <p>Hello,</p>
  <p>Your ProCrèche Solutions account was created, but your educator profile was never completed. Until it is, our team can't review it.</p>
  <p>It only takes a few minutes. Have your CV (PDF or Word, max&nbsp;5&nbsp;MB) ready, ideally on the device you're using.</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="https://app.procrechesolutions.com/login" style="background:#48CFAE;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;display:inline-block;">Complete my profile</a>
  </p>

  <p style="font-size:13px;color:#6b7280;margin-top:28px;">
    Questions&nbsp;? Fragen&nbsp;? Questions? <a href="mailto:support@procreche.ch" style="color:#227C9D;">support@procreche.ch</a>
  </p>
</div>
```

The compliance footer (sender and unsubscribe link) is appended automatically.

### Plain-text body

```
VOTRE PROFIL N'EST PAS ENCORE TERMINÉ
Bonjour,
Votre compte ProCrèche Solutions a bien été créé, mais votre profil d'éducateur·trice n'a pas été complété. Tant qu'il ne l'est pas, notre équipe ne peut pas l'examiner.
Cela prend quelques minutes. Gardez votre CV (PDF ou Word, 5 Mo max.) à portée de main.
Compléter mon profil : https://app.procrechesolutions.com/login

------------------------------------------------------------

IHR PROFIL IST NOCH NICHT ABGESCHLOSSEN
Guten Tag
Ihr Konto bei ProCrèche Solutions wurde erstellt, Ihr Profil als Pädagogin bzw. Pädagoge ist aber noch nicht vollständig. Solange es das nicht ist, kann unser Team es nicht prüfen.
Es dauert nur wenige Minuten. Halten Sie Ihren Lebenslauf (PDF oder Word, max. 5 MB) bereit.
Profil vervollständigen: https://app.procrechesolutions.com/login

------------------------------------------------------------

YOUR PROFILE ISN'T FINISHED YET
Hello,
Your ProCrèche Solutions account was created, but your educator profile was never completed. Until it is, our team can't review it.
It only takes a few minutes. Have your CV (PDF or Word, max 5 MB) ready.
Complete my profile: https://app.procrechesolutions.com/login

Questions? Fragen? Questions? support@procreche.ch
```

## After sending

Watch **Admin → Signup Diagnostics**. The nightly `system.stuck_incomplete`
sweep stops flagging an account the day its profile is submitted, so the number
of distinct stuck accounts falling is the measure of whether this worked. Anyone
still stuck after a few weeks has been asked and has not answered; that is the
point to decide on cleanup rather than another email.
