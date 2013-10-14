<?php

// adapted from http://www.daniweb.com/web-development/php/code/236476/export-csv-to-mysql-and-import-to-csv-from-mysql-in-php

function exportMysqlToCsv($table,$filename = 'filename.CSV')
{

$csv_output     = "";
$query          = "SELECT * FROM $table";
$result         = mysql_query($query);
$colCount       = mysql_num_fields($result);  //this is the colCount

// get row names
$i              = $colCount;
for($j = 0; $j < $i; $j++) {
   $rowr = mysql_field_name($result, $j);
   $csv_output .= '"' . $rowr . "\",";
}
$csv_output = rtrim($csv_output, ","); 
$csv_output .= "\n";

// get content
while ($rowr = mysql_fetch_row($result))
{
   for ($j=0;$j<$i-1;$j++)
   {
//      $csv_output .='"'.$rowr[$j]."\",";
//      $out = $rowr[$j];
      $out = str_replace('"',':',(string)$rowr[$j]);
      $csv_output .='"'.$out."\",";
   }
   $csv_output .='"'.$rowr[$j]."\"";
//   $csv_output .='"'.str_replace('"',':',(string)$rowr[$j]."\"";
   $csv_output .= "\n";
}

// export to file
$fh = fopen($filename, 'w') or die("can't open file");
fwrite($fh, $csv_output);
fclose($fh);

// $csv_terminated = "\n";
// $csv_separator = ",";
// $csv_enclosed = '"';
// $csv_escaped = "\\";
// $sql_query = "select * from $table";
// // Gets the data from the database
// $result = mysql_query($sql_query);
// $fields_cnt = mysql_num_fields($result);
// $schema_insert = '';
// /* for ($i = 0; $i < $fields_cnt; $i++)
// {
// $l = $csv_enclosed . str_replace($csv_enclosed, $csv_escaped . $csv_enclosed, stripslashes(mysql_field_name($result, $i)));
// $schema_insert .= $l;
// $schema_insert .= $csv_separator;
// } */// end for
// // $out = trim(substr($schema_insert, 0, -1));
// // $out .= $csv_terminated;
// // Format the data
// while ($row = mysql_fetch_array($result))
// {
// $schema_insert = '';
// for ($j = 0; $j < $fields_cnt; $j++)
// {
// if ($row[$j] == '0' || $row[$j] != '')
// {
// if ($csv_enclosed == '')
// {
// $schema_insert .= $row[$j];
// } else
// {
// $schema_insert .= $csv_enclosed .
// str_replace($csv_enclosed, $csv_escaped . $csv_enclosed, $row[$j]) . $csv_enclosed;
// }
// } else
// {
// $schema_insert .= '';
// }
// if ($j < $fields_cnt - 1)
// {
// $schema_insert .= $csv_separator;
// }
// } // end for
// $out .= $schema_insert;
// $out .= $csv_terminated;
// } // end while

// if($out)
// {
// // echo $out;
// $fh = fopen($filename, 'w') or die("can't open file");
// fwrite($fh, $out);
// fclose($fh);

// $table="table_csv";
// mysql_query("TRUNCATE $table");
// }
// exit;
}

?>