// tests/unit/onDefault.test.js

const { handler } = require("../../../chatbot/onDefault/index");

describe("onDefault Lambda Function", () => {
  test("should return a successful response with the received message", async () => {
    const event = {
      requestContext: {
        connectionId: "test-connection-id",
      },
      body: JSON.stringify({ key: "value" }),
    };

    const expectedResponse = {
      statusCode: 200,
      body: JSON.stringify({
        message: "Message received and processed by default route",
        received_message: { key: "value" },
      }),
    };

    const result = await handler(event);

    expect(result).toEqual(expectedResponse);
  });

  test("should log the event and details correctly", async () => {
    const consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    const event = {
      requestContext: {
        connectionId: "test-connection-id",
      },
      body: JSON.stringify({ key: "value" }),
    };

    await handler(event);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Received event:",
      JSON.stringify(event, null, 2)
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Connection ID: test-connection-id"
    );
    expect(consoleLogSpy).toHaveBeenCalledWith("Message body:", {
      key: "value",
    });

    consoleLogSpy.mockRestore();
  });
});
