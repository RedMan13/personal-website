<?php
$start = time();
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
// Component Types
const ActionRow = 1;
const Button = 2;
const StringSelect = 3;
const TextInput = 4;
const UserSelect = 5;
const RoleSelect = 6;
const MentionableSelect = 7;
const ChannelSelect = 8;
// Button Styles
const Primary = 1;
const Secondary = 2;
const Success = 3;
const Danger = 4;
const Link = 5;
const Premium = 6;

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
            $timeToProcess =  time() - $start;
            echo json_encode([
                'type' => CHANNEL_MESSAGE_WITH_SOURCE,
                'data' => [ 
                    'content' => <<<END
                        pong!!!!!!!!!
                        took `$timeToProcess` seconds to process
                        END 
                ]
            ]); break;
        case 'fart':
            echo json_encode([
                'type' => CHANNEL_MESSAGE_WITH_SOURCE,
                'data' => [ 'content' => 'i farted on your mom 😎' ]
            ]); break;
        case 'rps':
            echo json_encode([
                'embeds' => [
                    [
                        'title' => 'Rock Paper Scissors',
                        'description' => <<<END
                            RPS game started!
                            Please select an option.
                            END
                    ]
                ],
                'components' => [
                    ['type' => ActionRow, 'components' => [
                        ['type' => Button, 'style' => Secondary, 'label' => 'Rock', 'custom_id' => 'rps_rock'],
                        ['type' => Button, 'style' => Secondary, 'label' => 'Paper', 'custom_id' => 'rps_paper'],
                        ['type' => Button, 'style' => Secondary, 'label' => 'Scissor', 'custom_id' => 'rps_scissor']
                    ]]
                ]
            ]); break;
        }
    } else if ($dispatch['type'] == MESSAGE_COMPONENT) {
        switch ($data['custom_id']) {
        case 'rps_rock':
        case 'rps_paper':
        case 'rps_scissor':
            $com = ['rps_rock', 'rps_paper', 'rps_scissor'][rand(1, 3)];
            $res = '';
            switch ($data['custom_id'] + ' vs ' + $com) {
            case 'rps_rock vs rps_paper':
                $res = <<<END
                Computer wins against You!
                END; break;
            case 'rps_paper vs rps_scissor':
                $res = <<<END
                Computer wins against You!
                END; break;
            case 'rps_scissor vs rps_rock':
                $res = <<<END
                Computer wins against You!
                END; break;
            case 'rps_paper vs rps_rock':
                $res = <<<END
                You win against Computer!
                END; break;
            case 'rps_scissor vs rps_paper':
                $res = <<<END
                You win against Computer!
                END; break;
            case 'rps_rock vs rps_scissor':
                $res = <<<END
                You win against Computer!
                END; break;
            }
        }
    }
}

?>