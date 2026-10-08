# Parent Payments with Stripe

The Parent payments page uses Stripe Checkout for card payments. The CRM stores no card details. A payment remains `Pending` until a signed Stripe webhook confirms the Checkout Session; return URLs alone never mark an invoice paid.

## Environment

Configure these server-side environment variables in local development and deployment:

- `STRIPE_SECRET_KEY`: Stripe secret API key. Use a test-mode key for local testing.
- `STRIPE_WEBHOOK_SECRET`: signing secret for the Stripe webhook endpoint.
- `STRIPE_CURRENCY`: three-letter Stripe currency code; defaults to `cad`.
- `FRONTEND_BASE_URL`: Parent portal origin; defaults to `http://localhost:3000`.
- `STRIPE_CHECKOUT_SUCCESS_URL`: optional override. Default returns to `/parent/payments?checkout=success&session_id={CHECKOUT_SESSION_ID}`.
- `STRIPE_CHECKOUT_CANCEL_URL`: optional override. Default returns to `/parent/payments?checkout=cancelled`.

Never commit secret keys or webhook secrets. The API returns `503` for checkout initiation when `STRIPE_SECRET_KEY` is missing, and the webhook endpoint returns `503` when `STRIPE_WEBHOOK_SECRET` is missing.

## Local Testing

1. Start Django on port `8000` and the frontend on port `3000`.
2. Configure a Stripe test secret key and start Stripe CLI forwarding:

   `stripe listen --forward-to localhost:8000/api/v1/stripe/webhook`

3. Set `STRIPE_WEBHOOK_SECRET` to the `whsec_...` value printed by Stripe CLI, then restart Django.
4. Sign in as a Parent with linked children, open `/parent/payments`, and pay part of an issued invoice using a Stripe test card.
5. Verify that the payment stays pending until the webhook is delivered, then refresh the page and confirm the paid amount, remaining balance, and receipt reference.

The API contract is `GET /api/v1/parent/billing`, `POST /api/v1/parent/billing/checkout`, and `POST /api/v1/stripe/webhook`. Parents cannot use the legacy `POST /api/v1/payments` route to self-record a completed payment.
