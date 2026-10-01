'use client';

import Button from '@/components/ui/Button';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { createStripePortal } from '@/utils/stripe/server';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { Tables } from '@/types_db';

type Subscription = Tables<'subscriptions'>;
type Price = Tables<'prices'>;
type Product = Tables<'products'>;

type SubscriptionWithPriceAndProduct = Subscription & {
  prices:
    | (Price & {
        products: Product | null;
      })
    | null;
};

interface Props {
  subscription: SubscriptionWithPriceAndProduct | null;
}

export default function CustomerPortalForm({ subscription }: Props) {
  const router = useRouter();
  const currentPath = usePathname();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [portalError, setPortalError] = useState<string | null>(null);
  const price = subscription?.prices;
  let subscriptionPrice: string | null = null;

  if (
    price?.currency &&
    price.unit_amount !== null &&
    Number.isFinite(price.unit_amount)
  ) {
    try {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: price.currency
      });
      const fractionDigits = formatter.resolvedOptions().maximumFractionDigits;
      subscriptionPrice = formatter.format(
        price.unit_amount / 10 ** fractionDigits
      );
    } catch {
      // Incomplete or invalid billing data should not break the account page.
    }
  }

  const intervalCount = price?.interval_count ?? 1;
  const billingInterval = price?.interval
    ? intervalCount === 1
      ? price.interval
      : `${intervalCount} ${price.interval}s`
    : null;
  const planName = price?.products?.name;

  const handleStripePortalRequest = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setPortalError(null);
    try {
      const redirectUrl = await createStripePortal(currentPath);
      if (!redirectUrl) throw new Error('Missing portal URL');
      router.push(redirectUrl);
    } catch {
      setPortalError('Unable to open billing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      title="Your Plan"
      description={
        subscription
          ? planName
            ? `You are currently on the ${planName} plan.`
            : 'You currently have a subscription.'
          : 'You are not currently subscribed to any plan.'
      }
      footer={
        <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="pb-4 sm:pb-0">Manage your subscription on Stripe.</p>
          <Button
            variant="slim"
            onClick={handleStripePortalRequest}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Open customer portal
          </Button>
        </div>
      }
    >
      <div className="mt-8 mb-4 text-xl font-semibold">
        {subscription ? (
          subscriptionPrice
            ? billingInterval
              ? `${subscriptionPrice}/${billingInterval}`
              : subscriptionPrice
            : 'Billing details are currently unavailable.'
        ) : (
          <Link href="/">Choose your plan</Link>
        )}
      </div>
      {portalError && (
        <p role="alert" className="text-red-400">
          {portalError}
        </p>
      )}
    </Card>
  );
}
