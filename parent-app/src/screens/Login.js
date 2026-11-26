import { useState } from "react";
import { View, Text, TextInput, Image, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { api } from "../api";
import { Button, Card } from "../components/ui";
import { GREEN, DARK, BG, SOFT, LINE, MUTED, RED } from "../theme";
import logo from "../../assets/icon.png";

// Real sign-in against the Express/MySQL backend's parents table - no demo
// bypass, no Firebase. A parent account must already be linked to a
// student (created via Sign up below, which needs the student's real
// account email) before this will succeed.
export default function Login({ onLoggedIn }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setError("");
    setBusy(true);
    try {
      const parent = await api.parentLogin(email.trim(), password);
      onLoggedIn(parent);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup() {
    setError("");
    setBusy(true);
    try {
      const parent = await api.parentSignup(email.trim(), password, studentEmail.trim());
      onLoggedIn(parent);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.page}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.hero}>
            <View style={s.logo}>
              <Image source={logo} style={s.logoImage} resizeMode="contain" />
            </View>
            <Text style={s.brand}>EduEats</Text>
            <Text style={s.brandSub}>PARENT COMPANION</Text>
            <Text style={s.heroTitle}>Stay connected to{"\n"}your child's wellbeing.</Text>
          </View>

          <Card style={{ padding: 20 }}>
            <Text style={s.eyebrow}>{mode === "login" ? "SECURE PARENT ACCESS" : "LINK TO YOUR CHILD"}</Text>
            <Text style={s.title}>{mode === "login" ? "Welcome back" : "Create parent account"}</Text>

            <Text style={s.label}>Parent email address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="parent@example.com"
              style={s.input}
            />

            <Text style={s.label}>Password</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Enter password" style={s.input} />

            {mode === "signup" && (
              <>
                <Text style={s.label}>Your child's EduEats account email</Text>
                <TextInput
                  value={studentEmail}
                  onChangeText={setStudentEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="child@example.com"
                  style={s.input}
                />
              </>
            )}

            {error ? <Text style={s.error}>{error}</Text> : null}

            <View style={{ marginTop: 18 }}>
              <Button
                title={busy ? "Please wait…" : mode === "login" ? "Sign in to parent space" : "Create account"}
                onPress={mode === "login" ? handleLogin : handleSignup}
                disabled={busy || !email || !password || (mode === "signup" && !studentEmail)}
              />
            </View>

            <Text style={s.switchText}>
              {mode === "login" ? "Need to link a child account for the first time? " : "Already have a parent account? "}
              <Text style={s.switchLink} onPress={() => { setError(""); setMode(mode === "login" ? "signup" : "login"); }}>
                {mode === "login" ? "Create one" : "Sign in"}
              </Text>
            </Text>
          </Card>

          <Text style={s.footer}>Private parent access · Linked to one student account only</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: BG },
  scroll: { padding: 20, paddingTop: 40, paddingBottom: 30 },
  hero: { alignItems: "center", marginBottom: 28 },
  logo: { width: 56, height: 56, borderRadius: 18, backgroundColor: SOFT, alignItems: "center", justifyContent: "center", marginBottom: 12, overflow: "hidden" },
  logoImage: { width: "72%", height: "72%" },
  brand: { fontSize: 24, fontWeight: "800", color: DARK },
  brandSub: { fontSize: 10, letterSpacing: 2, color: GREEN, fontWeight: "800", marginTop: 2 },
  heroTitle: { fontSize: 20, lineHeight: 27, fontWeight: "800", color: DARK, textAlign: "center", marginTop: 16 },
  eyebrow: { fontSize: 9, letterSpacing: 1.4, color: GREEN, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: DARK, marginTop: 6, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: "700", color: MUTED, marginBottom: 7, marginTop: 10 },
  input: { height: 46, borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 13, fontSize: 13, color: DARK },
  error: { color: RED, fontSize: 11, marginTop: 12 },
  switchText: { fontSize: 11, color: MUTED, textAlign: "center", marginTop: 18, lineHeight: 17 },
  switchLink: { color: GREEN, fontWeight: "800" },
  footer: { fontSize: 10, color: MUTED, textAlign: "center", marginTop: 10 },
});
