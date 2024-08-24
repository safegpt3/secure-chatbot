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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
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
    let currentMessage = text;
    let previousConversationsText = "";
    let formattedMessage = "";

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

      currentMessage = anonymizeResponse.data.anonymizedText;
    }

    // Construct message to send
    if (memorySetting) {
      // Fetch the 5 most recent conversations from DynamoDB
      const queryParams = {
        TableName,
        KeyConditionExpression:
          "PK = :userId AND begins_with(SK, :conversationIdPrefix)",
        ExpressionAttributeValues: {
          ":userId": { S: `userID#${userId}` },
          ":conversationIdPrefix": { S: "conversationID#" },
        },
        Limit: 5,
        ScanIndexForward: false, // Fetch the most recent conversations
      };

      const queryResult = await dynamoDbClient.send(
        new QueryCommand(queryParams)
      );

      const recentConversations = queryResult.Items || [];

      // Extract conversation text
      const conversationSummaries = recentConversations
        .map((item) => {
          if (item.messages && item.messages.L) {
            const conversationMessages = item.messages.L.map((message) => {
              const sender = message.M.type.S === "user" ? "User" : "Bot";
              return `${sender}: ${message.M.text.S}`;
            }).join("\n");
            return conversationMessages;
          }
          return "";
        })
        .join("\n---\n");

      // Send the recent conversations to GPT-4o for summarization
      const apiEndpoint = "https://api.openai.com/v1/chat/completions";

      const gptPayload = {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant summarizing previous patient conversations to extract information useful for a doctor.",
          },
          {
            role: "user",
            content: `Summarize the following conversations and extract relevant medical information that may be useful for a doctor:\n\n${conversationSummaries}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 512,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      };

      console.log(
        "Generated payload for GPT-4:",
        JSON.stringify(gptPayload, null, 2)
      );

      const headers = {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      };

      try {
        const gptResponse = await axios.post(apiEndpoint, gptPayload, {
          headers,
        });

        console.log("OpenAI API response status:", gptResponse.status);
        console.log(
          "OpenAI API response data:",
          JSON.stringify(gptResponse.data, null, 2)
        );

        if (gptResponse.status === 200) {
          let summarizedInfo =
            gptResponse.data.choices[0].message.content.trim();

          // Strip out Markdown delimiters if present
          if (
            summarizedInfo.startsWith("```json") &&
            summarizedInfo.endsWith("```")
          ) {
            summarizedInfo = summarizedInfo.slice(7, -3).trim();
          }

          console.log("Summarized info from GPT-4:", summarizedInfo);

          formattedMessage += `Summary of previous conversations: ${summarizedInfo}\n---\nCurrent message: User: ${currentMessage}`;
        } else {
          console.error(
            "Failed to get a successful response from OpenAI API:",
            gptResponse.status,
            gptResponse.statusText
          );
        }
      } catch (error) {
        console.error("Error processing message with OpenAI:", error);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: error.message }),
        };
      }
    } else {
      formattedMessage += `Current message: User: ${currentMessage}`;
    }

    console.log("Sending message to Botpress endpoint:", BOTPRESS_ENDPOINT);
    const botResponse = await axios.post(
      BOTPRESS_ENDPOINT,
      {
        userId,
        messageId,
        conversationId,
        type,
        text: formattedMessage,
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
                  text: { S: currentMessage },
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
