<?php

// Simple test to check if the API is working
$url = 'http://127.0.0.1:8000/api/notes';

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => 'Accept: application/json\r\n',
        'timeout' => 10
    ]
]);

$response = @file_get_contents($url, false, $context);

if ($response !== false) {
    echo "API Response: " . $response . "\n";
    echo "Success! API is working.\n";
} else {
    echo "Failed to connect to API.\n";
    $error = error_get_last();
    if ($error) {
        echo "Error: " . $error['message'] . "\n";
    }
}