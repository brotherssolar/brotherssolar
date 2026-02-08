<?php
echo "CURRENT DIR: " . __DIR__ . "\n";
echo "DIRNAME: " . dirname(__DIR__) . "\n";
echo "DIRNAME DIRNAME: " . dirname(dirname(__DIR__)) . "\n";
echo "DIRNAME DIRNAME DIRNAME: " . dirname(dirname(dirname(__DIR__))) . "\n";

$candidate1 = dirname(dirname(dirname(__DIR__))) . '/.env';
echo "CANDIDATE1: $candidate1\n";
echo "EXISTS1: " . (file_exists($candidate1) ? 'YES' : 'NO') . "\n";

$candidate2 = dirname(dirname(dirname(__DIR__))) . '\.env';
echo "CANDIDATE2: $candidate2\n";
echo "EXISTS2: " . (file_exists($candidate2) ? 'YES' : 'NO') . "\n";

$candidate3 = dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR . '.env';
echo "CANDIDATE3: $candidate3\n";
echo "EXISTS3: " . (file_exists($candidate3) ? 'YES' : 'NO') . "\n";
?>
