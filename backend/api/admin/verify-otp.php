<?php
// Error reporting
error_reporting(0);
ini_set('display_errors', 0);

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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

// Load environment variables
function loadEnv($file) {
    if (!file_exists($file)) {
        return false;
    }
    
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Remove quotes if present
            $value = trim($value, '"\'');
            
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
    return true;
}

// Load environment variables
loadEnv(dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR . 'backend' . DIRECTORY_SEPARATOR . '.env');

try {
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
        exit;
    }

    $action = $input['action'] ?? '';

    switch ($action) {
        case 'request_otp':
            handleRequestOtp($input);
            break;
        case 'verify_otp':
            handleVerifyOtp($input);
            break;
        case 'send_whatsapp_otp':
            handleWhatsAppOTPRequest($input);
            break;
        default:
            // Handle legacy OTP verification
            handleLegacyOtp($input);
            break;
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

function sendEmail($to, $subject, $message) {
    // Get SMTP configuration from environment
    $smtpHost = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
    $smtpPort = getenv('SMTP_PORT') ?: 587;
    $smtpUser = getenv('SMTP_USER') ?: 'brotherssolar01@gmail.com';
    $smtpPass = getenv('SMTP_PASS') ?: '';
    
    if (empty($smtpPass)) {
        error_log("SMTP password not configured");
        return false;
    }
    
    // Create comprehensive email headers
    $headers = [
        'From: Brothers Solar <' . $smtpUser . '>',
        'Reply-To: Brothers Solar <' . $smtpUser . '>',
        'Return-Path: Brothers Solar <' . $smtpUser . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'X-Mailer: PHP/' . phpversion(),
        'X-Priority: 1',
        'X-MSMail-Priority: High'
    ];
    
    // Convert headers array to string
    $headersString = implode("\r\n", $headers);
    
    // Try to send email using PHP mail() with proper parameters
    $mailSent = mail($to, $subject, $message, $headersString, '-f' . $smtpUser);
    
    if ($mailSent) {
        error_log("Email sent successfully to $to using PHP mail()");
        return true;
    } else {
        error_log("PHP mail() failed for $to");
        
        // Try alternative method without -f parameter
        $mailSentAlt = mail($to, $subject, $message, $headersString);
        
        if ($mailSentAlt) {
            error_log("Email sent successfully to $to using alternative PHP mail()");
            return true;
        } else {
            error_log("Alternative PHP mail() also failed for $to");
            return false;
        }
    }
}

function sendSMS($phone, $message) {
    // Get MSG91 configuration from environment
    $authKey = getenv('MSG91_AUTHKEY') ?: '';
    $sender = getenv('MSG91_SENDER') ?: 'BRTHSL';
    $templateId = getenv('MSG91_DLT_TEMPLATE_ID') ?: '';
    
    if (empty($authKey)) {
        error_log("MSG91 auth key not configured");
        return false;
    }
    
    // Clean phone number (remove +91 if present)
    $phone = preg_replace('/[^0-9]/', '', $phone);
    if (strlen($phone) > 10) {
        $phone = substr($phone, -10);
    }
    
    // Prepare SMS data
    $postData = [
        'authkey' => $authKey,
        'mobiles' => $phone,
        'message' => $message,
        'sender' => $sender,
        'route' => '4',
        'country' => '91'
    ];
    
    if (!empty($templateId)) {
        $postData['DLT_TE_ID'] = $templateId;
    }
    
    // Send SMS using MSG91 API
    $url = 'https://control.msg91.com/api/sendhttp.php';
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($postData),
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 30
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode == 200 && $response) {
        error_log("SMS sent successfully to $phone: $response");
        return true;
    } else {
        error_log("SMS failed to $phone. HTTP Code: $httpCode, Response: $response");
        return false;
    }
}

function handleRequestOtp($input) {
    $email = $input['email'] ?? '';
    $phone = $input['phone'] ?? '';
    
    if (!$email) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email is required']);
        exit;
    }

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        exit;
    }

    session_start();

    // Generate 6-digit OTP (ensure it's different from the previous one)
    $previousOtp = $_SESSION['admin_otp'] ?? '';
    $otp = '';
    for ($i = 0; $i < 5; $i++) {
        $candidate = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        if ($candidate !== $previousOtp) {
            $otp = $candidate;
            break;
        }
    }
    if ($otp === '') {
        $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
    }
    $expiresAt = date('Y-m-d H:i:s', strtotime('+10 minutes'));
    
    // Store OTP in session/database
    $_SESSION['admin_otp'] = $otp;
    $_SESSION['admin_otp_expires'] = $expiresAt;
    $_SESSION['admin_otp_email'] = $email;
    $_SESSION['admin_otp_phone'] = $phone;
    
    // Send OTP via email
    $subject = "Brothers Solar Admin OTP Verification";
    $emailMessage = "Your OTP code is: $otp\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\n- Brothers Solar Team";
    
    $emailSent = sendEmail($email, $subject, $emailMessage);
    
    // Send OTP via SMS if phone number provided
    $smsSent = false;
    if ($phone) {
        $smsMessage = "Your Brothers Solar OTP is: $otp. Valid for 10 minutes.";
        $smsSent = sendSMS($phone, $smsMessage);
    }

    // Send OTP via WhatsApp if phone number provided
    $whatsappSent = false;
    if ($phone) {
        $whatsappResult = sendWhatsAppOTP($phone, $otp);
        $whatsappSent = is_array($whatsappResult) ? ($whatsappResult['success'] ?? false) : (bool)$whatsappResult;
    }
    
    // Log for debugging
    error_log("Admin OTP Request - Email: $email, Phone: $phone, OTP: $otp, Expires: $expiresAt");
    error_log("Email sent: " . ($emailSent ? 'Yes' : 'No'));
    error_log("SMS sent: " . ($smsSent ? 'Yes' : 'No'));
    error_log("WhatsApp sent: " . ($whatsappSent ? 'Yes' : 'No'));
    
    echo json_encode([
        'success' => true,
        'message' => 'OTP sent successfully to your email, SMS and WhatsApp',
        'email_sent' => $emailSent,
        'sms_sent' => $smsSent,
        'whatsapp_sent' => $whatsappSent,
        'expires_in' => '10 minutes',
        'debug_info' => [
            'smtp_configured' => !empty(getenv('SMTP_PASS')),
            'msg91_configured' => !empty(getenv('MSG91_AUTHKEY')),
            'infobip_configured' => !empty(getenv('INFOBIP_BASE_URL')) && !empty(getenv('INFOBIP_API_KEY')) && !empty(getenv('INFOBIP_WHATSAPP_FROM')),
            'whatsapp_http_code' => is_array($whatsappResult) ? ($whatsappResult['http_code'] ?? null) : null,
            'whatsapp_response' => is_array($whatsappResult) ? ($whatsappResult['response'] ?? null) : null,
            'whatsapp_error' => is_array($whatsappResult) ? ($whatsappResult['error'] ?? null) : null
        ]
    ]);
}

function sendWhatsAppOTP($phone, $otp) {
    $infobipBaseUrl = getenv('INFOBIP_BASE_URL') ?: '';
    $infobipApiKey = getenv('INFOBIP_API_KEY') ?: '';
    $infobipFrom = getenv('INFOBIP_WHATSAPP_FROM') ?: '';

    if (!function_exists('curl_init')) {
        $msg = 'PHP cURL extension is not enabled (curl_init missing)';
        error_log($msg);
        return [
            'success' => false,
            'http_code' => 0,
            'response' => null,
            'error' => $msg
        ];
    }

    if (empty($infobipBaseUrl) || empty($infobipApiKey) || empty($infobipFrom)) {
        $missing = [];
        if (empty($infobipBaseUrl)) $missing[] = 'INFOBIP_BASE_URL';
        if (empty($infobipApiKey)) $missing[] = 'INFOBIP_API_KEY';
        if (empty($infobipFrom)) $missing[] = 'INFOBIP_WHATSAPP_FROM';
        $msg = 'Infobip WhatsApp not configured. Missing: ' . implode(', ', $missing);
        error_log($msg);
        return [
            'success' => false,
            'http_code' => 0,
            'response' => null,
            'error' => $msg
        ];
    }

    // Normalize phone number to E164 without plus (India default)
    $digits = preg_replace('/[^0-9]/', '', $phone);
    if (strlen($digits) === 10) {
        $digits = '91' . $digits;
    } elseif (strlen($digits) > 10 && substr($digits, 0, 2) !== '91') {
        // Keep as-is if a different country code is already present
    }

    // Normalize sender (from) as E164 without plus when given as 10-digit Indian number
    $fromDigits = preg_replace('/[^0-9]/', '', $infobipFrom);
    if (strlen($fromDigits) === 10) {
        $fromDigits = '91' . $fromDigits;
    }

    $messageText = "Your Brothers Solar Admin OTP is: $otp. This code will expire in 10 minutes. Please do not share this code with anyone.";

    $base = trim($infobipBaseUrl);
    // Guard against common copy/paste mistakes like: INFOBIP_BASE_URL=INFOBIP_BASE_URL=https://...
    if (stripos($base, 'INFOBIP_BASE_URL=') !== false) {
        $parts = explode('INFOBIP_BASE_URL=', $base);
        $base = trim(end($parts));
    }
    if ($base !== '' && !preg_match('#^https?://#i', $base)) {
        $base = 'https://' . $base;
    }
    $base = rtrim($base, '/');
    $url = $base . '/whatsapp/1/message/template';

    $payload = json_encode([
        'messages' => [
            [
                'from' => $fromDigits ?: $infobipFrom,
                'to' => $digits,
                'content' => [
                    'templateName' => 'test_whatsapp_template_en',
                    'templateData' => [
                        'body' => [
                            'placeholders' => [$otp]
                        ]
                    ],
                    'language' => 'en'
                ]
            ]
        ]
    ]);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: App ' . $infobipApiKey
        ],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 30
    ]);

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300 && $response) {
        error_log("Infobip WhatsApp OTP sent successfully to $digits: $response");
        return [
            'success' => true,
            'http_code' => $httpCode,
            'response' => $response,
            'error' => $curlError ?: null
        ];
    }

    error_log("Infobip WhatsApp OTP failed to $digits. HTTP Code: $httpCode, Response: $response, CurlError: $curlError");
    return [
        'success' => false,
        'http_code' => $httpCode,
        'response' => $response,
        'error' => $curlError ?: null
    ];
}

function handleWhatsAppOTPRequest($input) {
    $phone = $input['phone'] ?? '';
    
    session_start();

    // Always generate a fresh OTP (do not accept client-provided OTP)
    $previousOtp = $_SESSION['admin_whatsapp_otp'] ?? '';
    $otp = '';
    // Try up to 10 times to get a different OTP
    for ($i = 0; $i < 10; $i++) {
        $candidate = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        if ($candidate !== $previousOtp) {
            $otp = $candidate;
            break;
        }
    }
    // Fallback if somehow still same (extremely unlikely)
    if ($otp === '' || $otp === $previousOtp) {
        $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
    }
    
    $expiresAt = date('Y-m-d H:i:s', strtotime('+10 minutes'));
    
    // Store OTP in session
    $_SESSION['admin_whatsapp_otp'] = $otp;
    $_SESSION['admin_whatsapp_otp_expires'] = $expiresAt;
    $_SESSION['admin_whatsapp_phone'] = $phone;
    
    // Send WhatsApp OTP
    $sendResult = sendWhatsAppOTP($phone, $otp);
    $whatsappSent = is_array($sendResult) ? ($sendResult['success'] ?? false) : (bool)$sendResult;
    
    // Log for debugging
    error_log("Admin WhatsApp OTP Request - Phone: $phone, OTP: $otp, Expires: $expiresAt");
    error_log("WhatsApp sent: " . ($whatsappSent ? 'Yes' : 'No'));

    if (!$whatsappSent) {
        $code = 500;
        if (is_array($sendResult)) {
            $maybe = (int)($sendResult['http_code'] ?? 0);
            if ($maybe >= 400 && $maybe <= 599) {
                $code = $maybe;
            }
        }
        http_response_code($code);
    }

    echo json_encode([
        'success' => $whatsappSent ? true : false,
        'message' => $whatsappSent ? 'WhatsApp OTP sent successfully' : 'Failed to send WhatsApp OTP. Check debug_info for Infobip response.',
        'whatsapp_sent' => $whatsappSent,
        'phone' => $phone,
        'expires_in' => '10 minutes',
        'debug_info' => [
            'infobip_configured' => !empty(getenv('INFOBIP_BASE_URL')) && !empty(getenv('INFOBIP_API_KEY')) && !empty(getenv('INFOBIP_WHATSAPP_FROM')),
            'http_code' => is_array($sendResult) ? ($sendResult['http_code'] ?? null) : null,
            'response' => is_array($sendResult) ? ($sendResult['response'] ?? null) : null,
            'error' => is_array($sendResult) ? ($sendResult['error'] ?? null) : null
        ]
    ]);
}

function handleVerifyOtp($input) {
    $email = $input['email'] ?? '';
    $otpCode = $input['otp_code'] ?? '';
    
    if (!$email || !$otpCode) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email and OTP are required']);
        exit;
    }

    // Validate OTP format (must be exactly 6 digits)
    if (!preg_match('/^\d{6}$/', $otpCode)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'OTP must be exactly 6 digits']);
        exit;
    }
    
    // Additional validation: prevent common test codes
    $commonTestCodes = ['123456', '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999'];
    if (in_array($otpCode, $commonTestCodes)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid OTP. Please use the code sent to your WhatsApp.']);
        exit;
    }

    session_start();
    
    // Check for regular OTP session
    $storedOtp = $_SESSION['admin_otp'] ?? '';
    $expiresAt = $_SESSION['admin_otp_expires'] ?? '';
    $storedEmail = $_SESSION['admin_otp_email'] ?? '';
    
    // Check for WhatsApp OTP session
    $whatsappOtp = $_SESSION['admin_whatsapp_otp'] ?? '';
    $whatsappExpiresAt = $_SESSION['admin_whatsapp_otp_expires'] ?? '';
    $whatsappPhone = $_SESSION['admin_whatsapp_phone'] ?? '';
    
    // Log verification attempt
    error_log("OTP Verification Attempt - Email: $email, OTP: $otpCode");
    error_log("Stored OTP: $storedOtp, WhatsApp OTP: $whatsappOtp");
    error_log("Regular Expires: $expiresAt, WhatsApp Expires: $whatsappExpiresAt");
    
    // Determine which OTP to verify (regular or WhatsApp)
    $isValidOtp = false;
    $otpType = '';
    
    // Check regular OTP first
    if (!empty($storedOtp) && $storedEmail === $email) {
        if (strtotime($expiresAt) >= time()) {
            if ($storedOtp === $otpCode) {
                $isValidOtp = true;
                $otpType = 'regular';
            }
        }
    }
    
    // If regular OTP is invalid, check WhatsApp OTP
    if (!$isValidOtp && !empty($whatsappOtp)) {
        if (strtotime($whatsappExpiresAt) >= time()) {
            if ($whatsappOtp === $otpCode) {
                $isValidOtp = true;
                $otpType = 'whatsapp';
            }
        }
    }
    
    // Log verification result
    error_log("OTP Valid: " . ($isValidOtp ? 'Yes' : 'No') . ", Type: $otpType");
    
    if (!$isValidOtp) {
        // Check if any OTP exists
        if (empty($storedOtp) && empty($whatsappOtp)) {
            echo json_encode(['success' => false, 'message' => 'No OTP request found. Please request a new OTP.']);
            exit;
        }
        
        // OTP exists but is invalid
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid OTP. Please check the code sent to your WhatsApp and try again.']);
        exit;
    }
    
    // Clear the used OTP
    if ($otpType === 'regular') {
        unset($_SESSION['admin_otp']);
        unset($_SESSION['admin_otp_expires']);
        unset($_SESSION['admin_otp_email']);
    } else {
        unset($_SESSION['admin_whatsapp_otp']);
        unset($_SESSION['admin_whatsapp_otp_expires']);
        unset($_SESSION['admin_whatsapp_phone']);
    }
    
    // Generate admin token
    $token = base64_encode(json_encode([
        'user' => 'admin',
        'exp' => time() + 3600, // 1 hour
        'verified' => true,
        'method' => $otpType,
        'timestamp' => time()
    ]));
    
    error_log("OTP Verification Successful - Method: $otpType");
    
    echo json_encode([
        'success' => true,
        'message' => 'OTP verified successfully',
        'data' => [
            'token' => $token,
            'user' => 'admin',
            'method' => $otpType
        ]
    ]);
}

function handleLegacyOtp($input) {
    // Legacy function disabled for security
    // Always require proper OTP verification
    echo json_encode([
        'success' => false,
        'message' => 'Please use the proper OTP verification process. Request an OTP first, then verify it.'
    ]);
}
?>
