import {Mic, MicOff} from "lucide-react";
import {Button, ButtonProps} from "@/components/ui/button";

type Props = ButtonProps & {
  active: boolean;
};

export const MicButton = (props: Props) => {
  const {active, className, ...buttonProps} = props;
  return (
    <Button
      variant="default"
      className={`rounded-full size-14 ${className ? className : ""}`}
      {...buttonProps}
    >
      {active ? <MicOff className="!size-6" /> : <Mic className="!size-6" />}
    </Button>
  );
};

export default MicButton;
