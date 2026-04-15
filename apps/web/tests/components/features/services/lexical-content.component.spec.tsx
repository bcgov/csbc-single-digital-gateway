import { cleanup, render, screen } from "@testing-library/react";
import { LexicalContent } from "src/features/services/components/lexical-content.component";

describe("LexicalContent Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  const makeRoot = (children: object[]) => ({
    root: {
      type: "root",
      children,
    },
  });

  it("Should render nothing when content has no root", () => {
    const { container } = render(<LexicalContent content={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("Should render a paragraph with text content", () => {
    render(
      <LexicalContent
        content={makeRoot([
          {
            type: "paragraph",
            children: [{ type: "text", text: "Hello world" }],
          },
        ])}
      />,
    );

    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("Hello world").closest("p")).toBeInTheDocument();
  });

  it("Should render h1, h2, and h3 headings with correct tags and text", () => {
    render(
      <LexicalContent
        content={makeRoot([
          {
            type: "heading",
            tag: "h1",
            children: [{ type: "text", text: "Heading One" }],
          },
          {
            type: "heading",
            tag: "h2",
            children: [{ type: "text", text: "Heading Two" }],
          },
          {
            type: "heading",
            tag: "h3",
            children: [{ type: "text", text: "Heading Three" }],
          },
        ])}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Heading One", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Heading Two", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Heading Three", level: 3 }),
    ).toBeInTheDocument();
  });

  it("Should render an unordered list with bullet items", () => {
    render(
      <LexicalContent
        content={makeRoot([
          {
            type: "list",
            listType: "bullet",
            children: [
              {
                type: "listitem",
                children: [{ type: "text", text: "Item One" }],
              },
              {
                type: "listitem",
                children: [{ type: "text", text: "Item Two" }],
              },
            ],
          },
        ])}
      />,
    );

    expect(screen.getByText("Item One")).toBeInTheDocument();
    expect(screen.getByText("Item Two")).toBeInTheDocument();

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("UL");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("Should render an ordered list with numbered items", () => {
    render(
      <LexicalContent
        content={makeRoot([
          {
            type: "list",
            listType: "number",
            children: [
              {
                type: "listitem",
                children: [{ type: "text", text: "First" }],
              },
              {
                type: "listitem",
                children: [{ type: "text", text: "Second" }],
              },
            ],
          },
        ])}
      />,
    );

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("Should render bold text when format is 1", () => {
    render(
      <LexicalContent
        content={makeRoot([
          {
            type: "paragraph",
            children: [{ type: "text", text: "Bold text", format: 1 }],
          },
        ])}
      />,
    );

    const strong = document.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong).toHaveTextContent("Bold text");
  });

  it("Should render italic text when format is 2", () => {
    render(
      <LexicalContent
        content={makeRoot([
          {
            type: "paragraph",
            children: [{ type: "text", text: "Italic text", format: 2 }],
          },
        ])}
      />,
    );

    const em = document.querySelector("em");
    expect(em).toBeInTheDocument();
    expect(em).toHaveTextContent("Italic text");
  });

  it("Should render underlined text when format is 8", () => {
    render(
      <LexicalContent
        content={makeRoot([
          {
            type: "paragraph",
            children: [{ type: "text", text: "Underlined text", format: 8 }],
          },
        ])}
      />,
    );

    const u = document.querySelector("u");
    expect(u).toBeInTheDocument();
    expect(u).toHaveTextContent("Underlined text");
  });

  it("Should render bold and italic text when format is 3", () => {
    render(
      <LexicalContent
        content={makeRoot([
          {
            type: "paragraph",
            children: [{ type: "text", text: "Bold italic text", format: 3 }],
          },
        ])}
      />,
    );

    const strong = document.querySelector("strong");
    const em = document.querySelector("em");
    expect(strong).toBeInTheDocument();
    expect(em).toBeInTheDocument();
    expect(strong).toHaveTextContent("Bold italic text");
    expect(em).toHaveTextContent("Bold italic text");
  });

  it("Should render nothing for unknown node types without throwing", () => {
    const { container } = render(
      <LexicalContent
        content={makeRoot([
          {
            type: "unknown-custom-node",
            children: [{ type: "text", text: "Should not appear" }],
          },
        ])}
      />,
    );

    expect(screen.queryByText("Should not appear")).not.toBeInTheDocument();
    expect(container.querySelector(".flex")).toBeInTheDocument();
  });

  it("Should render deeply nested content correctly", () => {
    render(
      <LexicalContent
        content={makeRoot([
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                text: "Intro: ",
              },
            ],
          },
          {
            type: "list",
            listType: "bullet",
            children: [
              {
                type: "listitem",
                children: [
                  {
                    type: "text",
                    text: "Nested item",
                    format: 1,
                  },
                ],
              },
            ],
          },
        ])}
      />,
    );

    expect(screen.getByText("Intro:")).toBeInTheDocument();

    const strong = document.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong).toHaveTextContent("Nested item");

    const listItem = screen.getByRole("listitem");
    expect(listItem).toBeInTheDocument();
  });
});
