const axios = require("axios");
const {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  DescribeTableCommand,
  UpdateItemCommand,
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
      console.log("Received test message");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Message forwarded successfully" }),
      };
    }

    console.log("Describing DynamoDB table");
    const describeTableParams = { TableName };
    const tableDescription = await dynamoDbClient.send(
      new DescribeTableCommand(describeTableParams)
    );
    console.log("Table description:", tableDescription);

    const indexInfo = tableDescription.Table.GlobalSecondaryIndexes.find(
      (index) => index.IndexName === "conversationId-index"
    );
    if (!indexInfo || indexInfo.IndexStatus !== "ACTIVE") {
      throw new Error(
        "Index conversationId-index is not active or does not exist"
      );
    }

    console.log("Querying DynamoDB for conversation ID");
    const queryParams = {
      TableName,
      IndexName: "conversationId-index",
      KeyConditionExpression: "conversationId = :cid",
      ExpressionAttributeValues: {
        ":cid": { S: `${conversationId}` },
      },
    };

    const queryResult = await dynamoDbClient.send(
      new QueryCommand(queryParams)
    );
    console.log("Query result:", queryResult);

    if (!queryResult.Items || queryResult.Items.length === 0) {
      console.error("User ID not found for conversation ID:", conversationId);
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

    console.log("Fetching user settings from DynamoDB");
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
    console.log("User settings retrieved:", getUserResult);
    const userSettings = getUserResult.Item;

    if (!userSettings) {
      console.error("User settings not found for userId:", userId);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User settings not found" }),
      };
    }
    const anonymizationSetting = userSettings.anonymizationSetting.BOOL;
    const memorySetting = userSettings.memorySetting.BOOL;

    if (messageType === "text" && anonymizationSetting) {
      console.log(
        "Sending request to de-anonymize endpoint:",
        DEANONYMIZE_ENDPOINT
      );
      const deanonymizeResponse = await axios.post(DEANONYMIZE_ENDPOINT, {
        anonymizedText: responseText,
        conversationId: conversationId,
        userId: userId,
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

    console.log("Getting connection ID from DynamoDB");
    const params = {
      TableName,
      Key: {
        PK: { S: `userID#${userId}` },
        SK: { S: `conversationID#${conversationId}` },
      },
    };

    const result = await dynamoDbClient.send(new GetItemCommand(params));
    console.log("Connection ID result:", result);

    if (!result.Item || !result.Item.connectionId) {
      console.error("Connection ID not found for the given conversation ID");
      throw new Error("Connection ID not found for the given conversation ID");
    }

    const connectionId = result.Item.connectionId.S;
    console.log("Connection ID retrieved:", connectionId);

    console.log("Sending message to connection ID via WebSocket");
    const postParams = {
      ConnectionId: connectionId,
      Data: JSON.stringify(dataToSend),
    };

    const command = new PostToConnectionCommand(postParams);
    await apiGatewayClient.send(command);
    console.log("Message successfully forwarded to WebSocket");

    // Optionally save the message to DynamoDB based on memorySetting
    if (memorySetting) {
      console.log("Saving message to DynamoDB");
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
                  type: { S: "bot" },
                  text: { S: dataToSend.text },
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
