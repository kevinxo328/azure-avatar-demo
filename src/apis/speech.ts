export const fetchCreateAvatarBatch = async (
  endpoint: string,
  key: string,
  payload: Record<string, unknown>
) => {
  const url = `${endpoint}/avatar/batchsyntheses/${Date.now()}?api-version=2024-08-01`;

  const headers = {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": key,
  };

  const body = JSON.stringify({
    ...payload,
  });

  const res = await fetch(url, {
    method: "PUT",
    headers,
    body,
  });

  if (!res.ok) {
    return Promise.reject(res);
  }

  return await res.json();
};

export const fetchGetAvatarBatch = async (
  endpoint: string,
  key: string,
  jobId: string
) => {
  const url = `${endpoint}/avatar/batchsyntheses/${jobId}?api-version=2024-08-01`;

  const headers = {
    "Ocp-Apim-Subscription-Key": key,
  };

  const res = await fetch(url, {
    headers,
  });

  if (!res.ok) {
    return Promise.reject(res);
  }

  return await res.json();
};

export const fetchGetAvatarToken = async (region: string, key: string) => {
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`;

  const headers = {
    "Ocp-Apim-Subscription-Key": key,
  };

  const res = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    return Promise.reject(res);
  }

  return await res.json();
};
