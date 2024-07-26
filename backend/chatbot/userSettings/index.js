const {
  DynamoDBClient,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");
const TableName = process.env.TABLE_NAME;

const docClient = new DynamoDBClient();

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const { userId, memorySetting, anonymizationSetting } = JSON.parse(
    event.body
  );

  if (userId === undefined) {
    console.error("Missing userId in the request body");
    return { statusCode: 400, body: "Missing userId" };
  }

  const updateExpressions = [];
  const expressionAttributeValues = {};

  if (memorySetting !== undefined) {
    updateExpressions.push("memorySetting = :m");
    expressionAttributeValues[":m"] = { BOOL: memorySetting };
  }

  if (anonymizationSetting !== undefined) {
    updateExpressions.push("anonymizationSetting = :a");
    expressionAttributeValues[":a"] = { BOOL: anonymizationSetting };
  }

  if (updateExpressions.length === 0) {
    console.error("No settings to update");
    return { statusCode: 400, body: "No settings to update" };
  }

  const updateExpression = `SET ${updateExpressions.join(", ")}`;

  try {
    const updateParams = {
      TableName,
      Key: {
        PK: { S: `userID#${userId}` },
        SK: { S: `userID#${userId}` },
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "UPDATED_NEW",
    };

    const updateResult = await docClient.send(
      new UpdateItemCommand(updateParams)
    );
    console.log("Update result:", JSON.stringify(updateResult, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User settings updated successfully",
        attributes: updateResult.Attributes,
      }),
    };
  } catch (err) {
    console.error("Failed to update user settings:", err);
    return {
      statusCode: 500,
      body: `Failed to update user settings: ${err.message}`,
    };
  }
};
