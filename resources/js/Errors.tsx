import { useEffect } from 'react';

function parseStackTrace(stack: string) {
    const lines = stack.split('\n');

    return lines.map((line) => {
        line = line.trim();

        // Format: "FunctionName in URL at line X, column Y"
        const regex1 = /^(.*?) in (.+) at line (\d+), column (\d+)$/;
        const m1 = line.match(regex1);
        if (m1) {
            return {
                functionName: m1[1] || '(anonymous)',
                file: m1[2],
                line: parseInt(m1[3], 10),
                column: parseInt(m1[4], 10),
            };
        }

        // Format: "at FunctionName (file:line:column)"
        const regex2 = /^at (.*?) \((.*):(\d+):(\d+)\)$/;
        const m2 = line.match(regex2);
        if (m2) {
            return {
                functionName: m2[1] || '(anonymous)',
                file: m2[2],
                line: parseInt(m2[3], 10),
                column: parseInt(m2[4], 10),
            };
        }

        // Format: "FunctionName@file:line:column"
        const regex3 = /^(.*?)@(.*):(\d+):(\d+)$/;
        const m3 = line.match(regex3);
        if (m3) {
            return {
                functionName: m3[1] || '(anonymous)',
                file: m3[2],
                line: parseInt(m3[3], 10),
                column: parseInt(m3[4], 10),
            };
        }

        // Fallback: no parse, return raw line as functionName, empty file and NaN for line/col
        return {
            functionName: line,
            file: '',
            line: NaN,
            column: NaN,
        };
    });
}

declare global {
    interface Window {
        __lastError?: Error;
    }
}

export class JsonError extends Error {
    constructor(
        message: string,
        public json: Record<string, any>,
    ) {
        super(message);
        this.name = 'JsonError';
        this.stack = new Error().stack;
    }
}

export function ErrorFallback({
    error,
    resetErrorBoundary,
}: {
    error: Error;
    resetErrorBoundary: () => void;
}) {
    if (import.meta.env.DEV) {
        console.error('🔥 Dev error caught:', error);
    }

    useEffect(() => {
        window.__lastError = error;
    }, [error]);

    const parsedStack = error.stack ? parseStackTrace(error.stack) : [];

    const handleCopyError = () => {
        const details = `Error Message:\n${error.message}\n\nStack Trace:\n${error.stack ?? 'No stack trace available.'}`;
        navigator.clipboard
            .writeText(details)
            .then(() => {
                alert('Error details copied to clipboard!');
            })
            .catch(() => {
                alert('Failed to copy error details.');
            });
    };

    return (
        <div
            role="alert"
            className="border-danger bg-danger-light text-danger dark:border-danger dark:bg-danger-dark dark:text-danger-light relative mx-auto my-10 max-w-3xl rounded-xl border p-6 shadow-xl"
        >
            <h1 className="text-danger dark:text-danger-light mb-4 text-3xl font-bold">
                🚨 Application Error
            </h1>

            <div className="mb-6">
                <p className="text-danger dark:text-danger-light text-sm font-semibold tracking-wide uppercase">
                    Message
                </p>
                <pre className="bg-danger-light text-danger-dark dark:bg-danger-dark dark:text-danger-light rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
                    {error.message}
                </pre>
            </div>

            {error instanceof JsonError && (
                <div className="mb-6">
                    <p className="text-danger dark:text-danger-light text-sm font-semibold tracking-wide uppercase">
                        JSON Error Details
                    </p>
                    <pre className="bg-danger-light text-danger-dark dark:bg-danger-dark dark:text-danger-light rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
                        {JSON.stringify(error.json, null, 2)}
                    </pre>
                </div>
            )}

            {parsedStack.length > 0 && (
                <div className="mb-6">
                    <p className="text-danger dark:text-danger-light text-sm font-semibold tracking-wide uppercase">
                        Parsed Stack Trace
                    </p>
                    <ul className="bg-danger-light text-danger-dark dark:bg-danger-dark dark:text-danger-light mt-2 max-h-64 space-y-1 overflow-auto rounded-md p-4 font-mono text-xs">
                        {parsedStack.map((frame, i) => (
                            <li key={i} className="break-all">
                                <span className="font-semibold">
                                    {frame.functionName}
                                </span>{' '}
                                {frame.file && (
                                    <>
                                        in{' '}
                                        <span className="italic">
                                            {frame.file}
                                        </span>
                                        {!isNaN(frame.line) &&
                                            ` at line ${String(frame.line)}`}
                                        {!isNaN(frame.column) &&
                                            `, column ${String(frame.column)}`}
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {error.stack && (
                <details className="bg-danger-light dark:bg-danger-dark mb-6 rounded-md p-4">
                    <summary className="text-danger dark:text-danger-light cursor-pointer font-semibold">
                        Raw Stack Trace
                    </summary>
                    <pre className="text-danger-dark dark:text-danger-light mt-2 text-xs whitespace-pre-wrap">
                        {error.stack}
                    </pre>
                </details>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                    onClick={handleCopyError}
                    className="bg-danger hover:bg-danger-hover focus:ring-danger dark:bg-danger dark:hover:bg-danger dark:focus:ring-danger-light rounded-md px-4 py-2 text-sm font-semibold text-white shadow focus:ring-2 focus:outline-none"
                >
                    📋 Copy Error Details
                </button>
                <button
                    onClick={resetErrorBoundary}
                    className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:bg-primary-500 dark:hover:bg-primary-600 dark:focus:ring-primary-400"
                >
                    🔁 Try Again
                </button>
            </div>

            <p className="text-danger dark:text-danger-light mt-6 text-xs">
                Still stuck? Try refreshing the page or inspect{' '}
                <code>window.__lastError</code> in devtools.
            </p>
        </div>
    );
}
