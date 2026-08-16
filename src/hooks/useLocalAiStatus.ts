import { useEffect, useState } from "react";
import { getLocalAiStatus, subscribeLocalAiStatus, type LocalAiStatus } from "../services/localAi";

export function useLocalAiStatus(): LocalAiStatus {
  const [status, setStatus] = useState<LocalAiStatus>(() => getLocalAiStatus());
  useEffect(() => subscribeLocalAiStatus(setStatus), []);
  return status;
}
