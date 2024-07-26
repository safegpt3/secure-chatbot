const {
  DynamoDBClient,
  UpdateItemCommand,
  PutItemCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");
const TableName = process.env.TABLE_NAME;

const docClient = new DynamoDBClient();

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;
  const conversationId = event.queryStringParameters.conversationId;
  const userId = event.queryStringParameters.userId;

  if (!conversationId || !userId) {
    console.error("Missing conversationId or userId in query parameters");
    return { statusCode: 400, body: "Missing conversationId or userId" };
  }

  try {
    // Check if the user already exists
    const getUserParams = {
      TableName,
      Key: {
        PK: { S: `userID#${userId}` },
        SK: { S: `userID#${userId}` },
      },
    };

    const getUserResult = await docClient.send(
      new GetItemCommand(getUserParams)
    );

    if (!getUserResult.Item) {
      // Create user entry if it doesn't exist
      const createUserParams = {
        TableName,
        Item: {
          PK: { S: `userID#${userId}` },
          SK: { S: `userID#${userId}` },
          userId: { S: userId },
          PII: { M: {} },
          memorySetting: { S: "" },
          anonymizationSetting: { S: "" },
        },
      };
      await docClient.send(new PutItemCommand(createUserParams));
    }

    // Update or create the conversation entry
    const updateConversationParams = {
      TableName,
      Item: {
        PK: { S: `userID#${userId}` },
        SK: { S: `conversationID#${conversationId}` },
        connectionId: { S: connectionId },
        messages: { L: [] },
        status: { S: "active" },
        createdAt: { S: new Date().toISOString() },
        disconnectedAt: { NULL: true },
      },
    };

    await docClient.send(new UpdateItemCommand(updateConversationParams));

    return { statusCode: 200, body: "Connected." };
  } catch (err) {
    console.error("Failed to process connection:", err);
    return { statusCode: 500, body: `Failed to connect: ${err.message}` };
  }
};
