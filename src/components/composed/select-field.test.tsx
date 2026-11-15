import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectField } from "./select-field";

const user = userEvent.setup();

const options = [
  { value: "", label: "Auto" },
  { value: "text/csv", label: "CSV" },
];

describe("SelectField", () => {
  it("renders the options and current value", () => {
    render(<SelectField label="MIME type" value="text/csv" onChange={vi.fn()} options={options} />);

    expect(screen.getByLabelText("MIME type")).toHaveValue("text/csv");
    expect(screen.getByRole("option", { name: "Auto" })).toBeInTheDocument();
  });

  it("reports the selected value", async () => {
    const onChange = vi.fn();
    render(<SelectField label="MIME type" value="" onChange={onChange} options={options} />);

    await user.selectOptions(screen.getByLabelText("MIME type"), "text/csv");

    expect(onChange).toHaveBeenCalledWith("text/csv");
  });
});
