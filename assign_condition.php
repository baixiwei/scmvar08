<?php

// Picks a condition at random from among those with the minimum number of Ss so far assigned

// Sample usage in javascript:
//
/* 

// Use jQuery ajax call to invoke php script
// Set path to this script in url argument
// data argument needs following parameters:
// 		"table": name of table in mysql database that has experiment data
//          "table" must have columns "condition" and "subjid"
// 		"numcond": number of conditions
//      "subjid": id of current subject
// When the ajax call is complete, data will be a string = to the randomly chosen condition number
$.ajax({
	type: 'post',
	cache: false,
	url: 'assign_condition.php',
	data: {"table": table, "numcond": numcond, "subjid": subjid},
	success: function(data) { console.log(data); }
});

*/

// connect to the database and create table if it doesn't exist
include('database_connect.php');
$table          = $_POST['table'];
createTable( $table );


// get number of conditions and create array to hold # complete per condition
$numcond    = $_POST['numcond'];
$current_numbers = array();
for ( $i=0; $i<$numcond; $i++ ) {
        $current_numbers[$i] = 0;
}

// query database to get actual number complete per condition
$query      = 'SELECT `condition`, COUNT(DISTINCT subjid) FROM '.mysql_real_escape_string($table).' GROUP BY `condition`';
$result     = mysql_query($query);
while ( $row = mysql_fetch_array($result) ) {
	$current_numbers[intval($row['condition'])] = intval($row['COUNT(DISTINCT subjid)']);
}

// calculate probability of assignment for each condition
$probabilities  = array();
$min_curr_num   = min( $current_numbers );
$num_contenders = 0;
for ( $i=0; $i<$numcond; $i++ ) {
    if ( $current_numbers[$i] == $min_curr_num ) {
        $probabilities[$i] = 1.0;
        $num_contenders += 1;
    } else {
        $probabilities[$i] = 0.0;
    }
}
for ( $i=0; $i<$numcond; $i++ ) {
	$probabilities[$i] = $probabilities[$i] / $num_contenders;
}

// randomly assign condition based on calculated probabilities
$rand_val = mt_rand() / mt_getrandmax();
$final_condition = "";
for ( $i=0; $i<$numcond; $i++ ) {
	if($rand_val <= $probabilities[$i]) {
		$final_condition = $i;
		break;
	} else {
        $rand_val = $rand_val - $probabilities[$i];
    }
}

// record condition assignment to database
$subjid = $_POST['subjid'];
$query  = 'INSERT INTO '.mysql_real_escape_string($table).' (subjid,`condition`) VALUES ("'.mysql_real_escape_string($subjid).'", '.mysql_real_escape_string($final_condition).')';
$result = mysql_query($query);

// return condition assignment
echo $final_condition;

?>