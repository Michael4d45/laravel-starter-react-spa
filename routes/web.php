<?php

use Illuminate\Support\Facades\Route;

// Catch-all route to serve the React SPA
// React Router handles client-side routing for all paths
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*')->name('home');
