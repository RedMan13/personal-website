<?= json_encode([
    gmdate('Uv'), 
    # ensure that we never echo back anything larger then 50mb
    substr($_GET['data'], 0, 500)
]); ?>
