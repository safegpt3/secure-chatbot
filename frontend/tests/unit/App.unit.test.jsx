import { render, screen } from "@testing-library/react";
import App from "../../src/App";

describe("App Component Unit Tests", () => {
  it("renders the App component", () => {
    render(<App />);
    screen.debug(); // This will print the rendered JSX to the console
  });
});
