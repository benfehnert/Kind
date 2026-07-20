import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import LoginScreen from "../screens/LoginScreen";
import SignUpScreen from "../screens/SignUpScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";

const AuthStack = createNativeStackNavigator();

function PasswordResetDeepLinkBridge() {
  const navigation = useNavigation();
  const { pendingPasswordReset } = useAuth();

  useEffect(() => {
    if (!pendingPasswordReset) return;
    if (pendingPasswordReset.error || pendingPasswordReset.accessToken || pendingPasswordReset.tokenHash) {
      navigation.navigate("ResetPassword", pendingPasswordReset);
    }
  }, [pendingPasswordReset, navigation]);

  return null;
}

function LoginWithBridge(props) {
  return (
    <>
      <PasswordResetDeepLinkBridge />
      <LoginScreen {...props} />
    </>
  );
}

export default function AuthNavigator() {
  const { hydrating } = useAuth();

  if (hydrating) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.greenDark} />
      </View>
    );
  }

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
      <AuthStack.Screen name="Login" component={LoginWithBridge} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}
