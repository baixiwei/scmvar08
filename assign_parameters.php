<?php

// global variables
$table              = $_POST['table'];              // name of mysql table where experiment data is stored
$subjid             = $_POST['subjid'];             // participant id
$pretest            = $_POST['pretest_accuracy'];   // accuracy on pretest
// $table              = 'scmvar_08_test';
// $subjid             = (string)(rand(0,10000000));
$numcond            = 4;                // experimental conditions
$NONVARIED          = 0;
$ADAPTIVE_VARIED    = 1;
$YOKED_VARIED       = 2;
$YOKED_INTERLEAVED  = 3;
$numsubcond         = 2;                // determines training version


// connect to the database and create table if it doesn't exist
include('database_connect.php');
createTable( $table );

// assign an experimental condition
function assignCondition() {
    $condition_weights = getWeightsCond();
    $condition = weightedSelect( $condition_weights );
    return $condition;
}

// assign a subcondition within a given experimental condition
function assignSubcondition( $condition ) {
    $subcondition_weights = getWeightsSubcond( $condition );
    $subcondition = weightedSelect( $subcondition_weights );
    return $subcondition;
}

// assign yoked subjid to a subject (used only when a yoked condition was selected)
function assignYokingSubjid( $condition ) {
    $subjids_weights = getWeightsYoking( $condition );
    $subjids = array_keys( $subjids_weights );
    $weights = array_values( $subjids_weights );
    $subjid_idx = weightedSelect( $weights );
    $subjid = $subjids[ $subjid_idx ];
    return $subjid;
}

// choose an index randomly according to a vector of weights, which need not sum to 1
function weightedSelect( $weights ) {
    $tot = array_sum( $weights );
    $r = lcg_value() * $tot;
    $n = count( $weights );
    do {
        for ( $i=0; $i<$n; $i++ ) {
            if ( $r<=$weights[$i] ) {
                $result = $i;
                break;
            } else {
                $r = $r-$weights[$i];
            }
        }
    } while( $weights[ $result ] == 0 );
    return $result;
}

// assign selection weight to each condition
function getWeightsCond() {

    global $table, $numcond, $pretest, $NONVARIED, $ADAPTIVE_VARIED, $YOKED_VARIED, $YOKED_INTERLEAVED;

    $assigned   = getAssignedCond( $table, $numcond, $pretest );
    $completed  = getCompletedCond( $table, $numcond, $pretest );
    
    $weights    = array_fill( 0, $numcond, 0 );
    // yoked conditions may only be selected if they have been assigned fewer times than the number of completions in the adaptive varied condition,
    // and each may only be assigned if its current assignments are <= those of the other
    if ( ( $assigned[ $YOKED_VARIED ] < $completed[ $ADAPTIVE_VARIED ] ) && ( $assigned[ $YOKED_VARIED ] <= $assigned[ $YOKED_INTERLEAVED ] ) ) {
        $weights[ $YOKED_VARIED ] = 1;
    }
    if ( ( $assigned[ $YOKED_INTERLEAVED ] < $completed[ $ADAPTIVE_VARIED ] ) && ( $assigned[ $YOKED_INTERLEAVED ] <= $assigned[ $YOKED_VARIED ] ) ) {
        $weights[ $YOKED_INTERLEAVED ] = 1;
    }
    // adaptive varied condition may only be selected if both yoked conditions are unassignable AND it has not been assigned more times than nonvaried
    if ( ( $weights[ $YOKED_VARIED ]==0 ) && ( $weights[ $YOKED_INTERLEAVED ]==0 ) && ( $assigned[ $ADAPTIVE_VARIED ]<=$assigned[ $NONVARIED ] ) ) {
        $weights[ $ADAPTIVE_VARIED ] = 1;
    }
    // nonvaried condition may only be selected if (1) both yoked conditions are unassignable AND it has not been assigned more times than adaptive varied, or (2) a yoked condition is assignable and it has been assigned fewer times than adaptive varied
    if ( ( $weights[ $YOKED_VARIED ]==0 ) && ( $weights[ $YOKED_INTERLEAVED ]==0 ) ) {
        if ( $assigned[ $NONVARIED ]<=$assigned[ $ADAPTIVE_VARIED ] ) {
            $weights[ $NONVARIED ] = 1;
        }
    } else if ( ( $weights[ $YOKED_VARIED ]>0 ) || ( $weights[ $YOKED_INTERLEAVED ]>0 ) ) {
        if ( $assigned[ $NONVARIED ]<$assigned[ $ADAPTIVE_VARIED ] ) {
            $weights[ $NONVARIED ] = 1;
        }
    }
    
    return $weights;
}

// assign selection weight to each subcondition, given a condition
function getWeightsSubcond( $condition ) {

    global $table, $pretest, $numsubcond;

    $assigned   = getAssignedSubcond( $table, $pretest, $condition, $numsubcond );
    $min_assn   = min( $assigned );
    $weights    = array_fill( 0, $numsubcond, 0 );
    for ( $i=0; $i<$numsubcond; $i++ ) {
        if ( $assigned[$i]==$min_assn ) {
            $weights[$i] = 1;
        }
    }

    return $weights;
    
}

// assign selection weight to each potential yoking target, given a (yoked) condition
function getWeightsYoking( $condition ) {

    global $table;
    
    $assigned   = getAssignedYoking( $table, $condition );
    $min_assn   = min( $assigned );
    $weights    = array();
    foreach( $assigned as $subjid => $num ) {
        if ( $num==$min_assn ) {
            $weights[$subjid] = 1;
        } else {
            $weights[$subjid] = 0;
        }
    }
    
    return $weights;
        
}

// find out how many times each condition has been assigned within the current level of pretest performance
function getAssignedCond( $table, $numcond, $pretest ) {
    
    // create array to hold # assigned per condition
    $assigned = array_fill( 0, $numcond, 0 );
    
    // query database to get actual number assigned per condition within the current level of pretest performance
    if ( $pretest <= 0.5 ) {
        $query      = 'SELECT `condition`, COUNT(DISTINCT `subjid`) FROM '.mysql_real_escape_string($table).' WHERE `pretest_accuracy`<=0.5 GROUP BY `condition`';
    } else {
        $query      = 'SELECT `condition`, COUNT(DISTINCT `subjid`) FROM '.mysql_real_escape_string($table).' WHERE `pretest_accuracy`>0.5 GROUP BY `condition`';
    }
    $result     = mysql_query($query);
    while ( $row = mysql_fetch_array($result) ) {
        $assigned[intval($row['condition'])] = intval($row['COUNT(DISTINCT `subjid`)']);
    }
    
    // return the result
    return $assigned;

}

// find out how many times each condition has been completed within the current level of pretest performance
function getCompletedCond( $table, $numcond, $pretest ) {
    
    // create array to hold # complete per condition
    $completed = array_fill( 0, $numcond, 0 );
    
    // query database to get actual number completed per condition within the current level of pretest performance
    if ( $pretest <= 0.5 ) {
        $query      = 'SELECT `condition`, COUNT(DISTINCT `subjid`) FROM '.mysql_real_escape_string($table).' WHERE (`end` is not null)&&(`pretest_accuracy`<=0.5) GROUP BY `condition`';
    } else {
        $query      = 'SELECT `condition`, COUNT(DISTINCT `subjid`) FROM '.mysql_real_escape_string($table).' WHERE (`end` is not null)&&(`pretest_accuracy`>0.5) GROUP BY `condition`';
    }
    $result     = mysql_query($query);
    while ( $row = mysql_fetch_array($result) ) {
        $completed[intval($row['condition'])] = intval($row['COUNT(DISTINCT `subjid`)']);
    }
    
    // return the result
    return $completed;

}

// find out how many times each subcondition has been assigned within a given condition within the current level of pretest performance
function getAssignedSubcond( $table, $pretest, $condition, $numsubcond ) {

    // create array to hold # complete per subcondition within given condition
    $assigned = array_fill( 0, $numsubcond, 0 );

    // query database to get actual number complete per subcondition within given condition within the current level of pretest performance
    if ( $pretest <= 0.5 ) {
        $query      = 'SELECT `subcondition`, COUNT(DISTINCT `subjid`) FROM '.mysql_real_escape_string($table).' WHERE (`condition`='.$condition.')&&(`pretest_accuracy`<=0.5) GROUP BY `subcondition`';
    } else {
        $query      = 'SELECT `subcondition`, COUNT(DISTINCT `subjid`) FROM '.mysql_real_escape_string($table).' WHERE (`condition`='.$condition.')&&(`pretest_accuracy`>0.5) GROUP BY `subcondition`';
    }
    $result     = mysql_query($query);
    while ( $row = mysql_fetch_array($result) ) {
        $assigned[intval($row['subcondition'])] = intval($row['COUNT(DISTINCT `subjid`)']);
    }

    // return the result
    return $assigned;
    
}

// find out how many times each subjid in the adaptive varied condition has been assigned as a yoked subjid in a given (yoked) condition
function getAssignedYoking( $table, $condition ) {

    global $ADAPTIVE_VARIED;

    // create list of subjids already completed in adaptive varied condition
    $assigned   = array();
    $query      = 'SELECT DISTINCT `subjid` FROM '.mysql_real_escape_string($table).' WHERE (`condition`='.$ADAPTIVE_VARIED.')&&(`end` is not null)';
    $result     = mysql_query($query);
    while( $row = mysql_fetch_array($result) ) {
        $assigned[ $row['subjid'] ] = 0;
    }
    
    // find out how many times each subjid has already been used (assigned) in the present (yoked) condition
    $query      = 'SELECT `yokingSubjid`, COUNT(DISTINCT `subjid`) FROM '.mysql_real_escape_string($table).' WHERE `condition`='.$condition.' GROUP BY `yokingSubjid`';
    $result     = mysql_query($query);
    while ( $row = mysql_fetch_array($result) ) {
        if ( !empty( $row['yokingSubjid'] ) ) {
            $assigned[$row['yokingSubjid']] = intval($row['COUNT(DISTINCT `subjid`)']);
        }
    }
    
    // return the result
    return $assigned;

}

// get the sequence of question IDs used during training for a given yoked subjid
function getYokingSequence( $table, $yoking_subjid ) {
    $sequence   = array();
    $query      = 'SELECT `number`, `quesID` FROM '.mysql_real_escape_string($table).' WHERE (`subjid`="'.$yoking_subjid.'")&&(`section`="Training")';
    $result     = mysql_query($query);
    while( $row = mysql_fetch_array($result) ) {
        $sequence[ intval($row['number']) ] = intval($row['quesID']);
    }
    ksort( $sequence );
    return $sequence;
}

// record assignments to database
function recordAssignments( $table, $subjid, $condition, $subcondition, $yokingSubjid ) {
    $query  = 'INSERT INTO '.mysql_real_escape_string($table).' (subjid,`condition`,`subcondition`,`yokingSubjid`) VALUES ("'.mysql_real_escape_string($subjid).'", '.mysql_real_escape_string($condition).', ' . mysql_real_escape_string($subcondition) . ', "' . mysql_real_escape_string($yokingSubjid) . '")';
    $result = mysql_query($query);
}


// testing
/*
$condition = $YOKED_VARIED;
$yokingSubjid   = assignYokingSubjid( $condition );
print "<pre>";
print $yokingSubjid . "<br>";
print_r( getYokingSequence( $table, $yokingSubjid ) );
print "</pre>";
*/

$condition      = assignCondition();
$subcondition   = assignSubcondition( $condition );
if ( ( $condition==$YOKED_VARIED ) || ( $condition==$YOKED_INTERLEAVED ) ) {
    $yokingSubjid   = assignYokingSubjid( $condition );
    $yokingSeq      = getYokingSequence( $table, $yokingSubjid );
} else {
    $yokingSubjid   = "";
    $yokingSeq      = array();
}

$result = array(
    'condition'     => $condition,
    'subcondition'  => $subcondition,
    'yokingSubjid'  => $yokingSubjid,
    'yokingSeq'     => $yokingSeq
    );
  
echo json_encode( $result );

recordAssignments( $table, $subjid, $condition, $subcondition, $yokingSubjid );


?>