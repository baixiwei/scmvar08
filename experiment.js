/* I've experimented with two different kinds of variation. The one used in experiments 1-4 involved alternating between different unrelated schemas, i.e. PCO and OSS. The other, used in experiment 5, involved alternating between a schema and a "reversed" version of it, i.e. OAPlc and ROAPlc. The former version seemed to produce the usual experience * variation interaction better so I decided to use it, rather than the latter, for this experiment. For generality though, the code is set up so it can do either one. The global vars below function as a switch to determine which version is used. */

//////////////////////////////////
// global variables
//////////////////////////////////

// switch to determine whether lots of info should be sent to console
var VERBOSE             = true;

// list of schemas used for training - referenced in many places
var TRAINING_SCHEMAS    = [ "PCO", "OSS", "TFR" ];


//////////////////////////////////
// makeExpStruct
//////////////////////////////////

function makeExpStruct( condVariation, condVersion, condTestSeq, yokingSeq, sections, mode ) {

    // generate test stimuli according to experimental condition
    // these are generated in advance because the randomization decisions made are shared across sections
    var questions_test      = generateTestQuestionSets( condTestSeq );
    
    // construct the experiment structure using the retrieved stimuli
    var exp_struct = [];
    if ( sections.indexOf( "Intro" ) != -1 )    { addIntro( exp_struct, mode ); }
    if ( sections.indexOf( "Pretest" ) != -1 )  { addTest( exp_struct, mode, "Pretest", questions_test["Pretest"] ); }
    if ( sections.indexOf( "Training" ) != -1 ) { addTraining( exp_struct, mode, condVariation, condVersion, yokingSeq ); }
    if ( sections.indexOf( "Posttest" ) != -1 ) { addTest( exp_struct, mode, "Posttest", questions_test["Posttest"] ); }
    if ( sections.indexOf( "Background" ) != -1 ) { addBackground( exp_struct, mode ); }
    
    // return the experiment structure
    return( exp_struct );
    
}


//////////////////////////////////
// Training & Test Questions
//////////////////////////////////

// Question
//  a Question object contains information about one stimulus for test or training
//  once the instantiate method has been called, the object can serve as a parameter array for jspsych_test or jspsych_training
Question = function( schema, quesID, base_noun, exp_noun, base_label, exp_label, text_long, text_short, explanation ) {
    this.schema         = schema;
    this.quesID         = quesID;
    this.text_long      = text_long;
    this.text_short     = text_short;
    this.base_noun      = base_noun;
    this.exp_noun       = exp_noun;
    this.base_label     = base_label;
    this.exp_label      = exp_label;
    this.explanation    = explanation;
    this.instantiate    = instantiateQuestion;
    this.feedback       = generateTrainingFeedback;
}

// generateNumbers
//      returns a pair of numbers in [3,9] both of which are different
//      from both of those returned the last time it was called
var prev_numbers = [ 0, 0 ];
function generateNumbers() {
    // randIntExclude: return an integer in [m,n] but not in l
    function randIntExclude(m,n,l) {
        var result = m + Math.floor( Math.random() * (n-m+1) )
        var okay = true;
        for ( var i=0; i<l.length; i++ ) {
            if ( result == l[i] ) {
                okay = false;
            }
        }
        if ( okay ) {
            return result;
        } else {
            return randIntExclude(m,n,l);
        }
    }

    var new_numbers = [ 0, 0 ];
    new_numbers[0]  = randIntExclude( 3, 9, prev_numbers );
    new_numbers[1]  = randIntExclude( 3, 9, prev_numbers.concat( [ new_numbers[0] ] ) );
    prev_numbers    = new_numbers;
    return prev_numbers;
}

// randomizeAnswers
//      creates a shuffled version of answers and returns it
//      together with the index of whichever answer was originally first, presumed to be the correct answer
randomizeAnswers = function( answers ) {
    var x = improvedShuffle( answers.slice() );
    var new_answers = x['array'];
    var key = x['order'].indexOf( 0 );
    return { "answers": new_answers, "key": key };
}

// createAnswer
//      creates an HTML string indicating a possible answer to a Question
createAnswer = function( base, exponent ) {
    var result = "";
    for ( var i=0; i<(exponent-1); i++ ) {
        result += ( base + "\xD7" );
    }
    result += (base + " = " + base + "<sup>" + exponent + "</sup>" );
    return result;
}

// instantiateQuestion: method of Question class
//      gives Question object attributes needed to serve as a parameter spec for jspsych-scmvar plugin
//      namely: text_list, answer_list, and key_list
var instantiateQuestion = function( section, number ) {
    if ( VERBOSE ) { console.log( "experiment.js > instantiateQuestion running ... schema: " + this.schema + "; quesID: " + this.quesID ); }
    var question = this;
    var text_list=[], ans_list=[], key_list=[];
    var base_num, exp_num, order;
    var ques_text, answers, key;
    // randomize: a helper function that sets parameters for how the question is instantiated
    var randomize = function() {
        var numbers = generateNumbers();
        base_num    = numbers[0];
        exp_num     = numbers[1];
        order       = Math.floor( Math.random() * 2 );
    }
    // set_text_and_answers: a helper function that sets values ques_text, answers, and key for different types of questions
    var set_text_and_answers = function( type ) {
        if ( ( type=="long version" ) || ( type=="short version" ) ) {
            ques_text   = (type=="long version") ? question.text_long : question.text_short;
            ques_text   = "<div class='question'>" + ques_text + "</div>";
            ques_text   = ques_text.format( [
                            [base_num, question.base_noun, exp_num, question.exp_noun],
                            [exp_num, question.exp_noun, base_num, question.base_noun]
                            ][ order ] );
            answers     = [ createAnswer( base_num, exp_num ), createAnswer( exp_num, base_num ) ];
            key         = 0;
        } else if ( type=="relational prompt" ) {
            ques_text   = "<div class='question'>" + question.text_long + "</div>";
            ques_text   += "<p>First, which statement best describes the relation between the things in the problem?</p>";
            ques_text   = ques_text.format( [
                            [base_num, question.base_noun, exp_num, question.exp_noun],
                            [exp_num, question.exp_noun, base_num, question.base_noun]
                            ][ order ] );
            answers     = [ "For <strong>EACH</strong> of the " + question.exp_noun + ", <strong>ONE</strong> of the " + question.base_noun + " is chosen",
                            "For <strong>EACH</strong> of the " + question.base_noun + ", <strong>ONE</strong> of the " + question.exp_noun + " is chosen" ];
            key         = 0;
        } else if ( type=="final long" ) {
            ques_text   = "<p>Next, what is the answer to the problem?</p>";
            answers     = [ createAnswer( base_num, exp_num ), createAnswer( exp_num, base_num ) ];
            key         = 0;
        }
    }
    // create text_list, answer_list, and key_list using the above helper functions
    if ( ( section=="Pretest" ) || ( section=="Posttest" ) ) {
        // create two questions: a long and short version
        for ( var i=0; i<2; i++ ) {
            randomize();
            set_text_and_answers( [ "long version", "short version" ][ i ] );
            text_list.push( ques_text );
            ans_list.push( answers );
            key_list.push( key );
        }
    } else if ( section=="Training" ) {
        // create three questions: relational prompt and final answer prompt for long version, then short version
        for ( var i=0; i<3; i++ ) {
            if ( ( i==0 ) || ( i==2 ) ) { randomize(); }
            set_text_and_answers( [ "relational prompt", "final long", "short version" ][ i ] );
            text_list.push( ques_text );
            ans_list.push( answers );
            key_list.push( key );
        }
    }
    // create data; store data and text, answers, key, and data to this question
    var data = { "section": section, "number": number, "schema": this.schema,
                 "quesID": this.quesID, "base_noun": this.base_noun, "exp_noun": this.exp_noun,
                 "mult_key": key_list.toString() };
    this.text_list  = text_list;
    this.ans_list   = ans_list;
    this.key_list   = key_list;
    this.data       = data;
    return this;
}

// generateTrainingFeedback: method of Question class
//      provides feedback for responses to training version of question
//      should only be called if instantiate has already been called
var generateTrainingFeedback = function( accuracies, mode ) {
    var feedback = { "overall": "", "by_question": new Array( accuracies.length ), "delay": 0 };
    if ( Math.min.apply( null, accuracies )==1 ) {
        feedback.overall    = "<p><img src='images/small-green-check-mark-th.png' class='icon'>  Great job! All of your answers are correct. Click 'OK' to continue.</p>";
        feedback.delay      = { "auto": 0, "free": 500, "forced": 7500 }[ mode ];
    } else {
        if ( 3-sum(accuracies) == 1 ) {
            feedback.overall    = "<p><img src='images/small-red-x-mark-th.png' class='icon'>  Sorry, one of your answers is incorrect.</p><p>The incorrect answer has been highlighted, and an explanation of why it is incorrect is displayed to the right. After reading the explanation, click 'Try again,' and the page will be reloaded with different numbers and the order of answers randomized.</p><p>The 'Try again' button will activate after a delay so that you have time to read the explanation.</p>";
        } else {
            feedback.overall    = "<p><img src='images/small-red-x-mark-th.png' class='icon'>  Sorry, some of your answers are incorrect.</p><p>The incorrect answers have been highlighted, and explanations of why they are incorrect are displayed to the right. Please read the explanations, click 'Try again,' and the page will be reloaded with different numbers and the order of answers randomized.</p><p>The 'Try again' button will activate after a delay so that you have time to read the explanations.</p>";
        }
        for ( var i=0; i<accuracies.length; i++ ) {
            if ( accuracies[i]==0 ) {
                if ( i==0 ) {   // relational prompt
                    feedback.by_question[i] = this.explanation;
                } else {        // final answers
                    feedback.by_question[i] = "Because <strong>ONE</strong> of the " + this.base_noun + " is chosen for <strong>EACH</strong> of the " + this.exp_noun + ",<br>the answer should be <i><b>(number of " + this.base_noun + ") <sup>(number of " + this.exp_noun + ")</sup></b></i>.";
                }
            }
        }
        feedback.delay      = { "auto": 0, "free": 1000, "forced": 7500 }[ mode ];
    }
    return feedback;
}

// getTrainingQuestions
//      provides the entire set of training examples used in all conditions, organized by schema
function getTrainingQuestions() {

    var questions_by_schema = {};
    
    questions_by_schema["PCO"] = [
        // The first four questions are the same as in Exp 3; the remaining two are new in Exp 6.
        new Question( "PCO", 1, "meals", "friends", "meal", "friend",
            // long version
            "<p>A group of friends is eating at a restaurant. Each person chooses a meal from the menu. (It is possible for multiple people to choose the same meal.)</p><p>In how many different ways can the friends choose their meals, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the friends choose their meals now?</p>", 
            // explanation
            "According to your answer, some of the friends might not get \"used.\" However, the problem says \"<strong>each person</strong>\" chooses a meal. Also, in your answer, the same person might get matched to more than one meal. But the problem says that each person chooses only one meal." ),
        new Question( "PCO", 2, "pizza brands", "consumers", "pizza brand", "consumer",
            // long version
            "<p>A marketing research company conducts a taste test survey. Several consumers are each asked to choose their favorite from among several pizza brands. (It is possible for multiple consumers to choose the same brand.)</p><p>How many different results of the survey are possible, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different results of the survey are possible now?</p>", 
            // explanation
            "According to your answer, some of the consumers might not get \"used.\" However, the problem says the consumers \"are <strong>each</strong> asked\" to choose their favorite. Also, in your answer, the same consumer might get matched to more than one pizza brand. But the problem says that each consumer will choose their favorite, meaning <strong>only one</strong>.\"" ),
        new Question( "PCO", 3, "possible majors", "students", "major", "student", 
            // long version
            "<p>Several college freshmen are discussing what they want to study in college. Each of them has to choose a major from a fixed list of options. (Of course, it is possible for more than one to choose the same major.)</p><p>In how many different ways can the students choose their majors, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the students choose their majors now?</p>", 
            // explanation
            "According to your answer, some of the students might not get \"used.\" However, the problem says \"<strong>Each of them</strong> has to choose a major.\" Also, in your answer, the same student might get matched to more than one possible major. But the problem says they each must choose <strong>a</strong> major, meaning <strong>only one</strong>.\"" ),
        new Question( "PCO", 4, "types of toy", "children", "toy", "child",
            // long version
            "<p>During playtime at a kindergarten, the teacher offers the children a number of different types of toy. Each child has to choose one type of toy. (There are enough toys of each type that more than one child, or even all of them, can choose the same type.)</p><p>In how many different ways can the children choose their toys, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the children choose their toys now?</p>",
            // explanation
            "According to your answer, some of the children might not get \"used.\" However, the problem says \"<strong>Each child</strong> has to choose one type of toy.\" Also, in your answer, the same child might get matched to more than one type of toy. But the problem says \"each child has to choose <strong>one type of toy</strong>.\"" ),
        // new question (not included in exp 3), drawn from exp 4 materials but with revision
        new Question( "PCO", 5, "stocks", "bankers", "stock", "banker",
            // long version
            "<p>Amy has decided to invest in one of several stocks. She asks several bankers for their advice, and each banker chooses one of the stocks to advise her to buy. (It is possible for more than one banker to choose the same stock.)</p><p>In how many different ways can the bankers choose stocks, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the bankers choose stocks now?</p>",
            // explanation
            "According to your answer, some of the bankers might not get \"used.\" However, the problem says \"<strong>each banker</strong> chooses.\" Also, in your answer, the same banker might get matched to more than one stock. But the problem says each banker chooses \"<strong>one</strong> of the stocks.\""
        ),
        // new question (not included in exp 3), adapted from an example by Isabel Bay (research assistant)
        new Question( "PCO", 6, "trails", "hikers", "trail", "hiker",
            // long version
            "<p>Several hikers go hiking at a national park that has numerous hiking trails. Each hiker chooses one of the trails to hike on. (It is possible for more than one hiker to choose the same trail.)</p><p>In how many different ways can the hikers choose trails, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the hikers choose trails now?</p>",
            // explanation
            "According to your answer, some of the hikers might not get \"used.\" However, the problem says \"<strong>Each hiker</strong> chooses.\" Also, in your answer, the same hiker might get matched with more than one trail. But the problem says each hiker chooses \"<strong>one</strong> of the trails.\""
        )
        ];
            
    questions_by_schema["OSS"] = [
        // The first four questions are the same as in Exp 3; the remaining two are new in Exp 6.
        // new Question( "OSS", "possible notes", "notes in each sequence" , 
            // // long version
            // "<p>A piano student, when bored, plays random sequences of notes on the piano, using sequences of a fixed length, and choosing from a fixed set of notes. (It is possible to play the same note more than once in a sequence.)</p><p>How many different sequences are possible, if there are {0} {1} and {2} {3}?</p>",
            // // short version
            // "<p>Now suppose there are {0} {1} and {2} {3}. How many different sequences are possible now?</p>",
            // // explanation
            // ""
            // ),
        // Revised from original exp 3 version (above)
        new Question( "OSS", 7, "keys in the set", "notes in each melody", "key", "note",
            // long version
            "<p>A piano student, when bored, plays random melodies on the piano. Each melody is the same number of notes long, and uses only keys from a fixed set of keys. (It is possible to play the same key more than once in a sequence.)</p><p>How many different melodies are possible, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different sequences are possible now?</p>",
            // explanation
            "According to your answer, some of the notes might not get \"used.\" That would mean those positions in the melody were \"blank,\" which makes no sense. Also, in your answer, the same note might get matched to more than one key. That would mean multiple keys are played at the same position in the melody, which the problem did not say is allowed."
            ),
        // new Question( "OSS", 8, "letters in the set", "letters in each password",
            // // long version
            // "<p>A website generates user passwords by selecting sequences of letters randomly from a fixed set of letters. (It is possible to use the same letter more than once in a sequence.)</p><p>How many different passwords are possible, if there are {0} {1} and {2} {3}?</p>", 
            // // short version
            // "<p>Now suppose there are {0} {1} and {2} {3}. How many different passwords are possible now?</p>",
            // // explanation
            // ""
            // ),
        // Revised from original exp 3 version (above)
        new Question( "OSS", 8, "allowable letters", "letters in each password", "letter", "position",
            // long version
            "<p>A website generates user passwords by selecting a certain number of letters randomly from a set of allowable letters. (It is possible to use the same letter more than once in a password.)</p><p>How many different passwords are possible, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different passwords are possible now?</p>",
            // explanation
            "According to your answer, some of the positions might not get \"used.\" That would mean those positions were \"blank,\" which makes no sense. Also, in your answer, the same position might get matched to more than one letter. That would mean multiple letters were generated for the same position in the password, which also makes no sense."
            ),
        new Question( "OSS", 9, "buttons", "flashes per sequence", "button", "flash", 
            // long version
            "<p>The game Simon uses a disk with several different-colored buttons. The buttons flash in sequence and then the player has to push the buttons in the same sequence - otherwise they get a shock. (It is possible for the same button to flash more than once in a sequence.)</p><p>How many different sequences are possible, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different sequences are possible now?</p>",
            // explanation
            "According to your answer, some of the flashes in the sequence might not get \"used.\" That just means having fewer flashes total, which would contradict the assumption about how many flashes there are. Also, in your answer, the same flash might get matched to more than one button. That would mean multiple buttons flash at the same time, which the problem did not say is possible."
            ),
        // Revised from original exp 3 version (above)
        // new Question( "OSS", "permissible numbers", "numbers on each ticket", 
            // // long version
            // "<p>In a certain city, municipal lottery tickets are printed using sequences of numbers chosen randomly from a fixed set. (It is possible for the same number to appear more than once in a sequence.)</p><p>How many different lottery tickets are possible, if there are {0} {1} and {2} {3}?</p>",
            // // short version
            // "<p>Now suppose there are {0} {1} and {2} {3}. How many different lottery tickets are possible now?</p>",
            // // explanation
            // ""
            // )
        // Revised from original exp 3 version (above)
        new Question( "OSS", 10, "permissible numbers", "numbers on each ticket", "number", "position",
            // long version
            "<p>In a certain city, municipal lottery tickets are printed using series of numbers chosen randomly from a list of permissible numbers. (It is possible for the same number to appear at more than one position in a series.)</p><p>How many different lottery tickets are possible, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different lottery tickets are possible now?</p>",
            // explanation
            "According to your answer, some of the number positions might not get \"used.\" That would mean no number at all appears in those positions, which the problem did not say is possible. Also, in your answer, more than one number could be chosen for the same position. That would make no sense."
            ),            
        // new question (not included in exp 3), drawn from exp 4 materials
        new Question( "OSS", 11, "answers for each question", "questions on the exam", "answer", "question",
            // long version
            "<p>A student is taking a multiple choice exam. Each question has the same number of answers and the student just chooses an answer randomly. (It is possible for him to choose the same answer for more than one question.)</p><p>In how many different ways can he fill out the exam, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can he fill out the exam now?</p>",
            // explanation
            "According to your answer, some of the questions might not get \"used.\" But the problem says he chooses an answer for each question. Also, in your answer, the same question could be matched to more than one answer. But the problem says that he chooses <strong>an</strong> answer, meaning <strong>one</strong> answer, for each question."
            ),
        // new question (not included in exp 3), drawn from exp 4 materials, but modified to emphasize "days" rather than "dances"
        new Question( "OSS", 12, "dresses", "days with dances", "dress", "day",
            // long version
            "<p>Elizabeth is going to attend a dance every day for the next several days. Each day, she chooses a dress to wear to the dance. (It is possible for her to choose the same dress on more than one day.)</p><p>In how many different ways can she choose her dresses, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can she choose her dresses now?</p>",
            // explanation
            "According to your answer, some of the days might not get \"used.\" But the problem says she chooses a dress <strong>\"each day.\"</strong> Also, in your answer, the same day could be matched to more than one dress. But the problem says that she chooses <strong>a</strong> dress, meaning <strong>one</strong> dress, each day."
            )
        ];
        
    // placeholder pending addition of the real TFR questions
    questions_by_schema["TFR"] = [
        // The first four questions are the same as in Exp 3; the remaining two are new in Exp 6.
        new Question( "TFR", 101, "meals", "friends", "meal", "friend",
            // long version
            "<p>A group of friends is eating at a restaurant. Each person chooses a meal from the menu. (It is possible for multiple people to choose the same meal.)</p><p>In how many different ways can the friends choose their meals, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the friends choose their meals now?</p>", 
            // explanation
            "According to your answer, some of the friends might not get \"used.\" However, the problem says \"<strong>each person</strong>\" chooses a meal. Also, in your answer, the same person might get matched to more than one meal. But the problem says that each person chooses only one meal." ),
        new Question( "TFR", 102, "pizza brands", "consumers", "pizza brand", "consumer",
            // long version
            "<p>A marketing research company conducts a taste test survey. Several consumers are each asked to choose their favorite from among several pizza brands. (It is possible for multiple consumers to choose the same brand.)</p><p>How many different results of the survey are possible, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different results of the survey are possible now?</p>", 
            // explanation
            "According to your answer, some of the consumers might not get \"used.\" However, the problem says the consumers \"are <strong>each</strong> asked\" to choose their favorite. Also, in your answer, the same consumer might get matched to more than one pizza brand. But the problem says that each consumer will choose their favorite, meaning <strong>only one</strong>.\"" ),
        new Question( "TFR", 103, "possible majors", "students", "major", "student", 
            // long version
            "<p>Several college freshmen are discussing what they want to study in college. Each of them has to choose a major from a fixed list of options. (Of course, it is possible for more than one to choose the same major.)</p><p>In how many different ways can the students choose their majors, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the students choose their majors now?</p>", 
            // explanation
            "According to your answer, some of the students might not get \"used.\" However, the problem says \"<strong>Each of them</strong> has to choose a major.\" Also, in your answer, the same student might get matched to more than one possible major. But the problem says they each must choose <strong>a</strong> major, meaning <strong>only one</strong>.\"" ),
        new Question( "TFR", 104, "types of toy", "children", "toy", "child",
            // long version
            "<p>During playtime at a kindergarten, the teacher offers the children a number of different types of toy. Each child has to choose one type of toy. (There are enough toys of each type that more than one child, or even all of them, can choose the same type.)</p><p>In how many different ways can the children choose their toys, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the children choose their toys now?</p>",
            // explanation
            "According to your answer, some of the children might not get \"used.\" However, the problem says \"<strong>Each child</strong> has to choose one type of toy.\" Also, in your answer, the same child might get matched to more than one type of toy. But the problem says \"each child has to choose <strong>one type of toy</strong>.\"" ),
        // new question (not included in exp 3), drawn from exp 4 materials but with revision
        new Question( "TFR", 105, "stocks", "bankers", "stock", "banker",
            // long version
            "<p>Amy has decided to invest in one of several stocks. She asks several bankers for their advice, and each banker chooses one of the stocks to advise her to buy. (It is possible for more than one banker to choose the same stock.)</p><p>In how many different ways can the bankers choose stocks, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the bankers choose stocks now?</p>",
            // explanation
            "According to your answer, some of the bankers might not get \"used.\" However, the problem says \"<strong>each banker</strong> chooses.\" Also, in your answer, the same banker might get matched to more than one stock. But the problem says each banker chooses \"<strong>one</strong> of the stocks.\""
        ),
        // new question (not included in exp 3), adapted from an example by Isabel Bay (research assistant)
        new Question( "TFR", 106, "trails", "hikers", "trail", "hiker",
            // long version
            "<p>Several hikers go hiking at a national park that has numerous hiking trails. Each hiker chooses one of the trails to hike on. (It is possible for more than one hiker to choose the same trail.)</p><p>In how many different ways can the hikers choose trails, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the hikers choose trails now?</p>",
            // explanation
            "According to your answer, some of the hikers might not get \"used.\" However, the problem says \"<strong>Each hiker</strong> chooses.\" Also, in your answer, the same hiker might get matched with more than one trail. But the problem says each hiker chooses \"<strong>one</strong> of the trails.\""
        )
        ];        
        
    return questions_by_schema;
}

// getTrainingQuestionsBySchema
//      returns a certain number of training questions all drawn from a given schema ordered randomly
function getTrainingQuestionsBySchema( schema, num_questions ) {
    return( shuffle( getTrainingQuestions()[schema] ).slice(0,num_questions) );
}

// getTrainingQuestionsByIds
//      given an array of question ids, returns an array of the corresponding questions
function getTrainingQuestionsByIds( quesIDs ) {
    var questions_by_schema = getTrainingQuestions();
    var original_questions = [];
    for ( var schema in questions_by_schema ) {
        original_questions = original_questions.concat( questions_by_schema[schema] );
    }
    var filtered_questions = new Array( quesIDs.length );
    for ( var i=0; i<original_questions.length; i++ ) {
        if ( quesIDs.indexOf( original_questions[i].quesID ) != -1 ) {
            filtered_questions[ quesIDs.indexOf( original_questions[i].quesID ) ] = original_questions[i];
        }
    }
    return filtered_questions;
}

// getTestQuestionsBySet
//      provides all test questions, organized by question set
function getTestQuestionsBySet() {
    var test_question_sets = [
        [
            new Question( "OAPlc", 21, "colors", "rooms", "color", "room",
            // long version
            // original:
            // "<p>A homeowner is going to repaint several rooms in her house. She chooses one color of paint for each of the rooms. (It is possible for multiple rooms to be painted the same color.)</p><p>In how many different ways can she paint the rooms, if there are {0} {1} and {2} {3}?</p>", 
            "<p>A homeowner is going to repaint several rooms in her house. She chooses one color of paint for the living room, one for the dining room, one for the family room, and so on. (It is possible for multiple rooms to be painted the same color.)</p><p>In how many different ways can she paint the rooms, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can she paint the rooms now?</p>" ),
            new Question( "CAE", 22, "categories", "paranormal events", "category", "event",
            // long version
            "<p>An FBI agent is investigating several paranormal events. She must write a report classifying each event into a category such as Possession, Haunting, Werewolf, and so on.</p><p>In how many different ways can she write her report, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can she write her report now?</p>" ),
            new Question( "OAPpl", 23, "employees", "prizes", "employee", "prize",
            // long version
            "<p>A prize drawing is held at a small office party, and each of several prizes is awarded to one of the employees. (It is possible for multiple prizes to be awarded to the same employee.)</p><p>In how many different ways can the prizes be awarded, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the prizes be awarded now?</p>" ),
            new Question( "PCO", 24, "fishing spots", "fishermen", "spot", "fisherman",
            // long version
            "<p>Several fishermen go fishing in the same lake, and each of them chooses one of several spots at which to fish. (It is possible for more than one fisherman to choose the same spot.)</p><p>In how many different ways can the fishermen choose their spots, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the fishermen choose their spots now?</p>" ),
            new Question( "OSS", 25, "types of wine", "courses in the meal", "type of wine", "course",
            // long version
            "<p>A gourmet chef is preparing a fancy several-course meal. There are several types of wine available, and the chef needs to choose one wine to serve with each course. (It is possible for the same wine to be served with more than one course.)</p><p>In how many different ways can the wines be chosen, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the wines be chosen now?</p>" ),
            // this next question was added from exp 4, i.e. it was not included in exps 3 or 5
            new Question( "OAPpl", 26, "sons", "houses", "son", "house",
            // long version
            "<p>A wealthy old woman is writing her will. She owns several houses, and wishes to leave each house to one of her sons. (It is possible for her to leave more than one house to the same son.)</p><p>In how many different ways can she write this part of her will, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the old woman write her will now?</p>" )
        ],
        [
            new Question( "OAPlc", 27, "crops", "fields", "crop", "field",
            // long version
            "<p>A farmer is planning what crops he will plant this year. He chooses one crop for each of several fields. (It is possible for multiple fields to receive the same crop.)</p><p>In how many different ways can the farmer plant his crops, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can he plant his crops now?</p>" ),
            new Question( "CAE", 28, "categories", "weather events", "category", "event", 
            // long version
            "<p>A meteorologist must write a report classifying each extreme weather event which occurred in the past year into a category such as Hurricane, Tropical Storm, etc.</p><p>In how many different ways can he write his report, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can he write his report now?</p>" ),
            // as in Exp 5, changed "districts" to "provinces" in order to avoid linguistic overlap with the city districts/public works training problem
            new Question( "OAPpl", 29, "children", "provinces", "child", "province",
            // long version
            "<p>An aging king plans to divide his lands among his heirs. Each province of the kingdom will be assigned to one of his many children. (It is possible for multiple provinces to be assigned to the same child.)</p><p>In how many different ways can the provinces be assigned, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the provinces be assigned now?</p>" ),
            new Question( "PCO", 30, "treatments", "doctors", "treatment", "doctor",
            // long version
            "<p>There are several possible treatments for a certain rare disease. A patient with this disease consults several doctors, and each doctor recommends one of the possible treatments. (It is possible for more than one doctor to recommend the same treatment.)</p><p>In how many different ways can the doctors make their recommendations, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the doctors make their recommendations now?</p>" ),
            // next question originally said "daughters" instead of "dates" in exp 3 - same change made in Exp 5
            new Question( "OSS", 31, "colognes to choose from", "dates", "cologne", "date", 
            // long version
            "<p>Don Juan has one date with each of a merchant's daughters. For each date, he puts on a cologne he thinks that daughter will like. (It is possible for him to choose the same cologne for more than one date.)</p><p>In how many different ways can he choose colognes for his dates, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can he choose colognes for his dates now?</p>" ),
            // this next question was added from exp 4, i.e. it was not included in exps 3 or 5
            new Question( "OAPpl", 32, "detectives", "cases", "detective", "case", 
            // long version
            "<p>A police department receives several new cases in one day. Each new case is assigned to one of the detectives. (It is possible for multiple cases to be assigned to the same detective.)</p><p>In how many different ways can the cases be assigned, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the cases be assigned now?</p>" )
        ] ];
        
    return test_question_sets;
}


//////////////////////////////////
// Pretest and Posttest
//////////////////////////////////

// generateTestQuestionSets
//      selects one of the test question sets to be pretest and the other to be posttest
//      according to the test sequence determined by experimental condition
function generateTestQuestionSets( condTestSeq ) {
    var test_question_sets = getTestQuestionsBySet();
    return( { "Pretest": test_question_sets[ condTestSeq ], "Posttest": test_question_sets[ (condTestSeq+1)%2 ] } );
}

function addTest( exp_struct, mode, test_section, questions ) {

    // add questions to exp_struct
    for ( var i=0; i<questions.length; i++ ) {
        questions[i].instantiate( test_section, i );
        console.log( test_section + " " + i );
    }
    exp_struct.push( { "type": "scmvar_test", "mode": mode, "progress": true, "questions": questions } );
    
    // add conclusion to exp_struct
    var conclusion = {
        "Pretest": "<p><img src='images/smiley20face_thumbsup.jpg'></p><p>Congratulations! You've finished the 2nd part of the study.</p><p>The 3rd part involves problems similar to those in the previous part, but in this part, you'll be given some guidance on how to solve the problems.</p><p>Take a break if you like, and continue to the 3rd part when you're ready.</p>",
        "Posttest": "<p><img src='images/smiley20face_thumbsup.jpg'></p><p>Congratulations! You've now completed the 4th and last part of the study.</p><p>Finally, would you please take a few moments to answer some questions?  This will just take a minute - really!</p>"
        }[ test_section ];
    addTextBlock( exp_struct, mode, test_section + " Conclusion", [ conclusion ] );
}


//////////////////////////////////////////////////////
// Training
//////////////////////////////////////////////////////

function addTraining( exp_struct, mode, condVariation, condVersion, yokingSeq ) {

    // unselect subsections of training if desired (for testing only)
    var subsections = { "exposition": true, "examples": true, "concept": true, "conclusion": true };
//    subsections = { "exposition": false, "examples": true, "concept": false, "conclusion": false };

    if ( VERBOSE ) { console.log( "addTraining running ..." ); }
    
    // add selected subsections to experiment structure
    if ( subsections.exposition )   { addTrainingExposition( exp_struct, mode, condVariation, condVersion ); }
    if ( subsections.examples )     { addTrainingExamples( exp_struct, mode, condVariation, condVersion, yokingSeq ); }
    if ( subsections.concept )      { addConceptInduction( exp_struct, mode ); }
    if ( subsections.conclusion )   { addTrainingConclusion( exp_struct, mode ); }
}

function addTrainingExposition( exp_struct, mode, condVariation, condVersion ) {

    // based on Exp 3 with no or minor changes, with following exceptions:
    //  replaced * with multiplication sign and unified answers in text with answer formatting in actual questions
    //  added question format to examples
    //  switched to survey plugin instead of text plugin
    //  added last page of exposition to transition to training examples
    //  removed <p>Press <strong>ENTER</strong> to continue.</p> and similar
    
    // NOTE: currently requires first example to be either PCO or OSS!

    var text_list;
    var firstExampleSchema = TRAINING_SCHEMAS[ condVersion ];
    if ( firstExampleSchema=="PCO" ) {
        text_list   = [
            "<p>All the problems you saw in the previous part are called 'Sampling with Replacement' problems. Consider the following example:</p><div class='question'><p>Suppose that 2 golfers each have to choose a golf club for their next strike, and there are 5 different golf clubs to choose from. Of course, they can both use the same club, since they don't have to go at the same time. In how many different ways can they make their choices?</p></div><p>Think about this problem and try to get the answer before proceeding.</p>",
            "<p>The correct answer is " + createAnswer( 5, 2 ) + ". There are 5 possible clubs the first golfer could choose. For <strong>EACH</strong> of the ways the first golfer could choose, there are 5 ways the second golfer could choose. So, altogether, there are " + createAnswer( 5, 2 ) + " ways the two golfers could choose.</p><div class='question'><p>Now, suppose that there are still 2 golfers, but instead of 5 different golf clubs, there are 8 golf clubs to choose from. In how many different ways can they make their choices now?</p></div><p>Think about how to calculate the answer before proceeding.</p>",
            "<p>The correct answer is " + createAnswer( 8, 2 ) + ". There are 8 possible clubs the first golfer could choose. For <strong>EACH</strong> of the ways the first golfer could choose, there are 8 ways the second golfer could choose. So, altogether, there are " + createAnswer( 8, 2 ) + " ways the two golfers together could choose.</p><div class='question'><p>Now, suppose that there are 5 different golf clubs as in the first problem, but instead of 2 golfers, there are 8 golfers. In how many different ways can they make their choices now?</p></div><p>Think about how to calculate the answer before proceeding (you don't have to actually calculate it, it's a very large number, but just think about <strong>HOW</strong> to calculate it).</p>",
            "<p>The correct answer is " + createAnswer( 5, 8 ) + ". Just as in the first problem, there are 5 possible clubs the first golfer could choose. For each of those, there are 5 ways the second golfer could choose, so we multiply 5\xD75 to get the number of ways the first <strong>TWO</strong> could choose. For each of <strong>THOSE</strong>, there are 5 ways the <strong>THIRD</strong> golfer could choose, so we multiply by 5 again, and so on.</p><p>In the end, we multiply 5 by itself as many times as there are golfers, that is, 8 times. So the answer is " + createAnswer( 5, 8 ) + ".</p>",
            "<p>In general, Sampling with Replacement problems always involve selecting from a set of <strong>OPTIONS</strong> a certain number of <strong>TIMES</strong>. And the number of possible outcomes for this kind of problem is always <strong>(OPTIONS)<sup>(TIMES)</sup></strong>, i.e. the number of OPTIONS to the power of the number of TIMES.</p><p>In the previous example, the OPTIONS were the golf clubs, and the TIMES were the golfers, since each golfer chose once. So the answer was (# of Clubs)<sup>(# of Golfers)</sup>.</p><p>All Sampling with Replacement problems can be solved with this formula: <strong>(OPTIONS)<sup>(TIMES)</sup></strong>. You just need to figure out what is the number of OPTIONS chosen from and what is the number of TIMES an option is chosen.</p>" ];
    } else if ( firstExampleSchema=="OSS" ) {
        text_list   = [
            "<p>All the problems you saw in the previous part are called 'Sampling with Replacement' problems. Consider the following example:</p><div class='question'><p>Suppose that you have 5 different playing cards, face down. You draw one card, then put the card back, shuffle, and draw another card - so, you draw 2 cards altogether, one after the other. How many different outcomes are possible?</p></div><p>Think about this problem and try to get the answer before proceeding.</p>",
            "<p>The correct answer is " + createAnswer( 5, 2 ) + ". There are 5 possible cards you could get on the first draw. For <strong>EACH</strong> of the outcomes for the first draw, there are 5 outcomes for the second draw. So, altogether, there are " + createAnswer( 5, 2 ) + " outcomes for the two draws together.</p><div class='question'><p>Now, suppose that you still draw 2 cards, but instead of 5 different cards in the deck, there are 8 different cards you could draw. How many outcomes are possible now?</p></div><p>Think about how to calculate the answer before proceeding.</p>",
            "<p>The correct answer is " + createAnswer( 8, 2 ) + ". There are 8 possible cards you could get on the first draw. For <strong>EACH</strong> of the outcomes for the first draw, there are 8 outcomes for the second draw. So, altogether, there are " + createAnswer( 8, 2 ) + " outcomes for the two draws together.</p><div class='question'><p>Now, suppose that there are 5 different cards as in the first problem, but instead of drawing 2 times, you draw 8 times. How many outcomes are possible now?</p></div><p>Think about how to calculate the answer before proceeding (you don't have to actually calculate it, it's a very large number, but just think about <strong>HOW</strong> to calculate it).</p>",
            "<p>The correct answer is " + createAnswer( 5, 8 ) + ". Just as in the first problem, there are 5 possible cards you could get on the first draw. For each of those, there are 5 cards you could get on the second draw, so we multiply 5\xD75 to get the number of outcomes for the first <strong>TWO</strong> draws. For each of <strong>THOSE</strong>, there are 5 cards you could get on the <strong>THIRD</strong> draw, so we multiply by 5 again, and so on.</p><p>In the end, we multiply 5 by itself as many times as there are draws, that is, 8 times. So the answer is " + createAnswer( 5, 8 ) + ".</p>",
            "<p>In general, Sampling with Replacement problems always involve selecting from a set of <strong>OPTIONS</strong> a certain number of <strong>TIMES</strong>. And the number of possible outcomes for this kind of problem is always <strong>(OPTIONS)<sup>(TIMES)</sup></strong>, i.e. the number of OPTIONS to the power of the number of TIMES.</p><p>In the previous example, the OPTIONS were the cards in the deck, and the TIMES were the draws, since one card was chosen on each draw. So the answer was (# of Cards)<sup>(# of Draws)</sup>.</p><p>All Sampling with Replacement problems can be solved with this formula: <strong>(OPTIONS)<sup>(TIMES)</sup></strong>. You just need to figure out what is the number of OPTIONS chosen from and what is the number of TIMES an option is chosen.</p>" ];
    } else if ( firstExampleSchema=="TFR" ) {
        text_list   = [];       // TBD
    }
    text_list.push( "<p>Now you will have a chance to practice what you just learned with a series of example problems. After each problem, you'll be told whether your answers were correct, and if not, why not.</p><p>A progress bar at the top will show you what proportion of the examples you have completed.</p><p>Let's get started!</p>" );

    addTextBlock( exp_struct, mode, "Training Exposition", text_list )
}

/*
Here's the behavior we want. condVariation can take 4 values: Nonvaried, Adaptive Varied, Yoked Varied, and Yoked Shuffled.
1. Nonvaried. Select one schema, choose 18 examples from that schema, randomly shuffle.
2. Adaptive Varied. Select one schema, choose examples from that schema until 3 in a row correct, then choose interleaved from all 3 schemas.
3. Yoked Varied. Follow the same sequence of examples as in the yoking sequence.
4. Yoked Shuffled. Randomize the sequence of examples in the yoking sequence and follow that.
So really, only 2. requires real-time selection for each trial - the other 3 are determined in advance.
*/
function addTrainingExamples( exp_struct, mode, condVariation, condVersion, yokingSeq ) {
    var num_questions       = 6;                        // testing only; eventually change to 18
    switch ( condVariation ) {
        case "Nonvaried" :
            var schema      = TRAINING_SCHEMAS[ condVersion ];
            var questions   = ( shuffle( getTrainingQuestions()[ schema ] ) ).slice( 0, num_questions );
            break;
        case "Adaptive Varied" :
            var schemas = reorderFromIdx( TRAINING_SCHEMAS, condVersion );
            var questions   = [];
            for ( var i=0; i<schemas.length; i++ ) {
                questions.push( shuffle( getTrainingQuestions()[ schemas[i] ] ).slice( 0, num_questions ) );
            }
            break;
        case "Yoked Varied" :
            var questions   = getTrainingQuestionsByIds( yokingSeq );
            break;
        case "Yoked Shuffled" :
            var questions   = shuffle( getTrainingQuestionsByIds( yokingSeq ) );
            break;
    }
    var tqs = new trainingQuestionSelector( condVariation, questions );
    exp_struct.push( { "type": "scmvar_training", "mode": mode, "progress": true, "feedback": true, "num_questions": num_questions, "selector": tqs } );
}
    
function addConceptInduction( exp_struct, mode ) {
    // based on Exp 6 version, but modified to use language consistent with Exp 3 exposition
    var text = [
        "<p>Problems like the ones you just viewed always involve two numbers, and the answer is always <i>(one number)<sup>(the other number)</sup></i>. The first number, which is multiplied by itself many times, is called the <b>base</b>, and the second number, which determines how many times to multiply the first number, is called the <b>exponent</b>.</p><p>Please describe, in as general a way as possible, how to decide which number should be the base and which number should be the exponent.</p>",
        "<p>One correct answer to the previous question is: \"If, for <strong>EACH</strong> of one thing called \"selections,\" <strong>ONE</strong> of another thing called \"alternatives\" is chosen, then the number of alternatives should be the base and the number of selections should be the exponent.</p><p>Please describe, in as general a way as possible, how to decide which thing is the alternatives and which thing is the selections.</p>"
        ];
    
    var specs=[], data=[];
    for ( var i=0; i<text.length; i++ ) {
        specs.push( { "plugin": "essay", "text": text[i] } );
        data.push( { "section": "Concept Induction", "number": i } );
    }

    exp_struct.push( { "type": "survey", "mode": mode, "timing": 250, "specs": specs, "data": data } );
}

function addTrainingConclusion( exp_struct, mode ) {
    addTextBlock( exp_struct, mode, "Training Conclusion", [ "<p><img src='images/smiley20face_thumbsup.jpg'></p><p>Congratulations! You've finished the 3rd part of the study. Just one part left!</p><p>In the last part, you'll solve 12 more problems like those you've seen so far. A progress bar at the top will show you how many you've completed and how many you have left. This time, you won't get any feedback.</p><p>Take a break if you like, and continue when you're ready.</p>" ] );
}

////////////////////////////////////////////////////////////
// Training Question Selector used by addTrainingExamples
////////////////////////////////////////////////////////////

// trainingQuestionSelector class
//  used to generate questions dynamically based on past performance during training
trainingQuestionSelector = function( condVariation, questions ) {
    if ( VERBOSE ) { console.log("trainingParamsGenerator constructor running ..."); }
    // store input variables
    this.condVariation  = condVariation;
    this.questions      = questions;
    // for adaptive variation condition, record that criterion has not been met
    this.criterionIdx   = -1;
    // selector will pick out the next question
    this.select         = selectTrainingQuestion;
}

// checkCriterion( block_data, start_idx )
//  was accuracy criterion reached over the past window_size trials in block_data,
//  excluding those occurring before start_idx
var checkCriterion = function( block_data, window_size, start_idx ) {
    start_idx = ( start_idx==undefined ) ? 0 : start_idx;
    if ( ( block_data.length - window_size ) < start_idx ) {
        if ( VERBOSE ) { console.log( "checkCriterion running ... accuracy window still too small" ); }
        return false;
    } else {
        var data = block_data.slice( block_data.length-window_size, block_data.length );
        var accuracies = field( data, "mult_accuracies" );
        var min_accuracy = Math.min.apply( null, field( data, "accuracy" ) );
        if ( VERBOSE ) { console.log( "checkCriterion running ... accuracy window: " + accuracies.toString() + "; min_accuracy: " + min_accuracy.toFixed(2) ); }
        return ( min_accuracy==1.0 );
    }
}

var selectTrainingQuestion = function( trial_idx, block_data ) {
    if ( VERBOSE ) { console.log( "selectTrainingQuestion running ..." ); }
    if ( this.condVariation=="Adaptive Varied" ) {
        if ( this.criterionIdx>0 ) {
            return this.questions[ (trial_idx-this.criterionIdx+1)%(this.questions.length) ][ trial_idx ];
        } else if ( checkCriterion( block_data, 2 ) ) {     // testing only; change to 3 for the real thing
            this.criterionIdx = trial_idx;
            return this.questions[ (trial_idx-this.criterionIdx+1)%(this.questions.length) ][ trial_idx ];
        } else {
            return this.questions[ 0 ][ trial_idx ];
        }
    } else {
        return this.questions[ trial_idx ];
    }
}

//////////////////////////////////////////////////////
// Intro and Background
//////////////////////////////////////////////////////

function addIntro( exp_struct, mode ) {
    var specs = [
        // 0 general introduction
        { "plugin": "text",
          "text": "<p>The study is divided into 4 parts. Each part should take less than 15 minutes.</p><ul><li>In the 1st part, you'll see a quick review of exponential notation.</li><li>In the 2nd part, you'll do some math problems.</li><li>In the 3rd part, you'll read a lesson about how to solve the problems, and do some practice problems for which the solutions will be shown.</li><li>In the 4th part, you'll do some more problems without being shown the solutions.</li></ul><p>At the end of the study, you'll be asked a few easy questions about yourself.</p><p>Let's get started with the first part!</p>" },
        // 1 exponent lesson
        { "plugin": "text",
          "text": "<p><i>Below is a brief review of 'Exponents'. Please read it carefully. Later, you will be asked some questions to test your recall, and you will not be able to return to this page.</i></p><h1>EXPONENTS</h1><p>Exponents are a convenient way to express 'multiply something by itself several times'.</p><p>Here is an example: <strong>2<sup>3</sup></strong>. This is read as 'two to the third power', and means 'two multiplied by itself three times', i.e. 2*2*2=8.</p><p><strong>2<sup>3</sup></strong> is different from <strong>3<sup>2</sup></strong>. The second expression is read as 'three to the second power', and means 'three multiplied by itself two times', i.e. 3*3=9.</p><table border='1'><tr><td>In general, if <i>m</i> and <i>n</i> are two numbers, then <strong><i>m<sup>n</n></sup></i></strong> means '<i>m</i> multiplied by itself <i>n</i> times.'</tr></td></table><p>The number which is multiplied by itself several times is called the <strong>base</strong> (i.e. the number on the lower left). The number of times by which that number is multiplied is called the <strong>exponent</strong> (i.e. the number on the upper right).</p>" },
        // 2 catch trials
        { "plugin": "radio-multiple",
          "text": [
            "<p>Here are a few questions to test your understanding. Note: <b>You must get ALL of these questions correct in order to proceed!</b></p>Which of the following is the meaning of <strong>6<sup>4</sup></strong>?</p>",
            "<p>Which of the following is the meaning of <strong>3<sup>7</sup></strong>?</p>",
            "<p>Which of the following means the same as '5 multiplied by itself 8 times?'</p>",
            "<p>Which of the following means the same as '9 multiplied by itself 2 times'?</p>" ],
          "answers": [ 
            [ "6 multiplied by itself 4 times, i.e. 6*6*6*6", "4 multiplied by itself 6 times, i.e. 4*4*4*4*4*4" ],
            [ "7 multiplied by itself 3 times, i.e. 7*7*7", "3 multiplied by itself 7 times, i.e. 3*3*3*3*3*3*3" ],
            [ "5<sup>8</sup>", "8<sup>5</sup>" ],
            [ "9<sup>2</sup>", "2<sup>9</sup>" ] ],
          "key": [ 0, 1, 0, 0 ],
          "feedback": repeat( "Oops! One of your answers is not correct. Please find the error and correct it before proceeding.", 4 ) },
        // 3 pretest intro
        { "plugin": "text",
          "text": "<p><img src='images/smiley20face_thumbsup.jpg'></p><p>Congratulations! You've finished the 1st part of the study.<p>In the 2nd part, you'll solve 12 multiple-choice math problems. A progress bar at the top will show you how many you've completed and how many you have left.</p><p>It's okay if you don't know how to do the problems - just give it your best guess. Later, you'll read a tutorial about how to do the problems.</p>" }
        ];
    var data = [];
    for ( var i=0; i<specs.length; i++ ) {
        data.push( { "section": "Introduction", "number": i } );
    }
    // data[2]["text_key"] = specs[2]["key"].toString();
    exp_struct.push( { "type": "survey", "mode": mode, "specs": specs, "data": data } );
}

function addBackground( exp_struct, mode ) {

    var specs = [
        // 0 prevexp
        { "plugin": "radio",
          "text": "Before taking this survey, had you ever learned about Sampling with Replacement problems before?",
          "answers": [ "Yes", "Maybe", "No" ] },
        // 1 prevcomp
        { "plugin": "radio",
          "text": "How would you rate your understanding of Sampling with Replacement problems <b>before</b> taking this survey?",
          "answers": [ "Understood completely", "Understood somewhat", "Did not understand very much", "Did not understand at all" ] },
        // 2 postcomp
        { "plugin": "radio",
          "text": "How would you rate your understanding of Sampling with Replacement problems <b>after</b> taking this survey?",
          "answers": [ "Understood completely", "Understood somewhat", "Did not understand very much", "Did not understand at all" ] },
        // 3 comments
        { "plugin": "essay",
          "text": "Do you have any comments or suggestions for us about this study?" },
        // 4 graphical
        { "plugin": "radio",
          "text": "Which of these statements best describes you?",
          "answers": [ "I am much better at visual thinking than verbal thinking", "I am somewhat better at visual thinking than verbal thinking", "I am equally good at visual thinking and verbal thinking", "I am somewhat better at verbal thinking than visual thinking", "I am much better at verbal thinking than visual thinking" ] },
        // 5 sex
        { "plugin": "radio",
          "text": "Are you male or female?",
          "answers": [ "Male", "Female" ] },
        // 6 age
        { "plugin": "radio",
          "text": "How old are you?",
          "answers": [ "Under 18", "18 to 21", "22 to 25", "26 to 30", "31 to 35", "36 to 40", "41 or over" ] },
        // 7 education
        { "plugin": "radio", 
          "text": "What is the highest level of education you have completed?",
          "answers": [ "Below high school", "High school / GED", "Some college", "2-year college degree", "4-year college degree", "Master's degree", "Doctoral degree", "Professional degree (JD, MD, etc.)" ] },
        // 8 SAT math
        { "plugin": "number", 
          "text": "Which of the following is <strong>your highest score on the SAT MATH section</strong>? (If you have not taken the SAT, or do not remember your score on the MATH section, please choose one of the last two responses.)", 
          "minimum": 200, "maximum": 800,
          "answers": [ "Did not take the SAT", "Do not remember my score on the SAT MATH" ] },
        // 9 ACT math
        { "plugin": "number", 
          "text": "Which of the following is <strong>your highest score on the ACT MATH section</strong>? (If you have not taken the ACT, or do not remember your score on the MATH section, please choose one of the last two responses.)", 
          "minimum": 1, "maximum": 36, 
          "answers": [ "Did not take the ACT", "Do not remember my score on the ACT MATH" ] }
        ];
          
    var data=[];
    for ( var i=0; i<specs.length; i++ ) {
        data.push( { "section": "Background", "number": i } );
    }
    
    exp_struct.push( { "type": "survey", "mode": mode, "specs": specs, "data": data } );
}

