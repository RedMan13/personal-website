<?= json_encode([
    gmdate('r'), 
    # ensure that we never echo back anything larger then 50mb
    substr(file_get_contents('php://input'), 0, 8388608)
]); ?>
