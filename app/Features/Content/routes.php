<?php

declare(strict_types=1);

use App\Features\Content\Actions\ShowContent;
use Illuminate\Support\Facades\Route;

Route::get('content', ShowContent::class);
