const axios = require("axios");
const {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
} = require("@aws-sdk/client-dynamodb");
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} = require("@aws-sdk/client-apigatewaymanagementapi");

const DEANONYMIZE_ENDPOINT = process.env.DEANONYMIZE_ENDPOINT;
const TableName = process.env.TABLE_NAME;
const callbackUrl = process.env.CALLBACK_URL;

const dynamoDbClient = new DynamoDBClient();
const apiGatewayClient = new ApiGatewayManagementApiClient({
  endpoint: callbackUrl,
});

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  let conversationId, responseText, messageType, body, userId;
  try {
    body = JSON.parse(event.body);
    messageType = body.type;
    conversationId = body.conversationId;
    responseText = body.payload.text;
    console.log("Parsed request body:", body);

    if (messageType === "test") {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Message forwarded successfully" }),
      };
    }

    // Query to get the userId based on the conversationId
    const queryParams = {
      TableName,
      IndexName: "conversationId-index",
      KeyConditionExpression: "conversationId = :cid",
      ExpressionAttributeValues: {
        ":cid": { S: `conversationID#${conversationId}` },
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
  } catch (parseError) {
    console.error(
      "Error parsing request body or fetching user ID:",
      parseError
    );
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid request body or failed to fetch user ID",
      }),
    };
  }

  try {
    let dataToSend;

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
    const anonymizationSetting = userSettings.anonymizationSetting.BOOL;

    if (messageType === "text" && !anonymizationSetting) {
      // Call the De-anonymize Service
      console.log(
        "Sending request to de-anonymize endpoint:",
        DEANONYMIZE_ENDPOINT
      );
      const deanonymizeResponse = await axios.post(DEANONYMIZE_ENDPOINT, {
        anonymizedText: responseText,
        conversationId: conversationId,
      });

      if (deanonymizeResponse.status !== 200) {
        console.error(
          "Failed to get response from de-anonymize endpoint:",
          deanonymizeResponse.status,
          deanonymizeResponse.statusText,
          deanonymizeResponse.data
        );
        throw new Error(
          `Failed to get response from de-anonymize endpoint: ${deanonymizeResponse.statusText}`
        );
      }

      console.log("De-anonymize response received:", deanonymizeResponse.data);
      const { deanonymizedText } = deanonymizeResponse.data;
      dataToSend = { text: deanonymizedText };
    } else if (messageType === "choice") {
      dataToSend = {
        type: messageType,
        text: responseText,
        options: body.payload.options,
      };
    } else {
      dataToSend = { text: responseText };
    }

    // Retrieve the connectionId from the DynamoDB table using the conversationId
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
      throw new Error("Connection ID not found for the given conversation ID");
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

    console.log("Successfully forwarded message");
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Message forwarded successfully" }),
    };
  } catch (error) {
    console.error("Error processing message:", error);
    return {
      statusCode: error.response ? error.response.status : 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
