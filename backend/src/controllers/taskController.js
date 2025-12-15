import Task from "../models/Task.js";
import axios from "axios";

/**
 * 🧩 Create a manual task (for admins or manual input)
 */
export const createTask = async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      userId: req.user.id,
    });
    res.status(201).json(task);
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * 📋 Fetch all tasks for the logged-in user
 */
export const getTasks = async (req, res) => {
  try {
    console.log("✅ getTasks hit");
    const tasks = await Task.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(tasks);
  } catch (err) {
    console.error("Get tasks error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * 🔍 Get single task by ID
 */
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!task) return res.status(404).json({ msg: "Task not found" });
    res.json(task);
  } catch (err) {
    console.error("Get task error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * ✅ Mark a task completed
 */
export const markTaskCompleted = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!task) return res.status(404).json({ msg: "Task not found" });

    await task.markCompleted();
    res.json({ msg: "Task marked as completed", task });
  } catch (err) {
    console.error("Mark completed error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * ❌ Delete a task
 */
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!task) return res.status(404).json({ msg: "Task not found" });
    res.json({ msg: "Task deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * 🤖 Generate AI task based on user stats
 */
export const generateAITask = async (req, res) => {
  try {
    const { recentDistance, streakDays, avgSpeed } = req.body;

    // ✅ Fetch user's recent AI-generated tasks (last 5 days)
    const recentTasks = await Task.find({
      userId: req.user.id,
      generatedByAI: true,
      createdAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    }).sort({ createdAt: -1 });

    const previousDescriptions = recentTasks.map(t => t.description).join("\n- ");

    const prompt = `
You are a friendly AI fitness coach creating personalized and motivating challenges.
Previously suggested challenges (do NOT repeat also do not make challenges around these):
- ${previousDescriptions || "None"}

User stats:
- Recent distance: ${recentDistance} km
- Current streak: ${streakDays} days
- Average speed: ${avgSpeed} km/h

Generate ONE unique, conversational, and inspiring challenge that feels personal to this user. Include small encouragements or friendly phrases like "You got this!" or "Keep the momentum going!"

Include in JSON ONLY (no extra text):
{
  "description": "...",  // a short, motivational sentence (mention progress, streak, or captured areas)
  "difficulty": "...",   // easy | medium | hard (match logically with user's stats)
  "type": "...",         // run | walk | capture | streak
  "target": ...          // realistic numeric value (km or days)
}
Guidelines:
- Tailor the challenge to the user's recent performance.
- Use a friendly, always pushing harder/motivational tone.
- Do not repeat tasks created in the last 5 days.
- Ensure the challenge feels fresh, dynamic, and achievable.
`;
    let aiTask;
    let attempts = 0;
    do {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "mistralai/mistral-small-3.2-24b-instruct:free",
          messages: [{ role: "user", content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      let aiMessage = response.data.choices[0].message.content;
      aiMessage = aiMessage.replace(/```json|```/g, "").trim();
      try {
        aiTask = JSON.parse(aiMessage);
      } catch {
        console.warn("AI returned invalid JSON, retrying...");
        attempts++;
        continue;
      }
      attempts++;
    } while (
      attempts < 2 &&
      recentTasks.some(t => t.description === aiTask.description)
    );

    const newTask = await Task.create({
      userId: req.user.id,
      description: aiTask.description,
      difficulty: aiTask.difficulty,
      type: aiTask.type,
      target: aiTask.target,
      generatedByAI: true, // ✅ Track AI-generated tasks
      expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({ msg: "AI-generated task created successfully", task: newTask });
  } catch (err) {
    console.error("AI Task generation error:", err);
    res.status(500).json({ msg: "AI generation failed" });
  }
};
