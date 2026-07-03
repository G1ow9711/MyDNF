import { describe, expect, it } from "vitest";
import { mountApp } from "../ui/app";

describe("project scaffold", () => {
  it("runs the test suite and renders the first screen title", () => {
    const root = { innerHTML: "" } as HTMLDivElement;

    mountApp(root);

    expect(root.innerHTML).toContain("烬璃纪元");
  });
});
