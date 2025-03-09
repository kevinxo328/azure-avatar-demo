export type ChatMessage = {
  content: string;
  role: "user" | "assistant" | "system";
  name?: string;
  imageUrl?: string;
};
