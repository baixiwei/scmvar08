var entrance_turk   = '\
    <p>Thank you for your interest in our survey.</p> \
    <p>In this task you will:</p> \
    <ol> \
        <li>Read a consent form and give your consent to participate in this study.</li> \
        <li>Complete a survey in which you will learn some math and solve some problems. No advanced math is required.</li> \
        <li>Answer a few background questions about yourself.</li> \
    </ol> \
    <p>Payment for the task is performance-based:</p> \
    <ol> \
        <li>Base payment is $0.30 (you get this regardless of performance).</li> \
        <li>You get a bonus payment for each question you answer correctly.</li> \
        <li>The maximum payment including bonus (if you get all the questions correct) is $1.00.</li> \
        <li>35 minutes is allowed but about 20 minutes is often enough time.</li> \
    </ol> \
    <p><b>PLEASE DO NOT ACCEPT THIS HIT</b> if you have completed another HIT with the name "Learn Some Math!" for this requester (Percepts Concepts). If you have, you will not be able to complete the HIT.</p> \
    <p><b>DO NOT USE THE FORWARD, BACKWARD, OR REFRESH BUTTONS</b> on your browser while working on the HIT - if you do, all your work will be lost. Also, please make sure your browser has Javascript enabled - otherwise, the HIT will not work.</p> ';
    
var entrance_nonturk    = '\
    <p>Thank you for participating in this study about mathematics learning!</p> \
    <p><b>DO NOT USE THE FORWARD, BACKWARD, OR REFRESH BUTTONS</b> on your browser while working on this study - if you do, all your work will be lost.</p> \
    <p>Click the button below when you are ready to begin.</p>';

var nextpage_button = '<p><input id="nextPageButton" type="button" name="nextPageButton"></p> ';
entrance_turk    += nextpage_button;
entrance_nonturk += nextpage_button;

var consent_form = '\
<p style="text-align: center;">\
 <strong>INDIANA UNIVERSITY INFORMED CONSENT STATEMENT</strong></p>\
<p style="text-align: center;">\
 <strong>Learning About Science</strong></p>\
<p style="text-align: center;">\
 <span style="font-size:11px;">IRB Study #05-9550</span></p>\
<p style="text-align: center;">\
 <span style="font-size:11px;">Form date: March 17, 2012</span></p>\
<p style="text-align: center;">\
 <span style="font-size:11px;"><strong>IRB Approval Date: </strong>Mar 21, 2012</span></p>\
<p style="text-align: center;">\
 <span style="font-size:11px;"><strong>Expiration Date: </strong>DEC 6, 2012</span></p>\
<p>\
 You are invited to participate in a research study of how people learn scientific principles. You were selected as a possible subject because you indicated that you wished to participate on this website. We ask that you read this form and ask any questions you may have before agreeing to be in the study.</p>\
<p>\
 The study is being conducted by Dr. Robert Goldstone in the Department of Psychological and Brain Sciences.</p>\
<p>\
 <strong>STUDY PURPOSE: </strong>Science education is vital for developing general critical thinking skills and preparation for a wide variety of careers. However, many students have great difficulty acquiring scientific knowledge, and have particular difficulty applying their knowledge to new cases. The purpose of this study is to better understand how people acquire scientific knowledge and use it in new situations.</p>\
<p>\
 <strong>NUMBER OF PEOPLE TAKING PART IN THE STUDY: </strong>If you agree to participate, you will be one of approximately 6,000 subjects who will be participating in this research.</p>\
<p>\
 <strong>PROCEDURES FOR THE STUDY: </strong>If you agree to be in the study, you will be presented with several straightforward tasks to complete. These tasks will include interacting with graphical simulations of physical systems, and reading and entering text information. Each task will be related to a meaningful scientific principle. The entire session should take approximately 55 minutes. You may only participate in the experiment once.</p>\
<p>\
 <strong>RISKS OF TAKING PART IN THE STUDY: </strong>There is the risk of loss of confidentiality.</p>\
<p>\
 <strong>BENEFITS OF TAKING PART IN THE STUDY: </strong>An understanding of how individuals learn scientific principles can help us understand human learning, memory, and reasoning, and help educators to convey scientific information more effectively. You benefit from this experience because you learn something about how an experiment is designed and conducted, what issues are of interest to cognitive scientists, and how the mind acquires and uses scientific knowledge.</p>\
<p>\
 <strong>ALTERNATIVES TO TAKING PART IN THE STUDY: </strong>Instead of being in the study, you have these options: Not being in the study.</p>\
<p>\
 <strong>CONFIDENTIALITY</strong>: Efforts will be made to keep your personal information confidential. We cannot guarantee absolute confidentiality. Your personal information may be disclosed if required by law. Your identity will be held in confidence in reports in which the study may be published and in databases in which results may be stored.</p><p>Organizations that may inspect and/or copy your research records for quality assurance and data analysis include groups such as the study investigator and his/her research associates, the IUB Institutional Review Board or its designees, and (as allowed by law) state or federal agencies, specifically the Office for Human Research Protections (OHRP).</p>\
<p>\
 <strong>PAYMENT: </strong>For participating in this study, you will receive a small payment of $0.30.<br></p>\
<p>\
 <strong>CONTACTS FOR QUESTIONS OR PROBLEMS: </strong>For questions about the study or a research-related injury, contact the researcher Dr. Robert Goldstone at 812-855-4853, or rgoldsto@indiana.edu.</p>\
<p>\
 For questions about your rights as a research participant or to discuss problems, complaints or concerns about a research study, or to obtain information, or offer input, contact the IUB Human Subjects office at (812) 856-4242 or by email at irb@iu.edu.</p>\
<p>\
 <strong>VOLUNTARY NATURE OF STUDY: </strong>Taking part in this study is voluntary. You may choose not to take part or may leave the study at any time. Leaving the study will not result in any penalty or loss of benefits to which you are entitled. Your decision whether or not to participate in this study will not affect your current or future relations with the investigator(s).</p>\
<p>\
 <strong>SUBJECT\'S CONSENT </strong></p>\
<p>\
 By checking below, you acknowledge that you have read and understood the above information, that you are 18 years of age, or older and give your consent to participate in our internet-based study.</p>\
<p><input id="consentBox" name="consentBox" type="checkbox" value="consentGiven">I Agree to take part in this study.</p>';
consent_form += nextpage_button;

var debriefing  = '<p>The experiment in which you just participated explores the effectiveness of different methods of learning and teaching mathematics. A critical issue in mathematics education is how to promote "transfer," i.e. applying what one has learned to novel situations outside the classroom.</p>\
<p>In principle, mathematical ideas are applicable to a wide range of problems in a variety of fields, making transfer particularly desirable. In practice, however, superficial differences between studied problems and newly encountered problems may conceal their shared mathematical structure, thus inhibiting transfer. A possible method of avoiding this difficulty would be to systematically vary the superficial characteristics of studied problems, while keeping their mathematical structure constant. Hopefully, this approach would encourage learners to focus on mathematical structure rather than superficial characteristics, thus leading to more transfer.</p>\
<p>This experiment involved various combinatorics problems. All shared the same mathematical structure – that of a Sampling with Replacement problem. You received instruction in how to solve such problems, in the form of a series of worked examples. The worked examples either included three different types of situation - people choosing things, sequence of things chosen from a fixed set, or things chosen to fill each of several roles - or included only one of these types. You were then tested on problems involving several new types of situation. We hypothesize that instruction using multiple different types of situation will lead to better subsequent performance than instruction using only one type.</p>\
<p>Mathematics education in the USA is famously in need of reform. Inability to transfer knowledge learned to new problems is among the key issues to be resolved. We hope that our research will contribute to this reform by clarifying how the type of examples used to illustrate mathematical principles can affect the likelihood of successful knowledge transfer.</p>\
<p>We greatly appreciate your help in this research, which would not be possible without your effort. If you have any questions, or would like a more complete debriefing, please contact David Braithwaite at dwbraith@indiana.edu.</p>';

var exit_turk   = '\
    <p>You have now completed the study. Thank you very much for your participation!</p> \
    <p><b>Your HIT has NOT yet been submitted.</b> To submit the HIT, click the button at the bottom of this page.</p> \
    <p>The following paragraphs explain the background and purpose of this study. You may read them or skip them as you please.</p>';
exit_turk       += debriefing;
exit_turk       += '<form id="exit_form" method="POST">\
                    <input type="hidden" id="assignmentId" name="assignmentId" value="">\
                    <input id="mTurkSubmitButton" type="submit" name="Submit" value="Submit">\
                    </form>';

var exit_nonturk = '\
    <p>You have now completed the study. Thank you very much for your participation!</p>\
    <p>The following paragraphs explain the background and purpose of this study. You are not required to read them if you do not want to.</p>';
exit_nonturk    += debriefing;