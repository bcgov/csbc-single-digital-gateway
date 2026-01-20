import { Button } from "@repo/ui";
import { Container } from "../container.component";

export const PublicFooter = () => {
  return (
    <footer className="py-4">
      <Container>
        <div className="flex flex-col-reverse md:flex-row justify-between items-center">
          <span>&copy; 2025 Government of British Columbia</span>
          <div className="flex flex-row gap-4">
            <Button variant="link">
              <a
                href="https://www2.gov.bc.ca/gov/content/home/accessible-government"
                target="_blank"
              >
                Accessibility
              </a>
            </Button>
            <Button variant="link">
              <a
                href="https://www2.gov.bc.ca/gov/content/home/privacy"
                target="_blank"
              >
                Privacy
              </a>
            </Button>
            <Button variant="link">
              <a
                href="https://www2.gov.bc.ca/gov/content/home/copyright"
                target="_blank"
              >
                Copyright
              </a>
            </Button>
            <Button variant="link">
              <a
                href="https://www2.gov.bc.ca/gov/content/home/disclaimer"
                target="_blank"
              >
                Disclaimer
              </a>
            </Button>
          </div>
        </div>
      </Container>
    </footer>
  );
};
