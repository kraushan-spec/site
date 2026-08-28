import { Suspense } from "react";
import { AssistantChat } from "@/components/assistant/assistant-chat";

export default function AssistantPage() {
  return (
    <Suspense>
      <AssistantChat />
    </Suspense>
  );
}
