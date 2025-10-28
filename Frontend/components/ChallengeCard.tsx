import { StyledText, StyledView } from "./Styled";
import { Challenge } from "@/store/types";
import { ShieldCheck } from "lucide-react-native";

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const progress = challenge.goal ? (challenge.currentProgress / challenge.goal) * 100 : 0;
  return (
    <StyledView className="bg-card-light dark:bg-card-dark p-4 rounded-2xl mb-4">
      <StyledView className="flex-row justify-between items-center">
        <StyledText className="text-lg font-semibold text-text-light dark:text-text-dark">
          {challenge.title ?? "Untitled Challenge"}
        </StyledText>
      </StyledView>
      <StyledText className="text-subtle-light dark:text-subtle-dark mt-1">
        {challenge.description ?? ""}
      </StyledText>
      <StyledView className="w-full bg-border-light dark:bg-border-dark rounded-full h-2.5 mt-4">
        <StyledView className="bg-primary h-2.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
      </StyledView>
      <StyledText className="text-right text-xs text-subtle-light dark:text-subtle-dark mt-1">
        {Math.round(challenge.currentProgress)} / {challenge.goal}
      </StyledText>
    </StyledView>
  );
}