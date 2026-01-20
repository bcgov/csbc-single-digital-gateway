import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

interface ConsentDialogProps {
  serviceSlug: string;
  applicationId: string;
  trigger?: React.ReactNode;
}

export function ConsentDialog({
  serviceSlug,
  applicationId,
  trigger,
}: ConsentDialogProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleAgree = () => {
    setOpen(false);
    navigate({
      to: "/app/services/$serviceSlug/apply/$applicationId",
      params: { serviceSlug, applicationId },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger>
        {trigger ?? (
          <Button className="w-full bg-bcgov-blue hover:bg-bcgov-blue/80">
            Apply online
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Consent & Privacy</AlertDialogTitle>
          <AlertDialogDescription>
            Before proceeding with your application, please review and agree to
            the following consent and privacy terms. We collect and share your
            information to provide you with efficient government services.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          <Card size="sm" className="text-sm">
            <CardHeader>
              <CardTitle className="text-sm">Consent</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Accordion>
                <AccordionItem value="data-collection">
                  <AccordionTrigger>Data Collection</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      We collect personal information necessary to assess your
                      eligibility and process your application.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="data-sharing">
                  <AccordionTrigger>Data Sharing</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      Your information may be shared with other government
                      ministries and authorized service providers in accordance
                      with FOIPPA.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="data-retention">
                  <AccordionTrigger>Data Retention</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      Your personal information will be retained as required by
                      law and securely disposed of afterwards.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card size="sm" className="text-sm">
            <CardHeader>
              <CardTitle className="text-sm">Privacy Notice</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Accordion>
                <AccordionItem value="your-rights">
                  <AccordionTrigger>Your Rights</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      Under FOIPPA, you have the right to access and correct
                      your personal information held by the government.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="contact-info">
                  <AccordionTrigger>Contact Information</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      For privacy questions, contact the ministry's Privacy
                      Officer or call Service BC at 1-800-663-7867.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        <AlertDialogFooter className="flex-row gap-2">
          <AlertDialogCancel className="flex-1">I disagree</AlertDialogCancel>
          <AlertDialogAction
            className="flex-1 bg-bcgov-blue hover:bg-bcgov-blue/80"
            onClick={handleAgree}
          >
            I agree
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
