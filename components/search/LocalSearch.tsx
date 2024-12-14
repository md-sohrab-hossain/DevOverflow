'use client';
import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { updateUrlQuery, removeKeysFormUrlQuery } from '@/lib/url';

import { Input } from '../ui/input';

interface ILocalSearch {
  route: string;
  imgSrc: string;
  placeholder: string;
  className?: string;
}

const DEBOUNCE_DELAY_TIME = 300;

const LocalSearch = ({ imgSrc, placeholder, route, className }: ILocalSearch) => {
  const router = useRouter();
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || '';
  const [searchQuery, setSearchQuery] = useState(query);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        const newUrl = updateUrlQuery({
          params: searchParams.toString(),
          key: 'query',
          value: searchQuery,
        });

        router.push(newUrl, { scroll: false });
      } else {
        if (pathName === route) {
          const newUrl = removeKeysFormUrlQuery({
            params: searchParams.toString(),
            keysToRemove: ['query'],
          });

          router.push(newUrl, { scroll: false });
        }
      }
    }, DEBOUNCE_DELAY_TIME);

    return () => clearTimeout(delayDebounceFn);
  }, [router, route, searchParams, searchQuery, pathName]);

  return (
    <div
      className={`background-light800_darkgradient flex min-h-[56px] grow items-center gap-4 rounded-[10px] px-4 ${className}`}
    >
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

      <Input
        id="search"
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="paragraph-regular no-focus placeholder text-dark400_light700 border-none shadow-none outline-none"
      />
    </div>
  );
};

export default LocalSearch;
