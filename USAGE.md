# Ralphy Bookstore Deployment Instructions

This project uses a **Netlify Function** to create a Stripe Checkout Session with the customer’s selected quantity. That is why the checkout can open with 2 copies, 3 copies, or more already applied.

## Required Netlify deployment method

A plain static upload is not enough for this version. Deploy the whole project through **GitHub connected to Netlify** or through **Netlify CLI**, because Netlify must build and deploy the function in `netlify/functions/create-checkout-session.js`.

## Required environment variable

In Netlify, add this environment variable and redeploy:

| Variable name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Your Stripe secret key from your Stripe Dashboard. |

## Why the old version failed

The old Stripe Payment Link reopened checkout at Stripe’s default quantity. This version fixes that by creating a Checkout Session server-side with `quantity` set to the number chosen on the page.

## If checkout still fails

If the browser says checkout could not be created, check these two things first:

| Symptom | Meaning | Fix |
| --- | --- | --- |
| Checkout function not deployed / generic checkout error | Netlify is serving only static files. | Deploy from GitHub or Netlify CLI so functions are included. |
| Stripe not configured | `STRIPE_SECRET_KEY` is missing. | Add it under Netlify environment variables and redeploy. |
