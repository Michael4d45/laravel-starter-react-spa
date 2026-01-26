import { useEffect, useRef, useState } from 'react';

// ===== TYPES =====

export interface SearchSelectOption {
    /** Unique identifier for the option */
    value: string;
    /** Display text for the option */
    label: string;
    /** Optional additional data */
    data?: Record<string, unknown>;
}

/**
 * API client interface for dependency injection
 * This allows the component to be decoupled from specific API implementations
 */
export interface SearchSelectApiClient<T = any> {
    /**
     * Search for options based on a query
     * @param query - The search query string
     * @param limit - Maximum number of results to return
     * @returns Promise resolving to array of search results
     */
    searchOptions(query: string, limit?: number): Promise<T[]>;

    /**
     * Get a single option by its ID/value
     * Used for caching and displaying selected values
     * @param id - The unique identifier of the option
     * @returns Promise resolving to the option data or null if not found
     */
    getOptionById(id: string): Promise<T | null>;

    /**
     * Transform API response item to SearchSelectOption
     * @param item - Raw item from API response
     * @returns Transformed SearchSelectOption
     */
    transformToOption(item: T): SearchSelectOption;
}

export type SearchSelectValue = string | string[] | null;

export interface BaseSearchSelectProps {
    /** Unique name for the component (used for accessibility) */
    name: string;
    /** Placeholder text when no value is selected */
    placeholder?: string;
    /** Whether the component is disabled */
    disabled?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Callback fired when selection changes */
    onChange?: (value: SearchSelectValue) => void;
    /** Callback fired when search query changes */
    onSearch?: (query: string) => void;
    /** Maximum number of results to fetch */
    limit?: number;
    /** Debounce delay for API calls (ms) */
    debounceMs?: number;
}

export interface SingleSelectProps extends BaseSearchSelectProps {
    /** Enable multi-select mode */
    multiSelect?: false;
    /** Current selected value */
    value?: string | null;
    /** Default selected value (uncontrolled) */
    defaultValue?: string | null;
    /** Static array of options (optional for API mode) */
    options?: SearchSelectOption[];
    /** API client for fetching options (optional for static mode) */
    apiClient?: SearchSelectApiClient;
}

export interface MultiSelectProps extends BaseSearchSelectProps {
    /** Enable multi-select mode */
    multiSelect: true;
    /** Current selected values */
    value?: string[];
    /** Default selected values (uncontrolled) */
    defaultValue?: string[];
    /** Static array of options (optional for API mode) */
    options?: SearchSelectOption[];
    /** API client for fetching options (optional for static mode) */
    apiClient?: SearchSelectApiClient;
}

export type SearchSelectProps = SingleSelectProps | MultiSelectProps;

// ===== UTILITY FUNCTIONS =====

/**
 * Debounce hook for API calls
 */
function useDebounce<T extends (...args: any[]) => any>(
    callback: T,
    delay: number,
): T {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const callbackRef = useRef<T>(callback);

    // Update callback ref when callback changes
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return ((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(
            () => callbackRef.current(...args),
            delay,
        );
    }) as T;
}

/**
 * Hook for managing API data fetching with caching
 */
function useApiData(
    apiClient: SearchSelectApiClient | undefined,
    limit: number,
    debounceMs: number,
) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchSelectOption[]>(
        [],
    );
    const [selectedItemsCache, setSelectedItemsCache] = useState<
        Map<string, SearchSelectOption>
    >(new Map());

    const searchFunction = async (query: string) => {
        if (!apiClient || !query.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        try {
            setIsSearching(true);
            const rawResults = await apiClient.searchOptions(
                query.trim(),
                limit,
            );
            const options = rawResults.map((item) =>
                apiClient.transformToOption(item),
            );
            setSearchResults(options);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const debouncedSearch = useDebounce(searchFunction, debounceMs);

    const loadSelectedItem = async (value: string) => {
        if (!apiClient || selectedItemsCache.has(value)) return;

        try {
            const item = await apiClient.getOptionById(value);
            if (item) {
                const option = apiClient.transformToOption(item);
                setSelectedItemsCache((prev) =>
                    new Map(prev).set(value, option),
                );
            }
        } catch (error) {
            console.error('Error loading selected item:', error);
        }
    };

    useEffect(() => {
        debouncedSearch(searchQuery);
    }, [searchQuery, debouncedSearch]);

    return {
        searchQuery,
        setSearchQuery,
        isSearching,
        searchResults,
        selectedItemsCache,
        loadSelectedItem,
    };
}

/**
 * Get available options based on data source
 */
function getAvailableOptions(
    options: SearchSelectOption[] | undefined,
    searchResults: SearchSelectOption[],
    searchQuery: string,
): SearchSelectOption[] {
    if (options) {
        // Static options - filter by search query
        return searchQuery
            ? options.filter((opt) =>
                  opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
              )
            : options;
    }
    // API options - use search results
    return searchResults;
}

// ===== MAIN COMPONENT =====

export default function SearchSelect(props: SearchSelectProps) {
    // Extract the discriminant property first (it's safe to access)
    const multiSelect = props.multiSelect ?? false;

    // Now we can safely destructure based on the discriminant
    const {
        name,
        placeholder = 'Search...',
        disabled = false,
        className = '',
        onChange,
        onSearch,
        options,
        apiClient,
        limit = 20,
        debounceMs = 300,
        value: controlledValue,
        defaultValue,
    } = props;

    // ===== STATE =====

    // Uncontrolled state management
    const [internalValue, setInternalValue] = useState<SearchSelectValue>(
        () => defaultValue ?? (multiSelect ? [] : null),
    );

    // Use controlled value if provided, otherwise use internal state
    const currentValue =
        controlledValue !== undefined ? controlledValue : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    // ===== REFS =====

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // ===== API DATA MANAGEMENT =====

    const {
        searchQuery,
        setSearchQuery,
        isSearching,
        searchResults,
        selectedItemsCache,
        loadSelectedItem,
    } = useApiData(apiClient, limit, debounceMs);

    // ===== COMPUTED VALUES =====

    const availableOptions = getAvailableOptions(
        options,
        searchResults,
        searchQuery,
    );

    const selectedOptions = (() => {
        if (!currentValue) return [];

        const values = Array.isArray(currentValue)
            ? currentValue
            : [currentValue];
        return values
            .map((val) => {
                // Check static options first
                if (options) {
                    return options.find(
                        (opt: SearchSelectOption) => opt.value === val,
                    );
                }
                // Check cache for API options
                return selectedItemsCache.get(val);
            })
            .filter(Boolean) as SearchSelectOption[];
    })();

    const displayText = (() => {
        if (selectedOptions.length === 0) return '';

        if (multiSelect) {
            if (selectedOptions.length === 1) {
                return selectedOptions[0].label;
            }
            return `${selectedOptions.length} selected`;
        }

        return selectedOptions[0]?.label || '';
    })();

    // ===== EFFECTS =====

    // Load selected items for API mode
    useEffect(() => {
        if (apiClient && currentValue) {
            const values = Array.isArray(currentValue)
                ? currentValue
                : [currentValue];
            values.forEach((val) => {
                if (val && !selectedItemsCache.has(val)) {
                    loadSelectedItem(val);
                }
            });
        }
    }, [apiClient, currentValue, selectedItemsCache, loadSelectedItem]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () =>
                document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Scroll highlighted option into view
    useEffect(() => {
        if (isOpen && highlightedIndex >= 0 && listRef.current) {
            const optionElement = listRef.current.children[
                highlightedIndex
            ] as HTMLElement;
            if (optionElement) {
                optionElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen]);

    // ===== EVENT HANDLERS =====

    const handleValueChange = (newValue: SearchSelectValue) => {
        if (controlledValue === undefined) {
            setInternalValue(newValue);
        }
        onChange?.(newValue);
    };

    const handleSelect = (option: SearchSelectOption) => {
        if (multiSelect) {
            const currentValues = (currentValue as string[]) || [];
            const isSelected = currentValues.includes(option.value);

            const newValues = isSelected
                ? currentValues.filter((v) => v !== option.value)
                : [...currentValues, option.value];

            handleValueChange(newValues);
        } else {
            handleValueChange(option.value);
            setIsOpen(false);
        }

        setSearchQuery('');
        setHighlightedIndex(-1);
    };

    const clearSelection = () => {
        handleValueChange(multiSelect ? [] : null);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        clearSelection();
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        onSearch?.(query);

        if (!isOpen) setIsOpen(true);
        setHighlightedIndex(0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                    setHighlightedIndex(0);
                } else {
                    setHighlightedIndex((prev) =>
                        prev < availableOptions.length - 1 ? prev + 1 : prev,
                    );
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                    setHighlightedIndex(availableOptions.length - 1);
                } else {
                    setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                }
                break;

            case 'Enter':
                e.preventDefault();
                if (
                    isOpen &&
                    highlightedIndex >= 0 &&
                    availableOptions[highlightedIndex]
                ) {
                    handleSelect(availableOptions[highlightedIndex]);
                }
                break;

            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                setSearchQuery('');
                break;

            case 'Backspace':
                if (!searchQuery && selectedOptions.length > 0) {
                    clearSelection();
                }
                break;
        }
    };

    const handleToggle = () => {
        if (disabled) return;

        setIsOpen((prev) => !prev);
        if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    };

    // ===== RENDER =====

    const showClearButton = selectedOptions.length > 0 && !disabled;
    const showPlaceholder = selectedOptions.length === 0 && !isSearching;

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            {/* Hidden input for form submission */}
            {multiSelect ? (
                (currentValue as string[] | undefined)?.map((val) => (
                    <input
                        key={val}
                        type="hidden"
                        name={`${name}[]`}
                        value={val}
                    />
                ))
            ) : (
                <input
                    type="hidden"
                    name={name}
                    value={(currentValue as string) || ''}
                />
            )}

            {/* Trigger button */}
            <div
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={`${name}-listbox`}
                aria-label={name}
                className={`border-border relative flex w-full cursor-text items-center justify-between rounded-md border px-3 py-2 text-left shadow-sm ${disabled ? 'bg-muted cursor-not-allowed' : 'bg-background hover:border-accent'} ${isOpen ? 'ring-ring border-ring ring-2' : ''} focus:ring-ring focus:border-ring focus:ring-2 focus:outline-none`}
                onClick={handleToggle}
                onKeyDown={handleKeyDown}
                tabIndex={disabled ? -1 : 0}
            >
                <div className="flex min-w-0 flex-1 items-center">
                    {showPlaceholder && (
                        <span className="text-muted-foreground truncate">
                            {placeholder}
                        </span>
                    )}

                    {selectedOptions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                            {multiSelect ? (
                                selectedOptions.map((option) => (
                                    <span
                                        key={option.value}
                                        className="bg-accent text-accent-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm"
                                    >
                                        {option.label}
                                        <button
                                            type="button"
                                            className="hover:bg-accent-foreground hover:text-accent ml-1 rounded-full p-0.5"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelect(option); // This will deselect it
                                            }}
                                            aria-label={`Remove ${option.label}`}
                                        >
                                            <svg
                                                className="h-3 w-3"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </button>
                                    </span>
                                ))
                            ) : (
                                <span className="truncate">{displayText}</span>
                            )}
                        </div>
                    )}

                    {isSearching && (
                        <span className="text-muted-foreground ml-2">
                            Searching...
                        </span>
                    )}
                </div>

                <div className="ml-2 flex items-center gap-2">
                    {showClearButton && (
                        <button
                            type="button"
                            className="hover:bg-accent rounded p-1"
                            onClick={handleClear}
                            aria-label="Clear selection"
                        >
                            <svg
                                className="text-muted-foreground h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    )}

                    <svg
                        className={`text-muted-foreground h-5 w-5 transition-transform ${isOpen ? 'rotate-180 transform' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="bg-popover border-border absolute z-50 mt-1 w-full rounded-md border shadow-lg">
                    {/* Search input */}
                    <div className="border-border border-b p-2">
                        <input
                            ref={inputRef}
                            type="text"
                            className="border-border bg-popover focus:ring-ring focus:border-ring w-full rounded border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    {/* Options list */}
                    <ul
                        id={`${name}-listbox`}
                        ref={listRef}
                        role="listbox"
                        aria-multiselectable={multiSelect}
                        className="max-h-60 overflow-auto py-1"
                    >
                        {availableOptions.length === 0 && !isSearching && (
                            <li className="text-muted-foreground px-3 py-2 text-sm">
                                {searchQuery
                                    ? 'No results found'
                                    : 'No options available'}
                            </li>
                        )}

                        {availableOptions.map((option, index) => {
                            const isSelected = multiSelect
                                ? (
                                      currentValue as string[] | undefined
                                  )?.includes(option.value)
                                : currentValue === option.value;

                            const isHighlighted = index === highlightedIndex;

                            return (
                                <li
                                    key={option.value}
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`cursor-pointer px-3 py-2 text-sm ${isHighlighted ? 'bg-accent' : 'hover:bg-accent'} ${isSelected ? 'bg-accent text-accent-foreground font-medium' : ''} `}
                                    onClick={() => handleSelect(option)}
                                    onMouseEnter={() =>
                                        setHighlightedIndex(index)
                                    }
                                >
                                    {multiSelect && (
                                        <span
                                            className={`mr-2 inline-block h-4 w-4 rounded border ${
                                                isSelected
                                                    ? 'bg-primary border-primary'
                                                    : 'border-border'
                                            }`}
                                        >
                                            {isSelected && (
                                                <svg
                                                    className="text-primary-foreground h-4 w-4"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            )}
                                        </span>
                                    )}
                                    {option.label}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
