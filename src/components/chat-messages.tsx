import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage } from "@/types/chat";
import { Bot, User } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef } from "react";
import Markdown from "react-markdown";

type Props = {
  className?: string;
  messages: ChatMessage[];
};

export type ChatMessagesRef = {
  root: HTMLDivElement | null;
};

export const ChatMessages = forwardRef<ChatMessagesRef, Props>((props, ref) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const assistantClass = "bg-primary text-primary-foreground";
  const userClass = "bg-white text-primary-foreground";

  useImperativeHandle(ref, () => ({
    root: rootRef.current,
  }));

  return (
    <div
      className={`flex flex-col gap-4 ${
        props.className ? props.className : ""
      }`}
      ref={rootRef}
    >
      {props.messages.map((message, index) => (
        <div key={index} className="flex">
          <div
            className={`flex-shrink-0 size-10 flex justify-center items-center rounded-full ${
              message.role === "assistant" ? assistantClass : userClass
            }`}
          >
            {message.role === "assistant" && (
              <Avatar>
                <AvatarImage
                  src={message?.imageUrl}
                  className="object-cover object-top"
                />
                <AvatarFallback>
                  <Bot />
                </AvatarFallback>
              </Avatar>
            )}
            {message.role === "user" && <User />}
          </div>
          <div className="flex flex-col w-full">
            <p className="ml-2 text-xs font-semibold">
              {message.role === "assistant"
                ? message.name || "Assistant"
                : message.role === "user"
                ? "User"
                : ""}
            </p>
            <div
              className={`p-2 mx-2 my-1 rounded-lg w-fit ${
                message.role === "assistant" ? assistantClass : userClass
              }`}
            >
              <Markdown>{message.content}</Markdown>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

export default ChatMessages;
