<?php

declare(strict_types=1);

test('that true is true', function () {
    expect(filter_var('1', FILTER_VALIDATE_BOOLEAN))->toBeTrue();
});
