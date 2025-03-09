export const fetchAudioTranscription = async (
  endpoint: string,
  key: string,
  deployment: string,
  version: string,
  audioBlob: Blob
) => {
  const url = `${endpoint}/openai/deployments/${deployment}/audio/transcriptions?api-version=${version}`;
  const headers = {
    "api-key": key,
  };

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.wav");

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    return Promise.reject(res);
  }

  return await res.json();
};

export const fetchChatCompletion = async (
  endpoint: string,
  key: string,
  deployment: string,
  version: string,
  prompt: string
) => {
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${version}`;
  const headers = {
    "api-key": key,
    "Content-Type": "application/json",
  };

  const body = JSON.stringify({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    return Promise.reject(res);
  }

  return await res.json();
};
