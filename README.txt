Ralphy Bookstore — Netlify Dynamic Stripe Checkout

This version fixes the Stripe quantity problem properly, but it must be deployed in a way that includes Netlify Functions.

IMPORTANT:
Dragging only index.html or using Netlify Drop as a static upload is not enough for the seamless quantity checkout. The site needs the included server-side function:

  netlify/functions/create-checkout-session.js

Correct deployment methods:
1. Best: Deploy from a GitHub repository connected to Netlify.
2. Also works: Deploy from your computer using Netlify CLI.

After deploying, add this Netlify environment variable and redeploy:

  STRIPE_SECRET_KEY = your Stripe secret key

What changed:
- The page no longer sends customers to a fixed Stripe Payment Link.
- When a customer chooses 2 copies, the site creates a Stripe Checkout Session for quantity 2.
- Stripe opens directly with the selected quantity and correct total.

If you still see an alert:
- "Checkout is not fully deployed yet" means the Netlify Function was not deployed. Use Git deploy or Netlify CLI, not static drag-and-drop.
- "Stripe is not configured yet" means STRIPE_SECRET_KEY is missing or the site was not redeployed after adding it.

Do not put your Stripe secret key inside index.html. It must remain server-side in Netlify environment variables.
