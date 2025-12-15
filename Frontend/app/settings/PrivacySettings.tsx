import React, { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

export default function PrivacySettings() {
  const [showSkills, setShowSkills] = useState(true);
  const [allowRequests, setAllowRequests] = useState("Anyone");

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🔒 Privacy Settings</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Show my skills publicly</Text>
        <Switch value={showSkills} onValueChange={setShowSkills} />
      </View>

      <Text style={styles.subHeader}>Who can send you requests?</Text>
      <TouchableOpacity
        style={[styles.option, allowRequests === "Anyone" && styles.activeOption]}
        onPress={() => setAllowRequests("Anyone")}
      >
        <Text style={styles.optionText}>Anyone</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.option, allowRequests === "Mutual" && styles.activeOption]}
        onPress={() => setAllowRequests("Mutual")}
      >
        <Text style={styles.optionText}>Mutual matches only</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: "#ff4d4d" }]}>
        <Text style={styles.buttonText}>Block / Report User</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 20 },
  header: { fontSize: 22, fontWeight: "bold", color: "#00e0ff", marginBottom: 20 },
  subHeader: { fontSize: 16, color: "#bbb", marginTop: 20, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  label: { color: "#fff", fontSize: 16 },
  option: { padding: 12, backgroundColor: "#1e1e1e", borderRadius: 8, marginVertical: 5 },
  activeOption: { backgroundColor: "#00e0ff55" },
  optionText: { color: "#fff" },
  button: { marginTop: 20, padding: 12, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
});
