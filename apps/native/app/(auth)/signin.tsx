import { ImageBackground } from "react-native";
import { AuthForm } from "@/components/auth/AuthForm";

export default function Signin() {
  return (
    <ImageBackground
      source={require("../../assets/images/signinbg.png")}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      <AuthForm />
    </ImageBackground>
  );
}
