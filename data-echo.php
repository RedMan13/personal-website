<?= json_encode([
    # convert the unix (seconds) time stamp to js (miliseconds) timestamp
    time() * 1000, 
    # ensure that we never echo back anything larger then 50mb
    substr($_GET['data'], 0, 500)
]); ?>
