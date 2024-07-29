const axios = require("axios");
const {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");

const ANONYMIZE_ENDPOINT = process.env.ANONYMIZE_ENDPOINT;
const BOTPRESS_ENDPOINT = process.env.BOTPRESS_ENDPOINT;
const BOTPRESS_TOKEN = process.env.BOTPRESS_TOKEN;
const TableName = process.env.TABLE_NAME;

const dynamoDbClient = new DynamoDBClient();

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  let userId, messageId, conversationId, type, text, payload, internalType;

  try {
    const requestBody = JSON.parse(event.body);
    ({ userId, messageId, conversationId, type, text, payload, internalType } =
      requestBody);
    console.log("Parsed request body:", requestBody);
  } catch (parseError) {
    console.error("Error parsing request body:", parseError);
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Invalid request body" }),
    };
  }

  try {
    let finalText = text;

    // Fetch user settings from DynamoDB
    const getUserParams = {
      TableName,
      Key: {
        PK: { S: `userID#${userId}` },
        SK: { S: `userID#${userId}` },
      },
    };

    const getUserResult = await dynamoDbClient.send(
      new GetItemCommand(getUserParams)
    );
    const userSettings = getUserResult.Item;

    if (!userSettings) {
      console.error("User settings not found for userId:", userId);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User settings not found" }),
      };
    }

    const memorySetting = userSettings.memorySetting.BOOL;
    const anonymizationSetting = userSettings.anonymizationSetting.BOOL;

    if (internalType === "text") {
      console.log("Sending message to anonymize endpoint:", ANONYMIZE_ENDPOINT);
      const anonymizeResponse = await axios.post(ANONYMIZE_ENDPOINT, {
        userId,
        conversationId,
        message: text,
        anonymizationSetting: anonymizationSetting,
      });
      console.log("Anonymize response received:", anonymizeResponse.data);

      finalText = anonymizeResponse.data.anonymizedText;
    }

    // Append previous conversations
    if (memorySetting) {
      const queryParams = {
        TableName,
        KeyConditionExpression:
          "PK = :userId AND begins_with(SK, :conversationIdPrefix)",
        ExpressionAttributeValues: {
          ":userId": { S: `userID#${userId}` },
          ":conversationIdPrefix": { S: "conversationID#" },
        },
      };

      const queryResult = await dynamoDbClient.send(
        new QueryCommand(queryParams)
      );

      const previousConversations = queryResult.Items || [];
      let previousMessages = "";

      previousConversations.forEach((item) => {
        if (item.messages && item.messages.L) {
          const conversationMessages = item.messages.L.map(
            (message) => message.M.text.S
          ).join("\n");
          previousMessages += conversationMessages + "\n---\n";
        }
      });

      finalText = previousMessages + `User: ${finalText}`;
    }

    console.log("Sending message to Botpress endpoint:", BOTPRESS_ENDPOINT);
    const botResponse = await axios.post(
      BOTPRESS_ENDPOINT,
      {
        userId,
        messageId,
        conversationId,
        type,
        text: finalText,
        payload,
      },
      { headers: { Authorization: `Bearer ${BOTPRESS_TOKEN}` } }
    );
    console.log("Botpress response received:", botResponse.data);

    // Optionally save the message to DynamoDB based on memorySetting
    if (memorySetting) {
      const updateParams = {
        TableName,
        Key: {
          PK: { S: `userID#${userId}` },
          SK: { S: `conversationID#${conversationId}` },
        },
        UpdateExpression:
          "SET messages = list_append(if_not_exists(messages, :empty_list), :msg)",
        ExpressionAttributeValues: {
          ":empty_list": { L: [] },
          ":msg": {
            L: [
              {
                M: {
                  messageId: { S: `msg-${new Date().getTime()}` },
                  type: { S: "user" },
                  text: { S: finalText },
                  timestamp: { S: new Date().toISOString() },
                },
              },
            ],
          },
        },
      };

      await dynamoDbClient.send(new UpdateItemCommand(updateParams));
      console.log("Message saved to DynamoDB");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(botResponse.data),
    };
  } catch (error) {
    console.error("Error processing the message:", error);

    if (error.response) {
      console.error("Response error data:", error.response.data);
      return {
        statusCode: error.response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: error.response.data }),
      };
    }

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
