<?php
/**
 * Simple SMTP Mailer for Gmail
 * Sends email using direct SMTP connection with authentication
 */
class SmtpMailer {
    private $host;
    private $port;
    private $username;
    private $password;
    private $timeout = 30;
    private $debug = false;
    
    public function __construct($host = 'smtp.gmail.com', $port = 587, $username = '', $password = '') {
        $this->host = $host;
        $this->port = $port;
        $this->username = $username;
        $this->password = $password;
    }
    
    public function send($to, $subject, $message, $from = '') {
        if (empty($from)) {
            $from = $this->username;
        }
        
        try {
            // Connect to SMTP server
            $socket = @fsockopen($this->host, $this->port, $errno, $errstr, $this->timeout);
            if (!$socket) {
                return ['success' => false, 'error' => "Connection failed: $errstr ($errno)"];
            }
            
            // Read greeting
            $this->readResponse($socket);
            
            // EHLO
            $this->sendCommand($socket, "EHLO localhost");
            $this->readResponse($socket);
            
            // STARTTLS
            $this->sendCommand($socket, "STARTTLS");
            $response = $this->readResponse($socket);
            
            if (strpos($response, '220') !== 0) {
                fclose($socket);
                return ['success' => false, 'error' => 'STARTTLS failed'];
            }
            
            // Enable TLS
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                fclose($socket);
                return ['success' => false, 'error' => 'TLS negotiation failed'];
            }
            
            // EHLO again after TLS
            $this->sendCommand($socket, "EHLO localhost");
            $this->readResponse($socket);
            
            // AUTH LOGIN
            $this->sendCommand($socket, "AUTH LOGIN");
            $response = $this->readResponse($socket);
            
            if (strpos($response, '334') !== 0) {
                fclose($socket);
                return ['success' => false, 'error' => 'AUTH LOGIN failed'];
            }
            
            // Send username (base64 encoded)
            $this->sendCommand($socket, base64_encode($this->username));
            $this->readResponse($socket);
            
            // Send password (base64 encoded)
            $this->sendCommand($socket, base64_encode($this->password));
            $response = $this->readResponse($socket);
            
            if (strpos($response, '235') !== 0) {
                fclose($socket);
                return ['success' => false, 'error' => 'Authentication failed: ' . $response];
            }
            
            // MAIL FROM
            $this->sendCommand($socket, "MAIL FROM:<$from>");
            $this->readResponse($socket);
            
            // RCPT TO
            $this->sendCommand($socket, "RCPT TO:<$to>");
            $this->readResponse($socket);
            
            // DATA
            $this->sendCommand($socket, "DATA");
            $response = $this->readResponse($socket);
            
            if (strpos($response, '354') !== 0) {
                fclose($socket);
                return ['success' => false, 'error' => 'DATA command failed'];
            }
            
            // Send message
            $headers = "Subject: $subject\r\n";
            $headers .= "From: Brothers Solar <$from>\r\n";
            $headers .= "To: $to\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $headers .= "\r\n";
            
            $fullMessage = $headers . $message . "\r\n.";
            $this->sendCommand($socket, $fullMessage);
            $response = $this->readResponse($socket);
            
            if (strpos($response, '250') !== 0) {
                fclose($socket);
                return ['success' => false, 'error' => 'Message sending failed: ' . $response];
            }
            
            // QUIT
            $this->sendCommand($socket, "QUIT");
            fclose($socket);
            
            return ['success' => true, 'error' => null];
            
        } catch (Exception $e) {
            if (isset($socket) && is_resource($socket)) {
                fclose($socket);
            }
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    private function sendCommand($socket, $command) {
        fwrite($socket, $command . "\r\n");
    }
    
    private function readResponse($socket) {
        $response = '';
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            if (substr($line, 3, 1) == ' ') {
                break;
            }
        }
        return $response;
    }
}
?>
