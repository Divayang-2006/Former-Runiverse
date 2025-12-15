import { Challenge, Badge } from "@/store/types";

const API_BASE_URL = "http://10.59.24.33:5000/api"; // or your deployed URL

export const fetchChallenges = async (token?: string): Promise<Challenge[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    // Make sure data is an array
    return Array.isArray(data) ? data.map(task => ({
      id: task._id,
      title: task.description || "Untitled Challenge",
      description: task.description || "",
      goal: task.target || 1,
      currentProgress: task.completed ? (task.target || 0) : 0,
      type: task.type || "distance",
      isCompleted: task.completed || false,
    })) : [];
  } catch (err) {
    console.error("Error fetching challenges:", err);
    return [];
  }
};
