import { StyledText, StyledView } from "./Styled";
import { LucideIcon } from "lucide-react-native";

interface StatCardProps {
   icon: LucideIcon;
   label: string;
   value: string;
}

export function StatCard({ icon: Icon, label, value }: StatCardProps) {
   return (
      <StyledView className="flex-1 items-center p-4 bg-card-light dark:bg-card-dark rounded-2xl">
         <Icon color="#6A5ACD" size={24} />
         <StyledText className="text-xl font-bold mt-2 text-text-light dark:text-text-dark">{value}</StyledText>
         <StyledText className="text-sm text-subtle-light dark:text-subtle-dark">{label}</StyledText>
      </StyledView>
   );
}