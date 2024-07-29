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

    const piiMap = getItemResult.Item.PII.M;
    console.log("PII map retrieved from DynamoDB:", piiMap);

    if (Object.keys(piiMap).length === 0) {
      console.log("PII attribute is empty");
      return {
        statusCode: 200,
        body: JSON.stringify({ deanonymizedText: anonymizedText }),
      };
    }

    const privateData = {};
    for (const key in piiMap) {
      privateData[key] = piiMap[key].S;
    }
    console.log("Private data retrieved:", privateData);

    let deanonymizedResponse = anonymizedText;
    console.log("Initial anonymized text:", deanonymizedResponse);

    for (const [placeholder, originalValue] of Object.entries(privateData)) {
      const regex = new RegExp(`<${placeholder.toUpperCase()}>`, "g");
      deanonymizedResponse = deanonymizedResponse.replace(regex, originalValue);
      console.log(
        `Replaced <${placeholder.toUpperCase()}> with ${originalValue}`
      );
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
