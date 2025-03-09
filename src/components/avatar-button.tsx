import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Video } from "lucide-react";

type Props = {
  className?: string;
  active?: boolean;
  image: string;
  displayName: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const AvatarButton = ({
  active = false,
  className = "",
  image,
  displayName,
  ...buttonProps
}: Props) => {
  return (
    <button
      className={`w-full h-full overflow-hidden rounded-xl p-2 flex justify-between items-center ${
        active ? "bg-primary" : "bg-white"
      } ${className ? className : ""}`}
      {...buttonProps}
    >
      <div className="flex items-center w-full overflow-hidden">
        <Avatar>
          <AvatarImage src={image} className="object-cover object-top" />
          <AvatarFallback>
            <Skeleton className="w-full h-full bg-foreground/20" />
          </AvatarFallback>
        </Avatar>
        <p className="text-ellipsis text-nowrap overflow-hidden p-2 text-sm">
          {displayName}
        </p>
      </div>
      <div className="flex-shrink-0 flex justify-center items-center bg-card rounded-full size-7">
        <Video size={16} />
      </div>
    </button>
  );
};
