//////////////////////////////////
// utility
//////////////////////////////////

// addTextBlock
//  quickly create a block of text pages for the survey plugin
function addTextBlock( exp_struct, mode, section, text_list ) {
    var specs = [], data = [];
    for ( var i=0; i<text_list.length; i++ ) {
        specs.push( { "plugin": "text", "text": text_list[i] } );
        data.push( { "section": section, "number": i } );
    }
    exp_struct.push( { "type": "survey", "mode": mode, "timing": 250, "specs": specs, "data": data } );
}

//////////////////////////////////
// survey plugin for jspsych
//////////////////////////////////

( function ( $ ) {

    jsPsych.survey = (function() {
    
        var plugin = {};
        
        plugin.create = function( params ) {
        
            var trials = new Array( params.specs.length );
            
            for ( var i=0; i<trials.length; i++ ) {
            
                // block-level parameters
                trials[i] = {};
                trials[i]["type"]           = "survey";
                trials[i]["mode"]           = params.mode;
                trials[i]["timing"]         = params.timing;
                
                // trial-level parameters
                trials[i]["plugin"]         = params.specs[i]["plugin"];
                if ( trials[i]["plugin"] == "text" ) {
                    trials[i]["text"]       = params.specs[i].text;
                } else if ( trials[i]["plugin"] == "essay" ) {
                    trials[i]["text"]       = params.specs[i].text;
                } else if ( ( trials[i]["plugin"] == "radio" ) || ( trials[i]["plugin"] == "radio-multiple" ) ) {
                    trials[i]["text"]       = params.specs[i].text;
                    trials[i]["answers"]    = params.specs[i].answers;
                    if ( params.specs[i].grid===undefined ) {
                        trials[i]["grid"] = false;
                    } else {
                        trials[i]["grid"] = params.specs[i].grid;
                    }
                    if ( params.specs[i].key != undefined ) {
                        trials[i]["key"]    = params.specs[i].key;
                        trials[i]["feedback"] = params.specs[i].feedback;
                    } else {
                        trials[i]["feedback"] = false;
                    }
                } else if ( trials[i]["plugin"] == "radio-essay" ) {
                    trials[i]["text"]       = params.specs[i].text;
                    trials[i]["answers"]    = params.specs[i].answers;
                } else if ( trials[i]["plugin"] == "number" ) {
                    trials[i]["text"]       = params.specs[i].text;
                    trials[i]["minimum"]    = params.specs[i].minimum;
                    trials[i]["maximum"]    = params.specs[i].maximum;
                    trials[i]["answers"]    = params.specs[i].answers;                
                } else if ( trials[i]["plugin"] == "checkbox" ) {
                    trials[i]["text"]       = params.specs[i].text;
                    trials[i]["answers"]    = params.specs[i].answers;
                }
                
                // trial data (can be either block- or trial-level)
                if ( jQuery.type( params.data ) == "string" ) {
                    trials[i]["data"]       = { "title": params.data[i], "number": i };
                } else if ( jQuery.type( params.data ) == "array" ) {
                    trials[i]["data"]       = params.data[i];
                } else {
                    trials[i]["data"]       = {};
                }
                
            }
            
                
            return trials;
            
        }
        
        plugin.trial = function( $this, block, trial, part ) {
            
            var content; var writePage; var nextPage;
            var falsetries=0;
            var startTime; var endTime; var rt; 
            var trial_data;

            if ( trial.plugin=="text" ) {
                writePage = function() {
                    content = trial.text;
                    content += '<p><form id="plugin_form" name="plugin_form" action=""><input id="submit_button" type="submit" name="submit_button" value="Continue"></form></p>';
                    $this.html( content );
                }
                nextPage = function(e) {
                    e.preventDefault();
                    endTime     = (new Date()).getTime();
                    rt          = (endTime-startTime);
                    trial_data  = {"rt": rt};
                    block.data[block.trial_idx] = $.extend({},trial.data,trial_data);
                    $('#plugin_form').unbind( 'submit', nextPage );
                    $this.html('');
                    $this.css( "width", w );
                    $this.css( "text-align", t );
                    setTimeout( function(){block.next();}, trial.timing );
                }
            } else if ( trial.plugin=="essay" ) {
                writePage = function() {
                    content     = trial.text;
                    content     += "<form id='plugin_form' name='plugin_form' action='' method='GET'>";
                    content     += "<p><textarea id='essay_area' cols='80' rows='6'></textarea></p>";
                    content     += "<br><input type='submit' id='submit_button' name='submit_button' value='Submit'></form>";
                    $this.html( content );
                    if ( trial.mode=="auto" ) { $('#essay_area').val( "random text" ); }
                }
                nextPage = function(e) {
                    e.preventDefault();
                    var response = $('#essay_area').val();
                    if ( ( mode == "forced" ) && ( ( response == undefined ) || ( response == "" ) ) ) {
                        alert( "Please type a response in the box before proceeding." );
                        // falsetries++;
                    } else {
                        console.log( "jsPsych.survey essay response: " + response );
                        endTime     = (new Date()).getTime();
                        rt          = (endTime-startTime);
                        trial_data  = { "text_response": response, "rt": rt, "falsetries": falsetries }
                        block.data[block.trial_idx] = $.extend({},trial.data,trial_data);
                        $('#plugin_form').unbind( 'submit', nextPage );
                        $this.html('');
                        $this.css( "width", w );
                        $this.css( "text-align", t );
                        setTimeout( function(){block.next();}, trial.timing );
                    }
                }
            } else if ( trial.plugin=="radio" ) {
                writePage = function() {
                    content = "<form id='plugin_form' name='plugin_form' action=''><p>" + trial.text + "</p>";
                    if ( trial.grid ) {
                        content += "<table>";
                        for ( var i=0; i<trial.answers.length; i++ ) {
                            content += ( (i%2)==0 ) ? "<tr>" : "";
                            content += "<td><input type='radio' name='radio_option' value='" + i.toString() + "'>" + trial.answers[i] + "<br></td>";
                            content += ( (i%2)==1 ) ? "</tr>" : "";
                        }
                        content += "</table>";
                    } else {
                        for ( var i=0; i<trial.answers.length; i++ ) {
                            content += "<input type='radio' name='radio_option' value='" + i.toString() + "'>" + trial.answers[i] + "<br>";
                        }
                    }
                    content += "<br><input type='submit' id='submit_button' name='submit_button' value='Submit'></form>";
                    $this.html( content );
                    if ( trial.mode=="auto" ) {
                        var answer = Math.floor(Math.random()*trial.answers.length);
                        $('input[name=radio_option]:eq('+answer+')').attr('checked','checked');
                    }
                }
                nextPage = function(e) {
                    e.preventDefault();
                    var response = $('input[name=radio_option]:checked').val();
                    if ( ( trial.mode == "forced" ) && ( response == undefined ) ) {
                        alert( "Please select an option before proceeding." );
                        // falsetries++;
                    } else if ( trial.feedback && (response!=trial.key) && (trial.mode=="forced"||((trial.mode=="free")&&(response!=undefined))) ) {
//                    } else if ( ( trial.mode == "forced" ) && trial.feedback && ( response != trial.key ) ) {
                        alert( trial.feedback );
                        falsetries++;
                    } else {
                        if ( trial.key !== undefined ) {
                            console.log( "jsPsych.survey radio key: " + trial.key + "; response: " + response );
                        } else { 
                            console.log( "jsPsych.survey radio response: " + response );
                        }
                        endTime     = (new Date()).getTime();
                        rt          = (endTime-startTime);
                        trial_data  = { "response": Number( response ), "rt": rt, "falsetries": falsetries };
                        if ( trial.key ) { trial_data = $.extend({},trial_data,{"accuracy": Number(response==trial.key)}) };
                        block.data[block.trial_idx] = $.extend({},trial.data,trial_data);
                        $('#plugin_form').unbind( 'submit', nextPage );
                        $this.html('');
                        $this.css( "width", w );
                        $this.css( "text-align", t );
                        setTimeout( function(){block.next();}, trial.timing );
                    }
                }
            } else if ( trial.plugin=="radio-multiple" ) {
                writePage = function() {
                    content = "<form id='plugin_form' name='plugin_form' action=''>";
                    for ( var h=0; h<trial.text.length; h++ ) {
                        content += "<p>" + trial.text[h] + "</p>";
                        for ( var i=0; i<trial.answers[h].length; i++ ) {
                            content += "<input type='radio' name='radio_option_"+h+"' value='" + i.toString() + "'>" + trial.answers[h][i] + "<br>";
                        }
                    }
                    content += "<br><input type='submit' id='submit_button' name='submit_button' value='Submit'></form>";
                    $this.html( content );
                    if ( trial.mode=="auto" ) {
                        var answer;
                        for ( var h=0; h<trial.text.length; h++ ) {
                            answer = Math.floor(Math.random()*trial.answers[h].length);
                            $('input[name=radio_option_'+h+']:eq('+answer+')').attr('checked','checked');
                        }
                    }
                }
                nextPage = function(e) {
                    e.preventDefault();
                    var responses  = new Array( trial.text.length );
                    var incomplete = [];
                    var incorrect  = [];
                    for ( var h=0; h<trial.text.length; h++ ) {
                        responses[h] = $('input[name=radio_option_'+h+']:checked').val();
                        if ( responses[h]===undefined ) {
                            incomplete.push(h);
                        } else if ( trial.key!=undefined ) {
                            if ( trial.key[h]!=responses[h] ) {
                                incorrect.push(h);
                            }
                        }
                    }
                    if ( ( trial.mode == "forced" ) && ( incomplete.length>0 ) ) {
                        alert( "Please answer all the questions before proceeding." );
                        // falsetries++;
                    } else if ( ( trial.mode == "forced" ) && ( incorrect.length>0 ) ) {
                        alert( trial.feedback[incorrect[0]] );
                        falsetries++;
                    } else {
                        console.log( "jsPsych.survey radio-multiple responses: " + responses.toString() );
                        endTime     = (new Date()).getTime();
                        rt          = (endTime-startTime);
                        trial_data  = { "text_response": responses.toString(), "rt": rt, "falsetries": falsetries }
                        block.data[block.trial_idx] = $.extend({},trial.data,trial_data);
                        $('#plugin_form').unbind( 'submit', nextPage );
                        $this.html('');
                        $this.css( "width", w );
                        $this.css( "text-align", t );
                        setTimeout( function(){block.next();}, trial.timing );
                    }
                }
            } else if ( trial.plugin=="radio-essay" ) {
                writePage = function() {
                    content = "<form id='plugin_form' name='plugin_form' action=''><p>" + trial.text[0] + "</p>";
                    for ( var i=0; i<trial.answers.length; i++ ) {
                        content += "<input type='radio' name='radio_option' value='" + i.toString() + "'>" + trial.answers[i] + "<br>";
                    }
                    content += "<p>" + trial.text[1] + "</p>" ;
                    content += "<p><textarea id='essay_area' cols='80' rows='6'></textarea></p>";
                    content += "<br><input type='submit' id='submit_button' name='submit_button' value='Submit'></form>";
                    $this.html( content );
                    if ( trial.mode=="auto" ) {
                        var answer = Math.floor(Math.random()*trial.answers.length);
                        $('input[name=radio_option]:eq('+answer+')').attr('checked','checked');
                        $('#essay_area').val( "random text" );
                    }
                }
                nextPage = function(e) {
                    e.preventDefault();
                    var response = $('input[name=radio_option]:checked').val();
                    var text_response = $('#essay_area').val();
                    if ( ( trial.mode == "forced" ) && ( response == undefined ) ) {
                        alert( "Please select an option before proceeding." );
                        // falsetries++;
                    } else if ( ( trial.mode == "forced" ) && ((text_response==undefined)||(text_response=="")) ) {
                        alert( "Please type a response in the box before proceeding." );
                        // falsetries++;
                    } else {
                        console.log( "jsPsych.survey radio-essay response: " + response + "; text_response: " + text_response );
                        endTime     = (new Date()).getTime();
                        rt          = (endTime-startTime);
                        trial_data  = { "response": Number( response ), "text_response": text_response, "rt": rt, "falsetries": falsetries };
                        block.data[block.trial_idx] = $.extend({},trial.data,trial_data);
                        $('#plugin_form').unbind( 'submit', nextPage );
                        $this.html('');
                        $this.css( "width", w );
                        $this.css( "text-align", t );
                        setTimeout( function(){block.next();}, trial.timing );
                    }
                }
            } else if ( trial.plugin=="number" ) {
                writePage = function() {
                    content = "<form id='plugin_form' name='plugin_form' action=''><p>" + trial.text + "</p>";
                    content += "<p><input type='text' id='number_field'></p>"
                    for ( var i=0; i<trial.answers.length; i++ ) {
                        content += "<input type='radio' name='radio_option' value='" + i.toString() + "'>" + trial.answers[i] + "<br>";
                    }
                    content += "<br><input type='submit' id='submit_button' name='submit_button' value='Submit'></form>";
                    $this.html( content );
                    if ( trial.mode=="auto" ) { $('#number_field').val( trial.minimum ); }
                }
                nextPage = function(e) {
                    e.preventDefault();
                    var number_response = $('#number_field').val();
                    var radio_response = $('input[name=radio_option]:checked').val();
                    var message = false;
                    if ( trial.mode=="forced" ) {
                        if ( ( ( number_response=="" ) || ( number_response==undefined ) ) && ( radio_response==undefined ) ) {
                            message = "Please enter a number or select an option before proceeding.";
                        } else if ( !( ( number_response=="" ) || ( number_response==undefined ) ) ) {
                            if ( parseInt(number_response) != number_response ) {
                                message = "Please either type a number in the entry area or leave it blank. (Decimals, commas, and spaces are not allowed.)";
                            } else if ( ( number_response > trial.maximum ) || ( number_response < trial.minimum ) ) {
                                message = "Please enter a number between " + trial.minimum + " and " + trial.maximum + ".";
                            }
                        }
                    }
                    if ( message ) {
                        alert( message );
                        // falsetries++;
                    } else {
                        endTime     = (new Date()).getTime();
                        rt          = (endTime-startTime);
                        if ( !( ( number_response == undefined ) || ( number_response == "" ) ) ) {
                            trial_data  = { "text_response": number_response, "rt": rt, "falsetries": falsetries };
                        } else {
                            trial_data  = { "text_response": "radio " + radio_response, "rt": rt, "falsetries": falsetries };
                        }
                        block.data[block.trial_idx] = $.extend({},trial.data,trial_data);
                        $('#plugin_form').unbind( 'submit', nextPage );
                        $this.html('');
                        $this.css( "width", w );
                        $this.css( "text-align", t );
                        setTimeout( function(){block.next();}, trial.timing );
                    }
                }
            } else if ( trial.plugin=="checkbox" ) {
                writePage = function() {
                    content = "<form id='plugin_form' name='plugin_form' action=''><p>" + trial.text + "</p>";
                    for ( var i=0; i<trial.answers.length; i++ ) {
                        content += "<input type='checkbox' name='checkbox_option' value='" + i.toString() + "'>" + trial.answers[i] + "<br>";
                    }
                    content += "<br><input type='submit' id='submit_button' name='submit_button' value='Submit'></form>";
                    $this.html( content );
                    if ( trial.mode=="auto" ) {
                        for ( var i=0; i<trial.answers.length; i++ ) {
                            if ( Math.random() < 0.5 ) {
                                $('input[name=checkbox_option]:eq('+i+')').attr('checked','checked');
                            }
                        }
                    }
                }
                nextPage = function(e) {
                    e.preventDefault();
                    var checked = $('input[name=checkbox_option]:checked');
                    var text_response = [];
                    $('input[name=checkbox_option]:checked').each( function() { text_response.push( this.value); } );
                    text_response = text_response.toString();
                    endTime     = (new Date()).getTime();
                    rt          = (endTime-startTime);                    
                    trial_data  = { "text_response": text_response, "rt": rt, "falsetries": falsetries }
                    block.data[block.trial_idx] = $.extend({},trial.data,trial_data);
                    $('#plugin_form').unbind( 'submit', nextPage );
                    $this.html('');
                    $this.css( "width", w );
                    $this.css( "text-align", t );
                    setTimeout( function(){block.next();}, trial.timing );
                }
            }
            
            var w = $this.css( "width" );
            var t = $this.css( "text-align" );
            // $this.css( "width", 600 );
            // $this.css( "text-align", "left" );
            
            writePage();
            $("#plugin_form").submit( nextPage );
            if ( trial.mode=="free" ) { $('#submit_button').focus(); }
            if ( trial.mode=="auto" ) { $('#submit_button').click() }
            window.scrollTo(0,0);
            startTime = (new Date()).getTime();
		}
        
		return plugin;
	})();
}) (jQuery);
