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
$subjid = $_POST['subjid'];
$table  = $_POST['table'];
$subjid = (string)(rand(0,10000000));
$table  = 'scmvar_08_testing';
createTable( $table );

// name the conditions
$numcond        = 5;
$NONVARIED      = 0;
$ADAPTIVE       = 1;
$YOKED_RANDOM   = 2;
$YOKED_BLOCKED  = 3;
$YOKED_CLONE    = 4;

// given an array of numbers, creates an array of probabilities
// assigning equal probabilities to all numbers equal to the min of the original array and zero probability to all other numbers
function completes_to_probs( $arr ) {
    $weights = array();
    for ( $i=0; $i<count($arr); $i++ ) {
        $weights[$i] = ($arr[$i]==min($arr)) ? 1.0 : 0.0;
    }
    $probs = array();
    for ( $i=0; $i<count($arr); $i++ ) {
        $probs[$i] = $weights[$i]/array_sum($weights);
    }
    return $probs;
}

// given an array of probabilities, choose an array index according to those probabilities
function select_by_probs( $probs ) {
    $rand_val = mt_rand() / mt_getrandmax();
    $idx = 0;
    for ( $i=0; $i<count($probs); $i++ ) {
        if($rand_val <= $probs[$i]) {
            $idx = $i;
            break;
        } else {
            $rand_val = $rand_val - $probs[$i];
        }
    }
    return $idx;
}

// given an array of completions by condition and a selected condition, check whether it meets our criteria
// specifically, we require that yoked conditions are only chosen if they have fewer completes than the adaptive condition
// this requirement helps ensure that, in the yoked condition, yoking targets can be balanced among everyone in the adaptive condition
function validate_condition( $cond, $completes ) {
    global $NONVARIED, $ADAPTIVE, $YOKED_RANDOM, $YOKED_BLOCKED, $YOKED_CLONE;
    if ( ( $cond==$NONVARIED ) or ( $cond==$ADAPTIVE ) ) {
        return true;
    } else if ( ( $cond==$YOKED_RANDOM ) or ( $cond==$YOKED_BLOCKED ) or ( $cond==$YOKED_CLONE ) ) {
        return ( $completes[ $cond ] < $completes[ $ADAPTIVE ] );
    }
}

// record number of completes per condition
// (MIGHT WISH TO CHANGE THIS NAME IF WE STICK WITH COUNTERBALANCING BY ASSIGNMENT INSTEAD OF COMPLETION)
$completes  = array_fill( 0, $numcond, 0 );
$query      = 'SELECT `condition`, COUNT(DISTINCT subjid) FROM '.mysql_real_escape_string($table).' GROUP BY `condition`';
$result     = mysql_query($query);
while ( $row = mysql_fetch_array($result) ) {
	$completes[intval($row['condition'])] = intval($row['COUNT(DISTINCT subjid)']);
}

echo json_encode( $completes ) . "<br>";

// select a condition randomly from among those with min completes,
// ensuring that the above validation condition(s) are met
$probs = completes_to_probs( $completes );
do {
    $cond = select_by_probs( $probs );
} while ( ! validate_condition( $cond, $completes ) );

echo json_encode( $probs ) . "<br>";

if ( ( $cond==$NONVARIED ) or ( $cond==$ADAPTIVE ) ) {
    // if condition is nonvaried or adaptive, we need to select a version
    // version determines which schema is used (nonvaried) or the order in which schemas are used (adaptive)
    // first determine number of different versions among which we need to select
    if ( $cond==$NONVARIED ) {
        $num_versions = 3;  // one version for each of 3 training schemas
    } else if ( $cond==$ADAPTIVE ) {
        $num_versions = 6;  // one version for each *order* of the 3 training schemas
    }
    // record number of completes by version within given condition
    $completes_by_version = array_fill( 0, $num_versions, 0 );
    $query      = 'SELECT `version`, COUNT(DISTINCT subjid) FROM '.mysql_real_escape_string($table).' WHERE `condition`='.$cond.' GROUP BY `version`';
    $result     = mysql_query($query);
    while ( $row = mysql_fetch_array($result) ) {
        $completes_by_version[intval($row['version'])] = intval($row['COUNT(DISTINCT subjid)']);
    }
    // select a version randomly from among those with min completes
    $version    = select_by_probs( completes_to_probs( $completes_by_version ) );
    // record condition and version to params
    $params     = array(
        'condition' => (string)$cond,
        'version'   => (string)$version
        );
    // record condition assignment to database
    $query  = 'INSERT INTO '.mysql_real_escape_string($table).' (subjid,`condition`,`version`) VALUES ("'.mysql_real_escape_string($subjid).'", '.mysql_real_escape_string($cond).', '.mysql_real_escape_string($version).')';
    $result = mysql_query($query);
} else if ( ( $cond==$YOKED_RANDOM ) or ( $cond==$YOKED_BLOCKED ) or ( $cond==$YOKED_CLONE ) ) {
    // if condition is any of the yoked conditions, we need to select which subject we're yoking to
    
/* This turns out to be tricky. Here's how I think it can work:
Maintain a list of candidate yoked subjids by condition.
Whenever someone completes the exp in the adaptive condition, add their subjid to that list once for each yoked condition.
Whenever someone starts the exp in any yoked condition, remove the yoked subjid from the list for that yoked condition.
When it's time to assign a new condition, exclude yoked conditions for which no yoked subjids are available.
...?
*/
    // record condition to params
    $params     = array( 
        'condition' => (string)$cond
        );
    // record condition assignment to database
    $query  = 'INSERT INTO '.mysql_real_escape_string($table).' (subjid,`condition`) VALUES ("'.mysql_real_escape_string($subjid).'", '.mysql_real_escape_string($cond).')';
    $result = mysql_query($query);
}


// return condition assignment
echo json_encode( $params );

?>