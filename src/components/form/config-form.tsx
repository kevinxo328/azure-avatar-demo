import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {Info} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {useEffect} from "react";

const formSchema = z.object({
  sttType: z.enum(["whisper", "speech-studio"]),
  avatarMode: z.enum(["realtime", "batch"]),
});

type FormData = z.infer<typeof formSchema>;

type Props = {
  defaultValues: FormData;
  onSubmit: (data: FormData) => void;
  realtimeSupported?: boolean;
  disabled?: boolean;
};

export const ConfigForm = (props: Props) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: props.defaultValues,
  });

  const onSubmit = (data: FormData) => {
    props.onSubmit(data);
  };

  useEffect(() => {
    if (props.defaultValues) {
      form.reset(props.defaultValues);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.defaultValues]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-2 p-2"
      >
        <FormField
          control={form.control}
          name="sttType"
          render={({field}) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel>Speech to Text</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info size="14" className="text-muted" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <ul>
                        <li>Speech Studio：Faster speed, medium accuracy</li>
                        <li>Whisper：Slower speed, higher accuracy.</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                onValueChange={(e) => {
                  field.onChange(e);
                  form.handleSubmit(onSubmit)();
                }}
                defaultValue={field.value}
                disabled={field.disabled}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="speech-studio">Speech Studio</SelectItem>
                  <SelectItem value="whisper">Whisper</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={props.disabled}
          control={form.control}
          name="avatarMode"
          render={({field}) => (
            <FormItem>
              <FormLabel>Avatar Mode</FormLabel>
              <Select
                onValueChange={(e) => {
                  field.onChange(e);
                  form.handleSubmit(onSubmit)();
                }}
                defaultValue={field.value}
                value={field.value}
                disabled={field.disabled}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    value="realtime"
                    disabled={props.realtimeSupported === false}
                  >
                    Realtime Streaming
                  </SelectItem>
                  <SelectItem value="batch">Batch Video</SelectItem>
                </SelectContent>
              </Select>
              {props.realtimeSupported === false && (
                <FormDescription>
                  Realtime streaming is not supported in the current region.
                </FormDescription>
              )}
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
