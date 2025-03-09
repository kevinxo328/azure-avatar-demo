import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import {BoundStore} from "./store";
import {StateCreator} from "zustand";
import {createAvatarSynthesizer} from "@/utils/speech-studio";
import {fetchGetAvatarToken} from "@/apis/speech";
import {
  CancellationDetails,
  CancellationReason,
  ResultReason,
  SpeechSynthesisResult,
} from "microsoft-cognitiveservices-speech-sdk";
import {toast} from "sonner";

type State = {
  avatarSynthesizer: SpeechSDK.AvatarSynthesizer | null;
  webRtc: RTCPeerConnection | null;
  webRtcConnectionState: RTCPeerConnectionState;
  isSpeaking: boolean;
};

type Actions = {
  connectRealtimeAvatar: (
    region: string,
    key: string,
    avatarCharacter: string,
    avatarStyle: string,
    customized: boolean
  ) => void;
  disconnectRealtimeAvatar: () => void;
};

export type RealtimeAvatarSlice = State & Actions;

export const createRealtimeAvatarSlice: StateCreator<
  BoundStore,
  [],
  [],
  RealtimeAvatarSlice
> = (set, get) => ({
  avatarSynthesizer: null,
  avatarAsyncStatus: "pending",
  webRtc: null,
  webRtcConnectionState: "closed",
  isSpeaking: false,
  async connectRealtimeAvatar(
    region: string,
    key: string,
    avatarCharacter: string,
    avatarStyle: string,
    customized: boolean
  ) {
    const avatar = createAvatarSynthesizer(
      key,
      region,
      avatarCharacter,
      avatarStyle,
      customized
    );

    try {
      const response = await fetchGetAvatarToken(region, key);
      const url = response.Urls[0];
      const username = response.Username;
      const password = response.Password;

      const pc = new RTCPeerConnection({
        iceServers: [{urls: [url], username, credential: password}],
      });
      set({
        webRtcConnectionState: pc.connectionState,
      });

      pc.onconnectionstatechange = () => {
        console.log(`ICE Connection State: ${pc.connectionState}`, pc);
        set({
          webRtcConnectionState: pc.connectionState,
        });
      };

      // Offer to receive one video track, and one audio track
      pc.addTransceiver("video", {
        direction: "sendrecv",
      });
      pc.addTransceiver("audio", {
        direction: "sendrecv",
      });

      // Listen to data channel, to get the event from the server
      pc.addEventListener("datachannel", (event) => {
        const dataChannel = event.channel;
        dataChannel.onmessage = (e) => {
          console.log(
            "[" +
              new Date().toISOString() +
              "] WebRTC event received: " +
              e.data
          );

          if (e.data.includes("EVENT_TYPE_SWITCH_TO_SPEAKING")) {
            set({isSpeaking: true});
          } else {
            set({isSpeaking: false});
          }
        };
      });

      // This is a workaround to make sure the data channel listening is working by creating a data channel from the client side
      pc.createDataChannel("eventChannel");

      const offer = await pc.createOffer();

      await pc.setLocalDescription(offer);

      set({webRtc: pc});

      const result = await avatar.startAvatarAsync(get().webRtc!);
      if (result.reason === ResultReason.SynthesizingAudioCompleted) {
        console.log(
          "[" +
            new Date().toISOString() +
            "] Avatar started. Result ID: " +
            result.resultId
        );

        set({avatarSynthesizer: avatar});
      } else {
        if (result.reason === ResultReason.Canceled) {
          const cancellationDetails = CancellationDetails.fromResult(
            result as SpeechSynthesisResult
          );
          if (cancellationDetails.reason === CancellationReason.Error) {
            console.log(cancellationDetails.errorDetails);
          }

          console.log(
            "Unable to start avatar: " + cancellationDetails.errorDetails
          );
        }
        toast.error("Realtime avatar failed to start, please try again.");
        get().disconnectRealtimeAvatar();
      }
    } catch (error) {
      get().disconnectRealtimeAvatar();
      console.log(
        "[" +
          new Date().toISOString() +
          "] Avatar failed to start. Error: " +
          error
      );

      if (error instanceof TypeError) {
        return toast.error(
          "Realtime avatar is over the usage limit, please try again in a minute."
        );
      }
      toast.error("Realtime avatar failed to start, please try again.");
    }
  },
  disconnectRealtimeAvatar() {
    if (get().avatarSynthesizer) {
      console.log("Disconnecting avatar");
      get().avatarSynthesizer?.close();
      set({avatarSynthesizer: null});
    }

    if (get().webRtc) {
      console.log("Disconnecting webRTC");
      get().webRtc?.close();
      set({webRtc: null});
    }
    set({webRtcConnectionState: "closed", isSpeaking: false});
  },
});
