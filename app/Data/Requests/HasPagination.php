<?php

declare(strict_types=1);

namespace App\Data\Requests;

use App\Enums\SortDirection;
use Illuminate\Contracts\Database\Query\Builder;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Enumerable;
use Illuminate\Support\Facades\Cache;
use Spatie\LaravelData\Data;

/**
 * @mixin Data
 */
trait HasPagination
{
    public null|int $per_page = 15;
    /** @var null|list<string> */
    public null|array $columns = ['*'];
    public null|string $page_name = 'page';
    public null|int $page = null;

    /** @var null|list<\App\Enums\SortDirection> */
    public null|array $sort_directions = null;
    /** @var null|list<string> */
    public null|array $sort_by = null;

    /**
     * @template T of Data
     *
     * @param  class-string<T>  $dataClass
     * @return AbstractPaginator<array-key,T>|Enumerable<array-key,T>
     */
    public function applyPagination(
        Builder $query,
        string $dataClass,
        int $cacheTtlSeconds = 60,
    ): AbstractPaginator|Enumerable {
        // Apply sorting if provided
        if ($this->sort_by) {
            foreach ($this->sort_by as $index => $field) {
                $direction = (
                    $this->sort_directions[$index] ?? SortDirection::Asc
                )->value;
                $query->orderBy($field, $direction);
            }
        }

        // Determine current page & per page
        $page = $this->page ?? 1;
        $perPage = $this->per_page ?? 15;

        $filters = $this->except(
            'page',
            'per_page',
            'columns',
            'page_name',
            'sort_directions',
            'sort_by',
        )->toArray();

        // Generate a simple hash key for caching
        $cacheKey =
            'pagination_total_'
            . md5(json_encode($filters) ?: throw new \RuntimeException);

        // Get total from cache or compute
        $total = (int) Cache::remember(
            $cacheKey,
            $cacheTtlSeconds,
            fn() => $query->count(),
        );

        // Slice the query for the current page
        $results = $query->forPage($page, $perPage)->get(
            $this->columns ?? ['*'],
        );

        // Wrap results in LengthAwarePaginator
        $paginator = new LengthAwarePaginator(
            $dataClass::collect($results),
            $total,
            $perPage,
            $page,
            [
                'path' => request()->url(),
                'pageName' => $this->page_name ?? 'page',
            ],
        );

        return $dataClass::collect($paginator);
    }
}
