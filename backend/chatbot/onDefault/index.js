const AWS = require("aws-sdk");

exports.handler = async (event) => {
  // Log the received event
  console.log("Received event:", JSON.stringify(event, null, 2));

  // Extract connection ID and the message body
  const connectionId = event.requestContext.connectionId;
  const body = JSON.parse(event.body);

  // Log the details
  console.log(`Connection ID: ${connectionId}`);
  console.log("Message body:", body);

  // Process the message (this example just returns a simple acknowledgment)
  const responseMessage = {
    message: "Message received and processed by default route",
    received_message: body,
  };

  // Return the response
  return {
    statusCode: 200,
    body: JSON.stringify(responseMessage),
  };
};
