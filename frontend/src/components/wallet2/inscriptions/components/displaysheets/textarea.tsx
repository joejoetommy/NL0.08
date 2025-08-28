"use client"

//  import React, { useState, useEffect, useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
//  FormDescription,
//  FormField,
  FormItem,
//  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Icon } from '@iconify/react';


const FormSchema = z.object({
  reply: z
    .string()
    .min(10, {
      message: "Bio must be at least 10 characters.",
    })
    .max(160, {
      message: "Bio must not be longer than 30 characters.",
    }),

  });

  interface TextareaFormProps {
    placeholder: string;
    onClearPlaceholder: () => void;
  }
  

  export function TextareaForm({ placeholder, onClearPlaceholder }: TextareaFormProps) {
    const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md  p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    })
  }

  const handleClear = () => {
    form.reset();
    onClearPlaceholder();
  };

  return (
    <div className="flex justify-between">
         <div className="pr-5"> 
            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
        </div>
            <div className="flex-grow">
                <Form {...form}  >
                <form onSubmit={form.handleSubmit(onSubmit)} className="w-3/3 space-y-6">
                <FormItem className="grid w-full gap-1.5">
              <FormControl>
                <Textarea
                  placeholder={placeholder}
                  {...form.register("reply")}
                  className="flex-grow w-full rounded"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
                </form>
            </Form>
        </div>
        <div className="flex justify-between">
            <div className="">
                <Button className="bg-grey-400  rounded" type="tag"><Icon icon="f7:at-badge-plus" className="h-13.5 w-13.5" /></Button>
                {/* Put a icon in where submit is tag other users here ^^ */}
                {/* Click this and a model for users to tag show up ^^ */}
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
        </div>
    </div>
  )
}