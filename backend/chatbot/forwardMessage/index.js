const axios = require("axios");
const {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  DescribeTableCommand,
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
  let conversationId, responseText, messageType, body, userId;
  try {
    body = JSON.parse(event.body);
    messageType = body.type;
    conversationId = body.conversationId;
    responseText = body.payload.text;

    if (messageType === "test") {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Message forwarded successfully" }),
      };
    }

    const describeTableParams = { TableName };
    const tableDescription = await dynamoDbClient.send(
      new DescribeTableCommand(describeTableParams)
    );

    const indexInfo = tableDescription.Table.GlobalSecondaryIndexes.find(
      (index) => index.IndexName === "conversationId-index"
    );
    if (!indexInfo || indexInfo.IndexStatus !== "ACTIVE") {
      throw new Error(
        "Index conversationId-index is not active or does not exist"
      );
    }

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

    if (!queryResult.Items || queryResult.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "User ID not found for conversation ID",
        }),
      };
    }

    userId = queryResult.Items[0].PK.S.split("#")[1];
  } catch (parseError) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid request body or failed to fetch user ID",
      }),
    };
  }

  try {
    let dataToSend;

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
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User settings not found" }),
      };
    }
    const anonymizationSetting = userSettings.anonymizationSetting.BOOL;
    const memorySetting = userSettings.memorySetting.BOOL;

    if (messageType === "text" && anonymizationSetting) {
      const deanonymizeResponse = await axios.post(DEANONYMIZE_ENDPOINT, {
        anonymizedText: responseText,
        conversationId: conversationId,
        userId: userId,
      });

      if (deanonymizeResponse.status !== 200) {
        throw new Error(
          `Failed to get response from de-anonymize endpoint: ${deanonymizeResponse.statusText}`
        );
      }

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

    const params = {
      TableName,
      Key: {
        PK: { S: `userID#${userId}` },
        SK: { S: `conversationID#${conversationId}` },
      },
    };

    const result = await dynamoDbClient.send(new GetItemCommand(params));

    if (!result.Item || !result.Item.connectionId) {
      throw new Error("Connection ID not found for the given conversation ID");
    }

    const connectionId = result.Item.connectionId.S;

    const postParams = {
      ConnectionId: connectionId,
      Data: JSON.stringify(dataToSend),
    };

    const command = new PostToConnectionCommand(postParams);
    await apiGatewayClient.send(command);

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
                  type: { S: "bot" },
                  text: { S: dataToSend },
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
    return {
      statusCode: error.response ? error.response.status : 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
