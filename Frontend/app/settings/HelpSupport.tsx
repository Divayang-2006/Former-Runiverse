import React from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HelpSupport() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>❓ Help & Support</Text>

      <TouchableOpacity style={styles.item}>
        <Text style={styles.itemText}>📘 FAQ (How-to Guides)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={() => Linking.openURL("mailto:support@example.com")}>
        <Text style={styles.itemText}>📧 Contact Support</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item}>
        <Text style={styles.itemText}>💡 Feedback Form</Text>
      </TouchableOpacity>

      <View style={styles.versionBox}>
        <Text style={styles.versionText}>App Version: 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 20 },
  header: { fontSize: 22, fontWeight: "bold", color: "#00e0ff", marginBottom: 20 },
  item: { padding: 15, backgroundColor: "#1e1e1e", borderRadius: 10, marginVertical: 8 },
  itemText: { color: "#fff", fontSize: 16 },
  versionBox: { marginTop: 30, alignItems: "center" },
  versionText: { color: "#bbb" },
});
