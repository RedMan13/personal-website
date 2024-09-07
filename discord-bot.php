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

header('Content-type: application/json; charset=us-ascii');
$data = json_decode(file_get_contents('php://input'), true);
$appId = $data['application_id'];
$token = $data['token'];
if ($data['type'] == PING) {
    echo json_encode([ 'type' => PONG ]);
} else {
}

?>