<?php
echo "CURRENT DIR: " . __DIR__ . "\n";
echo "EXPECTED ENV PATH: " . __DIR__ . '/../../../.env' . "\n";
echo "RESOLVED PATH: " . realpath(__DIR__ . '/../../../.env') . "\n";
echo "FILE EXISTS: " . (file_exists(__DIR__ . '/../../../.env') ? 'YES' : 'NO') . "\n";
?>
