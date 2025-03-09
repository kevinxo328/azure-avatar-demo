import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {AvatarConfig} from "@/types/config";
import {ScrollArea} from "@/components/ui/scroll-area";
import MicButton from "@/components/mic-button";
import useRecorder from "@/hooks/useRecoder";
import {fetchAudioTranscription, fetchChatCompletion} from "@/apis/aoai";
import {useMutation} from "@tanstack/react-query";
import BgRemovePlayer, {PlayerRef} from "@/components/bg-remove-player";
import useBatchAvatar from "@/hooks/useBatchAvatar";
import {createSSML, preloadImage, santizeText} from "@/utils/utils";
import {useBoundStore} from "@/store/store";
import {Trash2} from "lucide-react";

import {toast} from "sonner";
import Spinner from "@/components/spinner";
import {
  speechToTextFromFile,
  checkRealtimeAvatarSupport,
} from "@/utils/speech-studio";
import {ChatMessage} from "@/types/chat";
import ChatMessages, {ChatMessagesRef} from "@/components/chat-messages";
import Markdown from "react-markdown";
import {AvatarButton} from "@/components/avatar-button";
import {ConfigForm} from "@/components/form/config-form";
import {Helmet} from "react-helmet-async";
import {Button} from "@/components/ui/button";
import AppLoading from "@/layout/AppLoading";

type Props = {
  realtime?: boolean;
};

export const AvatarAssistant = (props: Props) => {
  const [currentAvatar, setCurrentAvatar] = useState<AvatarConfig | null>(null);
  const [mode, setMode] = useState<"batch" | "realtime">("batch");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [sttType, setSttType] = useState<"whisper" | "speech-studio">(
    "speech-studio"
  );
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [needInteractionFirst, setNeedInteractionFirst] = useState(false);
  const [isPreload, setIsPreload] = useState(false);

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [currentTab, setCurrentTab] = useState("avatar");
  const [primaryPlayerIsPlaying, setPrimaryPlayerIsPlaying] = useState(false);

  const playerRef = useRef<PlayerRef | null>(null);
  const initRef = useRef(false);
  const pcChatMessagesRef = useRef<ChatMessagesRef | null>(null);
  const mobileChatMessagesRef = useRef<ChatMessagesRef | null>(null);

  const lastMessage = useMemo(() => {
    const notUserMessages = messages.filter((m) => m.role !== "user");
    return notUserMessages[notUserMessages.length - 1];
  }, [messages]);

  const {isRecording, startRecording, stopRecording, audioBlob} = useRecorder();

  const {
    batchAvatarUrl,
    createBatchAvatar,
    clearBatchAvatar,
    bacthAvatarStatus,
  } = useBatchAvatar();

  const avatarSynthesizer = useBoundStore((state) => state.avatarSynthesizer);
  const webRtcConnectionState = useBoundStore(
    (state) => state.webRtcConnectionState
  );
  const connectRealtimeAvatar = useBoundStore(
    (state) => state.connectRealtimeAvatar
  );
  const disconnectRealtimeAvatar = useBoundStore(
    (state) => state.disconnectRealtimeAvatar
  );
  const webRtc = useBoundStore((state) => state.webRtc);
  const realtimeAvatarSpeaking = useBoundStore((state) => state.isSpeaking);

  const chatWithAi = useCallback(
    async (
      endpoint: string,
      key: string,
      deployment: string,
      version: string,
      prompt: string,
      chatbotName?: string,
      chatbotImageUrl?: string
    ) => {
      try {
        setIsChatting(true);
        const response = await fetchChatCompletion(
          endpoint,
          key,
          deployment,
          version,
          prompt
        );

        setMessages((prev) => [
          ...prev,
          {
            content: santizeText(response.choices[0].message.content),
            role: "assistant",
            ...(chatbotName ? {name: chatbotName} : {}),
            ...(chatbotImageUrl ? {imageUrl: chatbotImageUrl} : {}),
          },
        ]);
      } catch (e) {
        console.error(e);
        toast.error("Can't chat with AI, please try again later.");
      } finally {
        setIsChatting(false);
      }
    },
    []
  );

  const scrollToBottom = useCallback(() => {
    const options: ScrollIntoViewOptions = {
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    };
    if (pcChatMessagesRef.current?.root) {
      const lastMessage = pcChatMessagesRef.current.root.lastElementChild;
      if (lastMessage) {
        lastMessage.scrollIntoView(options);
      }
    }
    if (mobileChatMessagesRef.current?.root) {
      const lastMessage = mobileChatMessagesRef.current.root.lastElementChild;
      if (lastMessage) {
        lastMessage.scrollIntoView(options);
      }
    }
  }, []);

  const handleAvatarClick = (
    avatar: AvatarConfig,
    avatarMode: "realtime" | "batch",
    autoConnect: boolean = true
  ) => {
    const realtimeSupported = checkRealtimeAvatarSupport(
      import.meta.env.VITE_AZURE_AVATAR_REGION || ""
    );
    const newMode =
      avatarMode === "realtime" && realtimeSupported ? "realtime" : "batch";

    setCurrentAvatar(avatar);
    setMode(newMode);
    setMediaStream(null);
    disconnectRealtimeAvatar();
    clearBatchAvatar();
    toast.dismiss();

    if (autoConnect && newMode === "realtime") {
      console.log("realtime avatar start");

      if (realtimeSupported) {
        connectRealtimeAvatar(
          import.meta.env.VITE_AZURE_AVATAR_REGION || "",
          import.meta.env.VITE_AZURE_AVATAR_API_KEY || "",
          avatar.avatarConfig.talkingAvatarCharacter,
          avatar.avatarConfig.talkingAvatarStyle || "",
          avatar.avatarConfig.customized || false
        );
        setNeedInteractionFirst(false);
      } else {
        setTimeout(() => {
          toast.info("Realtime avatar is not supported in this region.");
        }, 0);
      }
    }
  };

  const transcriptAudioByWhisper = useMutation({
    mutationFn: (params: {
      endpoint: string;
      apiKey: string;
      deployment: string;
      version: string;
      audioBlob: Blob;
    }) =>
      fetchAudioTranscription(
        params.endpoint,
        params.apiKey,
        params.deployment,
        params.version,
        params.audioBlob
      ),
    onSuccess: async (response) => {
      if (!response.text) {
        toast.error(
          "Can't recognize your voice, please try again or adjust the microphone distance."
        );
        return;
      }

      setMessages((prev) => {
        // remove user message if it is the last message
        if (prev.length > 0 && prev[prev.length - 1].role === "user") {
          prev.pop();
        }
        return [
          ...prev,
          {
            content: response.text,
            role: "user",
          },
        ];
      });
    },
    onMutate: () => {
      console.log("audio transcript start by whisper");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        "Can't recognize your voice, please try again or adjust the microphone distance."
      );
    },
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(10000 * 2 ** attemptIndex, 60000),
  });

  const transcriptAudioBySpeechStudio = useMutation({
    mutationFn: (file: File) =>
      speechToTextFromFile(
        import.meta.env.VITE_AZURE_AVATAR_REGION || "",
        import.meta.env.VITE_AZURE_AVATAR_API_KEY || "",
        file
      ),
    onSuccess: (result) => {
      setMessages((prev) => {
        // remove user message if it is the last message
        if (prev.length > 0 && prev[prev.length - 1].role === "user") {
          prev.pop();
        }
        return [
          ...prev,
          {
            content: result,
            role: "user",
          },
        ];
      });
    },
    onMutate: () => {
      console.log("audio transcript start by speech studio");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        "Can't recognize your voice, please try again or adjust the microphone distance."
      );
    },
  });

  useEffect(() => {
    if (webRtcConnectionState === "disconnected") {
      setMediaStream(null);
      disconnectRealtimeAvatar();
      toast.warning(
        "Avatar is disconnected. Please reconnect or select another avatar.",
        {
          duration: Infinity,
          action: {
            label: "Reconnect",
            onClick: () => {
              handleAvatarClick(currentAvatar!, mode);
            },
          },
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webRtcConnectionState]);

  useEffect(() => {
    if (!audioBlob) return;

    if (sttType === "whisper") {
      transcriptAudioByWhisper.mutate({
        endpoint: import.meta.env.VITE_AOAI_WHISPER_API_ENDPOINT || "",
        apiKey: import.meta.env.VITE_AOAI_WHISPER_API_KEY || "",
        version: import.meta.env.VITE_AOAI_WHISPER_API_VERSION || "",
        deployment: import.meta.env.VITE_AOAI_WHISPER_DEPLOYMENT_ID || "",
        audioBlob: audioBlob,
      });
    } else {
      const file = new File([audioBlob], "audio.wav", {type: audioBlob.type});
      transcriptAudioBySpeechStudio.mutate(file);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  useEffect(() => {
    if (!webRtc) return;
    const handleTrack = (e: RTCTrackEvent) => {
      console.log("ontrack", e.track.kind);
      if (e.track.kind === "video" && playerRef.current?.video) {
        setMediaStream(e.streams[0]);
        playerRef.current.video.autoplay = true;
      }

      if (e.track.kind === "audio" && playerRef.current?.audio) {
        playerRef.current.audio.srcObject = e.streams[0];
        playerRef.current.audio.autoplay = true;
      }
    };
    webRtc.addEventListener("track", handleTrack);

    return () => {
      webRtc.removeEventListener("track", handleTrack);
    };
  }, [webRtc]);

  useEffect(() => {
    if (!currentAvatar) return;
    scrollToBottom();

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      console.log("chat with ai start");
      chatWithAi(
        import.meta.env.VITE_AOAI_API_ENDPOINT || "",
        import.meta.env.VITE_AOAI_API_KEY || "",
        import.meta.env.VITE_AOAI_DEPLOYMENT_ID || "",
        import.meta.env.VITE_AOAI_API_VERSION || "",
        lastMessage.content,
        currentAvatar.displayName,
        currentAvatar.image
      );
      return;
    }

    if (lastMessage?.role === "assistant") {
      const ssml = createSSML(
        santizeText(lastMessage.content),
        currentAvatar.avatarConfig.voice
      );

      if (mode === "realtime") {
        if (avatarSynthesizer) {
          avatarSynthesizer.speakSsmlAsync(ssml);
        }
      } else {
        const avatarConfig = currentAvatar.avatarConfig.customized
          ? {
              customized: currentAvatar.avatarConfig.customized,
              talkingAvatarCharacter:
                currentAvatar.avatarConfig.talkingAvatarCharacter +
                "-" +
                currentAvatar.avatarConfig.talkingAvatarStyle,
            }
          : {
              talkingAvatarCharacter:
                currentAvatar.avatarConfig.talkingAvatarCharacter,
              talkingAvatarStyle: currentAvatar.avatarConfig.talkingAvatarStyle,
            };
        const params = {
          endpoint: import.meta.env.VITE_AZURE_AVATAR_API_ENDPOINT || "",
          apiKey: import.meta.env.VITE_AZURE_AVATAR_API_KEY || "",
          payload: {
            inputKind: "SSML",
            inputs: [
              {
                content: ssml,
              },
            ],
            avatarConfig,
          },
        };

        createBatchAvatar.mutate(params);
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (initRef.current) return;

    setIsLoadingConfig(true);
    Promise.all([fetch("/config/avatar.json").then((res) => res.json())])
      .then(([avatar]) => {
        setAvatarConfig(avatar);

        setIsPreload(true);
        preloadImage(avatar[0].image).finally(() => {
          setIsPreload(false);
        });

        handleAvatarClick(
          avatar[0],
          props.realtime ? "realtime" : "batch",
          false
        );

        if (props.realtime) {
          setNeedInteractionFirst(true);
        }
      })
      .catch((e) => {
        console.error(e);
        toast.error("Can't load avatar config, please try again later.");
      })
      .finally(() => {
        setIsLoadingConfig(false);
      });

    initRef.current = true;
    return () => {
      disconnectRealtimeAvatar();
      clearBatchAvatar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disableInteration = useMemo(() => {
    return (
      /new|connecting/.test(webRtcConnectionState) ||
      /NotStarted|Running/.test(bacthAvatarStatus || "") ||
      transcriptAudioByWhisper.isPending ||
      transcriptAudioBySpeechStudio.isPending ||
      isChatting
    );
  }, [
    webRtcConnectionState,
    bacthAvatarStatus,
    transcriptAudioByWhisper.isPending,
    isChatting,
    transcriptAudioBySpeechStudio.isPending,
  ]);

  const isSpeaking = useMemo(() => {
    return (
      (mode === "realtime" && realtimeAvatarSpeaking) ||
      (mode === "batch" && primaryPlayerIsPlaying)
    );
  }, [realtimeAvatarSpeaking, mode, primaryPlayerIsPlaying]);

  const realtimeSupported = useMemo(() => {
    return checkRealtimeAvatarSupport(
      import.meta.env.VITE_AZURE_AVATAR_REGION || ""
    );
  }, []);

  if (isLoadingConfig || isPreload) {
    return <AppLoading />;
  }

  return (
    <>
      <Helmet>
        <title>
          {document.title} | {props.realtime ? "Realtime" : "Batch"} Avatar
        </title>
      </Helmet>
      <div className="w-full h-full xl:container mx-auto grid grid-rows-[minmax(0,2fr)_minmax(350px,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_250px] xl:grid-rows-[100px_minmax(0,2fr)_minmax(0,1fr)_100px] xl:gap-4">
        <div className="hidden xl:block row-start-2 row-span-2">
          <div className="h-full max-h-full overflow-hidden flex flex-col gap-2 rounded-xl bg-card p-4">
            <div className="flex justify-between">
              <p className="text-xl">Chat History</p>
              <Button
                variant="default"
                className="rounded-full size-10 bg-foreground text-background hover:bg-foreground/90"
                onClick={() => setMessages([])}
                disabled={disableInteration || isSpeaking}
              >
                <Trash2 />
              </Button>
            </div>
            <ScrollArea className="h-full max-h-full pr-2">
              <ChatMessages messages={messages} ref={pcChatMessagesRef} />
            </ScrollArea>
          </div>
        </div>
        <div className="xl:row-span-4 w-full h-full max-h-full overflow-hidden flex">
          <div className="w-full h-full relative overflow-hidden">
            {currentAvatar && (
              <BgRemovePlayer
                src={
                  mode === "realtime" && mediaStream
                    ? mediaStream
                    : batchAvatarUrl || ""
                }
                className="w-full h-full"
                poster={currentAvatar.image}
                ref={playerRef}
                threshold={120}
                position="top"
                onPlayPause={() => clearBatchAvatar()}
                onUpdatePlaying={(isPlaying) =>
                  setPrimaryPlayerIsPlaying(isPlaying)
                }
              />
            )}
            {disableInteration && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Spinner />
              </div>
            )}

            <div className="hidden xl:block absolute left-1/2 bottom-10 -translate-x-1/2 w-3/4 max-w-[600px]">
              <ScrollArea className="w-full h-[150px] rounded-xl p-3 overflow-y-auto bg-white">
                <div className="m-1">
                  <Markdown>
                    {lastMessage?.content || "Welcome to Avatar Assistant"}
                  </Markdown>
                </div>
              </ScrollArea>
              <div className="flex items-center justify-center pt-5">
                {needInteractionFirst ? (
                  <Button
                    size="lg"
                    className="rounded-full py-7 shadow-lg ring-2 ring-foreground/10"
                    onClick={() => {
                      handleAvatarClick(currentAvatar!, "realtime");
                    }}
                  >
                    Start Interaction
                  </Button>
                ) : (
                  <MicButton
                    active={isRecording}
                    onClick={() => {
                      if (isRecording) {
                        stopRecording();
                        toast.dismiss();
                      } else {
                        startRecording();
                        toast.info(
                          "Recording..., if you want to stop, click the button again",
                          {
                            duration: Infinity,
                          }
                        );
                      }
                    }}
                    className="bg-primary shadow-lg ring-2 ring-foreground/10"
                    disabled={disableInteration || isSpeaking}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="hidden xl:flex row-start-2 col-start-3 h-full max-h-full flex-col">
          <div className="h-full max-h-full overflow-hidden flex flex-col gap-2 rounded-xl bg-secondary p-4 pr-1">
            <p className="text-xl">Avatar Style</p>
            <ScrollArea className="h-full max-h-full pr-3">
              <div className="flex flex-col gap-4">
                {avatarConfig.map((avatar, index) => {
                  return (
                    <AvatarButton
                      onClick={() => {
                        handleAvatarClick(
                          avatar,
                          props.realtime ? "realtime" : "batch"
                        );
                      }}
                      key={index}
                      active={currentAvatar?.displayName === avatar.displayName}
                      image={avatar.image}
                      displayName={avatar.displayName}
                      disabled={disableInteration || isSpeaking}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
        <div className="hidden xl:flex row-start-3 col-start-3 h-full max-h-full flex-col">
          <div className="h-full max-h-full overflow-hidden flex flex-col gap-2 rounded-xl bg-white p-4 pr-1">
            <p className="text-xl">Settings</p>
            <ScrollArea className="h-full max-h-full pr-3">
              <ConfigForm
                defaultValues={{
                  sttType: sttType,
                  avatarMode: mode,
                }}
                onSubmit={(data) => {
                  if (data.sttType !== sttType) {
                    setSttType(data.sttType as "whisper" | "speech-studio");
                  }
                  if (data.avatarMode !== mode) {
                    handleAvatarClick(
                      currentAvatar!,
                      data.avatarMode as "realtime" | "batch"
                    );
                  }
                }}
                realtimeSupported={realtimeSupported}
                disabled={disableInteration || isSpeaking}
              />
            </ScrollArea>
          </div>
        </div>

        {/* Mobile */}
        <div className="xl:hidden w-full h-full max-h-full overflow-hidden flex flex-col gap-4 bg-card rounded-t-3xl p-6">
          <Tabs
            value={currentTab}
            onValueChange={(value) => setCurrentTab(value)}
            className="w-full h-full max-h-full overflow-hidden flex flex-col gap-4"
          >
            <TabsList className="h-auto">
              <TabsTrigger
                value="avatar"
                className="rounded-full w-full data-[state=active]:bg-foreground data-[state=active]:text-background h-[40px]"
              >
                Avatar Style
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="rounded-full w-full data-[state=active]:bg-foreground data-[state=active]:text-background h-[40px]"
              >
                Chat History
              </TabsTrigger>
              <TabsTrigger
                value="config"
                className="rounded-full w-full data-[state=active]:bg-foreground data-[state=active]:text-background h-[40px]"
              >
                Settings
              </TabsTrigger>
            </TabsList>
            {currentTab === "chat" && (
              <div className="flex justify-end">
                <Button
                  variant="default"
                  className="rounded-full size-8 bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => setMessages([])}
                  disabled={disableInteration || isSpeaking}
                >
                  <Trash2 />
                </Button>
              </div>
            )}
            <ScrollArea className="h-full max-h-full pr-2">
              <TabsContent value="avatar">
                {
                  <div className="flex flex-col gap-4">
                    {avatarConfig.map((avatar, index) => {
                      return (
                        <AvatarButton
                          onClick={() =>
                            handleAvatarClick(
                              avatar,
                              props.realtime ? "realtime" : "batch"
                            )
                          }
                          key={index}
                          active={
                            currentAvatar?.displayName === avatar.displayName
                          }
                          image={avatar.image}
                          displayName={avatar.displayName}
                          disabled={disableInteration || isSpeaking}
                        />
                      );
                    })}
                  </div>
                }
              </TabsContent>
              <TabsContent value="chat">
                <ChatMessages messages={messages} ref={mobileChatMessagesRef} />
              </TabsContent>
              <TabsContent value="config">
                <ConfigForm
                  defaultValues={{
                    sttType: sttType,
                    avatarMode: mode,
                  }}
                  onSubmit={(data) => {
                    if (data.sttType !== sttType) {
                      setSttType(data.sttType as "whisper" | "speech-studio");
                    }
                    if (data.avatarMode !== mode) {
                      handleAvatarClick(
                        currentAvatar!,
                        data.avatarMode as "realtime" | "batch"
                      );
                    }
                  }}
                  realtimeSupported={realtimeSupported}
                  disabled={disableInteration || isSpeaking}
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>
          <div className="flex-shrink-0 flex justify-center">
            {needInteractionFirst ? (
              <Button
                size="lg"
                className="rounded-full py-7 shadow-lg ring-2 ring-foreground/10"
                onClick={() => {
                  handleAvatarClick(currentAvatar!, "realtime");
                }}
              >
                Start Interaction
              </Button>
            ) : (
              <MicButton
                active={isRecording}
                onClick={() => {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    startRecording();
                  }
                }}
                className="bg-primary shadow-lg ring-2 ring-foreground/10"
                disabled={disableInteration || isSpeaking}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AvatarAssistant;
