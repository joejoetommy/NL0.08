
import MailDev1 from "../components/messages/maildev1"

const MessagesPage: React.FC = () => (
  <div className="flex flex-col pt-4 sm:ml-[120px] md:ml-[250px] sm:border-r sm:border-zinc-700 pb-20 h-full">
    <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-zinc-700 px-4 py-3">
      <h1 className="text-xl font-bold">Messages</h1>
    </div>
        <MailDev1 />
  </div>
);
export default MessagesPage;