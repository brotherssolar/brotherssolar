<?php
// Test email configuration
error_reporting(E_ALL);
ini_set('display_errors', 1);

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
loadEnv(__DIR__ . '/.env');

// Get SMTP configuration
$smtpHost = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
$smtpPort = getenv('SMTP_PORT') ?: 587;
$smtpUser = getenv('SMTP_USER') ?: 'brotherssolar01@gmail.com';
$smtpPass = getenv('SMTP_PASS') ?: '';

echo "<h2>Email Configuration Test</h2>";
echo "<p><strong>SMTP Host:</strong> $smtpHost</p>";
echo "<p><strong>SMTP Port:</strong> $smtpPort</p>";
echo "<p><strong>SMTP User:</strong> $smtpUser</p>";
echo "<p><strong>SMTP Pass:</strong> " . (empty($smtpPass) ? 'NOT CONFIGURED' : 'CONFIGURED') . "</p>";

// Test email sending
$testEmail = 'brotherssolar01@gmail.com';
$subject = "Test Email from Brothers Solar";
$message = "This is a test email to verify email configuration.\n\nIf you receive this, email sending is working properly.\n\n- Brothers Solar Team";

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

echo "<h3>Attempting to send test email...</h3>";

// Try to send email using PHP mail()
$mailSent = mail($testEmail, $subject, $message, $headersString, '-f' . $smtpUser);

if ($mailSent) {
    echo "<p style='color: green;'>✅ Email sent successfully using PHP mail()!</p>";
} else {
    echo "<p style='color: red;'>❌ PHP mail() failed. Trying alternative method...</p>";
    
    // Try alternative method without -f parameter
    $mailSentAlt = mail($testEmail, $subject, $message, $headersString);
    
    if ($mailSentAlt) {
        echo "<p style='color: green;'>✅ Email sent successfully using alternative PHP mail()!</p>";
    } else {
        echo "<p style='color: red;'>❌ Alternative PHP mail() also failed.</p>";
        echo "<p><strong>Troubleshooting:</strong></p>";
        echo "<ul>";
        echo "<li>Check if XAMPP sendmail is configured</li>";
        echo "<li>Verify Gmail App Password is correct</li>";
        echo "<li>Check firewall/antivirus blocking</li>";
        echo "<li>Verify PHP mail function is enabled</li>";
        echo "</ul>";
    }
}

// Test MSG91 SMS configuration
echo "<h2>SMS Configuration Test</h2>";

$authKey = getenv('MSG91_AUTHKEY') ?: '';
$sender = getenv('MSG91_SENDER') ?: 'BRTHSL';

echo "<p><strong>MSG91 Auth Key:</strong> " . (empty($authKey) ? 'NOT CONFIGURED' : 'CONFIGURED') . "</p>";
echo "<p><strong>MSG91 Sender:</strong> $sender</p>";

if (!empty($authKey)) {
    echo "<p style='color: green;'>✅ MSG91 is configured for SMS sending</p>";
} else {
    echo "<p style='color: orange;'>⚠️ MSG91 is not configured</p>";
}

echo "<h3>Next Steps:</h3>";
echo "<ol>";
echo "<li>Check your email inbox for the test email</li>";
echo "<li>If email not received, check XAMPP mail configuration</li>";
echo "<li>Verify Gmail App Password is correct</li>";
echo "<li>Test OTP sending from admin login page</li>";
echo "</ol>";

echo "<p><a href='../admin/login.html'>Go to Admin Login</a></p>";
?>
