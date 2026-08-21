import { Link, useSearchParams } from 'react-router';

interface PaginationProps {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
    baseUrl?: string;
}

export function Pagination({
    currentPage,
    lastPage,
    perPage,
    total,
    baseUrl = '',
}: PaginationProps) {
    const [searchParams] = useSearchParams();

    const getPageUrl = (page: number) => {
        const params = new URLSearchParams(searchParams);
        if (page === 1) {
            params.delete('page');
        } else {
            params.set('page', page.toString());
        }
        const query = params.toString();
        return `${baseUrl}${query ? `?${query}` : ''}`;
    };

    const pages: (number | string)[] = [];
    const showEllipsis = lastPage > 7;

    if (showEllipsis) {
        // Always show first page
        pages.push(1);

        if (currentPage > 4) {
            pages.push('...');
        }

        // Show pages around current page
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(lastPage - 1, currentPage + 1);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (currentPage < lastPage - 3) {
            pages.push('...');
        }

        // Always show last page
        if (lastPage > 1) {
            pages.push(lastPage);
        }
    } else {
        // Show all pages if 7 or fewer
        for (let i = 1; i <= lastPage; i++) {
            pages.push(i);
        }
    }

    return (
        <div className="bg-card border-secondary flex items-center justify-between border-t px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
                {currentPage > 1 && (
                    <Link
                        to={getPageUrl(currentPage - 1)}
                        className="page-link"
                    >
                        Previous
                    </Link>
                )}
                {currentPage < lastPage && (
                    <Link
                        to={getPageUrl(currentPage + 1)}
                        className="page-link ml-3"
                    >
                        Next
                    </Link>
                )}
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-secondary text-sm">
                        Showing{' '}
                        <span className="font-medium">
                            {Math.min((currentPage - 1) * perPage + 1, total)}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                            {Math.min(currentPage * perPage, total)}
                        </span>{' '}
                        of <span className="font-medium">{total}</span> results
                    </p>
                </div>
                <div>
                    <nav
                        className="isolate inline-flex space-x-3 rounded-md shadow-sm"
                        aria-label="Pagination"
                    >
                        {currentPage > 1 && (
                            <Link
                                to={getPageUrl(currentPage - 1)}
                                className="page-link text-muted hover:bg-secondary-bg rounded-l-md px-2 py-2.5"
                            >
                                <span className="sr-only">Previous</span>
                                <svg
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </Link>
                        )}

                        {pages.map((page, index) => {
                            if (page === '...') {
                                return (
                                    <span
                                        key={`ellipsis-${index}`}
                                        className="page-link px-4 py-2"
                                    >
                                        ...
                                    </span>
                                );
                            }

                            const isCurrent = page === currentPage;
                            return (
                                <Link
                                    key={page}
                                    to={getPageUrl(page as number)}
                                    className={`page-link px-4 py-2 ${
                                        isCurrent
                                            ? 'page-link-active'
                                            : 'hover:bg-secondary-bg'
                                    }`}
                                    aria-current={
                                        isCurrent ? 'page' : undefined
                                    }
                                >
                                    {page}
                                </Link>
                            );
                        })}

                        {currentPage < lastPage && (
                            <Link
                                to={getPageUrl(currentPage + 1)}
                                className="page-link text-muted hover:bg-secondary-bg rounded-r-md px-2 py-2.5"
                            >
                                <span className="sr-only">Next</span>
                                <svg
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </Link>
                        )}
                    </nav>
                </div>
            </div>
        </div>
    );
}
