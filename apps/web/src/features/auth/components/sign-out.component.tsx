import { Button } from "@repo/ui";
import { IconLogout } from "@tabler/icons-react";
import { useAuth } from "react-oidc-context";

export const SignOut = () => {
  const auth = useAuth();

  return (
    <Button
      onClick={() => auth.signoutRedirect()}
      className="bg-danger hover:bg-danger/80"
    >
      <IconLogout />
      Sign Out
    </Button>
  );
};
