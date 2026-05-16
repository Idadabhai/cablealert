'use server';

import { createCheckoutSession } from '@/lib/payments';
import { redirect } from 'next/navigation';

export async function createCheckoutAction(_formData: FormData): Promise<void> {
  try {
    const url = await createCheckoutSession(undefined);
    redirect(url);
  } catch (err) {
    console.error('createCheckoutAction failed:', err);
    redirect('/subscribe?error=checkout_failed');
  }
}
