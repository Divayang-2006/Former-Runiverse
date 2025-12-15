import React, { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

export default function NotificationSettings() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [skillReq, setSkillReq] = useState(true);
  const [sessionRem, setSessionRem] = useState(true);
  const [creditUpd, setCreditUpd] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🔔 Notification Settings</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Enable Push Notifications</Text>
        <Switch value={pushEnabled} onValueChange={setPushEnabled} />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Email Notifications</Text>
        <Switch value={emailEnabled} onValueChange={setEmailEnabled} />
      </View>

      <Text style={styles.subHeader}>Choose notification types:</Text>

      <View style={styles.row}>
        <Text style={styles.label}>New Skill Requests</Text>
        <Switch value={skillReq} onValueChange={setSkillReq} />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Session Reminders</Text>
        <Switch value={sessionRem} onValueChange={setSessionRem} />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Credit Updates</Text>
        <Switch value={creditUpd} onValueChange={setCreditUpd} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 20 },
  header: { fontSize: 22, fontWeight: "bold", color: "#00e0ff", marginBottom: 20 },
  subHeader: { fontSize: 16, color: "#bbb", marginVertical: 15 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  label: { color: "#fff", fontSize: 16 },
});
