<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Http\Request;

class LoggingHelper
{
    private const MASK_VALUE = '***';

    /**
     * Check if the current route should be ignored based on configured patterns.
     */
    public static function shouldIgnoreRoute(Request $request): bool
    {
        $ignoreRoutes = config()->array('logging.ignore_routes', []);

        $path = $request->path();

        foreach ($ignoreRoutes as $pattern) {
            if (!is_string($pattern)) {
                continue;
            }

            // Handle wildcard patterns
            if (str_contains($pattern, '*')) {
                $regex = str_replace(['.', '*'], ['\.', '.*'], $pattern);
                // Convert [ext1|ext2|ext3] to (ext1|ext2|ext3) for proper regex grouping
                $regex = preg_replace('/\[([^\]]+)\]/', '($1)', $regex);
                if (preg_match('#^' . $regex . '$#', $path)) {
                    return true;
                }
            } elseif ($path === $pattern) {
                // Exact match for non-wildcard patterns
                return true;
            }
        }

        return false;
    }

    /**
     * Mask sensitive data in an array or object recursively.
     */
    public static function maskSensitiveData(mixed $data): mixed
    {
        if (!is_array($data) && !is_object($data)) {
            return $data;
        }

        $maskedFields = config()->array('logging.masked_fields', []);
        $dataArray = is_object($data) ? (array) $data : $data;

        foreach ($dataArray as $key => $value) {
            // Check if this key should be masked (convert key to string for comparison)
            if (self::shouldMaskField((string) $key, $maskedFields)) {
                $dataArray[$key] = self::MASK_VALUE;
            } elseif (is_array($value) || is_object($value)) {
                $dataArray[$key] = self::maskSensitiveData($value);
            }
        }

        return is_object($data) ? (object) $dataArray : $dataArray;
    }

    /**
     * Mask sensitive headers in a headers array.
     */
    /**
     * @param array<string, list<string|null>> $headers
     * @return array<string, list<string|null>>
     */
    public static function maskHeaders(array $headers): array
    {
        $maskedHeaders = config()->array('logging.masked_headers', []);
        $maskedHeaders = array_map('strtolower', array_filter($maskedHeaders, 'is_string'));

        $masked = [];
        foreach ($headers as $name => $values) {
            $lowerName = strtolower($name);
            if (in_array($lowerName, $maskedHeaders, true)) {
                $masked[$name] = [self::MASK_VALUE];
            } else {
                $masked[$name] = $values;
            }
        }

        return $masked;
    }

    /**
     * Check if a field should be masked based on the configured patterns.
     *
     * @param array<array-key, mixed> $maskedFields
     */
    private static function shouldMaskField(string $field, array $maskedFields): bool
    {
        $field = strtolower($field);

        foreach ($maskedFields as $pattern) {
            if (!is_string($pattern)) {
                continue;
            }
            $pattern = strtolower($pattern);

            // Support dot notation for nested fields
            if (str_contains($pattern, '.')) {
                if (str_starts_with($field, $pattern . '.') || $field === $pattern) {
                    return true;
                }
            } elseif ($field === $pattern) {
                return true;
            }

            // Support wildcard patterns
            if (str_contains($pattern, '*')) {
                $regex = str_replace(['.', '*'], ['\.', '.*'], $pattern);
                if (preg_match('#^' . $regex . '$#', $field)) {
                    return true;
                }
            }
        }

        return false;
    }
}
