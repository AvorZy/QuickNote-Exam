<?php

$url = 'http://127.0.0.1:8000/api/notes';
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => 'Accept: application/json'
    ]
]);

$response = file_get_contents($url, false, $context);
if ($response === false) {
    echo "Error: Could not fetch data from API\n";
} else {
    echo "Response: " . $response . "\n";
}

echo "HTTP Response Headers:\n";
print_r($http_response_header);