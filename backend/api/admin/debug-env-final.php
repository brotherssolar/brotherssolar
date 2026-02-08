<?php
function loadEnv($file) {
    if (!file_exists($file)) {
        echo "ENV FILE NOT FOUND: $file\n";
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

header('Content-Type: text/plain');

echo "=== ENV LOADING DEBUG ===\n";
$envPath = dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR . 'backend' . DIRECTORY_SEPARATOR . '.env';
echo "Env path: $envPath\n";
$loaded = loadEnv($envPath);
echo "Env loaded: " . ($loaded ? 'YES' : 'NO') . "\n";

echo "\n=== INFobip VALUES ===\n";
echo 'INFOBIP_BASE_URL: [' . getenv('INFOBIP_BASE_URL') . "]\n";
echo 'INFOBIP_API_KEY: [' . getenv('INFOBIP_API_KEY') . "]\n";
echo 'INFOBIP_WHATSAPP_FROM: [' . getenv('INFOBIP_WHATSAPP_FROM') . "]\n";

echo "\n=== CURL TEST ===\n";
if (!function_exists('curl_init')) {
    echo "CURL NOT ENABLED\n";
} else {
    echo "CURL OK\n";
    $base = trim(getenv('INFOBIP_BASE_URL'));
    if (stripos($base, 'INFOBIP_BASE_URL=') !== false) {
        $parts = explode('INFOBIP_BASE_URL=', $base);
        $base = trim(end($parts));
    }
    if ($base !== '' && !preg_match('#^https?://#i', $base)) {
        $base = 'https://' . $base;
    }
    $base = rtrim($base, '/');
    $url = $base . '/whatsapp/1/message/text';
    echo "Final URL: $url\n";
}
?>
