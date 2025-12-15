// import React, { useState } from "react";
// import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";

// export default function AccountSettings() {
//   const [name, setName] = useState("Change Name");
//   const [bio, setBio] = useState("");
//   const [email, setEmail] = useState("example@email.com");

//   return (
//     <ScrollView style={styles.container}>
//       <Text style={styles.header}>👤 Account Settings</Text>

//       <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Change Name" />
//       <TextInput style={styles.input} value={bio} onChangeText={setBio} placeholder="Add Bio" />
//       <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Update Email" />

//       <TouchableOpacity style={styles.button}>
//         <Text style={styles.buttonText}>Change Password</Text>
//       </TouchableOpacity>
//       <TouchableOpacity
//         style={[styles.button, { backgroundColor: "#ff4d4d" }]}
//         onPress={() => Alert.alert("Delete Account", "Are you sure?")}
//       >
//         <Text style={styles.buttonText}>Delete Account</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#121212", padding: 20 },
//   header: { fontSize: 22, fontWeight: "bold", color: "#00e0ff", marginBottom: 20 },
//   input: {
//     borderWidth: 1, borderColor: "#333", borderRadius: 10,
//     padding: 10, marginBottom: 10, color: "#fff", backgroundColor: "#1e1e1e",
//   },
//   button: {
//     backgroundColor: "#00e0ff", padding: 12, borderRadius: 10,
//     marginVertical: 5, alignItems: "center",
//   },
//   buttonText: { color: "#fff", fontWeight: "bold" },
// });

// import React, { useState } from "react";
// import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

// export default function AccountSettings() {
//   // Default values (in real app these would come from backend or Firebase)
//   const [name, setName] = useState("Change Name");
//   const [bio, setBio] = useState("This is my bio...");
//   const [email, setEmail] = useState("user@example.com");
//   const [password, setPassword] = useState("********");

//   return (
//     <ScrollView style={styles.container}>
//       <Text style={styles.header}>👤 Account Settings</Text>

//       {/* Profile Photo */}
//       <View style={styles.photoSection}>
//         <Image source={{ uri: "https://placekitten.com/200/200" }} style={styles.profilePhoto} />
//         <TouchableOpacity style={styles.changePhotoBtn}>
//           <Text style={styles.changePhotoText}>Change Photo</Text>
//         </TouchableOpacity>
//       </View>

//       {/* Name */}
//       <Text style={styles.label}>Name</Text>
//       <TextInput style={styles.input} value={name} onChangeText={setName} />

//       {/* Bio */}
//       <Text style={styles.label}>Bio</Text>
//       <TextInput
//         style={[styles.input, { height: 80 }]}
//         value={bio}
//         onChangeText={setBio}
//         multiline
//       />

//       {/* Email */}
//       <Text style={styles.label}>Email</Text>
//       <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

//       {/* Password */}
//       <Text style={styles.label}>Password</Text>
//       <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

//       {/* Buttons */}
//       <TouchableOpacity style={styles.button}>
//         <Text style={styles.buttonText}>Update Account</Text>
//       </TouchableOpacity>

//       <TouchableOpacity style={[styles.button, { backgroundColor: "#ff4d4d" }]}>
//         <Text style={styles.buttonText}>Delete Account</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#121212", padding: 20 },
//   header: { fontSize: 22, fontWeight: "bold", color: "#00e0ff", marginBottom: 20 },
//   label: { color: "#bbb", marginTop: 15 },
//   input: {
//     backgroundColor: "#1e1e1e",
//     color: "#fff",
//     padding: 12,
//     borderRadius: 8,
//     marginTop: 5,
//   },
//   photoSection: { alignItems: "center", marginBottom: 20 },
//   profilePhoto: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
//   changePhotoBtn: { padding: 8, backgroundColor: "#00e0ff33", borderRadius: 8 },
//   changePhotoText: { color: "#00e0ff" },
//   button: { marginTop: 20, backgroundColor: "#00e0ff", padding: 12, borderRadius: 10, alignItems: "center" },
//   buttonText: { color: "#fff", fontWeight: "bold" },
// });

import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AccountSettings() {
  const [name, setName] = useState("Change Name");
  const [email, setEmail] = useState("user@example.com");
  const [password, setPassword] = useState("********");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.header}>👤 Account Settings</Text>

        {/* Name */}
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

        {/* Buttons */}
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Update Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { backgroundColor: "#ff4d4d" }]}>
          <Text style={styles.buttonText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 20 },
  header: { fontSize: 22, fontWeight: "bold", color: "#00e0ff", marginBottom: 20 },
  label: { color: "#bbb", marginTop: 15, marginBottom: 5 },
  input: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  button: { marginTop: 20, backgroundColor: "#00e0ff", padding: 12, borderRadius: 10, alignItems: "center" ,bottom:10},
  buttonText: { color: "#fff", fontWeight: "bold" },
});
