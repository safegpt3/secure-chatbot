const {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");

const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} = require("@aws-sdk/client-apigatewaymanagementapi");

const axios = require("axios");

const LLM_LAMBDA_ENDPOINT = process.env.LLM_LAMBDA_ENDPOINT;
const TableName = process.env.TABLE_NAME;
const callbackUrl = process.env.CALLBACK_URL;

const dynamoDbClient = new DynamoDBClient();
const apiGatewayClient = new ApiGatewayManagementApiClient({
  endpoint: callbackUrl,
});

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  let conversationId, message, userId;
  try {
    const requestBody = JSON.parse(event.body);
    ({ conversationId, message } = requestBody);
    console.log("Parsed request body:", requestBody);

    if (!conversationId || !message) {
      console.error("Missing conversationId or message");
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "conversationId and message are required",
        }),
      };
    }

    // Query to get the userId based on the conversationId
    const queryParams = {
      TableName,
      IndexName: "conversationId-index", // Ensure you have this GSI created
      KeyConditionExpression: "conversationId = :cid",
      ExpressionAttributeValues: {
        ":cid": { S: conversationId },
      },
    };

    const queryResult = await dynamoDbClient.send(
      new QueryCommand(queryParams)
    );
    if (queryResult.Items.length === 0) {
      console.error("User ID not found for conversationId:", conversationId);
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "User ID not found for conversation ID",
        }),
      };
    }

    userId = queryResult.Items[0].PK.S.split("#")[1];
    console.log("User ID found:", userId);
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid request body or failed to fetch user ID",
      }),
    };
  }

  try {
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

    let finalText = message;
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

    const { message: llmMessage } = llmResponse.data;

    if (!llmMessage) {
      throw new Error("No message received from LLM");
    }

    console.log("Sanitized LLM message:", llmMessage);

    const parsedMessage = JSON.parse(llmMessage);
    const { processed_text, private_data } = parsedMessage;

    console.log("Private data:", private_data);
    if (typeof private_data !== "object" || !private_data) {
      throw new Error("Invalid private_data received from LLM");
    }

    finalText = processed_text;

    // Check if private_data is empty
    if (Object.keys(private_data).length > 0) {
      const params = {
        TableName,
        Key: {
          PK: { S: `userID#${userId}` },
          SK: { S: `conversationID#${conversationId}` },
        },
        UpdateExpression: "set PIIData = :pd",
        ExpressionAttributeValues: {
          ":pd": { S: JSON.stringify(private_data) },
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

    if (anonymizationSetting) {
      let dataToSend = processed_text;

      const params = {
        TableName,
        Key: {
          PK: { S: `userID#${userId}` },
          SK: { S: `conversationID#${conversationId}` },
        },
      };

      console.log("Getting item from DynamoDB:", params);
      const result = await dynamoDbClient.send(new GetItemCommand(params));

      console.log("Result gotten from DynamoDB:", result);

      if (!result.Item || !result.Item.connectionId) {
        throw new Error(
          "Connection ID not found for the given conversation ID"
        );
      }

      const connectionId = result.Item.connectionId.S;
      console.log("Connection ID retrieved:", connectionId);

      console.log("WebSocket callback URL:", callbackUrl);

      const postParams = {
        ConnectionId: connectionId,
        Data: JSON.stringify(dataToSend),
      };

      const command = new PostToConnectionCommand(postParams);
      await apiGatewayClient.send(command);
    }

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

    console.log("Successfully processed message");
    return {
      statusCode: 200,
      body: JSON.stringify({ anonymizedText: finalText }),
    };
  } catch (error) {
    console.error("Error processing message:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
