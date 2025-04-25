'use client';

import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { updateUrlQuery, removeKeysFormUrlQuery } from '@/lib/url';

import { Input } from '../ui/input';

interface LocalSearchProps {
  route: string;
  imgSrc: string;
  placeholder: string;
  className?: string;
  iconPosition?: 'left' | 'right';
  otherClasses?: string;
}

interface SearchInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

// Time to wait after user stops typing before updating URL (in milliseconds)
const DEBOUNCE_DELAY = 300;

/**
 * Custom hook to handle search functionality with URL updates
 *
 * Workflow:
 * 1. User types in search box
 * 2. Wait for DEBOUNCE_DELAY ms after user stops typing
 * 3. Update URL with search query
 * 4. If search is cleared, remove query from URL
 *
 */
const useSearchWithDebounce = (route: string) => {
  const router = useRouter();
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  useEffect(() => {
    // Function to update URL based on search query
    const updateSearchParams = () => {
      if (searchQuery) {
        // If there's a search query, add it to URL
        // Example: /questions → /questions?query=react
        const newUrl = updateUrlQuery({
          params: searchParams.toString(),
          key: 'query',
          value: searchQuery,
        });
        router.push(newUrl, { scroll: false });
        return;
      }

      // If search is empty and we're on the correct route,
      // remove query parameter from URL
      // Example: /questions?query=react → /questions
      if (pathName === route) {
        const newUrl = removeKeysFormUrlQuery({
          params: searchParams.toString(),
          keysToRemove: ['query'],
        });
        router.push(newUrl, { scroll: false });
      }
    };

    // Set up debounce timer to delay URL updates while typing
    const debounceTimer = setTimeout(updateSearchParams, DEBOUNCE_DELAY);

    // Cleanup timer when component unmounts or searchQuery changes
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, router, pathName, route, searchParams]);

  return { searchQuery, setSearchQuery };
};

const SearchIcon = ({ imgSrc }: { imgSrc: string }) => (
  <label htmlFor="search">
    <Image
      src={imgSrc}
      width={24}
      height={24}
      alt="search"
      draggable={false}
      className="invert-colors cursor-pointer"
    />
  </label>
);

const SearchInput = ({ placeholder, value, onChange }: SearchInputProps) => (
  <Input
    id="search"
    type="text"
    value={value}
    placeholder={placeholder}
    onChange={e => onChange(e.target.value)} // mainly we are doing this setSearchQuery(e.target.value)}
    className="paragraph-regular no-focus placeholder text-dark400_light700 border-none shadow-none outline-none"
  />
);

/**
 * Main LocalSearch component that combines search functionality
 *
 * Usage example:
 *
 * <LocalSearch
 *   route="/questions"
 *   imgSrc="/icons/search.svg"
 *   placeholder="Search questions..."
 * />
 *
 *
 * Workflow:
 * 1. Component mounts and checks URL for existing search query
 * 2. User types in search box
 * 3. After DEBOUNCE_DELAY ms, URL updates with search query
 * 4. URL updates trigger any necessary data fetching in parent components
 */
const LocalSearch = ({ 
  imgSrc, 
  placeholder, 
  route, 
  className = '',
  iconPosition = 'left',
  otherClasses
}: LocalSearchProps) => {
  const { searchQuery, setSearchQuery } = useSearchWithDebounce(route);

  return (
    <div
      className={`
        background-light800_darkgradient 
        flex min-h-[56px] grow 
        items-center gap-4 
        rounded-[10px] px-4 
        ${className}
        ${otherClasses}
      `}
    >
      {iconPosition === 'left' && <SearchIcon imgSrc={imgSrc} />}
      <SearchInput placeholder={placeholder} value={searchQuery} onChange={setSearchQuery} />
      {iconPosition === 'right' && <SearchIcon imgSrc={imgSrc} />}
    </div>
  );
};

export default LocalSearch;
