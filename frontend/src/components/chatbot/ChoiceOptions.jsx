import React from "react";
import { Button } from "@/components/ui/button";

function ChoiceOptions({ options, onChoiceSelect }) {
  return (
    <div className="w-full flex flex-wrap gap-2 justify-center">
      {options.map((option, idx) => (
        <Button
          key={idx}
          className="p-3 mt-1"
          onClick={() => onChoiceSelect(option)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export default ChoiceOptions;
