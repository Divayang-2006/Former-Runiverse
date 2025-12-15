import React, { useState } from "react";
import { TouchableOpacity } from "react-native";
import Toast from "react-native-toast-message";
import { StyledView, StyledText } from "./Styled";
import { Challenge } from "@/store/types";
import { ChallengeCard } from "./ChallengeCard";
import { Confetti } from "./Confetti";

export function JoinableChallengeCard({ challenge }: { challenge: Challenge }) {
    const [joined, setJoined] = useState(challenge.joined || false);
    const [showConfetti, setShowConfetti] = useState(false);

    const handleJoin = () => {
        setJoined(true);
        setShowConfetti(true);
        Toast.show({
            type: "success",
            text1: "Joined Challenge 🎯",
            text2: "Good luck, warrior!",
        });
    };

    return (
        <>
            {showConfetti && (
                <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
            )}
            // If already joined, render the progress card
            {joined ? (
                <ChallengeCard challenge={challenge} />
            ) : (
                <StyledView className="bg-card-light dark:bg-card-dark p-4 rounded-2xl mb-4">
                    <StyledText className="text-lg font-semibold text-text-light dark:text-text-dark">
                        {challenge.title ?? "Untitled Challenge"}
                    </StyledText>

                    <StyledText className="text-subtle-light dark:text-subtle-dark mt-1">
                        {challenge.description ?? ""}
                    </StyledText>

                    <TouchableOpacity
                        onPress={handleJoin}
                        className="bg-primary mt-4 p-3 rounded-xl items-center active:opacity-80"
                    >
                        <StyledText className="text-black font-bold">Join Challenge</StyledText>
                    </TouchableOpacity>
                </StyledView>
            )}
        </>
    );
}
