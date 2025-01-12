import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import { DEFAULT_EMPTY, DEFAULT_ERROR } from '@/constants/states';

import { Button } from './ui/button';

interface ImageConfig {
  light: string;
  dark: string;
  alt: string;
}

interface ButtonConfig {
  text: string;
  href: string;
}

interface StateConfig {
  title: string;
  message: string;
  button?: ButtonConfig;
}

interface ErrorDetails {
  message: string;
  details?: Record<string, string[]>;
}

interface DataRendererProps<T> {
  success: boolean;
  error?: ErrorDetails;
  data: T[] | null | undefined;
  empty: StateConfig;
  render: (data: T[]) => React.ReactNode;
}

const IMAGES = {
  error: {
    light: '/images/light-error.png',
    dark: '/images/dark-error.png',
    alt: 'Error state illustration',
  },
  empty: {
    light: '/images/light-illustration.png',
    dark: '/images/dark-illustration.png',
    alt: 'Empty state illustration',
  },
} as const;

/**
 * Generates error state configuration based on error details
 * Falls back to default error messages if specific error details aren't provided
 */
const getErrorConfig = (error?: ErrorDetails): StateConfig => ({
  title: error?.message || DEFAULT_ERROR.title,
  message: error?.details ? JSON.stringify(error.details, null, 2) : DEFAULT_ERROR.message,
  button: DEFAULT_ERROR.button,
});

/**
 * Component that renders different images for light/dark modes
 * Images are determined by the theme selected by the user
 */
const StateImage = ({ image }: { image: ImageConfig }) => (
  <>
    {/* Light mode image */}
    <Image src={image.light} alt={image.alt} className="block dark:hidden" width={400} height={400} />
    {/* Dark mode image */}
    <Image src={image.dark} alt={image.alt} className="hidden dark:block" width={400} height={400} />
  </>
);

/**
 * Reusable button component that wraps a Next.js Link
 * Used in error and empty states
 */
const ActionButton = ({ button }: { button: ButtonConfig }) => (
  <Link href={button.href} passHref>
    <Button variant="default" size="lg">
      {button.text}
    </Button>
  </Link>
);

/**
 * Component for displaying state messages (error/empty)
 * Shows a title and descriptive message
 */
const StateMessage = ({ title, message }: Pick<StateConfig, 'title' | 'message'>) => (
  <>
    <h3 className="mt-4 text-lg font-semibold">{title}</h3>
    <p className="text-muted-foreground mt-2 text-sm">{message}</p>
  </>
);

/**
 * Skeleton component for displaying various states (error/empty)
 * Includes an illustration, message, and optional action button
 */
const StateSkeleton: React.FC<StateConfig & { image: ImageConfig }> = ({ image, title, message, button }) => (
  <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
    <StateImage image={image} />
    <StateMessage title={title} message={message} />
    {button && <ActionButton button={button} />}
  </div>
);

/**
 * Main DataRenderer component that handles different data states:
 * - Error state: When API call fails
 * - Empty state: When data array is empty
 * - Success state: Renders data using provided render function
 */
const DataRenderer = <T,>({ success, error, data, empty = DEFAULT_EMPTY, render }: DataRendererProps<T>) => {
  // Handle error state
  if (!success) {
    return <StateSkeleton image={IMAGES.error} {...getErrorConfig(error)} />;
  }

  // Handle empty state
  if (!data || data.length === 0) {
    return <StateSkeleton image={IMAGES.empty} {...empty} />;
  }

  // Render data when available
  return <>{render(data)}</>;
};

export default DataRenderer;
