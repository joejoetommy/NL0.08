
import { Button } from "../../../ui/button";
import {
  Dialog,
  DialogContent,
  // DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  // DialogTrigger,
} from "../../../ui/dialog";
// import { Input } from "../../../ui/input"
// import { Label } from "../../../ui/label"
// import { networkUsers } from "@/components/ui/networklist"
import { getProfileData, updateProfileData } from '../../data/profiledata';

interface NetworkRequestProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

export function NetworkRequest({ open, onOpenChange }: NetworkRequestProps) {
        const profileData = getProfileData();
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 text-black dark:text-white">
          <DialogHeader>
            <DialogTitle>Build your Network:</DialogTitle>
            <DialogDescription>
              Make a network transaction to {profileData.Profile.username}. 
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="grid grid-cols-4 items-center gap-4">
              {/* <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" value="Pedro Duarte" className="col-span-3" /> */}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              {/* <Label htmlFor="username" className="text-right">
                @Username
              </Label> */}
              {/* <Input type="email"  id="username" placeholder="Create a network reference" className="col-span-4" /> */}
              <textarea
                id="username"
                placeholder="Add message to this transaction... "
                rows={2}
                className="col-span-4 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
             />
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-blue-500 hover:bg-blue-600 transition-colors" type="submit">Create transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  )
}