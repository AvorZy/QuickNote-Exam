<?php

// Test script to demonstrate note editing functionality

// First, let's create a note to edit
echo "=== Testing Note Edit Functionality ===\n\n";

// Create a new note
echo "1. Creating a new note...\n";
$createData = json_encode([
    'title' => 'Original Title',
    'content' => 'Original content that will be edited'
]);

$createContext = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\nAccept: application/json\r\n",
        'content' => $createData,
        'timeout' => 10
    ]
]);

$createResponse = @file_get_contents('http://127.0.0.1:8000/api/notes', false, $createContext);

if ($createResponse !== false) {
    $createResult = json_decode($createResponse, true);
    echo "✓ Note created successfully!\n";
    echo "Created note: " . json_encode($createResult, JSON_PRETTY_PRINT) . "\n\n";
    
    if (isset($createResult['data']['id'])) {
        $noteId = $createResult['data']['id'];
        
        // Now edit the note
        echo "2. Editing the note (ID: $noteId)...\n";
        $editData = json_encode([
            'title' => 'Updated Title - Edited!',
            'content' => 'This content has been successfully updated through the API!'
        ]);
        
        $editContext = stream_context_create([
            'http' => [
                'method' => 'PUT',
                'header' => "Content-Type: application/json\r\nAccept: application/json\r\n",
                'content' => $editData,
                'timeout' => 10
            ]
        ]);
        
        $editResponse = @file_get_contents("http://127.0.0.1:8000/api/notes/$noteId", false, $editContext);
        
        if ($editResponse !== false) {
            $editResult = json_decode($editResponse, true);
            echo "✓ Note edited successfully!\n";
            echo "Updated note: " . json_encode($editResult, JSON_PRETTY_PRINT) . "\n\n";
            
            // Verify the changes by fetching the note
            echo "3. Verifying the changes...\n";
            $verifyContext = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'header' => "Accept: application/json\r\n",
                    'timeout' => 10
                ]
            ]);
            
            $verifyResponse = @file_get_contents("http://127.0.0.1:8000/api/notes/$noteId", false, $verifyContext);
            
            if ($verifyResponse !== false) {
                $verifyResult = json_decode($verifyResponse, true);
                echo "✓ Changes verified!\n";
                echo "Final note state: " . json_encode($verifyResult, JSON_PRETTY_PRINT) . "\n";
            } else {
                echo "✗ Failed to verify changes\n";
            }
        } else {
            echo "✗ Failed to edit note\n";
            $error = error_get_last();
            if ($error) {
                echo "Error: " . $error['message'] . "\n";
            }
        }
    }
} else {
    echo "✗ Failed to create note for testing\n";
    $error = error_get_last();
    if ($error) {
        echo "Error: " . $error['message'] . "\n";
    }
}

echo "\n=== Edit Functionality Test Complete ===\n";