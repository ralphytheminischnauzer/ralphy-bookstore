const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const UNIT_AMOUNT_CENTS = 1800;
const CURRENCY = 'usd';
const BOOK_NAME = "Ralphy's Big Beautiful Day";
const MAX_QTY = 99;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY in Netlify environment variables, then redeploy.'
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const quantity = Number.parseInt(body.quantity, 10);
    const customer = body.customer || {};

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: `Quantity must be between 1 and ${MAX_QTY}.` }) };
    }

    const email = String(customer.email || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'A valid email address is required.' }) };
    }

    const origin = event.headers.origin || event.headers.Origin || `https://${event.headers.host}`;
    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: CURRENCY,
            unit_amount: UNIT_AMOUNT_CENTS,
            product_data: {
              name: BOOK_NAME,
              description: 'Children\'s picture book by Indy Benning. Shipping is calculated separately and is not included in the $18 USD book price.'
            }
          },
          quantity
        }
      ],
      metadata: {
        quantity: String(quantity),
        total_usd: String((quantity * UNIT_AMOUNT_CENTS / 100).toFixed(2)),
        customer_name: fullName,
        shipping_address: String(customer.address || '').slice(0, 500),
        shipping_city: String(customer.city || '').slice(0, 100),
        shipping_postal: String(customer.postal || '').slice(0, 50),
        shipping_country: String(customer.country || '').slice(0, 100),
        source: 'ralphy_bookstore_netlify'
      },
      custom_text: {
        submit: {
          message: `You are ordering ${quantity} ${quantity === 1 ? 'copy' : 'copies'} of Ralphy's Big Beautiful Day. Shipping is calculated separately and is not included in this checkout total.`
        }
      },
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`
    });

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Unable to create Stripe checkout session.' })
    };
  }
};
