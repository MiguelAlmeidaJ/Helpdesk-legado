<?php
return [
    'host' => getenv('N3_SMTP_HOST') ?: 'smtp.gmail.com',
    'port' => (int)(getenv('N3_SMTP_PORT') ?: 587),
    'secure' => getenv('N3_SMTP_SECURE') ?: 'tls',
    'username' => getenv('N3_SMTP_USER') ?: '',
    'password' => getenv('N3_SMTP_PASS') ?: '',
    'from_email' => getenv('N3_SMTP_FROM') ?: (getenv('N3_SMTP_USER') ?: ''),
    'from_name' => getenv('N3_SMTP_FROM_NAME') ?: 'Allterus N3TI',
    'allow_header_from' => filter_var(getenv('N3_SMTP_ALLOW_HEADER_FROM') ?: 'false', FILTER_VALIDATE_BOOLEAN),
    'timeout' => (int)(getenv('N3_SMTP_TIMEOUT') ?: 20),
];
