// answersToRadioOptions
//  helper function that creates html radio buttons based on an array of text strings
//  representing possible answers to a multiple choice question
function answersToRadioOptions( answers, name, randomize, feedback ) {
    var getArrayIdxs = function( arr ) {
        var result = new Array( arr.length );
        for ( var i=0; i<result.length; i++ ) result[i]=i;
        return result;
    }
    var answersIdxs = (randomize==true) ? shuffle( getArrayIdxs( answers ) ) : getArrayIdxs( answers );
    randomize   = ( randomize===undefined ) ? true : randomize ;
    feedback    = ( feedback===undefined ) ? false : feedback ;
    var result  = "";
    result += "<table id='" + name + "_wrapper' cellpadding=3 style='width: 100%; text-align: left; vertical-align: middle'>";
    for ( var i=0; i<answers.length; i++ ) {
        result += "<tr>";
        result += "<td style='width: 2%'><input type='radio' name='" + name + "' value='" + answersIdxs[i] + "'></td>";
        result += "<td style='width: 48%; height:44px'>" + answers[answersIdxs[i]] + "</td>";   
        // sooo ugly! Setting the cell height in this way guarantees that adding the feedback text won't enlarge the table
        // It depends on knowing in advance the amount and size of the feedback text
        if ( i==0 ) {
            result += "<td id='" + name + "_feedback' rowspan='" + answers.length + "' style='width: 50%'></td>";
        }
        result += "</tr>";
    }
    result += "</table>";
    return result;
}

// createProgressBar
//  creates the HTML for a row of stars indicating # complete out of # total,
//  with width equal to that of the div with id target - 100
function createProgressBar( complete, total ) {
    var width   = $('#target').width()-200;
    var height  = 20; 
    var padding = 3;
    var content = "<table><tr><td style='vertical-align:middle; width: "+150+"px'>Your progress:  </td><td>";
    content     += "<div style='background-color: gray; border-radius: "+((height/2)+padding)+"px; padding: "+padding+"px; width: "+width+"px'>";
    content     += "<div style='background-color: #00FF99; width: "+(Math.floor(100*complete/total))+"%; height: "+height+"px; border-radius: "+(height/2)+"px'>";
    // content     += "<div style='background-color: green; width: 40%; height: "+height+"px; border-radius: "+(height/2)+"px'>";
    content     += "</div></div></td></tr></table><br>";
    return content;
}

// alertBox
//  displays a jQuery UI dialog box using the text provided,
//  running an optional callback function when the box is closed
function alertBox( target, content, callback ) {
    // alert( "This is a dialog box" );
    target.append( "<div id='dialog' title='Basic Dialog'>" + content + "</div>" );
    $('#dialog').dialog( {
        "modal": true,
        "draggable": false,
        "resizable": false,
        "width": 1000, 
        "height": 450,
        "buttons": [ { "text": "OK", "click": function() { $( this ).dialog( "close" ); } } ],
        "close": ((callback==undefined) ? function(){} : callback )
        } );
    $('.ui-dialog-titlebar').css( { "visibility": "hidden" } );
}

//////////////////////////////////////
// scmvar_test plugin for jspsych
//////////////////////////////////////

( function ( $ ) {

    jsPsych.scmvar_test = (function() {
    
        var plugin = {};
        
        plugin.create = function( params ) {
        
            var trials = new Array( params.questions.length );
            
            for ( var i=0; i<trials.length; i++ ) {
                trials[i] = {};
                trials[i]["type"]       = "scmvar_test";
                trials[i]["mode"]       = (params.mode==undefined) ? "forced" : params.mode;
                trials[i]["timing"]     = (params.timing==undefined) ? 250 : params.timing;
                trials[i]["progress"]   = (params.progress==undefined) ? false : params.progress;
                trials[i]["question"]   = params.questions[i];
            }
                
            return trials;
            
        }
        
        plugin.trial = function( $this, block, trial, part ) {
        
            // variables used to specify page content
            var text_list, ans_list, key_list, trial_data, num_ques;
            
            // variables used to record user data
            var start_time, responses, accuracies, valid;
                        
            // in the test plugin, the question comes pre-instantiated, so we save its information directly:
            text_list   = trial.question.text_list;
            ans_list    = trial.question.ans_list;
            key_list    = trial.question.key_list;
            trial_data  = trial.question.data;
            num_ques    = text_list.length;
            
            var writePage = function() {
                // generate content and write to $this
                var content = "";
                if ( trial.progress ) {
                    content += createProgressBar( block.trial_idx, block.trials.length );
                }
                for ( var i=0; i<num_ques; i++ ) {
                    content += text_list[i];
                    content += answersToRadioOptions( ans_list[i], "radio_options_"+i, true );
                }
                content += "<p><button id='submit_button' type='button'>Submit</button></p>";
                $this.html( content );
                $('#submit_button').click( nextPage );
                // record start time
                start_time = ( new Date() ).getTime();
                // answer questions or focus on submit if in auto or free mode
                if ( trial.mode=="auto" ) {
                    var answer;
                    for ( i=0; i<num_ques; i++ ) {
                        answer = Math.floor( Math.random() * ans_list[i].length );
                        // $('input[name=radio_options_'+i+']:eq('+answer+')').attr('checked','checked');
                        $('input[name=radio_options_'+i+'][value='+answer+']').attr('checked','checked');
                    }
                    $('#submit_button').click();
                } else {
                    if ( trial.mode=="free" ) {
                        $('#submit_button').focus();
                    }
                    window.scrollTo(0,0);
                }
            }
            
            var nextPage = function() {
                // record responses and also their validity and accuracy
                responses   = new Array( num_ques );
                accuracies  = new Array( num_ques );
                valid       = true;
                for ( var i=0; i<num_ques; i++ ) {
                    responses[i]  = $('input[name=radio_options_'+i+']:checked').val();
                    if ( responses[i]===undefined ) { valid = false; }
                    accuracies[i] = Number( responses[i]==key_list[i] );
                }
                // if invalid, alert user, otherwise advance to next trial
                if ( ( trial.mode=="forced" ) && ( !valid ) ) {
                    alertBox( $this, "Please select an option for each question before proceeding." );
                    // alert( "Please select an option for each question before proceeding." );
                } else {
                    console.log( "jsPsych.scmvar_test responses: " + responses.toString() + " with key " + key_list.toString() + ". accuracy: " + accuracies.toString() );
                    trial_data = $.extend( trial_data,
                        { "mult_responses": responses.toString(),
                          "mult_accuracies": accuracies.toString(),
                          "mult_accuracy_total": sum( accuracies ),
                          "accuracy": ( sum( accuracies ) / accuracies.length ),
                          "rt": (new Date()).getTime()-start_time } );
                    block.data[block.trial_idx] = trial_data;
                    $this.html('');
                    $('#submit_button').unbind( 'click', nextPage );
                    setTimeout( function(){block.next();}, trial.timing );
                }
            }
                
            writePage();
		}
        
		return plugin;
	})();
}) (jQuery);


//////////////////////////////////////
// scmvar_training plugin for jspsych
//////////////////////////////////////

( function ( $ ) {

    jsPsych.scmvar_training = (function() {
    
        var plugin = {};
        
        plugin.create = function( params ) {
        
            var trials = new Array( params.num_questions );
            
            for ( var i=0; i<trials.length; i++ ) {
                trials[i] = {};
                trials[i]["type"]       = "scmvar_training";
                trials[i]["mode"]       = (params.mode==undefined) ? "forced" : params.mode;        // auto, free, or forced
                trials[i]["timing"]     = (params.timing==undefined) ? 250 : params.timing;         // inter trial interval
                trials[i]["progress"]   = (params.progress==undefined) ? false : params.progress;   // should a progress bar be displayed?
                trials[i]["feedback"]   = (params.feedback==undefined) ? false : params.feedback;   // should feedback be displayed?
                trials[i]["selector"]   = params.selector;                                          // generates trial content
            }
                
            return trials;
            
        }
        
        plugin.trial = function( $this, block, trial, part ) {
        
            // select the question object to be used on this trial
            trial.question  = trial.selector.select( block.trial_idx, block.data.slice(0,block.trial_idx) );   
            
            // variables used to specify page content
            var text_list, ans_list, key_list, trial_data, num_ques;
            
            // variables used to record user data
            var start_time, responses, accuracies, valid, falsetries=0;
            
            // // in the training plugin, the question is instantiated at run time
            // trial.question.instantiate( "Training", block.trial_idx );
            // text_list   = trial.question.text_list;
            // ans_list    = trial.question.ans_list;
            // key_list    = trial.question.key_list;
            // trial_data  = trial.question.data;
            // num_ques    = text_list.length;
            
            var writePage = function() {
                // in the training plugin, the question is instantiated at run time
                trial.question.instantiate( "Training", block.trial_idx );
                text_list   = trial.question.text_list;
                ans_list    = trial.question.ans_list;
                key_list    = trial.question.key_list;
                trial_data  = trial.question.data;
                num_ques    = text_list.length;
                // generate content and write to $this
                var content = "";
                if ( trial.progress ) {
                    content += createProgressBar( block.trial_idx, block.trials.length );
                }
                for ( var i=0; i<num_ques; i++ ) {
                    content += text_list[i];
                    content += answersToRadioOptions( ans_list[i], "radio_options_"+i, true, true );
                }
                content += "<div id='feedback'></div>";
                content += "<p><button id='submit_button' type='button'>Submit</button></p>";
                $this.html( content );
                $('#submit_button').click( nextPage );
                // record start time
                start_time = ( new Date() ).getTime();
                // answer questions or focus on submit if in auto or free mode
                if ( trial.mode=="auto" ) {
                    var answer;
                    for ( i=0; i<num_ques; i++ ) {
                        answer = key_list[i];
                        // $('input[name=radio_options_'+i+']:eq('+answer+')').attr('checked','checked');
                        $('input[name=radio_options_'+i+'][value='+answer+']').attr('checked','checked');
                    }
                    $('#submit_button').click();
                } else {
                    if ( trial.mode=="free" ) {
                        $('#submit_button').focus();
                    }
                    window.scrollTo(0,0);
                }
            }
            
            var nextPage = function() {
                // advanceTrial will end the trial
                var advanceTrial = function() {
                    trial_data.falsetries = falsetries;
                    block.data[block.trial_idx] = trial_data;
                    $this.html('');
                    $('#submit_button').unbind( 'click', nextPage );
                    setTimeout( function(){block.next();}, trial.timing );
                }
                /*
                // remove any leftover feedback from a previous submission
                if ( trial.feedback ) {
                    for ( var i=0; i<num_ques; i++ ) {
                        $('#radio_options_'+i+'_wrapper').removeClass( "incorrect" );
                        $('#radio_options_'+i+'_feedback').removeClass( "incorrect_feedback" );
                        $('#radio_options_'+i+'_feedback').html( "" );
                    }
                }
                */
                // get user input
                responses   = new Array( num_ques );
                accuracies  = new Array( num_ques );
                valid       = true;
                for ( var i=0; i<num_ques; i++ ) {
                    responses[i]  = $('input[name=radio_options_'+i+']:checked').val();
                    if ( responses[i]===undefined ) { valid = false; }
                    accuracies[i] = Number( responses[i]==key_list[i] );
                }
                if ( !valid ) {
                // if any questions are not answered, alert the user, unless in free mode
                    if ( trial.mode=="free" ) {
                        advanceTrial();
                    } else {
                        alertBox( $this, "Please select an option for each question before proceeding." );
                    }
                } else {
                    if ( trial_data.mult_responses==undefined ) {
                    // if this is the first time a valid response was submitted, record data (falsetries is added to data later)
                        console.log( "jsPsych.scmvar_training responses: " + responses.toString() + " with key " + key_list.toString() + ". accuracy: " + accuracies.toString() );
                        trial_data = $.extend( trial_data,
                            { "mult_responses": responses.toString(),
                              "mult_accuracies": accuracies.toString(),
                              "mult_accuracy_total": sum( accuracies ),
                              "accuracy": ( sum( accuracies ) / accuracies.length ),
                              "rt": (new Date()).getTime()-start_time } );
                    }
                    if ( (mode!="auto") && trial.feedback ) {
                    // if trial specifications require feedback, then give it
                        var feedback = trial.question.feedback( accuracies, trial.mode );
                        if ( Math.min.apply( null, accuracies )==0 ) {
                            // if any responses are incorrect, record the failed attempt
                            falsetries += 1;
                            // mark and add feedback to any incorrect responses, and deactivate radio buttons
                            for ( var i=0; i<num_ques; i++ ) {
                                if ( accuracies[i]==0 ) {
                                    $('#radio_options_'+i+'_wrapper').addClass( "incorrect" );
                                    $('#radio_options_'+i+'_feedback').addClass( "incorrect_feedback" );
                                    $('#radio_options_'+i+'_feedback').html( feedback.by_question[i] );
                                }
                                $('input[name="radio_options_'+i+'"]').attr( 'disabled', 'disabled' );
                            }
                            // if this is the 1st-3rd error, make them do over, otherwise let go on
                            if ( falsetries<=3 ) {
                                // set submit button to rewrite page and disable it
                                $('#submit_button').unbind( 'click', nextPage );
                                $('#submit_button').click( function() { setTimeout( writePage, 250 ); } );
                                $('#submit_button').html( 'Try again' );
                                $('#submit_button').attr( 'disabled', 'disabled' );
                                // show feedback and reactivate submit button once it is dismissed
                                alertBox( $this, feedback.overall,
                                    function() { setTimeout( function() { $('#submit_button').attr( 'disabled', false ); }, 5000 ); } );
                            } else {
                                // show feedback and advance trial once it is dismissed
                                alertBox( $this, "<p><img src='images/small-red-x-mark-th.png' class='icon'>  There are still one or more incorrect answers. Let's try a different problem instead.</p>", advanceTrial );
                            }
                        } else {
                            // otherwise deliver positive feedback and advance trial when it is dismissed
                            alertBox( $this, feedback.overall, advanceTrial );
                        }
                        trial_data["falsetries"] = falsetries;
                    } else {
                    // otherwise just advance the trial
                        advanceTrial();
                    }
                }
            }
            
            writePage();
		}
        
		return plugin;
	})();
}) (jQuery);
