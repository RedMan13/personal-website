<?php 
# ensure that we never echo back anything larger then 50mb
echo json_encode([round(microtime(true) * 1000), substr($_GET['data'], 0, 500)]);
?>