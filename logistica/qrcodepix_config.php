<?php

/**
 * Formata o ID, Tamanho e Valor de um campo do BR Code.
 * @param string $id
 * @param string $valor
 * @return string
 */
function formatarCampo($id, $valor)
{
    $tamanho = str_pad(strlen($valor), 2, '0', STR_PAD_LEFT);
    return $id . $tamanho . $valor;
}

/**
 * Calcula o CRC16 (Checksum) para o payload do PIX.
 * @param string $payload
 * @return string
 */
function calcularCRC16($payload)
{
    $payload .= '6304'; // ID e tamanho do CRC16
    $polinomio = 0x1021;
    $resultado = 0xFFFF;

    if (($length = strlen($payload)) > 0) {
        for ($offset = 0; $offset < $length; $offset++) {
            $resultado ^= (ord($payload[$offset]) << 8);
            for ($bitwise = 0; $bitwise < 8; $bitwise++) {
                if (($resultado <<= 1) & 0x10000) $resultado ^= $polinomio;
                $resultado &= 0xFFFF;
            }
        }
    }

    return '6304' . strtoupper(str_pad(dechex($resultado), 4, '0', STR_PAD_LEFT));
}

/**
 * Monta a string completa do payload do PIX (BR Code).
 * @param string $chavePix
 * @param float $valor
 * @param string $nomeBeneficiario
 * @param string $idTransacao
 * @return string
 */

function removerAcentos($string)
{
    return preg_replace(
        array(
            '/[áàãâä]/u',
            '/[éèêë]/u',
            '/[íìîï]/u',
            '/[óòõôö]/u',
            '/[úùûü]/u',
            '/[ç]/u',
            '/[ÁÀÃÂÄ]/u',
            '/[ÉÈÊË]/u',
            '/[ÍÌÎÏ]/u',
            '/[ÓÒÕÔÖ]/u',
            '/[ÚÙÛÜ]/u',
            '/[Ç]/u',
        ),
        explode(' ', 'a e i o u c A E I O U C'),
        $string
    );
}

function montarPayloadPix($chavePix, $valor, $nomeBeneficiario, $idTransacao = '***')
{
    // Limpa e formata os dados
    $valor = number_format($valor, 2, '.', '');

    $nomeBeneficiario = removerAcentos($nomeBeneficiario);            // remove acentos
    $nomeBeneficiario = preg_replace('/[^a-zA-Z0-9\s]/', '', $nomeBeneficiario); // remove caracteres inválidos
    $nomeBeneficiario = strtoupper(substr($nomeBeneficiario, 0, 25)); // maiúsculas e limite


    // Cidade fixa como "ALEM PARAIBA"
    $cidadeBeneficiario = 'NIVEL3 TI';
    $cidadeBeneficiario = removerAcentos($cidadeBeneficiario);
    $cidadeBeneficiario = preg_replace('/[^a-zA-Z0-9\s]/', '', $cidadeBeneficiario);
    $cidadeBeneficiario = strtoupper(substr($cidadeBeneficiario, 0, 15));

    $idTransacao = substr(preg_replace('/[^a-zA-Z0-9]/', '', $idTransacao), 0, 25);

    // Monta o payload
    $payload = formatarCampo('00', '01'); // Payload Format Indicator
    $payload .= formatarCampo('26', formatarCampo('00', 'br.gov.bcb.pix') . formatarCampo('01', $chavePix)); // Merchant Account Information
    $payload .= formatarCampo('52', '0000'); // Merchant Category Code
    $payload .= formatarCampo('53', '986'); // Transaction Currency (BRL)
    $payload .= formatarCampo('54', $valor); // Transaction Amount
    $payload .= formatarCampo('58', 'BR'); // Country Code
    $payload .= formatarCampo('59', $nomeBeneficiario); // Merchant Name
    $payload .= formatarCampo('60', $cidadeBeneficiario); // Merchant City
    $payload .= formatarCampo('62', formatarCampo('05', $idTransacao)); // Additional Data Field (ID da transação)

    // Adiciona o CRC16
    $payload .= calcularCRC16($payload);



    return $payload;
}
