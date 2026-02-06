/**
 * Stripe Type Declarations
 *
 * These are placeholder type declarations for the Stripe packages.
 * When @stripe/stripe-js and @stripe/react-stripe-js are installed via npm,
 * these will be replaced by the actual package types.
 */

declare module '@stripe/stripe-js' {
  export interface Stripe {
    elements(options?: any): any;
    confirmPayment(options: any): Promise<{ error?: any; paymentIntent?: any }>;
  }

  export function loadStripe(publishableKey: string): Promise<any>;
}

declare module '@stripe/react-stripe-js' {
  import { ElementType } from 'react';

  export interface StripeElementsOptions {
    clientSecret: string;
    appearance?: any;
  }

  export interface ElementsOptions extends StripeElementsOptions {}

  export const Elements: ElementType<{
    stripe: any;
    options: ElementsOptions;
    children: React.ReactNode;
  }>;

  export interface UseStripeOptions {
    // options
  }

  export function useStripe(): any;
  export function useElements(): any;

  export const PaymentElement: ElementType<{
    options?: any;
    id?: string;
    className?: string;
  }>;

  export const CardElement: ElementType<{
    options?: any;
    id?: string;
    className?: string;
  }>;

  export interface StripeElementsAppearanceOptions {
    theme?: 'stripe' | 'night' | 'flat';
    variables?: {
      colorPrimary?: string;
      colorBackground?: string;
      colorText?: string;
      colorDanger?: string;
      fontFamily?: string;
    };
  }
}
