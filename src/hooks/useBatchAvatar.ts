import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { fetchCreateAvatarBatch, fetchGetAvatarBatch } from "@/apis/speech";
import { BatchAvatarStatus } from "@/types/avatar";

const useBatchAvatar = () => {
  const [batchAvatarUrl, setBatchAvatarUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<BatchAvatarStatus | null>(null);
  const getBatchAvatarStatusTimer = useRef<NodeJS.Timeout | null>(null);

  const getBatchAvatarStatus = useMutation({
    mutationFn: (variables: {
      endpoint: string;
      apiKey: string;
      jobId: string;
    }) =>
      fetchGetAvatarBatch(
        variables.endpoint,
        variables.apiKey,
        variables.jobId
      ),

    onMutate: () => {
      console.log("Getting batch avatar status");
    },
    onSuccess: async (response, variables) => {
      switch (response.status?.toLowerCase()) {
        case BatchAvatarStatus.NotStarted.toLowerCase():
        case BatchAvatarStatus.Running.toLowerCase():
          setStatus(
            response.status === BatchAvatarStatus.NotStarted
              ? BatchAvatarStatus.NotStarted
              : BatchAvatarStatus.Running
          );
          getBatchAvatarStatusTimer.current = setTimeout(() => {
            getBatchAvatarStatus.mutate(variables);
          }, 10000);
          break;

        case BatchAvatarStatus.Failed.toLowerCase():
          console.error("Batch avatar failed");
          setStatus(BatchAvatarStatus.Failed);
          break;

        case BatchAvatarStatus.Succeeded.toLowerCase():
          setBatchAvatarUrl(response?.outputs?.result);
          setStatus(BatchAvatarStatus.Succeeded);
          break;

        default:
          console.error("Unknown status");
          setStatus(BatchAvatarStatus.Failed);
          break;
      }
    },
    onError: (error) => {
      console.error(error);
      setStatus(BatchAvatarStatus.Failed);
    },
  });

  const clearBatchAvatar = useCallback(() => {
    setBatchAvatarUrl(null);
    setStatus(null);
    if (getBatchAvatarStatusTimer.current) {
      clearTimeout(getBatchAvatarStatusTimer.current);
    }
  }, []);

  const createBatchAvatar = useMutation({
    mutationFn: (variables: {
      endpoint: string;
      apiKey: string;
      payload: Record<string, unknown>;
    }) =>
      fetchCreateAvatarBatch(variables.endpoint, variables.apiKey, {
        ...variables.payload,
        avatarConfig: {
          ...(typeof variables.payload.avatarConfig === "object"
            ? {
                ...variables.payload.avatarConfig,
                backgroundColor: "#00ff00ff",
              }
            : {}),
        },
      }),
    onMutate: () => {
      console.log("Creating batch avatar");
      setStatus(BatchAvatarStatus.NotStarted);
    },
    onSuccess: async (response, variables) => {
      getBatchAvatarStatusTimer.current = setTimeout(() => {
        getBatchAvatarStatus.mutate({
          endpoint: variables.endpoint,
          apiKey: variables.apiKey,
          jobId: response.id,
        });
      }, 6000);
    },
    onError: (error) => {
      console.error(error);
      setStatus(BatchAvatarStatus.Failed);
    },
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(10000 * 2 ** attemptIndex, 60000),
  });

  return {
    batchAvatarUrl,
    createBatchAvatar,
    getBatchAvatarStatus,
    clearBatchAvatar,
    bacthAvatarStatus: status,
  };
};

export default useBatchAvatar;
