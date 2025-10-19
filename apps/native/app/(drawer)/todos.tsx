import { Ionicons } from "@expo/vector-icons";
import { api } from "@mono/backend/convex/_generated/api";
import type { Id } from "@mono/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Container } from "@/components/container";

export default function TodosScreen() {
  const [newTodoText, setNewTodoText] = useState("");

  const todos = useQuery(api.todos.getAll);
  const createTodoMutation = useMutation(api.todos.create);
  const toggleTodoMutation = useMutation(api.todos.toggle);
  const deleteTodoMutation = useMutation(api.todos.deleteTodo);

  const handleAddTodo = async () => {
    const text = newTodoText.trim();
    if (!text) return;
    await createTodoMutation({ text });
    setNewTodoText("");
  };

  const handleToggleTodo = (id: Id<"todos">, currentCompleted: boolean) => {
    toggleTodoMutation({ id, completed: !currentCompleted });
  };

  const handleDeleteTodo = (id: Id<"todos">) => {
    Alert.alert("Delete Todo", "Are you sure you want to delete this todo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteTodoMutation({ id }),
      },
    ]);
  };

  return (
    <Container>
      <ScrollView className="flex-1">
        <View className="px-4 py-6">
          <View className="mb-6 rounded-lg border border-border bg-card p-4">
            <Text className="mb-2 font-bold text-2xl text-foreground">
              Todo List
            </Text>
            <Text className="mb-4 text-muted-foreground">
              Manage your tasks efficiently
            </Text>

            <View className="mb-6">
              <View className="mb-2 flex-row items-center space-x-2">
                <TextInput
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  onChangeText={setNewTodoText}
                  onSubmitEditing={handleAddTodo}
                  placeholder="Add a new task..."
                  placeholderTextColor="#6b7280"
                  returnKeyType="done"
                  value={newTodoText}
                />
                <TouchableOpacity
                  className={`rounded-md px-4 py-2 ${
                    newTodoText.trim() ? "bg-primary" : "bg-muted"
                  }`}
                  disabled={!newTodoText.trim()}
                  onPress={handleAddTodo}
                >
                  <Text className="font-medium text-white">Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {todos === undefined ? (
              <View className="flex justify-center py-8">
                <ActivityIndicator color="#3b82f6" size="large" />
              </View>
            ) : todos.length === 0 ? (
              <Text className="py-8 text-center text-muted-foreground">
                No todos yet. Add one above!
              </Text>
            ) : (
              <View className="space-y-2">
                {todos.map((todo) => (
                  <View
                    className="flex-row items-center justify-between rounded-md border border-border bg-background p-3"
                    key={todo._id}
                  >
                    <View className="flex-1 flex-row items-center">
                      <TouchableOpacity
                        className="mr-3"
                        onPress={() =>
                          handleToggleTodo(todo._id, todo.completed)
                        }
                      >
                        <Ionicons
                          color={todo.completed ? "#22c55e" : "#6b7280"}
                          name={todo.completed ? "checkbox" : "square-outline"}
                          size={24}
                        />
                      </TouchableOpacity>
                      <Text
                        className={`flex-1 ${
                          todo.completed
                            ? "text-muted-foreground line-through"
                            : "text-foreground"
                        }`}
                      >
                        {todo.text}
                      </Text>
                    </View>
                    <TouchableOpacity
                      className="ml-2 p-1"
                      onPress={() => handleDeleteTodo(todo._id)}
                    >
                      <Ionicons
                        color="#ef4444"
                        name="trash-outline"
                        size={20}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </Container>
  );
}
