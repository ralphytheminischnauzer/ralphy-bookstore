const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const UNIT_AMOUNT_CENTS = 1800;
const CURRENCY = 'usd';
const BOOK_NAME = "Ralphy's Big Beautiful Day";
const MAX_QTY = 99;
const CANADA_NON_QC_SHIPPING_CENTS = 800;
const USA_SHIPPING_CENTS = 1200;

function normalize(value) {
  return String(value || '').trim();
}

function calculateShippingCents(customer) {
  const country = normalize(customer.country);
  const province = normalize(customer.province).toUpperCase();

  if (country === 'Canada') {
    return province === 'QC' ? 0 : CANADA_NON_QC_SHIPPING_CENTS;
  }

  if (country === 'United States') {
    return USA_SHIPPING_CENTS;
  }

  return null;
}

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

    const email = normalize(customer.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'A valid email address is required.' }) };
    }

    const country = normalize(customer.country);
    const province = normalize(customer.province).toUpperCase();
    if (!country || (country === 'Canada' && !province)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Country and province are required for checkout.' }) };
    }

    const shippingCents = calculateShippingCents(customer);
    if (shippingCents === null) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Please contact Indy for an international delivery quote before ordering.' }) };
    }

    const lineItems = [
      {
        price_data: {
          currency: CURRENCY,
          unit_amount: UNIT_AMOUNT_CENTS,
          product_data: {
            name: BOOK_NAME,
            description: 'Children\'s picture book by Indy Benning.'
          }
        },
        quantity
      }
    ];

    if (shippingCents > 0) {
      lineItems.push({
        price_data: {
          currency: CURRENCY,
          unit_amount: shippingCents,
          product_data: {
            name: 'Delivery',
            description: country === 'Canada'
              ? 'Delivery for Canadian addresses outside Quebec.'
              : 'Delivery for U.S. addresses.'
          }
        },
        quantity: 1
      });
    }

    const subtotalCents = quantity * UNIT_AMOUNT_CENTS;
    const totalCents = subtotalCents + shippingCents;
    const origin = event.headers.origin || event.headers.Origin || `https://${event.headers.host}`;
    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: lineItems,
      metadata: {
        quantity: String(quantity),
        subtotal_usd: String((subtotalCents / 100).toFixed(2)),
        delivery_usd: String((shippingCents / 100).toFixed(2)),
        total_usd: String((totalCents / 100).toFixed(2)),
        customer_name: fullName,
        shipping_address: normalize(customer.address).slice(0, 500),
        shipping_city: normalize(customer.city).slice(0, 100),
        shipping_postal: normalize(customer.postal).slice(0, 50),
        shipping_country: country.slice(0, 100),
        shipping_province: province.slice(0, 50),
        local_quebec_order: String(country === 'Canada' && province === 'QC'),
        source: 'ralphy_bookstore_netlify'
      },
      custom_text: {
        submit: {
          message: `You are ordering ${quantity} ${quantity === 1 ? 'copy' : 'copies'} of Ralphy's Big Beautiful Day. The checkout total is $${(totalCents / 100).toFixed(2)} USD.`
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
