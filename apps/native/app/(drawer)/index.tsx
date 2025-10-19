import { api } from "@mono/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const healthCheck = useQuery(api.healthCheck.get);
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? {} : "skip");

  return (
    <Container>
      <ScrollView className="flex-1">
        <View className="px-4">
          <Text className="mb-4 font-bold font-mono text-3xl text-foreground">
            BETTER T STACK
          </Text>

          {user ? (
            <View className="mb-6 rounded-lg border border-border bg-card p-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-base text-foreground">
                  Welcome, <Text className="font-medium">{user.name}</Text>
                </Text>
              </View>
              <Text className="mb-4 text-muted-foreground text-sm">
                {user.email}
              </Text>
              <TouchableOpacity
                className="self-start rounded-md bg-destructive px-4 py-2"
                onPress={() => {
                  authClient.signOut();
                }}
              >
                <Text className="font-medium text-white">Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View className="mb-6 rounded-lg border border-border p-4">
            <Text className="mb-3 font-medium text-foreground">API Status</Text>
            <View className="flex-row items-center gap-2">
              <View
                className={`h-3 w-3 rounded-full ${
                  healthCheck ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <Text className="text-muted-foreground">
                {healthCheck === undefined
                  ? "Checking..."
                  : healthCheck === "OK"
                    ? "Connected to API"
                    : "API Disconnected"}
              </Text>
            </View>
          </View>
          {!user && (
            <>
              <SignIn />
              <SignUp />
            </>
          )}
        </View>
      </ScrollView>
    </Container>
  );
}
