import { render, screen } from "@testing-library/react";
import App from "../../src/App";

describe("App Component Integration Tests", () => {
  it("renders the entire application", () => {
    render(<App />);
    // Add integration-specific tests here
    screen.debug(); // This will print the rendered JSX to the console
  });
});
