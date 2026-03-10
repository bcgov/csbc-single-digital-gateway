import { Button } from "@repo/ui";
import { IconLogout } from "@tabler/icons-react";
import { useAuth } from "../auth.context";

export const SignOut = () => {
  const auth = useAuth();

  return (
    <Button
      onClick={() => auth.logout()}
      className="bg-red-500 hover:bg-red-500/80"
    >
      <IconLogout />
      Sign Out
    </Button>
  );
};
