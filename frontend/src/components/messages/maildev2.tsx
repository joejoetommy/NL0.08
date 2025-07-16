import * as React from "react";
import { useState } from "react";
import { cn } from "../../lib/utils"
import { Icon } from '@iconify/react';
import {
  Inbox,
  Search,
  Briefcase,
  DollarSign,
  Plane,
  Calendar,
  Star,
  Users,
  FileText,
} from "lucide-react";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "../ui/(mail)/sheet";
import { TooltipProvider } from "../ui/tooltip";
import { MailList } from "../messages/maillist";


import { mails as MarketMails } from "../messages/(mail)/data";
import { mails as NetworkMails } from "../messages/(mail)/data1";
import { mails as FollowersMails } from "../messages/(mail)/data2";
import { mails as SocialMails } from "../messages/(mail)/data3";
import { mails as LeadsMails } from "../messages/(mail)/data4";
import { SearchEvent } from "../ui/(mail)/searchevent";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

      interface MailProps {
        accounts: {
          label: string;
          email: string;
          icon: React.ReactNode;
        }[];
        mails: Mail[];
        defaultLayout: number[] | undefined;
        defaultCollapsed?: boolean;
        navCollapsedSize: number;
      }



export function MailDev2({ 
  accounts, 
  defaultLayout = [20, 32, 48], 
  defaultCollapsed = false, 
  navCollapsedSize
}: { accounts: { label: string; email: string; icon: React.ReactNode }[]; defaultLayout: number[] | undefined; defaultCollapsed?: boolean; navCollapsedSize: number; }) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [selectedLabel, setSelectedLabel] = React.useState<string | null>(null);
  const [selectedMarkedAs, setSelectedMarkedAs] = React.useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = React.useState(accounts[0].email);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
        const [startDate, setStartDate] = useState("");
        const [endDate, setEndDate] = useState("");

  const mails = React.useMemo(() => {
    switch (selectedAccount) {
      case "Network": return NetworkMails;
      case "Followers": return FollowersMails;
      case "Social": return SocialMails;
      case "Leads": return LeadsMails;
      default: return MarketMails;
    }
  }, [selectedAccount]);

  React.useEffect(() => {
    setSelectedLabel(null);
    setSelectedMarkedAs(null);
  }, [mails]);

  const currentTitle =
  selectedMarkedAs === null
    ? "Inbox"
    : ["drafts", "sent", "spam", "bin", "archieve", "starred", "labeled", "all_mail"].includes(selectedMarkedAs)
    ? selectedMarkedAs.charAt(0).toUpperCase() + selectedMarkedAs.slice(1)
    : "Inbox";

        const [mailListKey, setMailListKey] = React.useState(0); 
    
        const handleMarkedAsSelection = (value) => {
          setSelectedMarkedAs(null); 
          setTimeout(() => {
            setSelectedMarkedAs(value);
            setMailListKey((prev) => prev + 1); 
          }, 100);
        };
        
        const handleLabelSelection = (value) => {
          setSelectedLabel(null); 
          setTimeout(() => {
            setSelectedLabel(value);
            setMailListKey((prev) => prev + 1); 
          }, 100);
        };

        const handleSearch = ({ startDate, endDate }) => {
          setStartDate(startDate);
          setEndDate(endDate);
          setMailListKey((prev) => prev + 1); 
        };
      
        const handleClear = () => {
          setStartDate("");
          setEndDate("");
          setMailListKey((prev) => prev + 1); 
        };
  
  const filteredMails = React.useMemo(() => {
    return mails.filter((mail) => {

      const matchesMarkedAs =
        selectedMarkedAs === "all_mail"
          ? true
          : selectedMarkedAs
          ? mail.markedAs.length === 1 && mail.markedAs[0] === selectedMarkedAs // ✅ Exact match only
          : true; 
  
      const matchesLabel = selectedLabel !== null ? mail.labels.includes(selectedLabel) : true;
  
      const matchesSearch =
        searchQuery === "" ||
        mail.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mail.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (mail.name && mail.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (mail.email && mail.email.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesDate =
        startDate && endDate && mail.date
          ? new Date(mail.date) >= new Date(startDate) &&
            new Date(mail.date) <= new Date(endDate)
          : true;
  
      return matchesMarkedAs && matchesLabel && matchesSearch && matchesDate;
    });
  }, [mails, selectedMarkedAs, selectedLabel, searchQuery, startDate, endDate]); // ✅ Depend on selectedMarkedAs & selectedLabel
  

          const markedAsCounts = mails.reduce((acc, mail) => {
            if (!["drafts", "sent"].includes(mail.markedAs)) {
              acc["all_mail"] = (acc["all_mail"] || 0) + 1; 
            }
          
            if (mail.markedAs.length === 0) {
              acc["inbox"] = (acc["inbox"] || 0) + 1; 
            }
          
            mail.markedAs.forEach((status) => {
              acc[status] = (acc[status] || 0) + 1;
            });
          
            return acc;
          }, {} as Record<string, number>);


      const filteredByMarkedAs = mails.filter((mail) => {
        if (selectedMarkedAs === "all_mail") {
          return !["drafts", "sent"].includes(mail.markedAs);
        }
        if (selectedMarkedAs === null) {
          return mail.markedAs.length === 0; 
        }
        return mail.markedAs.includes(selectedMarkedAs);
      });

      const dynamicLabelCounts = filteredByMarkedAs.reduce((acc, mail) => {
        mail.labels.forEach((label) => {
          acc[label] = (acc[label] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);



  return (
    <div className="w-full">
      <TooltipProvider delayDuration={0}>
        <Tabs defaultValue="all">

          <Separator />
          
{/*        <div className="bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <form onSubmit={(e) => e.preventDefault()}>
                <div className="relative  flex items-center">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                 <Input 
                                   placeholder="Search mails subject..." 
                                   className="pl-8 flex-1"
                                   value={searchQuery}
                                   onChange={(e) => setSearchQuery(e.target.value)} 
                                 />
                </div>
              </form>
            </div> */}


          <TabsContent value="all" className="m-0 w-full flex-1">
            {filteredMails.length > 0 ? (
              <MailList key={mailListKey} items={filteredMails} itemsPerPage={10} />
            //      <MailList key={mailListKey} items={filteredMails} itemsPerPage={10} />
            ) : (
              <div className="p-4 border-b border-zinc-700">
              <div >
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <div className="mb-2">
                      </div>
                      <div className="flex items-center justify-center">
                          <p className="text-center">No mail to display.</p>
                      </div>
                      <p className="text-[#030712]" >
                      For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life
                      </p>
                    </div>
                  </div>
                </div>
          </div>
            )}
          </TabsContent>
        </Tabs>
      </TooltipProvider>
      <Separator />
    </div>
  );
}




