import { Data, Effect, Schedule } from 'effect';

// Common error types
export class TimeoutError extends Data.TaggedError('TimeoutError')<{
    message: string;
}> {}

export class RetryError extends Data.TaggedError('RetryError')<{
    message: string;
    attempts: number;
}> {}

/**
 * Add timeout to an Effect
 */
export const withTimeout = <A, E>(effect: Effect.Effect<A, E>, timeoutMs: number) =>
    Effect.race(effect, Effect.delay(Effect.fail(new TimeoutError({ message: `Operation timed out after ${timeoutMs}ms` })), timeoutMs));

/**
 * Add retry logic to an Effect with exponential backoff
 */
export const withRetry = <A, E>(
    effect: Effect.Effect<A, E>,
    options: {
        maxAttempts?: number;
        initialDelay?: number;
        maxDelay?: number;
    } = {},
) => {
    const { maxAttempts = 3, initialDelay = 1000, maxDelay = 30000 } = options;

    const retrySchedule = Schedule.exponential(initialDelay, 2).pipe(
        Schedule.upTo(maxDelay),
        Schedule.union(Schedule.spaced(initialDelay)),
        Schedule.whileInput((error) => {
            // Don't retry certain types of errors
            return !(error instanceof TimeoutError);
        }),
    );

    return Effect.retry(effect, retrySchedule);
};

/**
 * Add both timeout and retry to an Effect
 */
export const withTimeoutAndRetry = <A, E>(effect: Effect.Effect<A, E>, timeoutMs: number, retryOptions?: Parameters<typeof withRetry>[1]) =>
    withRetry(withTimeout(effect, timeoutMs), retryOptions);

/**
 * Convert an Effect result to a Promise for use in React hooks
 */
export const effectToPromise = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

/**
 * Handle Effect errors and convert to a standard format
 */
export const handleEffectError = (error: unknown): { message: string; code?: string; details?: any } => {
    if (error instanceof Error) {
        return {
            message: error.message,
            code: error.name,
            details: error,
        };
    }

    if (typeof error === 'object' && error !== null) {
        const err = error as any;
        return {
            message: err.message || 'An error occurred',
            code: err._tag || err.code,
            details: error,
        };
    }

    return {
        message: String(error),
        details: error,
    };
};

/**
 * Create a loading state wrapper for Effects
 */
export const withLoadingState = <A, E>(effect: Effect.Effect<A, E>) =>
    Effect.gen(function* () {
        // You could add loading state management here
        // For now, just run the effect
        const result = yield* effect;
        return result;
    });

/**
 * Create an Effect that caches results
 */
export const withCache = <A>(
    key: string,
    effect: Effect.Effect<A, any>,
    ttlMs: number = 5 * 60 * 1000, // 5 minutes default
) =>
    Effect.gen(function* () {
        const cached = localStorage.getItem(`effect_cache_${key}`);
        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < ttlMs) {
                    return data as A;
                }
            } catch {
                // Invalid cache, continue
            }
        }

        const result = yield* effect;

        localStorage.setItem(
            `effect_cache_${key}`,
            JSON.stringify({
                data: result,
                timestamp: Date.now(),
            }),
        );

        return result;
    });

/**
 * Create an Effect that debounces execution
 */
export const withDebounce = <A, E>(effect: Effect.Effect<A, E>, delayMs: number) =>
    Effect.gen(function* () {
        yield* Effect.delay(effect, delayMs);
        return yield* effect;
    });

/**
 * Utility to run multiple effects in parallel
 */
export const parallel = <const Effects extends readonly Effect.Effect<any, any>[]>(effects: Effects) => Effect.all(effects);

/**
 * Utility to run multiple effects sequentially
 */
export const sequential = <const Effects extends readonly Effect.Effect<any, any>[]>(effects: Effects) => Effect.all(effects, { concurrency: 1 });
