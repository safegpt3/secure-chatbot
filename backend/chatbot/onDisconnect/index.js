const {
  DynamoDBClient,
  QueryCommand,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");
const TableName = process.env.TABLE_NAME;

const docClient = new DynamoDBClient();

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const connectionId = event.requestContext.connectionId;

  try {
    const queryParams = {
      TableName,
      IndexName: "connectionId-index",
      KeyConditionExpression: "connectionId = :c",
      ExpressionAttributeValues: {
        ":c": { S: connectionId },
      },
      Limit: 1,
    };

    const queryResult = await docClient.send(new QueryCommand(queryParams));
    if (queryResult.Items.length === 0) {
      console.error(
        "No connection found for the given connection ID:",
        connectionId
      );
      return { statusCode: 404, body: "No connection found." };
    }

    const userId = queryResult.Items[0].PK.S.split("#")[1];
    const conversationId = queryResult.Items[0].SK.S.split("#")[1];
    const disconnectedAt = new Date().toISOString();
    const updateParams = {
      TableName,
      Key: {
        PK: { S: `userID#${userId}` },
        SK: { S: `conversationID#${conversationId}` },
      },
      UpdateExpression: "set status = :a, disconnectedAt = :d",
      ExpressionAttributeValues: {
        ":a": { S: "inactive" },
        ":d": { S: disconnectedAt },
      },
    };

    await docClient.send(new UpdateItemCommand(updateParams));
    return { statusCode: 200, body: "Disconnected successfully" };
  } catch (err) {
    console.error("Error in deactivating user connection:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to deactivate connection" }),
    };
  }
};
