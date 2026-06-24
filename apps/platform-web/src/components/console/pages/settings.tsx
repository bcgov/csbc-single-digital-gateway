import { Button } from '@repo/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/card';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';

/** Workspace settings. v1 is a static form — Save/Cancel and the danger action are inert placeholders. */
export function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic workspace information.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-sm flex-col gap-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input id="workspace-name" defaultValue="Riverton" />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="ghost" type="button">
            Cancel
          </Button>
          <Button type="button">Save changes</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>Irreversible actions for this workspace.</CardDescription>
        </CardHeader>
        <CardFooter className="justify-end">
          <Button variant="destructive" type="button">
            Delete workspace
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
