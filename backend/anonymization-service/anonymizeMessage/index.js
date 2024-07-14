const {
  DynamoDBClient,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");
const axios = require("axios");

const LLM_LAMBDA_ENDPOINT = process.env.LLM_LAMBDA_ENDPOINT;
const TableName = process.env.VAULT_TABLE_NAME;

const dynamoDbClient = new DynamoDBClient();

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  let message, conversationId;
  try {
    const requestBody = JSON.parse(event.body);
    ({ message, conversationId } = requestBody);
    console.log("Parsed request body:", requestBody);
  } catch (parseError) {
    console.error("Error parsing request body:", parseError);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid request body",
      }),
    };
  }

  if (!message || !conversationId) {
    console.error("Missing message or conversationId");
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Message and conversationId are required",
      }),
    };
  }

  try {
    console.log("Sending message to LLM endpoint:", LLM_LAMBDA_ENDPOINT);
    const llmResponse = await axios.post(LLM_LAMBDA_ENDPOINT, { message });

    if (llmResponse.status !== 200) {
      console.error(
        "Failed to get response from LLM:",
        llmResponse.status,
        llmResponse.statusText,
        llmResponse.data
      );
      throw new Error(
        `Failed to get response from LLM: ${llmResponse.statusText}`
      );
    }

    console.log("LLM response received:", llmResponse.data);

    // Parse the response directly as JSON
    const { message: llmMessage } = llmResponse.data;

    if (!llmMessage) {
      throw new Error("No message received from LLM");
    }

    console.log("Sanitized LLM message:", llmMessage);

    // Ensure the message is in valid JSON format
    const parsedMessage = JSON.parse(llmMessage);

    const { processed_text, private_data } = parsedMessage;

    console.log("Private data:", private_data);
    if (typeof private_data !== "object" || !private_data) {
      throw new Error("Invalid private_data received from LLM");
    }

    // Check if private_data is empty
    if (Object.keys(private_data).length > 0) {
      const params = {
        TableName,
        Key: { conversationId: { S: conversationId } },
        UpdateExpression: "set privateData = :pd",
        ExpressionAttributeValues: {
          ":pd": { S: JSON.stringify(private_data) }, // Ensure private_data is a string
        },
      };

      console.log(
        "Updating item in DynamoDB:",
        JSON.stringify(params, null, 2)
      );
      await dynamoDbClient.send(new UpdateItemCommand(params));
    } else {
      console.log("No sensitive data found. Skipping DynamoDB update.");
    }

    console.log("Successfully processed message");
    return {
      statusCode: 200,
      body: JSON.stringify({ anonymizedText: processed_text }),
    };
  } catch (error) {
    console.error("Error processing message:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
