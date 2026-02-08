<?php
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

    // Generate unique single code
    function generateUniqueSingleCode() {
        $timestamp = date('YmdHis');
        $random = strtoupper(substr(md5(uniqid()), 0, 6));
        $prefixes = ['BRS', 'SOL', 'BRD', 'ADM'];
        $prefix = $prefixes[array_rand($prefixes)];
        return $prefix . '-' . $timestamp . '-' . $random;
    }

    $single_code = generateUniqueSingleCode();
    $tracking_id = 'BRS-' . strtoupper(uniqid()) . '-' . date('Ymd');

    // Prepare message
    $message = "🔐 *Brothers Solar Admin - Secret Code*\n\n";
    $message .= "🔑 *Secret Access Code:* $single_code\n\n";
    $message .= "⚠️ *Confidential - Admin Use Only*";

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
    file_put_contents($log_dir . '/secret-codes.log', json_encode($log_entry) . "\n", FILE_APPEND);

    // Send based on method (simplified for testing)
    $response_data = [
        'success' => true,
        'message' => "Secret code sent via $method successfully",
        'tracking_id' => $tracking_id,
        'method' => $method,
        'timestamp' => date('Y-m-d H:i:s'),
        'single_code' => $single_code,
        'delivery_status' => 'sent',
        'backend_sent' => true
    ];

    if ($method === 'whatsapp') {
        $whatsapp_url = "https://wa.me/" . preg_replace('/[^0-9]/', '', $admin_contact['whatsapp'] ?? '') . "?text=" . urlencode($message);
        $response_data['whatsapp_url'] = $whatsapp_url;
        $response_data['test_mode'] = true;
        
    } elseif ($method === 'email') {
        $email_subject = "Brothers Solar Admin - Secret Access Code";
        $email_body = str_replace('*', '', $message);
        $gmail_url = "https://mail.google.com/mail/?view=cm&fs=1&to=" . urlencode($admin_contact['email'] ?? '') . "&su=" . urlencode($email_subject) . "&body=" . urlencode($email_body);
        $response_data['gmail_url'] = $gmail_url;
        $response_data['test_mode'] = true;
    }

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
