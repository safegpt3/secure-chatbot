const {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
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

  let conversationId, message, userId, anonymizationSetting;
  try {
    const requestBody = JSON.parse(event.body);
    ({ userId, conversationId, message, anonymizationSetting } = requestBody);
    console.log("Parsed request body:", requestBody);

    if (
      !userId ||
      !conversationId ||
      !message ||
      anonymizationSetting === undefined
    ) {
      console.error(
        "Missing userId, conversationId, message, or anonymizationSetting"
      );
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "userId, conversationId, message, and anonymizationSetting are required",
        }),
      };
    }
  } catch (error) {
    console.error("Error parsing request body:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid request body",
      }),
    };
  }

  try {
    let finalText = message;
    console.log("Sending message to LLM endpoint:", LLM_LAMBDA_ENDPOINT);
    const llmResponse = await axios.post(LLM_LAMBDA_ENDPOINT, { message });

    console.log("LLM response status:", llmResponse.status);
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

    const parsedMessage = llmResponse.data;

    if (!parsedMessage) {
      console.error("No message received from LLM");
      throw new Error("No message received from LLM");
    }

    console.log("Sanitized LLM message:", parsedMessage);

    const { processed_text, private_data } = parsedMessage;

    console.log("Private data received from LLM:", private_data);
    if (typeof private_data !== "object" || !private_data) {
      console.error("Invalid private_data received from LLM");
      throw new Error("Invalid private_data received from LLM");
    }

    finalText = processed_text;

    if (Object.keys(private_data).length > 0) {
      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      Object.entries(private_data).forEach(([key, value], index) => {
        const placeholder = `#key${index}`;
        const valuePlaceholder = `:value${index}`;
        updateExpressions.push(`${placeholder} = ${valuePlaceholder}`);
        expressionAttributeNames[placeholder] = key;
        expressionAttributeValues[valuePlaceholder] = { S: value };
      });

      const updateExpression = `SET ${updateExpressions.join(", ")}`;

      console.log("UpdateExpression:", updateExpression);
      console.log(
        "ExpressionAttributeNames:",
        JSON.stringify(expressionAttributeNames, null, 2)
      );
      console.log(
        "ExpressionAttributeValues:",
        JSON.stringify(expressionAttributeValues, null, 2)
      );

      const params = {
        TableName,
        Key: {
          PK: { S: `userID#${userId}` },
          SK: { S: `userID#${userId}` },
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      };

      console.log(
        "Updating item in DynamoDB with params:",
        JSON.stringify(params, null, 2)
      );
      await dynamoDbClient.send(new UpdateItemCommand(params));
      console.log("DynamoDB update successful");
    } else {
      console.log("No sensitive data found. Skipping DynamoDB update.");
    }

    if (!anonymizationSetting) {
      let dataToSend = finalText;

      const params = {
        TableName,
        Key: {
          PK: { S: `userID#${userId}` },
          SK: { S: `conversationID#${conversationId}` },
        },
      };

      console.log("Getting item from DynamoDB with params:", params);
      const result = await dynamoDbClient.send(new GetItemCommand(params));
      console.log("GetItem result from DynamoDB:", result);

      if (!result.Item || !result.Item.connectionId) {
        console.error("Connection ID not found for the given conversation ID");
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

      console.log("Sending data to WebSocket with params:", postParams);
      const command = new PostToConnectionCommand(postParams);
      await apiGatewayClient.send(command);
      console.log("Data successfully sent to WebSocket");
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
