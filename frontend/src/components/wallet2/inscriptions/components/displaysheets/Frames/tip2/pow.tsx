// Tip

import React, { useState, useMemo } from 'react';
// import { Icon } from '@iconify/react'; // Ensure this is properly imported
// import CommentModel from '@/components/Frames/commentModel'; // Adjust the import path as necessary
// import { Minus, Plus } from "lucide-react"
// import { Bar, BarChart, ResponsiveContainer } from "recharts"
// import { Comment, Reply } from '@/components/data/comments'; 
// import comments from '@/components/data/comments';
import { Textarea } from "@/components/ui/textarea"
//import { TextareaForm } from "@/components/Frames/tip/textarea"
// TextareaForm
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
// import { Switch } from "@/components/ui/switch";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button"
// import {
//   Drawer,
//   DrawerClose,
//   DrawerContent,
//   DrawerDescription,
//   DrawerFooter,
//   DrawerHeader,
//   DrawerTitle,
//   DrawerTrigger,
//   RectangleComponent,
// } from "@/components/Frames/drawer"
// import CommentSection from '../Frames/commentSection';

// This is the Text area field imports
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

// import {
//   Form,
//   FormControl,
//   FormDescription,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form"
// import { toast } from "@/components/ui/use-toast"

// import React, { useState } from 'react';
import { Icon } from '@iconify/react';
// import { TextareaForm } from "@/components/Frames/tip/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FormSchema = z.object({
  reply: z
    .string()
    .min(10, { message: "Comment must be at least 10 characters." })
    .max(160, { message: "Comment must not be longer than 160 characters." }),
});

interface TextareaFormProps {
  placeholder: string;
  onClearPlaceholder: () => void;
}

interface Tip {
  id: number;
  user: string;
  avatarUrl: string;
  content: string;
  tipAmount: number;
  messageType: string; // "Comment" or "Direct Message"
  createdAt: string;
}

interface DrawerTipProps {
  tips?: Tip[]; // Make tips optional to prevent runtime errors
  onSubmitTip: (newTip: Tip) => void;
}

// TextareaForm Component (already defined in your code)
export function TextareaForm({ placeholder, onClearPlaceholder }: TextareaFormProps) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

  const handleClear = () => {
    form.reset();
    onClearPlaceholder();
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-start space-x-4">
        <Avatar>
          <AvatarImage src="" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full flex items-center space-x-2">
            <div className="flex-grow">
              <Textarea
                placeholder={placeholder}
                {...form.register("reply")}
                className="flex-grow w-full rounded"
              />
              <div>
                {form.formState.errors.reply && (
                  <span className="text-red-500 text-sm">{form.formState.errors.reply.message}</span>
                )}
              </div>
            </div>
            <div className="pl-1">
              <div className="flex flex-col space-y-1">
                <Button className="bg-blue-400 pd-10 pr-4 pl-4 rounded" type="submit">
                  <Icon icon="fluent:send-28-filled" className="h-6 w-6" />
                </Button>
                <div className="mt-4">
                  <Button className="bg-red-400 h-2 pr-2 pl-4 rounded" type="button" onClick={handleClear}>
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Accordion to display Tip data
function AccordionDemo({ tips = [] }: { tips: Tip[] }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {tips.length > 0 ? (
        tips.map((tip) => (
          <AccordionItem key={tip.id} value={`tip-${tip.id}`}>
            <AccordionTrigger>
              {`${tip.user} - ${tip.messageType} - ${tip.tipAmount} Sats`}
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex items-start space-x-4">
                <img
                  src={tip.avatarUrl}
                  alt={`${tip.user}'s avatar`}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="text-sm text-gray-500">{tip.content}</p>
                  <p className="text-xs text-gray-400">
                    Sent on: {new Date(tip.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))
      ) : (
        <div className="text-gray-500 text-sm p-4">No tips available yet.</div>
      )}
    </Accordion>
  );
}

// DrawerTip Component
// const DrawerTip: React.FC<{ tips: Tip[]; onSubmitTip: (newTip: Tip) => void }> = ({ tips, onSubmitTip }) => {
  const DrawerTip: React.FC<DrawerTipProps> = ({ tips = [], onSubmitTip }) => {
    const [placeholder, setPlaceholder] = useState("Add comment to your Tip here ...");
    const [tipAmount, setTipAmount] = useState(100);
    const [isDirectMessage, setIsDirectMessage] = useState(false);
    const [content, setContent] = useState("");
  
  // Calculate total tips
  const totalTips = useMemo(() => {
    return tips.reduce((sum, tip) => sum + tip.tipAmount, 0);
  }, [tips]);
    
    const handleClearPlaceholder = () => setPlaceholder('');
    const increaseTip = () => setTipAmount(Math.round(tipAmount * 1.3));
    const decreaseTip = () => setTipAmount(tipAmount > 1 ? Math.round(tipAmount / 1.3) : 1);
    const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value > 0) setTipAmount(value);
    };
    const handleSwitchChange = () => {
      setIsDirectMessage(!isDirectMessage);
      setPlaceholder(isDirectMessage ? "Add comment to your Tip here ..." : "Add direct message to your Tip here ...");
    };

  const handleSubmit = () => {
    const newTip: Tip = {
      id: Date.now(),
      user: "CurrentUser",
      avatarUrl: "https://via.placeholder.com/150/0000FF/808080?Text=User",
      content,
      tipAmount,
      messageType: isDirectMessage ? "Direct Message" : "Comment",
      createdAt: new Date().toISOString(),
    };
    onSubmitTip(newTip);
    setContent(""); // Clear the content after submission
  };

  return (
    <div className="w-full mx-auto">
      <h1 className="text-2xl font-bold mb-4">Tip Section</h1>
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-4">
          <Button className="bg-red-400 px-2 py-1 rounded hover:bg-red-500 focus:bg-red-600" onClick={decreaseTip}>
            -
          </Button>
          <div className="relative flex items-center">
            <input
              type="number"
              className="w-40 text-center border rounded pr-8"
              value={tipAmount}
              onChange={handleTipChange}
            />
            <span className="absolute right-2">Sats</span>
          </div>
          <Button className="bg-green-400 px-2 py-1 rounded hover:bg-green-500 focus:bg-green-600" onClick={increaseTip}>
            +
          </Button>
        </div>
        <span className="text-sm text-gray-500">Enter your tip amount</span>
        <div className="flex items-center space-x-2">
          <Switch
            id="message-switch"
            checked={isDirectMessage}
            onCheckedChange={handleSwitchChange}
            className="bg-blue-500 border border-gray-300 rounded-full w-11 h-6 flex items-center transition duration-300 ease-in-out"
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition duration-300 ease-in-out ${
                isDirectMessage ? 'translate-x-8' : ''
              }`}
            ></div>
          </Switch>
          <Label htmlFor="message-switch">{isDirectMessage ? "Direct Message" : "Comment"}</Label>
        </div>
        <textarea
          placeholder={placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border rounded p-2"
        />
        <Button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded" onClick={handleSubmit}>
          Submit Tip
        </Button>
        <div className="w-full mt-6">
          {/* Total Tips Display */}
          <div className="text-center text-xl font-bold mb-4">
            Total Tips: {totalTips} Sats
          </div>
          <AccordionDemo tips={tips} />
        </div>
      </div>
    </div>
  );
};

export { DrawerTip };

