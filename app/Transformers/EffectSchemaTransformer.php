<?php

declare(strict_types=1);

namespace App\Transformers;

use Spatie\LaravelData\Contracts\BaseData;
use Spatie\TypeScriptTransformer\Transformers\DtoTransformer;

/**
 * @template T of BaseData
 */
class EffectSchemaTransformer extends DtoTransformer
{
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
    ): null|\Spatie\TypeScriptTransformer\Structures\TransformedType {
        if (!$this->canTransform($class)) {
            return null;
        }

        $schemaName = $class->getShortName() . 'Schema';
        $typeName = $class->getShortName();

        $properties = $this->resolveProperties($class);

        // Collect enum schemas needed for this class
        $enumSchemas = $this->collectEnumSchemas($properties);

        $structBody = collect($properties)->map(
            fn(\ReflectionProperty $property) => $this->transformProperty(
                $property,
            ),
        )->implode(",\n");

        $typescript = '';
        if ($enumSchemas !== []) {
            $typescript .= implode("\n\n", $enumSchemas) . "\n\n";
        }

        $typescript .= <<<TS
        export const {$schemaName} = S.Struct({
        {$structBody}
        });

        export type {$typeName} = S.Schema.Type<typeof {$schemaName}>;
        TS;

        return \Spatie\TypeScriptTransformer\Structures\TransformedType::create(
            $class,
            $name,
            $typescript,
            new \Spatie\TypeScriptTransformer\Structures\MissingSymbolsCollection,
            keyword: '',
            trailingSemicolon: false,
        );
    }

    protected function transformProperty(\ReflectionProperty $property): string
    {
        $name = $property->getName();
        $type = $property->getType();
        $declaringClass = $property->getDeclaringClass();

        $baseType = 'S.Unknown';
        if ($type) {
            $typeString = $type->__toString();
            // Remove nullable prefix for base type detection
            $cleanType = ltrim($typeString, '?');

            // Handle Carbon/DateTime types
            if (
                str_contains($cleanType, 'Carbon')
                || str_contains($cleanType, 'DateTime')
            ) {
                $baseType = 'S.DateFromString';
            } elseif (str_contains($cleanType, '\\')) {
                // Handle Collection types
                if (str_contains($cleanType, 'Collection')) {
                    // Special handling for known collection cases
                    $className = $declaringClass->getShortName();
                    $propertyName = $name;

                    // ContentItems.content -> S.Array(ContentDataSchema)
                    if (
                        $className === 'ContentItems'
                        && $propertyName === 'content'
                    ) {
                        $baseType = 'S.Array(ContentDataSchema)';
                    } else {
                        // For other collections, try to infer from property name
                        $singularName = $this->singularize($propertyName);
                        $possibleSchemaName = ucfirst($singularName) . 'Schema';
                        $baseType = "S.Array({$possibleSchemaName})";
                    }
                } else {
                    // Check if it's a reference to another Data class
                    try {
                        /** @var class-string $cleanType */
                        $reflectionClass = new \ReflectionClass($cleanType);
                        if ($reflectionClass->isEnum()) {
                            // Handle PHP enums - reference the enum schema
                            $baseType =
                                $reflectionClass->getShortName() . 'Schema';
                        } elseif ($reflectionClass->isSubclassOf(\Spatie\LaravelData\Data::class)) {
                            $baseType =
                                $reflectionClass->getShortName() . 'Schema';
                        } else {
                            // For other complex objects, treat as unknown
                            $baseType = 'S.Unknown';
                        }
                    } catch (\ReflectionException $e) {
                        $baseType = 'S.Unknown';
                    }
                }
            } else {
                $baseType = match ($cleanType) {
                    'string' => 'S.String',
                    'int' => 'S.Number',
                    'bool' => 'S.Boolean',
                    default => 'S.Unknown',
                };
            }
        }

        $schema = $baseType;
        if ($type?->allowsNull()) {
            $schema = "S.Union({$schema}, S.Null)";
        }

        return "  {$name}: {$schema}";
    }

    /**
     * @param array<\ReflectionProperty> $properties
     * @return array<string>
     */
    private function collectEnumSchemas(array $properties): array
    {
        $enumSchemas = [];
        $processedEnums = [];

        foreach ($properties as $property) {
            $type = $property->getType();
            if ($type) {
                $typeString = $type->__toString();
                $cleanType = ltrim($typeString, '?');

                if (str_contains($cleanType, '\\')) {
                    try {
                        /** @var class-string $cleanType */
                        $reflectionClass = new \ReflectionClass($cleanType);
                        if (
                            $reflectionClass->isEnum()
                            && !in_array($cleanType, $processedEnums, true)
                        ) {
                            $processedEnums[] = $cleanType;

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

    /** @phpstan-ignore missingType.generics */
    private function generateEnumSchema(\ReflectionClass $enum): string
    {
        $enumName = $enum->getShortName();
        $schemaName = $enumName . 'Schema';
        $typeName = $enumName;

        // Create ReflectionEnum from the class name
        /** @var class-string $enumClassName */
        $enumClassName = $enum->getName();
        /** @phpstan-ignore argument.type */
        $reflectionEnum = new \ReflectionEnum($enumClassName);

        $cases = $reflectionEnum->getCases();
        $literals = [];

        foreach ($cases as $case) {
            // Check if this is a backed enum case
            if (method_exists($case, 'getBackingValue')) {
                try {
                    // Try to get backing value for backed enums
                    $value = $case->getBackingValue();
                    if (is_string($value)) {
                        $literals[] = 'S.Literal("' . addslashes($value) . '")';
                    } elseif (is_int($value)) {
                        $literals[] = 'S.Literal(' . $value . ')';
                    }
                } catch (\Throwable $e) {
                    // For pure enums or if backing value fails, use the case name
                    $literals[] = 'S.Literal("' . $case->getName() . '")';
                }
            } else {
                // For pure enums, use the case name
                $literals[] = 'S.Literal("' . $case->getName() . '")';
            }
        }

        if ($literals === []) {
            // Fallback if no literals found
            $union = 'S.String'; // Assume string enum
        } elseif (count($literals) === 1) {
            $union = $literals[0];
        } else {
            $union = 'S.Union(' . implode(', ', $literals) . ')';
        }

        return <<<TS
        export const {$schemaName} = {$union};

        export type {$typeName} = S.Schema.Type<typeof {$schemaName}>;
        TS;
    }

    private function singularize(string $word): string
    {
        // Simple singularization - in production you'd use a proper inflector
        if (str_ends_with($word, 'ies')) {
            return substr($word, 0, -3) . 'y';
        }
        if (str_ends_with($word, 's') && !str_ends_with($word, 'ss')) {
            return substr($word, 0, -1);
        }
        return $word;
    }
}
