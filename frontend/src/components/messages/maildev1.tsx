"use client"; // Spécifie que ce composant est client-side   Component; .tsx file = 
import { useEffect, useState } from "react";
import Image from "next/image";
import { MailDev2 } from "../messages/maildev2";
import { accounts, mails } from "../messages/data";

export default function MailPage1() {
  const [defaultLayout, setDefaultLayout] = useState();
  const [defaultCollapsed, setDefaultCollapsed] = useState();

  useEffect(() => {
    const layoutCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("react-resizable-panels:layout:mail="))
      ?.split("=")[1];

    const collapsedCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("react-resizable-panels:collapsed="))
      ?.split("=")[1];

    setDefaultLayout(layoutCookie ? JSON.parse(decodeURIComponent(layoutCookie)) : undefined);
    setDefaultCollapsed(collapsedCookie ? JSON.parse(decodeURIComponent(collapsedCookie)) : undefined);
  }, []);

  return (



     <div className=''>

     <div>
         <div className=''>
              <MailDev2
                accounts={accounts}
                mails={mails}
                defaultLayout={defaultLayout}
                defaultCollapsed={defaultCollapsed}
                navCollapsedSize={4}
              />
         </div>
     </div>
   </div>
  );
}



