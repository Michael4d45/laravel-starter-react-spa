<?php

declare(strict_types=1);

namespace App\Transformers;

use Spatie\LaravelData\Contracts\BaseData;
use Spatie\TypeScriptTransformer\Structures\TransformedType;
use Spatie\TypeScriptTransformer\Transformers\DtoTransformer;

/**
 * Transforms Laravel Data classes to Effect Schema definitions.
 *
 * Following Effect Schema docs for recursive schemas:
 * 1. Interface defined BEFORE schema (deferred type resolution)
 * 2. S.suspend with explicit type annotation for circular refs
 * 3. For schemas with transformations (DateFromString), both Type and Encoded interfaces
 *
 * @see https://effect.website/docs/schema/basic-usage/#recursive-schemas
 *
 * @template T of BaseData
 */
class EffectSchemaTransformer extends DtoTransformer
{
    /** @var array<string, bool> Track generated enums to avoid duplicates */
    private static array $generatedEnums = [];

    /**
     * @param \ReflectionClass<T> $class
     */
    public function canTransform(\ReflectionClass $class): bool
    {
        return $class->isSubclassOf(\Spatie\LaravelData\Data::class);
    }

    /**
     * @param \ReflectionClass<T> $class
     */
    public function transform(
        \ReflectionClass $class,
        string $name,
    ): null|TransformedType {
        if (!$this->canTransform($class)) {
            return null;
        }

        $typeName = $class->getShortName();
        $schemaName = $typeName . 'Schema';
        $encodedName = $typeName . 'Encoded';

        /** @var array<\ReflectionProperty> $properties */
        $properties = $this->resolveProperties($class);

        // Collect enum schemas needed for this class
        $enumSchemas = $this->collectEnumSchemas($properties);

        // Generate interface properties (Type - decoded values, e.g., Date)
        $typeInterfaceBody = collect($properties)->map(
            fn(mixed $property) => $this->transformPropertyToInterface(
                $property,
                false,
            ),
        )->implode("\n");

        // Generate encoded interface properties (Encoded - wire format, e.g., string)
        $encodedInterfaceBody = collect($properties)->map(
            fn(mixed $property) => $this->transformPropertyToInterface(
                $property,
                true,
            ),
        )->implode("\n");

        // Generate schema properties
        $schemaBody = collect($properties)->map(
            fn(mixed $property) => $this->transformPropertyToSchema($property),
        )->implode(",\n");

        $typescript = '';
        if ($enumSchemas !== []) {
            $typescript .= implode("\n\n", $enumSchemas) . "\n\n";
        }

        // Always generate both Type and Encoded interfaces for consistency
        // (most schemas have DateFromString which requires different Encoded/Type)
        $typescript .= <<<TS
        export interface {$typeName} {
        {$typeInterfaceBody}
        }

        export interface {$encodedName} {
        {$encodedInterfaceBody}
        }

        export const {$schemaName} = S.Struct({
        {$schemaBody}
        });
        TS;

        return TransformedType::create(
            $class,
            $name,
            $typescript,
            new \Spatie\TypeScriptTransformer\Structures\MissingSymbolsCollection,
            keyword: '',
            trailingSemicolon: false,
        );
    }

    /**
     * Transform a property to TypeScript interface property.
     *
     * @param bool $encoded If true, generate Encoded type (wire format), else Type (decoded)
     */
    protected function transformPropertyToInterface(
        \ReflectionProperty $property,
        bool $encoded,
    ): string {
        $name = $property->getName();
        $type = $property->getType();
        $docComment = $property->getDocComment() ?: '';

        $tsType = 'unknown';
        $isNullable = $type?->allowsNull() ?? false;
        $isOptional = $type && str_contains($type->__toString(), 'Optional');

        if ($type) {
            $typeString = $type->__toString();
            $cleanType = ltrim($typeString, '?');

            if (
                str_contains($cleanType, 'Carbon')
                || str_contains($cleanType, 'DateTime')
            ) {
                // DateFromString: Encoded = string, Type = Date
                $tsType = $encoded ? 'string' : 'Date';
            } elseif (str_contains($cleanType, 'LengthAwarePaginator')) {
                // LengthAwarePaginator<T> becomes readonly T[] in TypeScript
                // (Laravel serializes it to the data array)
                $itemType = $this->getPaginatorItemType($property, $docComment);
                $tsType = $encoded
                    ? "LengthAwarePaginator<{$itemType}Encoded>"
                    : "LengthAwarePaginator<{$itemType}>";
            } elseif (
                str_contains($cleanType, '\\')
                || str_contains($cleanType, 'Collection')
                || str_contains($cleanType, 'Optional')
            ) {
                if (str_contains($cleanType, 'Collection')) {
                    $itemType = $this->getCollectionItemType(
                        $property,
                        $docComment,
                    );
                    // For Encoded, reference the Encoded interface if it exists
                    $refType = $encoded ? $itemType . 'Encoded' : $itemType;
                    $tsType = "readonly {$refType}[]";
                } else {
                    $targetType = $this->extractDataType($cleanType);
                    try {
                        /** @var class-string $targetType */
                        $reflectionClass = new \ReflectionClass($targetType);
                        if ($reflectionClass->isEnum()) {
                            $tsType = $reflectionClass->getShortName();
                        } elseif ($reflectionClass->isSubclassOf(\Spatie\LaravelData\Data::class)) {
                            $shortName = $reflectionClass->getShortName();
                            // For Encoded, reference the Encoded interface if it exists
                            $tsType = $encoded
                                ? $shortName . 'Encoded'
                                : $shortName;
                        }
                    } catch (\ReflectionException $e) {
                        $tsType = 'unknown';
                    }
                }
            } else {
                $tsType = match ($cleanType) {
                    'string' => 'string',
                    'int' => 'number',
                    'float' => 'number',
                    'bool' => 'boolean',
                    'array' => 'unknown',
                    'mixed' => 'unknown',
                    default => 'unknown',
                };
            }
        }

        $optionalMark = $isOptional ? '?' : '';
        $nullSuffix = $isNullable ? ' | null' : '';
        return "  readonly {$name}{$optionalMark}: {$tsType}{$nullSuffix};";
    }

    /**
     * Transform a property to Effect Schema property.
     */
    protected function transformPropertyToSchema(\ReflectionProperty $property): string
    {
        $name = $property->getName();
        $type = $property->getType();
        $docComment = $property->getDocComment() ?: '';

        $schemaType = 'S.Unknown';
        $isNullable = $type?->allowsNull() ?? false;
        $isOptional = $type && str_contains($type->__toString(), 'Optional');

        if ($type) {
            $typeString = $type->__toString();
            $cleanType = ltrim($typeString, '?');

            if (
                str_contains($cleanType, 'Carbon')
                || str_contains($cleanType, 'DateTime')
            ) {
                $schemaType = 'S.DateFromString';
            } elseif (str_contains($cleanType, 'LengthAwarePaginator')) {
                // LengthAwarePaginator<T> becomes S.Array(TSchema)
                $itemType = $this->getPaginatorItemType($property, $docComment);
                $schemaType = "LengthAwarePaginatorSchema({$itemType}Schema)";
            } elseif (
                str_contains($cleanType, '\\')
                || str_contains($cleanType, 'Collection')
                || str_contains($cleanType, 'Optional')
            ) {
                if (str_contains($cleanType, 'Collection')) {
                    $itemType = $this->getCollectionItemType(
                        $property,
                        $docComment,
                    );
                    // Use S.suspend with explicit type annotation for recursive refs
                    $schemaType = "S.Array(S.suspend((): S.Schema<{$itemType}, {$itemType}Encoded> => {$itemType}Schema))";
                } else {
                    $targetType = $this->extractDataType($cleanType);
                    try {
                        /** @var class-string $targetType */
                        $reflectionClass = new \ReflectionClass($targetType);
                        if ($reflectionClass->isEnum()) {
                            // Enums don't need suspend - no circular deps
                            $schemaType =
                                $reflectionClass->getShortName() . 'Schema';
                        } elseif ($reflectionClass->isSubclassOf(\Spatie\LaravelData\Data::class)) {
                            // Use S.suspend with explicit type annotation for recursive refs
                            $shortName = $reflectionClass->getShortName();
                            $schemaType = "S.suspend((): S.Schema<{$shortName}, {$shortName}Encoded> => {$shortName}Schema)";
                        }
                    } catch (\ReflectionException $e) {
                        $schemaType = 'S.Unknown';
                    }
                }
            } else {
                $schemaType = match ($cleanType) {
                    'string' => 'S.String',
                    'int' => 'S.Number',
                    'float' => 'S.Number',
                    'bool' => 'S.Boolean',
                    'array' => 'S.Unknown',
                    'mixed' => 'S.Unknown',
                    default => 'S.Unknown',
                };
            }
        }

        if ($isNullable) {
            $schemaType = "S.NullOr({$schemaType})";
        }

        if ($isOptional) {
            $schemaType = "S.optional({$schemaType})";
        }

        return "  {$name}: {$schemaType}";
    }

    /**
     * Extract the item type from a Collection property.
     */
    private function getCollectionItemType(
        \ReflectionProperty $property,
        string $docComment,
    ): string {
        if (preg_match(
            '/Collection<[^,]+,\s*([^>]+)>/',
            $docComment,
            $matches,
        )) {
            $itemType = trim($matches[1]);
            return basename(str_replace('\\', '/', $itemType));
        }

        $singularName = $this->singularize($property->getName());
        return ucfirst($this->camelCase($singularName)) . 'Data';
    }

    /**
     * Extract the item type from a LengthAwarePaginator property.
     */
    private function getPaginatorItemType(
        \ReflectionProperty $property,
        string $docComment,
    ): string {
        // Match LengthAwarePaginator<int, TypeName> pattern
        if (preg_match(
            '/LengthAwarePaginator<[^,]+,\s*([^>]+)>/',
            $docComment,
            $matches,
        )) {
            $itemType = trim($matches[1]);
            return basename(str_replace('\\', '/', $itemType));
        }

        // Fallback: infer from property name (remove 's' and add 'Data')
        $singularName = $this->singularize($property->getName());
        return ucfirst($this->camelCase($singularName)) . 'Data';
    }

    /**
     * Extract the Data class type from a union type string.
     */
    private function extractDataType(string $typeString): string
    {
        if (!str_contains($typeString, '|')) {
            return $typeString;
        }

        $parts = explode('|', $typeString);
        foreach ($parts as $part) {
            $part = trim($part);
            if (
                $part !== 'Optional'
                && !str_ends_with($part, '\\Optional')
                && $part !== 'LengthAwarePaginator'
                && !str_contains($part, 'LengthAwarePaginator')
                && $part !== 'null'
            ) {
                return $part;
            }
        }

        return $typeString;
    }

    private function camelCase(string $string): string
    {
        return str_replace(
            ' ',
            '',
            ucwords(str_replace(['_', '-'], ' ', $string)),
        );
    }

    /**
     * Collect enum schemas from properties.
     *
     * @param array<\ReflectionProperty> $properties
     * @return array<string>
     */
    private function collectEnumSchemas(array $properties): array
    {
        $enumSchemas = [];

        foreach ($properties as $property) {
            $type = $property->getType();
            if ($type) {
                $typeString = $type->__toString();
                $cleanType = ltrim($typeString, '?');
                $cleanType = $this->extractDataType($cleanType);

                if (str_contains($cleanType, '\\')) {
                    try {
                        /** @var class-string $cleanType */
                        $reflectionClass = new \ReflectionClass($cleanType);
                        if (
                            $reflectionClass->isEnum()
                            && !isset(self::$generatedEnums[$cleanType])
                        ) {
                            self::$generatedEnums[$cleanType] = true;
                            $enumSchemas[] =
                                $this->generateEnumSchema($reflectionClass);
                        }
                    } catch (\ReflectionException $e) {
                        // Ignore reflection errors
                    }
                }
            }
        }

        return $enumSchemas;
    }

    /**
     * Generate an Effect Schema for a PHP enum.
     *
     * @phpstan-ignore missingType.generics
     */
    private function generateEnumSchema(\ReflectionClass $enum): string
    {
        $enumName = $enum->getShortName();
        $schemaName = $enumName . 'Schema';

        /** @var class-string $enumClassName */
        $enumClassName = $enum->getName();
        /** @phpstan-ignore argument.type */
        $reflectionEnum = new \ReflectionEnum($enumClassName);

        $cases = $reflectionEnum->getCases();
        $literals = [];
        $typeValues = [];

        foreach ($cases as $case) {
            if (method_exists($case, 'getBackingValue')) {
                try {
                    /** @var \ReflectionEnumBackedCase $case */
                    $value = $case->getBackingValue();
                    if (is_string($value)) {
                        $escapedValue = addslashes($value);
                        $literals[] = "S.Literal(\"{$escapedValue}\")";
                        $typeValues[] = "\"{$escapedValue}\"";
                    } elseif (is_int($value)) {
                        $literals[] = "S.Literal({$value})";
                        $typeValues[] = (string) $value;
                    }
                } catch (\Throwable $e) {
                    $caseName = $case->getName();
                    $literals[] = "S.Literal(\"{$caseName}\")";
                    $typeValues[] = "\"{$caseName}\"";
                }
            } else {
                $caseName = $case->getName();
                $literals[] = "S.Literal(\"{$caseName}\")";
                $typeValues[] = "\"{$caseName}\"";
            }
        }

        if ($literals === []) {
            $union = 'S.String';
            $typeUnion = 'string';
        } elseif (count($literals) === 1) {
            $union = $literals[0];
            $typeUnion = $typeValues[0];
        } else {
            $union = 'S.Union(' . implode(', ', $literals) . ')';
            $typeUnion = implode(' | ', $typeValues);
        }

        return <<<TS
        export type {$enumName} = {$typeUnion};

        export const {$schemaName} = {$union};
        TS;
    }

    private function singularize(string $word): string
    {
        if (str_ends_with($word, 'ies')) {
            return substr($word, 0, -3) . 'y';
        }
        if (str_ends_with($word, 's') && !str_ends_with($word, 'ss')) {
            return substr($word, 0, -1);
        }
        return $word;
    }
}
