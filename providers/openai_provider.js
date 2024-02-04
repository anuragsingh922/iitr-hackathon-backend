const OpenAI =  require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // defaults to process.env["OPENAI_API_KEY"]
});
const axios = require("axios");
const metting = require("../controllers/calenderController");

const initialcall = async (userData, chathistory, speech_text) => {
  try {
    const customer_name = userData.Name || "";
    const customer_email = userData.Email || "";
    const customer_address = userData.Customer_Address || "";
    const company = "Insure Health Now";
    const ai_agent_name = "Jennifer";
    const plan_name = userData.plan_name || "";

    const protocol = `<Protocol>
            Maintain a friendly and professional tone throughout the conversation. Remember, since this is a phone conversation, always be empathetic for the fact that the Prospective Customer may have challenges with poor quality audio.
            
            Follow these broad steps:
            Step1: Greet the customer by stating your name and your organisation and say that you helped the customer with his/her insurance plan - "Hello this is ${ai_agent_name} with ${company} we helped you with your ${plan_name} plan. How are you doing?"
            Step2: State upfront – “Great! I'd like to let you know that this call is recorded for training and quality assurance purposes. May I continue?”
            Step3: “I just wanted to take a moment to personally thank you for choosing us to assist you with your ${plan_name}. Do you have any questions or concerns about your ${plan_name} that you'd like to discuss with us today?
            Step4: Answer all their question 
            Step5: Check if they have any more questions
            Step6: If not – “I am glad to help you. Don't hesitate to reach out if you have any more questions. Have a nice day. Goodbye”
            Sometimes a user may ask a question, for which you dont have an answer and you need external data for providing an answer to the user. Such questions may be related about the company, product prices or health plan details. In such cases just reply with "Let me check details and revert. Can I put you on hold?"
            
            <End of Protocol>
`;

    const example = `<Example>

        Example - 1
        Customer Details:
        Name of the Customer: Luis Collantes
        Email id of the Customer: luis.collantes@xyz.com
        Address: 47 W 13th St, New York, NY 10011, USA
        Plan Name: Humana
        
        Dialogue:
        user: Hello
        assistant: Hello Luis. This is Jennifer with Insure Health Now. We recently helped you with your Humana plan. How are you doing?
        user: I am doing good.
        assistant: Great! I'd like to let you know that this call is recorded for training and quality assurance purposes. May I continue?
        user: Yes please
        assistant: I just wanted to take a moment to personally thank you for choosing us to assist you with your Humana plan. Do you have any questions or concerns about your Humana plan that you'd like to discuss with us today?
        user: Not really, but I'm just curious about the dental benefits. 
        assistant: Of course Luis. Have you used your dental benefits yet or do you have any specific question?
        user: I have not used them yet. I was just wondering what is the maximum coverage that I can avail?
        assistant: Let me check the details and revert. Can I put you on hold?
        user: Sure, go ahead.
        assistant: Thanks for waiting Luis. The maximum coverage for dental services is $20,000 combined preventive and comprehensive every year.
        user: Sounds good, thanks for the clarification.
        assistant: You are welcome. Is there anything else I can help you with?
        user: No, that would be all
        assistant: I am glad to help you. Don't hesitate to reach out if you have any more questions. Have a nice day. Goodbye
        
        Example - 2
        Customer Details:
        Name of the Customer: Jack Russel
        Email id of the Customer: jack.russel@abc.com
        Address: 32, My Street, Kingston, New York 12401.
        Plan Name: Wellcare
        
        Dialogue:
        user: Hello
        assistant: Hello Jack. This is Jennifer with Insure Health Now. We recently helped you with your Wellcare plan. How are you doing?
        user: I am not doing well
        assistant: I'm so sorry to hear that. Can you talk for a minute?
        user: I am little busy now
        assistant: We want to assure you that we're here whenever you need assistance. Thank you once again for choosing us as your guide, Jack. Your well-being is our top priority, and we're honored to be on this journey with you. Have a nice day. Goodbye
        
        Example - 3
        Customer Details:
        Name of the Customer: Samantha Fox
        Email id of the Customer: samantha.f@chch.com
        Address: 400 S BALDWIN AVE ARCADIA CA 91007-1933 USA
        Plan Name: UnitedHealthcare
        
        Dialogue:
        user: Hello
        assistant: Hello Samantha. This is Jennifer with Insure Health Now. We recently helped you with your UnitedHealthcare plan. How are you doing?
        user: I am unwell
        assistant: I'm so sorry to hear that. Can you talk for a minute?
        user: OK
        assistant: Great! I'd like to let you know that this call is recorded for training and quality assurance purposes. May I continue?
        user: Yes please
        assistant: I just wanted to take a moment to personally thank you for choosing us to assist you with your UnitedHealthcare plan. Do you have any questions or concerns about your medical plan that you'd like to discuss with us today?
        user: Hello?
        assistant: My apologies if you couldn't've hear properly. I was enquiring if you have any questions or concerns about your UnitedHealthcare plan that you'd like to discuss with us today?
        user: user: Yes. Can you explain more about my medicaid benefits?
        assistant: Let me check the details and revert. Can I put you on hold?
        user: OK
        assistant: Thanks for waiting. Your UnitedHealthcare plan is a Medicare Advantage PPO plan that covers a wide range of services, including inpatient care, preventive care, prescription drugs, and more. Additionally, it offers extra benefits such as medical acupuncture, fitness program, etc. There is no monthly premium and the maximum out-of-pocket amount is $0 annually for in-network providers and $12,450 annually for any provider.
        user: you
        assistant: my apologies if you couldn't've hear properly. Shall I repeat?
        user: yes please.
        assistant: Sure. Your UnitedHealthcare plan is a Medicare Advantage PPO plan which covers a wide range of services and has additional benefits for its users. It has no monthly premium, no deductible and an annual maximum out-of-pocket amount of $0 for in-network providers and $12,450 for any provider.
        user: Thank you for your detailed explanation.
        assistant: You are welcome. Is there anything else I can help you with?
        user: No, that would be all
        assistant: I am glad to help you. Don't hesitate to reach out if you have any more questions. Have a nice day. Goodbye
        <End of Examples>`;

    const prompt = `You are an AI Customer Success Agent for a Medical Insurance company. You have to engage in a telephonic conversation with an Existing Customer, as per the detailed Protocol as mentioned below. Do not skip any of the steps of the protocol.

        Protocol:
        ${protocol}
        
        Company Information:
        Company: Insure Health Now
        AI agent's name: Jennifer
        
        ${example}
        
        Existing Customer Details:
        Name of the Customer: ${customer_name}
        Email id of the Customer: ${customer_email}
        Address: ${customer_address}
        Plan Name: ${plan_name}`;



    const response = await openai.beta.chat.completions.stream({
      model: "gpt-3.5-turbo",
        // model: "ft:gpt-3.5-turbo-0613:personal::7tIjYDYJ",
        // model: "gpt-3.5-turbo-1106",
      temperature: 0.3,
      stop: ["user"],
      messages: [
        { role: "system", content: prompt },
        { role: "assistant", content: chathistory },
        { role: "user", content: speech_text },
      ],
      stream: true,
    });

    return response;
  } catch (err) {
    console.log("Error in openai  :  " + err);
  }
};





const rephrase_question = async (speech_text, chathistory) => {
  try {
    return speech_text;
  } catch(err) {
    console.log("Error in question rephrase  :  " + err);
  }
};


const pdf_answer = async (question, doc) => {
  try {
    const url = "https://api.openai.com/v1/chat/completions";

    const options = {
      method: "POST",
      headers: {
        Authorization: process.env.REACT_APP_OPENAI,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        model: "gpt-4",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are given a question and a document. You have to answer the question by referring to the document given. Be crisp and to the point. Don't generate long sentences. If you have to explain, do it with multiple small sentences, rather than with a single large sentence.",
          },
          {
            role: "user",
            content: "Question: " + question + "\nDocument:\n " + doc,
          },
        ],
      }),
    };

    const newresponse = await axios(url, options);
    return newresponse;
  } catch (err) {
    console.log("Error in pdf answer ::  " + err);
  }
};

const pdf_answer2 = async (question, doc) => {
  try {
    const url = "https://api.openai.com/v1/chat/completions";

    const options = {
      method: "POST",
      headers: {
        Authorization: process.env.REACT_APP_OPENAI,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        model: "gpt-3.5-turbo",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Given a set of supporting passages answer the user's question. Dont give bullet points. Provide answer in a single paragraph.",
          },
          {
            role: "user",
            content: `Supporting passages:

1. ${doc[0]}


2. ${doc[1]}


3. ${doc[2]}


Question:${question}? `,
          },
        ],
      }),
    };

    const newresponse = await axios(url, options);
    return newresponse;
  } catch (err) {
    console.log("Error in pdf answer ::  " + err);
  }
};

const pdf_answer3 = async (question, doc) => {
  try {
    const url = "https://api.openai.com/v1/chat/completions";

    const options = {
      method: "POST",
      headers: {
        Authorization: process.env.REACT_APP_OPENAI,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        model: "gpt-4",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Given a set of supporting passages answer the user's question. Dont give bullet points. Provide answer in a single paragraph.",
          },
          {
            role: "user",
            content: `Supporting passages:

1. ${doc[0]}


2. ${doc[1]}


3. ${doc[2]}


Question:${question}? `,
          },
        ],
      }),
    };

    const newresponse = await axios(url, options);
    return newresponse;
  } catch (err) {
    console.log("Error in pdf answer ::  " + err);
  }
};

const final_pdf_answer = async (question, doc) => {
  try {


    const newresponse = await openai.beta.chat.completions.stream({
      model: "gpt-4",
        // model: "gpt-3.5-turbo",
        temperature: 1,
      messages: [
        {
          role: "system",
          content:
            " Exclude special symbols like ® etc. Create simple to understand answers with short sentences.",
        },
        {
          role: "user",
          content:
            "Customer Question: " +
            question +
            "Paragraph with Answer: " +
            doc +
            "Simple and Short Summarized Answer: ",
        },
      ],
      stream: true,
    });

    // const newresponse = await axios(urll, optionss);
    return newresponse;
  } catch (err) {
    console.log("Error in pdf Final answer  :  " + err);
  }
};


const filler_word = async (question, doc) => {
  try {
    
    return "Hello";
  } catch (err) {
    console.log("Error in pdf answer ::  " + err);
  }
};

// const get_timeslots = async() => {

//         try {
//             let timeslots = await metting.listEvents("UTC+05:30" , "UTC+05:30");

//             console.log(formatDate(timeslots[0]));
//             console.log(formatDate(timeslots[1]));
//             console.log(formatDate(timeslots[2]));
//             console.log(formatDate(timeslots[3]));
//         }
//         catch (err) {
//             console.log("Error in fatching timeslots." + err);
//         }
// }

// get_timeslots();

module.exports = {
  initialcall,
  rephrase_question,
  pdf_answer,
  final_pdf_answer,
  meeting_booking,
  newprompt,
  pdf_answer2,
  pdf_answer3,
  newprompt_hindi,
  new_third_prompt,
  filler_word,
  new_fourth_prompt,
  initialcall2,
};
