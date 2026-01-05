import { Effect, Runtime } from 'effect';

/**
 * The main Effect runtime for the application.
 * This runtime handles all Effect operations and provides the execution context.
 */
export const runtime = Runtime.defaultRuntime;

/**
 * Run an Effect synchronously and return the result or throw an error.
 * This is a convenience function for running effects in React components.
 */
export const runEffectSync = Runtime.runSync;

/**
 * Run an Effect asynchronously and return a Promise.
 * This is useful for async operations in React hooks.
 */
export const runEffectPromise = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

/**
 * Run an Effect synchronously, returning an Exit for error handling.
 * This allows you to handle both success and failure cases explicitly.
 */
export const runEffectExit = Runtime.runSyncExit;

/**
 * Run an Effect and return the result or throw an error.
 * This is a convenience function for running effects in React components.
 */
export const runEffect = runEffectSync;
