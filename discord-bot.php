<?php
// Interaction Type
const PING                             = 1;
const APPLICATION_COMMAND              = 2;
const MESSAGE_COMPONENT                = 3;
const APPLICATION_COMMAND_AUTOCOMPLETE = 4;
const MODAL_SUBMIT                     = 5;
// Interaction Context Types
const GUILD           = 0;
const BOT_DM          = 1;
const PRIVATE_CHANNEL = 2;
// Interaction Callback Type
const PONG                                    = 1;
const CHANNEL_MESSAGE_WITH_SOURCE             = 4;
const DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE    = 5;
const DEFERRED_UPDATE_MESSAGE                 = 6;
const UPDATE_MESSAGE                          = 7;
const APPLICATION_COMMAND_AUTOCOMPLETE_RESULT = 8;
const MODAL                                   = 9;
const PREMIUM_REQUIRED                       = 10;
const LAUNCH_ACTIVITY                        = 12;

function DCHTTP($method, $endpoint, $body) {
    return file_get_contents("https://discord.com/api/v10$endpoint", false, stream_context_create([ 'http' => [
        'header' => "Content-Type: application/json\r\n",
        'method' => $method,
        'content' => json_encode($body)
    ] ]));
}

header('Content-Type: application/json; charset=UTF-8');
$body = file_get_contents('php://input');
$publickey = hex2bin('125c2976a408f07dbc4863ae504832664e209545902453ee464855eaa4758010');
$signiture = hex2bin($_SERVER['HTTP_X_SIGNATURE_ED25519']);
$messageBody = $_SERVER['HTTP_X_SIGNATURE_TIMESTAMP'] . $body;
if (strlen($publickey) != 32 or strlen($signiture) != 64) {
    http_response_code(401);
    echo '{"error": "Invalid key sizes"}';
    exit;
}
if (!sodium_crypto_sign_verify_detached($signiture, $messageBody, $publickey)) {
    http_response_code(401);
    echo '{"error": "Invalid signiture body"}';
    exit;
}

$dispatch = json_decode($body, true);
if (!$dispatch or $dispatch['type'] == PING) {
    echo json_encode([ 'type' => PONG ]);
} else {
    $data = $dispatch['data'];
    $appId = $dispatch['application_id'];
    $token = $dispatch['token'];
    if ($dispatch['type'] == APPLICATION_COMMAND) {
        switch ($data['name']) {
        case 'ping':
            echo json_encode([
                'type' => CHANNEL_MESSAGE_WITH_SOURCE,
                'data' => [ 'content' => 'pong!!!!!' ]
            ]); break;
        case 'fart':
            echo json_encode([
                'type' => CHANNEL_MESSAGE_WITH_SOURCE,
                'data' => [ 'content' => 'i farted on your mom 😎' ]
            ]); break;
        }
    }
}

?>