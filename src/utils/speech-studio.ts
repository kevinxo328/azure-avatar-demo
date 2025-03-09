import {RealtimeAvatarSupportRegion} from "@/types/avatar";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

export const speechToTextFromFile = (
  region: string,
  key: string,
  file: File
) => {
  return new Promise<string>((resolve, reject) => {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(key, region);

    // Supports languages: https://learn.microsoft.com/zh-tw/azure/ai-services/speech-service/language-support?tabs=stt
    speechConfig.speechRecognitionLanguage = "zh-TW";

    //   speechConfig.setProperty(
    //     SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs,
    //     "50000"
    //   );

    const audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(file);

    const speechRecognizer = new SpeechSDK.SpeechRecognizer(
      speechConfig,
      audioConfig
    );

    speechRecognizer.recognizeOnceAsync((result) => {
      let resultText = "";
      switch (result.reason) {
        case SpeechSDK.ResultReason.RecognizedSpeech:
          console.log(`RECOGNIZED: Text=${result.text}`);
          resultText = result.text;
          break;
        case SpeechSDK.ResultReason.NoMatch:
          console.log("NOMATCH: Speech could not be recognized.");
          break;
        case SpeechSDK.ResultReason.Canceled: {
          const cancellation = SpeechSDK.CancellationDetails.fromResult(result);
          console.log(`CANCELED: Reason=${cancellation.reason}`);

          if (cancellation.reason == SpeechSDK.CancellationReason.Error) {
            console.log(`CANCELED: ErrorCode=${cancellation.ErrorCode}`);
            console.log(`CANCELED: ErrorDetails=${cancellation.errorDetails}`);
            console.log(
              "CANCELED: Did you set the speech resource key and region values?"
            );
          }
          break;
        }
      }
      speechRecognizer.close();
      if (resultText) {
        return resolve(resultText);
      }
      return reject("No text recognized");
    });
  });
};

export const createAvatarSynthesizer = (
  avatarServieKey: string,
  avatarServiceRegion: string,
  avatarCharacter: string,
  avatarStyle: string,
  customized: boolean
) => {
  const videoCropTopLeftX = 0;
  const videoCropBottomRightX = 1920;
  const backgroundColor = "#00FF00FF";
  const TalkingVideoFormat = {
    codec: "H264",
    width: 1920,
    height: 1080,
    cropRange: {
      topLeft: {
        x: videoCropTopLeftX,
        y: 0,
      },
      bottomRight: {
        x: videoCropBottomRightX,
        y: 1080,
      },
    },
    setCropRange() {},
    bitrate: 2000000,
  };

  const speechSynthesisConfig = SpeechSDK.SpeechConfig.fromSubscription(
    avatarServieKey,
    avatarServiceRegion
  );

  const avatarConfig = new SpeechSDK.AvatarConfig(
    avatarCharacter,
    avatarStyle,
    TalkingVideoFormat
  );

  avatarConfig.backgroundColor = backgroundColor;
  avatarConfig.customized = customized;

  return new SpeechSDK.AvatarSynthesizer(speechSynthesisConfig, avatarConfig);
};

export const checkRealtimeAvatarSupport = (region: string) => {
  return Object.values(RealtimeAvatarSupportRegion).includes(
    region as RealtimeAvatarSupportRegion
  );
};
