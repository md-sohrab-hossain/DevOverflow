'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';

import { removeKeysFormUrlQuery, updateUrlQuery } from '@/lib/url';
import { cn } from '@/lib/utils';

import { Button } from '../ui/button';

const filters = [
  { name: 'Newest', value: 'newest' },
  { name: 'React', value: 'react' },
  { name: 'NodeJs', value: 'nodejs' },
  { name: 'Popular', value: 'popular' },
  { name: 'Html/Css', value: 'html/css' },
  { name: 'Javascript', value: 'javascript' },
  { name: 'Recommended', value: 'recommended' },
];

const HomeFilter = () => {
  const router = useRouter();

  const searchParams = useSearchParams();
  const filterParams = searchParams.get('filter');
  const [active, setActive] = useState(filterParams || '');

  const handleClick = (item: string) => {
    let newUrl = '';

    if (item === active) {
      setActive('');
      newUrl = removeKeysFormUrlQuery({
        params: searchParams.toString(),
        keysToRemove: ['filter'],
      });
    } else {
      setActive(item);
      newUrl = updateUrlQuery({
        params: searchParams.toString(),
        key: 'filter',
        value: item,
      });
    }

    router.push(newUrl, { scroll: false });
  };

  return (
    <div className="mt-10 hidden flex-wrap gap-3 sm:flex">
      {filters.map((item, index) => (
        <Button
          key={index}
          onClick={() => handleClick(item.value)}
          className={cn(
            `body-medium rounded-lg px-6 py-3 capitalize shadow-none`,
            active === item.value
              ? 'bg-primary-100 text-primary-500 hover:bg-primary-100 dark:bg-dark-300 dark:text-primary-500 dark:hover:bg-dark-400'
              : 'bg-light-800 text-light-500 hover:bg-light-700 dark:bg-dark-300 dark:text-light-500 dark:hover:bg-dark-400'
          )}
        >
          {item.name}
        </Button>
      ))}
    </div>
  );
};

export default HomeFilter;
