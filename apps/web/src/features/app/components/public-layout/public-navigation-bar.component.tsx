import { SignIn } from "../../../auth/components/sign-in.component";
import { NavigationBar } from "../navigation-bar";

export const PublicNavigationBar = () => {
  return (
    <NavigationBar title="Single Digital Gateway" extras={<SignIn />} />
  );
};
