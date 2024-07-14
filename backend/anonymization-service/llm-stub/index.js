const axios = require("axios");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const apiEndpoint = "https://api.openai.com/v1/chat/completions";

  const requestBody = JSON.parse(event.body);
  ({ message } = requestBody);
  console.log("Parsed request body:", requestBody);

  const userInput = message;

  console.log("User input:", userInput);

  const messages = [
    {
      role: "system",
      content: `Task: You are to process a text to identify and anonymize sensitive personal information, specifically concerning the sender, while maintaining the original message's readability and coherence. Follow these steps:

Step 1: Identify Sender's Sensitive Information:
Carefully scan the text to pinpoint sensitive personal information related only to the sender, such as their name, phone number, address, email address, health card number, and date of birth.

Step 2: Categorize Identified Data:
Classify the identified information into appropriate categories like Name, Contact Number, Address, Email, Health Card Number, and Date of Birth.

Step 3: Replace with Placeholders:
Substitute each piece of the sender's sensitive information with a generic placeholder that corresponds to its category. Use tags like <NAME>, <PHONE_NUMBER>, <ADDRESS>, etc.

Step 4: Ensure Natural Language Flow:
Adapt the surrounding text as necessary to ensure that replacing sensitive data with placeholders maintains the text's natural flow. The text should continue to convey the same message as before the anonymization.

Step 5: Handle Cases with No Sensitive Information:
If no sensitive information is found, the original text should be used as is in the processed_text object, and the private_data object should be empty.

Step 6: Output Anonymized Text and JSON Data as a Single JSON Object:
Provide the anonymized text and also generate a JSON object that maps each placeholder to the original sensitive data. Ensure the JSON output is properly formatted with double quotes around keys and values.

Step 7: Verify JSON Format:
Ensure that the final output is valid JSON. Any output that is not valid JSON should be corrected.

Example Task:

Original text: "John Doe, living at 123 Maple St., can be reached at 647-555-1234 or johndoe@email.com. His health card number is 123456789."

Expected output:
{
  "processed_text": "<NAME>, living at <ADDRESS>, can be reached at <PHONE_NUMBER> or <EMAIL>. His health card number is <HEALTH_CARD_NUMBER>.",
  "private_data": {
    "NAME": "John Doe",
    "ADDRESS": "123 Maple St.",
    "PHONE_NUMBER": "647-555-1234",
    "EMAIL": "johndoe@email.com",
    "HEALTH_CARD_NUMBER": "123456789"
  }
}

If no sensitive information is found:

Original text: "Hello, how are you?"

Expected output:
{
  "processed_text": "Hello, how are you?",
  "private_data": {}
}

Perform the same steps for the provided input text:`,
    },
    {
      role: "user",
      content: userInput,
    },
  ];

  const payload = {
    model: "gpt-4o",
    messages: messages,
    temperature: 0.7,
    max_tokens: 512,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };

  console.log("Generated payload:", JSON.stringify(payload, null, 2));

  const headers = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  };

  console.log("Headers:", JSON.stringify(headers, null, 2));

  try {
    const response = await axios.post(apiEndpoint, payload, { headers });

    console.log("OpenAI API response status:", response.status);
    console.log(
      "OpenAI API response data:",
      JSON.stringify(response.data, null, 2)
    );

    if (response.status === 200) {
      const generatedText = response.data.choices[0].message.content.trim();
      console.log("Generated text:", generatedText);

      // Assuming the generated text is a plain text message, not JSON
      return {
        statusCode: 200,
        body: JSON.stringify({ message: generatedText }),
      };
    } else {
      console.error(
        "Failed to get a successful response from OpenAI API:",
        response.status,
        response.statusText
      );
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Failed to get response from OpenAI API",
        }),
      };
    }
  } catch (error) {
    console.error("Error processing message:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
