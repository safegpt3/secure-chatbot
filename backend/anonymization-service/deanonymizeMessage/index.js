const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");

const TableName = process.env.TABLE_NAME;

const dynamoDbClient = new DynamoDBClient();

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  let anonymizedText, conversationId, userId;
  try {
    const requestBody = JSON.parse(event.body);
    ({ anonymizedText, conversationId, userId } = requestBody);
    console.log("Parsed request body:", requestBody);
  } catch (parseError) {
    console.error("Error parsing request body:", parseError);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid request body",
      }),
    };
  }

  if (!anonymizedText || !conversationId || !userId) {
    console.error("Missing anonymizedText, conversationId, or userId");
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Anonymized text, conversationId, and userId are required",
      }),
    };
  }

  const getItemParams = {
    TableName,
    Key: {
      PK: { S: `userID#${userId}` },
      SK: { S: `userID#${userId}` },
    },
  };

  try {
    console.log("Getting item from DynamoDB with params:", getItemParams);
    const getItemResult = await dynamoDbClient.send(
      new GetItemCommand(getItemParams)
    );
    console.log("GetItem result:", JSON.stringify(getItemResult, null, 2));

    if (!getItemResult.Item || !getItemResult.Item.PII) {
      console.log("No sensitive data found for the provided conversationId");
      return {
        statusCode: 200,
        body: JSON.stringify({ deanonymizedText: anonymizedText }),
      };
    }

    // Ensure the PII attribute is a valid JSON string
    if (!getItemResult.Item.PII.S) {
      console.error(
        "PII attribute is not a valid JSON string:",
        getItemResult.Item.PII
      );
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "PII attribute is not valid JSON" }),
      };
    }

    // Parse private data
    let privateData;
    try {
      privateData = JSON.parse(getItemResult.Item.PII.S);
      console.log("Private data retrieved:", privateData);
    } catch (jsonParseError) {
      console.error("Error parsing PII attribute as JSON:", jsonParseError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error parsing PII attribute as JSON" }),
      };
    }

    let deanonymizedResponse = anonymizedText;

    for (const [placeholder, originalValue] of Object.entries(privateData)) {
      const regex = new RegExp(`<${placeholder.toUpperCase()}>`, "g");
      deanonymizedResponse = deanonymizedResponse.replace(regex, originalValue);
    }

    console.log("Deanonymized response:", deanonymizedResponse);

    return {
      statusCode: 200,
      body: JSON.stringify({ deanonymizedText: deanonymizedResponse }),
    };
  } catch (error) {
    console.error("Error deanonymizing message:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
