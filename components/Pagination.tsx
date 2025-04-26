'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { updateUrlQuery } from '@/lib/url';
import { cn } from '@/lib/utils';

interface Props {
  page: number | undefined | string;
  isNext: boolean;
  containerClasses?: string;
}

const CustomPagination = ({ page = 1, isNext, containerClasses }: Props) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPage = Number(page);

  const handleNavigation = (pageNumber: number) => {
    // Don't navigate if clicking the current page
    if (pageNumber === currentPage) return;

    const newUrl = updateUrlQuery({
      params: searchParams.toString(),
      key: 'page',
      value: pageNumber.toString(),
    });

    router.push(newUrl);
  };

  return (
    <Pagination className={cn('mt-10', containerClasses)}>
      <PaginationContent>
        {/* Previous Button */}
        <PaginationItem>
          <PaginationPrevious
            onClick={() => handleNavigation(currentPage - 1)}
            className={cn('cursor-pointer', currentPage <= 1 && 'pointer-events-none opacity-50')}
          />
        </PaginationItem>

        {/* First Page */}
        <PaginationItem>
          {currentPage === 1 ? (
            <PaginationLink
              isActive
              className="cursor-default bg-primary-500 text-white hover:bg-primary-500 hover:text-white"
            >
              1
            </PaginationLink>
          ) : (
            <PaginationLink
              onClick={() => handleNavigation(1)}
              className="cursor-pointer border border-primary-500 bg-transparent text-primary-500 hover:bg-primary-500/10"
            >
              1
            </PaginationLink>
          )}
        </PaginationItem>

        {/* Ellipsis */}
        {currentPage > 3 && (
          <PaginationItem>
            <PaginationEllipsis className="text-primary-500" />
          </PaginationItem>
        )}

        {/* Previous Page */}
        {currentPage > 2 && (
          <PaginationItem>
            <PaginationLink
              onClick={() => handleNavigation(currentPage - 1)}
              className="cursor-pointer border border-primary-500 bg-transparent text-primary-500 hover:bg-primary-500/10"
            >
              {currentPage - 1}
            </PaginationLink>
          </PaginationItem>
        )}

        {/* Always show Current Page */}
        {currentPage > 1 && (
          <PaginationItem>
            <PaginationLink
              isActive
              className="cursor-default bg-primary-500 text-white hover:bg-primary-500 hover:text-white"
            >
              {currentPage}
            </PaginationLink>
          </PaginationItem>
        )}

        {/* Next Page */}
        {isNext && (
          <PaginationItem>
            <PaginationLink
              onClick={() => handleNavigation(currentPage + 1)}
              className="cursor-pointer border border-primary-500 bg-transparent text-primary-500 hover:bg-primary-500/10"
            >
              {currentPage + 1}
            </PaginationLink>
          </PaginationItem>
        )}

        {/* Next Button */}
        <PaginationItem>
          <PaginationNext
            onClick={() => handleNavigation(currentPage + 1)}
            className={cn('cursor-pointer', !isNext && 'pointer-events-none opacity-50')}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default CustomPagination;
