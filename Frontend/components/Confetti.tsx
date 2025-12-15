import React, { useRef, useEffect } from "react";
import ConfettiCannon from "react-native-confetti-cannon";

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

export const Confetti: React.FC<ConfettiProps> = ({ trigger, onComplete }) => {
  const confettiRef = useRef<ConfettiCannon | null>(null);

  useEffect(() => {
    if (trigger && confettiRef.current) {
      confettiRef.current.start();
    }
  }, [trigger]);

  return (
    <ConfettiCannon
      ref={confettiRef}
      count={80}
      origin={{ x: 0, y: 0 }}
      fadeOut
      fallSpeed={3000}
      explosionSpeed={350}
      autoStart={false}
      onAnimationEnd={onComplete}
    />
  );
};
