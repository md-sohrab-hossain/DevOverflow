'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateUrlQuery } from '@/lib/url';
import { cn } from '@/lib/utils';

interface FilterOption {
  name: string;
  value: string;
}

interface CommonFilterProps {
  filters: FilterOption[];
  otherClasses?: string;
  containerClasses?: string;
}

/**
 * CommonFilter Component
 *
 * A reusable filter component that allows users to select from a list of options
 * and updates the URL accordingly. Used for sorting and filtering content.
 *
 * Features:
 * - Maintains filter state in URL
 * - Responsive design
 * - Customizable styling
 * - Keyboard accessible
 *
 * @example
 * <CommonFilter
 *   filters={[
 *     { name: 'Most Recent', value: 'mostrecent' },
 *     { name: 'Most Voted', value: 'mostvoted' }
 *   ]}
 * />
 */
const CommonFilter = ({ filters, otherClasses = '', containerClasses = '' }: CommonFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentFilter = searchParams.get('filter');

  const handleFilterChange = (value: string) => {
    const newUrl = updateUrlQuery({
      params: searchParams.toString(),
      key: 'filter',
      value,
    });

    // Update URL without scrolling to top
    router.push(newUrl, { scroll: false });
  };

  return (
    <div className={cn('relative', containerClasses)}>
      <Select onValueChange={handleFilterChange} defaultValue={currentFilter || undefined}>
        <SelectTrigger
          className={cn(
            'body-regular no-focus light-border background-light800_dark300 text-dark500_light700 border px-5 py-2.5',
            otherClasses
          )}
          aria-label="Filter options"
        >
          <div className="line-clamp-1 flex-1 text-left">
            <SelectValue placeholder="Select a filter" />
          </div>
        </SelectTrigger>

        <SelectContent>
          <SelectGroup>
            {filters.map(filter => (
              <SelectItem key={filter.value} value={filter.value} className="cursor-pointer">
                {filter.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default CommonFilter;
