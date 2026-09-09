<?php
http_response_code(410);
header('Content-Type: text/plain; charset=UTF-8');
echo 'A edição administrativa de RD foi migrada para o fluxo nativo. Nenhuma alteração foi gravada.';
exit;
