import React from "react";
import {
  AppSearchProvider,
  useAppSearch,
} from "../../app-search/app-search.context";

const AppSearchConsumer = () => {
  const { open, setOpen } = useAppSearch();

  return (
    <div>
      <div data-cy="state">{open ? "open" : "closed"}</div>
      <button data-cy="set-open" onClick={() => setOpen(true)}>
        Set Open
      </button>
      <button data-cy="set-closed" onClick={() => setOpen(false)}>
        Set Closed
      </button>
      <button data-cy="toggle" onClick={() => setOpen(!open)}>
        Toggle
      </button>
    </div>
  );
};

class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <div data-cy="error">{(this.state.error as Error).message}</div>;
    }
    return this.props.children;
  }
}

describe("AppSearchProvider Component Test", () => {
  beforeEach(() => {
    cy.mount(
      <AppSearchProvider>
        <AppSearchConsumer />
      </AppSearchProvider>,
    );
  });

  it("Should provide default open state as false", () => {
    cy.get('[data-cy="state"]').should("have.text", "closed");
  });

  it("Should update state via setOpen", () => {
    cy.get('[data-cy="set-open"]').click();
    cy.get('[data-cy="state"]').should("have.text", "open");

    cy.get('[data-cy="set-closed"]').click();
    cy.get('[data-cy="state"]').should("have.text", "closed");
  });

  it("Should toggle open state", () => {
    cy.get('[data-cy="toggle"]').click();
    cy.get('[data-cy="state"]').should("have.text", "open");

    cy.get('[data-cy="toggle"]').click();
    cy.get('[data-cy="state"]').should("have.text", "closed");
  });

  it("Should throw when useAppSearch is used outside AppSearchProvider", () => {
    cy.mount(
      <TestErrorBoundary>
        <AppSearchConsumer />
      </TestErrorBoundary>,
    );

    cy.get('[data-cy="error"]').should(
      "have.text",
      "useAppSearch must be used within an AppSearchProvider",
    );
  });
});
