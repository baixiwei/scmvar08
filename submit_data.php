<html>
<body>

<?php

// connect to database dbraithwaite
include('database_connect.php');

// set table name and create the table if needed
$table = $_POST['table'];
createTable( $table );

// receive data from experiment and strip empty blocks
$my_obj = json_decode($_POST['json']);
$trials = $my_obj[0];
for ( $i=1; $i<count($my_obj); $i++ ) {
	if(count($my_obj[$i])>0) {
		$trials = array_merge($trials, $my_obj[$i]);
	}
}

// insert data into database
function mysql_insert( $table, $inserts ) {
    $values = array_map('mysql_real_escape_string', array_values($inserts));
    $keys   = array_keys($inserts);
    return mysql_query('INSERT INTO `'.$table.'` (`'.implode('`,`', $keys).'`) VALUES (\''.implode('\',\'', $values).'\')');
}

for ( $i=0;$i<count($trials);$i++ ) {
    $to_insert              = (array)($trials[$i]);
//    var_dump($to_insert);
    $result = mysql_insert($table, $to_insert);
}

// confirm the results
if (!$result) {
	die('Invalid query: ' . mysql_error());
} else {
	print "successful insert!";
}

// export to csv

$file   = 'data/'.$table.'_data.csv';
unlink( $file );
include 'mysql_to_csv.php';
exportMysqlToCsv($table,$file);

?>

</body>
</html>