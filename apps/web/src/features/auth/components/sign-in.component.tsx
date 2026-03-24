import { Button } from "@repo/ui";
import { IconArrowRight, IconLogin2 } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useBcscAuth } from "../auth.context";

export const SignIn = () => {
  const auth = useBcscAuth();
  const navigate = useNavigate();

  if (auth.isAuthenticated) {
    return (
      <Button
        onClick={() => navigate({ to: "/app" })}
        className="bg-bcgov-blue hover:bg-bcgov-blue/80"
      >
        <IconArrowRight />
        Go to App
      </Button>
    );
  }

  return (
    <Button
      onClick={() => auth.login()}
      className="bg-bcgov-blue hover:bg-bcgov-blue/80"
    >
      <IconLogin2 />
      Sign In
    </Button>
  );
};
