const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");

const TableName = process.env.TABLE_NAME;

const dynamoDbClient = new DynamoDBClient();

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  let anonymizedText, conversationId;
  try {
    const requestBody = JSON.parse(event.body);
    ({ anonymizedText, conversationId } = requestBody);
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

  if (!anonymizedText || !conversationId) {
    console.error("Missing anonymizedResponse or conversationId");
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Anonymized response and conversationId are required",
      }),
    };
  }

  const params = {
    TableName,
    Key: {
      conversationId: { S: conversationId },
    },
  };

  try {
    console.log("Getting item from DynamoDB:", params);
    const result = await dynamoDbClient.send(new GetItemCommand(params));

    if (
      !result.Item ||
      !result.Item.privateData ||
      Object.keys(JSON.parse(result.Item.privateData.S)).length === 0
    ) {
      console.log(
        "No sensitive data found for the provided conversationId or sensitive data is empty."
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ deanonymizedText: anonymizedText }),
      };
    }

    // Parse private data
    const privateData = JSON.parse(result.Item.privateData.S);
    console.log("Private data retrieved:", privateData);

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
