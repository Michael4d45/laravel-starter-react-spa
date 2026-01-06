<?php

declare(strict_types=1);

namespace App\Collectors;

use ReflectionClass;
use Spatie\LaravelData\Contracts\BaseData;
use Spatie\TypeScriptTransformer\Collectors\Collector;
use Spatie\TypeScriptTransformer\Structures\TransformedType;

/**
 * @template T of BaseData
 */
class EffectDataTypeScriptCollector extends Collector
{
    /**
     * @param \ReflectionClass<T> $class
     */
    public function getTransformedType(\ReflectionClass $class): null|TransformedType
    {
        if (!$class->isSubclassOf(BaseData::class)) {
            return null;
        }

        $transformer =
            new \App\Transformers\EffectSchemaTransformer($this->config);

        return $transformer->transform($class, $class->getShortName());
    }
}
