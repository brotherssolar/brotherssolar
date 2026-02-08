<?php
// Error reporting
error_reporting(0);
ini_set('display_errors', 0);

// Load environment variables from .env file
function loadEnv($path) {
    if (!file_exists($path)) return false;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
    return true;
}

// Load .env file
loadEnv(__DIR__ . '/../../.env');

// Get SMTP credentials from environment
$smtp_host = $_ENV['SMTP_HOST'] ?? 'smtp.gmail.com';
$smtp_port = $_ENV['SMTP_PORT'] ?? 587;
$smtp_user = $_ENV['SMTP_USER'] ?? 'brotherssolar01@gmail.com';
$smtp_pass = $_ENV['SMTP_PASS'] ?? '';

// Configure PHP mail with SMTP credentials
ini_set('SMTP', $smtp_host);
ini_set('smtp_port', $smtp_port);
ini_set('sendmail_from', $smtp_user);

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
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username and password are required']);
        exit;
    }

    // Log the login attempt
    $log_entry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'username' => $username,
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ];

    $log_dir = __DIR__ . '/../../../logs';
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }
    file_put_contents($log_dir . '/admin-login.log', json_encode($log_entry) . "\n", FILE_APPEND);

    // Check credentials (in production, use database with hashed passwords)
    $valid_credentials = [
        'admin' => 'admin123',
        'brotherssolar' => 'admin@2024'
    ];

    if (isset($valid_credentials[$username]) && $valid_credentials[$username] === $password) {
        // Success - generate OTP
        function generateOTP() {
            return sprintf('%06d', mt_rand(0, 999999));
        }

        $otp = generateOTP();
        $otp_expiry = date('Y-m-d H:i:s', strtotime('+5 minutes'));

        // Log the OTP
        $otp_log = [
            'timestamp' => date('Y-m-d H:i:s'),
            'username' => $username,
            'otp' => $otp,
            'expiry' => $otp_expiry,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ];

        file_put_contents($log_dir . '/admin-otp.log', json_encode($otp_log) . "\n", FILE_APPEND);

        // Send OTP email using SMTP with authentication
        require_once __DIR__ . '/SmtpMailer.php';
        
        $email = 'brotherssolar01@gmail.com';
        $subject = "Brothers Solar - Admin Login OTP";
        $message = "🔐 Brothers Solar Admin - Login OTP\n\n";
        $message .= "🔑 Your OTP: $otp\n\n";
        $message .= "⏰ Valid for: 5 minutes\n";
        $message .= "👤 Username: $username\n\n";
        $message .= "⚠️ Do not share this OTP with anyone.\n";
        $message .= "If you didn't request this, please ignore.";
        
        // Use SMTP mailer with credentials from .env
        $mailer = new SmtpMailer($smtp_host, $smtp_port, $smtp_user, $smtp_pass);
        $mail_result = $mailer->send($email, $subject, $message);
        $mail_sent = $mail_result['success'];
        $mail_error = $mail_result['error'];

        // Prepare success response
        $response_data = [
            'success' => true,
            'message' => $mail_sent ? 'OTP sent to your email' : 'OTP generated (email may be delayed)',
            'username' => $username,
            'otp' => $otp, // Only for development - remove in production
            'expires_in' => 300, // 5 minutes
            'mail_sent' => $mail_sent,
            'mail_error' => $mail_error ? $mail_error['message'] : null,
            'timestamp' => date('Y-m-d H:i:s')
        ];

        echo json_encode($response_data);

    } else {
        // Failed login
        http_response_code(401);
        echo json_encode([
            'success' => false, 
            'message' => 'Invalid username or password'
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Server error occurred',
        'error' => $e->getMessage()
    ]);
}
?>
