import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Image, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { StatusBar } from "expo-status-bar";
import { api } from "../api";
import { Button, Card } from "../components/ui";
import { GREEN, DARK, BG, SOFT, LINE, MUTED, RED } from "../theme";
import logo from "../../assets/icon.png";

const isWeb = Platform.OS === "web";

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

  // Set once a first-time Google sign-in comes back needing a child account
  // linked (same requirement as the email/password Sign up form) - holds
  // the verified credential so the link step can re-send it rather than
  // trusting the email shown on screen.
  const [googleLinking, setGoogleLinking] = useState(null);
  const [linkStudentEmail, setLinkStudentEmail] = useState("");
  // Google's official sign-in is a browser widget - it only renders inside
  // a real web page, not inside Expo Go. On native this just shows a
  // popup explaining that, same pattern as the existing Apple Sign-In block.
  const [googleBlocked, setGoogleBlocked] = useState(false);
  const googleButtonRef = useRef(null);

  async function handleGoogleCredential(credential) {
    setError("");
    setBusy(true);
    try {
      const result = await api.googleParentAuth(credential);
      if (result.needsLink) {
        setGoogleLinking({ credential, email: result.email });
      } else {
        onLoggedIn(result);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLink() {
    setError("");
    setBusy(true);
    try {
      const parent = await api.googleParentLink(googleLinking.credential, linkStudentEmail.trim());
      onLoggedIn(parent);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Renders Google's own sign-in button once its script has loaded (web
  // only) - a custom-styled button can't trigger real Google sign-in
  // reliably, only Google's own widget can.
  useEffect(() => {
    if (!isWeb || mode !== "login" || googleLinking) return;
    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      if (window.google && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
          callback: (response) => handleGoogleCredential(response.credential),
        });
        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          shape: "rectangular",
          size: "large",
          width: googleButtonRef.current.offsetWidth || 320,
          text: "continue_with",
        });
        clearInterval(id);
      } else if (attempts > 20) {
        clearInterval(id);
      }
    }, 150);
    return () => clearInterval(id);
  }, [mode, googleLinking]);

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
            {googleLinking ? (
              <>
                <Text style={s.eyebrow}>ALMOST THERE</Text>
                <Text style={s.title}>Link your child's account</Text>
                <Text style={s.label}>Signed in as {googleLinking.email}. Enter your child's EduEats account email to finish.</Text>
                <Text style={s.label}>Your child's EduEats account email</Text>
                <TextInput
                  value={linkStudentEmail}
                  onChangeText={setLinkStudentEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="child@example.com"
                  style={s.input}
                />

                {error ? <Text style={s.error}>{error}</Text> : null}

                <View style={{ marginTop: 18 }}>
                  <Button
                    title={busy ? "Please wait…" : "Link account"}
                    onPress={handleGoogleLink}
                    disabled={busy || !linkStudentEmail.trim()}
                  />
                </View>

                <Text style={s.switchText}>
                  <Text style={s.switchLink} onPress={() => { setError(""); setGoogleLinking(null); }}>
                    Cancel and go back
                  </Text>
                </Text>
              </>
            ) : (
              <>
                <Text style={s.eyebrow}>{mode === "login" ? "SECURE PARENT ACCESS" : "LINK TO YOUR CHILD"}</Text>
                <Text style={s.title}>{mode === "login" ? "Welcome back" : "Create parent account"}</Text>

                {mode === "login" && (
                  <>
                    {isWeb ? (
                      <View ref={googleButtonRef} style={s.googleBtnContainer} />
                    ) : (
                      <Button title="Continue with Google" outline onPress={() => setGoogleBlocked(true)} />
                    )}
                    <View style={s.dividerRow}>
                      <View style={s.dividerLine} />
                      <Text style={s.dividerText}>or sign in with email</Text>
                      <View style={s.dividerLine} />
                    </View>
                  </>
                )}

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
              </>
            )}
          </Card>

          <Text style={s.footer}>Private parent access · Linked to one student account only</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={googleBlocked} transparent animationType="fade" onRequestClose={() => setGoogleBlocked(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Google Sign-In unavailable here</Text>
            <Text style={s.modalBody}>
              Google's sign-in button only works inside a real web page, not inside the Expo Go
              app. Open the web version of this app in a browser to sign in with Google, or use
              your email and password here.
            </Text>
            <Button title="Got it" onPress={() => setGoogleBlocked(false)} />
          </View>
        </View>
      </Modal>
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
  googleBtnContainer: { width: "100%", height: 46, marginTop: 4 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: LINE },
  dividerText: { fontSize: 10, color: MUTED, marginHorizontal: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(18,57,43,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 18, padding: 22, width: "100%", maxWidth: 360, gap: 14 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: DARK },
  modalBody: { fontSize: 13, color: MUTED, lineHeight: 19 },
  input: { height: 46, borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 13, fontSize: 13, color: DARK },
  error: { color: RED, fontSize: 11, marginTop: 12 },
  switchText: { fontSize: 11, color: MUTED, textAlign: "center", marginTop: 18, lineHeight: 17 },
  switchLink: { color: GREEN, fontWeight: "800" },
  footer: { fontSize: 10, color: MUTED, textAlign: "center", marginTop: 10 },
});
