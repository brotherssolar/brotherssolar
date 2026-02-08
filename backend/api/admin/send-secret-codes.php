<?php
// Error reporting
error_reporting(0);
ini_set('display_errors', 0);

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
        exit;
    }

    // Validate required fields
    $method = $input['method'] ?? '';
    $admin_contact = $input['admin_contact'] ?? [];

    if (!in_array($method, ['whatsapp', 'email'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid method']);
        exit;
    }

    // Generate unique single code OR use predefined secret codes
    function generateSecretCode() {
        // Use predefined secret codes that match frontend
        $secret_codes = ['BROTHERS@2024', 'BRS@ADMIN#2024', 'SOLAR!ACCESS2024', 'ADMIN@BROTHERS2024'];
        return $secret_codes[array_rand($secret_codes)];
    }

    $single_code = generateSecretCode();
    $tracking_id = 'BRS-' . strtoupper(uniqid()) . '-' . date('Ymd');

    // Prepare message
    $message = "🔐 Brothers Solar Admin - Secret Code\n\n";
    $message .= "🔑 Secret Access Code: $single_code\n\n";
    $message .= "⚠️ Confidential - Admin Use Only";

    // Log the request
    $log_entry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'tracking_id' => $tracking_id,
        'method' => $method,
        'single_code' => $single_code,
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ];

    $log_dir = __DIR__ . '/../../../logs';
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }

    // Prepare response
    $response_data = [
        'success' => true,
        'message' => "Secret code sent via $method successfully",
        'tracking_id' => $tracking_id,
        'method' => $method,
        'timestamp' => date('Y-m-d H:i:s'),
        'single_code' => $single_code,
        'delivery_status' => 'sent',
        'backend_sent' => true,
        'code_type' => 'predefined_secret_code',
        'valid_codes' => ['BROTHERS@2024', 'BRS@ADMIN#2024', 'SOLAR!ACCESS2024', 'ADMIN@BROTHERS2024']
    ];

    if ($method === 'whatsapp') {
        // Generate WhatsApp URL
        $admin_number = preg_replace('/[^0-9]/', '', $admin_contact['whatsapp'] ?? '');
        $whatsapp_url = "https://wa.me/" . $admin_number . "?text=" . urlencode($message);
        $response_data['whatsapp_url'] = $whatsapp_url;
        $response_data['manual_send'] = true;
        $response_data['message'] = "WhatsApp opened for manual sending";
        
        $log_entry['whatsapp_url'] = $whatsapp_url;
        
    } elseif ($method === 'email') {
        // Generate Gmail URL
        $email_subject = "Brothers Solar Admin - Secret Access Code";
        $admin_email = $admin_contact['email'] ?? '';
        $gmail_url = "https://mail.google.com/mail/?view=cm&fs=1&to=" . urlencode($admin_email) . "&su=" . urlencode($email_subject) . "&body=" . urlencode($message);
        $response_data['gmail_url'] = $gmail_url;
        $response_data['manual_send'] = true;
        $response_data['message'] = "Gmail opened for manual sending";
        
        $log_entry['gmail_url'] = $gmail_url;
    }

    // Save log
    file_put_contents($log_dir . '/secret-codes.log', json_encode($log_entry) . "\n", FILE_APPEND);
    
    // Return JSON response
    echo json_encode($response_data);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Server error occurred',
        'error' => $e->getMessage()
    ]);
}
?>
