import { Checkout } from "@polar-sh/nextjs";

// Dynamic server selection based on POLAR_MODE environment variable
// Change POLAR_MODE to 'production' when going live
const polarServer = process.env.POLAR_MODE === 'production' ? 'production' : 'sandbox';

export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: process.env.NEXT_PUBLIC_SITE_URL + "/dashboard?payment=success",
  server: polarServer,
});
