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

function makeExpStructPart1( condTestSeq, sections, mode ) {

    // generate test stimuli according to experimental condition
    // these are generated in advance because the randomization decisions made are shared across sections
    var questions_test      = generateTestQuestionSets( condTestSeq );
    
    // construct the experiment structure using the retrieved stimuli
    var exp_struct = [];
    if ( sections.indexOf( "Intro" ) != -1 )    { addIntro( exp_struct, mode ); }
    if ( sections.indexOf( "Pretest" ) != -1 )  { addTest( exp_struct, mode, "Pretest", questions_test["Pretest"] ); }
    
    // return the experiment structure
    return( exp_struct );
    
}

function makeExpStructPart2( condVariation, condVersion, yokingSeq, sections, mode ) {

    // generate test stimuli according to experimental condition
    // these are generated in advance because the randomization decisions made are shared across sections
    var questions_test      = generateTestQuestionSets( condTestSeq );
    
    // construct the experiment structure using the retrieved stimuli
    var exp_struct = [];
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
Question = function( quesID, schema, base_noun, exp_noun, base_label, exp_label, text_long, text_short, explanation ) {
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
        } else if ( type=="role prompt" ) {
            ques_text   = "<p>Next, which thing in the problem plays the role of 'selection events' and which plays the role of 'options'?</p>";
            answers     = [ "The " + question.exp_noun + " are the 'selection events,' and the " + question.base_noun + " are the 'options.'",
                            "The " + question.base_noun + " are the 'selection events,' and the " + question.exp_noun + " are the 'options.'" ];
            key         = 0;
        } else if ( type=="final long" ) {
            ques_text   = "<p>Finally, what is the answer to the problem?</p>";
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
        // create four questions: relational and role prompts and final answer prompt for long version, then short version without relational prompts
        for ( var i=0; i<4; i++ ) {
            if ( ( i==0 ) || ( i==3 ) ) { randomize(); }
            set_text_and_answers( [ "relational prompt", "role prompt", "final long", "short version" ][ i ] );
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

// getTestQuestionsBySet
//      provides all test questions, organized by question set
function getTestQuestionsBySet() {
    var test_question_sets = [
        [
            new Question( 21, "OAPlc", "colors", "rooms", "color", "room",
            // long version
            // original:
            // "<p>A homeowner is going to repaint several rooms in her house. She chooses one color of paint for each of the rooms. (It is possible for multiple rooms to be painted the same color.)</p><p>In how many different ways can she paint the rooms, if there are {0} {1} and {2} {3}?</p>", 
            "<p>A homeowner is going to repaint several rooms in her house. She chooses one color of paint for the living room, one for the dining room, one for the family room, and so on. (It is possible for multiple rooms to be painted the same color.)</p><p>In how many different ways can she paint the rooms, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can she paint the rooms now?</p>" ),
            new Question( 22, "CAE", "categories", "paranormal events", "category", "event",
            // long version
            "<p>An FBI agent is investigating several paranormal events. She must write a report classifying each event into a category such as Possession, Haunting, Werewolf, and so on.</p><p>In how many different ways can she write her report, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can she write her report now?</p>" ),
            new Question( 23, "OAPpl", "employees", "prizes", "employee", "prize",
            // long version
            "<p>A prize drawing is held at a small office party, and each of several prizes is awarded to one of the employees. (It is possible for multiple prizes to be awarded to the same employee.)</p><p>In how many different ways can the prizes be awarded, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the prizes be awarded now?</p>" ),
            new Question( 24, "PCO", "fishing spots", "fishermen", "spot", "fisherman",
            // long version
            "<p>Several fishermen go fishing in the same lake, and each of them chooses one of several spots at which to fish. (It is possible for more than one fisherman to choose the same spot.)</p><p>In how many different ways can the fishermen choose their spots, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the fishermen choose their spots now?</p>" ),
            new Question( 25, "OSS", "types of wine", "courses in the meal", "type of wine", "course",
            // long version
            "<p>A gourmet chef is preparing a fancy several-course meal. There are several types of wine available, and the chef needs to choose one wine to serve with each course. (It is possible for the same wine to be served with more than one course.)</p><p>In how many different ways can the wines be chosen, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the wines be chosen now?</p>" ),
            // this next question was added from exp 4, i.e. it was not included in exps 3 or 5
            new Question( 26, "OAPpl", "sons", "houses", "son", "house",
            // long version
            "<p>A wealthy old woman is writing her will. She owns several houses, and wishes to leave each house to one of her sons. (It is possible for her to leave more than one house to the same son.)</p><p>In how many different ways can she write this part of her will, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the old woman write her will now?</p>" )
        ],
        [
            new Question( 27, "OAPlc", "crops", "fields", "crop", "field",
            // long version
            "<p>A farmer is planning what crops he will plant this year. He chooses one crop for each of several fields. (It is possible for multiple fields to receive the same crop.)</p><p>In how many different ways can the farmer plant his crops, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can he plant his crops now?</p>" ),
            new Question( 28, "CAE", "categories", "weather events", "category", "event", 
            // long version
            "<p>A meteorologist must write a report classifying each extreme weather event which occurred in the past year into a category such as Hurricane, Tropical Storm, etc.</p><p>In how many different ways can he write his report, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can he write his report now?</p>" ),
            // as in Exp 5, changed "districts" to "provinces" in order to avoid linguistic overlap with the city districts/public works training problem
            new Question( 29, "OAPpl", "children", "provinces", "child", "province",
            // long version
            "<p>An aging king plans to divide his lands among his heirs. Each province of the kingdom will be assigned to one of his many children. (It is possible for multiple provinces to be assigned to the same child.)</p><p>In how many different ways can the provinces be assigned, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the provinces be assigned now?</p>" ),
            new Question( 30, "PCO", "treatments", "doctors", "treatment", "doctor",
            // long version
            "<p>There are several possible treatments for a certain rare disease. A patient with this disease consults several doctors, and each doctor recommends one of the possible treatments. (It is possible for more than one doctor to recommend the same treatment.)</p><p>In how many different ways can the doctors make their recommendations, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the doctors make their recommendations now?</p>" ),
            // next question originally said "daughters" instead of "dates" in exp 3 - same change made in Exp 5
            new Question( 31, "OSS", "colognes to choose from", "dates", "cologne", "date", 
            // long version
            "<p>Don Juan has one date with each of a merchant's daughters. For each date, he puts on a cologne he thinks that daughter will like. (It is possible for him to choose the same cologne for more than one date.)</p><p>In how many different ways can he choose colognes for his dates, if there are {0} {1} and {2} {3}?</p>", 
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can he choose colognes for his dates now?</p>" ),
            // this next question was added from exp 4, i.e. it was not included in exps 3 or 5
            new Question( 32, "OAPpl", "detectives", "cases", "detective", "case", 
            // long version
            "<p>A police department receives several new cases in one day. Each new case is assigned to one of the detectives. (It is possible for multiple cases to be assigned to the same detective.)</p><p>In how many different ways can the cases be assigned, if there are {0} {1} and {2} {3}?</p>",
            // short version
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the cases be assigned now?</p>" )
        ] ];
        
    return test_question_sets;
}

// getTrainingQuestions
//      provides the entire set of training examples used in all conditions, organized by schema
function getTrainingQuestions() {

    var questions_by_schema = {};
    
    questions_by_schema["PCO"] = [
        // problems 101-106 correspond to problems 1-6 in experiment 6
        // there are minor wording changes, same as in experiment 7
        // short versions and feedback are added in experiment 8 (but are mostly same as in experiment 6)
        new Question( 101, "PCO", "meals", "friends", "meal", "friend",
            "<p>A group of friends is eating at a restaurant. Each friend chooses a meal from the menu. (It is possible for multiple friends to choose the same meal.)</p><p>In how many different ways can the friends choose their meals, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the friends choose their meals now?</p>", 
            "According to your answer, some of the friends might not get \"used.\" However, the problem says \"<strong>each friend</strong>\" chooses a meal. Also, in your answer, the same friend might get matched to more than one meal. But the problem says that each friend chooses only one meal." ),
        new Question( 102, "PCO", "pizza brands", "consumers", "pizza brand", "consumer",
            "<p>A marketing research company conducts a taste test survey. Several consumers are each asked to choose their favorite from among several pizza brands. (It is possible for multiple consumers to choose the same brand.)</p><p>How many different results of the survey are possible, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different results of the survey are possible now?</p>", 
            "According to your answer, some of the consumers might not get \"used.\" However, the problem says the consumers \"are <strong>each</strong> asked\" to choose their favorite. Also, in your answer, the same consumer might get matched to more than one pizza brand. But the problem says that each consumer will choose their favorite, meaning <strong>only one</strong>.\"" ),
        new Question( 103, "PCO", "majors", "students", "major", "student",
            "<p>Several college freshmen are discussing what they want to study in college. Each of them has to choose a major from a list of available majors. (Of course, it is possible for more than one to choose the same major.)</p><p>In how many different ways can the students choose their majors, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the students choose their majors now?</p>", 
            "According to your answer, some of the students might not get \"used.\" However, the problem says \"<strong>Each of them</strong> has to choose a major.\" Also, in your answer, the same student might get matched to more than one possible major. But the problem says they each must choose <strong>a</strong> major, meaning <strong>only one</strong>.\"" ),
        new Question( 104, "PCO", "types of toy", "children", "toy", "child",
            "<p>During playtime at a kindergarten, the teacher offers the children a number of different types of toy. Each child has to choose one type of toy. (There are enough toys of each type that more than one child, or even all of them, can choose the same type.)</p><p>In how many different ways can the children choose their toys, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the children choose their toys now?</p>",
            "According to your answer, some of the children might not get \"used.\" However, the problem says \"<strong>Each child</strong> has to choose one type of toy.\" Also, in your answer, the same child might get matched to more than one type of toy. But the problem says \"each child has to choose <strong>one type of toy</strong>.\"" ),
        new Question( 105, "PCO", "stocks", "bankers", "stock", "banker",
            "<p>Amy has decided to invest in one of several stocks. She asks several bankers for their advice, and each banker chooses one of the stocks to advise her to buy. (It is possible for more than one banker to choose the same stock.)</p><p>In how many different ways can the bankers choose stocks, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the bankers choose stocks now?</p>",
            "According to your answer, some of the bankers might not get \"used.\" However, the problem says \"<strong>each banker</strong> chooses.\" Also, in your answer, the same banker might get matched to more than one stock. But the problem says each banker chooses \"<strong>one</strong> of the stocks.\"" ),
        new Question( 106, "PCO", "trails", "hikers", "trail", "hiker",
            "<p>Several hikers go hiking at a national park that has numerous hiking trails. Each hiker chooses one of the trails to hike on. (It is possible for more than one hiker to hike on the same trail.)</p><p>In how many different ways can the hikers choose trails, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the hikers choose trails now?</p>",
            "According to your answer, some of the hikers might not get \"used.\" However, the problem says \"<strong>each hiker</strong> chooses.\" Also, in your answer, the same hiker might get matched with more than one trail. But the problem says each hiker chooses \"<strong>one</strong> of the trails.\"" ),
        new Question( 107, "PCO", "horses", "gamblers", "horse", "gambler",
            "<p>Several gamblers are watching a horse race. Each of them bets on one of the horses to win. (More than one gambler can bet on the same horse.)</p><p>In how many different ways can the gamblers place their bets, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the gamblers place their bets now?</p>",
            "According to your answer, some of the gamblers might not get \"used.\" However, the problem says \"<strong>each</strong>\" gambler bets. Also, in your answer, the same gambler might get matched to more than one horse. But the problem says each of them bets on \"<strong>one</strong>\" of the horses." ),
        new Question( 108, "PCO", "signs", "fans", "sign", "fan",
            "<p>Fans attending the basketball game are given a sign with admission to the game. Each fan chooses from several different signs offered, such as \"D-fense,\" \"play hard,\" \"get loud,\" etc. (The same sign can be chosen by more than one fan.)</p><p>In how many different ways can the fans choose their signs, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the fans choose their signs now?</p>",
            "According to your answer, some of the fans might not get \"used.\" However, the problem says \"<strong>each fan</strong>\" chooses a sign. Also, in your answer, the same fan might get matched to more than one sign. But the problem says each fan is given \"<strong>a</strong> sign,\" meaning only one." ),
        new Question( 109, "PCO", "songs", "singers", "song", "singer",
            "<p>At an audition for singers, several singers receive a list of songs, and each one has to pick one of the songs to sing. (It is possible for more than one singer to choose the same song.)</p><p>In how many different ways can the singers pick their songs, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the singers pick their songs now?</p>",
            "According to your answer, some of the singers might not get \"used.\" However, the problem says \"<strong>each one</strong>\" picks a song. Also, in your answer, the same singer might get matched to more than one song. But the problem says each picks \"<strong>one</strong> of the songs.\"" ),
        new Question( 110, "PCO", "spa packages", "vacationers", "package", "vacationer",
            "<p>A group of vacationers go to their resort spa, where various spa packages are offered. Each person chooses a spa package. (It is possible for multiple people to choose the same spa package.)</p><p>In how many different ways can the vacationers pick their spa packages, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the vacationers pick their spa packages now?</p>",
            "According to your answer, some of the vacationers might not get \"used.\" However, the problem says \"<strong>each</strong> person chooses.\" Also, in your answer, the same vacationer might get matched to more than one package. But the problem says each person chooses \"<strong>a</strong> spa package,\" meaning only one." ),
        new Question( 111, "PCO", "types of bat", "players", "bat", "player",
            "<p>During batting practice for a baseball team, the coach offers the players a variety of different bats to use, e.g. wood, aluminum, hybrid, etc. Each player picks out one of these. (There are enough bats of each type that more than one player, or even all of them, can choose the same type.)</p><p>In how many different ways can the baseball team pick their bats, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the baseball team pick their bats now?</p>",
            "According to your answer, some of the players might not get \"used.\" However, the problem says \"<strong>each</strong> player picks.\" Also, in your answer, the same player might get matched to more than one bat. But the problem says each player picks out \"<strong>one</strong>\" bat." ),
        new Question( 112, "PCO", "essays", "judges", "essay", "judge",
            "<p>A local organization is holding an essay competition. To determine which essay will qualify for the next round, the judges of the competition must each vote for their favorite essay. (It is possible for a single essay to receive more than one vote, but each judge has only one vote.)</p><p>In how many ways can the judges cast their votes, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many ways can the judges cast their votes now?</p>",
            "According to your answer, some of the judges might not get \"used.\" However, the problem says the judges \"must <strong>each</strong> vote.\" Also, in your answer, the same judge might get matched to more than one essay. But the problem says each judge votes for his/her \"<strong>favorite</strong>,\" meaning only one." ),
        new Question( 113, "PCO", "parts available", "actors trying out", "part", "actor",
            "<p>Several actors come to try out for a play, and there are several parts available. However, a given actor can only try out for one part. (It is possible for more than one actor to try out for the same part.)</p><p>In how many different ways can the actors try out for parts, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the actors try out for parts now?</p>",
            "According to your answer, some of the actors might not get \"used.\" However, the problem implies that every actor will try out. Also, in your answer, the same actor might get matched to more than one part. But the problem says a given actor \"can only try out for <strong>one</strong> part.\"" ),
        new Question( 114, "PCO", "star ratings", "critics", "star", "critic",
            "<p>Several restaurant critics all rate the same restaurant using a star rating system, i.e. from one star to the maximum number of stars. Each critic rates the restaurant separately (but it is possible that more than one critic might give the same rating).</p><p>In how many different ways can the critics rate the restaurant, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the critics rate the restaurant now?</p>",
            "According to your answer, some of the critics might not get \"used.\" However, the problem says \"<strong>each</strong> critic rates\" the restaurant. Also, in your answer, the same critic might get matched to more than one star rating. But the problem implies that each critic must choose give only one rating." ),
        new Question( 115, "PCO", "issues", "candidates", "issue", "candidate",
            "<p>In a primary election for a political party, there are several hot political issues, such as reducing crime, improving education, reining in the deficit, and so on.  Each candidate in the primary decides to focus on one of these issues as the center of their campaign.  (More than one candidate might focus on the same issue.)</p><p>In how many different ways can the issues be selected by the candidates, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the issues be selected by the candidates now?</p>",
            "According to your answer, some of the candidates might not get \"used.\" However, the problem says that \"<strong>each</strong> candidate\" selects an issue. Also, in your answer, the same candidate might get matched to more than one issue. But the problem says each candidate focuses on \"<strong>one</strong>\" of the issues." ),
        new Question( 116, "PCO", "textbooks", "history teachers", "textbook", "teacher",
            "<p>In a certain high school, there are several different textbooks used for a world history course.  Each history teacher can use whichever textbook he or she prefers.  (The same textbook can be used by more than one teacher.)</p><p>In how many different ways can textbooks be selected by the history teachers, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can textbooks be selected by the history teachers now?</p>",
            "According to your answer, some of the teachers might not get \"used.\" However, the problem says \"<strong>each</strong> history teacher\" chooses a book. Also, in your answer, the same teacher might get matched to more than one textbook. But the problem implies that each teacher can use only one textbook." ),
        new Question( 117, "PCO", "crimes", "journalists", "crime", "journalist",
            "<p>In a certain city, several major crimes occurred in the past week.  The crime journalists working at the city's newspapers each must decide which of these crimes to report on.  (The journalists work at different newspapers, so more than one could report on the same crime.)</p><p>In how many different ways can the journalists report on the crimes, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the journalists report on the crimes now?</p>",
            "According to your answer, some of the journalists might not get \"used.\" However, the problem says that the journalists \"<strong>each</strong>\" must report on a crime. Also, in your answer, the same journalist might get matched to more than one crime. But the problem implies that each journalist may only report on one crime." ),
        new Question( 118, "PCO", "presentations occurring at the same time", "professors", "presentation", "professor",
            "<p>Several professors from the same university are attending a conference.  There are several presentations occurring at the same time, so each professor can only attend one of them.  (However, more than one professor can attend the same presentation.)</p><p>In how many different ways can the professors attend the presentations, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the professors attend the presentations now?</p>",
            "According to your answer, some of the professors might not get \"used.\" However, the problem implies that every professor will attend a presentation. Also, in your answer, the same professor might get matched to more than one presentation. But the problem says that each professor \"can only attend <strong>one</strong>.\"" ),
        new Question( 119, "PCO", "topics", "contestants", "topic", "contestant",
            "<p>On a TV game show, during each round, each contestant must answer a trivia question correctly in order to move on to the next round.  The contestants can pick the topic of the question they will answer from the topics available.  (The same topic can be chosen by more than one contestant.)</p><p>In a given round, in how many different ways can the contestants pick their topics, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the contestants pick their topics now?</p>",
            "According to your answer, some of the contestants might not get \"used.\" However, the problem says \"<strong>each</strong> contestant\" must choose a topic. Also, in your answer, the same contestant might get matched to more than one topic. But the problem says that the contestants pick \"<strong>the</strong> topic,\" meaning only one topic." ),
        new Question( 120, "PCO", "famous buildings", "painters", "building", "painter",
            "<p>Several painters visit a city famous for its beautiful architecture.  Each painter paints one of the famous buildings in the city.  (More than one of them might paint the same building.)</p><p>In how many different ways can the painters select which buildings to paint, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the painters select which buildings to paint now?</p>",
            "According to your answer, some of the painters might not get \"used.\" However, the problem says \"<strong>each</strong> painter\" paints a building. Also, in your answer, the same painter might get matched to more than one building. But the problem says each painter paints \"<strong>one</strong>\" of the buildings." )
    ];
            
    questions_by_schema["OSS"] = [
        new Question( 201, "OSS", "hotels that she likes", "trips to Berlin", "hotel", "trip",
            "<p>Sheila goes to Berlin on business several times each year, and each time she goes, she stays at one of several hotels that she likes. (There might be more than one time when she stays at the same hotel.)</p><p>In how many different ways could she plan her hotel stays this year, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways could she plan her hotel stays this year now?</p>",
            "According to your answer, some of the trips might not get \"used.\" That would mean Sheila did not stay at any of the hotels on those trips, but the problem says she always stays at one of the hotels. Also, in your answer, one of the trips might get matched to more than one hotel, meaning Sheila would stay at multiple hotels on that trip, but the problem says she only stays at one hotel per trip." ),
        new Question( 202, "OSS", "plot elements", "scenes in a script", "element", "scene",
            "<p>ScriptWriter Pro is a software that helps script writers come up with movie scripts by randomly generating script outlines. A script outline contains a certain number of scenes, with each scene containing a single plot element, such as \"exposition,\" \"action,\" \"suspense,\" and so on. (The same plot element could be used more than once in a script outline.)</p><p>How many different script outlines are possible, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different script outlines are possible now?</p>",
            "According to your answer, some of the scenes might not get \"used.\" However, the problem says \"<strong>each</strong> scene\" contains a plot element. Also, in your answer, the same scene might get matched to more than one plot element. But the problem says each scene contains \"a <strong>single</strong> plot element.\"" ),
        new Question( 203, "OSS", "moves that she has learned", "moves in one message", "move", "position",
            "<p>Felicia is learning flag semaphore, a system for sending messages by making different moves with flags held in each hand. She can send different messages by making different moves in different sequences. (It is possible to make the same move more than once in a message.)</p><p>How many different messages can Felicia send, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different messages can Felicia send now?</p>",
            "According to your answer, some of the movies in one message might not get \"used.\" That would mean those positions in the message were \"blank,\" which makes no sense. Also, in your answer, the same move in one message might get matched to more than one of the movies Felicia has learned. That would mean she would make multiple moves at the same time, which the problem did not say is allowed." ),
        new Question( 204, "OSS", "games on his phone", "hours to kill", "game", "hour",
            "<p>Suppose Jose has several hours to kill. He spends each hour playing one of the games on his phone. (He might play the same game on more than one hour.)</p><p>In how many different ways can he kill the time, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can he kill the time now?</p>",
            "According to your answer, some of the hours might not get \"used,\" meaning that Jose does not play any game during those hours. However, the problem says he \"spends <strong>each</strong> hour\" playing a game. Also, in your answer, the same hour might get matched to more than one game. But the problem says he only plays \"<strong>one</strong> of the games\" in a given hour." ),
        new Question( 205, "OSS", "distinct hieroglyphs", "hieroglyphs in each sentence", "hieroglyph", "sentence position",
            "<p>Archaeologists discover records of an ancient language whose writing system was based on hieroglyphs.  Strangely, each sentence in the language contained the same number of hieroglyphs (and a given hieroglyph could be repeated multiple times within a sentence).</p><p>How many different sentences were possible in this language, if there were {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different sentences were possible in this language now?</p>",
            "According to your answer, some of the hieroglyphs in a sentence might not get \"used.\" That would mean those positions in the sentence were \"blank,\" which makes no sense. Also, in your answer, the same position in a sentence might get matched to more than one distinct hieroglyph. That would mean multiple hieroglyphs are written in the same position, which makes no sense." ),
        new Question( 206, "OSS", "shops in the shopping center", "pages in a booklet", "shop", "page",
            "<p>A clerk at a shopping center passes out coupon booklets to shoppers.  Each page of the booklets contains a coupon for one of the shops in the center, selected randomly.  (It is possible for more than one page to contain coupons for the same shop.)</p><p>How many different coupon booklets are possible, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different coupon booklets are possible now?</p>",
            "According to your answer, some of the pages might not get \"used.\" However, the problem says \"<strong>each</strong> page\" contains a coupon. Also, in your answer, the same page might get matched to more than one shop. But the problem says each page contains a coupon for \"<strong>one</strong> of the shops.\"" ),
        // problems 207-212 correspond to problems 7-12 in experiment 6
        // there are minor wording changes, same as in experiment 7
        // short versions and feedback are added in experiment 8 (but are mostly same as in experiment 6)
        new Question( 207, "OSS", "keys in the set", "notes in each melody", "key", "note",
            "<p>A piano student, when bored, plays random melodies on the piano. Each melody is the same number of notes long, and uses only keys from a fixed set of keys. (It is possible to play the same key more than once in a sequence.)</p><p>How many different melodies are possible, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different sequences are possible now?</p>",
            "According to your answer, some of the notes might not get \"used.\" That would mean those positions in the melody were \"blank,\" which makes no sense. Also, in your answer, the same note might get matched to more than one key. That would mean multiple keys are played at the same position in the melody, which the problem did not say is allowed." ),
        new Question( 208, "OSS", "allowable letters", "letters in each password", "letter", "position",
            "<p>A website generates user passwords by selecting a certain number of letters randomly from a set of allowable letters. (It is possible to use the same letter more than once in a password.)</p><p>How many different passwords are possible, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different passwords are possible now?</p>",
            "According to your answer, some of the positions might not get \"used.\" That would mean those positions were \"blank,\" which makes no sense. Also, in your answer, the same position might get matched to more than one letter. That would mean multiple letters were generated for the same position in the password, which also makes no sense." ),
        new Question( 209, "OSS", "buttons", "flashes per sequence", "button", "flash", 
            "<p>The game Simon uses a disk with several different-colored buttons. The buttons flash in sequence and then the player has to push the buttons in the same sequence - otherwise they get a shock. (It is possible for the same button to flash more than once in a sequence.)</p><p>How many different sequences are possible, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different sequences are possible now?</p>",
            "According to your answer, some of the flashes in the sequence might not get \"used.\" That just means having fewer flashes total, which would contradict the assumption about how many flashes there are. Also, in your answer, the same flash might get matched to more than one button. That would mean multiple buttons flash at the same time, which the problem did not say is possible." ),
        new Question( 210, "OSS", "permissible numbers", "numbers on each ticket", "number", "position",
            "<p>In a certain city, municipal lottery tickets are printed using series of numbers chosen randomly from a list of permissible numbers. (It is possible for the same number to appear at more than one position in a series.)</p><p>How many different lottery tickets are possible, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different lottery tickets are possible now?</p>",
            "According to your answer, some of the number positions might not get \"used.\" That would mean no number at all appears in those positions, which the problem did not say is possible. Also, in your answer, more than one number could be chosen for the same position. That would make no sense." ),
        new Question( 211, "OSS", "answers for each question", "questions on the exam", "answer", "question",
            "<p>A student is taking a multiple choice exam. Each question has the same number of answers and the student just chooses an answer randomly. (It is possible for him to choose the same answer for more than one question.)</p><p>In how many different ways can he fill out the exam, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can he fill out the exam now?</p>",
            "According to your answer, some of the questions might not get \"used.\" But the problem says he chooses an answer for each question. Also, in your answer, the same question could be matched to more than one answer. But the problem says that he chooses <strong>an</strong> answer, meaning <strong>one</strong> answer, for each question." ),
        new Question( 212, "OSS", "dresses", "days with dances", "dress", "day",
            "<p>Elizabeth is going to attend a dance every day for the next several days. Each day, she chooses a dress to wear to the dance. (It is possible for her to choose the same dress on more than one day.)</p><p>In how many different ways can she choose her dresses, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can she choose her dresses now?</p>",
            "According to your answer, some of the days might not get \"used.\" But the problem says she chooses a dress <strong>\"each day.\"</strong> Also, in your answer, the same day could be matched to more than one dress. But the problem says that she chooses <strong>a</strong> dress, meaning <strong>one</strong> dress, each day." ),
        new Question( 213, "OSS", "modes of transport", "legs of the trip", "mode", "leg",
            "<p>Tonia is taking a trip from Chicago to Los Angeles, passing through several cities on the way. On each leg of the trip, she can use any of several modes of transport, such as bus, train, or airplane. (There might be more than one leg of the trip for which she uses the same mode of transport.)</p><p>In how many different ways can she travel from Chicago to Los Angeles, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can she travel from Chicago to Los Angeles now?</p>",
            "According to your answer, some of the legs of the trip might not get \"used.\" That would mean Tonia did not choose <strong>any</strong> mode of transport for those legs, which makes no sense. Also, in your answer, the same leg might get matched to more than one mode of transport, which makes no sense." ),
        new Question( 214, "OSS", "controller buttons", "button presses per combination", "controller button", "button press",
            "<p>In a video game about martial arts fighting, you can make a character do cool moves by pressing several buttons on the controller in a certain order, such as \"up-left-down-...\". Each combination consists of the same number of button presses. (The same button might need to be pressed more than once in a given combination.)</p><p>How many different combinations are possible, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different combinations are possible now?</p>",
            "According to your answer, some of the button presses per combination might not get \"used.\" That would mean those positions in the combination were \"blank,\" which makes no sense. Also, in your answer, the same button press might get matched to more than one button. That would mean that more than one button was pressed at the same time, which the problem did not say is allowed." ),
        new Question( 215, "OSS", "possible hand gestures", "gestures in a handshake", "possible movement", "movement position",
            "<p>The Gamma Gamma Gamma fraternity wants to invent a special handshake for fraternity brothers. The handshake will involve a series of hand gestures such as bumping fists, high five, or thumbs-up. (It is possible to repeat the same gesture more than once during the handshake.)</p><p>How many different handshakes are possible, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different handshakes are possible now?</p>",
            "According to your answer, some of the gestures in a handshake might not get \"used.\" That would mean those positions in the handshake were \"blank,\" which makes no sense. Also, in your answer, the same position might get matched to more than one possible gesture. That would mean more than one gesture was made at the same time, which the problem did not say is allowed." ),
        new Question( 216, "OSS", "different words", "words per line", "word", "position",
            "<p>Suppose Phil owns a \"magnetic poetry\" set which can be used to create lines of poetry by sticking magnetic words onto the refrigerator. Suppose he creates different lines which all contain the same number of words. (He has an unlimited supply of each word, so he can use the same word more than once in a single line.)</p><p>How many different lines of poetry can Phil create if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different lines of poetry can Phil create now?</p>",
            "According to your answer, some of the positions in a line might not get \"used.\" That would mean those positions were \"blank,\" which makes no sense. Also, in your answer, the same position might get matched to more than one different word. That would mean Phil put more than one word in the same position in a sentence, which makes no sense." ),
        new Question( 217, "OSS", "bead materials", "beads on each bracelet", "material", "bead",
            "<p>A jeweler makes bracelets by stringing together beads made of different materials, such as gold, silver, titanium, etc. Each bracelet has the same number of beads on it. (It is possible for the same bead material to be repeated more than once on a single bracelet.)</p><p>How many different bracelets are possible, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different bracelets are possible now?</p>",
            "According to your answer, some of the bead positions on a bracelet might not get \"used.\" That would mean those positions were \"blank,\" which makes no sense. Also, in your answer, more than one bead material might get matched to the same bead position, which is impossible because the problem implies that each bead has only one material." ),
        new Question( 218, "OSS", "flavors", "layers in each cake", "flavor", "layer",
            "<p>A baker is making layer cakes by selecting various flavors of cakes to stack in layers.  He chooses the layer flavors randomly from the selection of flavors he has in his store, such as chocolate, vanilla, red velvet, etc. (It is possible to use the same flavor more than once in a cake.)</p><p>How many different layer cakes are possible if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different layer cakes are possible now?</p>",
            "According to your answer, some of the layers might not get \"used.\" That would make no sense. Also, in your answer, more than one flavor might get matched to the same layer. But the problem implies that the baker only used one flavor in a given layer." ),
        new Question( 219, "OSS", "breeds of flower", "flowers per row", "breed", "flower",
            "<p>A large mansion grows many breeds of flower, like roses, pansies, and irises, which are used to decorate the mansion.  The housekeeper places a row of flowers on each window sill, using the same number of flowers in each row, but varying the specific breeds and their order.  (The same breed can be used more than once in a row.)</p><p>How many different rows of flowers are possible, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different rows of flowers are possible now?</p>",
            "According to your answer, some of the positions in a row might not get \"used.\" That would mean those positions were empty, which makes no sense. Also, in your answer, the same position might get matched to more than one breed of flower. That would mean multiple breeds of flower are placed in the same place, which the problem did not say is allowed." ),
        new Question( 220, "OSS", "cellphone models", "phones in each row", "model", "position",
            "<p>Each display case in a cellphone store contains a row of cellphones selected from the models currently on sale.  The cases are all the same size, so there are the same number of phones in each row.  (A given cellphone model might appear multiple times in a single row, for example if it is a very popular phone.)</p><p>How many different ways are there to fill a display case, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many different ways are there to fill a display case now?</p>",
            "According to your answer, some of the positions in a row might not get \"used.\" That would mean those positions were empty, which makes no sense. Also, in your answer, the same position might get matched to more than one cellphone model. That would mean multiple cellphones are placed in the same place, which makes no sense." )
    ];

    questions_by_schema["TFR"] = [
        // TFR questions are copied from exp 7 and none were used before that exp
        new Question( 301, "TFR", "fonts", "document styles", "font", "document style",
            "<p>In Microsoft Word, different document styles are used to format text in different parts of the document, such as \"title,\" \"chapter heading,\" \"sub-section heading,\" etc. A font must be assigned to each document style. (It is possible to assign the same font to more than one document style.)</p><p>In how many ways can fonts be assigned to document styles, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many ways can fonts be assigned to document styles now?</p>",
            "According to your answer, some of the document styles might not get \"used.\" However, the problem says a font must be assigned to \"<strong>each</strong> document style.\" Also, in your answer, the same document style might get matched to more than one font. But the problem says <strong>a</strong> font is assigned to each style, meaning only one." ),
        new Question( 302, "TFR", "ring tones", "types of ring", "ring tone", "type of ring",
            "<p>A smartphone comes pre-loaded with various ring tones.  For each type of ring, such as \"incoming call,\" \"alarm,\" \"new mail,\" etc., you can set any of the ring tones. (It is possible to set the same ring tone for multiple types of ring.)</p><p>In how many different ways can types of ring be set with ring tones, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can types of ring be set with ring tones now?</p>",
            "According to your answer, some of the types of ring might not get \"used.\" However, the problem says you can set a ring tone \"for <strong>each</strong> type of ring.\" Also, in your answer, the same type of ring might get matched to more than one ring tone. But the problem implies only one ring tone can be set for each type of ring." ),
        new Question( 303, "TFR", "icons", "triggers", "icon", "trigger",
            "<p>Suppose the settings on a computer allow one to set what kind of icon is used for the mouse pointer, e.g. an arrow, a hand, a vertical line, etc. Icons can be set separately for a variety of \"triggers,\" like \"clicking something,\" \"hovering over a link,\" \"waiting for something,\" and so on. (The same icon could be set for more than one trigger.)</p><p>In how many different ways can icons be set for triggers, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can icons be set for triggers now?</p>",
            "According to your answer, some of the triggers might not get \"used.\" However, the problem implies an icon should be set for every trigger. Also, in your answer, the same trigger might get matched to more than one icon. But the problem says implies only one icon can be set for each trigger." ),
        new Question( 304, "TFR", "devices", "activities", "device", "activity",
            "<p>Sharon owns many different electronic devices, like a desktop computer, laptop computer, smartphone, etc., which she uses for activities like homework, surfing the net, and email. For a given activity, she always uses the same device. (She might use the same device for more than one activity.)</p><p>In how many different ways can she choose devices for activities, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can she choose devices for activities now?</p>",
            "According to your answer, some of the activities might not get \"used.\" However, the problem implies Sharon chooses a device for every activity. Also, in your answer, the same activity might get matched to more than one device. But the problem says Sharon always uses \"the <strong>same</strong> device,\" meaning only one, for a given activity." ),
        new Question( 305, "TFR", "shapes", "occasions", "shape", "occasion",
            "<p>Tanisha the baker makes cakes for all occasions, like birthdays, weddings, and anniversaries. She likes to make cakes in different shapes, e.g. round, square, or oval, but for any given occasion, she always uses the same shape. (However, there might be more than one occasion for which she uses the same shape.)</p><p>In how many different ways could she assign shapes of cake to occasions, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways could she assign shapes of cake to occasions now?</p>",
            "According to your answer, some of the occasions might not get \"used.\" However, the problem implies Tanisha chooses a shape for every occasion. Also, in your answer, the same occasion might get matched to more than one shape. But the problem says Tanisha always uses \"the <strong>same</strong> shape,\" meaning only one, for a given occasion." ),
        new Question( 306, "TFR", "screen savers", "types of software", "screen saver", "software",
            "<p>Alma's new computer comes with multiple different screen savers. The screen saver can be set separately depending on what kind of software is open on the computer, so that, for example, Alma could set one screen saver to activate when using Office software, another for internet browsers, another for games, and so on. (It is also possible to set the same screen saver for more than one type of software.)</p><p>In how many different ways can the screen savers be set up, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can the screen savers be set up now?</p>",
            "According to your answer, some of the types of software might not get \"used.\" However, the problem implies Alma chooses a screen saver for every type of software. Also, in your answer, the same type of software might get matched to more than one screen saver. But the problem implies only one screen saver can be set for a given type of software." ),
        new Question( 307, "TFR", "types of bark", "kinds of truffle", "bark", "truffle",
            "<p>Darren is training his dog to hunt truffles. He trains it to bark differently depending on what kind of truffle it finds: for example, a sharp yip for white truffles, a loud bark for black truffles, a growl for burgundy truffles, and so on. (However, he might train the dog to make the same bark for more than one kind of truffle.)</p><p>In how many different ways can Darren train his dog, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can Darren train his dog now?</p>",
            "According to your answer, some of the kinds of truffle might not get \"used.\" However, the problem implies Darren chooses a type of bark for every kind of truffle. Also, in your answer, the same kind of truffle might get matched to more than one type of bark. But the problem implies Darren chooses only one type of bark for a given kind of truffle." ),
        new Question( 308, "TFR", "weapons", "enemies", "weapon", "enemy",
            "<p>Brandi plays an Orc Barbarian in World of Warcraft. She has many weapons, like axe, sword, and spear, but she always uses the same weapon for a particular kind of enemy, such as humans, elves, and dwarves. (There might be more than one kind of enemy for which she uses the same weapon.)</p><p>In how many different ways can Brandi choose weapons for different enemies, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways can Brandi choose weapons for different enemies now?</p>",
            "According to your answer, some of the enemies might not get \"used.\" However, the problem implies Brandi chooses a weapon for every type of enemy. Also, in your answer, the same enemy might get matched to more than one weapon. But the problem says Brandi always uses \"the <strong>same</strong> weapon,\" meaning only one, for a particular enemy." ),
        new Question( 309, "TFR", "pairs of sneakers", "sports that he plays", "pair of sneakers", "sport",
            "<p>Virgil owns many pairs of sneakers and decides which one to wear depending on what sport he is going to play. For example, he might wear one pair for jogging, another for basketball, another for tennis, and so on. (There might be more than one sport for which he wears the same pair of sneakers.)</p><p>In how many different ways could he match sneakers with sports, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways could he match sneakers with sports now?</p>",
            "According to your answer, some of the sports might not get \"used.\" However, the problem implies Virgil chooses a pair of sneakers for every sport that he plays. Also, in your answer, the same sport might get matched to more than one pair of sneakers. But the problem implies Virgil chooses only one pair of sneakers for a given sport." ),
        new Question( 310, "TFR", "sets of china", "types of guest", "set", "guest",
            "<p>A rich family has several sets of china to use for meals. For each type of guest, there is a particular set of china they use, e.g. one set of china for family, one for friends, and one for business acquaintances. (There might be more than one type of guest for which they use the same set of china.)</p><p>In how many different ways could sets of china be matched to types of guests, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways could sets of china be matched to types of guests now?</p>",
            "According to your answer, some of the types of guest might not get \"used.\" However, the problem says they use a set of china \"for <strong>each</strong> type of guest.\" Also, in your answer, the same type of guest might get matched to more than one set of china. But the problem says the family uses \"a <strong>particular</strong> set of china,\" meaning only one, for each type of guest." ),
        new Question( 311, "TFR", "paper grades", "document categories", "grade", "category",
            "<p>A print shop has several different grades of paper, and uses a particular grade of paper for each category of document that it prints, e.g. glossy paper for posters, book paper for business documents, bond paper for resumes, etc. (The same paper grade could be used for more than one document category.)</p><p>In how many different ways could paper grades be matched to document categories, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways could paper grades be matched to document categories now?</p>",
            "According to your answer, some of the document categories might not get \"used.\" However, the problem says the shop uses a grade of paper \"for <strong>each</strong> category of document.\" Also, in your answer, the same document category might get matched to more than one paper grade. But the problem says the shop uses \"a <strong>particular</strong> grade of paper,\" meaning only one, for each category of document." ),
        new Question( 312, "TFR", "knives", "different foods", "knife", "food",
            "<p>Russell has a few different knives in his kitchen, such as a chef's knife, a paring knife, a cleaver, etc.  For a given food, like vegetables, bread, or meat, he always cuts it with the same knife (but he might use the same knife for more than one food).</p><p>In how many different ways could Russell use knives for food, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways could Russell use knives for food now?</p>",
            "According to your answer, some of the foods might not get \"used.\" However, the problem implies Russel chooses a knife for every different food. Also, in your answer, the same food might get matched to more than one knife. But the problem says Russel always cuts a given foor with \"the <strong>same</strong> knife,\" meaning only one." ),
        new Question( 313, "TFR", "fragrances", "product variants", "fragrance", "variant",
            "<p>A company that makes personal care products is launching a new line of soap that includes several product variants, e.g. anti-perspirant soap, soap for sensitive skin, refreshing soap, and so on.  The product designer must give each product variant a fragrance, like lemon, lavender, or mint.  (More than one product variant could get the same fragrance.)</p><p>How many ways are there to pair fragrances with product variants, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. How many ways are there to pair fragrances with product variants now?</p>",
            "According to your answer, some of the product variants might not get \"used.\" However, the problem says the designer must give \"<strong>each</strong> product variant\" a fragrance. Also, in your answer, the same product variant might get matched to more than one fragrance. But the problem says each product is given <strong>a</strong> fragrance, meaning only one." ),
        new Question( 314, "TFR", "types of symbol", "types of building", "symbol", "building",
            "<p>Suppose you are designing a map and you have several types of symbol which can be used to represent different types of building.  For example, red hearts could represent hospitals, yellow rectangles could represent schools, and so on.  (The same type of symbol could represent more than one type of building, since you might not need to distinguish between some types of building.)</p><p>In how many ways could symbols be matched to buildings, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many ways could symbols be matched to buildings now?</p>",
            "According to your answer, some of the types of building might not get \"used.\" However, the problem implies you should choose a type of symbol for every type of building. Also, in your answer, the same type of building might get matched to more than one symbol. But the problem implies that only one type of symbol is used to represent a given type of building." ),
        new Question( 315, "TFR", "bags", "types of outing", "bag", "outing",
            "<p>Milton owns several different bags, like a backpack, a suitcase, a duffel bag, and so on.  For a given type of outing, like going to school, going camping, or traveling, he always takes the same bag.  (However, there might be more than one type of outing for which he takes the same bag.)</p><p>In how many different ways could Milton match up bags with types of outing, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways could Milton match up bags with types of outing now?</p>",
            "According to your answer, some of the types of outing might not get \"used.\" However, the problem implies Milton chooses a bag for every type of outing. Also, in your answer, the same type of outing might get matched to more than one bag. But the problem says Milton always takes \"the <strong>same</strong> bag,\" meaning only one, for a given type of outing." ),
        new Question( 316, "TFR", "kinds of chart", "data sets", "chart", "data set",
            "<p>Suppose you are preparing a report about the population of a certain city, which will include various data sets about things like sex, age, and income.  Each data set should be displayed using one of several kinds of chart, such as pie chart, bar chart, or line graph.  (Of course, more than one data set can be displayed using the same kind of chart.)</p><p>In how many different ways could data sets be matched up with kinds of chart, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways could data sets be matched up with kinds of chart now?</p>",
            "According to your answer, some of the data sets might not get \"used.\" However, the problem says a kind of chart should be chosen for \"<strong>each</strong> data set.\" Also, in your answer, the same data set might get matched to more than one kind of chart. But the problem says each data set is displayed \"using <strong>one</strong>\" kind of chart." ),
        new Question( 317, "TFR", "destinations", "holidays", "destination", "holiday",
            "<p>A travel agency holds a promotion during several holidays during the year, like Thanksgiving, Christmas, Spring Break, etc.  For each holiday, they offer discounted travel to one out of of several possible travel destinations.  (They might give discounts to the same destination for more than one holiday.)</p><p>In how many different ways could the agency match destinations to holidays, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways could the agency match destinations to holidays now?</p>",
            "According to your answer, some of the holidays might not get \"used.\" However, the problem says the agency chooses a destination \"for <strong>each</strong> holiday.\" Also, in your answer, the same holiday might get matched to more than one destination. But the problem says the agency chooses <strong>one</strong> travel destination for each holiday." ),
        new Question( 318, "TFR", "competing companies", "development projects", "company", "project",
            "<p>A city government is planning several urban development projects, including a new bridge, a library, and a park.  For each project, the government will contract with one of several construction companies to carry it out.  (They might contract with the same company for more than one project.)</p><p>In how many different ways could the government assign contracts for the projects, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways could the government assign contracts for the projects now?</p>",
            "According to your answer, some of the development projects might not get \"used.\" However, the problem says the government contracts with a company \"for <strong>each</strong> project.\" Also, in your answer, the same project might get matched to more than one company. But the problem says for each project, the government will \"contract with <strong>one</strong>\" company." ),
        new Question( 319, "TFR", "email addresses", "kinds of website", "address", "website",
            "<p>Brandon has several email addresses.  When he enters his email address in a website, he always uses the same address for a given type of website, so he could use one address for social networks, a different one for online banking, and so on.  (However, he could use the same address for more than one kind of website.)</p><p>In how many different ways could Brandon pair up addresses with kinds of website, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways could Brandon pair up addresses with kinds of website now?</p>",
            "According to your answer, some of the kinds of website might not get \"used.\" However, the problem implies Brandon chooses an address for every type of website. Also, in your answer, the same kind of website might get matched to more than one address. But the problem says Brandon always uses \"the <strong>same</strong> address,\" meaning only one, for a given type of website." ),
        new Question( 320, "TFR", "kinds of diagram", "concepts", "diagram", "concept",
            "<p>A teacher is presenting a lesson involving many difficult concepts, so she illustrates each concept with a diagram, e.g. a Venn diagram, a tree diagram, a flowchart, etc.  (She could illustrate more than one concept with the same kind of diagram.)</p><p>In how many different ways could she assign diagrams to concepts, if there are {0} {1} and {2} {3}?</p>",
            "<p>Now suppose there are {0} {1} and {2} {3}. In how many different ways could she assign diagrams to concepts now?</p>",
            "According to your answer, some of the concepts might not get \"used.\" However, the problem says the teacher \"illustrates <strong>each</strong> concept.\" Also, in your answer, the same concept might get matched to more than one kind of diagram. But the problem says the teacher illustrates each concept \"with <strong>a</strong> diagram,\" meaning only one." )
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

// generateTrainingFeedback: method of Question class
//      provides feedback for responses to training version of question
//      should only be called if instantiate has already been called
var generateTrainingFeedback = function( accuracies, mode ) {
    var feedback = { "overall": "", "by_question": new Array( accuracies.length ), "delay": 0 };
    if ( Math.min.apply( null, accuracies )==1 ) {
        feedback.overall    = "<p><img src='images/small-green-check-mark-th.png' class='icon'>  Great job! All of your answers are correct. Click 'OK' to continue.</p>";
        feedback.delay      = { "auto": 0, "free": 500, "forced": 7500 }[ mode ];
    } else {
        if ( sum(accuracies.map(function(x){return(1-x);})) == 1 ) {
            feedback.overall    = "<p><img src='images/small-red-x-mark-th.png' class='icon'>  Sorry, one of your answers is incorrect.</p><p>The incorrect answer has been highlighted, and an explanation of why it is incorrect is displayed to the right. After reading the explanation, click 'Try again,' and the page will be reloaded with different numbers and the order of answers randomized.</p><p>The 'Try again' button will activate after a delay so that you have time to read the explanation.</p>";
        } else {
            feedback.overall    = "<p><img src='images/small-red-x-mark-th.png' class='icon'>  Sorry, some of your answers are incorrect.</p><p>The incorrect answers have been highlighted, and explanations of why they are incorrect are displayed to the right. Please read the explanations, click 'Try again,' and the page will be reloaded with different numbers and the order of answers randomized.</p><p>The 'Try again' button will activate after a delay so that you have time to read the explanations.</p>";
        }
        for ( var i=0; i<accuracies.length; i++ ) {
            if ( accuracies[i]==0 ) {
                if ( i==0 ) {           // relational prompt
                    feedback.by_question[i] = this.explanation;
                } else if ( i==1 ) {    // role prompt
                    feedback.by_question[i] = "Because <strong>ONE</strong> of the " + this.base_noun + " is chosen for <strong>EACH</strong> of the " + this.exp_noun + ",<br>the " + this.base_noun + " are the 'options' and the " + this.exp_noun + " are the 'selection events.'"
                } else {                // final answers
                    feedback.by_question[i] = "Because the " + this.base_noun + " are the 'options' and the " + this.exp_noun + " are the 'selection events,'<br>the answer should be <i><b>(number of " + this.base_noun + ") <sup>(number of " + this.exp_noun + ")</sup></b></i>.";
                }
            }
        }
        feedback.delay      = { "auto": 0, "free": 1000, "forced": 7500 }[ mode ];
    }
    return feedback;
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

/*
Experimental condition is determined by the condVariation variable, which can take 4 different values.

0 - Nonvaried condition. All training examples will be drawn from the same schema (and which one it is is determined by condVersion).

1 - Adaptive varied condition. The first example is drawn from a schema determined by condVersion, and subsequent examples are also drawn from this schema until participant reaches criterion. After that, examples are drawn from all training schemas in interleaved fashion.

2 - Yoked varied condition. The sequence of training examples - and thus, of schemas - is exactly matched to that of a previous participant in the adaptive varied condition.

3 - Yoked interleaved condition. The sequence of training examples is a permutation of that of a previous participant that maximizes 'spread' of schemas across entire training sequence.

Note that for conditions 0, 2, and 3, the sequence of examples is completely determined before the training begins, but in condition 1, it is determined dynamically depending on performance during training.
*/

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

    // basically same as verbal frame condition in experiment 6, except using terminology "options" instead of "alternatives", added references to SWR, and with TFR added
    
    // getContent is a helper function which retrieves problem statements and solution statements for the example problems used in the training exposition.
    var getContent = function( expositionSchema, contentType, problemIdx ) {
        var result = "";
        if ( contentType=="Problem" ) {
            // the result begins with an introduction, which depends on problemIdx
            result += [ 
                "<p>All the problems you saw in the previous part are called 'Sampling with Replacement' problems. This section will explain how to solve such problems. Here is an example:</p>",
                "<p>Now, here is another example:</p>",
                "<p>Here is a final example:</p>"
                ][ problemIdx ];
            // next is the problem statement, which depends on expositionSchema and problemIdx
            result += {
                "PCO": [
                    "<div class='question'><p>Suppose that 2 golfers each have to choose a golf club for their next strike, and there are 5 different golf clubs to choose from. Of course, they can both use the same club, since they don't have to go at the same time. In how many different ways can they make their choices?</p></div><p>Think about this problem and try to get the answer before proceeding.</p>",
                    "<div class='question'><p>Suppose that there are still 2 golfers, but instead of 5 different golf clubs, there are 8 golf clubs to choose from. In how many different ways can they make their choices now?</p></div><p>Think about how to calculate the answer before proceeding.</p>",
                    "<div class='question'><p>Suppose that there are 5 different golf clubs as in the first problem, but instead of 2 golfers, there are 8 golfers. In how many different ways can they make their choices now?</p></div><p>Think about how to calculate the answer before proceeding (you don't have to actually calculate it, it's a very large number, but just think about <strong>HOW</strong> to calculate it).</p>"
                    ][ problemIdx ],
                "OSS": [
                    "<div class='question'><p>Suppose that you have 5 different playing cards, face down. You draw one card, then put the card back, shuffle, and draw another card - so, you draw 2 cards altogether, one after the other. How many different outcomes are possible?</p></div><p>Think about this problem and try to get the answer before proceeding.</p>",
                    "<div class='question'><p>Suppose that you still draw 2 cards, but instead of 5 different cards in the deck, there are 8 different cards you could draw. How many outcomes are possible now?</p></div><p>Think about how to calculate the answer before proceeding.</p>",
                    "<div class='question'><p>Now, suppose that there are 5 different cards as in the first problem, but instead of drawing 2 times, you draw 8 times. How many outcomes are possible now?</p></div><p>Think about how to calculate the answer before proceeding (you don't have to actually calculate it, it's a very large number, but just think about <strong>HOW</strong> to calculate it).</p>"
                    ][ problemIdx ],
                "TFR": [
                    // TBD
                    "<div class='question'><p>Suppose that a competitive swimmer practices swimming in 2 styles: freestyle on some days and butterfly on other days. She has 5 different swimsuits and always uses the same swimsuit when practicing a given style, but could use either the same or different swimsuits for practicing different styles. In how many different ways could she assign swimsuits to swimming styles?</p></div><p>Think about this problem and try to get the answer before proceeding.</p>",
                    "<div class='question'><p>Suppose that there are still 2 swimming styles, but instead of 5 different swimsuits, there are 8 swimsuits. In how many different ways can the swimmer assign swimsuits to swimming styles now?</p></div><p>Think about how to calculate the answer before proceeding.</p>",
                    "<div class='question'><p>Now, suppose that there are 5 different swimsuits as in the first problem, but instead of 2 swimming styles, there are 8 styles, e.g. freestyle, butterfly, breaststroke, backstroke, .... In how many different ways can the swimmer assign swimsuits to swimming styles now?</p></div><p>Think about how to calculate the answer before proceeding (you don't have to actually calculate it, it's a very large number, but just think about <strong>HOW</strong> to calculate it).</p>"
                    ][ problemIdx ]
                }[ expositionSchema ];
            return result;
        } else if ( contentType=="Solution" ) {
            // the result begins with a statement of the answer, which only depends on problemIdx
            var base    = [ 5, 8, 5 ][ problemIdx ];
            var exp     = [ 2, 2, 8 ][ problemIdx ];
            var answer  = createAnswer( base, exp );
            result      += "<p>The correct answer is " + answer + ". Here's how to get the answer:</p><div class='box'>";
            // next we show a representation of the problem, which also depends on expositionSchema:
            result      += {
                "PCO": "<p>For <strong>EACH</strong> of the golfers, <strong>ONE</strong> of the golf clubs is chosen.</p>",
                "OSS": "<p>For <strong>EACH</strong> draw, <strong>ONE</strong> of the cards is chosen.</p>",
                "TFR": "<p>For <strong>EACH</strong> swimming style, <strong>ONE</strong> of the swimsuits is chosen.</p>"
                }[ expositionSchema ];
            // finally we show an explanation, which depends on problemIdx and expositionSchema
            result += {
                "PCO": [
                    "<p>So, there are 5 ways to choose a golf club for the first golfer. <strong>For each of these ways,</strong> there are 5 ways to choose a golf club to the second golfer. So, altogether, there are " + answer + " ways to choose golf clubs for the two golfers.</p>",
                    "<p>Because now there are 8 golf clubs, there are 8 ways to choose a golf club for the first golfer, and <strong>for each of these ways,</strong> there are 8 ways to choose a golf club for the second golfer. So, altogether, there are " + answer + " ways of choosing golf clubs for the two golfers.</p>",
                    "<p>Because there are 5 golf clubs, there are 5 ways to choose a golf club for the first golfer, and <strong>for each of these ways</strong>, there are 5 ways to choose a golf club for the second golfer, so we multiply 5\xD75 to get 25 ways of choosing golf clubs for the first two golfers.</p><p><strong>For each of those 25 ways,</strong> there are 5 ways to choose a golf club for the third golfer, so we multiply by 5 again to get 5\xD75\xD75=125 ways of choosing golf clubs for the first three golfers.</p><p>Continuing in this way, we would multiply 5 by itself as many times as there are golfers, that is, 8 times. So the answer is " + answer + ".</p>"
                    ][ problemIdx ],
                "OSS": [
                    "<p>So, there are 5 ways to choose a card on the first draw. <strong>For each of these ways,</strong> there are 5 ways to choose a card on the second draw. So, altogether, there are " + answer + " ways to choose cards on the two draws together.</p>",
                    "<p>Because now there are 8 cards, there are 8 ways to choose a card on the first draw, and <strong>for each of these ways,</strong> there are 8 ways to choose a card on the second draw. So, altogether, there are " + answer + " ways of choosing cards on the two draws together.</p>",
                    "<p>Because there are 5 cards, there are 5 ways to choose a card on the first draw, and <strong>for each of these ways</strong>, there are 5 ways to choose a card on the second draw, so we multiply 5\xD75 to get 25 ways of choosing cards on the first two draws.</p><p><strong>For each of those 25 ways,</strong> there are 5 ways to choose a card on the third draw, so we multiply by 5 again to get 5\xD75\xD75=125 ways of choosing cards one the first three draws.</p><p>Continuing in this way, we would multiply 5 by itself as many times as there are draws, that is, 8 times. So the answer is " + answer + ".</p>"
                    ][ problemIdx ],
                "TFR": [
                    "<p>So, there are 5 ways the swimmer could assign a swimsuit for practicing freestyle. <strong>For each of these ways,</strong> there are 5 ways she could assign a swimsuit for practicing butterfly. So, altogether, there are " + answer + " ways she could assign swimsuits to the two styles together.</p>",
                    "<p>Because now there are 8 swimsuits, there are 8 ways the swimmer could assign a swimsuit for practicing freestyle, and <strong>for each of these ways,</strong> there are 8 ways she could assign a swimsuit for practicing butterfly. So, altogether, there are " + answer + " ways she could assign swimsuits to the two styles together.</p>",
                    "<p>Because there are 5 swimsuits, there are 5 ways the swimmer could assign a swimsuit for practicing freestyle, and <strong>for each of these ways,</strong> there are 5 ways she could assign a swimsuit for practicing the second style, butterfly, so we multiply 5\xD75 to get 25 ways she could assign swimsuits to the first two swimming styles.</p><p><strong>For each of those 25 ways,</strong> there are 5 ways to she could assign swimsuits to the third swimming style, breaststroke, so we multiply by 5 again to get 5\xD75\xD75=125 ways she could assign swimsuits to the first three swimming styles.</p><p>Continuing in this way, we would multiply 5 by itself as many times as there are swimming styles, that is, 8 times. So the answer is " + answer + ".</p>"                    
                    ][ problemIdx ]
                }[ expositionSchema ];
            result  += "</div>";
        } else if ( contentType=="Generalization" ) {
            result += "<p>To generalize, Sampling with Replacement problems always involve a situation where, for <strong>EACH</strong> of several \"selection events,\" <strong>ONE</strong> of several \"options\" is chosen. Once you figure out which thing is which, getting the answer is easy. The number of possible outcomes is just the number of options multiplied by itself as many times as the number of selection events. In other words,</p><div class='box'><p>If, for <strong>EACH</strong> \"selection event,\" <strong>ONE</strong> \"option\" is chosen,<br>then the number of possible outcomes is <b><i>(options)<sup>(selection events)</sup></i></b>.</p></div>";
            result += {
                "PCO": "<p>In each of the golf examples, for <strong>EACH</strong> of the golfers, <strong>ONE</strong> of the golf clubs was chosen. So the golfers were the selection events and the golf clubs were the options. Therefore, the answer was <span style='white-space:nowrap'><b><i>(clubs)<sup>(golfers)</sup></i></b>.</span></p>",
                "OSS": "<p>In each of the card drawing examples, for <strong>EACH</strong> of the draws, <strong>ONE</strong> of the cards was chosen. So the draws were the selection events and the cards were the options. Therefore, the answer was <span style='white-space:nowrap'><b><i>(cards)<sup>(draws)</sup></i></b>.</span></p>",
                "TFR": "<p>In each of the swimsuit examples, for <strong>EACH</strong> of the swimming styles, <strong>ONE</strong> of the swimsuits was chosen. So the swimming styles were the selection events and the swimsuits were the options. Therefore, the answer was <span style='white-space:nowrap'><b><i>(swimsuits)<sup>(swimming Styles)</sup></i></b>.</span></p>"
                }[ expositionSchema ];
            result += "<p>So, to solve these problems, you just need to figure out what are the options and the selection events in this sentence: \"For <strong>EACH</strong> of the _____ (selection events), <strong>ONE</strong> of the ______ (options) is chosen.\" Then the answer is just <span style='white-space:nowrap'><b><i>(options)<sup>(selection events)</sup></i></b>.</span></p>";
        }
        return result;
    }
    
    var expositionSchema = TRAINING_SCHEMAS[ condVersion ];

    var text = [
        getContent( expositionSchema, "Problem", 0 ),
        getContent( expositionSchema, "Solution", 0 ) + getContent( expositionSchema, "Problem", 1 ),
        getContent( expositionSchema, "Solution", 1 ) + getContent( expositionSchema, "Problem", 2 ),
        getContent( expositionSchema, "Solution", 2 ),
        getContent( expositionSchema, "Generalization" )
        ];
    
    text.push( "<p>Now you will have a chance to practice what you just learned with a series of example problems. After each problem, you'll be told whether your answers were correct, and if not, why not.</p><p>A progress bar at the top will show you what proportion of the examples you have completed.</p><p>Let's get started!</p>" );

    addTextBlock( exp_struct, mode, "Training Exposition", text );

    return true;

    /*
    
    var text_list;
    if ( firstExampleSchema=="PCO" ) {
        text_list   = [
            "<p>All the problems you saw in the previous part are called 'Sampling with Replacement' problems. Consider the following example:</p><div class='question'><p>Suppose that 2 golfers each have to choose a golf club for their next strike, and there are 5 different golf clubs to choose from. Of course, they can both use the same club, since they don't have to go at the same time. In how many different ways can they make their choices?</p></div><p>Think about this problem and try to get the answer before proceeding.</p>",
            "<p>The correct answer is " + createAnswer( 5, 2 ) + ". There are 5 possible clubs the first golfer could choose. For <strong>EACH</strong> of the ways the first golfer could choose, there are 5 ways the second golfer could choose. So, altogether, there are " + createAnswer( 5, 2 ) + " ways the two golfers could choose.</p><div class='question'><p>Now, suppose that there are still 2 golfers, but instead of 5 different golf clubs, there are 8 golf clubs to choose from. In how many different ways can they make their choices now?</p></div><p>Think about how to calculate the answer before proceeding.</p>",
            "<p>The correct answer is " + createAnswer( 8, 2 ) + ". There are 8 possible clubs the first golfer could choose. For <strong>EACH</strong> of the ways the first golfer could choose, there are 8 ways the second golfer could choose. So, altogether, there are " + createAnswer( 8, 2 ) + " ways the two golfers together could choose.</p><div class='question'><p>Now, suppose that there are 5 different golf clubs as in the first problem, but instead of 2 golfers, there are 8 golfers. In how many different ways can they make their choices now?</p></div><p>Think about how to calculate the answer before proceeding (you don't have to actually calculate it, it's a very large number, but just think about <strong>HOW</strong> to calculate it).</p>",
            "<p>The correct answer is " + createAnswer( 5, 8 ) + ". Just as in the first problem, there are 5 possible clubs the first golfer could choose. For each of those, there are 5 ways the second golfer could choose, so we multiply 5\xD75 to get the number of ways the first <strong>TWO</strong> could choose. For each of <strong>THOSE</strong>, there are 5 ways the <strong>THIRD</strong> golfer could choose, so we multiply by 5 again, and so on.</p><p>In the end, we multiply 5 by itself as many times as there are golfers, that is, 8 times. So the answer is " + createAnswer( 5, 8 ) + ".</p>",
            "<p>To generalize, in all problems like these, for <strong>EACH</strong> of one thing called \"selections,\" <strong>ONE</strong> of another thing called \"options\" is chosen.  Once you figure out which is which, getting the answer is easy. The number of possible outcomes is just the number of options multiplied by itself as many times as the number of selections. In other words,</p><div class='box'><p>If, for <strong>EACH</strong> of one thing called \"selections,\" <strong>ONE</strong> of another thing called \"options\" is chosen,<br>then the number of possible outcomes is <b><i>(options)<sup>(selections)</sup></i></b>.</p></div><p>In each of the golf examples, for <strong>EACH</strong> of the golfers, <strong>ONE</strong> of the golf clubs was chosen. So the answer was <span style='white-space:nowrap'><b><i>(number of Clubs)<sup>(number of Golfers)</sup></i></b>.</span></p>
            
                result += "<p>So, to solve these problems, you just need to figure out what are the alternatives and the selections in this sentence: \"For <strong>EACH</strong> of the _____ (selections), <strong>ONE</strong> of the ______ (alternatives) is chosen.\" Then the answer is just <span style='white-space:nowrap'><b><i>(number of Alternatives)<sup>(number of Selections)</sup></i></b>.</span></p>";

                } else if ( expositionSchema=="OSS" ) {
                    result += "<p>In each of the card drawing examples, for <strong>EACH</strong> of the draws, <strong>ONE</strong> of the cards was chosen. So the answer was <span style='white-space:nowrap'><b><i>(number of Cards)<sup>(number of Draws)</sup></i></b>.</span></p>";
                }
                
            

            
            "<p>In general, Sampling with Replacement problems always involve selecting from a set of <strong>OPTIONS</strong> a certain number of <strong>TIMES</strong>. And the number of possible outcomes for this kind of problem is always <strong>(OPTIONS)<sup>(TIMES)</sup></strong>, i.e. the number of OPTIONS to the power of the number of TIMES.</p><p>In the previous example, the OPTIONS were the golf clubs, and the TIMES were the golfers. So the answer was (# of Clubs)<sup>(# of Golfers)</sup>.</p><p>All Sampling with Replacement problems can be solved with this formula: <strong>(OPTIONS)<sup>(TIMES)</sup></strong>. You just need to figure out what is the number of OPTIONS chosen from and what is the number of TIMES an option is chosen.</p>",
            
            "According to your answer, some of the consumers might not get \"used.\" However, the problem says the consumers \"are <strong>each</strong> asked\" to choose their favorite. Also, in your answer, the same consumer might get matched to more than one pizza brand. But the problem says that each consumer will choose their favorite, meaning <strong>only one</strong>.\"" ),
            
            "<p>How can you know which thing is the OPTIONS and which is the number of TIMES?</p><p>The key point is that <strong>ONE</strong> of the options must be chosen for <strong>EACH</strong> of the times.  A single option could be chosen multiple times, so the options <strong>can be used more than once</strong>.  But only one option can be chosen for each of the times, so the times <strong>cannot be used more than once</strong>.</p><p>In the problems about golfers and golf clubs, the golf clubs were the options, and the golfers were the times, because one and only one golf club was chosen for each golfer. If, instead, one golfer was chosen for each golf club, and the same golfer could be chosen for more than one golf club, then the golfers would be the options and the golf clubs would be the times.</p>"
            ];
    } else if ( firstExampleSchema=="OSS" ) {
        text_list   = [
            "<p>All the problems you saw in the previous part are called 'Sampling with Replacement' problems. Consider the following example:</p><div class='question'><p>Suppose that you have 5 different playing cards, face down. You draw one card, then put the card back, shuffle, and draw another card - so, you draw 2 cards altogether, one after the other. How many different outcomes are possible?</p></div><p>Think about this problem and try to get the answer before proceeding.</p>",
            "<p>The correct answer is " + createAnswer( 5, 2 ) + ". There are 5 possible cards you could get on the first draw. For <strong>EACH</strong> of the outcomes for the first draw, there are 5 outcomes for the second draw. So, altogether, there are " + createAnswer( 5, 2 ) + " outcomes for the two draws together.</p><div class='question'><p>Now, suppose that you still draw 2 cards, but instead of 5 different cards in the deck, there are 8 different cards you could draw. How many outcomes are possible now?</p></div><p>Think about how to calculate the answer before proceeding.</p>",
            "<p>The correct answer is " + createAnswer( 8, 2 ) + ". There are 8 possible cards you could get on the first draw. For <strong>EACH</strong> of the outcomes for the first draw, there are 8 outcomes for the second draw. So, altogether, there are " + createAnswer( 8, 2 ) + " outcomes for the two draws together.</p><div class='question'><p>Now, suppose that there are 5 different cards as in the first problem, but instead of drawing 2 times, you draw 8 times. How many outcomes are possible now?</p></div><p>Think about how to calculate the answer before proceeding (you don't have to actually calculate it, it's a very large number, but just think about <strong>HOW</strong> to calculate it).</p>",
            "<p>The correct answer is " + createAnswer( 5, 8 ) + ". Just as in the first problem, there are 5 possible cards you could get on the first draw. For each of those, there are 5 cards you could get on the second draw, so we multiply 5\xD75 to get the number of outcomes for the first <strong>TWO</strong> draws. For each of <strong>THOSE</strong>, there are 5 cards you could get on the <strong>THIRD</strong> draw, so we multiply by 5 again, and so on.</p><p>In the end, we multiply 5 by itself as many times as there are draws, that is, 8 times. So the answer is " + createAnswer( 5, 8 ) + ".</p>",
            "<p>In general, Sampling with Replacement problems always involve selecting from a set of <strong>OPTIONS</strong> a certain number of <strong>TIMES</strong>. And the number of possible outcomes for this kind of problem is always <strong>(OPTIONS)<sup>(TIMES)</sup></strong>, i.e. the number of OPTIONS to the power of the number of TIMES.</p><p>In the previous example, the OPTIONS were the cards in the deck, and the TIMES were the draws, since one card was chosen on each draw. So the answer was (# of Cards)<sup>(# of Draws)</sup>.</p><p>All Sampling with Replacement problems can be solved with this formula: <strong>(OPTIONS)<sup>(TIMES)</sup></strong>. You just need to figure out what is the number of OPTIONS chosen from and what is the number of TIMES an option is chosen.</p>", 
            "<p>How can you know which thing is the OPTIONS and which is the number of TIMES?</p><p>The key point is that <strong>ONE</strong> of the options must be chosen for <strong>EACH</strong> of the times.  A single option could be chosen multiple times, so the options <strong>can be used more than once</strong>.  But a single time cannot go with more than one option, so the times <strong>cannot be used more than once</strong>.</p><p>In the problems about drawing playing cards, the golf clubs were the options, and the golfers were the times, because one and only one golf club was chosen for each golfer. If, instead, one golfer was chosen for each golf club, and the same golfer could be chosen for more than one golf club, then the golfers would be the options and the golf clubs would be the times.</p>"
            ];
    } else if ( firstExampleSchema=="TFR" ) {
            "<p>All the problems you saw in the previous part are called 'Sampling with Replacement' problems. Consider the following example:</p><div class='question'><p>Suppose that a competitive swimmer practices swimming in 2 styles: freestyle on some days and butterfly on other days. She has 5 different swimsuits and always uses the same swimsuit when practicing a given style, but could use either the same or different swimsuits for practicing different styles. In how many different ways could she assign swimsuits to swimming styles?</p></div><p>Think about this problem and try to get the answer before proceeding.</p>",
            "<p>The correct answer is " + createAnswer( 5, 2 ) + ". There are 5 possible ways the swimmer could assign a swimsuit for practicing freestyle. For <strong>EACH</strong> of these ways, there are 5 ways she could assign a swimsuit for practicing butterfly. So, altogether, there are " + createAnswer( 5, 2 ) + " ways she could assign swimsuits to the 2 styles together.</p><div class='question'><p>Now, suppose that there are still 2 swimming styles, but instead of 5 different swimsuits, there are 8 swimsuits. In how many different ways can the swimmer assign swimsuits to swimming styles now?</p></div><p>Think about how to calculate the answer before proceeding.</p>",
            "<p>The correct answer is " + createAnswer( 8, 2 ) + ". There are 8 possible ways the swimmer could assign a swimsuit for practicing freestyle. For <strong>EACH</strong> of these ways, there are 8 ways she could assign a swimsuit for practicing butterfly. So, altogether, there are " + createAnswer( 8, 2 ) + " ways she could assign swimsuits to the 2 styles together.</p><div class='question'><p>Now, suppose that there are 5 different swimsuits as in the first problem, but instead of 2 swimming styles, there are 8 styles, e.g. freestyle, butterfly, breaststroke, backstroke, .... In how many different ways can the swimmer assign swimsuits to swimming styles now?</p></div><p>Think about how to calculate the answer before proceeding (you don't have to actually calculate it, it's a very large number, but just think about <strong>HOW</strong> to calculate it).</p>",
            "<p>The correct answer is " + createAnswer( 5, 8 ) + ". Just as in the first problem, there are 5 possible ways the swimmer could assign a swimsuit for practicing the first style, freestyle. For each of those, there are 5 ways she could assign a swimsuit for practicing the second style, butterfly, so we multiply 5\xD75 to get the number of ways she could assign swimsuits to the first <strong>TWO</strong> swimming styles. For each of <strong>THOSE</strong>, there are 5 ways she could assign swimsuits to the <strong>THIRD</strong> swimming style, breaststroke, so we multiply by 5 again, and so on.</p><p>In the end, we multiply 5 by itself as many times as there are swimming styles, that is, 8 times. So the answer is " + createAnswer( 5, 8 ) + ".</p>",
            "<p>In general, Sampling with Replacement problems always involve selecting from a set of <strong>OPTIONS</strong> a certain number of <strong>TIMES</strong>. And the number of possible outcomes for this kind of problem is always <strong>(OPTIONS)<sup>(TIMES)</sup></strong>, i.e. the number of OPTIONS to the power of the number of TIMES.</p><p>In the previous example, the OPTIONS were the swimsuits, and the TIMES were the swimming styles, since one swimsuit was assigned to each swimming style. So the answer was (# of Swimsuits)<sup>(# of Swimming Styles)</sup>.</p><p>All Sampling with Replacement problems can be solved with this formula: <strong>(OPTIONS)<sup>(TIMES)</sup></strong>. You just need to figure out what is the number of OPTIONS chosen from and what is the number of TIMES an option is chosen.</p>" ];
    }
    */
}

function addTrainingExamples( exp_struct, mode, condVariation, condVersion, yokingSeq ) {
    var num_questions       = 15;
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
        case "Yoked Interleaved" :
            // var questions   = shuffle( getTrainingQuestionsByIds( yokingSeq ) );
            var questions   = createYokedInterleavedSequence( getTrainingQuestionsByIds( yokingSeq ) );
            break;
    }
    var tqs = new trainingQuestionSelector( condVariation, questions );
    exp_struct.push( { "type": "scmvar_training", "mode": mode, "progress": true, "feedback": true, "num_questions": num_questions, "selector": tqs } );
}

// given a sequence of questions generated by the adaptive varied condition,
// reorganize them to maximize the number of "switches" between schemes on successive questions
// and as much as possible to balance the distribution of schemas throughout the sequence
function createYokedInterleavedSequence( questions ) {
    function increase_switches( seq ) {
        var eval_fn = count_switches;
        var curr_seq = seq.slice();
        var curr_val = eval_fn( curr_seq );
        var targ_idxs, targ_vals, max_val, val, candidates;
        // for each element in seq, starting from the end ...
        for ( var src_idx=seq.length-1; src_idx>=0; src_idx-- ) {
            targ_idxs = [];
            targ_vals = [];
            max_val = 0;
            // record the value of moving it to each later position in seq
            for ( var targ_idx=src_idx+1; targ_idx<seq.length; targ_idx++ ) {
                targ_idxs.push( targ_idx );
                val = eval_fn( move_el( curr_seq, src_idx, targ_idx ) )
                targ_vals.push( val );
                max_val = Math.max( val, max_val );
            }
            // if any of these positions are an improvement, move it to one of the best ones chosen randomly
            if ( max_val>curr_val ) {
                candidates = [];
                for ( var i=0; i<targ_vals.length; i++ ) {
                    if ( targ_vals[i]==max_val ) { candidates.push( targ_idxs[i] ); }
                }
                shuffle( candidates );
                curr_seq = move_el( curr_seq, src_idx, candidates[0] );
                curr_val = eval_fn( curr_seq );
            }
        }
        return curr_seq;
    }
    function count_switches( seq ) {
        if ( seq.length<=1 ) {
            return( 0 );
        } else {
            return( Number( seq[0]!=seq[1] ) + count_switches( seq.slice(1) ) );
        }
    }
    function move_el( arr, idx, targ ) {
        var el = arr[idx];
        var new_arr = arr.slice();
        new_arr.splice(idx,1);
        var new_targ = (targ<=idx) ? targ : targ-1;
        var result = new_arr.slice(0,targ).concat( [el] ).concat( new_arr.slice(targ,new_arr.length) );
        return result;
    }
    function rebalance( seq ) {
        var el = seq[0];
        var lengths = block_lengths(seq,el);
        var new_lengths = repartition( lengths );
        var result = [];
        var length;
        for ( var i=0; i<seq.length; i++ ) {
            if ( seq[i]!=el ) {
                result.push( seq[i] );
            } else if ( i==(seq.length-1) ) {
                length = new_lengths.pop();
                for ( var j=0; j<length; j++ ) {
                    result.push( el );
                }
            } else if ( seq[i+1]!=el ) {
                length = new_lengths.pop();
                for ( var j=0; j<length; j++ ) {
                    result.push( el );
                }
            }
        }
        return result;
    }
    function block_lengths( arr, el ) {
        if ( arr.length==0 ) {
            return [];
        } else if ( arr.length==1 ) {
            return arr[i]==el ? [1] : [];
        } else {
            var lengths = [];
            var new_block = true;
            for ( var i=0; i<arr.length; i++ ) {
                if ( arr[i]==el ) {
                    if ( new_block ) {
                        lengths.push( 1 );
                        new_block = false;
                    } else {
                        lengths[ lengths.length-1 ] += 1;
                    }
                } else {
                    new_block = true;
                }
            }
            return lengths;
        }
    }
    function repartition( ints ) {
        var M = 0;
        for ( var i=0; i<ints.length; i++ ) { M+=ints[i]; }
        var k = ints.length;
        var result = [];
        var u;
        for ( var l=k; l>0; l-- ) {
            u = Math.floor( M/l );
            M = M - u;
            result.push( u );
        }
        return shuffle( result );
    }
    var schemas = questions.map( function(ques) { return ques.schema; } );
    schemas = rebalance( increase_switches( schemas ) );
    var old_questions = questions.slice();
    var new_questions = [];
    var j;
    for ( var i=0; i<schemas.length; i++ ) {
        j = 0;
        while( old_questions[j].schema!=schemas[i] ) { j++; } ;
        new_questions.push( old_questions[j] );
        old_questions.splice( j, 1 );
    }
    return new_questions;
}
    
function addConceptInduction( exp_struct, mode ) {
    // based on Exp 6 version, but modified to use language consistent with Exp 3 exposition
    var text = [
        "<p>Problems like the ones you just viewed always involve two numbers, and the answer is always <i>(one number)<sup>(the other number)</sup></i>. The first number, which is multiplied by itself many times, is called the <b>base</b>, and the second number, which determines how many times to multiply the first number, is called the <b>exponent</b>.</p><p>Please describe, in as general a way as possible, how to decide which number should be the base and which number should be the exponent.</p>",
        "<p>One correct answer to the previous question is: \"If, for <strong>EACH</strong> of one thing called \"selection events,\" <strong>ONE</strong> of another thing called \"options\" is chosen, then the number of options should be the base and the number of selection events should be the exponent.</p><p>Please describe, in as general a way as possible, how to decide which thing is the options and which thing is the selection events.</p>"
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
        } else if ( checkCriterion( block_data, 2 ) ) {
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
          "text": "<p><i>Below is a brief review of 'Exponents'. Please read it carefully. Later, you will be asked some questions to test your recall, and you will not be able to return to this page.</i></p><h1>EXPONENTS</h1><p>Exponents are a convenient way to express 'multiply something by itself several times'.</p><p>Here is an example: <strong>2<sup>3</sup></strong>. This is read as 'two to the third power', and means 'two multiplied by itself three times', i.e. 2\xD72\xD72=8.</p><p><strong>2<sup>3</sup></strong> is different from <strong>3<sup>2</sup></strong>. The second expression is read as 'three to the second power', and means 'three multiplied by itself two times', i.e. 3\xD73=9.</p><table border='1'><tr><td>In general, if <i>m</i> and <i>n</i> are two numbers, then <strong><i>m<sup>n</n></sup></i></strong> means '<i>m</i> multiplied by itself <i>n</i> times.'</tr></td></table><p>The number which is multiplied by itself several times is called the <strong>base</strong> (i.e. the number on the lower left). The number of times by which that number is multiplied is called the <strong>exponent</strong> (i.e. the number on the upper right).</p>" },
        // 2 catch trials
        { "plugin": "radio-multiple",
          "text": [
            "<p>Here are a few questions to test your understanding. Note: <b>You must get ALL of these questions correct in order to proceed!</b></p>Which of the following is the meaning of <strong>6<sup>4</sup></strong>?</p>",
            "<p>Which of the following is the meaning of <strong>3<sup>7</sup></strong>?</p>",
            "<p>Which of the following means the same as '5 multiplied by itself 8 times?'</p>",
            "<p>Which of the following means the same as '9 multiplied by itself 2 times'?</p>" ],
          "answers": [ 
            [ "6 multiplied by itself 4 times, i.e. 6\xD76\xD76\xD76", "4 multiplied by itself 6 times, i.e. 4\xD74\xD74\xD74\xD74\xD74" ],
            [ "7 multiplied by itself 3 times, i.e. 7\xD77\xD77", "3 multiplied by itself 7 times, i.e. 3\xD73\xD73\xD73\xD73\xD73\xD73" ],
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
        // 4 sex
        { "plugin": "radio",
          "text": "Are you male or female?",
          "answers": [ "Male", "Female" ] },
        // 5 age
        { "plugin": "radio",
          "text": "How old are you?",
          "answers": [ "Under 18", "18 to 21", "22 to 25", "26 to 30", "31 to 35", "36 to 40", "41 or over" ] },
        // 6 education
        { "plugin": "radio", 
          "text": "What is the highest level of education you have completed?",
          "answers": [ "Below high school", "High school / GED", "Some college", "2-year college degree", "4-year college degree", "Master's degree", "Doctoral degree", "Professional degree (JD, MD, etc.)" ] },
        // 7 SAT math
        { "plugin": "number", 
          "text": "Which of the following is <strong>your highest score on the SAT MATH section</strong>? (If you have not taken the SAT, or do not remember your score on the MATH section, please choose one of the last two responses.)", 
          "minimum": 200, "maximum": 800,
          "answers": [ "Did not take the SAT", "Do not remember my score on the SAT MATH" ] },
        // 8 ACT math
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

