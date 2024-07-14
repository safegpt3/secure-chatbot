//Comment - testing feature branch CI

const {
  DynamoDBClient,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");
const TableName = process.env.CONNECTIONS_TABLE_NAME;

const docClient = new DynamoDBClient();

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;
  const conversationId = event.queryStringParameters.conversationId;

  if (!conversationId) {
    console.error("Missing conversationId in query parameters");
    return { statusCode: 400, body: "Missing conversationId" };
  }

  try {
    const params = {
      TableName,
      Key: { conversationId: { S: conversationId } },
      UpdateExpression:
        "set connectionId = :c, active = :a remove disconnectedAt",
      ExpressionAttributeValues: {
        ":c": { S: connectionId },
        ":a": { S: "true" },
      },
    };
    await docClient.send(new UpdateItemCommand(params));
    return { statusCode: 200, body: "Connected." };
  } catch (err) {
    console.error("Failed to process connection:", err);
    return { statusCode: 500, body: `Failed to connect: ${err.message}` };
  }
};
