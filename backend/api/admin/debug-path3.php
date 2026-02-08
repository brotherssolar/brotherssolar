<?php
echo "CURRENT DIR: " . __DIR__ . "\n";
$candidate = dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR . 'backend' . DIRECTORY_SEPARATOR . '.env';
echo "CANDIDATE: $candidate\n";
echo "EXISTS: " . (file_exists($candidate) ? 'YES' : 'NO') . "\n";
if (file_exists($candidate)) {
    echo "SIZE: " . filesize($candidate) . "\n";
}
?>
