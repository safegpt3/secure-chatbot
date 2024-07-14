const {
  DynamoDBClient,
  QueryCommand,
  BatchWriteItemCommand,
} = require("@aws-sdk/client-dynamodb");

const connectionsTableName = process.env.CONNECTIONS_TABLE_NAME;
const vaultTableName = process.env.VAULT_TABLE_NAME;

const docClient = new DynamoDBClient();

exports.handler = async () => {
  const fiveMinutesAgo = Math.floor((Date.now() - 5 * 60000) / 1000);

  try {
    const params = {
      TableName: connectionsTableName,
      IndexName: "active-disconnectedAt-index",
      KeyConditionExpression: "#a = :inactive and disconnectedAt <= :timeLimit",
      ExpressionAttributeNames: {
        "#a": "active",
      },
      ExpressionAttributeValues: {
        ":inactive": { S: "false" },
        ":timeLimit": { N: fiveMinutesAgo.toString() },
      },
    };

    const data = await docClient.send(new QueryCommand(params));
    console.log(`Found ${data.Items.length} items to delete.`);

    if (data.Items.length > 0) {
      await batchDeleteConnectionsAndSessions(data.Items);
    }

    console.log("Cleanup complete.");
    return { statusCode: 200, body: "Cleanup complete." };
  } catch (err) {
    console.error("Error during cleanup:", err);
    return { statusCode: 500, body: `Error during cleanup: ${err.message}` };
  }
};

async function batchDeleteConnectionsAndSessions(items) {
  const connectionDeleteRequests = items.map((item) => ({
    DeleteRequest: {
      Key: { conversationId: item.conversationId },
    },
  }));

  const sessionDeleteRequests = items.map((item) => ({
    DeleteRequest: {
      Key: { conversationId: item.conversationId },
    },
  }));

  await batchWriteItems(connectionsTableName, connectionDeleteRequests);
  await batchWriteItems(vaultTableName, sessionDeleteRequests);
}

async function batchWriteItems(tableName, deleteRequests) {
  while (deleteRequests.length > 0) {
    const batch = deleteRequests.splice(0, 25);
    const batchParams = {
      RequestItems: { [tableName]: batch },
    };

    try {
      const response = await docClient.send(
        new BatchWriteItemCommand(batchParams)
      );
      console.log(`Batch delete successful for table ${tableName}.`, response);

      if (
        response.UnprocessedItems &&
        Object.keys(response.UnprocessedItems).length > 0
      ) {
        console.error(
          "Unprocessed deletes, retrying...",
          response.UnprocessedItems
        );
        batchParams.RequestItems = response.UnprocessedItems;
        await docClient.send(new BatchWriteItemCommand(batchParams));
      }
    } catch (err) {
      console.error(`Error during batch delete for table ${tableName}:`, err);
      throw err;
    }
  }
}
